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
