"use client";

import { motion } from "framer-motion";
import {
    Wrench,
    ClipboardList,
    Package,
    ArrowRight,
    CheckCircle2,
    AlertCircle,
    ScanLine,
    Mic
} from "lucide-react";
import type { ManmecUserProfile } from "@/lib/auth";

interface Props {
    profile: ManmecUserProfile;
}

export function MechanicDashboardClient({ profile }: Props) {
    // Datos simulados por ahora (luego vendrán de Supabase Realtime/Prisma)
    const activeOTs = [
        { id: "OT-2026-0001", title: "Cambio de Bujías - Camión Ford", priority: "P2", status: "IN_PROGRESS" },
        { id: "OT-2026-0005", title: "Revisión Sistema Eléctrico", priority: "P1", status: "PENDING" },
    ];

    const inventoryAlerts = [
        { item: "Filtro de Aire - King", qty: 2, status: "critical" },
    ];

    return (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">

            {/* Columna Principal: OTs Asignadas */}
            <div className="md:col-span-2 space-y-6">
                <section>
                    <div className="flex items-center justify-between mb-4">
                        <h2 className="text-xl font-semibold flex items-center gap-2">
                            <ClipboardList className="text-blue-400" />
                            Mis OTs del Día
                        </h2>
                        <button className="text-sm text-blue-400 hover:text-blue-300 transition-colors">
                            Ver historial
                        </button>
                    </div>

                    <div className="space-y-4">
                        {activeOTs.map((ot) => (
                            <motion.div
                                key={ot.id}
                                whileHover={{ scale: 1.01 }}
                                className="group relative bg-white/5 border border-white/10 p-5 rounded-2xl backdrop-blur-sm hover:bg-white/10 transition-all cursor-pointer overflow-hidden"
                            >
                                {/* Priority Indicator */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1 ${ot.priority === 'P1' ? 'bg-red-500' : 'bg-blue-500'
                                    }`} />

                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <div className="flex items-center gap-3">
                                            <span className="text-xs font-mono text-slate-500">{ot.id}</span>
                                            {ot.priority === 'P1' && (
                                                <span className="bg-red-500/20 text-red-400 text-[10px] font-bold px-2 py-0.5 rounded-full border border-red-500/30 uppercase tracking-wider">
                                                    Urgente
                                                </span>
                                            )}
                                        </div>
                                        <h3 className="text-lg font-medium group-hover:text-white transition-colors">
                                            {ot.title}
                                        </h3>
                                    </div>
                                    <ArrowRight className="text-slate-600 group-hover:text-blue-400 transition-all transform group-hover:translate-x-1" />
                                </div>

                                <div className="mt-4 flex items-center justify-between text-sm">
                                    <div className="flex items-center gap-2 text-slate-400 uppercase text-xs tracking-widest">
                                        <div className={`w-2 h-2 rounded-full ${ot.status === 'IN_PROGRESS' ? 'bg-blue-400 animate-pulse' : 'bg-slate-600'}`} />
                                        {ot.status.replace('_', ' ')}
                                    </div>
                                    <div className="text-slate-500">Local de Servicio #4</div>
                                </div>
                            </motion.div>
                        ))}
                    </div>
                </section>

                {/* Accesos Rápidos (Mobile FAB simulation) */}
                <div className="grid grid-cols-2 gap-4">
                    <button className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-blue-500/20 to-indigo-500/10 border border-blue-500/20 rounded-2xl hover:bg-blue-500/30 transition-all group">
                        <ScanLine className="w-8 h-8 text-blue-400 mb-2 transform group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Escanear Repuesto</span>
                    </button>
                    <button className="flex flex-col items-center justify-center p-6 bg-gradient-to-br from-purple-500/20 to-pink-500/10 border border-purple-500/20 rounded-2xl hover:bg-purple-500/30 transition-all group">
                        <Mic className="w-8 h-8 text-purple-400 mb-2 transform group-hover:scale-110 transition-transform" />
                        <span className="font-medium">Dictar OT</span>
                    </button>
                </div>
            </div>

            {/* Sidebar: Inventario Local */}
            <div className="space-y-6">
                <section className="bg-white/5 border border-white/10 rounded-2xl p-6 backdrop-blur-sm">
                    <h2 className="text-lg font-semibold flex items-center gap-2 mb-6">
                        <Package className="text-orange-400" />
                        Mi Stock (Furgón)
                    </h2>

                    <div className="space-y-5">
                        <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                                <span className="text-slate-400">Total ítems</span>
                                <span className="font-mono">42</span>
                            </div>
                            <div className="w-full h-1.5 bg-slate-800 rounded-full overflow-hidden">
                                <div className="w-3/4 h-full bg-orange-500 rounded-full" />
                            </div>
                        </div>

                        <div className="pt-4 border-t border-white/5 space-y-4">
                            {inventoryAlerts.map((alert, i) => (
                                <div key={i} className="flex items-start gap-3 bg-red-500/5 border border-red-500/10 p-3 rounded-xl">
                                    <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />
                                    <div>
                                        <p className="text-sm font-medium text-red-200">{alert.item}</p>
                                        <p className="text-xs text-red-400/70">Stock Crítico: {alert.qty} unidades</p>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>

                    <button className="w-full mt-6 py-3 bg-white/5 hover:bg-white/10 border border-white/10 rounded-xl transition-all text-sm font-medium">
                        Ver inventario completo
                    </button>
                </section>

                <section className="bg-gradient-to-br from-indigo-500/10 to-blue-500/5 border border-indigo-500/20 rounded-2xl p-6">
                    <h2 className="font-semibold mb-2 flex items-center gap-2">
                        <Wrench className="w-4 h-4 text-indigo-400" />
                        Próximo mantenimiento
                    </h2>
                    <p className="text-sm text-slate-400 mb-4">
                        Tu vehículo (Patente: AB-CD-12) requiere revisión en 450 km.
                    </p>
                    <div className="h-2 bg-slate-800 rounded-full">
                        <div className="w-[85%] h-full bg-indigo-500 rounded-full" />
                    </div>
                </section>
            </div>

        </div>
    );
}
