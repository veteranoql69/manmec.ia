import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function verifyStations() {
    console.log('🔍 Verificando datos en manmec_service_stations...\n');

    // 1. Conteo total y por organización
    const { data: countData, error: countError } = await supabase
        .from('manmec_service_stations')
        .select('organization_id, id', { count: 'exact' });

    if (countError) {
        console.error('❌ Error al contar:', countError.message);
        return;
    }

    const total = countData.length;
    const orgStats: Record<string, number> = {};
    countData.forEach(s => {
        orgStats[s.organization_id] = (orgStats[s.organization_id] || 0) + 1;
    });

    console.log(`📊 Total estaciones: ${total}`);
    Object.entries(orgStats).forEach(([id, count]) => {
        console.log(`🏢 Org ${id}: ${count} estaciones`);
    });

    // 2. Muestra de los primeros 5 registros con sus columnas clave
    const { data: sample, error: sampleError } = await supabase
        .from('manmec_service_stations')
        .select('code, sap_store_code, name, brand, segment, app_name, is_mirror, latitude, longitude')
        .limit(5);

    if (sampleError) {
        console.error('❌ Error al obtener muestra:', sampleError.message);
        return;
    }

    console.log('\n👀 Muestra de datos (Primeras 5 estaciones):');
    console.table(sample);

    // 3. Verificar si hay nulos en campos críticos que acabamos de agregar
    const { data: nullChecks, error: checkError } = await supabase
        .from('manmec_service_stations')
        .select('id')
        .or('brand.is.null,code.is.null,app_name.is.null');

    if (checkError) {
        console.error('❌ Error en check de nulos:', checkError.message);
    } else {
        console.log(`\n🛠️  Registros con campos críticos incompletos (brand/code/app_name): ${nullChecks.length}`);
    }
}

verifyStations();
