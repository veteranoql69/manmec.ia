import { createAdminClient } from "@/lib/supabase/admin";

export interface TelegramFallbackParams {
    organizationId: string;
    userId: string;
    actionType: string;
}

const sleep = (ms: number) => new Promise(r => setTimeout(r, ms));

/**
 * Envía un mensaje de Telegram. 
 * Implementa 3 reintentos exponenciales y fallback a la campana web (manmec_notifications).
 */
export async function sendTelegramMessage(
    chatId: string | null | undefined,
    text: string,
    fallbackParams?: TelegramFallbackParams
): Promise<boolean> {
    
    // Si no hay chat ID, forzamos directamente el fallback
    if (!chatId) {
        console.warn("[TELEGRAM] ChatId is missing, forcing fallback...");
        return fallbackToNotification(text, fallbackParams);
    }

    const token = process.env.TELEGRAM_API_BOT;
    if (!token) {
        console.warn("[TELEGRAM] Missing TELEGRAM_API_BOT env variable, forcing fallback...");
        return fallbackToNotification(text, fallbackParams);
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;
    const delays = [1000, 2000, 4000];

    const send = async (parseMode?: string) => {
        const body: any = { chat_id: chatId, text };
        if (parseMode) body.parse_mode = parseMode;
        return fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    };

    for (let attempt = 0; attempt <= delays.length; attempt++) {
        try {
            // Priority: HTML (como se definió en fix previo de chatbot)
            let res = await send('HTML');

            // Si hay error 400 (Bad Request - comúnmente parse_mode inválido), reintenta sin formateo
            if (res.status === 400) {
                console.warn(`[TELEGRAM] Parse error with HTML for chat ${chatId}, retrying without format...`);
                res = await send();
            }

            if (res.ok) {
                return true; 
            }

            if (res.status === 429) {
                const errData = await res.json();
                const retryAfter = errData.parameters?.retry_after || delays[attempt] / 1000;
                console.warn(`[TELEGRAM] Rate Limited (429). Retrying after ${retryAfter}s`);
                if (attempt < delays.length) {
                    await sleep(retryAfter * 1000);
                    continue;
                }
            } else if (res.status >= 500) {
                if (attempt < delays.length) {
                    await sleep(delays[attempt]);
                    continue;
                }
            }
            
            // Otros fallos definitivos
            const errData = await res.text();
            console.error(`[TELEGRAM ERROR] Status: ${res.status}, Data: ${errData}`);
            
            if (attempt === delays.length) {
                return fallbackToNotification(text, fallbackParams);
            }
        } catch (error) {
            console.error('[TELEGRAM] Network error sending message', error);
            if (attempt === delays.length) {
                return fallbackToNotification(text, fallbackParams);
            }
            await sleep(delays[attempt]);
        }
    }
    
    return false;
}

async function fallbackToNotification(text: string, params?: TelegramFallbackParams): Promise<boolean> {
    if (!params) return false;
    try {
        const supabase = createAdminClient();
        console.warn(`[TELEGRAM FALLBACK] Inserting web notification for user ${params.userId}`);
        
        // Limpiamos etiquetas HTML para la notificación si es que venía formateado
        const cleanBody = text.replace(/<[^>]*>/g, '');

        const { error } = await supabase.from('manmec_notifications').insert({
            organization_id: params.organizationId,
            user_id: params.userId,
            type: params.actionType,
            title: "Aviso Importante Operacional",
            body: cleanBody,
            is_read: false
        });

        if (error) {
            console.error("[TELEGRAM FALLBACK] Failed to insert notification", error);
            return false;
        }
        return true;
    } catch (e) {
        console.error("[TELEGRAM FALLBACK] Exception", e);
        return false;
    }
}
