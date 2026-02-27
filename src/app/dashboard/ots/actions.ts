"use server";

import { createClient } from "@/lib/supabase/server";
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
        mechanic: { full_name: string; email: string };
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
            station:station_id(name, address),
            assigned_user:assigned_to(full_name),
            vehicle:vehicle_id(plate, brand, model)
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
            station:station_id(name, code, address, contact_name, contact_phone),
            assigned_user:assigned_to(full_name),
            vehicle:vehicle_id(id, plate, brand, model)
        `)
        .eq("id", id)
        .single();

    if (otError) {
        console.error("Error fetching OT detail:", otError);
        throw otError;
    }

    // 2. Obtener el Equipo HUMANO (Múltiples mecánicos)
    const { data: team, error: teamError } = await supabase
        .from("manmec_work_order_assignments")
        .select(`
            role,
            mechanic:mechanic_id(full_name, email)
        `)
        .eq("work_order_id", id);

    // 3. Obtener Materiales USADOS (Registrados en la OT)
    const { data: materials, error: matError } = await supabase
        .from("manmec_work_order_materials")
        .select(`
            quantity,
            notes,
            item:item_id(name, sku, unit)
        `)
        .eq("work_order_id", id);

    // 4. Si tiene vehículo, obtener Insumos RETIRADOS para ese vehículo (Planificación diaria)
    let vehicleWithdrawals: any[] = [];
    if (ot.vehicle_id) {
        const { data: withdrawals, error: withError } = await supabase
            .from("manmec_inventory_movements")
            .select(`
                quantity,
                created_at,
                item:item_id(name, sku, unit)
            `)
            .eq("vehicle_id", ot.vehicle_id)
            .eq("type", "OUT") // Solo salidas de bodega hacia vehículo
            .is("work_order_id", null); // Evitar duplicar los consumos directos si existen

        if (!withError) vehicleWithdrawals = withdrawals;
    }

    return {
        ...ot,
        team: team || [],
        materials: materials || [],
        vehicle_withdrawals: vehicleWithdrawals,
        tools: [] // Se mantiene el placeholder para futura implementación de herramientas
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

    // Si es líder, actualizar el campo assigned_to de la OT principal
    if (role === "lead") {
        const { error: otError } = await supabase
            .from("manmec_work_orders")
            .update({ assigned_to: mechanicId })
            .eq("id", otId)
            .eq("organization_id", profile.organization_id);

        if (otError) throw otError;
    }

    // Insertar en la tabla de asignaciones detalladas
    const { error } = await supabase
        .from("manmec_work_order_assignments")
        .upsert({
            work_order_id: otId,
            mechanic_id: mechanicId,
            role,
            assigned_by: profile.id
        }, { onConflict: 'work_order_id,mechanic_id' });

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
        supabase.from("manmec_users").select("id, full_name").eq("organization_id", profile.organization_id).eq("role", "MECHANIC"),
        supabase.from("manmec_vehicles").select("id, plate, brand, model").eq("organization_id", profile.organization_id).eq("is_active", true)
    ]);

    return {
        mechanics: mechanics.data || [],
        vehicles: vehicles.data || []
    };
}
