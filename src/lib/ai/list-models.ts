import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function listModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return;

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        // En v0.24.1 listModels está en genAI.getGenerativeModel({ model: '...' })?
        // No, listModels es un método de genAI
        // @ts-ignore
        const models = await genAI.listModels();
        console.log("--- Modelos Disponibles ---");
        // @ts-ignore
        for (const model of models.models) {
            console.log(`- ${model.name} (${model.supportedGenerationMethods})`);
        }
    } catch (e: any) {
        console.log("Error al listar modelos:", e.message);
        // Quizás no es listModels, probamos con una petición directa si falla
    }
}

listModels();
