import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const id = '289104e5-6edf-4b04-960e-b39753e491ac'; // OT PM02 test
  
  const { data: materials, error } = await supabase
    .from("manmec_work_order_materials")
    .select(`
        quantity,
        notes,
        item:manmec_inventory_items(name, sku, unit)
    `)
    .eq("work_order_id", id);
    
  console.log("Without '!item_id':", JSON.stringify(materials, null, 2), "Error:", error?.message);

  const { data: mats2, error: err2 } = await supabase
    .from("manmec_work_order_materials")
    .select(`
        quantity,
        notes,
        item:manmec_inventory_items!item_id(name, sku, unit)
    `)
    .eq("work_order_id", id);
    
  console.log("With '!item_id':", JSON.stringify(mats2, null, 2), "Error2:", err2?.message);
}
run();
