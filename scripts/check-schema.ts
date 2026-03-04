import { createAdminClient } from '../src/lib/supabase/admin';
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function checkConstraints() {
    const supabase = createAdminClient();

    console.log("🛠️ Searching for allowed entry_types in timeline...");

    // Intentar ver registros existentes para deducir tipos válidos
    const { data: samples } = await supabase
        .from('manmec_work_order_timeline')
        .select('entry_type')
        .limit(20);

    console.log("✅ Existing types found:", JSON.stringify([...new Set(samples?.map(s => s.entry_type))], null, 2));

    // Intentar obtener la definición de la tabla si es posible via RPC o query
    const { data: constraintInfo } = await supabase.rpc('get_table_constraints', { tname: 'manmec_work_order_timeline' }) ||
        await supabase.from('information_schema.check_constraints').select('*').limit(5);

    console.log("📊 Constraint Info (if available):", JSON.stringify(constraintInfo, null, 2));
}

checkConstraints();
