import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function inspectTable() {
    const { data, error } = await supabase
        .from('manmec_service_stations')
        .select('*')
        .limit(1);

    if (error) {
        console.error('❌ Error:', error.message);
        return;
    }

    if (data && data.length > 0) {
        console.log('\n--- Estructura Real de la Tabla ---');
        const columns = Object.keys(data[0]).sort();
        columns.forEach(col => {
            console.log(`- ${col}`);
        });

        console.log('\n--- Ejemplo de una Estación ---');
        console.log(JSON.stringify(data[0], null, 2));
    } else {
        console.log('⚠️ La tabla está vacía.');
    }
}

inspectTable();
