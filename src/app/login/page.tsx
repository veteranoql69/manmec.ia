import type { Metadata } from "next";
import { Suspense } from "react";
import { LoginButton } from "@/components/auth/LoginButton";
import { CodeExchanger } from "@/components/auth/CodeExchanger";
import Image from "next/image";

export const metadata: Metadata = {
    title: "Ingresar — Manmec IA",
    description: "Gestión inteligente de mantenimiento de estaciones de servicio",
};

export default function LoginPage() {
    return (
        <main className="relative min-h-screen flex items-center justify-center p-4 sm:p-8 overflow-hidden bg-slate-950">
            {/* Fondo con imagen premium generada */}
            <div className="absolute inset-0 z-0">
                <Image
                    src="/bg-login.png"
                    alt="Manmec IA Background"
                    fill
                    priority
                    className="object-cover object-center opacity-80"
                    quality={100}
                />
                {/* Overlay oscuro y radial para legibilidad perfecta */}
                <div className="absolute inset-0 bg-gradient-to-tr from-slate-950/90 via-slate-900/70 to-blue-950/80" />
                <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]" />
            </div>

            {/* Elementos decorativos animados sutiles */}
            <div className="absolute inset-0 z-0 overflow-hidden pointer-events-none">
                <div className="absolute top-[-20%] left-[-10%] w-[60%] h-[60%] bg-blue-600/10 rounded-full blur-[120px] animate-pulse" />
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] bg-indigo-500/10 rounded-full blur-[120px] animate-pulse" style={{ animationDelay: '2s' }} />
            </div>

            {/* Card principal Glassmorphism (Premium) */}
            <div className="relative z-10 w-full max-w-md">
                <div className="bg-white/[0.03] backdrop-blur-2xl border border-white/10 rounded-3xl p-8 sm:p-10 shadow-2xl transition-all duration-700 hover:border-white/20 hover:shadow-blue-500/10 hover:bg-white/[0.04]">

                    {/* Logo + nombre */}
                    <div className="flex flex-col items-center mb-8">
                        <div className="relative flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-2xl shadow-[0_0_30px_rgba(59,130,246,0.3)] mb-6 overflow-hidden">
                            <div className="absolute inset-0 bg-white/20 backdrop-blur-sm" />
                            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="relative z-10">
                                <path d="M12 2L2 7l10 5 10-5-10-5z" fill="white" fillOpacity="1" />
                                <path d="M2 17l10 5 10-5" stroke="white" strokeWidth="2" strokeOpacity="0.8" strokeLinecap="round" strokeLinejoin="round" />
                                <path d="M2 12l10 5 10-5" stroke="white" strokeWidth="2" strokeOpacity="0.9" strokeLinecap="round" strokeLinejoin="round" />
                            </svg>
                        </div>
                        <h1 className="text-3xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-white to-slate-400 tracking-tight">Manmec IA</h1>
                        <p className="text-blue-400 font-medium text-xs mt-2 tracking-[0.2em] uppercase">Inteligencia Operativa</p>
                    </div>

                    <div className="w-full h-px bg-gradient-to-r from-transparent via-white/10 to-transparent mb-8" />

                    <div className="mb-8 text-center">
                        <h2 className="text-lg font-medium text-white mb-2">Acceso al Sistema Central</h2>
                        <p className="text-slate-400 text-sm leading-relaxed">
                            Autenticación segura para gestión de mantenimiento y flujos de inventario.
                        </p>
                    </div>

                    <div className="relative group">
                        <div className="absolute -inset-0.5 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-lg blur opacity-30 group-hover:opacity-60 transition duration-500"></div>
                        <div className="relative">
                            <LoginButton label="Acceder con Google Workspace" />
                        </div>
                    </div>

                    <Suspense fallback={<div className="h-4"></div>}>
                        <CodeExchanger />
                    </Suspense>

                    <p className="text-center text-xs text-slate-500 mt-8 leading-relaxed font-medium">
                        Plataforma de uso exclusivo corporativo.
                        <br />
                        <span className="opacity-70">¿Requiere asistencia técnica?</span>{" "}
                        <a href="mailto:soporte@manmec.cl" className="text-blue-400 hover:text-blue-300 transition-colors pointer-events-auto">
                            Contactar a TI
                        </a>
                    </p>
                </div>
                <div className="text-center mt-6">
                    <p className="text-[10px] text-slate-600 font-mono tracking-widest uppercase opacity-80">
                        Manmec Core v1.0.0 · Secure Identity Module
                    </p>
                </div>
            </div>
        </main>
    );
}
