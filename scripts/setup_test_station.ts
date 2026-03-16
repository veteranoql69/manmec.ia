import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function setupStation() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    const { data: stations } = await supabase
        .from('manmec_service_stations')
        .select('id, name')
        .limit(1)

    if (!stations || stations.length === 0) {
        console.error('❌ No hay estaciones para actualizar.')
        return
    }

    const station = stations[0]
    console.log(`🔧 Asignando código 20017 a la estación: ${station.name}...`)

    const { error } = await supabase
        .from('manmec_service_stations')
        .update({ sap_store_code: '20017' })
        .eq('id', station.id)

    if (error) console.error('❌ Error updating station:', error.message)
    else console.log('✅ Estación lista para el test.')
}

setupStation()
