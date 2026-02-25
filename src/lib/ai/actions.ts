"use server";

import { processDispatchNote } from "./shipment-ocr";

/**
 * Server Action para procesar una imagen (base64) vía Gemini Vision
 */
export async function analyzeDispatchNoteAction(base64Image: string, mimeType: string) {
    try {
        // Convertir base64 de vuelta a Buffer para el servicio
        const buffer = Buffer.from(base64Image, 'base64');
        const result = await processDispatchNote(buffer, mimeType);
        return { success: true, data: result };
    } catch (error: any) {
        console.error("Error en analyzeDispatchNoteAction:", error);
        return { success: false, error: error.message || "Error desconocido al procesar la imagen" };
    }
}
