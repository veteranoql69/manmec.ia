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

async function checkStock() {
    console.log("🔍 Verificando stock para 407069 y 409236...")
    
    // Obtener item ids
    const { data: items } = await supabase.from('manmec_inventory_items').select('id, name, sku').in('sku', ['407069', '409236'])
    const itemIds = items?.map(i => i.id) || []
    
    // Stock en warehouses
    const { data: stock } = await supabase.from('manmec_inventory_stocks').select('warehouse_id, item_id, quantity').in('item_id', itemIds)
    
    console.log("Items:", items)
    console.log("Stock:", stock)

    // Check IF there's any error in insertion directly
    const centralWhId = "0cd4a129-6759-4262-a0b0-ffa838288523";
    for(const item of items || []) {
        console.log(`Intentando forzar insert manualmente en movimiento para ver si explota SQL (Item: ${item.name})`)
        const { error } = await supabase.from('manmec_inventory_movements').insert({
            item_id: item.id,
            warehouse_id: centralWhId, // BODEGA CENTRAL
            work_order_id: '289104e5-6edf-4b04-960e-b39753e491ac',
            user_id: 'c09534c9-cbd4-4bf3-bb9a-7acdd30abf98',
            type: 'OUT',
            quantity: 1,
            reason: `Prueba de Error`
        });
        console.log("Insert result:", error ? error.message : "SUCCESS (No error)");
    }
}
checkStock()
