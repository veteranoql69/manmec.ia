"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ServiceStation = {
    id: string;
    organization_id: string;
    name: string;
    code: string | null;            // Ej: S-20088
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    manager_name: string | null;    // Nombre Jefe EDS
    manager_phone: string | null;   // Número Jefe EDS
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;

    // Campos extendidos Maestro EDS
    sap_store_code?: string | null;
    sap_store_id?: string | null;
    brand?: string | null;
    location_type?: string | null;
    segment?: string | null;
    cluster?: string | null;
    format?: string | null;
    operation_type?: string | null;
    commune?: string | null;
    region_id?: number | null;
    direction_sense?: string | null;
    shop_radius?: number | null;
    route_radius?: number | null;
    pos_system?: string | null;
    services?: string | null;
    is_mirror?: boolean | null;
};

/**
 * Obtiene todas las estaciones de servicio de la organización
 */
export async function getServiceStations() {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("manmec_service_stations")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .is("deleted_at", null)
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching stations:", error);
        throw error;
    }

    return data as ServiceStation[];
}

/**
 * Obtiene el detalle profundo de una estación, incluyendo OTs, materiales, vehículos y asignaciones
 */
export async function getStationDetail(id: string) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("manmec_service_stations")
        .select(`
            *,
            work_orders:manmec_work_orders(
                id,
                code,
                title,
                description,
                priority,
                status,
                ot_type,
                scheduled_date,
                started_at,
                completed_at,
                vehicle:manmec_vehicles(id, plate, brand, model),
                materials:manmec_work_order_materials(
                    id,
                    quantity,
                    notes,
                    item:manmec_inventory_items(id, name, unit)
                ),
                assignments:manmec_work_order_assignments(
                    id,
                    role,
                    mechanic:manmec_users!mechanic_id(id, full_name, role)
                )
            )
        `)
        .eq("id", id)
        .eq("organization_id", profile.organization_id)
        .single();

    if (error) {
        console.error("Error fetching station detail:", {
            code: error.code,
            message: error.message,
            details: error.details,
            hint: error.hint
        });
        return null;
    }

    return data;
}

/**
 * Crea o actualiza una estación de servicio
 */
export async function upsertServiceStation(data: Partial<ServiceStation>) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const stationData = {
        ...data,
        organization_id: profile.organization_id,
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
        .from("manmec_service_stations")
        .upsert(stationData);

    if (error) {
        console.error("Error upserting station:", error);
        return { success: false, error: error.message };
    }

    revalidatePath("/dashboard/stations");
    return { success: true };
}

/**
 * Cambia el estado de activación de una estación
 */
export async function toggleStationStatus(id: string, currentStatus: boolean) {
    await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const { error } = await supabase
        .from("manmec_service_stations")
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq("id", id);

    if (error) {
        console.error("Error toggling station status:", error);
        throw error;
    }

    revalidatePath("/dashboard/stations");
    return { success: true };
}

/**
 * Elimina (lógicamente) una estación
 */
export async function deleteServiceStation(id: string) {
    await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const { error } = await supabase
        .from("manmec_service_stations")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

    if (error) {
        console.error("Error deleting station:", error);
        throw error;
    }

    revalidatePath("/dashboard/stations");
    return { success: true };
}
