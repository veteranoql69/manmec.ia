import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseEmailWithIA } from "@/lib/ai/email-parser";

/**
 * Endpoint para recibir notificaciones automáticas vía Webhook.
 * Simula la recepción de correos electrónicos.
 */
export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();
        const { from, to, subject, body } = payload;

        if (!body) {
            return NextResponse.json({ error: "Empty body" }, { status: 400 });
        }

        const supabase = createAdminClient();

        // 1. Identificar Organización por el destinatario (to)
        // El 'to' debe coincidir con el client_notification_email configurado
        const { data: org, error: orgError } = await supabase
            .from("manmec_organizations")
            .select("id, name, client_notification_email")
            .eq("client_notification_email", to)
            .maybeSingle();

        console.log(`🔍 Buscando Org para: [${to}] -> Result:`, org);

        if (!org) {
            console.error(`❌ Organización no encontrada para el correo: ${to}`);
            return NextResponse.json({ error: `Organization not found for email: ${to}` }, { status: 404 });
        }

        // 2. Procesar con IA
        console.log(`🧠 Procesando correo para org: ${org.name}`);
        const parsedData = await parseEmailWithIA(body);

        if (parsedData.type === 'OT_NOTIFICATION') {
            // 3a. Crear OT Automática
            // Buscar la estación por código sap_store_code o por nombre aproximado
            const { data: station } = await supabase
                .from("manmec_service_stations")
                .select("id")
                .eq("organization_id", org.id)
                .or(`sap_store_code.eq.${parsedData.station_code},name.ilike.%${parsedData.station_code}%`)
                .maybeSingle();

            if (!station) {
                throw new Error(`No se encontró la estación con código: ${parsedData.station_code}`);
            }

            // Buscar el primer usuario (ej: un supervisor) de la organización para asignar la autoría
            const { data: adminUser } = await supabase
                .from("manmec_users")
                .select("id")
                .eq("organization_id", org.id)
                .limit(1)
                .single();

            const { data: wo, error: woError } = await supabase
                .from("manmec_work_orders")
                .insert({
                    organization_id: org.id,
                    station_id: station.id,
                    title: parsedData.title || "OT Automática desde Email",
                    description: parsedData.description,
                    external_id: parsedData.external_id,
                    external_source: 'COPEC_EMAIL',
                    priority: parsedData.priority || 'P3',
                    source: 'EMAIL',
                    created_by: adminUser?.id || '00000000-0000-0000-0000-000000000000'
                })
                .select("id")
                .single();

            if (woError) throw woError;

            return NextResponse.json({ success: true, type: 'OT', id: wo.id });

        } else if (parsedData.type === 'SHIPMENT_NOTIFICATION') {
            // 3b. Crear Pre-Guía de Despacho
            const { data: shipment, error: sError } = await supabase
                .from("manmec_shipments")
                .insert({
                    organization_id: org.id,
                    supplier_name: 'COPEC (EMAIL)',
                    dispatch_note_number: parsedData.external_id,
                    external_id: parsedData.external_id,
                    order_number: parsedData.order_number,
                    status: 'PRE_ADVISED'
                })
                .select("id")
                .single();

            if (sError) throw sError;

            // Insertar ítems si vienen
            if (parsedData.items && parsedData.items.length > 0) {
                // Mapear SKUs a IDs de inventario
                const itemsToInsert = await Promise.all(parsedData.items.map(async (item) => {
                    const { data: invItem } = await supabase
                        .from("manmec_inventory_items")
                        .select("id")
                        .eq("organization_id", org.id)
                        .eq("sku", item.sku)
                        .maybeSingle();

                    return {
                        shipment_id: shipment.id,
                        item_id: invItem?.id || null,
                        expected_qty: item.quantity,
                        received_qty: 0,
                        notes: `Detectado en email: ${item.description}`
                    };
                }));

                const { error: itemsError } = await supabase
                    .from("manmec_shipment_items")
                    .insert(itemsToInsert.filter(i => i.item_id !== null));

                if (itemsError) console.error("Error insertando items de pre-guía:", itemsError);
            }

            return NextResponse.json({ success: true, type: 'SHIPMENT', id: shipment.id });
        }

        return NextResponse.json({ error: "Unknown notification type" }, { status: 400 });

    } catch (error: any) {
        console.error("🚨 Error procesando webhook de correo:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
