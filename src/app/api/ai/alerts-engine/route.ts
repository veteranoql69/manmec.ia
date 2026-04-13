import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { runAlertsEngineForOrg } from "@/lib/alerts/engine";

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
    try {
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: "Unauthorized access" }, { status: 401 });
        }

        const supabase = createAdminClient();

        // 1. Obtiene las organizaciones activas
        const { data: orgs, error } = await supabase
            .from('manmec_organizations')
            .select('id, settings')
            .is('deleted_at', null);

        if (error || !orgs) {
            console.error('[ALERTS CRON] Database query failed', error);
            return NextResponse.json({ error: "Failed to fetch active tenants" }, { status: 500 });
        }

        console.log(`[DEBUG] Encontramos ${orgs.length} organizaciones totales en la base de datos.`);

        // 2. Filtra organizaciones que optaron por este sistema
        const validOrgs = orgs.filter(org => {
            const settings = org.settings as any;
            console.log(`[DEBUG] Org ${org.id} settings:`, JSON.stringify(settings));
            return settings?.alert_rules?.telegram_enabled === true;
        });

        console.log(`[ALERTS CRON] Firing engine for ${validOrgs.length} active tenants...`);

        // 3. Ejecuta el Engine aislada y paraleltizada 
        // Promise.allSettled previene que si una org arroja excepción, tire abajo a las otras.
        const results = await Promise.allSettled(
            validOrgs.map(async (org) => {
                await runAlertsEngineForOrg(org.id, org.settings);
            })
        );

        const summary = results.map((r, i) => ({
            orgId: validOrgs[i].id,
            status: r.status,
            error: r.status === 'rejected' ? String(r.reason) : null
        }));

        return NextResponse.json({ 
            ok: true, 
            message: `Processed ${validOrgs.length} organizations`,
            summary 
        });

    } catch (e: any) {
        console.error('[ALERTS CRON] Fatal Error', e);
        return NextResponse.json({ error: "Internal Error", details: e?.message }, { status: 500 });
    }
}

// -----------------------------------------------------
// Facilidad para depuración local (solo en desarrollo)
export async function GET(req: NextRequest) {
    if (process.env.NODE_ENV !== 'development') {
        return NextResponse.json({ error: "Method not allowed in production" }, { status: 405 });
    }
    
    // Autoinyectamos el token en DEV para probar fácilmente desde el navegador
    req.headers.set('authorization', `Bearer ${process.env.CRON_SECRET}`);
    return POST(req);
}
