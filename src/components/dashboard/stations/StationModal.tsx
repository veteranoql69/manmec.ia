"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, MapPin, Navigation, User, Phone, AlertTriangle } from "lucide-react";
import { ServiceStation, upsertServiceStation } from "@/app/dashboard/stations/actions";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    station: ServiceStation | null;
    onSuccess: (station: ServiceStation) => void;
}

export function StationModal({ isOpen, onClose, station, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<ServiceStation>>({
        name: "",
        code: "",
        address: "",
        latitude: null,
        longitude: null,
        manager_name: "",
        manager_phone: "",
        is_active: true
    });
    const [error, setError] = useState<string | null>(null);
    useEffect(() => {
        if (station) {
            setFormData(station);
        }
    }, [station]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        setError(null);
        try {
            const result = await upsertServiceStation(formData);
            if (result.success) {
                // Para efectos de UI inmediata, pasamos el formData
                onSuccess({ ...formData, id: station?.id || Math.random().toString() } as ServiceStation);
                onClose();
            } else if (result.error) {
                setError(result.error);
            }
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Error desconocido al guardar la estación");
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/80 backdrop-blur-sm"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-lg bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
                >
                    <div className="p-8">
                        <div className="flex justify-between items-center mb-8">
                            <div className="flex items-center gap-3">
                                <div className="w-10 h-10 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20">
                                    <MapPin className="w-5 h-5" />
                                </div>
                                <h2 className="text-2xl font-black tracking-tight uppercase">
                                    {station ? 'Editar Estación' : 'Nueva Estación'}
                                </h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        {error && (
                            <div className="mb-6 p-4 bg-red-500/10 border border-red-500/20 rounded-2xl flex items-center gap-3 text-red-400 text-xs font-bold">
                                <AlertTriangle className="w-4 h-4 shrink-0" />
                                {error}
                            </div>
                        )}

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="md:col-span-2 space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Nombre de la Estación</label>
                                    <input
                                        required
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="Ej: EDS Central Sur"
                                        value={formData.name || ""}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Código Estación (Jerga)</label>
                                    <input
                                        disabled={!!station}
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="Ej: 20014"
                                        value={formData.code || ""}
                                        onChange={e => setFormData({ ...formData, code: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Código SAP (Tienda)</label>
                                    <input
                                        disabled={!!station}
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono disabled:opacity-50 disabled:cursor-not-allowed"
                                        placeholder="2003"
                                        value={formData.sap_store_code || ""}
                                        onChange={e => setFormData({ ...formData, sap_store_code: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Marca</label>
                                    <input
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="Pronto / Punto"
                                        value={formData.brand || ""}
                                        onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Segmento</label>
                                    <input
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="Carretera / Urbano"
                                        value={formData.segment || ""}
                                        onChange={e => setFormData({ ...formData, segment: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2 col-span-2 md:col-span-1">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Sistema POS</label>
                                    <input
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="Sckuba..."
                                        value={formData.pos_system || ""}
                                        onChange={e => setFormData({ ...formData, pos_system: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1 flex items-center gap-1">
                                    <Navigation className="w-3 h-3" /> Dirección
                                </label>
                                <input
                                    className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    placeholder="Calle #123, Comuna..."
                                    value={formData.address || ""}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1 flex items-center gap-1">
                                        <User className="w-3 h-3" /> Jefe de EDS
                                    </label>
                                    <input
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="Nombre del jefe"
                                        value={formData.manager_name || ""}
                                        onChange={e => setFormData({ ...formData, manager_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1 flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> Teléfono Jefe
                                    </label>
                                    <input
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="+56 9..."
                                        value={formData.manager_phone || ""}
                                        onChange={e => setFormData({ ...formData, manager_phone: e.target.value })}
                                    />
                                </div>
                            </div>

                            <button
                                disabled={loading}
                                className="w-full bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] mt-4"
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        {station ? 'Guardar Cambios' : 'Registrar Estación'}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
