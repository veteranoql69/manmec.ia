"use server";

import { processDispatchNote, OcrShipmentResult } from "./shipment-ocr";

/**
 * Server Action para procesar una imagen (base64) vía Gemini Vision
 */
export async function analyzeDispatchNoteAction(base64Image: string, mimeType: string) {
    try {
        const buffer = Buffer.from(base64Image, 'base64');
        const result: OcrShipmentResult = await processDispatchNote(buffer, mimeType);
        return { success: true, data: result };
    } catch (error: unknown) {
        console.error("Error en analyzeDispatchNoteAction:", error);
        const message = error instanceof Error ? error.message : "Error desconocido al procesar la imagen";
        return { success: false, error: message };
    }
}
