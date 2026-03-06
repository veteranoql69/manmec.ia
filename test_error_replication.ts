import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!; // Service role
const supabase = createClient(supabaseUrl, supabaseKey);

async function testQuery() {
    const id = '2aded0d4-43af-4562-a12b-342815e6bd7f'; // From the screenshot
    const { data: team, error: teamError } = await supabase
        .from("manmec_work_order_assignments")
        .select(`
            role,
            mechanic:manmec_users!mechanic_id(id, full_name, email)
        `)
        .eq("work_order_id", id);

    if (teamError) {
        console.log("TEAM ERROR DETECTED:");
        console.log(teamError);
        console.log(JSON.stringify(teamError, null, 2));
    } else {
        console.log("SUCCESS:", team);
    }
}

testQuery();
