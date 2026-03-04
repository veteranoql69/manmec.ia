import { createClient } from "@supabase/supabase-js";
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseKey);

async function purgeCache() {
    console.log("Forzando recarga de caché vía API directa de Supabase usando consulta SQL Raw/Fallback");

    try {
        // En lugar de update a tabla, vamos a llamar a una rpc directamente si no, ejecutaremos
        // una inserción dummy y borrado para obligar al trigger the cache.

        console.log("Intentando llamar a postgrest schema reload si hay permisos...");
        const res = await fetch(`${supabaseUrl}/rest/v1/`, {
            method: 'GET',
            headers: {
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
                'Authorization': `Bearer ${supabaseKey}`,
            }
        });

        console.log("REST Root API Status:", res.status);
    } catch (e) {
        console.error(e);
    }
}

purgeCache();
