import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

// Initialize Supabase with service role key to bypass RLS for diagnostic purposes
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkDatabase() {
    console.log("Checking if manmec_inventory_transfers table exists...");

    // Attempt to query the table
    const { data: testData, error: testError } = await supabase
        .from("manmec_inventory_transfers")
        .select("id")
        .limit(1);

    if (testError) {
        console.log("Table check failed with error:", testError);
        console.log("Did you run the 008 migration SQL script?");
    } else {
        console.log("Table exists! Error must be elsewhere.");
    }
}

checkDatabase();
