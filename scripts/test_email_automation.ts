import fetch from 'node-fetch';

const ENDPOINT = 'http://localhost:3000/api/webhooks/notifications/email';

const MOCK_EMAILS = {
    ticket: {
        from: 'mantenimiento.noresponder@copec.cl',
        to: 'bodega@manmec.cl',
        subject: '20017 P3 [Wifi] Una Antena No Funciona-12637530',
        body: `
      No. Aviso: 12637530
      Fecha ingreso: 27.02.2026 08:51:45
      Fecha comprometida de resolución: 28.02.2026 08:51:45
      Responsable: MARCO ALTAMIRANO
      Falla reportada: [Wifi] Una Antena No Funciona 20017_4
      Tiempo de respuesta: 24 Hr
      Dirección: RUTA 5 SUR KM 383 3
      Comuna: SAN CARLOS
    `
    },
    shipment: {
        from: 'lzamoram@copec.cl',
        to: 'bodega@manmec.cl',
        subject: 'NOTIFICACIÓN DE GUÍA DE DESPACHO N° EG0125444511',
        body: `
      Estimado(s) MARCO ALTAMIRANO.
      Se genera Guía de Despacho n° EG0125444511 con los siguientes materiales:
      Pedido: 5501080963
      Almacén: M027
      
      Material | Denominación | Cantidad | UM
      401402 | VALV. SOLENOIDE 3/4" | 1 | UN
      402768 | TAZA VALV RETENC ANG TIPO OPW | 1 | UN
      406431 | SWITCH PREDET ENCOR 500 S | 1 | UN
      406983 | GRAFICA PRED. ENCORE 500S | 1 | UN
      408856 | AVIP RF NOZZLE COVER OPW 11A | 3 | UN
    `
    }
};

async function test(type: 'ticket' | 'shipment') {
    console.log(`🚀 Simulando envío de correo: ${type.toUpperCase()}...`);

    try {
        const response = await fetch(ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(MOCK_EMAILS[type])
        });

        const result = await response.json();
        console.log('✅ Resultado del Servidor:', result);
    } catch (error) {
        console.error('❌ Error enviando mail:', error);
    }
}

// Ejecutar pruebas
const arg = process.argv[2];
if (arg === 'ticket') test('ticket');
else if (arg === 'shipment') test('shipment');
else {
    console.log('Uso: npx tsx scripts/test_email_automation.ts [ticket|shipment]');
}
