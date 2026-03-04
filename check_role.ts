import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseKey);

async function checkUser() {
    console.log("Fetching users from auth...");
    const { data: { users }, error } = await supabase.auth.admin.listUsers();
    if (error) {
        console.error("Auth Error:", error);
        return;
    }

    const targetUser = users.find(u => u.email === "caltamirano@manmec.cl");
    if (!targetUser) {
        console.log("User caltamirano@manmec.cl not found in Auth.");
        return;
    }

    console.log(`Found Auth ID: ${targetUser.id}`);

    const { data: profile, error: dbError } = await supabase
        .from("manmec_users")
        .select("*")
        .eq("id", targetUser.id)
        .single();

    if (dbError) {
        console.error("DB Error:", dbError);
    } else {
        console.log("User Profile in DB:");
        console.log(JSON.stringify(profile, null, 2));
    }
}

checkUser();
