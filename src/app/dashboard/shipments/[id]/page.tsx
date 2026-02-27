import { getShipmentById } from "../actions";
import { requireRole } from "@/lib/auth";
import {
    Package, Truck, Calendar, User,
    ArrowLeft, FileText, CheckCircle2,
    Hash, Layers, Clock
} from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { es } from "date-fns/locale";
import { notFound } from "next/navigation";

export default async function ShipmentDetailPage({ params }: { params: { id: string } }) {
    await requireRole("SUPERVISOR");
    const shipment = await getShipmentById(params.id);

    if (!shipment) {
        notFound();
    }

    return (
        <div className="max-w-5xl mx-auto space-y-8 p-4 md:p-8">
            {/* Header / Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4">
                    <Link
                        href="/dashboard/shipments"
                        className="p-3 rounded-2xl bg-white/5 border border-white/10 text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                    >
                        <ArrowLeft size={20} />
                    </Link>
                    <div>
                        <div className="flex items-center gap-2 mb-1">
                            <span className="px-2 py-0.5 rounded-md bg-blue-500/10 text-blue-400 text-[10px] font-black uppercase tracking-tighter ring-1 ring-blue-500/20">
                                Recepción Confirmada
                            </span>
                        </div>
                        <h2 className="text-3xl font-black uppercase tracking-tight text-white flex items-center gap-3">
                            Guía <span className="text-blue-500">#{shipment.dispatch_note_number}</span>
                        </h2>
                    </div>
                </div>

                <div className="flex items-center gap-3 px-6 py-4 rounded-[2rem] bg-emerald-500/10 border border-emerald-500/20">
                    <CheckCircle2 className="text-emerald-500" size={24} />
                    <div>
                        <p className="text-[10px] font-black text-emerald-500/60 uppercase tracking-widest">Estado</p>
                        <p className="text-sm font-black text-emerald-500 uppercase">Stock Ingresado</p>
                    </div>
                </div>
            </div>

            {/* Info Cards */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] relative overflow-hidden">
                    <Truck className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 -rotate-12" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Proveedor</p>
                    <p className="text-xl font-black text-white uppercase truncate relative z-10">{shipment.supplier_name || "Sin identificar"}</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] relative overflow-hidden">
                    <Calendar className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 -rotate-12" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Fecha de Recepción</p>
                    <p className="text-xl font-black text-white relative z-10">
                        {format(new Date(shipment.created_at), "dd 'de' MMMM, yyyy", { locale: es })}
                    </p>
                    <p className="text-xs text-slate-500 font-mono mt-1">{format(new Date(shipment.created_at), "HH:mm 'hrs'")}</p>
                </div>

                <div className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] relative overflow-hidden">
                    <User className="absolute -right-4 -bottom-4 w-24 h-24 text-white/5 -rotate-12" />
                    <p className="text-[10px] font-black text-slate-500 uppercase tracking-widest mb-4">Recibido por</p>
                    <p className="text-xl font-black text-white uppercase relative z-10">
                        {shipment.recipient?.full_name || "Sistema"}
                    </p>
                </div>
            </div>

            {/* Items Table */}
            <div className="bg-white/5 border border-white/10 rounded-[3rem] overflow-hidden">
                <div className="px-8 py-6 border-b border-white/5 flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <Layers className="text-blue-500" size={20} />
                        <h3 className="font-black uppercase tracking-tight text-white">Insumos Detallados</h3>
                    </div>
                    <span className="px-4 py-1 rounded-full bg-white/5 text-slate-400 text-xs font-bold ring-1 ring-white/10">
                        {shipment.items.length} productos
                    </span>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                            <tr>
                                <th className="px-8 py-5">Producto / Repuesto</th>
                                <th className="px-8 py-5 text-center">Código / SKU</th>
                                <th className="px-8 py-5 text-center">Cant. Recibida</th>
                                <th className="px-8 py-5 text-right">Precio Ref.</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-white/5">
                            {shipment.items.map((item: any) => (
                                <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                                    <td className="px-8 py-6">
                                        <div className="flex items-center gap-4">
                                            <div className="w-12 h-12 rounded-2xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover:scale-110 transition-transform">
                                                <Package size={22} />
                                            </div>
                                            <div>
                                                <p className="text-sm font-black uppercase text-white group-hover:text-blue-400 transition-colors">
                                                    {item.product?.name || "Producto desconocido"}
                                                </p>
                                                <p className="text-[10px] text-slate-500 font-mono mt-0.5 uppercase">
                                                    {item.product?.unit || "Unidad"}
                                                </p>
                                            </div>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <span className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/10 text-xs font-mono text-slate-400">
                                            {item.product?.sku || item.product?.barcode || "S/N"}
                                        </span>
                                    </td>
                                    <td className="px-8 py-6 text-center">
                                        <div className="flex flex-col items-center">
                                            <span className="text-xl font-black text-white">{item.received_qty}</span>
                                            <span className="text-[10px] font-black text-emerald-500 uppercase tracking-tighter">Verificado</span>
                                        </div>
                                    </td>
                                    <td className="px-8 py-6 text-right">
                                        <p className="text-sm font-bold text-slate-400">
                                            {item.unit_price > 0 ? `$${item.unit_price.toLocaleString()}` : "---"}
                                        </p>
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                <div className="px-8 py-8 bg-white/5 border-t border-white/5">
                    <div className="flex flex-col md:flex-row items-center gap-6 justify-between opacity-50">
                        <div className="flex items-center gap-2 text-xs font-medium text-slate-400">
                            <Clock size={14} />
                            Procesado con IA - Gemini Flash 1.5
                        </div>
                        <div className="flex items-center gap-3">
                            <Hash size={14} className="text-slate-500" />
                            <span className="text-[10px] font-mono text-slate-500">{shipment.id}</span>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
