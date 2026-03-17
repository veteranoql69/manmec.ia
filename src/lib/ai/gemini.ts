import { GoogleGenerativeAI, Tool, SchemaType, Part } from "@google/generative-ai";
import { generateSystemPrompt } from "./prompts";
import { getInventoryStock, getWorkOrders, getServiceStations, getMechanicsStatus } from "./tools";

export const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || 'dummy_key_for_build');
export const VISION_MODEL = "gemini-1.5-flash"; // Modelo para procesamiento de imágenes/PDFs

/**
 * Define las herramientas disponibles para Gemini
 */
const tools: Tool[] = [
    {
        functionDeclarations: [
            {
                name: "getInventoryStock",
                description: "Consulta el stock de materiales, repuestos o herramientas. Úsalar para preguntas como '¿quedan pinpad?' o '¿cuánto stock hay de X?'. Busca por nombre, SKU o descripción.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        query: { type: SchemaType.STRING, description: "Término de búsqueda (ej: 'pinpad', 'ax80', 'manguera')" }
                    }
                }
            },
            {
                name: "getWorkOrders",
                description: "Consulta las órdenes de trabajo (OT) vigentes. Úsala para saber qué se está haciendo, estados de avisos o prioridades.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        status: {
                            type: SchemaType.STRING,
                            description: "Filtrar por estado (PENDING, ASSIGNED, IN_PROGRESS, PAUSED). Por defecto trae todas las abiertas.",
                            nullable: true,
                        }
                    }
                }
            },
            {
                name: "getServiceStations",
                description: "Obtiene información de las Estaciones de Servicio (EDS). Úsala para identificar una EDS por su código (ej: 'la 014' o '20014') o nombre.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        query: { type: SchemaType.STRING, description: "Nombre o código de la estación (ej: '20014', '014', 'Maipú')" }
                    }
                }
            },
            {
                name: "getMechanicsStatus",
                description: "Consulta qué está haciendo cada mecánico en este momento. Úsala para preguntas como '¿qué hace Marco?', '¿quién está trabajando ahora?' o '¿quién atiende la estación X?'.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {}
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
    orgSettings: Record<string, unknown>,
    audioBuffer?: Buffer // Nuevo parámetro opcional para mensajes de voz
) {
    const modelMatrix = (orgSettings as any)?.model_matrix || {};
    const chatModelName = modelMatrix.chat || "models/gemini-1.5-flash";
    const voiceModelName = modelMatrix.voice || "models/gemini-1.5-flash";

    // Si hay audio, usamos el modelo especializado en voz, de lo contrario el de chat
    const activeModelName = audioBuffer ? voiceModelName : chatModelName;

    const model = genAI.getGenerativeModel({
        model: activeModelName,
        systemInstruction: generateSystemPrompt(orgSettings),
        tools,
    });

    const chat = model.startChat();

    // Preparar el contenido del mensaje (texto o texto + audio)
    const promptParts: (string | { inlineData: { data: string; mimeType: string } })[] = [
        message || "Analiza este mensaje de voz y responde a la solicitud del usuario."
    ];

    if (audioBuffer) {
        promptParts.push({
            inlineData: {
                data: audioBuffer.toString("base64"),
                mimeType: "audio/ogg" // Formato estándar de Telegram Voice
            }
        });
    }

    try {
        let result = await chat.sendMessage(promptParts as unknown as Part[]);
        let response = result.response;

        // Loop de manejo de llamadas a funciones (Function Calling)
        const call = response.functionCalls()?.[0];

        if (call) {
            const { name, args } = call;
            let functionResult: unknown;

            console.log(`[AI] Ejecutando herramienta: ${name}`, args);

            // Ejecución segura de las herramientas filtradas por organización
            const typedArgs = args as Record<string, string>;

            switch (name) {
                case "getInventoryStock":
                    functionResult = await getInventoryStock(userContext.organization_id, typedArgs.query);
                    break;
                case "getWorkOrders":
                    functionResult = await getWorkOrders(userContext.organization_id, typedArgs.status);
                    break;
                case "getServiceStations":
                    functionResult = await getServiceStations(userContext.organization_id, typedArgs.query);
                    break;
                case "getMechanicsStatus":
                    functionResult = await getMechanicsStatus(userContext.organization_id);
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
            }] as unknown as Part[]);
            response = result.response;
        }

        return response.text();
    } catch (error: unknown) {
        console.error("[AI ERROR]", error);
        return "Lo siento, tuve un problema procesando tu solicitud. Por favor intenta de nuevo en unos momentos.";
    }
}
