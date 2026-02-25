"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Truck, Hash, Gauge, Calendar, Fingerprint } from "lucide-react";
import { Vehicle, upsertVehicle } from "@/app/dashboard/fleet/actions";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    vehicle: Vehicle | null;
    onSuccess: (vehicle: Vehicle) => void;
}

export function VehicleModal({ isOpen, onClose, vehicle, onSuccess }: Props) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<Vehicle>>({
        plate: "",
        brand: "",
        model: "",
        year: new Date().getFullYear(),
        vin: "",
        last_mileage: 0,
        is_active: true
    });

    useEffect(() => {
        if (vehicle) {
            setFormData(vehicle);
        }
    }, [vehicle]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await upsertVehicle(formData);
            if (result.success) {
                // Generar un ID temporal si es nuevo (id será UUID en la DB)
                // Pero idealmente el server action retornaría el objeto creado
                // Por ahora usamos lo que tenemos y confiamos en el revalidatePath
                // Para efectos de UI inmediata, pasamos el formData
                onSuccess({ ...formData, id: vehicle?.id || Math.random().toString() } as Vehicle);
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
                                    <Truck className="w-5 h-5" />
                                </div>
                                <h2 className="text-2xl font-black tracking-tight uppercase">
                                    {vehicle ? 'Editar Vehículo' : 'Nuevo Vehículo'}
                                </h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1 flex items-center gap-1">
                                        <Hash className="w-3 h-3" /> Patente
                                    </label>
                                    <input
                                        required
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 uppercase font-black"
                                        placeholder="AAAA-00"
                                        value={formData.plate}
                                        onChange={e => setFormData({ ...formData, plate: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1 flex items-center gap-1">
                                        <Calendar className="w-3 h-3" /> Año
                                    </label>
                                    <input
                                        type="number"
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        value={formData.year || ""}
                                        onChange={e => setFormData({ ...formData, year: Number(e.target.value) })}
                                    />
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Marca</label>
                                    <input
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="Ej: Peugeot"
                                        value={formData.brand || ""}
                                        onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Modelo</label>
                                    <input
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="Ej: Partner"
                                        value={formData.model || ""}
                                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1 flex items-center gap-1">
                                    <Fingerprint className="w-3 h-3" /> VIN / N° Chasis
                                </label>
                                <input
                                    className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono tracking-widest uppercase"
                                    placeholder="VIN del vehículo..."
                                    value={formData.vin || ""}
                                    onChange={e => setFormData({ ...formData, vin: e.target.value })}
                                />
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1 flex items-center gap-1">
                                    <Gauge className="w-3 h-3" /> Kilometraje Actual
                                </label>
                                <input
                                    type="number"
                                    className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                    value={formData.last_mileage || 0}
                                    onChange={e => setFormData({ ...formData, last_mileage: Number(e.target.value) })}
                                />
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
                                        {vehicle ? 'Guardar Cambios' : 'Confirmar Registro'}
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
