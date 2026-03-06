import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkAssignments() {
    console.log("--- WORK ORDER ASSIGNMENTS ---");
    const { data: assignments, error } = await supabase
        .from('manmec_work_order_assignments')
        .select(`
            work_order_id,
            role,
            mechanic:manmec_users!mechanic_id(full_name)
        `);

    if (error) {
        console.error(error);
        return;
    }

    console.log(JSON.stringify(assignments, null, 2));

    console.log("\n--- WORK ORDERS (ASSIGNED_TO) ---");
    const { data: ots, error: otError } = await supabase
        .from('manmec_work_orders')
        .select('id, code, title, assigned_to');

    if (otError) {
        console.error(otError);
        return;
    }
    console.log(JSON.stringify(ots, null, 2));
}

checkAssignments();
