import { createClient } from "@supabase/supabase-js";
import * as dotenv from "dotenv";
import * as path from "path";

dotenv.config({ path: path.resolve(process.cwd(), ".env.local") });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function debugQuery() {
    console.log("Testing simplified query...");
    const { data: stations, error: sError } = await supabase
        .from("manmec_service_stations")
        .select("id")
        .limit(1);

    if (sError) {
        console.error("Core stations query failed:", sError);
        return;
    }

    const testId = stations[0].id;
    console.log(`Using ID: ${testId}`);

    const { data, error } = await supabase
        .from("manmec_service_stations")
        .select(`
            *,
            work_orders:manmec_work_orders(
                id,
                code,
                title,
                description,
                priority,
                status,
                ot_type,
                scheduled_date,
                started_at,
                completed_at,
                vehicle:manmec_vehicles(id, plate, brand, model),
                materials:manmec_work_order_materials(
                    id,
                    quantity,
                    notes,
                    item:manmec_inventory_items(id, name, unit)
                ),
                assignments:manmec_work_order_assignments(
                    id,
                    role,
                    mechanic:manmec_users!mechanic_id(id, full_name, role)
                )
            )
        `)
        .eq("id", testId)
        .single();

    if (error) {
        console.log("QUERY ERROR DETECTED:");
        console.log(JSON.stringify(error, null, 2));
    } else {
        console.log("Query successful!");
        console.log("Sample OT:", data.work_orders?.[0] || "No OTs found");
    }
}

debugQuery();
