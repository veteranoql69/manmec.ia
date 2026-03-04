"use client";

import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle, XCircle, PackageOpen, Wrench, ArrowRightLeft } from "lucide-react";
import { acceptTransfer, rejectTransfer } from "@/app/dashboard/inventory/transfer-actions";
import { useState } from "react";

interface Transfer {
    id: string;
    item?: { name: string; sku: string };
    tool?: { name: string; serial_number: string };
    quantity?: number;
    sender: { full_name: string };
    from_warehouse: { name: string };
    created_at: string;
}

export function PendingTransfersInbox({
    transfers
}: {
    transfers: Transfer[]
}) {
    const [loadingId, setLoadingId] = useState<string | null>(null);

    async function handleAccept(id: string) {
        setLoadingId(id);
        try {
            await acceptTransfer(id);
            alert("Traspaso recibido con éxito. Inventario sumado.");
        } catch (error: any) {
            alert(error.message || "Error al aceptar traspaso.");
        } finally {
            setLoadingId(null);
        }
    }

    async function handleReject(id: string) {
        if (!confirm("¿Seguro que deseas rechazar este traspaso? Los insumos volverán a la bodega de origen.")) return;
        setLoadingId(id);
        try {
            await rejectTransfer(id, "Rechazado en campo");
            alert("Traspaso rechazado.");
        } catch (error: any) {
            alert(error.message || "Error al rechazar traspaso.");
        } finally {
            setLoadingId(null);
        }
    }

    if (transfers.length === 0) return null;

    return (
        <div className="mb-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-orange-400" />
                RECEPCIONES PENDIENTES ({transfers.length})
            </h3>

            <div className="flex flex-col gap-3">
                <AnimatePresence>
                    {transfers.map((t) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-zinc-800/80 border border-orange-500/30 p-4 rounded-xl flex flex-col sm:flex-row gap-4 justify-between items-center shadow-[0_0_15px_rgba(249,115,22,0.1)]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-orange-500/20 flex items-center justify-center text-orange-400 shrink-0">
                                    {t.item ? <PackageOpen className="w-6 h-6" /> : <Wrench className="w-6 h-6" />}
                                </div>
                                <div>
                                    <p className="text-white font-medium text-lg">
                                        {t.item ? `${t.quantity}x ${t.item.name}` : `Herramienta: ${t.tool?.name}`}
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        De: <span className="text-gray-300">{t.sender.full_name}</span> ({t.from_warehouse.name})
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto">
                                <button
                                    onClick={() => handleReject(t.id)}
                                    disabled={loadingId === t.id}
                                    className="flex-1 sm:flex-none px-4 py-2 rounded-lg bg-red-500/10 text-red-500 hover:bg-red-500/20 font-medium flex items-center justify-center gap-2 transition-colors disabled:opacity-50"
                                >
                                    <XCircle className="w-5 h-5" /> Rechazar
                                </button>
                                <button
                                    onClick={() => handleAccept(t.id)}
                                    disabled={loadingId === t.id}
                                    className="flex-1 sm:flex-none px-6 py-2 rounded-lg bg-green-500 hover:bg-green-600 text-white font-semibold flex items-center justify-center gap-2 shadow-[0_0_10px_rgba(34,197,94,0.3)] transition-all disabled:opacity-50"
                                >
                                    {loadingId === t.id ? "Procesando..." : <><CheckCircle className="w-5 h-5" /> Recibir</>}
                                </button>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
