"use client";

import { useState } from "react";
import { Truck, PackageSearch, Sparkles, CheckCircle2, AlertTriangle, Hammer, Battery, ShieldAlert, Loader2 } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { generateLogisticsSuggestion } from "@/app/dashboard/ots/ai-actions";

interface MobileWarehouseTabsProps {
    ot: any;
}

export function MobileWarehouseTabs({ ot }: MobileWarehouseTabsProps) {
    const [activeTab, setActiveTab] = useState<'vehicle' | 'stock' | 'ai'>('vehicle');
    const [aiLoading, setAiLoading] = useState(false);
    const [aiData, setAiData] = useState<any[] | null>(null);

    const handleTabChange = async (tab: 'vehicle' | 'stock' | 'ai') => {
        setActiveTab(tab);
        if (tab === 'ai' && !aiData && ot.vehicle) {
            setAiLoading(true);
            try {
                const res = await generateLogisticsSuggestion(ot.id, ot.vehicle.id);
                if (res.success) {
                    setAiData(res.suggestions);
                } else {
                    setAiData([]);
                }
            } catch (e) {
                console.error(e);
                setAiData([]);
            } finally {
                setAiLoading(false);
            }
        }
    };

    // Mapeando datos vivos del backend
    const liveStock = ot.mobile_warehouse?.stock?.map((s: any) => ({
        name: s.item?.name || "Sin Nombre",
        sku: s.item?.sku || "N/A",
        qty: s.quantity,
        unit: s.item?.unit || "und",
        isSensitive: !!s.item?.is_sensitive
    })) || [];

    const liveTools = ot.mobile_warehouse?.tools?.map((t: any) => ({
        name: t.name,
        serial: t.serial_number,
        status: t.status,
        isCritical: t.is_critical
    })) || [];



    return (
        <section className="bg-white/5 border border-white/10 rounded-[3rem] relative overflow-hidden flex flex-col h-[500px]">
            {/* Header Tabs Navigation */}
            <div className="flex items-center gap-1 p-3 bg-black/40 border-b border-white/5">
                <button
                    onClick={() => handleTabChange('vehicle')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'vehicle' ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30' : 'text-slate-500 hover:bg-white/5'}`}
                >
                    <Truck className="w-4 h-4" /> <span className="hidden sm:inline">Vehículo</span>
                </button>

                <button
                    onClick={() => handleTabChange('stock')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all ${activeTab === 'stock' ? 'bg-indigo-500/20 text-indigo-400 border border-indigo-500/30' : 'text-slate-500 hover:bg-white/5'}`}
                >
                    <PackageSearch className="w-4 h-4" /> <span className="hidden sm:inline">Live Stock</span>
                </button>

                <button
                    onClick={() => handleTabChange('ai')}
                    className={`flex-1 flex items-center justify-center gap-2 py-3 px-4 rounded-2xl text-[10px] sm:text-xs font-black uppercase tracking-widest transition-all relative overflow-hidden ${activeTab === 'ai' ? 'bg-gradient-to-r from-violet-600/20 to-fuchsia-600/20 text-fuchsia-400 border border-fuchsia-500/30' : 'text-slate-500 hover:bg-white/5'}`}
                >
                    {activeTab === 'ai' && <div className="absolute inset-0 bg-gradient-to-r from-violet-500/10 to-fuchsia-500/10 animate-pulse" />}
                    <Sparkles className="w-4 h-4 z-10" /> <span className="hidden sm:inline z-10">IA Sugiere</span>

                    {/* Badge Notificación IA */}
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-fuchsia-500 animate-ping" />
                    <span className="absolute top-2 right-2 w-2 h-2 rounded-full bg-fuchsia-500" />
                </button>
            </div>

            {/* Tab Content Area */}
            <div className="p-6 flex-1 overflow-y-auto">
                <AnimatePresence>

                    {/* ----------------- TAB: VEHÍCULO ----------------- */}
                    {activeTab === 'vehicle' && (
                        <motion.div
                            key="vehicle"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="h-full flex flex-col justify-center"
                        >
                            {ot.vehicle ? (
                                <div className="space-y-6">
                                    <div className="bg-black/60 p-8 rounded-3xl border border-emerald-500/20 backdrop-blur-md relative overflow-hidden group">
                                        <div className="absolute -right-4 -bottom-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                            <Truck className="w-32 h-32 text-emerald-400" />
                                        </div>
                                        <div className="relative z-10">
                                            <p className="text-[10px] font-black tracking-widest text-emerald-400 uppercase mb-2 font-mono flex items-center gap-2">
                                                <span className="inline-block w-2 h-2 rounded-full bg-emerald-500 animate-pulse" /> Unidad Activa
                                            </p>
                                            <p className="text-5xl font-black uppercase font-mono tracking-tighter text-white">{ot.vehicle.plate}</p>
                                            <p className="text-sm font-bold text-slate-400 mt-2 uppercase tracking-wide">{ot.vehicle.brand} {ot.vehicle.model}</p>
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-4">
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Bodega Móvil ID</p>
                                            <p className="font-mono text-sm text-slate-300 mt-1">WH-MOBILE-75</p>
                                        </div>
                                        <div className="p-4 rounded-2xl bg-white/5 border border-white/10">
                                            <p className="text-[10px] font-bold text-slate-500 uppercase tracking-widest">Responsable</p>
                                            <p className="font-bold text-sm text-slate-300 mt-1 truncate">{ot.assigned_user?.full_name || "L. Muñoz"}</p>
                                        </div>
                                    </div>
                                </div>
                            ) : (
                                <div className="flex flex-col items-center justify-center text-center p-6 h-full">
                                    <div className="w-16 h-16 rounded-3xl bg-slate-800/50 flex items-center justify-center mb-4">
                                        <AlertTriangle className="w-8 h-8 text-slate-500" />
                                    </div>
                                    <p className="font-bold text-slate-300 mb-2">Sin vehículo asignado</p>
                                    <p className="text-xs text-slate-500 max-w-[200px]">Asigna un furgón al mecánico para ver su inventario abordo.</p>
                                </div>
                            )}
                        </motion.div>
                    )}

                    {/* ----------------- TAB: LIVE STOCK (BODEGA MÓVIL) ----------------- */}
                    {activeTab === 'stock' && (
                        <motion.div
                            key="stock"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-8"
                        >
                            {!ot.vehicle ? (
                                <div className="p-6 border border-dashed border-white/10 rounded-[2rem] text-center mt-10">
                                    <p className="text-sm text-slate-500 font-medium">Requiere un vehículo asignado.</p>
                                </div>
                            ) : (
                                <>
                                    {/* Insumos */}
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                            <PackageSearch className="w-4 h-4" /> Insumos Abordo <span className="bg-white/10 text-slate-300 px-2 py-0.5 rounded-full text-[10px]">{liveStock.length}</span>
                                        </h3>
                                        <div className="space-y-2">
                                            {liveStock.map((item: any, idx: number) => (
                                                <div key={idx} className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-3 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 transition-colors">
                                                    <div className="flex items-start gap-3">
                                                        {item.isSensitive && <ShieldAlert className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />}
                                                        <div>
                                                            <p className="text-sm font-bold text-slate-200">{item.name}</p>
                                                            <p className="text-[10px] text-slate-500 font-mono mt-0.5">{item.sku}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-baseline gap-1 bg-black/40 px-3 py-1.5 rounded-xl border border-white/5 self-start sm:self-auto">
                                                        <span className="text-lg font-black text-indigo-400">{item.qty}</span>
                                                        <span className="text-[10px] font-bold text-slate-500 uppercase">{item.unit}</span>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Herramientas Críticas */}
                                    <div>
                                        <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 flex items-center gap-2">
                                            <Hammer className="w-4 h-4" /> Herramientas Asignadas <span className="bg-white/10 text-slate-300 px-2 py-0.5 rounded-full text-[10px]">{liveTools.length}</span>
                                        </h3>
                                        <div className="space-y-2">
                                            {liveTools.map((tool: any, idx: number) => (
                                                <div key={idx} className="flex flex-col p-3 bg-white/5 border border-white/5 rounded-2xl">
                                                    <p className="text-sm font-bold text-slate-200 truncate">{tool.name}</p>
                                                    <div className="flex items-center justify-between mt-2">
                                                        <p className="text-[10px] text-slate-500 font-mono bg-black px-2 py-0.5 rounded-md">{tool.serial}</p>
                                                        {tool.status === 'OK' ? (
                                                            <span className="text-[10px] font-bold text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3 h-3" /> OK</span>
                                                        ) : (
                                                            <span className="text-[10px] font-bold text-amber-500 flex items-center gap-1"><Battery className="w-3 h-3" /> {tool.status}</span>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}

                    {/* ----------------- TAB: IA PRE-ASIGNACIÓN ----------------- */}
                    {activeTab === 'ai' && (
                        <motion.div
                            key="ai"
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            className="space-y-6 h-full flex flex-col"
                        >
                            {!ot.vehicle ? (
                                <div className="p-6 border border-dashed border-white/10 rounded-[2rem] text-center mt-10">
                                    <Sparkles className="w-8 h-8 mx-auto text-fuchsia-500 mb-3 opacity-50" />
                                    <p className="text-sm text-slate-400 font-medium max-w-[200px] mx-auto">Asigna un vehículo para que la IA calcule el diferencial de stock exacto.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="bg-fuchsia-500/10 border border-fuchsia-500/20 p-4 rounded-2xl">
                                        <p className="text-xs text-fuchsia-300 leading-relaxed font-medium">
                                            <strong className="text-fuchsia-400 font-black">Gemini Analytics:</strong> Para este código de falla, el récord histórico indica el uso de las siguientes partes. El furgón actual <strong>PYKD-75</strong> no cuenta con el stock suficiente.
                                        </p>
                                    </div>

                                    {aiLoading ? (
                                        <div className="flex-1 flex flex-col items-center justify-center p-6 text-fuchsia-400">
                                            <Loader2 className="w-8 h-8 animate-spin mb-4" />
                                            <p className="font-bold text-sm tracking-widest uppercase">Analizando Históricos...</p>
                                        </div>
                                    ) : aiData && aiData.length > 0 ? (
                                        <div className="flex-1 space-y-3">
                                            {aiData.map((item, idx) => (
                                                <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-2xl relative overflow-hidden group hover:border-fuchsia-500/40 transition-colors">
                                                    <div className="absolute top-0 left-0 w-1 h-full bg-fuchsia-500" />
                                                    <div className="flex justify-between items-start gap-4">
                                                        <div className="flex-1">
                                                            <h4 className="font-bold text-white text-sm">{item.name}</h4>
                                                            <p className="text-[10px] font-mono text-slate-500 mt-1">{item.sku}</p>
                                                            <p className="text-[10px] text-fuchsia-400/80 mt-2 leading-relaxed italic border-l-2 border-fuchsia-500/30 pl-2">
                                                                "{item.reason}"
                                                            </p>
                                                        </div>
                                                        <div className="text-right shrink-0">
                                                            <p className="text-[10px] font-black uppercase text-slate-500 mb-1 tracking-widest">Sugerido</p>
                                                            <div className="text-2xl font-black text-white bg-white/10 px-3 py-1 rounded-xl">+{item.suggestedQty}</div>
                                                            <p className="text-[9px] text-rose-400 mt-1 font-bold">Bodega Móvil: {item.currentStock}</p>
                                                        </div>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <div className="flex-1 flex items-center justify-center p-6 border border-dashed border-white/10 rounded-2xl">
                                            <p className="text-xs text-slate-500 max-w-[200px] text-center">La IA determinó que el furgón cuenta con stock suficiente para atender las estadísticas probables de esta OT.</p>
                                        </div>
                                    )}

                                    {/* Action Button */}
                                    <div className="pt-4 mt-auto border-t border-white/10">
                                        <button className="w-full relative group overflow-hidden rounded-2xl p-[1px]">
                                            <span className="absolute inset-0 bg-gradient-to-r from-violet-600 via-fuchsia-600 to-rose-600 rounded-2xl" />
                                            <div className="relative bg-black/50 backdrop-blur-sm px-6 py-4 rounded-2xl flex items-center justify-center gap-3 transition-all group-hover:bg-transparent">
                                                <PackageSearch className="w-5 h-5 text-white" />
                                                <span className="font-black text-sm uppercase tracking-widest text-white text-shadow-sm">Traspasar a Furgón</span>
                                            </div>
                                        </button>
                                        <p className="text-center text-[9px] text-slate-500 mt-3 uppercase tracking-widest font-bold">Generará 2 Movimientos de Inventario</p>
                                    </div>
                                </>
                            )}
                        </motion.div>
                    )}

                </AnimatePresence>
            </div>
        </section>
    );
}
