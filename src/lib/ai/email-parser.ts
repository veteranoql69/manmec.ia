import { GoogleGenerativeAI, Part } from "@google/generative-ai";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export type EmailNotificationType = 'OT_NOTIFICATION' | 'OT_OPEN' | 'OT_OPENED' | 'OT_CLOSURE' | 'SHIPMENT_NOTIFICATION' | 'UNKNOWN';

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
  // Campos adicionales para el Dashboard de Triple Validación
  metadata?: Record<string, unknown>;
}

/**
 * Procesa el contenido de un correo (y opcionalmente un PDF) usando Gemini.
 * Utiliza Structured Outputs para garantizar la integridad del JSON.
 */
export async function parseEmailWithIA(content: string, pdfBuffer?: Buffer): Promise<ParsedEmailData> {
  const model = genAI.getGenerativeModel({
    model: "gemini-flash-latest",
  });

  const parts: { text: string; inlineData?: { data: string; mimeType: string } }[] = [
    {
      text: `
      Analiza este correo de mantenimiento/logística de COPEC y clasifícalo estrictamente en uno de estos tipos:
      
      1. OT_NOTIFICATION: Cuando el correo informa la apertura de un nuevo Aviso o Ticket de falla.
      2. OT_CLOSURE: Cuando el correo confirma que un Aviso ha sido SOLUCIONADO o CERRADO.
      3. SHIPMENT_NOTIFICATION: Cuando el correo informa el despacho de materiales o una Guía de Despacho.

      IMPORTANTE:
      - El campo 'type' debe ser exactamente una de esas 3 strings.
      - Extrae el 'external_id' (No. Aviso o No. Guía). 
      - Si es OT, identifica el código de la estación (ej: 20017).
      - Extrae detalles técnicos adicionales (Equipo, Surtidor, Responsable) en 'metadata'.
      - Si hay materiales, detállalos en 'items'.
    `}
  ];

  // Agregar el cuerpo del correo
  parts.push({ text: `CONTENIDO DEL CORREO:\n${content}` });

  // Agregar el PDF si existe (Multimodal)
  if (pdfBuffer) {
    parts.push({
      inlineData: {
        data: pdfBuffer.toString("base64"),
        mimeType: "application/pdf"
      },
      text: "" // El SDK a veces requiere el campo text aunque esté vacío si se usa esta estructura
    });
    parts.push({
      text: `
      Analiza el PDF adjunto (Certificado de Trabajo). 
      Es CRÍTICO que extraigas la lista de materiales o repuestos utilizados en el mantenimiento.
      Devuélvelos en el campo 'metadata.repuestos' con la estructura: [{"nombre": "...", "codigo": "...", "cantidad": número}].
      Si no hay código, deja 'codigo' como null.
    ` });
  }

  const result = await model.generateContent({
    contents: [{ role: "user", parts: parts as unknown as Part[] }],
    generationConfig: {
      responseMimeType: "application/json",
    }
  });

  const text = result.response.text();
  return JSON.parse(text) as ParsedEmailData;
}
