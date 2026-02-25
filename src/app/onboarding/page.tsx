import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { OnboardingForm } from "./OnboardingForm";

export const metadata: Metadata = {
    title: "Configura tu empresa — Manmec IA",
    description: "Configura tu empresa para comenzar a usar Manmec IA",
};

export default async function OnboardingPage() {
    const supabase = await createClient();

    // Verificar sesión activa
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    // Si ya completó onboarding, ir al dashboard
    const { data: profile } = await supabase
        .from("manmec_users")
        .select("onboarding_status, organization_id")
        .eq("id", user.id)
        .single();

    if (profile?.onboarding_status === "complete") redirect("/dashboard");

    // Extraer datos de Google para pre-rellenar el formulario
    const meta = user.user_metadata as Record<string, unknown>;
    const hostedDomain = (meta?.hd as string) || null;   // Google Workspace domain
    const userName = (meta?.full_name as string) || (meta?.name as string) || "";

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            {/* Fondo decorativo */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-md">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

                    {/* Header */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-14 h-14 bg-violet-600 rounded-2xl shadow-lg shadow-violet-600/30 mb-4">
                            <svg width="28" height="28" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M9 22V12h6v10" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h1 className="text-xl font-bold text-white">
                            ¡Hola{userName ? `, ${userName.split(" ")[0]}` : ""}! 👋
                        </h1>
                        <p className="text-slate-400 text-sm mt-2 leading-relaxed">
                            {hostedDomain
                                ? `Detectamos tu empresa en @${hostedDomain}. Confirma los datos para continuar.`
                                : "Antes de comenzar, cuéntanos un poco sobre tu empresa."
                            }
                        </p>
                    </div>

                    {/* Formulario */}
                    <OnboardingForm
                        prefilledDomain={hostedDomain}
                    />
                </div>
            </div>
        </main>
    );
}
