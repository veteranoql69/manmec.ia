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

async function checkDetails() {
    console.log("🔍 Buscando detalles para la OT 289104e5-6edf-4b04-960e-b39753e491ac...")
    
    // Timeline
    const { data: timeline } = await supabase
        .from('manmec_work_order_timeline')
        .select('*')
        .eq('work_order_id', '289104e5-6edf-4b04-960e-b39753e491ac')
    
    console.log(`\n--- TIMELINE (${timeline?.length || 0}) ---`)
    timeline?.forEach(t => console.log(`[${t.created_at}] ${t.entry_type}: ${t.content}`))

    // Materials
    const { data: materials } = await supabase
        .from('manmec_work_order_materials')
        .select('*, item:item_id(name, sku)')
        .eq('work_order_id', '289104e5-6edf-4b04-960e-b39753e491ac')
    
    console.log(`\n--- MATERIALES (${materials?.length || 0}) ---`)
    materials?.forEach(m => console.log(`Item: ${m.item?.name} (${m.item?.sku}) - Cantidad: ${m.quantity}`))

    // IA Logs with generic text search
    const { data: logs } = await supabase
        .from('manmec_ia_automation_logs')
        .select('*')
        .or('raw_payload.ilike.%82102764%,error_message.ilike.%82102764%,ai_response.ilike.%82102764%')
        
    console.log(`\n--- LOGS IA relacionados (${logs?.length || 0}) ---`)
    logs?.forEach(log => console.log(`Log ID: ${log.id} | Status: ${log.status} | Tipo: ${log.type}`))
}

checkDetails()
