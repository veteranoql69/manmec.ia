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
            .maybeSingle();

        return {
            ...item,
            exists: !!existing,
            existingId: existing?.id || null,
            systemName: existing?.name || null
        };
    }));

    return {
        dispatch_note_number: extracted.dispatch_note_number,
        order_number: extracted.order_number,
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
    warehouse_id: string;
    supplier_name?: string;
    dispatch_note_number?: string;
    order_number?: string;
    items: (ShipmentItemInput & { exists: boolean; code?: string })[];
}) {
    console.log("📥 Iniciando guardado de recepción:", data.dispatch_note_number);
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    // 0. Verificar si la guía ya fue registrada para evitar duplicados
    if (data.dispatch_note_number) {
        const { data: existingShipment } = await supabase
            .from("manmec_shipments")
            .select("id")
            .eq("organization_id", data.organization_id)
            .eq("dispatch_note_number", data.dispatch_note_number)
            .maybeSingle();

        if (existingShipment) {
            throw new Error(`La guía Nº ${data.dispatch_note_number} ya se encuentra registrada en el sistema.`);
        }
    }

    try {
        // 1. Procesar ítems (Creación on-the-fly si no existen)
        const processedItems = await Promise.all(data.items.map(async (item) => {
            let itemId: string;

            // Intentar buscar por barcode/sku si existe
            const code = item.barcode || item.code;

            if (code) {
                const { data: existing, error: findError } = await supabase
                    .from("manmec_inventory_items")
                    .select("id")
                    .eq("organization_id", data.organization_id)
                    .or(`barcode.eq.${code},sku.eq.${code}`)
                    .maybeSingle();

                if (existing) {
                    itemId = existing.id;
                } else {
                    // Crear producto nuevo
                    const { data: newItem, error: insertError } = await supabase
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

                    if (insertError) {
                        console.error("❌ Error al crear ítem de inventario:", insertError);
                        throw new Error(`Error al crear producto '${item.description}': ${insertError.message} (${insertError.details || 'sin detalles'})`);
                    }
                    itemId = newItem.id;
                }
            } else {
                // Sin código, creamos por nombre
                const { data: newItem, error: insertError } = await supabase
                    .from("manmec_inventory_items")
                    .insert({
                        organization_id: data.organization_id,
                        name: item.description,
                    })
                    .select("id")
                    .single();

                if (insertError) {
                    console.error("❌ Error al crear ítem de inventario (sin código):", insertError);
                    throw new Error(`Error al crear producto sin código '${item.description}': ${insertError.message}`);
                }
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
                external_id: data.dispatch_note_number, // El Nº de guía físico es el external_id
                order_number: data.order_number,
                status: "RECEIVED",
                received_by: profile.id
            })
            .select("id")
            .single();

        if (sError) {
            console.error("❌ Error al crear cabecera de shipment:", sError);
            throw new Error(`Error en cabecera: ${sError.message}`);
        }

        // 3. Crear los ítems de la recepción
        const { error: iError } = await supabase
            .from("manmec_shipment_items")
            .insert(processedItems.map(pi => ({
                shipment_id: shipment.id,
                ...pi
            })));

        if (iError) {
            console.error("❌ Error al crear ítems de shipment:", iError);
            throw new Error(`Error en ítems: ${iError.message}`);
        }

        // 4. Usar la BODEGA seleccionada para el stock
        const targetWarehouseId = data.warehouse_id;

        // 5. Registrar los movimientos de inventario (Stock IN)
        for (const pi of processedItems) {
            const { error: mError } = await supabase
                .from("manmec_inventory_movements")
                .insert({
                    item_id: pi.item_id,
                    warehouse_id: targetWarehouseId,
                    user_id: profile.id,
                    type: 'IN',
                    quantity: pi.expected_qty,
                    reason: `Recepción Guía #${data.dispatch_note_number}`
                });

            if (mError) {
                console.error(`❌ Error en movimiento de stock para ítem ${pi.item_id}:`, mError);
            }
        }

        revalidatePath("/dashboard/inventory");
        revalidatePath("/dashboard/shipments");

        return { success: true, shipmentId: shipment.id };

    } catch (e: any) {
        console.error("🚨 Error crítico en saveShipment:", e);
        throw e;
    }
}

/**
 * Obtiene el historial de guías recibidas
 */
export async function getShipments() {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("manmec_shipments")
        .select(`
            *,
            recipient:received_by(full_name),
            items:manmec_shipment_items(count)
        `)
        .eq("organization_id", profile.organization_id)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching shipments:", error);
        return [];
    }

    return data;
}

/**
 * Obtiene el detalle de una guía específica
 */
export async function getShipmentById(id: string) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("manmec_shipments")
        .select(`
            *,
            recipient:received_by(full_name),
            items:manmec_shipment_items(
                *,
                product:item_id(*)
            )
        `)
        .eq("organization_id", profile.organization_id)
        .eq("id", id)
        .single();

    if (error) {
        console.error("Error fetching shipment detail:", error);
        return null;
    }

    return data;
}
