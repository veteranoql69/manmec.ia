import { GoogleGenerativeAI, Tool, SchemaType } from "@google/generative-ai";
import { generateSystemPrompt } from "./prompts";
import { getInventoryStock, getWorkOrders, getServiceStations } from "./tools";

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
export const VISION_MODEL = "gemini-1.5-flash"; // Modelo para procesamiento de imágenes/PDFs

/**
 * Define las herramientas disponibles para Gemini
 */
const tools: Tool[] = [
    {
        functionDeclarations: [
            {
                name: "getInventoryStock",
                description: "Consulta el stock de materiales, repuestos o herramientas en las bodegas.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        query: { type: SchemaType.STRING, description: "Nombre parcial o completo del material a buscar" }
                    }
                }
            },
            {
                name: "getWorkOrders",
                description: "Consulta las órdenes de trabajo (OT) vigentes, su estado, prioridad y taller asignado.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        status: {
                            type: SchemaType.STRING,
                            description: "Estado de la OT",
                            enum: ["PENDING", "ASSIGNED", "IN_PROGRESS", "PAUSED", "COMPLETED", "CANCELLED"]
                        } as any
                    }
                }
            },
            {
                name: "getServiceStations",
                description: "Obtiene información de contacto y ubicación de las Estaciones de Servicio (EDS).",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        name_query: { type: SchemaType.STRING, description: "Nombre o parte del nombre de la estación" }
                    }
                }
            }
        ]
    }
];

/**
 * Función principal para generar respuestas de IA con soporte para herramientas y Audio
 */
export async function generateAiResponse(
    message: string,
    userContext: { organization_id: string; full_name: string; role: string },
    orgSettings: any,
    audioBuffer?: Buffer // Nuevo parámetro opcional para mensajes de voz
) {
    const model = genAI.getGenerativeModel({
        model: "gemini-2.5-flash",
        systemInstruction: generateSystemPrompt(orgSettings),
        tools,
    });

    const chat = model.startChat();

    // Preparar el contenido del mensaje (texto o texto + audio)
    const promptParts: any[] = [message || "Analiza este mensaje de voz y responde a la solicitud del usuario."];

    if (audioBuffer) {
        promptParts.push({
            inlineData: {
                data: audioBuffer.toString("base64"),
                mimeType: "audio/ogg" // Formato estándar de Telegram Voice
            }
        });
    }

    try {
        let result = await chat.sendMessage(promptParts);
        let response = result.response;

        // Loop de manejo de llamadas a funciones (Function Calling)
        // Gemini puede pedir ejecutar una función para obtener datos reales
        const call = response.functionCalls()?.[0];

        if (call) {
            const { name, args } = call;
            let functionResult;

            console.log(`[AI] Ejecutando herramienta: ${name}`, args);

            // Ejecución segura de las herramientas filtradas por organización
            switch (name) {
                case "getInventoryStock":
                    functionResult = await getInventoryStock(userContext.organization_id, (args as any).query);
                    break;
                case "getWorkOrders":
                    functionResult = await getWorkOrders(userContext.organization_id, (args as any).status);
                    break;
                case "getServiceStations":
                    functionResult = await getServiceStations(userContext.organization_id, (args as any).name_query);
                    break;
                default:
                    throw new Error(`Herramienta no encontrada: ${name}`);
            }

            // Enviar el resultado de la función de vuelta a Gemini para que redacte la respuesta final
            result = await chat.sendMessage([{
                functionResponse: {
                    name,
                    response: { content: functionResult }
                }
            }]);
            response = result.response;
        }

        return response.text();
    } catch (error: any) {
        console.error("[AI ERROR]", error);
        return "Lo siento, tuve un problema procesando tu solicitud. Por favor intenta de nuevo en unos momentos.";
    }
}
