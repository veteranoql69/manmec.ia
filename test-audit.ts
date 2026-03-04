import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

const supabase = createClient(supabaseUrl, supabaseKey);

async function test() {
    console.log("Testing vehicle fetch...");
    const { data: v, error: ve } = await supabase.from("manmec_vehicles").select("*").limit(1);
    console.log("Vehicles:", ve || "OK");

    console.log("Testing warehouse fetch...");
    const { data: w, error: we } = await supabase.from("manmec_warehouses").select("*").limit(1);
    console.log("Warehouses:", we || "OK");

    console.log("Testing tools fetch...");
    const { data: t, error: te } = await supabase.from("manmec_tools").select("*").limit(1);
    console.log("Tools:", te || "OK");

    console.log("Testing inventory fetch...");
    const { data: i, error: ie } = await supabase.from("manmec_inventory_items").select("*, category:category_id(id, name)").limit(1);
    console.log("Inventory:", ie || "OK");

    console.log("Testing work orders fetch...");
    const { data: wo, error: woe } = await supabase.from("manmec_work_orders").select("id, code, title, status, priority, ot_type, created_at, completed_at, station:station_id(name)").limit(1);
    console.log("Work Orders:", woe || "OK");

    console.log("Testing assignments fetch...");
    const { data: a, error: ae } = await supabase.from("manmec_work_order_assignments").select("mechanic:mechanic_id(id, full_name, email)").limit(1);
    console.log("Assignments:", ae || "OK");
}

test().catch(console.error);
