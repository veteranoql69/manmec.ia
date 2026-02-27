"use client";

import { useState } from "react";
import { OrganizationSettings, updateOrganizationSettings } from "@/app/dashboard/settings/actions";
import { Mail, Save, Shield, Settings2, CheckCircle2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

export function SettingsForm({ initialData }: { initialData: OrganizationSettings }) {
    const [email, setEmail] = useState(initialData.client_notification_email || "");
    const [isSaving, setIsSaving] = useState(false);
    const [message, setMessage] = useState<{ type: 'success' | 'error', text: string } | null>(null);

    const handleSave = async () => {
        setIsSaving(true);
        setMessage(null);
        try {
            await updateOrganizationSettings({ client_notification_email: email });
            setMessage({ type: 'success', text: 'Configuración actualizada correctamente.' });

            // Limpiar mensaje después de 3 segundos
            setTimeout(() => setMessage(null), 3000);
        } catch (error) {
            setMessage({ type: 'error', text: 'Error al actualizar la configuración.' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-10">
            {/* Header Seccion Dashboard Interno */}
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                        Configuración <span className="text-emerald-500">SaaS</span>
                    </h2>
                    <p className="text-slate-400 font-medium text-sm mt-1">Gestión de parámetros operacionales de la compañía.</p>
                </div>
                <div className="hidden md:flex items-center gap-2 px-4 py-2 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500">
                    <Shield className="w-3 h-3" /> Solo Administradores
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {/* Lateral Informativo */}
                <div className="space-y-4">
                    <div className="p-6 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20">
                        <Settings2 className="w-8 h-8 text-emerald-500 mb-3" />
                        <h3 className="text-lg font-bold text-white uppercase tracking-tight">Entorno Operativo</h3>
                        <p className="text-sm text-slate-400 leading-relaxed mt-2">
                            Estas configuraciones impactan el comportamiento de la IA y los disparadores automáticos de procesos.
                        </p>
                    </div>
                </div>

                {/* Formulario Principal */}
                <div className="md:col-span-2 space-y-6">
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 md:p-10 space-y-8 relative overflow-hidden">
                        {/* Notificaciones del Mandante */}
                        <div className="space-y-6">
                            <div className="flex items-start gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-500/20 flex items-center justify-center shrink-0">
                                    <Mail className="w-6 h-6 text-blue-400" />
                                </div>
                                <div className="space-y-1">
                                    <label className="text-sm font-black text-white uppercase tracking-widest">
                                        Email Notificaciones Mandante
                                    </label>
                                    <p className="text-xs text-slate-500 font-medium">
                                        Dirección donde el mandante principal (ej. Copec, Enex) envía notificaciones automáticas.
                                    </p>
                                </div>
                            </div>

                            <div className="relative group">
                                <input
                                    type="email"
                                    value={email}
                                    onChange={(e) => setEmail(e.target.value)}
                                    placeholder="ej: bodega@manmec.cl"
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-6 py-4 text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500/50 focus:border-emerald-500/50 transition-all placeholder:text-slate-700"
                                />
                                <AnimatePresence>
                                    {message && (
                                        <motion.div
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0 }}
                                            className={`absolute -bottom-10 left-0 flex items-center gap-2 text-xs font-bold uppercase tracking-wider ${message.type === 'success' ? 'text-emerald-500' : 'text-rose-500'}`}
                                        >
                                            {message.type === 'success' && <CheckCircle2 className="w-4 h-4" />}
                                            {message.text}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <p className="text-[11px] text-amber-500/80 font-bold leading-relaxed uppercase tracking-tighter italic">
                                    Aviso: Cambiar este correo afectará el trigger de recepción de correos en tiempo real para la IA de bodega.
                                </p>
                            </div>
                        </div>

                        {/* Botón de Guardado */}
                        <div className="pt-4 border-t border-white/5 flex justify-end">
                            <button
                                onClick={handleSave}
                                disabled={isSaving}
                                className={`
                                    relative flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all
                                    ${isSaving
                                        ? 'bg-slate-800 text-slate-500 cursor-not-allowed'
                                        : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20 active:scale-95'
                                    }
                                `}
                            >
                                {isSaving ? "Procesando..." : <><Save className="w-4 h-4" /> Guardar Cambios</>}
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
