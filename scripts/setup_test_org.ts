import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function checkOrg() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: orgs, error } = await supabase
        .from('manmec_organizations')
        .select('id, name, client_notification_email')

    if (error) {
        console.error('❌ Error:', error.message)
        return
    }

    console.log('🏢 Organizaciones registradas:')
    orgs.forEach(o => {
        console.log(`- ${o.name} (ID: ${o.id}) -> Email: ${o.client_notification_email || 'SIN CONFIGURAR'}`)
    })

    if (orgs.length > 0) {
        const target = orgs[0];
        console.log(`\n🔧 Actualizando ${target.name} a bodega@manmec.cl...`)
        const { error: updateError } = await supabase
            .from('manmec_organizations')
            .update({ client_notification_email: 'bodega@manmec.cl' })
            .eq('id', target.id)

        if (updateError) console.error('❌ Error update:', updateError.message)
        else console.log('✅ Actualización exitosa.')
    }
}

checkOrg()
