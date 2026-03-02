"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, Save, Warehouse, Navigation, Truck } from "lucide-react";
import { Warehouse as WarehouseType, upsertWarehouse } from "@/app/dashboard/warehouses/actions";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    warehouse: WarehouseType | null;
    onSuccess: (warehouse: WarehouseType) => void;
    availableVehicles: { id: string; plate: string }[];
}

export function WarehouseModal({ isOpen, onClose, warehouse, onSuccess, availableVehicles }: Props) {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState<Partial<WarehouseType>>({
        name: "",
        address: "",
        is_active: true,
        type: "FIXED",
        vehicle_id: null
    });

    useEffect(() => {
        if (warehouse) {
            setFormData(warehouse);
        }
    }, [warehouse]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            const result = await upsertWarehouse(formData);
            if (result.success) {
                onSuccess({ ...formData, id: warehouse?.id || Math.random().toString() } as WarehouseType);
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
                                <div className="w-10 h-10 rounded-2xl bg-emerald-600/20 flex items-center justify-center text-emerald-400 border border-emerald-500/20">
                                    <Warehouse className="w-5 h-5" />
                                </div>
                                <h2 className="text-2xl font-black tracking-tight uppercase">
                                    {warehouse ? 'Editar Bodega' : 'Nueva Bodega'}
                                </h2>
                            </div>
                            <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full transition-colors text-slate-500">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-6">
                            {/* Tipo de Bodega Switch */}
                            <div className="flex bg-black border border-white/10 rounded-2xl p-1 mb-6">
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'FIXED', vehicle_id: null })}
                                    disabled={!!warehouse} // Bloquear cambio de tipo al editar
                                    className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${formData.type === 'FIXED' ? 'bg-emerald-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'} ${!!warehouse ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Warehouse className="w-4 h-4" /> Bodega Fija
                                </button>
                                <button
                                    type="button"
                                    onClick={() => setFormData({ ...formData, type: 'MOBILE' })}
                                    disabled={!!warehouse} // Bloquear cambio de tipo al editar
                                    className={`flex-1 py-2 rounded-xl text-sm font-bold flex items-center justify-center gap-2 transition-all ${formData.type === 'MOBILE' ? 'bg-blue-600 text-white shadow-lg' : 'text-slate-400 hover:text-white hover:bg-white/5'} ${!!warehouse ? 'opacity-50 cursor-not-allowed' : ''}`}
                                >
                                    <Truck className="w-4 h-4" /> Bodega Móvil
                                </button>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Nombre de la Bodega</label>
                                <input
                                    required
                                    className={`w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 ${formData.type === 'MOBILE' ? 'focus:ring-blue-500/50' : 'focus:ring-emerald-500/50'}`}
                                    placeholder={formData.type === 'MOBILE' ? "Ej: Furgón Patente AB-CD-12" : "Ej: Bodega Central Pudahuel"}
                                    value={formData.name || ""}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            {formData.type === 'MOBILE' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1 flex items-center gap-1">
                                        <Truck className="w-3 h-3" /> Vehículo Asignado
                                    </label>
                                    <select
                                        required={formData.type === 'MOBILE'}
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none text-white disabled:opacity-50"
                                        value={formData.vehicle_id || ""}
                                        onChange={e => setFormData({ ...formData, vehicle_id: e.target.value })}
                                        disabled={!!warehouse} // Bloquear edición del furgón una vez asignada
                                    >
                                        <option value="" disabled>Selecciona un furgón...</option>
                                        {warehouse && warehouse.vehicle ? (
                                            <option value={warehouse.vehicle_id!}>{warehouse.vehicle.plate || 'Furgón Asignado'}</option>
                                        ) : null}
                                        {availableVehicles.map(v => (
                                            <option key={v.id} value={v.id}>{v.plate}</option>
                                        ))}
                                    </select>
                                    {availableVehicles.length === 0 && !warehouse && (
                                        <p className="text-amber-400 text-xs mt-1">
                                            No hay furgones disponibles sin bodega asignada.
                                        </p>
                                    )}
                                </div>
                            )}

                            {formData.type === 'FIXED' && (
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1 flex items-center gap-1">
                                        <Navigation className="w-3 h-3" /> Ubicación / Dirección
                                    </label>
                                    <input
                                        className="w-full bg-black border border-white/10 rounded-2xl py-3 px-4 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
                                        placeholder="Calle #123, Comuna..."
                                        value={formData.address || ""}
                                        onChange={e => setFormData({ ...formData, address: e.target.value })}
                                    />
                                </div>
                            )}

                            <button
                                disabled={loading || (formData.type === 'MOBILE' && !formData.vehicle_id)}
                                className={`w-full disabled:opacity-50 text-white font-bold py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl active:scale-[0.98] mt-4 ${formData.type === 'MOBILE' ? 'bg-blue-600 hover:bg-blue-500 shadow-blue-900/20' : 'bg-emerald-600 hover:bg-emerald-500 shadow-emerald-900/20'}`}
                            >
                                {loading ? (
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        {warehouse ? 'Guardar Cambios' : 'Registrar Bodega'}
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
