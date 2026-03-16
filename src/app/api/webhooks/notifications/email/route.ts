import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { parseEmailWithIA } from "@/lib/ai/email-parser";

export const dynamic = 'force-dynamic';

/**
 * Sistema de Logs para Webhook (Producción friendly)
 */
function logWebhook(msg: string) {
    console.log(`[WEBHOOK_SYS] ${msg}`);
}

/**
 * Endpoint para recibir notificaciones automáticas vía Webhook.
 */
export async function POST(req: NextRequest) {
    try {
        const payload = await req.json();
        
        // --- AUTOCORRECCIÓN DE PAYLOAD (n8n/Common Typos) ---
        // A veces n8n añade un espacio al final: "attachments "
        if (payload["attachments "] && !payload.attachments) {
            payload.attachments = payload["attachments "];
        }

        logWebhook(`📦 Full Payload Keys: ${Object.keys(payload).join(', ')}`);
        if (payload.attachments) {
            logWebhook(`📎 Attachments is present. Type: ${typeof payload.attachments}. Length: ${Array.isArray(payload.attachments) ? payload.attachments.length : 'Not an array'}`);
        }
        const { from, to, subject, body, attachments } = payload;

        const rawFrom = String(from || "");
        const rawTo = String(to || "");
        const allEmails = [
            ...[...rawTo.matchAll(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi)].map(m => m[1]),
            ...[...rawFrom.matchAll(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/gi)].map(m => m[1])
        ];
        const allDomains = [...new Set(allEmails.map(e => e.split('@')[1].toLowerCase()))];

        const supabase = createAdminClient();
        const { data: org } = await supabase
            .from("manmec_organizations")
            .select("id, name, allowed_email_domains, ai_settings")
            .overlaps('allowed_email_domains', allDomains)
            .limit(1)
            .maybeSingle();

        if (!org) {
            logWebhook(`❌ Org not found for domains: ${allDomains.join(', ')}`);
            return NextResponse.json({ error: `Org not found` }, { status: 404 });
        }

        logWebhook(`🏢 Matched Org: ${org.name} (ID: ${org.id})`);

        const receivedNames = (attachments || []).map((a: any) => a.filename).join(', ');
        logWebhook(`📎 Adjuntos recibidos: ${receivedNames || 'Ninguno'}`);

        if (attachments && Array.isArray(attachments) && attachments.length > 0) {
            const firstKeys = Object.keys(attachments[0]).join(', ');
            logWebhook(`📎 Primer adjunto tiene llaves: ${firstKeys}`);
        }

        const validAttachments = (attachments || []).filter((a: any) => {
            const name = (a.filename || "").toLowerCase();
            const rawContent = a.content || a.data || a.base64 || "";
            const hasContent = rawContent.length > 0;
            const isChecklist = name.includes('checklist') || name.includes('revisión');
            
            // Relajamos el filtro: Si es PDF y tiene contenido y NO es un checklist, lo procesamos.
            // Guardamos el contenido estandarizado en el objeto para uso posterior
            a.standardizedContent = rawContent;
            return name.endsWith('.pdf') && !isChecklist && hasContent;
        });

        // Usuario base para acciones automáticas
        const { data: adminUser } = await supabase.from("manmec_users").select("id").eq("organization_id", org.id).limit(1).maybeSingle();
        const finalUserId = adminUser?.id || 'c09534c9-cbd4-4bf3-bb9a-7acdd30abf98';
        const aiSettings = (org.ai_settings as any) || {};
        const visionModel = aiSettings.model_matrix?.vision || "models/gemini-1.5-flash";

        logWebhook(`🧠 Procesando correo (${org.name}): ${validAttachments.length} adjuntos válidos.`);

        const results: any[] = [];

        // CASO A: Hay adjuntos (Procesamos cada PDF de forma independiente)
        if (validAttachments.length > 0) {
            for (const [index, att] of validAttachments.entries()) {
                logWebhook(`📄 Procesando adjunto ${index + 1}/${validAttachments.length}: ${att.filename}`);
                try {
                    const buffer = Buffer.from(att.standardizedContent, 'base64');
                    const res = await processEmailUnit(supabase, org, body, subject, finalUserId, visionModel, payload, buffer);
                    results.push({ attachment: att.filename, ...res });
                } catch (err: any) {
                    logWebhook(`❌ Error procesando adjunto ${att.filename}: ${err.message}`);
                    results.push({ attachment: att.filename, error: err.message });
                }
            }
        } else {
            // CASO B: No hay adjuntos (Procesamos solo el cuerpo/asunto)
            logWebhook(`📧 Sin adjuntos validos. Procesando cuerpo del mensaje.`);
            try {
                const res = await processEmailUnit(supabase, org, body, subject, finalUserId, visionModel, payload);
                results.push({ processing_mode: 'BODY_ONLY', ...res });
            } catch (err: any) {
                logWebhook(`❌ Error procesando cuerpo: ${err.message}`);
                results.push({ error: err.message });
            }
        }

        return NextResponse.json({ success: true, results });

    } catch (error: any) {
        logWebhook(`❌ Global Webhook Error: ${error.message}`);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

/**
 * Procesa una unidad lógica de notificación (un PDF o el cuerpo del correo).
 */
async function processEmailUnit(
    supabase: any,
    org: any,
    body: string,
    subject: string,
    finalUserId: string,
    visionModel: string,
    originalPayload: any,
    pdfBuffer?: Buffer
) {
    let parsedData: any = null;
    let status: 'SUCCESS' | 'ERROR' | 'WARNING' = 'SUCCESS';
    let errorMessage: string | null = null;
    let finalResult: any = null;

    try {
        try {
            parsedData = await parseEmailWithIA(body, pdfBuffer, visionModel, subject);
            const rawDebug = JSON.stringify(parsedData);
            logWebhook(`🤖 IA Unit Parsed (Raw): ${rawDebug}`);
        } catch (err: any) {
            status = 'ERROR';
            errorMessage = `AI_PARSING_FAILED: ${err.message}`;
            throw err;
        }

        const rawType = parsedData.type || (parsedData as any).email_type || (parsedData as any).class_name || "UNDEFINED";
        const pType = String(rawType).toUpperCase();

        // --- 1. APERTURA DE OT ---
        if (pType === 'OT_NOTIFICATION' || pType === 'OT_OPEN' || pType === 'OT_OPENED') {
            let station_code = parsedData.station_code;
            let detectionSource = "AI_PARSED";

            const subjectMatch = subject.match(/(\d{5})/);
            if (subjectMatch) {
                station_code = subjectMatch[1];
                detectionSource = "EMAIL_SUBJECT";
            } else {
                const titleMatch = (parsedData.title || "").match(/(\d{5})/);
                if (titleMatch) {
                    station_code = titleMatch[1];
                    detectionSource = "AI_TITLE_REGEX";
                } else if (!station_code || station_code === 'null') {
                    const bodyMatch = body.match(/(\d{5})/);
                    if (bodyMatch) {
                        station_code = bodyMatch[1];
                        detectionSource = "EMAIL_BODY_REGEX";
                    }
                }
            }

            logWebhook(`🔍 Station Identification: Code=[${station_code}] Source=[${detectionSource}]`);

            let { data: station } = await supabase.from("manmec_service_stations")
                .select("id, name")
                .eq("organization_id", org.id)
                .eq("code", station_code)
                .maybeSingle();

            if (!station && station_code) {
                const { data: stByName } = await supabase.from("manmec_service_stations")
                    .select("id, name")
                    .eq("organization_id", org.id)
                    .ilike("name", `%${station_code}%`)
                    .limit(1)
                    .maybeSingle();
                station = stByName;
            }

            if (!station) {
                logWebhook(`❌ Error: Estación [${station_code}] no encontrada en DB.`);
                finalResult = { type: 'ERROR', error: `Estación [${station_code || 'DESCONOCIDA'}] no encontrada.` };
                status = 'WARNING';
                errorMessage = `STATION_NOT_FOUND: ${station_code}`;
            } else {
                if (parsedData.external_id) {
                    const { data: checkWo } = await supabase.from("manmec_work_orders").select("id").eq("organization_id", org.id).eq("external_id", parsedData.external_id).maybeSingle();
                    if (checkWo) {
                        finalResult = { type: 'OT_ALREADY_EXISTS', id: checkWo.id, external_id: parsedData.external_id };
                    }
                }

                if (!finalResult) {
                    const { data: wo, error: woError } = await supabase.from("manmec_work_orders").insert({
                        organization_id: org.id,
                        station_id: station?.id,
                        title: parsedData.title || "OT Automática",
                        description: parsedData.description,
                        external_id: parsedData.external_id,
                        sap_order_id: parsedData.order_id,
                        external_source: 'COPEC_EMAIL',
                        priority: parsedData.priority || 'P3',
                        source: 'EMAIL',
                        metadata: { ...(parsedData.metadata || {}), detected_station_code: parsedData.station_code },
                        created_by: finalUserId
                    }).select("id").single();

                    if (woError) {
                        if (woError.code === '23505') finalResult = { type: 'OT_ALREADY_EXISTS', debug: 'CONCURRENT' };
                        else throw new Error("ERR_OPEN_OT: " + woError.message);
                    } else {
                        finalResult = { type: 'OT_OPENED', id: wo.id, external_id: parsedData.external_id };
                    }
                }
            }
        }

        // --- 2. CIERRE DE OT ---
        else if (pType === 'OT_CLOSURE' || pType === 'OT_CLOSED') {
            const metadata = (parsedData.metadata || {}) as any;
            const tipoMtto = String(metadata.tipo_mantenimiento || 'UNKNOWN').toUpperCase();
            
            let matchQuery = supabase.from("manmec_work_orders").select("id").eq("organization_id", org.id);
            const filterOr = [];
            if (parsedData.external_id) {
                filterOr.push(`external_id.eq.${parsedData.external_id}`, `sap_order_id.eq.${parsedData.external_id}`);
            }
            if (parsedData.order_id && parsedData.order_id !== 'null') {
                filterOr.push(`sap_order_id.eq.${parsedData.order_id}`, `external_id.eq.${parsedData.order_id}`);
            }

            const { data: existingWo } = await matchQuery.or(filterOr.join(',')).limit(1).maybeSingle();
            let targetWoId = existingWo?.id;
            let wasReactive = false;

            if (!existingWo) {
                wasReactive = true;
                let station_code = parsedData.station_code;
                const subjectMatch = subject.match(/(\d{5})/);
                if (subjectMatch) station_code = subjectMatch[1];

                const { data: st } = await supabase.from("manmec_service_stations").select("id").eq("organization_id", org.id).eq("code", station_code).maybeSingle();
                if (!st) {
                    finalResult = { type: 'ERROR', error: `Estación [${station_code}] no encontrada para cierre.` };
                    status = 'WARNING';
                    errorMessage = `REACTIVE_STATION_NOT_FOUND: ${station_code}`;
                } else {
                    const { data: newWo, error: newErr } = await supabase.from("manmec_work_orders").insert({
                        organization_id: org.id,
                        station_id: st?.id,
                        title: parsedData.title || `OT Recuperada: ${parsedData.external_id}`,
                        external_id: parsedData.external_id,
                        sap_order_id: parsedData.order_id,
                        status: 'COMPLETED',
                        completed_at: new Date().toISOString(),
                        metadata: { ...metadata, closure_source: 'EMAIL_PDF', reactive_creation: true },
                        created_by: finalUserId
                    }).select("id").single();
                    if (newErr) throw new Error("ERR_REACTIVE_OT: " + newErr.message);
                    targetWoId = newWo.id;
                }
            } else {
                await supabase.from("manmec_work_orders").update({
                    status: 'COMPLETED',
                    completed_at: new Date().toISOString(),
                    metadata: { ...metadata, closure_source: 'EMAIL_PDF' }
                }).eq("id", targetWoId);
            }

            if (targetWoId) {
                const repuestos = (metadata.repuestos || []) as any[];
                for (const rep of repuestos) {
                    const { data: item } = await supabase.from("manmec_inventory_items")
                        .select("id")
                        .eq("organization_id", org.id)
                        .eq("sku", String(rep.codigo))
                        .maybeSingle();

                    if (item) {
                        await supabase.from("manmec_work_order_materials").insert({
                            work_order_id: targetWoId,
                            item_id: item.id,
                            quantity: Number(rep.cantidad)
                        });
                        // Autodeducción (Bodega Central por defecto)
                        const { data: centralWh } = await supabase.from("manmec_warehouses")
                            .select("id").eq("organization_id", org.id).eq("type", 'FIXED').limit(1).maybeSingle();
                        if (centralWh) {
                            await supabase.from("manmec_inventory_movements").insert({
                                item_id: item.id,
                                warehouse_id: centralWh.id,
                                work_order_id: targetWoId,
                                user_id: finalUserId,
                                type: 'OUT',
                                quantity: Number(rep.cantidad),
                                reason: `IA Auto-Deduction (${parsedData.external_id})`
                            });
                        }
                    }
                }
                const timelineMsg = `${wasReactive ? '⚠️ OT Reactiva. ' : ''}Cerrada vía email. ${repuestos.length} repuestos procesados.`;
                await supabase.from("manmec_work_order_timeline").insert({
                    work_order_id: targetWoId,
                    user_id: finalUserId,
                    entry_type: 'note',
                    content: timelineMsg
                });
                finalResult = { type: 'OT_CLOSED', id: targetWoId, external_id: parsedData.external_id, materials: repuestos.length };
            }
        }

        // --- 3. GUÍA DE DESPACHO ---
        else if (pType === 'SHIPMENT' || pType === 'SHIPMENT_NOTIFICATION') {
            const { data: shipment, error: sErr } = await supabase.from("manmec_shipments").insert({
                organization_id: org.id,
                supplier_name: 'COPEC (EMAIL)',
                dispatch_note_number: parsedData.external_id,
                status: 'PRE_ADVISED',
                ocr_data: parsedData
            }).select("id").single();
            if (sErr) throw new Error("ERR_SHIPMENT: " + sErr.message);
            finalResult = { type: 'SHIPMENT_CREATED', id: shipment.id };
        }

        else {
            finalResult = { type: 'UNKNOWN', data: parsedData };
        }

    } catch (err: any) {
        status = 'ERROR';
        errorMessage = err.message;
        finalResult = finalResult || { type: 'ERROR', error: err.message };
    } finally {
        // --- AUDITORÍA UNIFICADA ---
        try {
            await supabase.from("manmec_ia_automation_logs").insert({
                organization_id: org.id,
                external_id: parsedData?.external_id || null,
                type: parsedData?.type || 'UNKNOWN',
                status: status,
                raw_payload: originalPayload,
                ai_response: parsedData,
                error_message: errorMessage
            });
        } catch (auditErr: any) {
            logWebhook(`⚠️ Fallo al insertar log de auditoría: ${auditErr.message}`);
        }
    }

    return finalResult;
}


