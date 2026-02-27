import * as dotenv from "dotenv";
import path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

async function testFetch() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return;

    const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

    try {
        const response = await fetch(url);
        const data = await response.json();

        console.log("Status Code:", response.status);
        if (response.ok) {
            console.log("--- Modelos Disponibles (via Fetch) ---");
            // @ts-ignore
            data.models?.forEach((m: any) => console.log(`- ${m.name}`));
        } else {
            console.error("--- ERROR DE API ---");
            console.error(JSON.stringify(data, null, 2));
        }
    } catch (e: any) {
        console.error("Error en Fetch:", e.message);
    }
}

testFetch();
