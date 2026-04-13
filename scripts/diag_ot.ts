import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const code = process.argv[2] || '82102765';
  const { data: wo } = await supabase.from('manmec_work_orders').select('*').eq('external_id', code).maybeSingle();
  if (wo) {
      console.log('OT:', wo.id, 'Code:', wo.code, 'External:', wo.external_id);
      console.log('Metadata Repuestos:', JSON.stringify(wo.metadata?.repuestos || [], null, 2));
      const { count: matCount } = await supabase.from('manmec_work_order_materials').select('*', { count: 'exact', head: true }).eq('work_order_id', wo.id);
      console.log('Consumption Table Count:', matCount);
  } else {
      console.log('OT NOT FOUND');
  }
}
run();
