import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseEmailWithIA } from "@/lib/ai/email-parser";
import fs from "fs";

function logToFile(msg: string) {
    const timestamp = new Date().toISOString();
    fs.appendFileSync('webhook.log', `[${timestamp}] ${msg}\n`);
    console.log(msg);
}

/**
 * Endpoint para recibir notificaciones automáticas vía Webhook.
 * Simula la recepción de correos electrónicos.
 */
export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();
        const { from, to, subject, body } = payload;
        const fromDomain = from.split('@')[1];

        const supabase = createAdminClient();

        // 1. Validar Organización por el email de destino
        const { data: org, error: orgError } = await supabase
            .from("manmec_organizations")
            .select("id, name, allowed_email_domains")
            .contains('allowed_email_domains', [fromDomain])
            .limit(1)
            .maybeSingle();

        if (!org) {
            console.error(`❌ Organización no encontrada para el correo: ${to}`);
            return NextResponse.json({ error: `Organization not found for email: ${to}` }, { status: 404 });
        }

        // 2. Procesar con IA (Detectar si hay archivos adjuntos)
        const attachment = payload.attachments?.find((a: any) => a.filename.toLowerCase().endsWith('.pdf'));
        const pdfBuffer = attachment ? Buffer.from(attachment.content, 'base64') : undefined;

        logToFile(`🧠 Procesando correo para org: ${org.name}${pdfBuffer ? ' (con PDF)' : ''}`);

        // 1.8. Obtener un usuario base de la organización para las acciones automáticas
        let { data: adminUser } = await supabase
            .from("manmec_users")
            .select("id")
            .eq("organization_id", org.id)
            .limit(1)
            .maybeSingle();

        const finalUserId = adminUser?.id || 'c09534c9-cbd4-4bf3-bb9a-7acdd30abf98';

        const parsedData = await parseEmailWithIA(body, pdfBuffer);
        logToFile(`🤖 IA Parsed Data Type: ${parsedData.type}`);
        fs.appendFileSync('webhook.log', `[${new Date().toISOString()}] AI Type: ${parsedData.type}\n`);

        const pType = String(parsedData.type).toUpperCase();

        if (pType === 'OT_NOTIFICATION' || pType === 'OT_OPEN' || pType === 'OT_OPENED') {
            // 3a. Crear OT Automática
            let { data: station } = await supabase
                .from("manmec_service_stations")
                .select("id, name")
                .eq("organization_id", org.id)
                .or(`sap_store_code.eq.${parsedData.station_code},name.ilike.%${parsedData.station_code}%`)
                .maybeSingle();

            if (!station) {
                const { data: fallbackSt } = await supabase.from("manmec_service_stations").select("id, name").eq("organization_id", org.id).limit(1).maybeSingle();
                station = fallbackSt;
            }

            const { data: wo, error: woError } = await supabase
                .from("manmec_work_orders")
                .insert({
                    organization_id: org.id,
                    station_id: station?.id,
                    title: parsedData.title || "OT Automática desde Email",
                    description: parsedData.description,
                    external_id: parsedData.external_id,
                    external_source: 'COPEC_EMAIL',
                    priority: parsedData.priority || 'P3',
                    source: 'EMAIL',
                    metadata: parsedData.metadata || {},
                    created_by: finalUserId
                })
                .select("id")
                .single();

            if (woError) return NextResponse.json({ error: "ERR_OPEN_OT: " + woError.message }, { status: 500 });
            return NextResponse.json({ success: true, type: 'OT_OPENED', id: wo.id, debug: "[FINAL_OK]" });

        } else if (pType === 'OT_CLOSURE' || pType === 'OT_CLOSED') {
            // 3b. Cierre Automático de OT
            logToFile(`🔎 Buscando OT para cierre: external_id=[${parsedData.external_id}]`);
            const { data: existingWo } = await supabase
                .from("manmec_work_orders")
                .select("id, title, vehicle_id")
                .eq("organization_id", org.id)
                .eq("external_id", parsedData.external_id)
                .maybeSingle();

            if (!existingWo) {
                logToFile(`❌ OT with external_id ${parsedData.external_id} not found for closure`);
                return NextResponse.json({ error: `OT with external_id ${parsedData.external_id} not found for closure` }, { status: 404 });
            }

            // --- ULTRA ROBUST UPDATE ---
            await supabase
                .from("manmec_work_orders")
                .update({
                    status: 'COMPLETED',
                    completed_at: new Date().toISOString(),
                    metadata: { ...(parsedData.metadata || {}), closure_source: 'EMAIL_PDF' }
                })
                .eq("id", existingWo.id);

            // 1.9. Automatización de Materiales e Inventario
            const repuestos = parsedData.metadata?.repuestos || [];
            logToFile(`📦 Repuestos detectados: ${JSON.stringify(repuestos)}`);
            if (repuestos.length > 0) {
                logToFile(`📦 Procesando ${repuestos.length} repuestos para inventario...`);
                for (const rep of repuestos) {
                    try {
                        logToFile(`🔍 Buscando item: [${rep.nombre}] (Cod: ${rep.codigo})`);
                        // Buscar Item por SKU o Nombre
                        const { data: item } = await supabase
                            .from("manmec_inventory_items")
                            .select("id, name")
                            .or(`sku.eq.${rep.codigo},name.ilike.%${rep.nombre}%`)
                            .limit(1)
                            .maybeSingle();

                        if (item) {
                            logToFile(`✅ Item encontrado: ${item.name} (ID: ${item.id})`);
                            // a. Registrar en materiales de la OT
                            const { error: matErr } = await supabase.from("manmec_work_order_materials").insert({
                                work_order_id: existingWo.id,
                                item_id: item.id,
                                quantity: rep.cantidad,
                                notes: "Validado por IA (PDF)"
                            });
                            if (matErr) logToFile(`❌ Error al insertar material: ${matErr.message}`);

                            // b. Registrar movimiento de salida para descuento
                            const { error: movErr } = await supabase.from("manmec_inventory_movements").insert({
                                item_id: item.id,
                                work_order_id: existingWo.id,
                                user_id: finalUserId,
                                type: 'OUT',
                                quantity: rep.cantidad,
                                reason: `Consumo automático vía PDF (OT: ${parsedData.external_id})`
                            });
                            if (movErr) logToFile(`❌ Error al insertar movimiento: ${movErr.message}`);

                            logToFile(`✅ Material procesado completo: ${item.name}`);
                        } else {
                            logToFile(`⚠️ Item no encontrado en DB para: ${rep.nombre}`);
                        }
                    } catch (matErr: any) {
                        logToFile(`❌ Exception procesando material [${rep.nombre}]: ${matErr.message}`);
                    }
                }
            }

            // 2. Insert timeline MANUAL (con ID garantizado)
            const { error: timelineError } = await supabase.from("manmec_work_order_timeline").insert({
                work_order_id: existingWo.id,
                user_id: finalUserId,
                entry_type: 'note',
                content: `OT cerrada automáticamente vía email. Se detectaron y descontaron ${repuestos.length} insumos de inventario.`,
                metadata: parsedData.metadata
            });

            if (timelineError) {
                logToFile(`🚨 TIMELINE ERROR: ${timelineError.message}`);
                return NextResponse.json({ error: "TIMELINE_FAILED: " + timelineError.message }, { status: 500 });
            }

            return NextResponse.json({ success: true, type: 'OT_CLOSED', id: existingWo.id, debug: "[ULTRA_OK]" });

        } else if (pType === 'SHIPMENT' || pType === 'SHIPMENT_NOTIFICATION') {
            // 3c. Crear Pre-Guía de Despacho
            const { data: shipment, error: sError } = await supabase
                .from("manmec_shipments")
                .insert({
                    organization_id: org.id,
                    supplier_name: 'COPEC (EMAIL)',
                    dispatch_note_number: parsedData.external_id,
                    external_id: parsedData.external_id,
                    order_number: parsedData.order_number,
                    status: 'PRE_ADVISED',
                    ocr_data: parsedData
                })
                .select("id")
                .single();

            if (sError) return NextResponse.json({ error: "ERR_SHIPMENT: " + sError.message }, { status: 500 });
            return NextResponse.json({ success: true, type: 'SHIPMENT', id: shipment.id, debug: "[FINAL_OK]" });
        }

        return NextResponse.json({ error: "Unknown notification type: " + pType }, { status: 400 });

    } catch (error: any) {
        console.error("❌ Global Error in Webhook:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
