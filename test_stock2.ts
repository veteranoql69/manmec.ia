import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTriggers() {
    console.log("Direct SQL to get movements triggers");

    // We can't run raw SQL on the free Supabase JS client without an RPC, 
    // so let's try calling PostgreSQL's system info via PostgREST if exposed, 
    // or just checking if there are multiple rows for the stock.
    // Wait, are there multiple stock rows for this warehouse and item?
    const { data: stockRecords } = await supabase
        .from('manmec_inventory_stock')
        .select('*')
        .eq('item_id', '270e1881-916d-437d-97cf-d07086c7cae1');

    console.log("All stock for this item_id everywhere:", stockRecords);

    // Let's create a test movement directly and see if we can catch the detail in the response text
    const payload = {
        item_id: '270e1881-916d-437d-97cf-d07086c7cae1',
        warehouse_id: '76ba4f1b-d657-49e7-8644-3fa654e44a94',
        user_id: 'd91a92fb-6be2-4416-8c44-c689100742d4',  // User IDs might trigger something? (Assume the profile id is similar)
        type: "OUT",
        quantity: 1,
        reason: 'DEBUG TEST'
    };

    // First fetch a valid user ID from the organization
    const { data: users } = await supabase.from('manmec_users').select('id').limit(1);
    if (users && users.length > 0) {
        payload.user_id = users[0].id;
    }

    // Attempt the exact insert
    console.log("Attempting direct INSERT:", payload);
    const { data: inserted, error: insertError } = await supabase
        .from('manmec_inventory_movements')
        .insert(payload)
        .select();

    if (insertError) {
        console.error("Direct Insert Error Details:");
        console.error(JSON.stringify(insertError, null, 2));
    } else {
        console.log("Direct Insert Succeeded! Wait... why did it succeed here?", inserted);
    }
}
checkTriggers().catch(console.error);
