"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type Warehouse = {
    id: string;
    organization_id: string;
    name: string;
    address: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
};

/**
 * Obtiene todas las bodegas de la organización
 */
export async function getWarehouses() {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("manmec_warehouses")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("name", { ascending: true });

    if (error) {
        console.error("Error fetching warehouses:", error);
        throw error;
    }

    return data as Warehouse[];
}

/**
 * Crea o actualiza una bodega
 */
export async function upsertWarehouse(data: Partial<Warehouse>) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const warehouseData = {
        ...data,
        organization_id: profile.organization_id,
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
        .from("manmec_warehouses")
        .upsert(warehouseData);

    if (error) {
        console.error("Error upserting warehouse:", error);
        throw error;
    }

    revalidatePath("/dashboard/warehouses");
    revalidatePath("/dashboard/inventory");
    return { success: true };
}

/**
 * Cambia el estado de activación de una bodega
 */
export async function toggleWarehouseStatus(id: string, currentStatus: boolean) {
    await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const { error } = await supabase
        .from("manmec_warehouses")
        .update({ is_active: !currentStatus, updated_at: new Date().toISOString() })
        .eq("id", id);

    if (error) {
        console.error("Error toggling warehouse status:", error);
        throw error;
    }

    revalidatePath("/dashboard/warehouses");
    return { success: true };
}
