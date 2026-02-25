import { requireRole } from "@/lib/auth";
import { getWorkOrderDetail } from "../actions";
import {
    ChevronLeft,
    MapPin,
    Truck,
    Wrench,
    Clock,
    User,
    AlertTriangle,
    CheckCircle2
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";

interface PageProps {
    params: { id: string };
}

export default async function OTDetailPage({ params }: PageProps) {
    const { id } = params;

    // Validar acceso
    await requireRole("SUPERVISOR");

    let ot;
    try {
        ot = await getWorkOrderDetail(id);
    } catch (e) {
        return notFound();
    }

    return (
        <div className="p-6 md:p-10 min-h-screen bg-[#0a0a0a] text-white">
            <Link
                href="/dashboard/ots"
                className="inline-flex items-center gap-2 text-slate-500 hover:text-white transition-colors mb-8 group"
            >
                <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                Volver al listado
            </Link>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna Principal: Detalle de la OT */}
                <div className="lg:col-span-2 space-y-8">
                    <header className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-md relative overflow-hidden">
                        <div className={`absolute top-0 right-0 px-6 py-2 rounded-bl-3xl text-[10px] font-black uppercase tracking-widest ${ot.priority === 'P1' ? 'bg-red-500 text-white' :
                                ot.priority === 'P2' ? 'bg-amber-500 text-black' : 'bg-blue-500 text-white'
                            }`}>
                            Prioridad {ot.priority}
                        </div>

                        <div className="flex items-center gap-3 mb-4">
                            <span className="text-sm font-mono font-black text-blue-500 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                                {ot.code || "OT-PENDIENTE"}
                            </span>
                            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded border ${ot.status === 'COMPLETED' ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20' :
                                    ot.status === 'IN_PROGRESS' ? 'bg-blue-500/10 text-blue-500 border-blue-500/20' :
                                        'bg-white/10 text-slate-400 border-white/5'
                                }`}>
                                {ot.status}
                            </span>
                        </div>

                        <h1 className="text-4xl font-black tracking-tight uppercase mb-4 italic">
                            {ot.title}
                        </h1>
                        <p className="text-slate-400 leading-relaxed text-lg max-w-2xl">
                            {ot.description || "Sin descripción adicional proporcionada."}
                        </p>
                    </header>

                    {/* Información de la Estación */}
                    <section className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-md">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <MapPin className="text-blue-500" /> Ubicación de Servicio
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1">Punto de Venta</p>
                                    <p className="text-lg font-bold">{ot.station?.name || "N/A"}</p>
                                    <p className="text-sm text-slate-400">{ot.station?.address || "Sin dirección"}</p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="p-4 bg-black/40 border border-white/5 rounded-2xl">
                                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-1">Contacto en Sitio</p>
                                    <p className="text-md font-bold">{ot.station?.contact_name || "N/A"}</p>
                                    <p className="text-sm text-slate-400">{ot.station?.contact_phone || "N/A"}</p>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Columna Lateral: Recursos Asignados */}
                <div className="space-y-8">
                    {/* Vehículo Asignado */}
                    <section className="bg-gradient-to-br from-blue-600/20 to-indigo-600/5 border border-blue-500/20 p-8 rounded-[2.5rem] relative overflow-hidden group">
                        <div className="absolute right-[-20px] top-[-20px] opacity-10 group-hover:opacity-20 transition-opacity">
                            <Truck className="w-32 h-32" />
                        </div>
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-3">
                            <Truck className="text-blue-400 w-5 h-5" /> Vehículo en Ruta
                        </h3>
                        {ot.vehicle ? (
                            <div className="space-y-4">
                                <div className="bg-black/40 p-4 rounded-2xl border border-white/5 backdrop-blur-md">
                                    <p className="text-[10px] font-black tracking-widest text-blue-400 uppercase mb-1">Patente</p>
                                    <p className="text-2xl font-black uppercase font-mono">{ot.vehicle.plate}</p>
                                    <p className="text-xs text-slate-400 mt-1">{ot.vehicle.brand} {ot.vehicle.model}</p>
                                </div>
                                <div className="bg-emerald-500/10 p-4 rounded-2xl border border-emerald-500/20 flex items-center gap-3">
                                    <Clock className="w-4 h-4 text-emerald-400" />
                                    <div>
                                        <p className="text-[10px] font-bold uppercase text-emerald-400 tracking-widest leading-none">Último Reporte</p>
                                        <p className="text-xs font-bold mt-1 uppercase">En posición de servicio</p>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-6 border border-dashed border-white/10 rounded-2xl text-center">
                                <AlertTriangle className="w-8 h-8 mx-auto text-slate-700 mb-2" />
                                <p className="text-xs text-slate-500 font-medium">Sin vehículo asignado aún</p>
                            </div>
                        )}
                    </section>

                    {/* Herramientas a Bordo (REQUERIMIENTO PRINCIPAL) */}
                    <section className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-md">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-3">
                            <Wrench className="text-slate-400 w-5 h-5" /> Herramientas a Bordo
                        </h3>

                        {ot.tools && ot.tools.length > 0 ? (
                            <div className="space-y-3">
                                {ot.tools.map((tool: any) => (
                                    <div key={tool.id} className="flex items-center gap-4 p-3 bg-white/[0.02] border border-white/5 rounded-2xl group hover:border-blue-500/30 transition-all">
                                        <div className="w-10 h-10 rounded-xl bg-black flex items-center justify-center border border-white/5 text-slate-500 group-hover:text-blue-400 transition-colors">
                                            <Wrench className="w-5 h-5" />
                                        </div>
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-xs font-bold text-slate-200 truncate uppercase">{tool.name}</p>
                                            <p className="text-[9px] font-mono text-slate-500 uppercase tracking-tighter">SN: {tool.serial_number}</p>
                                        </div>
                                        <CheckCircle2 className="w-4 h-4 text-emerald-500/50" />
                                    </div>
                                ))}
                            </div>
                        ) : (
                            <div className="p-4 bg-white/5 rounded-2xl text-center border border-dashed border-white/10">
                                <p className="text-xs text-slate-500">No se detectaron herramientas serializadas asignadas al furgón.</p>
                            </div>
                        )}
                    </section>

                    {/* Personal Asignado */}
                    <section className="bg-white/5 border border-white/10 p-8 rounded-[2.5rem] backdrop-blur-md">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-3">
                            <User className="text-slate-400 w-5 h-5" /> Técnico Responsable
                        </h3>
                        <div className="flex items-center gap-4">
                            <div className="w-12 h-12 rounded-full bg-slate-800 border-2 border-white/5 flex items-center justify-center text-lg font-bold">
                                {ot.assigned_user?.full_name?.charAt(0) || "?"}
                            </div>
                            <div>
                                <p className="font-bold text-slate-200">{ot.assigned_user?.full_name || "Sin asignar"}</p>
                                <p className="text-[10px] uppercase font-bold text-slate-600 tracking-widest">Mecánico de Turno</p>
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    );
}
