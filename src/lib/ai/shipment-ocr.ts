import { getGenAI, VISION_MODEL } from "./gemini";
import { getLangfuse } from "./langfuse-client";

export interface OcrShipmentItem {
    description: string;
    quantity: number;
    sku?: string;
    unit_price?: number;
}

export interface OcrShipmentResult {
    supplier_name: string;
    dispatch_note_number: string;
    items: OcrShipmentItem[];
    raw_text?: string;
}

/**
 * Procesa la imagen de una Guía de Despacho usando Gemini Vision.
 * Extrae proveedor, número de guía y lista de ítems (descripción + cantidad).
 */
export async function processDispatchNote(
    imageBuffer: Buffer,
    mimeType: string
): Promise<OcrShipmentResult> {
    const genAI = getGenAI();
    if (!genAI) {
        throw new Error("Gemini AI no está configurada. Falta GEMINI_API_KEY.");
    }

    const model = genAI.getGenerativeModel({ model: VISION_MODEL });

    const prompt = `
        Eres un experto en logística industrial chilena. 
        Analiza esta imagen que corresponde a una "Guía de Despacho" de repuestos o insumos.
        Extrae la siguiente información en formato JSON puro:
        {
          "supplier_name": "Nombre de la empresa proveedora",
          "dispatch_note_number": "El número de la guía (ej: 12345)",
          "items": [
            {
              "description": "Nombre del repuesto o ítem",
              "quantity": 10,
              "sku": "Código si existe",
              "unit_price": 5000
            }
          ]
        }
        Asegúrate de:
        1. Limpiar las descripciones (quitar códigos internos si están mezclados).
        2. Validar que las cantidades sean números.
        3. Si la imagen es borrosa o ilegible, devuelve un error descriptivo.
        SOLO responde con el objeto JSON, nada más.
    `;

    const langfuse = getLangfuse();
    const trace = langfuse.trace({ name: "shipment-ocr", metadata: { mimeType } });
    const generation = trace.generation({
        name: "gemini-ocr",
        model: VISION_MODEL,
        input: { mimeType, image_size_kb: Math.round(imageBuffer.length / 1024) },
    });

    try {
        const result = await model.generateContent([
            prompt,
            { inlineData: { data: imageBuffer.toString("base64"), mimeType } },
        ]);

        const response = result.response;
        const text = response.text();
        const usage = response.usageMetadata;
        const cleanJson = text.replace(/```json|```/g, "").trim();
        const parsed = JSON.parse(cleanJson) as OcrShipmentResult;

        generation.end({
            output: { supplier_name: parsed.supplier_name, dispatch_note_number: parsed.dispatch_note_number, items_count: parsed.items.length },
            usage: usage ? { input: usage.promptTokenCount, output: usage.candidatesTokenCount, total: usage.totalTokenCount } : undefined,
        });
        await langfuse.flushAsync();

        return parsed;
    } catch (e: unknown) {
        generation.end({ level: "ERROR", statusMessage: String(e) });
        await langfuse.flushAsync();
        const message = e instanceof Error ? e.message : "Error desconocido";
        console.error("Error parseando JSON de Gemini:", message);
        throw new Error("No se pudo procesar la guía de forma estructurada.");
    }
}
