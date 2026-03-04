"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Package,
    Wrench,
    Users,
    History,
    AlertTriangle,
    CheckCircle2,
    Calendar,
    Clock,
    Truck,
    Box,
    Loader2
} from "lucide-react";
import { Vehicle, getVehicleAuditData } from "@/app/dashboard/fleet/actions";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    vehicle: Vehicle;
}

export function VehicleAuditModal({ isOpen, onClose, vehicle }: Props) {
    const [activeTab, setActiveTab] = useState<"inventory" | "crew" | "history">("inventory");
    const [isLoading, setIsLoading] = useState(true);
    const [data, setData] = useState<any>(null);

    useEffect(() => {
        if (isOpen && vehicle) {
            loadAuditData();
        }
    }, [isOpen, vehicle]);

    const loadAuditData = async () => {
        try {
            setIsLoading(true);
            const auditData = await getVehicleAuditData(vehicle.id);
            setData(auditData);
        } catch (error) {
            console.error("Error loading audit data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

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
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-blue-500 via-indigo-500 to-emerald-500" />
                        <div className="flex justify-between items-start z-10 relative">
                            <div className="flex items-center gap-4">
                                <div className="w-14 h-14 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-inner">
                                    <Truck className="w-7 h-7 text-blue-400" />
                                </div>
                                <div>
                                    <div className="flex items-center gap-3">
                                        <h2 className="text-3xl font-black uppercase tracking-tight text-white">{vehicle.plate}</h2>
                                        <span className={`px-2 py-1 rounded-md text-xs font-bold uppercase ${vehicle.is_active ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'}`}>
                                            {vehicle.is_active ? 'Operativo' : 'Inactivo'}
                                        </span>
                                    </div>
                                    <p className="text-sm text-slate-400 font-medium">
                                        {vehicle.brand} {vehicle.model} • {Number(vehicle.last_mileage).toLocaleString('es-CL')} km
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
                                active={activeTab === "inventory"}
                                onClick={() => setActiveTab("inventory")}
                                icon={<Package className="w-4 h-4" />}
                                title="Inventario"
                                subtitle="Herramientas e Insumos"
                            />
                            <TabButton
                                active={activeTab === "crew"}
                                onClick={() => setActiveTab("crew")}
                                icon={<Users className="w-4 h-4" />}
                                title="Tripulación"
                                subtitle="Asignaciones recientes"
                            />
                            <TabButton
                                active={activeTab === "history"}
                                onClick={() => setActiveTab("history")}
                                icon={<History className="w-4 h-4" />}
                                title="Historial OT"
                                subtitle="Últimos 15 días"
                            />
                        </div>

                        {/* Main Area */}
                        <div className="flex-1 p-6 overflow-y-auto min-h-0 bg-gradient-to-br from-black to-slate-900/50">
                            {isLoading ? (
                                <div className="h-full flex flex-col items-center justify-center text-slate-500 space-y-4">
                                    <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
                                    <p className="font-medium animate-pulse">Recopilando auditoría 360...</p>
                                </div>
                            ) : (
                                <AnimatePresence mode="wait">
                                    {activeTab === "inventory" && (
                                        <motion.div
                                            key="inventory"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="space-y-8"
                                        >
                                            <div className="flex items-center justify-between">
                                                <h3 className="text-xl font-bold flex items-center gap-2">
                                                    <Box className="text-blue-400" />
                                                    Bodega Móvil: <span className="text-white">{data?.vehicle?.warehouse?.name || 'No asignada'}</span>
                                                </h3>
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                                                    <Wrench className="w-4 h-4" /> Herramientas Asignadas ({data?.tools?.length || 0})
                                                </h4>
                                                {data?.tools?.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {data.tools.map((tool: any) => (
                                                            <div key={tool.id} className="bg-white/5 border border-white/10 p-3 rounded-xl flex justify-between items-center">
                                                                <div>
                                                                    <p className="font-bold text-sm text-white">{tool.name}</p>
                                                                    <p className="text-xs text-slate-400">{tool.serial_number || tool.brand}</p>
                                                                </div>
                                                                <span className="text-[10px] px-2 py-1 rounded-md bg-white/10 uppercase font-bold text-slate-300">
                                                                    {tool.status}
                                                                </span>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-slate-500 text-sm">No hay herramientas fijas en este furgón.</p>
                                                )}
                                            </div>

                                            <div>
                                                <h4 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-4 border-b border-white/10 pb-2 flex items-center gap-2">
                                                    <Package className="w-4 h-4" /> Insumos / Repuestos ({data?.items?.length || 0})
                                                </h4>
                                                {data?.items?.length > 0 ? (
                                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                                        {data.items.map((item: any) => (
                                                            <div key={item.id} className="bg-white/5 border border-white/10 p-3 rounded-xl flex justify-between items-center">
                                                                <div>
                                                                    <p className="font-bold text-sm text-white">{item.name}</p>
                                                                    <p className="text-xs text-slate-400">SKU: {item.sku || 'N/A'}</p>
                                                                </div>
                                                                <div className="text-right">
                                                                    <p className="font-bold text-blue-400 text-lg">{Number(item.current_stock || 0)}</p>
                                                                    <p className="text-[10px] uppercase text-slate-500">Stock</p>
                                                                </div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                ) : (
                                                    <p className="text-slate-500 text-sm">No hay insumos registrados en esta bodega.</p>
                                                )}
                                            </div>
                                        </motion.div>
                                    )}

                                    {activeTab === "crew" && (
                                        <motion.div
                                            key="crew"
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="space-y-6"
                                        >
                                            <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                                                <Users className="text-indigo-400" />
                                                Mecánicos Recientes
                                            </h3>
                                            <p className="text-sm text-slate-400 mb-6">
                                                Personal que ha sido asignado a OTs con este vehículo en los últimos 15 días.
                                            </p>

                                            {data?.crew?.length > 0 ? (
                                                <div className="grid grid-cols-1 gap-3">
                                                    {data.crew.map((user: any) => (
                                                        <div key={user.id} className="bg-white/5 border border-white/10 p-4 rounded-xl flex items-center gap-4">
                                                            <div className="w-10 h-10 rounded-full bg-indigo-500/20 text-indigo-400 flex items-center justify-center font-bold border border-indigo-500/30">
                                                                {user.full_name?.[0]?.toUpperCase() || 'U'}
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-white">{user.full_name}</p>
                                                                <p className="text-xs text-slate-400">{user.email}</p>
                                                            </div>
                                                            <div className="ml-auto">
                                                                <CheckCircle2 className="w-5 h-5 text-emerald-500/50" />
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-12 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
                                                    <Users className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                                    <p className="text-slate-400 font-medium">Sin tripulación reciente</p>
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
                                            className="space-y-6"
                                        >
                                            <div className="flex items-center justify-between mb-6">
                                                <div>
                                                    <h3 className="text-lg font-bold flex items-center gap-2 text-white">
                                                        <History className="text-emerald-400" />
                                                        Historial de Servicios
                                                    </h3>
                                                    <p className="text-sm text-slate-400">
                                                        Últimos 15 días (Total: {data?.workOrders?.length || 0})
                                                    </p>
                                                </div>
                                            </div>

                                            {data?.workOrders?.length > 0 ? (
                                                <div className="space-y-4 relative before:absolute before:inset-0 before:ml-5 before:-translate-x-px md:before:mx-auto md:before:translate-x-0 before:h-full before:w-0.5 before:bg-gradient-to-b before:from-transparent before:via-white/10 before:to-transparent">
                                                    {data.workOrders.map((wo: any, idx: number) => (
                                                        <div key={wo.id} className="relative flex items-center justify-between md:justify-normal md:odd:flex-row-reverse group is-active">
                                                            <div className="flex items-center justify-center w-10 h-10 rounded-full border border-white/10 bg-black text-slate-500 shrink-0 md:order-1 md:group-odd:-translate-x-1/2 md:group-even:translate-x-1/2 shadow">
                                                                {wo.status === 'COMPLETED' ? <CheckCircle2 className="w-5 h-5 text-emerald-500" /> : <Clock className="w-5 h-5 text-blue-500" />}
                                                            </div>
                                                            <div className="w-[calc(100%-4rem)] md:w-[calc(50%-2.5rem)] bg-white/5 border border-white/10 p-4 rounded-xl hover:bg-white/10 transition-colors">
                                                                <div className="flex items-center justify-between mb-1">
                                                                    <span className="text-xs font-bold text-blue-400 uppercase">{wo.code}</span>
                                                                    <span className="text-[10px] text-slate-500">{new Date(wo.created_at).toLocaleDateString()}</span>
                                                                </div>
                                                                <p className="font-bold text-sm text-white mb-1">{wo.title}</p>
                                                                <p className="text-xs text-slate-400 truncate">{wo.station?.name}</p>
                                                            </div>
                                                        </div>
                                                    ))}
                                                </div>
                                            ) : (
                                                <div className="py-12 text-center border-2 border-dashed border-white/10 rounded-2xl bg-white/5">
                                                    <History className="w-12 h-12 mx-auto mb-3 text-slate-600" />
                                                    <p className="text-slate-400 font-medium">No hay órdenes de trabajo recientes</p>
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
