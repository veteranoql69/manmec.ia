"use client";

import { motion, AnimatePresence } from "framer-motion";
import { Clock, PackageOpen, Wrench, ArrowRightLeft } from "lucide-react";

interface Transfer {
    id: string;
    item?: { name: string; sku: string };
    tool?: { name: string; serial_number: string };
    quantity?: number;
    receiver: { full_name: string };
    to_warehouse: { name: string };
    created_at: string;
}

export function SentTransfersAlert({
    transfers
}: {
    transfers: Transfer[]
}) {
    if (transfers.length === 0) return null;

    return (
        <div className="mb-6 space-y-3">
            <h3 className="text-sm font-semibold text-gray-400 flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-blue-400" />
                TRASPASOS ENVIADOS PENDIENTES DE RECEPCIÓN ({transfers.length})
            </h3>

            <div className="flex flex-col gap-3">
                <AnimatePresence>
                    {transfers.map((t) => (
                        <motion.div
                            key={t.id}
                            initial={{ opacity: 0, scale: 0.98 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, height: 0 }}
                            className="bg-zinc-800/80 border border-blue-500/30 p-4 rounded-xl flex flex-col sm:flex-row gap-4 justify-between items-center shadow-[0_0_15px_rgba(59,130,246,0.1)]"
                        >
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-full bg-blue-500/20 flex items-center justify-center text-blue-400 shrink-0">
                                    {t.item ? <PackageOpen className="w-6 h-6" /> : <Wrench className="w-6 h-6" />}
                                </div>
                                <div>
                                    <p className="text-white font-medium text-lg">
                                        {t.item ? `${t.quantity}x ${t.item.name}` : `Herramienta: ${t.tool?.name}`}
                                    </p>
                                    <p className="text-sm text-gray-400">
                                        Destino: <span className="text-gray-300">{t.to_warehouse.name}</span>
                                    </p>
                                </div>
                            </div>

                            <div className="flex gap-2 w-full sm:w-auto items-center text-blue-400 font-medium px-4 py-2 bg-blue-500/10 rounded-lg">
                                <Clock className="w-5 h-5 animate-pulse" />
                                Esperando confirmación de {t.receiver?.full_name || "Receptor"}
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>
        </div>
    );
}
