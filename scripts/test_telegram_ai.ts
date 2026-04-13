import { generateAiResponse } from '../src/lib/ai/gemini';
import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

// Cargar variables de entorno
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function testTelegramAI() {
    console.log('--- TEST TELEGRAM AI AGENT ---');

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // 1. Buscar un usuario de prueba (Cualquiera configurado)
    const { data: user, error: userError } = await supabase
        .from('manmec_users')
        .select(`
            id, 
            full_name, 
            role, 
            organization_id,
            manmec_organizations (
                ai_settings
            )
        `)
        .eq('onboarding_status', 'complete')
        .limit(1)
        .single();

    if (userError || !user) {
        console.error('Error: No se encontró un usuario verificado para la prueba.', userError);
        return;
    }

    console.log(`Simulando mensaje de: ${user.full_name} (${user.role})`);
    console.log(`Organización ID: ${user.organization_id}`);

    const question = "¿dame un resumen de las última 5 Ot atendidas??";
    console.log(`Pregunta: "${question}"`);

    const orgSettings = (user.manmec_organizations as any)?.ai_settings || {};

    try {
        const response = await generateAiResponse(
            question,
            {
                organization_id: user.organization_id!,
                full_name: user.full_name,
                role: user.role || 'GUEST'
            },
            orgSettings
        );

        console.log('\n--- RESPUESTA DE LA IA ---');
        console.log(response);
        console.log('--------------------------');
    } catch (e) {
        console.error('Error ejecutiando IA:', e);
    }
}

testTelegramAI();
