"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

/**
 * Registra un nuevo insumo y su stock inicial (manual)
 */
export async function createManualInsumo(data: {
    name: string;
    sku?: string;
    barcode?: string;
    unit: string;
    min_stock: number;
    initial_qty: number;
    warehouse_id: string;
    document_ref?: string;
    supplier_name?: string;
}) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    try {
        // 1. Crear el ítem en el catálogo si no existe (o siempre creamos uno nuevo?)
        // Vamos a intentar buscar por SKU primero para evitar duplicados si el usuario lo provee
        let itemId: string;

        if (data.sku) {
            const { data: existing } = await supabase
                .from("manmec_inventory_items")
                .select("id")
                .eq("sku", data.sku)
                .eq("organization_id", profile.organization_id!)
                .maybeSingle();

            if (existing) {
                itemId = existing.id;
            } else {
                const { data: newItem, error: itemError } = await supabase
                    .from("manmec_inventory_items")
                    .insert({
                        organization_id: profile.organization_id!,
                        name: data.name,
                        sku: data.sku,
                        barcode: data.barcode,
                        unit: data.unit,
                        min_stock: data.min_stock
                    })
                    .select("id")
                    .single();

                if (itemError) throw new Error(`Error creando ítem: ${itemError.message}`);
                itemId = newItem.id;
            }
        } else {
            const { data: newItem, error: itemError } = await supabase
                .from("manmec_inventory_items")
                .insert({
                    organization_id: profile.organization_id!,
                    name: data.name,
                    barcode: data.barcode,
                    unit: data.unit,
                    min_stock: data.min_stock
                })
                .select("id")
                .single();

            if (itemError) throw new Error(`Error creando ítem: ${itemError.message}`);
            itemId = newItem.id;
        }

        // 2. Registrar el movimiento de stock
        if (data.initial_qty > 0) {
            const { error: moveError } = await supabase
                .from("manmec_inventory_movements")
                .insert({
                    item_id: itemId,
                    warehouse_id: data.warehouse_id,
                    user_id: profile.id,
                    type: 'IN',
                    quantity: data.initial_qty,
                    reason: data.document_ref ? `Compra/Manual - Doc: ${data.document_ref}` : 'Ingreso Manual Inicial'
                });

            if (moveError) throw new Error(`Error registrando movimiento: ${moveError.message}`);
        }

        revalidatePath("/dashboard/inventory");
        return { success: true, itemId };

    } catch (e: any) {
        console.error("Error en createManualInsumo:", e);
        return { success: false, error: e.message };
    }
}
