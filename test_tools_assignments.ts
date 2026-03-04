import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkTools() {
    const { data: tools, error } = await supabase
        .from('manmec_tools')
        .select(`
            name,
            serial_number,
            assigned_vehicle_id,
            assigned_warehouse_id
        `);

    console.log(tools);
}
checkTools();
