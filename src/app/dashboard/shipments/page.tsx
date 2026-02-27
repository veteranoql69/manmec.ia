import { requireRole } from "@/lib/auth";
import { getShipments } from "./actions";
import { Package, Truck, Calendar, User, ChevronRight, Plus } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function ShipmentsPage() {
    await requireRole("SUPERVISOR");
    const shipments = await getShipments();

    return (
        <div className="max-w-6xl mx-auto space-y-8">
            <div className="flex items-center justify-between">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                        Historial de <span className="text-blue-500">Recepciones</span>
                    </h2>
                    <p className="text-slate-400 font-medium text-sm mt-1">Registro de guías de despacho procesadas por IA.</p>
                </div>
                <Link
                    href="/dashboard/shipments/new"
                    className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all shadow-lg shadow-blue-900/20"
                >
                    <Plus className="w-4 h-4" /> Nueva Recepción
                </Link>
            </div>

            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            <tr>
                                <th className="px-8 py-5">Fecha / Hora</th>
                                <th className="px-8 py-5">Guía Nº</th>
                                <th className="px-8 py-5">Pedido</th>
                                <th className="px-8 py-5">Proveedor</th>
                                <th className="px-8 py-5">Recibido por</th>
                                <th className="px-8 py-5">Ítems</th>
                                <th className="px-8 py-5 text-right">Acción</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {shipments.length === 0 ? (
                                <tr>
                                    <td colSpan={6} className="px-8 py-20 text-center">
                                        <div className="flex flex-col items-center gap-4 text-slate-500">
                                            <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center">
                                                <Truck className="w-8 h-8 opacity-20" />
                                            </div>
                                            <p className="text-sm font-medium">No hay guías registradas todavía.</p>
                                        </div>
                                    </td>
                                </tr>
                            ) : (
                                shipments.map((s) => (
                                    <tr key={s.id} className="group hover:bg-white/[0.02] transition-colors relative">
                                        <td className="px-8 py-5 whitespace-nowrap">
                                            <div className="flex items-center gap-3">
                                                <Calendar className="w-4 h-4 text-slate-500" />
                                                <div>
                                                    <p className="text-sm font-bold text-white">
                                                        {format(new Date(s.created_at), "dd 'de' MMMM", { locale: es })}
                                                    </p>
                                                    <p className="text-[10px] text-slate-500">
                                                        {format(new Date(s.created_at), "HH:mm 'hrs'")}
                                                    </p>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="px-3 py-1 rounded-lg bg-blue-500/10 text-blue-400 font-mono text-sm font-bold">
                                                {s.dispatch_note_number}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-mono text-slate-400">
                                            {s.order_number || "---"}
                                        </td>
                                        <td className="px-8 py-5 text-sm font-bold text-slate-300 uppercase">
                                            {s.supplier_name || "N/A"}
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-2">
                                                <div className="w-6 h-6 rounded-full bg-emerald-500/20 flex items-center justify-center">
                                                    <User className="w-3 h-3 text-emerald-500" />
                                                </div>
                                                <span className="text-xs font-medium text-slate-400">
                                                    {s.recipient?.full_name || "Sistema"}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-sm font-black text-white">
                                            {s.items?.[0]?.count || 0} items
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <Link
                                                href={`/dashboard/shipments/${s.id}`}
                                                className="text-slate-500 hover:text-white transition-colors"
                                            >
                                                <ChevronRight className="w-5 h-5 ml-auto" />
                                            </Link>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
}
