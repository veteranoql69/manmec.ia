import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl!, supabaseKey!)

async function main() {
    const { data: users, error } = await supabase
        .from('manmec_users')
        .select('id, full_name, phone, telegram_chat_id, onboarding_status')
        .ilike('full_name', '%Carlos%');

    if (error) {
        console.error("Error fetching user:", error);
    } else {
        console.log("Matching Users:", JSON.stringify(users, null, 2));
    }
}

main();
