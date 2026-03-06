import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { AiSettingsForm } from "./AiSettingsForm";

export default async function AiSettingsPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("manmec_users")
        .select("role, organization_id")
        .eq("id", user.id)
        .single();

    if (!profile || (profile.role !== "MANAGER" && profile.role !== "COMPANY_ADMIN")) {
        return (
            <div className="p-8">
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl p-4 text-red-400">
                    No tienes permisos para acceder a esta sección.
                </div>
            </div>
        );
    }

    const { data: org } = await supabase
        .from("manmec_organizations")
        .select("ai_settings")
        .eq("id", profile.organization_id)
        .single();

    const currentSettings = (org?.ai_settings as Record<string, unknown>) || {};

    return (
        <div className="max-w-4xl mx-auto py-8 px-4 sm:px-6 lg:px-8">
            <div className="mb-8">
                <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-3">
                    <span className="text-3xl">🤖</span> Configuración del Asistente IA
                </h1>
                <p className="mt-2 text-sm text-slate-400">
                    Personaliza la identidad, el tono y el comportamiento del agente de Inteligencia Artificial que atiende a tu equipo en terreno vía Telegram y Web.
                </p>
            </div>

            <div className="bg-slate-900 overflow-hidden shadow-xl sm:rounded-2xl border border-white/5">
                <div className="p-6 sm:p-8">
                    <AiSettingsForm initialSettings={currentSettings} orgId={profile.organization_id} />
                </div>
            </div>
        </div>
    );
}
