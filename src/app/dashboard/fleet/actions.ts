"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type Vehicle = {
    id: string;
    plate: string;
    brand: string | null;
    model: string | null;
    year: number | null;
    vin: string | null;
    last_mileage: number;
    is_active: boolean;
};

/**
 * Obtiene todos los vehículos de la organización
 */
export async function getVehicles() {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("manmec_vehicles")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .is("deleted_at", null)
        .order("plate", { ascending: true });

    if (error) {
        console.error("Error fetching vehicles:", error);
        throw error;
    }

    return data as Vehicle[];
}

/**
 * Crea o actualiza un vehículo
 */
export async function upsertVehicle(data: Partial<Vehicle>) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const vehicleData = {
        ...data,
        organization_id: profile.organization_id,
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
        .from("manmec_vehicles")
        .upsert(vehicleData);

    if (error) {
        console.error("Error upserting vehicle:", error);
        throw error;
    }

    revalidatePath("/dashboard/supervisor/fleet");
    return { success: true };
}

/**
 * Cambia el estado de activación de un vehículo
 */
export async function toggleVehicleStatus(id: string, currentStatus: boolean) {
    await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const { error } = await supabase
        .from("manmec_vehicles")
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq("id", id);

    if (error) {
        console.error("Error toggling vehicle status:", error);
        throw error;
    }

    revalidatePath("/dashboard/supervisor/fleet");
    return { success: true };
}

/**
 * Obtiene la data consolidada 360 de un vehículo 
 * (Bodega Móvil, Herramientas, Insumos, OTs recientes)
 */
export async function getVehicleAuditData(vehicleId: string) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    // 1. Obtener datos base del vehículo
    const { data: vehicle, error: vehicleError } = await supabase
        .from("manmec_vehicles")
        .select("*")
        .eq("id", vehicleId)
        .eq("organization_id", profile.organization_id)
        .single();

    if (vehicleError) throw vehicleError;
    if (!vehicle) throw new Error("Vehicle not found");

    // 1.5 Obtener la Bodega Móvil ASOCIADA a este vehículo
    const { data: warehouse, error: warehouseError } = await supabase
        .from("manmec_warehouses")
        .select("id, name, is_active")
        .eq("vehicle_id", vehicleId)
        .eq("type", "MOBILE")
        .maybeSingle(); // Puede que aún no tenga bodega creada

    const warehouseId = warehouse?.id;

    // Attach warehouse to vehicle object for the frontend to read
    const vehicleWithWarehouse = { ...vehicle, warehouse: warehouse || null };

    // 2. Obtener Herramientas en esa bodega
    let tools: any[] = [];
    if (warehouseId) {
        const { data: fetchedTools, error: toolsError } = await supabase
            .from("manmec_tools")
            .select("*")
            .eq("assigned_warehouse_id", warehouseId)
            .is("deleted_at", null);

        if (toolsError) throw toolsError;
        tools = fetchedTools || [];
    }

    // 3. Obtener Insumos en esa bodega
    let items: any[] = [];
    if (warehouseId) {
        const { data: fetchedStock, error: stockError } = await supabase
            .from("manmec_inventory_stock")
            .select(`
                id,
                quantity,
                updated_at,
                item:item_id (
                    id,
                    sku,
                    name,
                    description,
                    unit
                )
            `)
            .eq("warehouse_id", warehouseId)
            .gt("quantity", 0);

        if (stockError) throw stockError;

        // Aplanar el objeto para el frontend
        items = (fetchedStock || []).map((stock: any) => ({
            ...stock.item,
            stock_id: stock.id,
            quantity: stock.quantity,
            last_counted_at: stock.updated_at
        }));
    }

    // 4. Obtener Historial de OTs (Últimos 15 Días)
    const fifteenDaysAgo = new Date();
    fifteenDaysAgo.setDate(fifteenDaysAgo.getDate() - 15);

    const { data: workOrders, error: woError } = await supabase
        .from("manmec_work_orders")
        .select(`
            id,
            code,
            title,
            status,
            priority,
            ot_type,
            created_at,
            completed_at,
            station:station_id(name)
        `)
        .eq("vehicle_id", vehicleId)
        .gte("created_at", fifteenDaysAgo.toISOString())
        .order("created_at", { ascending: false });

    if (woError) throw woError;

    // 5. Obtener Tripulación (Mecánicos asignados a este vehículo)
    // Esto lo inferimos de las asignaciones activas de los últimos 15 días
    const woIds = (workOrders || []).map(wo => wo.id);
    let crew = [];

    if (woIds.length > 0) {
        const { data: assignments, error: assignmentsError } = await supabase
            .from("manmec_work_order_assignments")
            .select(`
                mechanic:mechanic_id (
                    id,
                    full_name
                )
            `)
            .in("work_order_id", woIds);

        if (assignmentsError) throw assignmentsError;

        // Deduplicar mecánicos
        const uniqueCrewMap = new Map();
        assignments?.forEach(a => {
            const mech: any = Array.isArray(a.mechanic) ? a.mechanic[0] : a.mechanic;
            if (mech && mech.id && !uniqueCrewMap.has(mech.id)) {
                uniqueCrewMap.set(mech.id, mech);
            }
        });
        crew = Array.from(uniqueCrewMap.values());
    }

    return {
        vehicle: vehicleWithWarehouse,
        tools,
        items,
        workOrders: workOrders || [],
        crew
    };
}
