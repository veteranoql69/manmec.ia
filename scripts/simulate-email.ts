import fs from 'fs';
import path from 'path';

/**
 * SIMULADOR DE WEBHOOK DE CORREO - MANMEC
 * Ejecutar con: npx tsx scripts/simulate-email.ts [escenario] [archivo_pdf] [to] [id] [subject] [body]
 */

const WEBHOOK_URL = 'http://localhost:3000/api/webhooks/notifications/email';

async function simulate() {
    console.log("DEBUG ARGV:", process.argv);
    const scenario = process.argv[2] || 'OT_OPEN';
    const pdfPath = process.argv[3] === "NONE" ? "" : process.argv[3];
    const randomId = Math.floor(Math.random() * 9000000) + 1000000;

    console.log(`🚀 Iniciando simulación: ${scenario} (ID Dinámico Sugerido: ${randomId})`);

    let payload: any = {
        from: 'mantenimiento@copec.cl',
        to: process.argv[4] && process.argv[4] !== "NONE" ? process.argv[4] : 'bodega@manmec.cl',
        subject: '',
        body: '',
        attachments: []
    };

    switch (scenario) {
        case 'OT_OPEN':
            const openId = process.argv[5] && process.argv[5] !== "" ? process.argv[5] : randomId;
            payload.subject = `Notificación de Nuevo Aviso: ${openId}`;
            payload.body = `
                Estimado proveedor,
                Se ha generado un nuevo aviso de mantenimiento.
                Número de Aviso: ${openId}
                Estación: 20017 - Pronto Pargua
                Prioridad: P1
                Descripción: Fuga de combustible en manguera de Surtidor 01. Requiere atención inmediata.
            `;
            break;

        case 'OT_CLOSE':
            // Para cerrar, el usuario puede pasar el ID por consola o usar el generado
            const closeId = process.argv[5] && process.argv[5] !== "" ? process.argv[5] : randomId;
            payload.subject = `Confirmación de Cierre de Aviso: ${closeId}`;
            payload.body = `
                El aviso ${closeId} ha sido cerrado satisfactoriamente.
                Adjunto encontrará el informe técnico detallado.
            `;
            if (pdfPath && fs.existsSync(pdfPath)) {
                console.log(`📎 Adjuntando PDF: ${pdfPath}`);
                const pdfBase64 = fs.readFileSync(pdfPath).toString('base64');
                payload.attachments.push({
                    filename: path.basename(pdfPath),
                    content: pdfBase64,
                    contentType: 'application/pdf'
                });
            } else {
                console.warn('⚠️ No se proporcionó PDF o no existe. El cierre se procesará solo con el texto.');
            }
            break;

        case 'SHIPMENT':
            payload.subject = `Aviso de Guía de Despacho: ${randomId}`;
            payload.body = `
                Envío de materiales para pedido 4500998811.
                Guía de Despacho: ${randomId}
                Proveedor: MATERIALES COPEC S.A.
                
                Materiales incluidos:
                1. 200556 - FILTRO COMBUSTIBLE 10 MICRON - 10 UN
                2. 200998 - MANGUERA DE DESPACHO 3/4 - 2 UN
                3. 100223 - VÁLVULA DE SEGURIDAD - 1 UN
            `;
            break;

        default:
            console.error('❌ Escenario no reconocido. Usa: OT_OPEN, OT_CLOSE o SHIPMENT');
            process.exit(1);
    }

    // Sobrescribir con valores personalizados si se proveen (argumentos 6 y 7)
    const customSubject = process.argv[6];
    const customBody = process.argv[7];

    if (customSubject) {
        console.log(`📝 Usando Asunto Personalizado: ${customSubject}`);
        payload.subject = customSubject;
    }
    if (customBody) {
        console.log(`📝 Usando Cuerpo Personalizado: ${customBody}`);
        payload.body = customBody;
    }

    try {
        const response = await fetch(WEBHOOK_URL, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        const result = await response.json();
        console.log('\n✅ RESPUESTA DEL SERVIDOR:');
        console.log(JSON.stringify(result, null, 2));
    } catch (error: any) {
        console.error('\n❌ ERROR AL ENVIAR EL WEBHOOK:');
        console.error(error.message);
    }
}

simulate();
