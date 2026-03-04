import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkQuery() {
    console.log("Testing fetching pending transfers with FK disambiguation");

    // Attempt the query
    const { data: p1, error: e1 } = await supabase
        .from('manmec_inventory_transfers')
        .select(`
            id,
            sender:manmec_users!manmec_inventory_transfers_sender_id_fkey(full_name),
            from_warehouse:manmec_warehouses!manmec_inventory_transfers_from_warehouse_id_fkey(name)
        `)
        .limit(1);

    console.log("Result 1 (manmec_inventory_transfers_sender_id_fkey):", p1, e1?.message);

    const { data: p2, error: e2 } = await supabase
        .from('manmec_inventory_transfers')
        .select(`
            id,
            sender:manmec_users!sender_id(full_name),
            from_warehouse:manmec_warehouses!from_warehouse_id(name)
        `)
        .limit(1);

    console.log("Result 2 (short foreign key col):", p2, e2?.message);
}
checkQuery().catch(console.error);
