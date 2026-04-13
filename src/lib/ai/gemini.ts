import { GoogleGenerativeAI, Tool, SchemaType, Part } from "@google/generative-ai";
import { generateSystemPrompt } from "./prompts";
import { getInventoryStock, getWorkOrders, getServiceStations, getMechanicsStatus, executeReadOnlyQuery } from "./tools";

// Instancia global diferida para evitar problemas de hoisting con variables de entorno
let _genAI: GoogleGenerativeAI | null = null;
function getGenAI() {
    if (!_genAI) {
        const apiKey = process.env.GEMINI_API_KEY;
        if (!apiKey) {
            console.error("CRITICAL: GEMINI_API_KEY is missing in process.env");
        }
        _genAI = new GoogleGenerativeAI(apiKey || 'dummy_key_for_build');
    }
    return _genAI;
}

export const VISION_MODEL = "gemini-flash-latest"; // Actualizado a modelo disponible y probado

/**
 * Define las herramientas disponibles para Gemini (Agente IA-SQL)
 */
const tools: Tool[] = [
    {
        functionDeclarations: [
            {
                name: "executeReadOnlyQuery",
                description: "Ejecuta una consulta SQL SELECT para obtener datos de la operación (tickets, stock, mecánicos, estaciones). Úsala para responder preguntas complejas basadas en datos reales.",
                parameters: {
                    type: SchemaType.OBJECT,
                    properties: {
                        sql: {
                            type: SchemaType.STRING,
                            description: "Instrucción SQL SELECT válida. Ejemplo: SELECT * FROM manmec_work_orders WHERE organization_id = '...' AND status != 'COMPLETED'"
                        }
                    },
                    required: ["sql"]
                }
            }
        ]
    }
];

/**
 * Función principal para generar respuestas de IA con soporte para herramientas de SQL
 */
export async function generateAiResponse(
    message: string,
    userContext: { organization_id: string; full_name: string; role: string },
    orgSettings: Record<string, unknown>,
    audioBuffer?: Buffer // Nuevo parámetro opcional para mensajes de voz
) {
    const modelMatrix = (orgSettings as any)?.model_matrix || {};
    const chatModelName = modelMatrix.chat || "models/gemini-2.5-flash-native-audio-latest";
    const voiceModelName = modelMatrix.voice || "models/gemini-2.5-flash-native-audio-latest";

    // Si hay audio, usamos el modelo especializado en voz, de lo contrario el de chat
    const activeModelName = audioBuffer ? voiceModelName : chatModelName;

    const model = getGenAI().getGenerativeModel({
        model: activeModelName,
        systemInstruction: generateSystemPrompt({
            ...orgSettings,
            organization_id: userContext.organization_id
        }),
        tools,
    });

    const chat = model.startChat();

    // Preparar el contenido del mensaje (texto o texto + audio)
    // Inyectamos el ID de la organización en el prompt de forma invisible para que la IA lo use en el SQL
    const contextEnhancedMessage = `[USER_ORG_ID: ${userContext.organization_id}] [USER_NAME: ${userContext.full_name}] [USER_ROLE: ${userContext.role}]
    Pregunta del usuario: ${message || "Analiza este mensaje de voz y responde a la solicitud del usuario."}`;

    const promptParts: (string | { inlineData: { data: string; mimeType: string } })[] = [
        contextEnhancedMessage
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
        let toolCalls = response.functionCalls();
        let loopCount = 0;

        while (toolCalls?.length && loopCount < 5) {
            const call = toolCalls[0];
            const { name, args } = call;
            let functionResult: unknown;

            console.log(`[AI-SQL] [Iteración ${loopCount + 1}] Llamada a herramienta: ${name}`, args);

            if (name === "executeReadOnlyQuery") {
                const typedArgs = args as { sql: string };
                functionResult = await executeReadOnlyQuery(userContext.organization_id, typedArgs.sql);
            } else {
                // Fallback para herramientas antiguas
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
                        functionResult = { error: `Herramienta no encontrada: ${name}` };
                }
            }

            // Enviar el resultado de la función de vuelta a Gemini
            result = await chat.sendMessage([{
                functionResponse: {
                    name,
                    response: { content: functionResult }
                }
            }] as unknown as Part[]);

            response = result.response;
            toolCalls = response.functionCalls();
            loopCount++;
        }

        return response.text();
    } catch (error: unknown) {
        console.error("[AI ERROR]", error);
        return "Lo siento, tuve un problema procesando tu solicitud. Por favor intenta de nuevo en unos momentos.";
    }
}
