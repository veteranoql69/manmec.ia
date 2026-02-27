import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export interface ExtractedShipment {
    dispatch_note_number: string;
    order_number: string;
    supplier_name: string;
    items: {
        code: string;
        description: string;
        quantity: number;
        unit: string;
    }[];
}

/**
 * Procesa una imagen base64 de una guía de despacho usando Gemini Vision.
 */
export async function analyzeShipmentImage(base64Image: string): Promise<ExtractedShipment> {
    if (!process.env.GEMINI_API_KEY) {
        throw new Error("GEMINI_API_KEY no configurado en el servidor.");
    }

    const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

    const prompt = `
        Eres un experto en logística y OCR. Analiza esta imagen de una Guía de Despacho Electrónica.
        Extrae la siguiente información en formato JSON estricto:
        
        1. "dispatch_note_number": El número de la guía (ej: 25434647).
        2. "order_number": El número de PEDIDO que aparece en la cabecera (ej: 5501080963).
        3. "supplier_name": El nombre del emisor/proveedor (ej: COPEC S.A.).
        4. "items": Una lista de los productos en la sección de SERVICIO/CANTIDAD o detalle. Cada item debe tener:
           - "code": El código numérico a la izquierda.
           - "description": El nombre del producto/servicio.
           - "quantity": La cantidad numérica.
           - "unit": La unidad de medida (ej: UN, 7UN, etc - limpia el número de la unidad si viene junto).

        IMPORTANTE: Responde ÚNICAMENTE con el objeto JSON, sin markdown ni texto adicional.
        Si no puedes leer algún dato, deja el campo como string vacío o lista vacía.
    `;

    // Limpiar el prefijo data:image/... si existe
    const base64Data = base64Image.split(",")[1] || base64Image;

    const result = await model.generateContent([
        prompt,
        {
            inlineData: {
                data: base64Data,
                mimeType: "image/jpeg",
            },
        },
    ]);

    const response = await result.response;
    const text = response.text();

    try {
        // Limpiar posibles etiquetas de markdown del JSON
        const cleanJson = text.replace(/```json/g, "").replace(/```/g, "").trim();
        return JSON.parse(cleanJson);
    } catch (error) {
        console.error("Error parseando JSON de Gemini:", text);
        throw new Error("La IA no pudo generar un formato válido. Intenta con una foto más clara.");
    }
}
