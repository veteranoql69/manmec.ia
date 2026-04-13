import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const code = '82102765';
  const { data: wo } = await supabase.from('manmec_work_orders').select('*').eq('external_id', code).maybeSingle();
  if (wo) {
      console.log('OT:', wo.id, 'Code:', wo.code);
      console.log('Metadata Repuestos:', JSON.stringify(wo.metadata?.repuestos || [], null, 2));
      
      const { data: items } = await supabase.from('manmec_inventory_items').select('*').in('sku', (wo.metadata?.repuestos || []).map(r => String(r.codigo)));
      console.log('Catalog Items Found for these SKUs:', items?.map(i => i.sku));
  }
}
run();
