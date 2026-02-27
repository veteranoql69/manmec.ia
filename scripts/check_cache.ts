import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
dotenv.config({ path: '.env.local' })

async function verifySchema() {
    const supabase = createClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!
    )

    console.log('🔍 Verificando columnas en manmec_shipments...')

    const { data, error } = await supabase.rpc('inspect_table_columns', {
        t_name: 'manmec_shipments'
    }).catch(() => ({ data: null, error: 'RPC not found' }))

    // Si no hay RPC, usamos una query directa a information_schema
    const { data: cols, error: colError } = await supabase
        .from('manmec_organizations') // Usamos cualquier tabla para el select inicial si no tenemos rpc
        .select('*')
        .limit(0)

    // Alternativa: Query directa vía SQL si pudiéramos, pero aquí usaremos information_schema vía rpc o rest si está expuesto.
    // Como no podemos correr SQL arbitrario vía JS SDK sin RPC, intentaremos insertar un dummy.

    const { error: testError } = await supabase
        .from('manmec_shipments')
        .select('external_id, order_number')
        .limit(1)

    if (testError) {
        console.error('❌ Error detectado:', testError.message)
        if (testError.message.includes('column') || testError.message.includes('cache')) {
            console.log('💡 El cache de PostgREST está desactualizado.')
        }
    } else {
        console.log('✅ Columnas detectadas correctamente por el SDK.')
    }
}

verifySchema()
