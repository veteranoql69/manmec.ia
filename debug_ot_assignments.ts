import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkSpecificOT(code: string) {
    console.log(`--- DEBUGGING OT: ${code} ---`);

    // 1. Get OT ID and assigned_to
    const { data: ot, error: otError } = await supabase
        .from('manmec_work_orders')
        .select('id, code, title, assigned_to')
        .eq('code', code)
        .single();

    if (otError) {
        console.error("OT Error:", otError);
        return;
    }
    console.log("OT Basic Info:", ot);

    // 2. Get Lead info from assigned_to
    if (ot.assigned_to) {
        const { data: lead } = await supabase
            .from('manmec_users')
            .select('full_name')
            .eq('id', ot.assigned_to)
            .single();
        console.log("Assigned Lead (assigned_to):", lead?.full_name);
    }

    // 3. Get all assignments in manmec_work_order_assignments
    const { data: assignments, error: assError } = await supabase
        .from('manmec_work_order_assignments')
        .select(`
            role,
            mechanic_id,
            mechanic:manmec_users!mechanic_id(full_name)
        `)
        .eq('work_order_id', ot.id);

    if (assError) {
        console.error("Assignments Error:", assError);
        return;
    }
    console.log("Detailed Assignments:", JSON.stringify(assignments, null, 2));
}

checkSpecificOT('OT-2026-0001');
