import { Langfuse } from "langfuse";

/**
 * Retorna una instancia de Langfuse lista para usar en funciones serverless.
 * Cada invocación crea una instancia fresca — flushAsync() al terminar.
 */
export function getLangfuse(): Langfuse {
    return new Langfuse({
        secretKey: process.env.LANGFUSE_SECRET_KEY,
        publicKey: process.env.LANGFUSE_PUBLIC_KEY,
        baseUrl: process.env.LANGFUSE_BASE_URL,
        flushAt: 1,      // envía inmediatamente en serverless
        flushInterval: 0,
    });
}
