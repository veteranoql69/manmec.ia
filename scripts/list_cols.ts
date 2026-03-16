import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function listColumns() {
    const { data, error } = await supabase.rpc('get_table_columns_info', { t_name: 'manmec_service_stations' });

    // Si no existe la función RPC, usamos una query directa a information_schema (si es posible vía rpc)
    // O simplemente intentamos seleccionar todos los campos y vemos el error o el resultado.

    const { data: cols, error: colError } = await supabase
        .from('manmec_service_stations')
        .select('*')
        .limit(1);

    if (colError) {
        console.error('❌ Error al obtener columnas:', colError.message);
        return;
    }

    if (cols && cols.length > 0) {
        console.log('\n✅ Columnas encontradas en la tabla:');
        console.log(Object.keys(cols[0]).sort().join(', '));
    } else {
        console.log('⚠️ La tabla está vacía o no se pudieron recuperar las columnas.');
    }
}

listColumns();
