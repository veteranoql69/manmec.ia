import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkStock() {
    const warehouseId = '76ba4f1b-d657-49e7-8644-3fa654e44a94';
    const itemId = '270e1881-916d-437d-97cf-d07086c7cae1';

    console.log(`Checking stock for\nItem: ${itemId}\nWarehouse: ${warehouseId}`);

    // Check stock table
    const { data: q1, error: e1 } = await supabase
        .from('manmec_inventory_stock')
        .select('*')
        .eq('warehouse_id', warehouseId)
        .eq('item_id', itemId);

    console.log("Raw Stock Results:", JSON.stringify(q1, null, 2), e1);

    if (q1 && q1.length > 0) {
        console.log("Row DB quantity is:", q1[0].quantity, "| JS Type:", typeof q1[0].quantity);
    }
}
checkStock().catch(console.error);
