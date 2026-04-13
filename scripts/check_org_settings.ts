import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function checkOrgSettings() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const orgId = '0cd4a129-6759-4262-a0b0-ffa838288523';
    
    const { data: org, error } = await supabase
        .from('manmec_organizations')
        .select('ai_settings')
        .eq('id', orgId)
        .single();

    if (error) {
        console.error('Error fetching org:', error);
        return;
    }

    console.log('AI Settings for Org:', JSON.stringify(org.ai_settings, null, 2));
}

checkOrgSettings();
