import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        console.log("📥 Iniciando importación masiva de preventivos (PM02)...");
        const supabaseAdmin = createAdminClient();
        const supabase = await createClient();

        // 🛡️ Seguridad y Autenticación: Validar sesión del gerente/usuario
        const { data: { user }, error: authError } = await supabase.auth.getUser();
        if (authError || !user) {
            return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
        }

        let orgId = user.user_metadata?.organization_id;

        // Si no está en la data de sesión (usuarios antiguos), buscamos en tabla.
        if (!orgId) {
            const { data: dbUser } = await supabaseAdmin
                .from("manmec_users")
                .select("organization_id")
                .eq("id", user.id)
                .single();
            orgId = dbUser?.organization_id;
        }

        if (!orgId) {
            return NextResponse.json({ error: "organization_id is required from session." }, { status: 400 });
        }

        // Leer el body (JSON)
        const body = await req.json();

        // n8n o la UI enviará un array de items
        const items = Array.isArray(body) ? body : [body];

        if (items.length === 0) {
            return NextResponse.json({ error: "No data provided" }, { status: 400 });
        }

        if (items.length > 0) {
            console.log("🛠️ Llaves del primer registro:", Object.keys(items[0]).join(", "));
            console.log("🔎 Valores detectados en el primer registro:");
            const first = items[0];
            const findValue = (keywords: string[]) => {
                const key = Object.keys(first).find(k => {
                    const normalizedKey = k.toLowerCase().trim().replace(/[^\w\s°º]/g, '');
                    return keywords.some(kw => normalizedKey.includes(kw.toLowerCase()));
                });
                return key ? { key, value: String(first[key]).trim() } : { key: "no encontrada", value: "" };
            };
            console.log("- ExternalId:", findValue(["orden", "aviso", "numero"]));
            console.log("- StationCode:", findValue(["e/s", "eds", "sap_store_code"]));
        }

        // 1. Obtención de estaciones para mapeo E/S -> station_id
        const { data: stations, error: stationsError } = await supabaseAdmin
            .from("manmec_service_stations")
            .select("id, code, sap_store_code, sap_store_id, name")
            .eq("organization_id", orgId);

        if (stationsError) throw stationsError;

        const stationMap = new Map();
        stations?.forEach(s => {
            if (s.code && String(s.code).toLowerCase() !== 'n/a') stationMap.set(String(s.code).trim(), s.id);
            if (s.sap_store_code) stationMap.set(String(s.sap_store_code).trim(), s.id);
            if (s.sap_store_id) stationMap.set(String(s.sap_store_id).trim(), s.id);
        });

        // 2. Mapeo y normalización de datos del CSV/Excel (Resiliente a encabezados)
        const preparedOrders = items.map((item: any) => {
            // Función auxiliar para buscar valores por "parecido" en los keys
            const findValue = (keywords: string[]) => {
                const key = Object.keys(item).find(k => {
                    const normalizedKey = k.toLowerCase().trim().replace(/[^\w\s°º]/g, '');
                    return keywords.some(kw => normalizedKey.includes(kw.toLowerCase()));
                });
                return key ? String(item[key]).trim() : "";
            };

            const externalId = findValue(["orden", "aviso", "external_id", "numero"]);
            const esCode = findValue(["e/s", "es_code", "estacion", "sap_store_code", "eds"]);
            const text = findValue(["texto", "breve", "title", "descripcion"]);

            if (!externalId) {
                console.log("⚠️ Registro ignorado por falta de externalId. Keys detectadas:", Object.keys(item));
                return null;
            }

            // Intentar matchear la estación por su Cód. SAP
            const stationId = stationMap.get(esCode) || null;
            if (!stationId) {
                console.log(`⚠️ No se encontró ID para Estación/EDS: [${esCode}]`);
            }

            return {
                organization_id: orgId,
                created_by: user.id,
                title: text || `Mantenimiento Preventivo PM02 - ${esCode}`,
                description: `Importación masiva. ${text}`,
                status: 'PENDING',
                priority: 'PM',
                source: 'manual',
                ot_type: 'PREVENTIVE',
                external_id: externalId,
                sap_order_id: externalId, // Mapeamos el N° Orden aquí también para match de cierre
                station_id: stationId,
                metadata: {
                    tipo_mantenimiento: "PM02",
                    origen: "carga_masiva_csv",
                    sap_store_code_original: esCode
                },
                updated_at: new Date().toISOString()
            };
        }) as any;
        const finalOrders = preparedOrders.filter((o: any) => o !== null);
        console.log(`📊 Total items: ${items.length}, Válidos: ${finalOrders.length}`);

        if (finalOrders.length === 0) {
            console.log("❌ No se encontraron órdenes válidas. Primer registro:", JSON.stringify(items[0]));
            return NextResponse.json({
                error: "No se encontraron órdenes válidas con columna 'Orden' o 'Aviso'. Revise el encabezado del archivo.",
                details: items.length > 0 ? { keys: Object.keys(items[0]) } : "Archivo vacío"
            }, { status: 400 });
        }

        let processedCount = 0;
        let errorsCount = 0;

        for (const order of finalOrders) {
            try {
                if (!order.station_id) {
                    throw new Error(`Estación [${order.metadata.sap_store_code_original}] no encontrada en el sistema. Debe crear la estación con el código SAP correcto primero.`);
                }

                const { data: existing, error: fetchError } = await supabaseAdmin
                    .from("manmec_work_orders")
                    .select("id")
                    .eq("organization_id", orgId)
                    .eq("external_id", order.external_id)
                    .maybeSingle();

                if (fetchError) throw fetchError;

                if (processedCount === 0) {
                    console.log("🛠️ Llaves del objeto a insertar:", Object.keys(order).join(", "));
                }

                if (existing) {
                    const { error: updateError } = await supabaseAdmin
                        .from("manmec_work_orders")
                        .update({
                            title: order.title,
                            station_id: order.station_id,
                            sap_order_id: order.sap_order_id,
                            metadata: { ...order.metadata }
                        })
                        .eq("id", existing.id);

                    if (updateError) throw updateError;
                } else {
                    const { error: insertError } = await supabaseAdmin
                        .from("manmec_work_orders")
                        .insert(order);

                    if (insertError) throw insertError;
                }
                processedCount++;
            } catch (err: any) {
                console.error(`❌ Error en registro [${order.external_id}]:`, err);
                errorsCount++;
                // Retornamos el primer error real para diagnóstico
                return NextResponse.json({
                    error: "Error de Base de Datos",
                    details: err.message || JSON.stringify(err),
                    code: err.code
                }, { status: 500 });
            }
        }

        const isSuccess = processedCount > 0;
        return NextResponse.json({
            success: isSuccess,
            count: processedCount,
            errors: errorsCount,
            totalItems: items.length,
            message: isSuccess
                ? `Se han procesado ${processedCount} órdenes correctamente.`
                : `No se pudo procesar ninguna orden. Errores: ${errorsCount}.`
        }, { status: isSuccess ? 200 : 400 });

    } catch (error: any) {
        console.error("❌ Global Error in PM02 Import:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
