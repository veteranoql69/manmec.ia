"use client";

import { useState, useMemo } from "react";
import { motion } from "framer-motion";
import {
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Activity,
    Box,
    Users,
    Truck,
    TrendingDown,
    BrainCircuit,
    ArrowUpRight,
    Search,
    Plus
} from "lucide-react";
import type { ManmecUserProfile } from "@/lib/auth";
import { ChronologyTimeline } from "./ChronologyTimeline";

interface OpsItem {
    id: string;
    mechanicName: string;
    vehicle: string;
    ot: string;
    status: string;
    updatedAt: string;
}

interface Props {
    profile: ManmecUserProfile;
    stats: {
        activeOts: number;
        activeMechanics: number;
        criticalStock: number;
    };
    currentOps: OpsItem[];
    chronology: any[];
}

export function SupervisorDashboardClient({ profile, stats: realStats, currentOps, chronology }: Props) {
    const [search, setSearch] = useState("");
    const [sortKey, setSortKey] = useState<keyof OpsItem>("ot");
    const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

    const kpis = [
        { label: "OTs Activas", value: realStats.activeOts.toString(), icon: Activity, color: "text-blue-400", bg: "bg-blue-400/10" },
        { label: "Mecánicos en Ruta", value: realStats.activeMechanics.toString(), icon: Users, icon2: Truck, color: "text-emerald-400", bg: "bg-emerald-400/10" },
        { label: "Stock Crítico", value: realStats.criticalStock.toString().padStart(2, '0'), icon: TrendingDown, color: "text-red-400", bg: "bg-red-400/10" },
    ];

    const filteredAndSortedOps = useMemo(() => {
        let result = currentOps.filter(op =>
            op.mechanicName.toLowerCase().includes(search.toLowerCase()) ||
            op.ot.toLowerCase().includes(search.toLowerCase()) ||
            op.vehicle.toLowerCase().includes(search.toLowerCase())
        );

        result.sort((a, b) => {
            const valA = a[sortKey].toString();
            const valB = b[sortKey].toString();
            return sortOrder === "asc"
                ? valA.localeCompare(valB)
                : valB.localeCompare(valA);
        });

        return result;
    }, [currentOps, search, sortKey, sortOrder]);

    const handleSort = (key: keyof OpsItem) => {
        if (sortKey === key) {
            setSortOrder(sortOrder === "asc" ? "desc" : "asc");
        } else {
            setSortKey(key);
            setSortOrder("asc");
        }
    };

    const SortIcon = ({ colKey }: { colKey: keyof OpsItem }) => {
        if (sortKey !== colKey) return <ArrowUpDown className="w-3 h-3 text-slate-600" />;
        return sortOrder === "asc" ? <ArrowUp className="w-3 h-3 text-blue-400" /> : <ArrowDown className="w-3 h-3 text-blue-400" />;
    };

    return (
        <div className="space-y-8">
            {/* KPI Section */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
                {kpis.map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white/5 border border-white/10 p-6 rounded-2xl backdrop-blur-md relative overflow-hidden group hover:bg-white/10 transition-all font-outfit"
                    >
                        <div className="relative z-10 flex justify-between items-start">
                            <div>
                                <p className="text-slate-400 text-sm font-medium uppercase tracking-widest">{stat.label}</p>
                                <h3 className="text-4xl font-black mt-2 text-white">{stat.value}</h3>
                            </div>
                            <div className={`p-3 rounded-xl ${stat.bg} ${stat.color}`}>
                                <stat.icon className="w-6 h-6" />
                            </div>
                        </div>
                        <div className={`absolute -right-4 -bottom-4 w-24 h-24 rounded-full ${stat.bg} blur-3xl opacity-50 group-hover:opacity-100 transition-opacity`} />
                    </motion.div>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna Principal: Operación en Terreno */}
                <div className="lg:col-span-2 space-y-8">
                    <section className="bg-white/5 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-sm shadow-2xl">
                        <div className="p-6 border-b border-white/5 flex flex-col md:flex-row md:items-center justify-between gap-4">
                            <h2 className="text-xl font-bold">Terreno en Tiempo Real</h2>
                            <div className="flex gap-2">
                                <div className="relative">
                                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                                    <input
                                        type="text"
                                        value={search}
                                        onChange={(e) => setSearch(e.target.value)}
                                        placeholder="Filtrar por OT, Mecánico..."
                                        className="bg-black/40 border border-white/10 rounded-lg py-2 pl-9 pr-4 text-sm focus:outline-none focus:border-blue-500/50 transition-colors w-full md:w-64"
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto min-h-[300px]">
                            <table className="w-full text-left">
                                <thead className="bg-white/[0.02] text-slate-500 text-[10px] uppercase tracking-widest font-black">
                                    <tr>
                                        <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("mechanicName")}>
                                            <div className="flex items-center gap-2">Mecánico <SortIcon colKey="mechanicName" /></div>
                                        </th>
                                        <th className="px-6 py-4">Vehículo</th>
                                        <th className="px-6 py-4 cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("ot")}>
                                            <div className="flex items-center gap-2">OT Asignada <SortIcon colKey="ot" /></div>
                                        </th>
                                        <th className="px-6 py-4 text-right cursor-pointer hover:text-white transition-colors" onClick={() => handleSort("status")}>
                                            <div className="flex items-center gap-2 justify-end">Estado <SortIcon colKey="status" /></div>
                                        </th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {filteredAndSortedOps.map((op, i) => (
                                        <tr key={i} className="hover:bg-white/[0.02] transition-colors group">
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-3">
                                                    <div className="w-8 h-8 rounded-full bg-blue-500/20 border border-blue-500/20 flex items-center justify-center text-[10px] font-black text-blue-400">
                                                        {op.mechanicName.charAt(0)}
                                                    </div>
                                                    <span className="font-bold text-slate-200">{op.mechanicName}</span>
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 font-mono text-xs text-slate-400">{op.vehicle}</td>
                                            <td className="px-6 py-4">
                                                <div className="flex items-center gap-2 group-hover:text-blue-400 transition-colors">
                                                    <span className="text-sm font-mono font-bold tracking-tighter">{op.ot}</span>
                                                    <ArrowUpRight className="w-3 h-3 opacity-0 group-hover:opacity-100 transition-all transition-transform group-hover:-translate-y-0.5" />
                                                </div>
                                            </td>
                                            <td className="px-6 py-4 text-right">
                                                <span className={`px-2 py-0.5 rounded-md border text-[9px] font-black uppercase tracking-wider ${op.status === "WORKING" ? "bg-emerald-500/10 border-emerald-500/20 text-emerald-400" :
                                                    op.status === "TRANSIT" ? "bg-blue-500/10 border-blue-500/20 text-blue-400" :
                                                        "bg-slate-500/10 border-slate-500/20 text-slate-400"
                                                    }`}>
                                                    {op.status === "WORKING" ? "Trabajando" : op.status === "TRANSIT" ? "En Ruta" : op.status}
                                                </span>
                                            </td>
                                        </tr>
                                    ))}
                                    {filteredAndSortedOps.length === 0 && (
                                        <tr>
                                            <td colSpan={4} className="py-20 text-center text-slate-600 font-medium">
                                                No se encontraron coincidencias en terreno.
                                            </td>
                                        </tr>
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </section>

                    {/* Shipments / Camiones */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pb-8">
                        <section className="bg-gradient-to-br from-emerald-500/20 to-teal-500/5 border border-emerald-500/20 p-8 rounded-3xl relative group overflow-hidden shadow-xl shadow-emerald-500/5">
                            <div className="absolute right-[-20px] top-[-20px] p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                <Truck className="w-40 h-40 text-emerald-500" />
                            </div>
                            <h3 className="font-bold text-2xl text-white mb-2 leading-tight">
                                Recepción de Repuestos
                            </h3>
                            <p className="text-sm text-emerald-100/60 mb-8 max-w-[200px]">
                                Integra guías con IA y actualiza stock instantáneo.
                            </p>
                            <button
                                onClick={() => window.location.href = '/dashboard/shipments/new'}
                                className="flex items-center gap-2 bg-emerald-400 hover:bg-emerald-500 text-black px-6 py-3 rounded-2xl text-sm font-black transition-all shadow-lg shadow-emerald-500/20"
                            >
                                <Plus className="w-5 h-5" /> NUEVO INGRESO
                            </button>
                        </section>

                        <section className="bg-white/5 border border-white/10 p-8 rounded-3xl shadow-2xl">
                            <h3 className="font-bold text-xl flex items-center gap-3 mb-6">
                                <Box className="w-6 h-6 text-orange-400" />
                                Inventario Crítico
                            </h3>
                            <div className="space-y-4">
                                {realStats.criticalStock > 0 ? (
                                    [1, 2].map((_, i) => (
                                        <div key={i} className="flex justify-between items-center text-sm p-3 bg-white/[0.02] border border-white/5 rounded-2xl">
                                            <div className="flex items-center gap-3">
                                                <div className="w-2 h-2 rounded-full bg-red-500 shadow-lg shadow-red-500/50" />
                                                <span className="font-medium text-slate-300">Material #0{i + 1} Crit.</span>
                                            </div>
                                            <span className="font-black font-mono text-red-400">03 u.</span>
                                        </div>
                                    ))
                                ) : (
                                    <p className="text-sm text-slate-500 text-center py-4 italic">Niveles de stock estables.</p>
                                )}
                            </div>
                        </section>
                    </div>
                </div>

                {/* Sidebar: IA Insights & Chronology */}
                <div className="space-y-8">
                    <ChronologyTimeline activities={chronology} />

                    <section className="bg-gradient-to-b from-indigo-600/20 to-purple-600/10 border border-indigo-500/30 p-8 rounded-[40px] relative overflow-hidden shadow-2xl">
                        <div className="relative z-10">
                            <div className="flex items-center gap-3 mb-6">
                                <div className="p-2 bg-indigo-400/20 rounded-xl">
                                    <BrainCircuit className="text-indigo-400 w-5 h-5" />
                                </div>
                                <h2 className="font-black text-indigo-100 tracking-tighter text-lg uppercase">IA Insights</h2>
                            </div>

                            <div className="space-y-6">
                                <div className="bg-black/30 p-5 rounded-3xl border border-white/5 backdrop-blur-md">
                                    <div className="flex items-center gap-2 mb-2">
                                        <div className="w-1.5 h-1.5 rounded-full bg-indigo-400 animate-pulse" />
                                        <p className="text-[10px] text-indigo-300 uppercase tracking-widest font-black">Sugerencia</p>
                                    </div>
                                    <p className="text-sm text-slate-300 leading-relaxed font-medium">
                                        Necesitas pedir **15 Filtros de Aire** para evitar quiebre de stock el viernes.
                                    </p>
                                    <button className="mt-4 w-full py-2 bg-indigo-500/20 hover:bg-indigo-500/40 border border-indigo-500/30 rounded-xl text-[10px] font-black text-indigo-100 uppercase transition-all">
                                        Generar solicitud
                                    </button>
                                </div>
                            </div>
                        </div>
                        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/10 blur-[100px]" />
                    </section>
                </div>
            </div>
        </div>
    );
}
