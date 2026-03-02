"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRightLeft, Package, Warehouse, Truck, AlertTriangle } from "lucide-react";
import { transferInventory, Warehouse as WarehouseType } from "@/app/dashboard/warehouses/actions";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    warehouses: WarehouseType[];
    items: any[];
}

export function TransferModal({ isOpen, onClose, warehouses, items }: Props) {
    const [itemId, setItemId] = useState("");
    const [sourceId, setSourceId] = useState("");
    const [destId, setDestId] = useState("");
    const [quantity, setQuantity] = useState("");
    const [notes, setNotes] = useState("");

    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState("");

    // Helpers para desglosar bodegas
    const fixedWarehouses = warehouses.filter(w => w.type === "FIXED" && w.is_active);
    const mobileWarehouses = warehouses.filter(w => w.type === "MOBILE" && w.is_active);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setError("");

        if (!itemId || !sourceId || !destId || !quantity) {
            setError("Todos los campos requeridos deben estar completos.");
            return;
        }

        if (sourceId === destId) {
            setError("La bodega de origen y destino no pueden ser la misma.");
            return;
        }

        setIsLoading(true);
        try {
            await transferInventory({
                itemId,
                sourceWarehouseId: sourceId,
                destinationWarehouseId: destId,
                quantity: Number(quantity),
                notes
            });
            onClose();
        } catch (err: any) {
            console.error(err);
            setError(err.message || "Ocurrió un error al transferir los insumos.");
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="bg-[#0f0f0f] border border-white/10 rounded-3xl w-full max-w-xl overflow-hidden shadow-2xl shadow-black shadow-2xl"
                >
                    <div className="flex items-center justify-between p-6 border-b border-white/5">
                        <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-full bg-emerald-500/10 flex items-center justify-center">
                                <ArrowRightLeft className="w-5 h-5 text-emerald-400" />
                            </div>
                            <div>
                                <h2 className="text-xl font-bold text-white">Traspaso de Insumos</h2>
                                <p className="text-xs text-slate-400">Transfiere stock entre bodegas y furgones</p>
                            </div>
                        </div>
                        <button
                            onClick={onClose}
                            className="p-2 text-slate-400 hover:text-white hover:bg-white/10 rounded-xl transition-colors"
                        >
                            <X className="w-5 h-5" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">
                        {error && (
                            <div className="p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 flex items-start gap-3">
                                <AlertTriangle className="w-5 h-5 shrink-0" />
                                <p className="text-sm font-medium">{error}</p>
                            </div>
                        )}

                        {/* Insumo */}
                        <div className="space-y-2">
                            <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                <Package className="w-4 h-4 text-emerald-500" />
                                Insumo o Repuesto
                            </label>
                            <select
                                required
                                value={itemId}
                                onChange={e => setItemId(e.target.value)}
                                className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 appearance-none text-sm"
                            >
                                <option value="" disabled>Seleccionar ítem a transferir...</option>
                                {items.map(item => (
                                    <option key={item.id} value={item.id}>
                                        {item.sku ? `[${item.sku}] ` : ''}{item.name}
                                    </option>
                                ))}
                            </select>
                        </div>

                        {/* Origen y Destino */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                    <Warehouse className="w-4 h-4 text-amber-500" />
                                    Origen (Retirar de)
                                </label>
                                <select
                                    required
                                    value={sourceId}
                                    onChange={e => setSourceId(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-amber-500/50 appearance-none text-sm"
                                >
                                    <option value="" disabled>Seleccione origen...</option>
                                    <optgroup label="Bodegas Centrales">
                                        {fixedWarehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Furgones en Terreno">
                                        {mobileWarehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.name} ({w.vehicle?.plate})</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-sm font-bold text-slate-300 flex items-center gap-2">
                                    <Truck className="w-4 h-4 text-blue-500" />
                                    Destino (Enviar a)
                                </label>
                                <select
                                    required
                                    value={destId}
                                    onChange={e => setDestId(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 appearance-none text-sm"
                                >
                                    <option value="" disabled>Seleccione destino...</option>
                                    <optgroup label="Furgones en Terreno">
                                        {mobileWarehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.name} ({w.vehicle?.plate})</option>
                                        ))}
                                    </optgroup>
                                    <optgroup label="Bodegas Centrales">
                                        {fixedWarehouses.map(w => (
                                            <option key={w.id} value={w.id}>{w.name}</option>
                                        ))}
                                    </optgroup>
                                </select>
                            </div>
                        </div>

                        {/* Cantidad y Notas */}
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="space-y-2 md:col-span-1">
                                <label className="text-sm font-bold text-slate-300">Cantidad</label>
                                <input
                                    type="number"
                                    min="1"
                                    step="1"
                                    required
                                    placeholder="Ej. 5"
                                    value={quantity}
                                    onChange={e => setQuantity(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm font-bold"
                                />
                            </div>
                            <div className="space-y-2 md:col-span-3">
                                <label className="text-sm font-bold text-slate-300">Detalles o Justificación (Opcional)</label>
                                <input
                                    type="text"
                                    placeholder="Ej. Carga matutina de ruta al Norte"
                                    value={notes}
                                    onChange={e => setNotes(e.target.value)}
                                    className="w-full bg-black/50 border border-white/10 rounded-xl py-3 px-4 text-white focus:outline-none focus:ring-2 focus:ring-emerald-500/50 text-sm"
                                />
                            </div>
                        </div>

                        <div className="pt-6 border-t border-white/5 flex gap-3 justify-end">
                            <button
                                type="button"
                                onClick={onClose}
                                disabled={isLoading}
                                className="px-6 py-3 rounded-xl font-bold hover:bg-white/5 transition-colors text-sm text-slate-300"
                            >
                                Cancelar
                            </button>
                            <button
                                type="submit"
                                disabled={isLoading}
                                className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-3 rounded-xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-emerald-900/20 active:scale-95 disabled:opacity-50 disabled:pointer-events-none text-sm"
                            >
                                {isLoading ? (
                                    <>
                                        <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                                        Transfiriendo...
                                    </>
                                ) : (
                                    <>
                                        Confirmar Traspaso
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
