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

async function checkMovements() {
    console.log("🔍 Buscando movimientos de inventario de la OT 289104e5-6edf-4b04-960e-b39753e491ac...")
    
    // Inventory movements
    const { data: movements, error } = await supabase
        .from('manmec_inventory_movements')
        .select(`
            *,
            item:item_id(name, sku),
            warehouse:warehouse_id(name, type)
        `)
        .eq('work_order_id', '289104e5-6edf-4b04-960e-b39753e491ac')
    
    if (error) {
        console.error("Error consultando movimientos:", error)
        return
    }

    console.log(`\n--- MOVIMIENTOS DETECTADOS (${movements?.length || 0}) ---`)
    movements?.forEach(m => {
        console.log(`- Tipo Movimiento: ${m.type}`);
        console.log(`- Repuesto: ${m.item?.name} (${m.item?.sku})`);
        console.log(`- Cantidad Descontada: ${m.quantity}`);
        console.log(`- Bodega Origen: ${m.warehouse?.name} (Tipo: ${m.warehouse?.type})`);
        console.log(`- Fecha/Hora: ${m.created_at}`);
        console.log(`- Razón: ${m.reason}`);
        console.log("-----------------------------------------");
    })
}

checkMovements()
