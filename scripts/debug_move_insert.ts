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

async function debugInsert() {
    const orgId = "0cd4a129-6759-4262-a0b0-ffa838288523";
    const { data: centralWh } = await supabase.from("manmec_warehouses")
        .select("id").eq("organization_id", orgId).eq("type", 'FIXED').limit(1).maybeSingle();
    
    if (!centralWh) {
        console.log("No hay bodega central");
        return;
    }
    
    console.log("Central WH ID:", centralWh.id);

    const { error } = await supabase.from('manmec_inventory_movements').insert({
        item_id: '380bf573-c703-4fb2-bf35-93090aced7d9',
        warehouse_id: centralWh.id, 
        work_order_id: '289104e5-6edf-4b04-960e-b39753e491ac',
        user_id: 'c09534c9-cbd4-4bf3-bb9a-7acdd30abf98',
        type: 'OUT',
        quantity: 1,
        reason: `IA Auto-Deduction test`
    });

    console.log("Insert result:", error ? JSON.stringify(error) : "SUCCESS (No error)");
}
debugInsert();
