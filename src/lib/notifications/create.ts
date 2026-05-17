import { createAdminClient } from "@/lib/supabase/admin";

export type NotifType = "stock_deduction" | "shipment_received" | "transfer_initiated" | "low_stock";

export type ManmecUserRole = "COMPANY_ADMIN" | "MANAGER" | "SUPERVISOR" | "MECHANIC";

interface CreateNotificationParams {
    organization_id: string;
    type: NotifType;
    title: string;
    body: string;
    payload?: Record<string, unknown>;
    // Roles que recibirán la notificación. Default: todos excepto MECHANIC.
    target_roles?: ManmecUserRole[];
    // IDs adicionales específicos (ej: el mecánico que hizo la acción)
    extra_user_ids?: string[];
}

/**
 * Inserta una notificación en manmec_notifications para cada usuario
 * del org que coincida con los roles indicados.
 * Silencia errores para no interrumpir el flujo principal.
 */
export async function createOrgNotification(params: CreateNotificationParams): Promise<void> {
    try {
        const supabase = createAdminClient();
        const roles = params.target_roles ?? ["COMPANY_ADMIN", "MANAGER", "SUPERVISOR"];

        const { data: users } = await supabase
            .from("manmec_users")
            .select("id")
            .eq("organization_id", params.organization_id)
            .eq("is_active", true)
            .in("role", roles);

        const userIds = new Set<string>([
            ...(users?.map((u: { id: string }) => u.id) ?? []),
            ...(params.extra_user_ids ?? []),
        ]);

        if (userIds.size === 0) return;

        const rows = Array.from(userIds).map(user_id => ({
            organization_id: params.organization_id,
            user_id,
            type: params.type,
            title: params.title,
            body: params.body,
            payload: params.payload ?? null,
        }));

        const { error } = await supabase.from("manmec_notifications").insert(rows);
        if (error) console.error("[createOrgNotification] Insert error:", error.message);
    } catch (err) {
        console.error("[createOrgNotification] Unexpected error:", err);
    }
}
