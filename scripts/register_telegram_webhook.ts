import { config } from 'dotenv';
config({ path: '.env.local' });

async function setWebhook() {
    const token = process.env.TELEGRAM_API_BOT;
    if (!token) {
        console.error('❌ Error: TELEGRAM_API_BOT no encontrado en .env.local');
        process.exit(1);
    }

    const ngrokUrl = process.argv[2];
    if (!ngrokUrl || !ngrokUrl.startsWith('https://')) {
        console.error('❌ Uso: npx tsx scripts/register_telegram_webhook.ts https://tu-url-de-ngrok.ngrok-free.app');
        console.log('Asegúrate de pasar una URL HTTPS de ngrok válida que apunte a tu localhost:3000');
        process.exit(1);
    }

    const webhookUrl = `${ngrokUrl}/api/telegram/webhook`;
    console.log(`📡 Registrando webhook de Telegram hacia: ${webhookUrl}`);

    try {
        const response = await fetch(`https://api.telegram.org/bot${token}/setWebhook`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                url: webhookUrl,
            }),
        });

        const data = await response.json();

        if (data.ok) {
            console.log('✅ Webhook registrado correctamente!');
            console.log('¡Intenta enviarle un mensaje al bot en Telegram ahora!');
        } else {
            console.error('❌ Error registrando el webhook:', data);
        }
    } catch (error) {
        console.error('❌ Falló la conexión con Telegram:', error);
    }
}

setWebhook();
