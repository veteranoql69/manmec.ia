import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";
import path from "path";

// Cargar .env.local manualmente para el script
dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function diagnose() {
    const apiKey = process.env.GEMINI_API_KEY;
    console.log("API Key detectada:", apiKey ? "SÍ (longitud: " + apiKey.length + ")" : "NO");

    if (!apiKey) {
        console.error("ERROR: GEMINI_API_KEY no encontrada en .env.local");
        return;
    }

    const genAI = new GoogleGenerativeAI(apiKey);

    try {
        console.log("--- Probando Diferentes Nombres de Modelos ---");

        const modelNames = [
            "gemini-1.5-flash",
            "gemini-1.5-flash-latest",
            "models/gemini-1.5-flash",
            "gemini-pro",
            "gemini-1.5-pro"
        ];

        for (const name of modelNames) {
            console.log(`\nProbando: ${name}...`);
            try {
                const model = genAI.getGenerativeModel({ model: name });
                const result = await model.generateContent("test");
                const response = await result.response;
                console.log(`✅ EXITO con '${name}':`, response.text().substring(0, 20) + "...");
            } catch (e: any) {
                console.log(`❌ FALLO con '${name}': ${e.message}`);
            }
        }

    } catch (error: any) {
        console.error("--- ERROR GENERAL ---");
        console.error("Mensaje:", error.message);
    }
}

diagnose();
