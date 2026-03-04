import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificWarehouse() {
    // We saw in the previous check that ALIPUN-003 is on 899cd6ff-1e14-4741-ad80-b601588b9a91
    const warehouseId = '899cd6ff-1e14-4741-ad80-b601588b9a91';

    console.log("Checking Tools for Warehouse: ", warehouseId);
    const { data: tools, error: tError } = await supabase
        .from("manmec_tools")
        .select("id, name, serial_number, internal_code, brand, status, deleted_at")
        .eq("assigned_warehouse_id", warehouseId);

    console.log("Tools Query Result:", tools);
    console.log("Error:", tError);
}
checkSpecificWarehouse();
