"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, ArrowRightLeft, PackageOpen, Wrench, Search, Building2, Truck } from "lucide-react";
import { initiateTransfer } from "@/app/dashboard/inventory/transfer-actions";

interface Warehouse {
    id: string;
    name: string;
    type: string;
}

interface TransferInitiationModalProps {
    isOpen: boolean;
    onClose: () => void;
    warehouses: Warehouse[];
    fromWarehouseId: string;
    // Preelected item if triggered from a specific row
    preSelectedType?: "CONSUMABLE" | "TOOL";
    preSelectedId?: string;
    preSelectedName?: string;
    maxQuantity?: number;
}

export function TransferInitiationModal({
    isOpen,
    onClose,
    warehouses,
    fromWarehouseId,
    preSelectedType,
    preSelectedId,
    preSelectedName,
    maxQuantity
}: TransferInitiationModalProps) {
    const [type, setType] = useState<"CONSUMABLE" | "TOOL">(preSelectedType || "CONSUMABLE");
    const [targetWarehouseId, setTargetWarehouseId] = useState<string>("");
    const [quantity, setQuantity] = useState<number>(1);
    const [isSubmitting, setIsSubmitting] = useState(false);

    // Si no vino preseleccionado, deberíamos mostrar un buscador (Simplificado para este MVP)
    const itemName = preSelectedName || "Item seleccionado";

    const availableWarehouses = warehouses.filter(w => w.id !== fromWarehouseId);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!preSelectedId || !targetWarehouseId) {
            alert("Faltan datos para el traspaso");
            return;
        }

        if (type === "CONSUMABLE" && (quantity <= 0 || (maxQuantity && quantity > maxQuantity))) {
            alert("Cantidad inválida");
            return;
        }

        setIsSubmitting(true);
        try {
            const result = await initiateTransfer({
                type,
                itemId: type === "CONSUMABLE" ? preSelectedId : undefined,
                toolId: type === "TOOL" ? preSelectedId : undefined,
                fromWarehouseId: fromWarehouseId,
                targetWarehouseId,
                quantity: type === "CONSUMABLE" ? quantity : undefined,
            });

            if (result && !result.success) {
                alert(result.error || "Error al procesar el traspaso");
                return;
            }

            alert("Traspaso enviado exitosamente. Esperando confirmación del receptor.");
            onClose();
        } catch (error: any) {
            alert(error.message || "Error al procesar el traspaso");
        } finally {
            setIsSubmitting(false);
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
                    className="absolute inset-0 bg-black/60 backdrop-blur-sm"
                    onClick={onClose}
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-md bg-zinc-900 border border-orange-500/30 rounded-2xl shadow-2xl overflow-hidden"
                >
                    <div className="p-6 border-b border-white/5 flex justify-between items-center bg-zinc-800/50">
                        <div className="flex items-center gap-3">
                            <div className="p-2 bg-orange-500/20 rounded-lg text-orange-400">
                                <ArrowRightLeft className="w-6 h-6" />
                            </div>
                            <h2 className="text-xl font-bold text-white">Traspaso Express</h2>
                        </div>
                        <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <form onSubmit={handleSubmit} className="p-6 space-y-6">

                        {/* Lo que se va a enviar */}
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">¿Qué vas a enviar?</label>
                            <div className="flex items-center gap-3 p-4 bg-zinc-800 rounded-xl border border-white/5">
                                {type === "CONSUMABLE" ? <PackageOpen className="w-6 h-6 text-blue-400" /> : <Wrench className="w-6 h-6 text-purple-400" />}
                                <div>
                                    <p className="text-white font-medium">{itemName}</p>
                                    {type === "CONSUMABLE" && maxQuantity && (
                                        <p className="text-xs text-green-400">Disponible: {maxQuantity}</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {type === "CONSUMABLE" && (
                            <div className="space-y-2">
                                <label className="text-sm font-medium text-gray-400">Cantidad a enviar</label>
                                <input
                                    type="number"
                                    min="1"
                                    max={maxQuantity || 9999}
                                    value={quantity}
                                    onChange={(e) => setQuantity(Number(e.target.value))}
                                    className="w-full bg-zinc-950 border border-white/10 rounded-xl p-4 text-white text-lg focus:outline-none focus:border-orange-500/50 transition-colors"
                                />
                            </div>
                        )}

                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-400">¿A qué Bodega lo enviarás?</label>
                            <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                                {availableWarehouses.map(w => (
                                    <button
                                        key={w.id}
                                        type="button"
                                        onClick={() => setTargetWarehouseId(w.id)}
                                        className={`flex items-center gap-3 p-3 rounded-xl border text-left transition-all ${targetWarehouseId === w.id
                                            ? 'bg-orange-500/20 border-orange-500/50 text-white'
                                            : 'bg-zinc-800 border-white/5 text-gray-400 hover:bg-zinc-700'
                                            }`}
                                    >
                                        {w.type === "MOBILE" ? <Truck className="w-5 h-5" /> : <Building2 className="w-5 h-5" />}
                                        <div className="flex-1">
                                            <p className="font-medium">{w.name}</p>
                                            <p className="text-xs opacity-70">{w.type === "MOBILE" ? "Furgón en Terreno" : "Bodega Fija"}</p>
                                        </div>
                                    </button>
                                ))}
                            </div>
                        </div>

                        <button
                            type="submit"
                            disabled={isSubmitting || !targetWarehouseId}
                            className="w-full py-4 rounded-xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 text-white font-bold text-lg shadow-[0_0_20px_rgba(249,115,22,0.3)] transition-all disabled:opacity-50 disabled:grayscale flex justify-center items-center gap-2"
                        >
                            {isSubmitting ? "Enviando Traspaso..." : <><ArrowRightLeft className="w-6 h-6" /> Deslizar para Enviar</>}
                        </button>
                    </form>
                </motion.div>
            </div>
        </AnimatePresence>
    );
}
