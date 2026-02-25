"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, MapPin, Navigation, User, Phone } from "lucide-react";
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
        address: "",
        latitude: null,
        longitude: null,
        contact_name: "",
        contact_phone: "",
        is_active: true
    });

    useEffect(() => {
        if (station) {
            setFormData(station);
        }
    }, [station]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await upsertServiceStation(formData);
            if (result.success) {
                // Para efectos de UI inmediata, pasamos el formData
                onSuccess({ ...formData, id: station?.id || Math.random().toString() } as ServiceStation);
                onClose();
            }
        } catch (error) {
            console.error(error);
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

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="space-y-2">
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
                                        <User className="w-3 h-3" /> Contacto
                                    </label>
                                    <input
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="Nombre del encargado"
                                        value={formData.contact_name || ""}
                                        onChange={e => setFormData({ ...formData, contact_name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1 flex items-center gap-1">
                                        <Phone className="w-3 h-3" /> Teléfono
                                    </label>
                                    <input
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="+56 9..."
                                        value={formData.contact_phone || ""}
                                        onChange={e => setFormData({ ...formData, contact_phone: e.target.value })}
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
