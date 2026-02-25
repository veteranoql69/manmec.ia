"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ServiceStation = {
    id: string;
    organization_id: string;
    name: string;
    address: string | null;
    latitude: number | null;
    longitude: number | null;
    contact_name: string | null;
    contact_phone: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    deleted_at: string | null;
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
        throw error;
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
