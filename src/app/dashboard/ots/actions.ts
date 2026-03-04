"use server";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type WorkOrder = {
    id: string;
    organization_id: string;
    station_id: string;
    created_by: string;
    assigned_to: string | null;
    code: string | null;
    title: string;
    description: string | null;
    priority: "P1" | "P2" | "P3";
    status: string;
    vehicle_id: string | null;
    created_at: string;
    updated_at: string;

    // Virtual fields for joins
    station?: {
        name: string;
        code: string | null;
        address: string | null;
        contact_name: string | null;
        contact_phone: string | null;
    };
    assigned_user?: {
        full_name: string;
    };
    vehicle?: {
        id: string;
        plate: string;
        brand: string | null;
        model: string | null;
    };
    team?: Array<{
        mechanic: { id: string; full_name: string };
        role: "lead" | "support";
    }>;
    materials?: Array<{
        item: { name: string; sku: string; unit: string };
        quantity: number;
        notes: string | null;
    }>;
    vehicle_withdrawals?: Array<{
        item: { name: string; sku: string; unit: string };
        quantity: number;
        created_at: string;
    }>;
    timeline?: Array<{
        id: string;
        content: string | null;
        created_at: string;
        entry_type: string;
        user: { full_name: string };
    }>;
    metadata?: any;
    mobile_warehouse?: any;
};

/**
 * Obtiene todas las OTs de la organización
 */
export async function getWorkOrders() {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("manmec_work_orders")
        .select(`
            *,
            station:manmec_service_stations!station_id(name, address),
            assigned_user:manmec_users!assigned_to(full_name),
            vehicle:manmec_vehicles!vehicle_id(plate, brand, model)
        `)
        .eq("organization_id", profile.organization_id)
        .is("deleted_at", null)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching work orders:", error);
        throw error;
    }

    return data as WorkOrder[];
}

/**
 * Obtiene una OT específica por ID con el contexto completo (Equipo, Insumos, Vehículo)
 */
export async function getWorkOrderDetail(id: string) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    // 1. Obtener la OT básica con Estación y Vehículo
    const { data: ot, error: otError } = await supabase
        .from("manmec_work_orders")
        .select(`
            *,
            station:manmec_service_stations!station_id(name, code, address, contact_name, contact_phone),
            assigned_user:manmec_users!assigned_to(full_name),
            vehicle:manmec_vehicles!vehicle_id(id, plate, brand, model)
        `)
        .eq("id", id)
        .single();

    if (otError) {
        console.error("Error fetching OT detail:", otError);
        throw otError;
    }

    // 2. Obtener el Equipo HUMANO (Múltiples mecánicos)
    // Usamos adminClient para bypass de RLS que a veces bloquea lectura a supervisores
    const adminClient = createAdminClient();
    const { data: team, error: teamError } = await adminClient
        .from("manmec_work_order_assignments")
        .select(`
            role,
            mechanic:manmec_users!mechanic_id(id, full_name)
        `)
        .eq("work_order_id", id);

    if (teamError) {
        console.error(`[ACTIONS] Error fetching team for OT ${id}:`, teamError.message || teamError);
    } else {
        console.log(`[ACTIONS] Team fetched for OT ${id}:`, team?.length || 0, "members found");
    }

    // 3. Obtener Materiales USADOS (Registrados en la OT)
    const { data: materials, error: matError } = await supabase
        .from("manmec_work_order_materials")
        .select(`
            quantity,
            notes,
            item:manmec_inventory_items!item_id(name, sku, unit)
        `)
        .eq("work_order_id", id);

    // 3.5 Obtener Timeline (Historial)
    const { data: timeline, error: timelineError } = await supabase
        .from("manmec_work_order_timeline")
        .select(`
            *,
            user:manmec_users!user_id(full_name)
        `)
        .eq("work_order_id", id)
        .order("created_at", { ascending: false });

    // 4. Obtener el inventario "Live Stock" y herramientas del Furgón asignado si lo hay
    let mobileWarehouse = { id: null, stock: [], tools: [] };

    if (ot.vehicle_id) {
        // Encontrar la bodega móvil del vehículo
        const { data: warehouse } = await supabase
            .from("manmec_warehouses")
            .select("id")
            .eq("vehicle_id", ot.vehicle_id)
            .eq("type", "MOBILE")
            .maybeSingle();

        if (warehouse) {
            mobileWarehouse.id = warehouse.id as any;

            // Stock de Insumos abordo
            const { data: stock, error: stockError } = await supabase
                .from("manmec_inventory_stock")
                .select(`
                    quantity,
                    item:manmec_inventory_items!inner(name, sku, unit, is_sensitive)
                `)
                .eq("warehouse_id", warehouse.id)
                .gt("quantity", 0);

            if (stockError) console.error("Error fetching mobile warehouse stock:", stockError);
            if (stock) mobileWarehouse.stock = stock as any;
        }

        // Herramientas Asignadas al vehículo (vía su Bodega Móvil)
        if (warehouse) {
            const { data: tools, error: toolsError } = await supabase
                .from("manmec_tools")
                .select("id, name, serial_number, status, criticality")
                .eq("assigned_warehouse_id", warehouse.id)
                .is("deleted_at", null);

            if (toolsError) console.error("Error fetching mobile warehouse tools:", toolsError);
            if (tools) mobileWarehouse.tools = tools as any;
        }
    }

    return {
        ...ot,
        team: team || [],
        materials: materials || [],
        timeline: timeline || [],
        mobile_warehouse: mobileWarehouse
    };
}

/**
 * Crea o actualiza una OT
 */
export async function upsertWorkOrder(data: Partial<WorkOrder>) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const otData = {
        ...data,
        organization_id: profile.organization_id,
        created_by: data.created_by || profile.id,
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
        .from("manmec_work_orders")
        .upsert(otData);

    if (error) {
        console.error("Error upserting work order:", error);
        throw error;
    }

    revalidatePath("/dashboard/ots");
    return { success: true };
}
/**
 * Asigna un vehículo a una OT
 */
export async function assignVehicleToWorkOrder(otId: string, vehicleId: string) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const { error } = await supabase
        .from("manmec_work_orders")
        .update({ vehicle_id: vehicleId })
        .eq("id", otId)
        .eq("organization_id", profile.organization_id);

    if (error) throw error;
    revalidatePath(`/dashboard/ots/${otId}`);
    return { success: true };
}

/**
 * Asigna un mecánico a una OT (Como Líder o Apoyo)
 */
export async function assignMechanicToWorkOrder(otId: string, mechanicId: string, role: "lead" | "support" = "support") {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    console.log(`[ACTIONS] Assigning ${mechanicId} to OT ${otId} as ${role}`);

    // Si es líder, actualizar el campo assigned_to de la OT principal
    if (role === "lead") {
        const { error: otError } = await supabase
            .from("manmec_work_orders")
            .update({ assigned_to: mechanicId })
            .eq("id", otId)
            .eq("organization_id", profile.organization_id);

        if (otError) throw otError;
    }

    // Insertar/Actualizar en la tabla de asignaciones detalladas
    const { error } = await supabase
        .from("manmec_work_order_assignments")
        .upsert({
            work_order_id: otId,
            mechanic_id: mechanicId,
            role,
            assigned_by: profile.id
        }, { onConflict: 'work_order_id,mechanic_id' });

    if (error) {
        console.error("[ACTIONS] Error in assignment upsert:", error);
        throw error;
    }

    revalidatePath(`/dashboard/ots/${otId}`);
    return { success: true };
}

/**
 * Desasigna un mecánico de una OT
 */
export async function unassignMechanicFromWorkOrder(otId: string, mechanicId: string) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    console.log(`[ACTIONS] Unassigning ${mechanicId} from OT ${otId}`);

    // 1. Eliminar de la tabla de asignaciones detalladas
    const { error: assError } = await supabase
        .from("manmec_work_order_assignments")
        .delete()
        .eq("work_order_id", otId)
        .eq("mechanic_id", mechanicId);

    if (assError) throw assError;

    // 2. Si era el líder (assigned_to), limpiar el campo en la OT principal
    const { data: ot } = await supabase
        .from("manmec_work_orders")
        .select("assigned_to")
        .eq("id", otId)
        .single();

    if (ot && ot.assigned_to === mechanicId) {
        const { error: otError } = await supabase
            .from("manmec_work_orders")
            .update({ assigned_to: null })
            .eq("id", otId);

        if (otError) throw otError;
    }

    revalidatePath(`/dashboard/ots/${otId}`);
    return { success: true };
}

/**
 * Desasigna un vehículo de una OT
 */
export async function unassignVehicleFromWorkOrder(otId: string) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    console.log(`[ACTIONS] Unassigning vehicle from OT ${otId}`);

    const { error } = await supabase
        .from("manmec_work_orders")
        .update({ vehicle_id: null })
        .eq("id", otId)
        .eq("organization_id", profile.organization_id);

    if (error) throw error;

    revalidatePath(`/dashboard/ots/${otId}`);
    return { success: true };
}

/**
 * Obtiene lista de recursos disponibles (Mecánicos y Vehículos)
 */
export async function getAvailableResources() {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const [mechanics, vehicles] = await Promise.all([
        supabase.from("manmec_users").select("id, full_name").eq("organization_id", profile.organization_id).in("role", ["MECHANIC", "SUPERVISOR", "COMPANY_ADMIN", "MANAGER"]),
        supabase.from("manmec_vehicles").select("id, plate, brand, model").eq("organization_id", profile.organization_id).eq("is_active", true)
    ]);

    return {
        mechanics: mechanics.data || [],
        vehicles: vehicles.data || []
    };
}
