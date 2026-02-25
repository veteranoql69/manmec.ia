import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginButton } from "@/components/auth/LoginButton";
import { CodeExchanger } from "@/components/auth/CodeExchanger";

export const metadata: Metadata = {
    title: "Ingresar — Manmec IA",
    description: "Gestión inteligente de mantenimiento de estaciones de servicio",
};

export default function LoginPage() {
    return (
        <main className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex items-center justify-center p-4">
            {/* Fondo decorativo */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none">
                <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl" />
                <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-violet-500/10 rounded-full blur-3xl" />
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-blue-600/5 rounded-full blur-3xl" />
            </div>

            {/* Card principal */}
            <div className="relative w-full max-w-sm">
                <div className="bg-white/5 backdrop-blur-xl border border-white/10 rounded-2xl p-8 shadow-2xl">

                    {/* Logo + nombre */}
                    <div className="text-center mb-8">
                        <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-600 rounded-2xl shadow-lg shadow-blue-600/30 mb-4">
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" fillOpacity="0.9" />
                                <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2" strokeOpacity="0.7" strokeLinecap="round" />
                                <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeOpacity="0.85" strokeLinecap="round" />
                            </svg>
                        </div>
                        <h1 className="text-2xl font-bold text-white tracking-tight">Manmec IA</h1>
                        <p className="text-slate-400 text-sm mt-1">Gestión inteligente de mantenimiento</p>
                    </div>

                    <div className="border-t border-white/10 mb-8" />

                    <div className="mb-6">
                        <h2 className="text-base font-semibold text-white mb-1">Bienvenido de vuelta</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Ingresa con tu cuenta de trabajo de Google para acceder al sistema.
                        </p>
                    </div>

                    <LoginButton label="Ingresar con cuenta Google" />

                    {/*
            CodeExchanger se activa solo cuando GoTrue redirige a /login?code=...
            Necesita Suspense porque usa useSearchParams() (Client Component).
          */}
                    <Suspense fallback={null}>
                        <CodeExchanger />
                    </Suspense>

                    <p className="text-center text-xs text-slate-500 mt-6 leading-relaxed">
                        Si es tu primera vez, se te guiará para configurar tu empresa.
                        <br />
                        ¿Necesitas ayuda?{" "}
                        <a href="mailto:soporte@manmec.cl" className="text-blue-400 hover:text-blue-300 transition-colors">
                            Contáctanos
                        </a>
                    </p>
                </div>
                <p className="text-center text-xs text-slate-600 mt-4">
                    © 2026 Manmec IA · Todos los derechos reservados
                </p>
            </div>
        </main>
    );
}
