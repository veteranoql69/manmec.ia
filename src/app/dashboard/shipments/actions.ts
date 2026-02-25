"use server";

import { analyzeShipmentImage, ExtractedShipment } from "@/lib/ai/vision";
import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export interface ShipmentItemInput {
    description: string;
    quantity: number;
    barcode?: string;
    unit_price?: number;
}

/**
 * Procesa una imagen de guía de despacho usando IA.
 * Identifica productos nuevos y existentes.
 */
export async function processShipmentImage(base64Image: string) {
    const profile = await requireRole("SUPERVISOR");

    // 1. Analizar con Gemini
    const extracted = await analyzeShipmentImage(base64Image);

    // 2. Cruzar con la base de datos para ver qué existe
    const supabase = await createClient();

    const enrichedItems = await Promise.all(extracted.items.map(async (item) => {
        const { data: existing } = await supabase
            .from("manmec_inventory_items")
            .select("id, name, sku")
            .eq("organization_id", profile.organization_id)
            .eq("sku", item.code) // Asumimos SKU = Código del proveedor
            .is("deleted_at", null)
            .single();

        return {
            ...item,
            exists: !!existing,
            existingId: existing?.id || null,
            systemName: existing?.name || null
        };
    }));

    return {
        dispatch_note_number: extracted.dispatch_note_number,
        supplier_name: extracted.supplier_name,
        items: enrichedItems
    };
}

/**
 * Guarda una recepción de carga completa.
 * Si un producto no existe (vía barcode/sku), lo crea.
 */
export async function saveShipment(data: {
    organization_id: string;
    supplier_name?: string;
    dispatch_note_number?: string;
    items: (ShipmentItemInput & { exists: boolean; code?: string })[];
}) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    // 1. Procesar ítems (Creación on-the-fly si no existen)
    const processedItems = await Promise.all(data.items.map(async (item) => {
        let itemId: string;

        // Intentar buscar por barcode/sku si existe
        const code = item.barcode || item.code;

        if (code) {
            const { data: existing } = await supabase
                .from("manmec_inventory_items")
                .select("id")
                .eq("organization_id", data.organization_id)
                .or(`barcode.eq.${code},sku.eq.${code}`)
                .is("deleted_at", null)
                .single();

            if (existing) {
                itemId = existing.id;
            } else {
                // Crear producto nuevo
                const { data: newItem, error } = await supabase
                    .from("manmec_inventory_items")
                    .insert({
                        organization_id: data.organization_id,
                        name: item.description,
                        barcode: code,
                        sku: code,
                        unit: "unidad", // Por defecto
                    })
                    .select("id")
                    .single();

                if (error) throw error;
                itemId = newItem.id;
            }
        } else {
            // Sin código, creamos por nombre
            const { data: newItem, error } = await supabase
                .from("manmec_inventory_items")
                .insert({
                    organization_id: data.organization_id,
                    name: item.description,
                })
                .select("id")
                .single();

            if (error) throw error;
            itemId = newItem.id;
        }

        return {
            item_id: itemId,
            expected_qty: item.quantity,
            received_qty: item.quantity,
            unit_price: item.unit_price || 0,
        };
    }));

    // 2. Crear la Cabecera de Recepción
    const { data: shipment, error: sError } = await supabase
        .from("manmec_shipments")
        .insert({
            organization_id: data.organization_id,
            supplier_name: data.supplier_name,
            dispatch_note_number: data.dispatch_note_number,
            status: "RECEIVED",
            received_by: profile.id
        })
        .select("id")
        .single();

    if (sError) throw sError;

    // 3. Crear los ítems de la recepción y actualizar stock
    const { error: iError } = await supabase
        .from("manmec_shipment_items")
        .insert(processedItems.map(pi => ({
            shipment_id: shipment.id,
            ...pi
        })));

    if (iError) throw iError;

    // 4. Actualizar stock en Bodega Central (o una estación default si aplica)
    // Buscamos la estación por defecto de la org si existe, o la primera.
    const { data: station } = await supabase
        .from("manmec_service_stations")
        .select("id")
        .eq("organization_id", data.organization_id)
        .limit(1)
        .single();

    if (station) {
        for (const pi of processedItems) {
            await supabase.from("manmec_inventory_movements").insert({
                item_id: pi.item_id,
                station_id: station.id,
                user_id: profile.id,
                type: 'IN',
                quantity: pi.expected_qty,
                reason: `Recepción Guía #${data.dispatch_note_number}`
            });
        }
    }

    revalidatePath("/dashboard/inventory");
    revalidatePath("/dashboard/shipments");

    return { success: true, shipmentId: shipment.id };
}
