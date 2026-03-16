import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY // Usamos service role para saltar RLS en este test

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Faltan variables de entorno en .env.local")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function verifyDB() {
    console.log("🔍 Consultando manmec_organizations directamente via Supabase API...")

    const { data, error } = await supabase
        .from('manmec_organizations')
        .select('name, client_notification_email, settings')
        .limit(1)
        .single()

    if (error) {
        console.error("❌ ERROR EN LA CONSULTA:")
        console.error(error.message)
        console.error("Código:", error.code)
        if (error.message.includes("column") || error.message.includes("does not exist")) {
            console.log("💡 El error sugiere que las columnas NO existen aún en el esquema remoto.");
        }
        process.exit(1)
    }

    console.log("✅ CONEXIÓN EXITOSA")
    console.log("📊 Registro recuperado:")
    console.log("- Organización:", data.name)
    console.log("- Email Mandante:", data.client_notification_email)
    console.log("- Settings:", JSON.stringify(data.settings))

    if (data.client_notification_email === 'bodega@manmec.cl') {
        console.log("🚀 VERIFICACIÓN COMPLETA: El valor de desarrollo está correctamente configurado.");
    }
}

verifyDB()
