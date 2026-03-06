"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { GoogleGenerativeAI } from "@google/generative-ai";

export async function generateLogisticsSuggestion(otId: string, currentVehicleId: string) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    // 1. Obtener datos de la OT actual
    const { data: currentOt, error: otError } = await supabase
        .from("manmec_work_orders")
        .select("title, description, code, station_id")
        .eq("id", otId)
        .single();

    if (otError || !currentOt) throw new Error("OT no encontrada");

    // 2. Buscar histórico: últimas 20 OTs con el mismo título o falla en la misma ORG
    // Buscamos código exacto o título parecido
    let query = supabase
        .from("manmec_work_orders")
        .select(`
            id, title,
            materials:manmec_work_order_materials(
                quantity,
                item:manmec_inventory_items(name, sku, unit)
            )
        `)
        .eq("organization_id", profile.organization_id)
        .neq("id", otId)
        .order("created_at", { ascending: false })
        .limit(20);

    if (currentOt.code) {
        query = query.or(`code.eq.${currentOt.code},title.ilike.%${currentOt.title}%`);
    } else {
        query = query.ilike("title", `%${currentOt.title}%`);
    }

    const { data: historyOts } = await query;

    // 3. Resumir uso histórico
    const usageMap: Record<string, { name: string, sku: string, totalQty: number, count: number }> = {};
    let totalHistoricalOtsWithMaterials = 0;

    if (historyOts) {
        historyOts.forEach((hot) => {
            const materials = (hot.materials as unknown) as Array<{
                quantity: number;
                item: { name: string; sku: string; unit: string } | { name: string; sku: string; unit: string }[] | null;
            }>;
            if (materials && materials.length > 0) {
                totalHistoricalOtsWithMaterials++;
                materials.forEach((mat) => {
                    const item = Array.isArray(mat.item) ? mat.item[0] : mat.item;
                    const sku = item?.sku;
                    if (!sku) return;
                    if (!usageMap[sku]) {
                        usageMap[sku] = { name: item!.name, sku: sku, totalQty: 0, count: 0 };
                    }
                    usageMap[sku].totalQty += mat.quantity;
                    usageMap[sku].count += 1;
                });
            }
        });
    }

    // 4. Obtener stock actual del furgón
    const currentStockMap: Record<string, number> = {};
    const { data: warehouse } = await supabase
        .from("manmec_warehouses")
        .select("id")
        .eq("vehicle_id", currentVehicleId)
        .eq("type", "MOBILE")
        .maybeSingle();

    if (warehouse) {
        const { data: stock } = await supabase
            .from("manmec_inventory_stock")
            .select(`quantity, item:manmec_inventory_items!item_id(sku)`)
            .eq("warehouse_id", warehouse.id);

        if (stock) {
            ((stock as unknown) as Array<{ quantity: number; item: { sku: string } | { sku: string }[] | null }>).forEach((s) => {
                const item = Array.isArray(s.item) ? s.item[0] : s.item;
                if (item?.sku) {
                    currentStockMap[item.sku] = s.quantity;
                }
            });
        }
    }

    // 5. Preparar Prompt para Gemini
    const historicalContextText = Object.values(usageMap).map(u =>
        `- ${u.name} (SKU: ${u.sku}): Usado en ${u.count} OTs similares, total histórico ${u.totalQty} unidades.`
    ).join("\n");

    const currentStockText = Object.keys(currentStockMap).length > 0
        ? Object.entries(currentStockMap).map(([sku, qty]) => `- SKU ${sku}: ${qty} unidades en furgón`).join("\n")
        : "El furgón actualmente no tiene stock registrado.";

    const prompt = `
Eres el cerebro logístico experto en mantención de estaciones de servicio de la plataforma Manmec.
Estamos pre-asignando materiales para esta Orden de Trabajo:
- Falla/Título: "${currentOt.title}"
- Descripción: "${currentOt.description || 'N/A'}"

Basado en nuestra base de datos histórica, analicé ${totalHistoricalOtsWithMaterials} OTs similares y encontré estos consumos frecuentes:
${historicalContextText || "No hay consumo histórico registrado (en este caso, infiere qué insumos lógicos o genéricos de surtidores podrían necesitarse basándote estrictamente en el título de la OT, pero procura ser conservador y devuelve un arreglo vacío si no hay certeza)."}

El furgón que irá a terreno tiene este stock actual a bordo:
${currentStockText}

Tu tarea: Analizar el consumo histórico frente al stock del furgón e identificar qué materiales o repuestos EL FURGÓN DEBE IR A BUSCAR A BODEGA CENTRAL URGENTE (Traspasar) antes de salir.
Si el furgón ya tiene saldo suficiente de lo que estadísticamente se ocupa, no lo sugieras, o sugiere la diferencia.
Devuelve EXCLUSIVAMENTE un arreglo JSON válido (sin texto antes ni después, sin marcas de bloque markdown tipo \`\`\`) con la siguiente estructura:
[
  {
    "name": "Nombre exacto del material / herramienta",
    "sku": "SKU (usa el que aparece arriba)",
    "suggestedQty": número entero (cuántos traspasar extra al furgón),
    "currentStock": número (lo que tiene el furgón),
    "reason": "Explicación muy breve (Ej: 'Frecuente en fallas de placa y no hay stock en móvil')"
  }
]
    `;

    // 6. Ejecutar Gemini
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("Gemini API Key faltante en variables de entorno");

    const genAI = new GoogleGenerativeAI(apiKey);
    const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash" });

    try {
        const result = await model.generateContent(prompt);
        let text = result.response.text().trim();

        // Limpiando posibles marcadores de bloque markdown
        if (text.startsWith("\`\`\`json")) text = text.substring(7);
        else if (text.startsWith("\`\`\`")) text = text.substring(3);
        if (text.endsWith("\`\`\`")) text = text.substring(0, text.length - 3);

        const parsed = JSON.parse(text);
        return { success: true, suggestions: parsed };
    } catch (e: unknown) {
        console.error("Error procesando IA:", e);
        return { success: false, error: "Error al generar predicción IA." };
    }
}
