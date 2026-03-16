"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export interface IaAutomationLog {
    id: string;
    organization_id: string;
    external_id: string | null;
    type: string;
    status: 'SUCCESS' | 'ERROR' | 'WARNING';
    raw_payload: any;
    ai_response: any;
    error_message: string | null;
    created_at: string;
}

/**
 * Obtiene los logs de automatización de la organización
 */
export async function getIaAutomationLogs(limit = 50): Promise<{ logs: IaAutomationLog[], error: string | null }> {
    try {
        const profile = await requireRole("MANAGER");
        const supabase = await createClient();

        const { data, error } = await supabase
            .from("manmec_ia_automation_logs")
            .select("*")
            .eq("organization_id", profile.organization_id)
            .order("created_at", { ascending: false })
            .limit(limit);

        if (error) {
            // Si el error es 42P01 es que la tabla no existe aún (usuario no corrió el SQL)
            if (error.code === '42P01') {
                console.warn("⚠️ [IA Logs] La tabla 'manmec_ia_automation_logs' no existe.");
                return { logs: [], error: 'TABLE_MISSING' };
            }
            console.error("Error fetching AI logs:", error);
            return { logs: [], error: error.message };
        }

        return { logs: data as IaAutomationLog[], error: null };
    } catch (err: any) {
        console.error("Critical error in getIaAutomationLogs:", err);
        return { logs: [], error: err.message };
    }
}
