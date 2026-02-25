import { genAI, VISION_MODEL } from "./gemini";

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

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: imageBuffer.toString("base64"),
                mimeType,
            },
        },
    ]);

    const response = await result.response;
    const text = response.text();

    // Limpiar posibles bloques de código markdown ```json ... ```
    const cleanJson = text.replace(/```json|```/g, "").trim();

    try {
        return JSON.parse(cleanJson) as OcrShipmentResult;
    } catch (e) {
        console.error("Error parseando JSON de Gemini:", text);
        throw new Error("No se pudo procesar la guía de forma estructurada.");
    }
}
