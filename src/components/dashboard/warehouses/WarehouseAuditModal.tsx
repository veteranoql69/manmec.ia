"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Package,
    Wrench,
    History,
    Warehouse,
    Truck,
    ArrowRightLeft,
    Box,
    Loader2
} from "lucide-react";
import { getWarehouseAuditData } from "@/app/dashboard/warehouses/actions";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    warehouse: any; // Using any for brevity here, matches the query return
}

export function WarehouseAuditModal({ isOpen, onClose, warehouse }: Props) {
    const [activeTab, setActiveTab] = useState<"items" | "tools" | "history">("items");
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        if (isOpen && warehouse?.id) {
            loadAuditData();
        }
    }, [isOpen, warehouse]);

    const loadAuditData = async () => {
        try {
            setIsLoading(true);
            const auditData = await getWarehouseAuditData(warehouse.id);
            setData(auditData);
        } catch (error) {
            console.error("Error loading warehouse audit data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen || !warehouse) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-5xl max-h-[90vh] flex flex-col bg-[#0A0A0B] border border-white/10 rounded-[2rem] shadow-2xl overflow-hidden"
                >
                    {/* Header */}
                    <div className="flex-shrink-0 p-6 border-b border-white/10 bg-white/5 relative overflow-hidden">
                        <div className={`absolute top-0 left-0 w-full h-1 bg-gradient-to-r ${warehouse.type === 'MOBILE' ? 'from-amber-500 via-orange-500 to-yellow-500' : 'from-blue-500 via-indigo-500 to-cyan-500'}`} />
                        <div className="flex justify-between items-start z-10 relative">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-inner">
                                    {warehouse.type === 'MOBILE' ? (
                                        <Truck className="w-7 h-7 text-amber-400" />
                                    ) : (
                                        <Warehouse className="w-7 h-7 text-blue-400" />
                                    )}
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-3xl font-black uppercase tracking-tight text-white">{warehouse.name}</h2>
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${warehouse.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                            {warehouse.is_active ? 'Operativa' : 'Inactiva'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-400 font-medium">
                                        {warehouse.type === 'MOBILE' ? (
                                            <>Furgón Asignado: {data?.warehouse?.vehicle?.plate || warehouse.vehicle?.plate || 'Buscando...'}</>
                                        ) : (
                                            <>{warehouse.address || 'Ubicación central'}</>
                                        )}
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 hover:bg-white/10 rounded-xl transition-colors text-slate-400 hover:text-white"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>

                    {/* Content */}
                    <div className="flex-1 overflow-hidden flex flex-col md:flex-row min-h-0">
                        {/* Sidebar Tabs */}
                        <div className="w-full md:w-64 flex-shrink-0 bg-black/20 border-r border-white/5 p-4 flex flex-col gap-2 overflow-y-auto">
                            <TabButton
                                active={activeTab === "items"}
                                onClick={() => setActiveTab("items")}
                                icon={<Package className="w-4 h-4" />}
                                title="Insumos"
                                subtitle="Consumibles y Repuestos"
                            />
                            <TabButton
                                active={activeTab === "tools"}
                                onClick={() => setActiveTab("tools")}
                                icon={<Wrench className="w-4 h-4" />}
                                title="Herramientas"
                                subtitle="Activos fijos asignados"
                            />
                            <TabButton
                                active={activeTab === "history"}
                                onClick={() => setActiveTab("history")}
                                icon={<History className="w-4 h-4" />}
                                title="Movimientos"
                                subtitle="Últimas 30 transacciones"
                            />
                        </div>

                        {/* Main Area */}
                        <div className="flex-1 p-6 overflow-y-auto min-h-0 bg-gradient-to-br from-black to-slate-900/50">
                            {isLoading ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    <p className="font-medium animate-pulse">Contabilizando bodega...</p>
                                </div>
                            ) : (
                                <AnimatePresence mode="wait">
                                    {activeTab === "items" && (
                                        <motion.div
                                            key="items"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="space-y-6"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                                    <Box className="text-blue-400" />
                                                    Stock de Insumos ({data?.items?.length || 0})
                                                </h3>
                                            </div>

                                            {data?.items?.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                                    {data.items.map((item: any) => (
                                                        <div key={item.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex flex-col relative overflow-hidden group hover:border-white/20 transition-all">
                                                            <div className="flex justify-between items-start mb-2">
                                                                <div className="p-2 bg-blue-500/10 rounded-lg text-blue-400">
                                                                    <Package size={18} />
                                                                </div>
                                                                <span className="text-[10px] font-mono text-slate-500 border border-slate-700 px-2 py-1 rounded bg-black/50">
                                                                    {item.sku || 'N/A'}
                                                                </span>
                                                            </div>
                                                            <h4 className="font-bold text-white text-sm mt-1 uppercase mb-4">{item.name}</h4>
                                                            <div className="mt-auto flex items-end justify-between">
                                                                <span className="text-xs text-slate-500 font-bold uppercase">Stock Actual</span>
                                                                <div className="flex items-baseline gap-1">
                                                                    <span className="text-2xl font-black text-blue-400">{Number(item.current_stock || 0)}</span>
                                                                    <span className="text-[10px] text-slate-500">{item.unit}</span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-12 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
                                                    <Package className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                                    <p className="text-slate-400 font-medium">No hay insumos almacenados aquí.</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    {activeTab === "tools" && (
                                        <motion.div
                                            key="tools"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="space-y-6"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                                    <Wrench className="text-amber-400" />
                                                    Herramientas ({data?.tools?.length || 0})
                                                </h3>
                                            </div>

                                            {data?.tools?.length > 0 ? (
                                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                    {data.tools.map((tool: any) => (
                                                        <div key={tool.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center justify-between">
                                                            <div className="flex items-center gap-4">
                                                                <div className="w-10 h-10 rounded-lg bg-black border border-white/10 flex items-center justify-center">
                                                                    <Wrench className="w-5 h-5 text-amber-500" />
                                                                </div>
                                                                <div>
                                                                    <p className="font-bold text-white text-sm">{tool.name}</p>
                                                                    <p className="text-xs text-slate-400">{tool.brand ? `${tool.brand} • ` : ''}{tool.serial_number}</p>
                                                                </div>
                                                            </div>
                                                            <span className="text-[10px] px-2 py-1 rounded border border-white/10 uppercase font-bold text-slate-300">
                                                                {tool.status}
                                                            </span>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-12 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
                                                    <Wrench className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                                    <p className="text-slate-400 font-medium">Sin herramientas asignadas</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}

                                    {activeTab === "history" && (
                                        <motion.div
                                            key="history"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="space-y-6 flex flex-col h-full"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xl font-bold flex items-center gap-2 text-white">
                                                    <History className="text-emerald-400" />
                                                    Historial de Movimientos
                                                </h3>
                                            </div>

                                            {data?.movements?.length > 0 ? (
                                                <div className="flex-1 overflow-y-auto pr-2 space-y-3 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent pt-2">
                                                    {data.movements.map((mov: any) => (
                                                        <div key={mov.id} className="relative flex items-center gap-6 group hover:-translate-y-1 transition-transform">
                                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-black shrink-0 relative z-10 shadow">
                                                                {mov.type === 'IN' && <ArrowRightLeft className="w-4 h-4 text-emerald-500" />}
                                                                {mov.type === 'OUT' && <ArrowRightLeft className="w-4 h-4 text-red-500" />}
                                                                {mov.type === 'ADJUSTMENT' && <Box className="w-4 h-4 text-blue-500" />}
                                                            </div>
                                                            <div className="flex-1 bg-white/5 border border-white/10 p-4 rounded-xl group-hover:bg-white/10 transition-colors">
                                                                <div className="flex justify-between items-start mb-2">
                                                                    <div className="flex items-center gap-2">
                                                                        <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-bold border ${mov.type === 'IN' ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20' :
                                                                            mov.type === 'OUT' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                                                                                'bg-blue-500/10 text-blue-400 border-blue-500/20'
                                                                            }`}>
                                                                            {mov.type === 'IN' ? 'ENTRADA' : mov.type === 'OUT' ? 'SALIDA' : 'AJUSTE'}
                                                                        </span>
                                                                        <span className="text-xs text-white font-bold">{mov.item_name}</span>
                                                                    </div>
                                                                    <span className="text-[10px] text-slate-500">{new Date(mov.created_at).toLocaleString('es-CL', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                                                                </div>
                                                                <p className="text-xs text-slate-400 mb-2 truncate">Responsable: {mov.user_name}</p>
                                                                <div className="flex items-center justify-between text-xs">
                                                                    <span className="text-slate-500">{mov.reason || 'Sin justificación'}</span>
                                                                    <span className={`font-black ${mov.type === 'IN' || mov.type === 'ADJUSTMENT' ? 'text-emerald-400' : 'text-red-400'}`}>
                                                                        {mov.type === 'OUT' ? '-' : '+'}{Number(mov.quantity)}
                                                                    </span>
                                                                </div>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-12 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
                                                    <History className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                                    <p className="text-slate-400 font-medium">No hay movimientos recientes</p>
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            )}
                        </div>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}

function TabButton({ active, onClick, icon, title, subtitle }: { active: boolean, onClick: () => void, icon: React.ReactNode, title: string, subtitle: string }) {
    return (
        <button
            onClick={onClick}
            className={`w-full text-left p-3 rounded-xl flex items-center gap-3 transition-all ${active
                ? 'bg-blue-600/20 text-blue-400 border border-blue-500/30 shadow-inner'
                : 'hover:bg-white/5 text-slate-400 border border-transparent'
                }`}
        >
            <div className={`p-2 rounded-lg ${active ? 'bg-blue-500/20 text-blue-400' : 'bg-black/50 text-slate-500'}`}>
                {icon}
            </div>
            <div>
                <p className={`font-bold text-sm ${active ? 'text-white' : ''}`}>{title}</p>
                <p className={`text-[10px] ${active ? 'text-blue-200' : 'text-slate-600'}`}>{subtitle}</p>
            </div>
        </button>
    );
}
