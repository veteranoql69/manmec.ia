import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const code = '82102765';
  const { data: wo, error: woErr } = await supabase.from('manmec_work_orders').select('id, code, external_id').eq('external_id', code).maybeSingle();
  if (!wo) {
     console.log('Work Order NOT FOUND for code:', code, 'Err:', woErr?.message);
     return;
  }
  console.log('Found OT ID:', wo.id);
  
  const { data: mats, error: matErr } = await supabase
    .from('manmec_work_order_materials')
    .select('*, item:manmec_inventory_items(name, sku, unit)')
    .eq('work_order_id', wo.id);
    
  console.log('Materials Found Count:', mats?.length || 0);
  if (mats && mats.length > 0) {
      mats.forEach(m => console.log(`- Item: ${m.item?.name} (${m.item?.sku}) - Qty: ${m.quantity}`));
  } else {
      console.log('No materials record found for this UUID.');
  }

  // Double check if there are materials for OTHER work order ids
  const { data: allMats } = await supabase.from('manmec_work_order_materials').select('work_order_id').limit(10);
  console.log('Sample materials in DB:', allMats);
}
run();
