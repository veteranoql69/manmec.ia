import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return;

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // Usar cast a unknown para evitar errores de tipo en métodos dinámicos del SDK
        const genAIUnknown = genAI as unknown as { listModels: () => Promise<{ models: { name: string; supportedGenerationMethods: string[] }[] }> };
        const models = await genAIUnknown.listModels();
        console.log("--- Modelos Disponibles ---");
        for (const model of models.models) {
            console.log(`- ${model.name} (${model.supportedGenerationMethods})`);
        }
    } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Error desconocido";
        console.log("Error al listar modelos:", message);
    }
}

listModels();
