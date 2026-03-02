"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type Warehouse = {
    id: string;
    organization_id: string;
    type: string;
    vehicle_id: string | null;
    name: string;
    address: string | null;
    is_active: boolean;
    created_at: string;
    updated_at: string;
    vehicle?: { plate: string } | null;
};

/**
 * Obtiene todas las bodegas de la organización
 */
export async function getWarehouses() {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("manmec_warehouses")
        .select("*, vehicle:manmec_vehicles!vehicle_id(plate)")
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

/**
 * Transfiere insumos desde una bodega origen (ej. Fija) a una destino (ej. Móvil)
 */
export async function transferInventory({
    itemId,
    sourceWarehouseId,
    destinationWarehouseId,
    quantity,
    notes
}: {
    itemId: string;
    sourceWarehouseId: string;
    destinationWarehouseId: string;
    quantity: number;
    notes?: string;
}) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    // Validar cantidad
    if (quantity <= 0) {
        throw new Error("La cantidad debe ser mayor a 0");
    }

    // El Trigger actual no procesa 'TRANSFER' deduciendo y sumando a la vez, 
    // por lo tanto tenemos que insertar dos registros correspondientes.

    // 1. Salida de la bodega de origen (Resta stock)
    const { error: outError } = await supabase
        .from("manmec_inventory_movements")
        .insert({
            item_id: itemId,
            warehouse_id: sourceWarehouseId,
            user_id: profile.id,
            type: "OUT",
            quantity: quantity,
            reason: notes || "Transferencia (Salida)"
        });

    if (outError) {
        console.error("Error logging OUT transfer movement:", outError);
        throw outError;
    }

    // 2. Entrada a la bodega destino (Suma stock)
    const { error: inError } = await supabase
        .from("manmec_inventory_movements")
        .insert({
            item_id: itemId,
            warehouse_id: destinationWarehouseId,
            user_id: profile.id,
            type: "IN",
            quantity: quantity,
            reason: notes || "Transferencia (Entrada)"
        });

    if (inError) {
        console.error("Error logging IN transfer movement:", inError);
        // NOTA: Para una atomicidad perfecta habría que hacer un RPC, pero como esto 
        // es un MVP logístico, con estas dos queries validamos el flujo fundamental.
        throw inError;
    }

    revalidatePath("/dashboard/warehouses");
    revalidatePath("/dashboard/inventory");
    return { success: true };
}
