"use server";

import { GoogleGenerativeAI } from "@google/generative-ai";
import { requireRole } from "@/lib/auth";

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

export async function analyzeToolImage(base64Image: string, mimeType: string) {
    // TODO: Ajustar a MECHANIC|SUPERVISOR si lib/auth.ts lo soporta, por ahora asumo SUPERVISOR.
    await requireRole("SUPERVISOR");

    try {
        // Usamos Gemini 1.5 Flash porque es el más rápido para tareas multimodales de baja fricción
        const model = genAI.getGenerativeModel({
            model: "gemini-2.5-flash",
            generationConfig: {
                responseMimeType: "application/json",
            }
        });

        const prompt = `
        Eres un experto pañolero y mecánico de la empresa Manmec.
        Tu trabajo es analizar la imagen adjunta de una herramienta o equipo y extraer sus datos principales para registrarla en el inventario.
        
        Devuelve estrictamente un objeto JSON con la siguiente estructura. Si no estás seguro de un campo o no se ve en la foto, devuelve null para ese campo, no inventes.
        
        Estructura JSON requerida:
        {
            "name": "Nombre genérico o técnico de la herramienta (ej: Taladro Percutor Inalámbrico)",
            "brand": "Marca de la herramienta si es visible (ej: DeWalt, Bosch, Makita)",
            "model": "Modelo específico si es visible (busca códigos alfanuméricos en la carcasa o etiqueta)",
            "serial_number": "Número de serie si es claramente legible en alguna etiqueta, de lo contrario null",
            "category": "Categoría sugerida (ej: Herramienta Eléctrica, Herramienta Manual, Medición, etc.)"
        }
        `;

        const imagePart = {
            inlineData: {
                data: base64Image,
                mimeType
            },
        };

        const result = await model.generateContent([prompt, imagePart]);
        const response = result.response;
        const text = response.text();

        // El texto debería ser un JSON válido porque usamos responseMimeType: "application/json"
        const parsedData = JSON.parse(text);

        return { success: true, data: parsedData };
    } catch (error: unknown) {
        console.error("Error analyzing image with Gemini:", error);
        const message = error instanceof Error ? error.message : "Error procesando la imagen";
        return { success: false, error: message };
    }
}
