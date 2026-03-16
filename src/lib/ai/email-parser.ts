import { GoogleGenerativeAI, Part } from "@google/generative-ai";
// @ts-ignore - Import naming fix for pdf-parse (v2.4.5+)
import { PDFParse } from "pdf-parse";

// DEBUG: v2.0 - Hybrid Extraction
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

export type EmailNotificationType = 'OT_NOTIFICATION' | 'OT_OPEN' | 'OT_OPENED' | 'OT_CLOSURE' | 'SHIPMENT_NOTIFICATION' | 'UNKNOWN';

export interface ParsedEmailData {
  type: string;
  external_id: string;
  order_number?: string;
  order_id?: string;
  station_code?: string;
  title?: string;
  description?: string;
  priority?: string;
  metadata: {
    tipo_mantenimiento?: string;
    repuestos: Array<{ nombre: string; codigo: string; cantidad: number }>;
    manager_name?: string;
    manager_phone?: string;
    fecha_ingreso?: string;
    equipo_afectado?: string;
  };
}

export async function parseEmailWithIA(content: string, pdfBuffer?: Buffer, modelName: string = "models/gemini-1.5-flash", subject: string = ""): Promise<ParsedEmailData> {
  const model = genAI.getGenerativeModel({
    model: modelName,
  });

  // 1. Extraer texto del PDF (Mismo motor que n8n)
  let extractedPdfText = "";
  if (pdfBuffer) {
    try {
      const parser = new PDFParse({ data: pdfBuffer });
      const result = await parser.getText();
      extractedPdfText = result.text;
    } catch (err) {
      console.error("⚠️ Error extrayendo texto del PDF:", err);
    }
  }

  const schema = {
    type: "object",
    properties: {
      type: { type: "string", enum: ["OT_NOTIFICATION", "OT_CLOSURE", "SHIPMENT_NOTIFICATION", "UNKNOWN"] },
      external_id: { type: "string", description: "El número de Aviso (8 digitos) o Guía de Despacho" },
      order_number: { type: "string", description: "Número de Pedido para logistica" },
      order_id: { type: "string", description: "El número de Orden (8 digitos) para Preventivos PM02" },
      station_code: { type: "string", description: "Código de Estación sap_store_code (5 digitos)" },
      technician_name: { type: "string", description: "Nombre del técnico que realizó el trabajo" },
      title: { type: "string" },
      description: { type: "string" },
      priority: { type: "string", enum: ["P1", "P2", "P3", "P4"] },
      metadata: {
        type: "object",
        properties: {
          tipo_mantenimiento: { type: "string", enum: ["PM01", "PM02", "OTRA"] },
          repuestos: {
            type: "array",
            items: {
              type: "object",
              properties: {
                nombre: { type: "string" },
                codigo: { type: "string", description: "SKU numérico" },
                cantidad: { type: "number" }
              },
              required: ["nombre", "codigo", "cantidad"]
            }
          }
        },
        required: ["repuestos"]
      }
    },
    required: ["type", "external_id", "metadata"]
  };

  const parts: { text: string; inlineData?: { data: string; mimeType: string } }[] = [
    {
      text: `
      ACTÚA COMO UN EXPERTO EN EXTRACCIÓN DE DATOS PARA MANTENIMIENTO INDUSTRIAL DE COPEC. 
      Analiza este correo y el texto del PDF para generar una respuesta JSON limpia y precisa.

      REGLAS CRÍTICAS DE EXTRACCIÓN:
      1. TIPO: Si es un Comprobante de Trabajo, el type es 'OT_CLOSURE'. Si es una Notificación de Aviso, es 'OT_NOTIFICATION'.
      2. STATION_CODE: PRIORIDAD MÁXIMA al ASUNTO (Subject) del correo. Busca el número de 5 dígitos (ej: 20703). Como respaldo, busca en el PDF cerca de 'Estación de Servicio'.
      3. AVISO (external_id): Busca el número de 8 dígitos (ej: 82094588).
      4. REPUESTOS (OBLIGATORIO):
         - Localiza la tabla 'REPUESTOS UTILIZADOS'.
         - En el texto del PDF, usa los valores bajo la columna 'Código' para el campo 'codigo'.
         - En el texto del PDF, usa los valores bajo la columna 'Nombre' para el campo 'nombre'.
         - En el texto del PDF, usa los valores bajo la columna 'Ctd.' para el campo 'cantidad'.
         - Los 'KITS' son partes físicas importantes, NO los ignores. 
      5. FILTRO DE CALIDAD: 
         - Incluye TODOS los repuestos físicos. 
         - EXCLUYE servicios como 'SERVICIO CUMPLIMIENTO PREVENTIVAS', 'TRASLADO' o 'VALORIZACIÓN'.
      6. RESPUESTA: Responde ÚNICAMENTE con el JSON solicitado. Si no hay repuestos, deja el array vacío [], pero NUNCA omitas el campo metadata ni repuestos.
    `}
  ];

  if (extractedPdfText) {
    parts.push({ text: `TEXTO EXTRAÍDO DEL PDF:\n${extractedPdfText}` });
  }

  parts.push({ text: `ASUNTO DEL CORREO: ${subject}\nCUERPO DEL CORREO:\n${content}` });

  if (pdfBuffer) {
    parts.push({
      inlineData: {
        data: pdfBuffer.toString("base64"),
        mimeType: "application/pdf"
      }
    } as any);
  }

  try {
    const result = await model.generateContent({
      contents: [{ role: "user", parts: parts as unknown as Part[] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: schema as any,
      }
    });

    const text = result.response.text();
    return JSON.parse(text) as ParsedEmailData;
  } catch (error: any) {
    if (pdfBuffer && error.message && error.message.includes("document has no pages")) {
      return parseEmailWithIA(content, undefined, modelName, subject);
    }
    throw error;
  }
}
