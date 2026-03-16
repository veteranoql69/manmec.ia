import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = 'force-dynamic';

/**
 * Endpoint para importación masiva de insumos desde n8n / Google Sheets.
 * Soporta Upsert basado en SKU + Organization ID.
 */
export async function POST(req: NextRequest) {
    const startTime = Date.now();
    try {
        console.log("📥 Iniciando importación masiva de inventario...");
        const supabase = createAdminClient();

        // Leer el body como texto primero para ver el tamaño
        const bodyText = await req.text();
        console.log(`📏 Tamaño del body recibido: ${(bodyText.length / 1024).toFixed(2)} KB`);

        const body = JSON.parse(bodyText);

        // n8n enviará un array de items o un solo objeto
        const items = Array.isArray(body) ? body : [body];

        if (items.length === 0) {
            return NextResponse.json({ error: "No data provided" }, { status: 400 });
        }

        // 1. Obtener la organización (flexibilidad total)
        const orgId = items[0].organization_id ||
            items[0].org_id ||
            items[0].id_organizacion ||
            req.headers.get("x-organization-id");

        if (!orgId) {
            return NextResponse.json({
                error: "organization_id is required. Add it to each row in n8n or send it as 'x-organization-id' header."
            }, { status: 400 });
        }

        // 2. Mapeo y Normalización (Ajustado a tus nombres exactos de Excel)
        const preparedItems = items.map(item => ({
            organization_id: orgId,
            sku: String(item.Material || item.sku || "").trim(),
            name: String(item["Texto breve de material"] || item["Texto breve material"] || item.name || "Sin nombre").trim(),
            min_stock: Number(item["Punto de pedido"] || item["Punto pedido"] || item.min_stock || 0),
            unit: String(item.unit || "unidad"),
            is_active: true,
            updated_at: new Date().toISOString()
        })).filter(i => i.sku !== "");

        if (preparedItems.length === 0) {
            return NextResponse.json({ error: "No valid items with SKU found" }, { status: 400 });
        }

        // 3. Upsert en Chunks (para evitar timeouts de la DB)
        const CHUNK_SIZE = 100;
        let processedCount = 0;

        for (let i = 0; i < preparedItems.length; i += CHUNK_SIZE) {
            const chunk = preparedItems.slice(i, i + CHUNK_SIZE);
            console.log(`⏳ Procesando lote ${Math.floor(i / CHUNK_SIZE) + 1} (${chunk.length} items)...`);

            const { error: upsertError } = await supabase
                .from("manmec_inventory_items")
                .upsert(chunk, {
                    onConflict: 'organization_id,sku',
                    ignoreDuplicates: false
                });

            if (upsertError) {
                console.error("❌ Error en lote de upsert:", upsertError);
                throw upsertError;
            }
            processedCount += chunk.length;
        }

        const duration = (Date.now() - startTime) / 1000;
        console.log(`✨ Importación completada: ${processedCount} items en ${duration}s`);

        return NextResponse.json({
            success: true,
            count: processedCount,
            duration: `${duration}s`,
            message: `Se han procesado ${processedCount} insumos correctamente.`
        });

    } catch (error: any) {
        console.error("❌ Global Error in Inventory Import:", error);
        return NextResponse.json({ error: error.message || "Internal Server Error" }, { status: 500 });
    }
}
