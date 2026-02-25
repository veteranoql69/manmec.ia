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
        address: string | null;
    };
    assigned_user?: {
        full_name: string;
    };
    vehicle?: {
        plate: string;
        brand: string | null;
        model: string | null;
    };
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
 * Obtiene una OT específica por ID con sus herramientas asociadas al vehículo
 */
export async function getWorkOrderDetail(id: string) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    // 1. Obtener la OT
    const { data: ot, error: otError } = await supabase
        .from("manmec_work_orders")
        .select(`
            *,
            station:station_id(name, address, contact_name, contact_phone),
            assigned_user:assigned_to(full_name),
            vehicle:vehicle_id(id, plate, brand, model)
        `)
        .eq("id", id)
        .single();

    if (otError) {
        console.error("Error fetching OT detail:", otError);
        throw otError;
    }

    // 2. Si tiene vehículo asignado, obtener las herramientas de ese vehículo
    let tools: any[] = [];
    if (ot.vehicle_id) {
        const { data: vehicleTools, error: toolsError } = await supabase
            .from("manmec_tools")
            .select("*")
            .eq("assigned_vehicle_id", ot.vehicle_id)
            .is("deleted_at", null);

        if (!toolsError) {
            tools = vehicleTools;
        }
    }

    return {
        ...ot,
        tools
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
