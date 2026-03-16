import { PrismaClient } from "../src/generated/prisma";

const prisma = new PrismaClient();

async function checkSchema() {
    try {
        console.log("🔍 Verificando esquema de ManmecOrganization...");

        // Intentamos obtener una organización y ver si tiene los nuevos campos
        const org = await prisma.manmecOrganization.findFirst();

        if (!org) {
            console.log("⚠️ No se encontraron organizaciones en la base de datos.");
            return;
        }

        console.log("✅ Conexión establecida.");
        console.log("📊 Datos de la organización encontrada:");
        console.log(`- Nombre: ${org.name}`);
        // @ts-ignore - Estos campos pueden no estar en los tipos generados aún si no se corrió prisma generate
        console.log(`- Email Mandante: ${org.client_notification_email}`);
        // @ts-ignore
        console.log(`- Settings: ${JSON.stringify(org.settings)}`);

        if ('client_notification_email' in org) {
            console.log("🚀 MIGRACIÓN EXITOSA: Los campos existen en el objeto retornado.");
        } else {
            console.log("❌ ERROR: El campo 'client_notification_email' no parece estar presente.");
        }

    } catch (e: any) {
        console.error("❌ ERROR AL VERIFICAR:");
        console.error(e.message);
    } finally {
        await prisma.$disconnect();
    }
}

checkSchema();
