import { GoogleGenerativeAI } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export type EmailNotificationType = 'OT_NOTIFICATION' | 'SHIPMENT_NOTIFICATION' | 'UNKNOWN';

export interface ParsedEmailData {
  type: EmailNotificationType;
  external_id: string; // No. Aviso o No. Guía
  order_number?: string; // Pedido (solo para SHIPMENT)
  station_code?: string; // Código estación (solo para OT)
  title?: string;
  description?: string;
  priority?: 'P1' | 'P2' | 'P3';
  items?: {
    sku: string;
    description: string;
    quantity: number;
    unit: string;
  }[];
}

export async function parseEmailWithIA(content: string): Promise<ParsedEmailData> {
  const model = genAI.getGenerativeModel({ model: "gemini-flash-latest" });

  const prompt = `
    Analiza el siguiente contenido de un correo de mantenimiento/logística y clasifícalo.
    
    CASO A: Notificación de Nuevo Aviso / Ticket de Falla.
    CASO B: Notificación de Guía de Despacho / Materiales.
    
    Extrae la información en este formato JSON:
    {
      "type": "OT_NOTIFICATION" | "SHIPMENT_NOTIFICATION" | "UNKNOWN",
      "external_id": "El número de Aviso o de Guía de Despacho",
      "order_number": "El número de Pedido (si aplica)",
      "station_code": "El código de la estación (ej: 20017 o M027)",
      "title": "Un título corto para la OT",
      "description": "Detalle de la falla o contenido",
      "priority": "P1", "P2" o "P3" (analiza el texto para determinar urgencia),
      "items": [
        { "sku": "código", "description": "nombre", "quantity": valor, "unit": "UN" }
      ]
    }

    CONTENIDO DEL CORREO:
    """
    ${content}
    """
    
    IMPORTANTE: Responde solo con el JSON.
  `;

  const result = await model.generateContent(prompt);
  const text = result.response.text().replace(/```json/g, "").replace(/```/g, "").trim();

  return JSON.parse(text);
}
