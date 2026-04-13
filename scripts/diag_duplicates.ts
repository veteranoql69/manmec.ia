import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);

async function run() {
  const { data: wos } = await supabase.from('manmec_work_orders').select('*').eq('external_id', '82102765');
  console.log('--- ALL OTs with external_id 82102765 ---');
  for (const wo of wos || []) {
      const { count } = await supabase.from('manmec_work_order_materials').select('*', { count: 'exact', head: true }).eq('work_order_id', wo.id);
      console.log(`ID: ${wo.id} | Code: ${wo.code} | Created: ${wo.created_at} | Status: ${wo.status} | Mats: ${count}`);
  }
}
run();
