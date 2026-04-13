import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env') });

async function fixOrgSettings() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const orgId = '0cd4a129-6759-4262-a0b0-ffa838288523';
    
    const { data: org } = await supabase
        .from('manmec_organizations')
        .select('ai_settings')
        .eq('id', orgId)
        .single();

    if (org) {
        const newSettings = { ...org.ai_settings };
        if (newSettings.model_matrix) {
            newSettings.model_matrix.chat = 'gemini-flash-latest';
            newSettings.model_matrix.voice = 'gemini-flash-latest';
            newSettings.model_matrix.vision = 'gemini-flash-latest';
        }

        const { error } = await supabase
            .from('manmec_organizations')
            .update({ ai_settings: newSettings })
            .eq('id', orgId);

        if (error) {
            console.error('Error updating settings:', error);
        } else {
            console.log('Successfully updated AI Settings to use gemini-1.5-flash');
        }
    }
}

fixOrgSettings();
