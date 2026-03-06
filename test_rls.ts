import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkRLS() {
    console.log("--- RLS POLICIES FOR manmec_work_order_assignments ---");
    const { data, error } = await supabase.rpc('get_policies', { table_name: 'manmec_work_order_assignments' });

    if (error) {
        // Si RPC no existe, probamos consultar pg_policies directamente
        const { data: policies, error: polError } = await supabase.from('pg_policies').select('*').eq('tablename', 'manmec_work_order_assignments');
        if (polError) {
            // Si falla, intentamos ver si Row Level Security está habilitado
            const { data: tableInfo, error: tableError } = await supabase.rpc('check_rls_enabled', { t_name: 'manmec_work_order_assignments' });
            console.log("RLS Info:", tableInfo, tableError);
            return;
        }
        console.log(policies);
    } else {
        console.log(data);
    }
}

// Como probablemente no tenga el RPC get_policies, voy a intentar algo más simple: 
// consultar la tabla con el cliente anon/authenticated (que tiene RLS) vs Service Role.

async function testRLS() {
    const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const anonClient = createClient(supabaseUrl, anonKey);

    console.log("\n--- TESTING RLS WITH ANON/AUTH CLIENT ---");
    const { data: anonData, error: anonError } = await anonClient
        .from('manmec_work_order_assignments')
        .select('*')
        .limit(1);

    console.log("Anon Data:", anonData);
    console.log("Anon Error:", anonError);

    console.log("\n--- TESTING RLS WITH SERVICE ROLE ---");
    const { data: adminData, error: adminError } = await supabase
        .from('manmec_work_order_assignments')
        .select('*')
        .limit(1);

    console.log("Admin Data:", adminData);
    console.log("Admin Error:", adminError);
}

testRLS();
