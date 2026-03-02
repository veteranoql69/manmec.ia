import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();

        // Log for debugging
        console.log('[TELEGRAM WEBHOOK] Received update:', JSON.stringify(body, null, 2));

        // Handle basic text messages for now
        if (body.message && body.message.text) {
            const chatId = body.message.chat.id;
            const text = body.message.text;

            console.log(`[TELEGRAM] Message from ${chatId}: ${text}`);

            // Basic echo reply just to verify connection
            await sendTelegramMessage(chatId, `Hola! Recibí tu mensaje: "${text}". Soy EL qliao de Manmec.`);
        }

        // Telegram requires a 200 OK fast response to stop retrying
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error('[TELEGRAM WEBHOOK ERROR]', error);
        // Still return 200 so Telegram doesn't retry infinitely on our errors
        return NextResponse.json({ ok: true });
    }
}

// Helper to send a message back
async function sendTelegramMessage(chatId: number | string, text: string) {
    const token = process.env.TELEGRAM_API_BOT;
    if (!token) {
        console.error('[TELEGRAM] Error: TELEGRAM_API_BOT is missing in environment.');
        return;
    }

    const url = `https://api.telegram.org/bot${token}/sendMessage`;

    try {
        const response = await fetch(url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                chat_id: chatId,
                text: text,
            }),
        });

        if (!response.ok) {
            console.error(`[TELEGRAM] Failed to send message: ${response.statusText}`);
        }
    } catch (e) {
        console.error('[TELEGRAM] Network error sending message', e);
    }
}
