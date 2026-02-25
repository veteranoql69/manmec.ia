import type { Metadata } from "next";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

export const metadata: Metadata = {
    title: "Acceso pendiente — Manmec IA",
    description: "Tu acceso está siendo configurado por tu empresa",
};

export default async function PendingPage() {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) redirect("/login");

    const { data: profile } = await supabase
        .from("manmec_users")
        .select("full_name, onboarding_status, organization_id, role")
        .eq("id", user.id)
        .single();

    // Si ya tiene todo listo, mandar al dashboard
    if (profile?.onboarding_status === "complete" && profile?.role && profile?.organization_id) {
        redirect("/dashboard");
    }

    // Si no completó onboarding, mandar a onboarding
    if (!profile || profile.onboarding_status === "pending") {
        redirect("/onboarding");
    }

    const firstName = profile?.full_name?.split(" ")[0] || "usuario";

    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-amber-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-orange-500/10 rounded-full blur-3xl" />
            </div>

            <div className="relative w-full max-w-sm">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl text-center">

                    {/* Icono de espera */}
                    <div className="inline-flex items-center justify-center w-16 h-16 bg-amber-600/20 border border-amber-500/20 rounded-2xl mb-6">
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <circle cx="12" cy="12" r="10" stroke="#F59E0B" strokeWidth="2" />
                            <path d="M12 6v6l4 2" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                        </svg>
                    </div>

                    <h1 className="text-xl font-bold text-white mb-2">
                        Acceso pendiente, {firstName}
                    </h1>

                    <p className="text-slate-400 text-sm leading-relaxed mb-6">
                        Tu cuenta fue registrada correctamente, pero aún no tienes un rol asignado en el sistema.
                    </p>

                    {/* Pasos para el usuario */}
                    <div className="bg-white/5 rounded-xl p-4 text-left mb-6 space-y-3">
                        <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-3">
                            ¿Qué hacer ahora?
                        </p>
                        <div className="flex gap-3">
                            <span className="flex-shrink-0 w-5 h-5 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 text-xs font-bold">1</span>
                            <p className="text-sm text-slate-300">
                                Contacta a tu supervisor o al administrador de la empresa
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <span className="flex-shrink-0 w-5 h-5 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 text-xs font-bold">2</span>
                            <p className="text-sm text-slate-300">
                                Pídeles que te asignen el rol correspondiente en Manmec IA
                            </p>
                        </div>
                        <div className="flex gap-3">
                            <span className="flex-shrink-0 w-5 h-5 bg-amber-500/20 rounded-full flex items-center justify-center text-amber-400 text-xs font-bold">3</span>
                            <p className="text-sm text-slate-300">
                                Una vez asignado, recarga esta página para ingresar
                            </p>
                        </div>
                    </div>

                    {/* Botón de recargar */}
                    <form action="/pending" method="get">
                        <button
                            id="btn-refresh-pending"
                            type="submit"
                            className="
                w-full flex items-center justify-center gap-2
                bg-white/5 hover:bg-white/10 border border-white/10
                text-white text-sm font-medium
                rounded-xl px-6 py-3
                transition-all duration-200
              "
                        >
                            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <path d="M1 4v6h6M23 20v-6h-6" />
                                <path d="M20.49 9A9 9 0 005.64 5.64L1 10M23 14l-4.64 4.36A9 9 0 013.51 15" />
                            </svg>
                            Verificar acceso
                        </button>
                    </form>

                    {/* Correo del soporte */}
                    <p className="text-xs text-slate-600 mt-4">
                        Correo:{" "}
                        <a href={`mailto:${user.email}`} className="text-slate-500">
                            {user.email}
                        </a>
                    </p>
                </div>
            </div>
        </main>
    );
}
