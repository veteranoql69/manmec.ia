import { GoogleGenerativeAI } from "@google/generative-ai";

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn("⚠️ GEMINI_API_KEY no configurada en .env.local");
}

export const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

export const VISION_MODEL = "gemini-1.5-flash"; // Modelo rápido y optimizado para OCR
export const CHAT_MODEL = "gemini-1.5-pro";   // Modelo potente para razonamiento de stock
