"use client";

import { useState, useMemo, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Plus,
    ClipboardList,
    ChevronRight,
    MapPin,
    Truck,
    Calendar,
    Activity,
    CheckCircle2,
    Clock,
    Filter,
    LayoutDashboard,
    AlertTriangle,
    Bot,
    Package,
    ArrowUpRight,
    Wrench,
} from "lucide-react";
import { WorkOrder } from "@/app/dashboard/ots/actions";
import { PM02ImportModal } from "./PM02ImportModal";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";

interface Props {
    initialOts: WorkOrder[];
}

type TabType = 'ALL' | 'PENDING' | 'IN_PROGRESS' | 'COMPLETED';

export function OTListClient({ initialOts }: Props) {
    const [ots, setOts] = useState<WorkOrder[]>(initialOts);
    const [search, setSearch] = useState("");
    const [activeTab, setActiveTab] = useState<TabType>('ALL');
    const [mainCategory, setMainCategory] = useState<'CORRECTIVE' | 'PREVENTIVE'>('CORRECTIVE');
    const [isImportModalOpen, setIsImportModalOpen] = useState(false);
    const [newClosures, setNewClosures] = useState<Set<string>>(new Set());
    const [activeToast, setActiveToast] = useState<{ id: string, title: string, code: string, type: 'CORRECTIVE' | 'PREVENTIVE' } | null>(null);

    // Filtros Operativos Preventivos
    const [filterCalibration, setFilterCalibration] = useState(false);
    const [sortByPreviousDate, setSortByPreviousDate] = useState(false);

    // REALTIME SUBSCRIPTION
    useEffect(() => {
        const supabase = createClient();
        
        const channel = supabase
            .channel('db-work-orders-changes-enhanced')
            .on(
                'postgres_changes',
                {
                    event: '*',
                    schema: 'public',
                    table: 'manmec_work_orders'
                },
                (payload) => {
                    if (payload.eventType === 'UPDATE') {
                        const updatedOt = payload.new as WorkOrder;
                        
                        setOts(prev => prev.map(ot => ot.id === updatedOt.id ? { ...ot, ...updatedOt } : ot));
                        
                        // Si se cerró ahora mismo, marcar para el highlight y mostrar TOAST
                        if ((updatedOt.status === 'COMPLETED' || updatedOt.status === 'CLOSED')) {
                            setNewClosures(prev => new Set(prev).add(updatedOt.id));
                            
                            // Trigger del Toast Premium
                            setActiveToast({
                                id: updatedOt.id,
                                title: updatedOt.title,
                                code: updatedOt.code || 'OT',
                                type: updatedOt.ot_type as any
                            });
                            
                            // Auto-cerrar toast después de 6 segundos
                            setTimeout(() => setActiveToast(null), 6000);
                        }
                    } else if (payload.eventType === 'INSERT') {
                        const newOt = payload.new as WorkOrder;
                        setOts(prev => [newOt, ...prev]);
                    }
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, []);

    // Función para saber si una OT se cerró recientemente (ej: última hora)
    const isRecentlyClosed = (ot: WorkOrder) => {
        if (!ot.updated_at) return false;
        if (ot.status !== 'COMPLETED' && ot.status !== 'CLOSED') return false;
        
        // Si fue durante esta sesión (realtime)
        if (newClosures.has(ot.id)) return true;

        // O si fue en la última hora (basado en DB)
        const closedAt = new Date(ot.updated_at).getTime();
        const now = new Date().getTime();
        return (now - closedAt) < 1000 * 60 * 60; // 1 hora
    };

    // MÉTRICAS (KPIs) - Ahora filtradas por Categoría Maestra
    const stats = useMemo(() => {
        const categoryOts = ots.filter(o => {
            if (o.ot_type !== mainCategory) return false;
            if (o.ot_type === 'PREVENTIVE') {
                const referenceDate = new Date(o.created_at);
                const now = new Date();
                if (referenceDate.getMonth() !== now.getMonth() || referenceDate.getFullYear() !== now.getFullYear()) {
                    return false;
                }
            }
            return true;
        });

        return {
            total: categoryOts.length,
            pending: categoryOts.filter(o => o.status === 'PENDING').length,
            inProgress: categoryOts.filter(o => o.status === 'IN_PROGRESS').length,
            completed: categoryOts.filter(o => o.status === 'COMPLETED' || o.status === 'CLOSED').length,
        };
    }, [ots, mainCategory]);

    const getPreviousPreventiveDate = (ot: WorkOrder) => {
        if (!ot.station_id) return null;
        const pastOts = ots.filter(o =>
            o.ot_type === 'PREVENTIVE' &&
            o.station_id === ot.station_id &&
            (o.status === 'COMPLETED' || o.status === 'CLOSED') &&
            new Date(o.created_at).getTime() < new Date(ot.created_at).getTime()
        ).sort((a, b) => new Date(b.completed_at || b.updated_at).getTime() - new Date(a.completed_at || a.updated_at).getTime());

        return pastOts.length > 0 ? (pastOts[0].completed_at || pastOts[0].updated_at) : null;
    };

    const filteredOts = useMemo(() => {
        return ots.filter(ot => {
            // 1. Filtro por Categoría Maestra
            if (ot.ot_type !== mainCategory) return false;

            // Filtro "Viaje de Mensualidad" para Preventivos: TODO viaja el día 1
            if (ot.ot_type === 'PREVENTIVE') {
                const referenceDate = new Date(ot.created_at);
                const now = new Date();
                // Si el mes/año de creación NO es el actual, se oculta (viaja a informes)
                if (referenceDate.getMonth() !== now.getMonth() || referenceDate.getFullYear() !== now.getFullYear()) {
                    return false;
                }
                
                // Filtro Rápido: Calibración
                if (filterCalibration) {
                    const calValue = (ot.metadata as any)?.calibracion?.toLowerCase();
                    if (calValue !== 'si' && calValue !== 'sí') {
                        return false;
                    }
                }
            }

            // 2. Filtro por Búsqueda
            const matchesSearch =
                ot.code?.toLowerCase().includes(search.toLowerCase()) ||
                ot.title.toLowerCase().includes(search.toLowerCase()) ||
                ot.external_id?.toLowerCase().includes(search.toLowerCase()) ||
                ot.station?.name.toLowerCase().includes(search.toLowerCase()) ||
                ot.station?.sap_store_code?.toLowerCase().includes(search.toLowerCase());

            const matchesTab =
                activeTab === 'ALL' ||
                (activeTab === 'PENDING' && ot.status === 'PENDING') ||
                (activeTab === 'IN_PROGRESS' && ot.status === 'IN_PROGRESS') ||
                (activeTab === 'COMPLETED' && (ot.status === 'COMPLETED' || ot.status === 'CLOSED'));

            return matchesSearch && matchesTab;
        }).sort((a, b) => {
            // Empujar las CERRADAS al fondo operativo
            const aIsClosed = a.status === 'COMPLETED' || a.status === 'CLOSED';
            const bIsClosed = b.status === 'COMPLETED' || b.status === 'CLOSED';
            
            if (aIsClosed && !bIsClosed) return 1;
            if (!aIsClosed && bIsClosed) return -1;
            
            // Si estamos en la vista de fecha anterior y son de preventivo, ordenar por urgencia histórica
            if (mainCategory === 'PREVENTIVE' && sortByPreviousDate) {
                const prevA = getPreviousPreventiveDate(a);
                const prevB = getPreviousPreventiveDate(b);
                
                // Si ambas tienen historial, la más antigua VA PRIMERO (más urgente de visitar)
                if (prevA && prevB) return new Date(prevA).getTime() - new Date(prevB).getTime();
                
                // Si A no tiene, debe ir primero (nunca se ha visitado o no hay registro)
                if (!prevA && prevB) return -1;
                if (prevA && !prevB) return 1;
            }

            // Por defecto, ordenar por fecha más reciente de creación
            return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        });
    }, [ots, search, activeTab, mainCategory, filterCalibration, sortByPreviousDate]);

    return (
        <div className="space-y-8">
            {/* NOTIFICACIÓN EMERGENTE (TOAST PREMIUM) */}
            <AnimatePresence>
                {activeToast && (
                    <motion.div
                        initial={{ opacity: 0, y: -50, x: '-50%' }}
                        animate={{ opacity: 1, y: 20, x: '-50%' }}
                        exit={{ opacity: 0, y: -50, x: '-50%' }}
                        className="fixed top-0 left-1/2 z-[100] w-full max-w-md px-4"
                    >
                        <div className={`p-1 rounded-[2rem] bg-gradient-to-r shadow-2xl ${activeToast.type === 'PREVENTIVE' ? 'from-emerald-500 to-teal-500 shadow-emerald-500/20' : 'from-blue-500 to-indigo-500 shadow-blue-500/20'}`}>
                            <div className="bg-black/90 backdrop-blur-xl rounded-[1.9rem] p-4 flex items-center gap-4">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center border ${activeToast.type === 'PREVENTIVE' ? 'bg-emerald-500/10 border-emerald-500/20' : 'bg-blue-500/10 border-blue-500/20'}`}>
                                    <Bot className={`w-6 h-6 ${activeToast.type === 'PREVENTIVE' ? 'text-emerald-400' : 'text-blue-400'}`} />
                                </div>
                                <div className="flex-1">
                                    <div className="flex items-center gap-2 mb-0.5">
                                        <span className={`text-[8px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${activeToast.type === 'PREVENTIVE' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-blue-500/10 text-blue-400'}`}>
                                            {activeToast.type === 'PREVENTIVE' ? 'Preventiva' : 'Correctiva'} Cerrada
                                        </span>
                                        <span className="text-[10px] font-black text-white/40 font-mono italic">{activeToast.code}</span>
                                    </div>
                                    <p className="text-sm font-black text-white uppercase italic tracking-tight truncate max-w-[200px]">{activeToast.title}</p>
                                </div>
                                <button 
                                    onClick={() => setActiveToast(null)}
                                    className="p-2 hover:bg-white/5 rounded-full transition-colors"
                                >
                                    <ArrowUpRight className="w-4 h-4 text-slate-500" />
                                </button>
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* SELECTOR DE CATEGORÍA MAESTRA (Correctivo vs Preventivo) */}
            <div className="flex justify-center mb-4">
                <div className="bg-white/5 border border-white/10 p-1 rounded-full backdrop-blur-md flex items-center gap-1">
                    <button
                        onClick={() => setMainCategory('CORRECTIVE')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${mainCategory === 'CORRECTIVE'
                            ? 'bg-blue-600 text-white shadow-xl shadow-blue-900/40'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Activity className="w-4 h-4" />
                        Mantenimiento Correctivo
                    </button>
                    <button
                        onClick={() => setMainCategory('PREVENTIVE')}
                        className={`flex items-center gap-2 px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest transition-all ${mainCategory === 'PREVENTIVE'
                            ? 'bg-emerald-600 text-white shadow-xl shadow-emerald-900/40'
                            : 'text-slate-500 hover:text-slate-300'
                            }`}
                    >
                        <Calendar className="w-4 h-4" />
                        Mantenimiento Preventivo
                    </button>
                </div>
            </div>

            {/* PANEL DE KPIs PREMIUM */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                {[
                    { label: 'Total Histórico', value: stats.total, icon: ClipboardList, color: 'text-slate-400', bg: 'bg-slate-500/10' },
                    { label: 'Pendientes', value: stats.pending, icon: Clock, color: 'text-amber-500', bg: 'bg-amber-500/10' },
                    { label: 'En Terreno', value: stats.inProgress, icon: Activity, color: 'text-blue-500', bg: 'bg-blue-500/10' },
                    { label: 'Resueltos', value: stats.completed, icon: CheckCircle2, color: 'text-emerald-500', bg: 'bg-emerald-500/10' },
                ].map((stat, i) => (
                    <motion.div
                        key={i}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: i * 0.1 }}
                        className="bg-white/5 border border-white/10 p-5 rounded-[2.5rem] backdrop-blur-xl relative overflow-hidden group"
                    >
                        <div className={`absolute top-0 right-0 p-6 opacity-5 group-hover:scale-110 transition-transform`}>
                            <stat.icon className="w-16 h-16" />
                        </div>
                        <stat.icon className={`w-5 h-5 ${stat.color} mb-3`} />
                        <p className="text-3xl font-black tracking-tighter text-white">{stat.value}</p>
                        <p className="text-[10px] font-black uppercase tracking-widest text-slate-500">{stat.label}</p>
                    </motion.div>
                ))}
            </div>

            {/* BARRA DE HERRAMIENTAS Y PESTAÑAS */}
            <div className="flex flex-col space-y-4">
                <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 p-4 rounded-[2.5rem] border border-white/10 backdrop-blur-md">
                    {/* TABS DE ESTADO */}
                    <div className="flex flex-col md:flex-row items-center gap-4 w-full md:w-auto">
                        <div className="flex items-center gap-1 p-1 bg-black/40 rounded-full w-full md:w-auto overflow-x-auto custom-scrollbar">
                            {(['ALL', 'PENDING', 'IN_PROGRESS', 'COMPLETED'] as TabType[]).map((tab) => (
                                <button
                                    key={tab}
                                    onClick={() => setActiveTab(tab)}
                                    className={`relative px-5 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === tab
                                        ? 'bg-blue-600 text-white shadow-lg shadow-blue-900/40'
                                        : 'text-slate-500 hover:text-slate-300'
                                        }`}
                                >
                                    {tab === 'ALL' ? 'Todos' : tab === 'PENDING' ? 'Espera' : tab === 'IN_PROGRESS' ? 'Proceso' : 'Cerrados'}
                                    
                                    {tab === 'COMPLETED' && newClosures.size > 0 && (
                                        <span className="absolute -top-1 -right-1 w-3 h-3 bg-emerald-500 rounded-full border-2 border-black animate-pulse" />
                                    )}
                                </button>
                            ))}
                        </div>

                        {/* FILTROS RÁPIDOS OPERATIVOS (SOLO PREVENTIVO) */}
                        {mainCategory === 'PREVENTIVE' && (
                            <div className="flex items-center gap-2">
                                <button
                                    onClick={() => setSortByPreviousDate(!sortByPreviousDate)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${sortByPreviousDate ? 'bg-indigo-600/20 text-indigo-400 border-indigo-500/50 shadow-lg shadow-indigo-900/20' : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10'}`}
                                >
                                    <Clock className="w-3.5 h-3.5" /> Orden Visita Ant.
                                </button>
                                <button
                                    onClick={() => setFilterCalibration(!filterCalibration)}
                                    className={`flex items-center gap-2 px-4 py-2 rounded-full text-[10px] font-black uppercase tracking-widest transition-all border ${filterCalibration ? 'bg-amber-500/20 text-amber-500 border-amber-500/50 shadow-lg shadow-amber-900/20' : 'bg-white/5 text-slate-500 border-white/10 hover:bg-white/10'}`}
                                >
                                    <Wrench className="w-3.5 h-3.5" /> Solo Calibración
                                </button>
                            </div>
                        )}
                    </div>

                    <div className="flex items-center gap-4 w-full md:w-auto">
                        <div className="relative w-full md:w-80">
                            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                            <input
                                type="text"
                                placeholder="Aviso, Estación o Código..."
                                className="w-full bg-black/40 border border-white/5 rounded-full py-3.5 pl-12 pr-4 text-xs font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all placeholder:text-slate-600"
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                            />
                        </div>
                        <button
                            onClick={() => setIsImportModalOpen(true)}
                            className={`rounded-full p-3 shadow-lg active:scale-95 transition-all flex items-center gap-2 px-6 border ${mainCategory === 'PREVENTIVE'
                                ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-900/20 border-emerald-500/50'
                                : 'bg-white/5 hover:bg-white/10 text-slate-400 border-white/10'
                                }`}
                        >
                            <Plus className="w-4 h-4" />
                            <span className="text-[10px] font-black uppercase tracking-widest hidden md:inline">
                                {mainCategory === 'PREVENTIVE' ? 'Import PM02' : 'Nueva OT'}
                            </span>
                        </button>
                    </div>
                </div>
            </div>

            {/* LISTADO DE TARJETAS REDISEÑADO */}
            <div className="grid grid-cols-1 gap-4">
                <AnimatePresence mode="popLayout">
                    {filteredOts.map((ot, i) => (
                        <Link key={ot.id} href={`/dashboard/ots/${ot.id}`} className="block">
                            <motion.div
                                layout
                                initial={{ opacity: 0, scale: 0.98 }}
                                animate={{ opacity: 1, scale: 1 }}
                                exit={{ opacity: 0, scale: 0.98 }}
                                className={`border p-4 pl-6 rounded-[2.2rem] backdrop-blur-md group transition-all flex flex-col md:flex-row md:items-center gap-6 relative overflow-hidden ${ot.status === 'COMPLETED' || ot.status === 'CLOSED' ? (mainCategory === 'PREVENTIVE' ? 'bg-emerald-900/10 border-emerald-500/20 opacity-80 hover:opacity-100' : 'bg-white/[0.01] border-white/5 opacity-60 hover:opacity-100') : 'bg-white/[0.03] border-white/10 hover:bg-white/[0.07]'}`}
                            >
                                {/* Brillo de Prioridad Lateral (Más discreto) */}
                                <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${ot.priority === 'P1' ? 'bg-red-500/40' :
                                    ot.priority === 'P2' ? 'bg-amber-500/40' :
                                        ot.priority === 'PM' ? 'bg-emerald-500/40' : 'bg-blue-500/40'
                                    }`} />

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-2 flex-wrap">
                                        <div className={`px-2.5 py-0.5 rounded-full text-[9px] font-black uppercase tracking-widest ${ot.priority === 'P1' ? 'bg-red-500/10 text-red-500 border border-red-500/20' :
                                            ot.priority === 'P2' ? 'bg-amber-500/10 text-amber-500 border border-amber-500/20' :
                                                ot.priority === 'PM' ? 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20' :
                                                    ot.priority === 'P4' ? 'bg-slate-500/10 text-slate-400 border border-slate-500/20' :
                                                        'bg-blue-500/10 text-blue-500 border border-blue-500/20'
                                            }`}>
                                            P{ot.priority}
                                        </div>

                                        {isRecentlyClosed(ot) && (
                                            <motion.span 
                                                initial={{ scale: 0.5, opacity: 0 }}
                                                animate={{ scale: 1, opacity: 1 }}
                                                className="px-2.5 py-0.5 rounded-full bg-emerald-500 text-black text-[9px] font-black uppercase tracking-widest flex items-center gap-1 shadow-[0_0_15px_rgba(16,185,129,0.5)] animate-pulse"
                                            >
                                                <CheckCircle2 className="w-2.5 h-2.5" />
                                                RECIBIDO
                                            </motion.span>
                                        )}
                                        {ot.external_id && (
                                            <span className="text-[9px] font-mono font-black text-emerald-500/80 bg-emerald-500/5 px-2.5 py-0.5 rounded-full border border-emerald-500/10">
                                                {ot.external_id}
                                            </span>
                                        )}
                                        {((ot.metadata as any)?.reactive_creation) && (
                                            <span className={`text-[9px] font-black flex items-center gap-1 px-2.5 py-0.5 rounded-full border ${((ot.metadata as any)?.reactive_warning) ? 'bg-rose-500/10 text-rose-500 border-rose-500/20' : 'bg-purple-500/10 text-purple-400 border-purple-500/20'}`}>
                                                {((ot.metadata as any)?.reactive_warning) ? <AlertTriangle className="w-2.5 h-2.5" /> : <Bot className="w-2.5 h-2.5" />}
                                                {((ot.metadata as any)?.reactive_warning) ? 'REACTIVO' : 'PM AUTO'}
                                            </span>
                                        )}
                                        <span className="text-[9px] font-mono font-bold text-slate-600">
                                            {ot.code}
                                        </span>
                                    </div>

                                    <h3 className="text-lg font-black text-white uppercase italic tracking-tight group-hover:text-blue-400 transition-colors leading-none mb-3">
                                        {ot.title}
                                    </h3>

                                    <div className="flex flex-wrap items-center gap-x-6 gap-y-2">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-3.5 h-3.5 text-red-500/50" />
                                            <p className="text-[10px] font-bold text-slate-400 truncate max-w-[150px]">{ot.station?.name}</p>
                                            <span className="text-[9px] font-black text-blue-500/60 bg-blue-500/5 px-1.5 py-0.5 rounded border border-blue-500/10">{ot.station?.code}</span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Truck className="w-3.5 h-3.5 text-blue-500/50" />
                                            <p className="text-[10px] font-bold text-slate-400">{ot.vehicle?.plate || "S-ASIG"}</p>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <Calendar className="w-3.5 h-3.5 text-indigo-500/50" />
                                            <p suppressHydrationWarning className="text-[10px] font-bold text-slate-400">{new Date(ot.created_at).toLocaleDateString(undefined, { day: '2-digit', month: 'short' })}</p>
                                        </div>

                                        {/* SECCIÓN DE REPUESTOS / MATERIALES */}
                                        {ot.materials && ot.materials.length > 0 && (
                                            <div className="flex items-center gap-2 ml-auto md:ml-0 pl-1 md:pl-4 md:border-l border-white/5">
                                                <Package className="w-3.5 h-3.5 text-amber-500/50" />
                                                <div className="flex flex-wrap gap-1">
                                                    {ot.materials.slice(0, 3).map((m, idx) => (
                                                        <span key={idx} className="bg-amber-500/10 text-amber-500/80 text-[8px] font-black px-1.5 py-0.5 rounded border border-amber-500/10 whitespace-nowrap">
                                                            {m.item.sku} x{m.quantity}
                                                        </span>
                                                    ))}
                                                    {ot.materials.length > 3 && (
                                                        <span className="text-[8px] font-black text-slate-600">+{ot.materials.length - 3}</span>
                                                    )}
                                                </div>
                                            </div>
                                        )}
                                    </div>

                                    {/* MANTENIMIENTO PREVENTIVO ESPECÍFICO */}
                                    {ot.ot_type === 'PREVENTIVE' && (
                                        <div className="flex items-center gap-4 mt-4 bg-black/20 p-3 rounded-xl border border-white/5 w-fit">
                                            <div className="flex flex-col">
                                                <span className="text-[8px] uppercase tracking-widest text-slate-500 font-bold mb-0.5 flex items-center gap-1">
                                                    <Calendar className="w-2.5 h-2.5" /> Preventiva Anterior
                                                </span>
                                                <span className="text-[11px] font-black text-slate-300">
                                                    {getPreviousPreventiveDate(ot)
                                                        ? new Date(getPreviousPreventiveDate(ot)!).toLocaleDateString('es-CL', { day: '2-digit', month: '2-digit', year: 'numeric' })
                                                        : 'S/D (Primer registro)'}
                                                </span>
                                            </div>

                                            <div className="w-px h-6 bg-white/10" />

                                            <div className="flex flex-col justify-center">
                                                <span className="text-[8px] uppercase tracking-widest text-slate-500 font-bold mb-1 flex items-center gap-1">
                                                    <Wrench className="w-2.5 h-2.5" /> Calibración
                                                </span>
                                                {((ot.metadata as any)?.calibracion?.toLowerCase() === 'si' || (ot.metadata as any)?.calibracion?.toLowerCase() === 'sí') ? (
                                                    <span className="text-sm font-black text-emerald-400 flex items-center gap-1.5 bg-emerald-500/10 px-2.5 py-0.5 rounded-md border border-emerald-500/20 shadow-[0_0_10px_rgba(16,185,129,0.15)] w-fit">
                                                        <CheckCircle2 className="w-4 h-4" /> SÍ
                                                    </span>
                                                ) : (
                                                    <span className="text-[11px] font-black text-slate-600 mt-1">NO</span>
                                                )}
                                            </div>
                                        </div>
                                    )}
                                </div>

                                <div className="flex md:flex-col items-center gap-5 justify-between md:pl-6 md:border-l border-white/5 h-full mt-4 md:mt-0 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                                    <div className="flex flex-col items-end gap-1">
                                        <span className={`px-3 py-1 rounded-full text-[9px] font-black uppercase tracking-tighter ${ot.status === 'COMPLETED' || ot.status === 'CLOSED' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' :
                                            ot.status === 'IN_PROGRESS' ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30' :
                                                'bg-white/5 text-slate-500 border border-white/10'
                                            }`}>
                                            {ot.status === 'COMPLETED' || ot.status === 'CLOSED' ? 'Cerrada' : ot.status === 'IN_PROGRESS' ? 'En Sitio' : 'Espera'}
                                        </span>
                                    </div>
                                    <div className="w-10 h-10 rounded-full bg-white/5 flex items-center justify-center group-hover:bg-blue-600/20 transition-all">
                                        <ArrowUpRight className="w-5 h-5 text-slate-700 group-hover:text-blue-400 group-hover:scale-110 transition-all" />
                                    </div>
                                </div>
                            </motion.div>
                        </Link>

                    ))}
                </AnimatePresence>
            </div>

            {filteredOts.length === 0 && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="py-24 md:py-32 px-4 text-center bg-white/5 rounded-[4rem] border border-dashed border-white/10"
                >
                    {mainCategory === 'PREVENTIVE' ? (
                        <>
                            <Calendar className="w-16 h-16 mx-auto mb-6 text-emerald-500 opacity-50" />
                            <h3 className="text-2xl md:text-3xl font-black text-emerald-500 uppercase tracking-tighter">NUEVO MES, NUEVA OPERACIÓN</h3>
                            <p className="text-slate-400 text-sm mt-3 font-medium max-w-md mx-auto leading-relaxed">
                                El historial del mes pasado ya fue enviado a informes. Para iniciar el ciclo operativo actual, por favor importa el nuevo archivo de **Mantenimiento Preventivo (PM02)**.
                            </p>
                            <button
                                onClick={() => setIsImportModalOpen(true)}
                                className="mt-8 bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-4 rounded-full text-xs font-black uppercase tracking-widest shadow-xl shadow-emerald-900/40 transition-all border border-emerald-500/50 flex items-center gap-2 mx-auto hover:scale-105 active:scale-95"
                            >
                                <Plus className="w-4 h-4" /> IMPORTAR OTs DE ESTE MES
                            </button>
                        </>
                    ) : (
                        <>
                            <Filter className="w-16 h-16 mx-auto mb-6 text-slate-700 opacity-20" />
                            <h3 className="text-2xl font-black text-slate-500 lowercase tracking-tighter italic">NADA POR AQUÍ...</h3>
                            <p className="text-slate-600 text-sm mt-2 font-medium">Ajusta los filtros para explorar tu historial.</p>
                        </>
                    )}
                </motion.div>
            )}

            <PM02ImportModal
                isOpen={isImportModalOpen}
                onClose={() => setIsImportModalOpen(false)}
                onSuccess={() => {
                    setIsImportModalOpen(false);
                    window.location.reload();
                }}
            />
        </div>
    );
}
