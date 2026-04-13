import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseServiceKey) {
    console.error("❌ Faltan variables de entorno en .env.local")
    process.exit(1)
}

const supabase = createClient(supabaseUrl, supabaseServiceKey)

async function checkRecords() {
    console.log("🔍 Buscando registros para la orden 82102764...")
    
    // Check Work Orders
    const { data: wos, error: woError } = await supabase
        .from('manmec_work_orders')
        .select('*')
        .or('external_id.eq.82102764,sap_order_id.eq.82102764')
    
    if (woError) {
        console.error("Error consultando work_orders:", woError)
    } else {
        console.log(`\n--- WORK ORDERS ENCONTRADAS: ${wos?.length} ---`)
        wos?.forEach(wo => console.log(`OT: ${wo.id} | External ID: ${wo.external_id} | SAP Order ID: ${wo.sap_order_id} | Status: ${wo.status} | Title: ${wo.title}`))
    }

    // Check IA logs
    const { data: logs, error: logsError } = await supabase
        .from('manmec_ia_automation_logs')
        .select('*')
        .eq('external_id', '82102764')

    if (logsError) {
        console.error("Error consultando ia_automation_logs:", logsError)
    } else {
        console.log(`\n--- LOGS DE IA ENCONTRADOS: ${logs?.length} ---`)
        logs?.forEach(log => console.log(`Log ID: ${log.id} | Status: ${log.status} | Type: ${log.type} | Created At: ${log.created_at}`))
    }
}

checkRecords()
