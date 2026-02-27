"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type OrganizationSettings = {
    id: string;
    name: string;
    client_notification_email: string | null;
    settings: any;
};

/**
 * Obtiene la configuración de la organización del usuario actual
 */
export async function getOrganizationSettings() {
    const profile = await requireRole("MANAGER"); // Mínimo MANAGER para ver
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("manmec_organizations")
        .select("id, name, client_notification_email, settings")
        .eq("id", profile.organization_id)
        .single();

    if (error) {
        console.error("Error fetching org settings:", error);
        throw error;
    }

    return data as OrganizationSettings;
}

/**
 * Actualiza la configuración de la organización
 */
export async function updateOrganizationSettings(data: Partial<OrganizationSettings>) {
    const profile = await requireRole("COMPANY_ADMIN"); // Solo ADMIN puede editar
    const supabase = await createClient();

    const { error } = await supabase
        .from("manmec_organizations")
        .update({
            client_notification_email: data.client_notification_email,
            settings: data.settings,
            updated_at: new Date().toISOString(),
        })
        .eq("id", profile.organization_id);

    if (error) {
        console.error("Error updating org settings:", error);
        throw error;
    }

    revalidatePath("/dashboard/settings");
    return { success: true };
}
