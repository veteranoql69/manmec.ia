import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as fs from 'fs';
import * as path from 'path';

dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const supabase = createClient(supabaseUrl, supabaseServiceKey);

async function importEDS() {
    console.log('🚀 Iniciando importación MAESTRA de datos EDS...');

    // 1. Obtener la organización por defecto
    const { data: orgs, error: orgError } = await supabase
        .from('manmec_organizations')
        .select('id')
        .limit(1);

    if (orgError || !orgs || orgs.length === 0) {
        console.error('❌ No se encontró una organización en la DB.');
        return;
    }

    const organizationId = orgs[0].id;
    console.log(`🏢 Usando Organización ID: ${organizationId}`);

    // 2. Leer CSV
    const csvPath = path.join(process.cwd(), 'doc_example', 'eds_total.csv');
    if (!fs.existsSync(csvPath)) {
        console.error(`❌ No se encontró el archivo en ${csvPath}`);
        return;
    }

    const csvData = fs.readFileSync(csvPath, 'utf8');
    const lines = csvData.split('\n');

    const stations = [];

    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Mapeo detallado de 23 columnas:
        // 0: estacion (Jerga)
        // 1: codigo tienda sap
        // 2: codigo sap tienda
        // 3: nombre tienda
        // 4: marca
        // 5: ubicación
        // 6: segmento
        // 7: cluster/prototipo
        // 8: operación
        // 9: nombre tienda app
        // 10: formato
        // 11: sistema pos
        // 12: region
        // 13: comuna
        // 14: direccion
        // 15: sentido
        // 16: radiotienda
        // 17: radioruta
        // 18: espejo (espejo)
        // 19: latitud
        // 20: longitud
        // 21: Servicios
        // 22: CentroActivo

        // Regex para manejar comas dentro de comillas (direcciones y servicios)
        const values = line.match(/(".*?"|[^",]+)(?=\s*,|\s*$)/g);
        if (!values || values.length < 20) continue;

        const clean = (val: string) => val ? val.replace(/^"|"$/g, '').trim() : null;

        const parseCoord = (val: string) => {
            if (!val) return null;
            const cleaned = val.replace(/^"|"$/g, '');
            // Si el valor tiene muchos puntos (ej: -4.153.508...), lo tratamos como error de formato
            // Intentamos dejar solo el primer punto decimal.
            const parts = cleaned.split('.');
            if (parts.length > 2) {
                // Chileno: -4.153.508 -> -4.153508
                return parseFloat(`${parts[0]}.${parts.slice(1).join('')}`);
            }
            return parseFloat(cleaned);
        };

        stations.push({
            organization_id: organizationId,
            name: clean(values[3]) || 'Estación sin nombre',
            code: clean(values[0]) === 'n/a' ? `SAP-${clean(values[1])}` : clean(values[0]),
            sap_store_code: clean(values[1]),
            sap_store_id: clean(values[2]),
            brand: clean(values[4]),
            location_type: clean(values[5]),
            segment: clean(values[6]),
            cluster: clean(values[7]),
            operation_type: clean(values[8]),
            app_name: clean(values[9]),
            format: clean(values[10]),
            pos_system: clean(values[11]),
            region_id: parseInt(clean(values[12]) || '0'),
            commune: clean(values[13]),
            address: clean(values[14]),
            direction_sense: clean(values[15]),
            shop_radius: parseFloat(clean(values[16]) || '0'),
            route_radius: parseFloat(clean(values[17]) || '0'),
            is_mirror: parseInt(clean(values[18]) || '0'),
            latitude: parseCoord(values[19]),
            longitude: parseCoord(values[20]),
            services: clean(values[21]),
            is_active_sap: clean(values[22]) === 'VERDADERO',
            is_active: true,
            updated_at: new Date().toISOString()
        });
    }

    console.log(`📦 Preparadas ${stations.length} estaciones con mapping 23-columnas.`);

    // 3. Upsert en lotes
    const batchSize = 50;
    for (let i = 0; i < stations.length; i += batchSize) {
        const batch = stations.slice(i, i + batchSize);
        const { error } = await supabase
            .from('manmec_service_stations')
            .upsert(batch, {
                onConflict: 'organization_id,name'
            });

        if (error) {
            console.error(`❌ Error en lote ${Math.floor(i / batchSize) + 1}:`, error.message);
        } else {
            console.log(`✅ Lote ${Math.floor(i / batchSize) + 1} completado.`);
        }
    }

    console.log('✨ Importación FINALIZADA con éxito total.');
}

importEDS().catch(console.error);
