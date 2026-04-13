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

async function checkWH() {
    // Check WH
    const { data: whs } = await supabase.from('manmec_warehouses').select('*')
    console.log(`BODEGAS DISPONIBLES: ${whs?.length}`)
    whs?.forEach(w => console.log(w.name, w.type, w.organization_id))
    
    // Org from the OT
    const { data: wo } = await supabase.from('manmec_work_orders').select('organization_id').eq('id', '289104e5-6edf-4b04-960e-b39753e491ac').single()
    console.log(`OT Org ID: ${wo?.organization_id}`)
}
checkWH()
