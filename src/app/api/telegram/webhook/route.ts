import { NextRequest, NextResponse } from 'next/server';
import { createClient } from "@supabase/supabase-js";
import { generateAiResponse } from '@/lib/ai/gemini';

// Normalize phone numbers to make them comparable
function normalizePhone(phone: string | null | undefined): string {
    if (!phone) return "";
    let clean = phone.replace(/\D/g, "");
    if (clean.startsWith("56")) clean = clean.substring(2);
    if (clean.startsWith("9")) clean = clean.substring(1);
    return clean;
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        console.log('[TELEGRAM WEBHOOK] Received payload:', JSON.stringify(body, null, 2));

        const message = body.message;
        if (!message) return NextResponse.json({ ok: true });

        const chatId = message.chat.id.toString();

        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL!,
            process.env.SUPABASE_SERVICE_ROLE_KEY!
        );

        // 1. Manejo Comando /start token_xxx
        if (message.text && message.text.startsWith('/start')) {
            const parts = message.text.split(' ');
            if (parts.length > 1) {
                const token = parts[1];
                console.log(`[TELEGRAM] QR Scanned, Token: ${token}`);

                // Buscar token en BD
                const { data: dbToken } = await supabase
                    .from('manmec_telegram_tokens')
                    .select('user_id, phone_number, expires_at')
                    .eq('token', token)
                    .single();

                if (!dbToken) {
                    await sendTelegramMessage(chatId, "❌ QR inválido o expirado. Por favor genera uno nuevo en la plataforma web.");
                    return NextResponse.json({ ok: true });
                }

                if (new Date(dbToken.expires_at) < new Date()) {
                    await sendTelegramMessage(chatId, "⏳ Este código QR ha expirado. Por favor recarga la página web para generar uno nuevo.");
                    return NextResponse.json({ ok: true });
                }

                // Guardar temporalmente el chatId para esperar el contacto
                await supabase
                    .from('manmec_users')
                    .update({ telegram_chat_id: chatId })
                    .eq('id', dbToken.user_id);

                // Pedir compartición de contacto
                await sendTelegramContactRequest(
                    chatId,
                    "¡Casi listo! 🔐 Por seguridad, necesitamos verificar que este Telegram corresponde al número registrado en la plataforma.\n\nPor favor presiona el botón de abajo para **Compartir tu Contacto**."
                );
                return NextResponse.json({ ok: true });
            }
        }

        // 2. Manejo de Respuesta de Contacto (Para verificar el teléfono)
        if (message.contact && message.contact.phone_number) {
            const contactPhone = normalizePhone(message.contact.phone_number);

            // Buscar si hay un usuario esperando validación con este chatId
            const { data: user } = await supabase
                .from('manmec_users')
                .select('id, phone')
                .eq('telegram_chat_id', chatId)
                .single();

            if (user) {
                const userPhone = normalizePhone(user.phone);

                if (contactPhone === userPhone) {
                    // Verificación exitosa
                    await supabase
                        .from('manmec_users')
                        .update({ onboarding_status: 'complete' })
                        .eq('id', user.id);

                    // Cleanup tokens
                    await supabase
                        .from('manmec_telegram_tokens')
                        .delete()
                        .eq('user_id', user.id);

                    await sendTelegramMessage(
                        chatId,
                        "✅ **¡Verificación Exitosa!**\n\nTu cuenta ha sido vinculada correctamente. Soy el **Asistente IA de Manmec**.\n\nPuedes hacerme preguntas sobre los mantenimientos, inventarios o activos de tu empresa.",
                        { remove_keyboard: true }
                    );
                } else {
                    // Fallo de seguridad: Números no coinciden
                    // "si hay diferencia entre BD y telegram, detener proceso... avisar y volver a aparecer QR"
                    await supabase
                        .from('manmec_users')
                        .update({ telegram_chat_id: null })
                        .eq('id', user.id);

                    const rawUserPhone = user.phone || "No definido";
                    const rawContactPhone = message.contact.phone_number;

                    await sendTelegramMessage(
                        chatId,
                        `🚫 **Error de Seguridad**\n\nEl número de este Telegram (${rawContactPhone}) no coincide con el número ingresado en la plataforma (${rawUserPhone}).\n\nEl proceso ha sido abortado. Por favor, corrige tu número en la plataforma web y genera un nuevo código QR.`,
                        { remove_keyboard: true }
                    );
                }
            } else {
                await sendTelegramMessage(chatId, "No encontré ninguna solicitud de vinculación pendiente para este chat. Escanea un QR válido desde la plataforma.");
            }
            return NextResponse.json({ ok: true });
        }

        // 3. Fallback (Cualquier otro mensaje si ya está enlazado)
        if (message.text || message.voice) {
            const { data: user } = await supabase
                .from('manmec_users')
                .select(`
                    id, 
                    full_name, 
                    role, 
                    organization_id,
                    manmec_organizations (
                        ai_settings
                    )
                `)
                .eq('telegram_chat_id', chatId)
                .eq('onboarding_status', 'complete')
                .single();

            if (user) {
                // ACCIÓN DE IA
                await sendTelegramChatAction(chatId, 'typing');

                let audioBuffer: Buffer | undefined;

                // Si es un audio, descargarlo
                if (message.voice) {
                    await sendTelegramChatAction(chatId, 'record_audio');
                    audioBuffer = await downloadTelegramFile(message.voice.file_id);
                }

                const orgSettings = (user.manmec_organizations as any)?.ai_settings || {};

                const aiResponse = await generateAiResponse(
                    message.text || "",
                    {
                        organization_id: user.organization_id!,
                        full_name: user.full_name,
                        role: user.role || 'GUEST'
                    },
                    orgSettings,
                    audioBuffer
                );

                await sendTelegramMessage(chatId, aiResponse);
            } else {
                await sendTelegramMessage(chatId, "Aún no has vinculado tu cuenta o no te reconozco. Usa la plataforma web de Manmec para generar un código de acceso.");
            }
        }

        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[TELEGRAM WEBHOOK ERROR]', error);
        return NextResponse.json({ ok: true });
    }
}

// Helpers
async function downloadTelegramFile(fileId: string): Promise<Buffer> {
    const token = process.env.TELEGRAM_API_BOT;

    // 1. Obtener la ruta del archivo
    const getFileUrl = `https://api.telegram.org/bot${token}/getFile?file_id=${fileId}`;
    const fileResponse = await fetch(getFileUrl);
    const fileData = await fileResponse.json();

    if (!fileData.ok) throw new Error("Error obteniendo ruta de archivo de Telegram");

    const filePath = fileData.result.file_path;
    const downloadUrl = `https://api.telegram.org/file/bot${token}/${filePath}`;

    // 2. Descargar el binario
    const response = await fetch(downloadUrl);
    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
}

async function sendTelegramChatAction(chatId: string | number, action: string) {
    const token = process.env.TELEGRAM_API_BOT;
    const url = `https://api.telegram.org/bot${token}/sendChatAction`;
    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ chat_id: chatId, action }),
        });
    } catch (e) {
        console.error('[TELEGRAM] Error sending chat action', e);
    }
}

async function sendTelegramMessage(chatId: string | number, text: string, replyMarkup?: any) {
    const token = process.env.TELEGRAM_API_BOT;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    const body: any = { chat_id: chatId, text: text, parse_mode: 'Markdown' };
    if (replyMarkup) {
        if (replyMarkup.remove_keyboard) {
            body.reply_markup = { remove_keyboard: true };
        } else {
            body.reply_markup = replyMarkup;
        }
    }

    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(body),
        });
    } catch (e) {
        console.error('[TELEGRAM] Network error sending message', e);
    }
}

async function sendTelegramContactRequest(chatId: string | number, text: string) {
    const token = process.env.TELEGRAM_API_BOT;
    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
        await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
                parse_mode: 'Markdown',
                reply_markup: {
                    keyboard: [[{ text: '📱 Compartir Mi Teléfono', request_contact: true }]],
                    one_time_keyboard: true,
                    resize_keyboard: true
                }
            }),
        });
    } catch (e) {
        console.error('[TELEGRAM] Network error sending contact request', e);
    }
}
