"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Plus,
    ClipboardList,
    ChevronRight,
    MapPin,
    Truck,
    Calendar,
    Clock,
    AlertCircle
} from "lucide-react";
import { WorkOrder } from "@/app/dashboard/ots/actions";
import Link from "next/link";

interface Props {
    initialOts: WorkOrder[];
}

export function OTListClient({ initialOts }: Props) {
    const [ots, setOts] = useState<WorkOrder[]>(initialOts);
    const [search, setSearch] = useState("");

    const filteredOts = useMemo(() => {
        return ots.filter(ot =>
            ot.code?.toLowerCase().includes(search.toLowerCase()) ||
            ot.title.toLowerCase().includes(search.toLowerCase()) ||
            ot.station?.name.toLowerCase().includes(search.toLowerCase())
        );
    }, [ots, search]);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar por código, título o estación..."
                        className="w-full bg-black/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-900/20 active:scale-95 text-sm cursor-not-allowed opacity-50"
                    disabled
                >
                    <Plus className="w-4 h-4" />
                    Nueva OT (Draft)
                </button>
            </div>

            <div className="space-y-4">
                <AnimatePresence mode="popLayout">
                    {filteredOts.map((ot, i) => (
                        <Link key={ot.id} href={`/dashboard/ots/${ot.id}`}>
                            <motion.div
                                layout
                                initial={{ opacity: 0, x: -20 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="bg-white/5 border border-white/10 p-5 rounded-[2rem] backdrop-blur-md group hover:bg-white/10 transition-all flex flex-col md:flex-row items-center gap-6 relative overflow-hidden mb-4"
                            >
                                {/* Priority Indicator */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${ot.priority === 'P1' ? 'bg-red-500' :
                                        ot.priority === 'P2' ? 'bg-amber-500' : 'bg-blue-500'
                                    }`} />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="text-[10px] font-black uppercase bg-white/10 px-2 py-0.5 rounded text-slate-400 font-mono">
                                            {ot.code || "PENDIENTE"}
                                        </span>
                                        <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded ${ot.priority === 'P1' ? 'bg-red-500/10 text-red-500' :
                                                ot.priority === 'P2' ? 'bg-amber-500/10 text-amber-500' : 'bg-blue-500/10 text-blue-500'
                                            }`}>
                                            {ot.priority}
                                        </span>
                                    </div>
                                    <h3 className="text-xl font-bold text-white truncate group-hover:text-blue-400 transition-colors uppercase italic tracking-tight">
                                        {ot.title}
                                    </h3>
                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2 mt-3 text-xs text-slate-400 font-medium">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-slate-500" />
                                            <span className="truncate">{ot.station?.name || "Sin estación"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Truck className="w-4 h-4 text-slate-500" />
                                            <span>{ot.vehicle?.plate || "Sin vehículo"}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-4 h-4 text-slate-500" />
                                            <span>{new Date(ot.created_at).toLocaleDateString()}</span>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center gap-8">
                                    <div className="text-right hidden sm:block">
                                        <p className="text-[10px] uppercase font-bold text-slate-600 tracking-widest mb-1">Estado</p>
                                        <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase ${ot.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                ot.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500 border border-blue-500/20' :
                                                    'bg-white/5 text-slate-400 border border-white/10'
                                            }`}>
                                            {ot.status}
                                        </span>
                                    </div>
                                    <ChevronRight className="w-6 h-6 text-slate-700 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
                                </div>
                            </motion.div>
                        </Link>
                    ))}
                </AnimatePresence>
            </div>

            {filteredOts.length === 0 && (
                <div className="py-20 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                    <ClipboardList className="w-16 h-16 mx-auto mb-4 text-slate-700 opacity-20" />
                    <h3 className="text-xl font-bold text-slate-500">No se encontraron órdenes de trabajo</h3>
                    <p className="text-slate-600 text-sm mt-1">Intenta con otra búsqueda o espera a que lleguen requerimientos.</p>
                </div>
            )}
        </div>
    );
}
