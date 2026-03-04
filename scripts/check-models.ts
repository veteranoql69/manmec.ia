import { GoogleGenerativeAI } from "@google/generative-ai";
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");

async function listModels() {
    const models = [
        "gemini-1.5-flash",
        "gemini-1.5-flash-latest",
        "gemini-2.0-flash-exp",
        "gemini-pro",
        "gemini-1.5-pro",
        "gemini-1.5-flash-8b"
    ];

    console.log("API Key present:", !!process.env.GEMINI_API_KEY);

    for (const m of models) {
        try {
            const model = genAI.getGenerativeModel({ model: m });
            const result = await model.generateContent("test");
            console.log(`✅ ${m} works!`);
            break;
        } catch (e: any) {
            console.log(`❌ ${m} failed: ${e.message.substring(0, 100)}...`);
        }
    }
}

listModels();
