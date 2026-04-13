import { requireRole } from "@/lib/auth";
import { AlertsConfigClient } from "@/components/dashboard/AlertsConfigClient";
import { createClient } from "@/lib/supabase/server";

export const metadata = {
    title: "Alertas Proactivas | Manmec IA",
    description: "Configuración del motor de alertas proactivas vía Telegram.",
};

async function getAlertsConfig() {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return null;

    const { data: profile } = await supabase
        .from("manmec_users")
        .select("organization_id")
        .eq("auth_user_id", user.id)
        .single();

    if (!profile) return null;

    const { data: org } = await supabase
        .from("manmec_organizations")
        .select("id, name, settings, timezone")
        .eq("id", profile.organization_id)
        .single();

    return org;
}

export default async function AlertsConfigPage() {
    await requireRole("MANAGER");
    const org = await getAlertsConfig();

    return (
        <div className="p-4 md:p-8">
            <AlertsConfigClient org={org} />
        </div>
    );
}
