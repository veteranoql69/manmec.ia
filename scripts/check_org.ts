import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function checkOrg() {
    const { data, error } = await supabase
        .from('manmec_organizations')
        .select('id, name, rut');

    if (error) {
        console.error('Error al consultar organizaciones:', error.message);
        return;
    }

    console.log('\n--- Organizaciones registradas ---');
    console.table(data);
    console.log('----------------------------------\n');
}

checkOrg();
