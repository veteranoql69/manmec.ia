import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing SUPABASE env vars.");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey)

async function main() {
    console.log("=== CHECKING DATABASE CONTENT (SUPABASE API) ===");

    // 1. Get Organizations
    const { data: orgs } = await supabase.from('manmec_organizations').select('*');
    console.log("\n--- Organizations ---");
    console.log(JSON.stringify(orgs, null, 2));

    // 2. Get Users
    const { data: users } = await supabase.from('manmec_users').select('id, full_name, role');
    console.log("\n--- Users (first 5) ---");
    console.log(JSON.stringify(users?.slice(0, 5), null, 2));

    // 3. Get Stations
    const { data: stations } = await supabase.from('manmec_service_stations').select('id, name, code');
    console.log("\n--- Stations (first 5) ---");
    console.log(JSON.stringify(stations?.slice(0, 5), null, 2));

    // 4. Get Vehicles
    const { data: vehicles } = await supabase.from('manmec_vehicles').select('id, plate, brand');
    console.log("\n--- Vehicles ---");
    console.log(JSON.stringify(vehicles, null, 2));

    // 5. Get Work Orders
    const { data: ots, error } = await supabase.from('manmec_work_orders').select(`
        id, code, title, priority, status, created_at,
        station:manmec_service_stations!station_id(name, code),
        vehicle:manmec_vehicles!vehicle_id(plate),
        assigned_user:manmec_users!assigned_to(full_name)
    `);

    console.log("\n--- Work Orders ---");
    if (error) {
        console.error(error);
    } else {
        console.log(JSON.stringify(ots, null, 2));
    }

}

main()
    .catch((e) => {
        console.error(e)
        process.exit(1)
    })
