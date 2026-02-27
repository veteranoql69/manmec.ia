import { getStationDetail } from "../actions";
import { notFound } from "next/navigation";
import Link from "next/link";
import {
    ChevronLeft,
    Calendar,
    Wrench,
    Truck,
    Users,
    Clock,
    CheckCircle2,
    AlertCircle,
    Package,
    ArrowRight
} from "lucide-react";
import { format } from "date-fns";
import { es } from "date-fns/locale";

export default async function StationDetailPage({ params }: { params: Promise<{ id: string }> }) {
    const { id } = await params;
    const station = await getStationDetail(id);

    if (!station) {
        notFound();
    }

    return (
        <div className="p-6 md:p-10 min-h-screen bg-[#0a0a0a] text-white">
            {/* Breadcrumb & Header */}
            <div className="mb-10 flex flex-col gap-6">
                <Link
                    href="/dashboard/stations"
                    className="flex items-center gap-2 text-slate-500 hover:text-white transition-colors group w-fit"
                >
                    <ChevronLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
                    <span className="text-xs font-black uppercase tracking-widest">Volver a Estaciones</span>
                </Link>

                <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 pb-8 border-b border-white/5">
                    <div className="space-y-2">
                        <div className="flex items-center gap-3">
                            <h1 className="text-5xl font-black tracking-tighter uppercase italic py-1">
                                {station.name}
                            </h1>
                            <span className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase tracking-widest h-fit">
                                {station.code}
                            </span>
                        </div>
                        <p className="text-slate-400 font-medium flex items-center gap-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500" />
                            {station.address} • {station.commune}
                        </p>
                    </div>

                    <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                        {[
                            { label: 'Segmento', value: station.segment },
                            { label: 'Marca', value: station.brand },
                            { label: 'Formato', value: station.format },
                            { label: 'Sistema POS', value: station.pos_system },
                        ].map((item, i) => (
                            <div key={i} className="bg-white/5 border border-white/10 rounded-2xl p-4 min-w-[120px]">
                                <p className="text-[8px] font-black text-slate-500 uppercase tracking-widest mb-1">{item.label}</p>
                                <p className="text-xs font-bold text-white uppercase">{item.value || 'N/A'}</p>
                            </div>
                        ))}
                    </div>
                </div>
            </div>

            {/* Grid de Contenido */}
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">

                {/* Columna Principal: Historial de OTs */}
                <div className="xl:col-span-2 space-y-8">
                    <div className="flex items-center justify-between mb-2">
                        <h2 className="text-xl font-black uppercase tracking-tight flex items-center gap-3">
                            <div className="w-8 h-8 rounded-xl bg-blue-500/20 flex items-center justify-center">
                                <Wrench className="w-4 h-4 text-blue-400" />
                            </div>
                            Historial de Órdenes de Trabajo
                        </h2>
                        <span className="text-[10px] font-black text-slate-500 uppercase bg-white/5 px-3 py-1 rounded-full border border-white/5">
                            {station.work_orders?.length || 0} Registros
                        </span>
                    </div>

                    <div className="space-y-4">
                        {station.work_orders?.length > 0 ? (
                            station.work_orders.map((ot: any) => (
                                <div
                                    key={ot.id}
                                    className="group relative bg-[#0f0f0f] border border-white/5 rounded-[2rem] overflow-hidden hover:border-blue-500/30 transition-all"
                                >
                                    <div className="p-6 md:p-8">
                                        <div className="flex flex-col md:flex-row gap-6">
                                            {/* OT Meta info */}
                                            <div className="w-full md:w-48 space-y-3">
                                                <div className="flex items-center gap-2">
                                                    <span className={`w-2 h-2 rounded-full ${ot.status === 'COMPLETED' ? 'bg-green-500' : 'bg-yellow-500'}`} />
                                                    <span className="text-[10px] font-black uppercase text-slate-400">{ot.code || 'SIN COD'}</span>
                                                </div>
                                                <div className="text-xs font-bold text-white flex items-center gap-2">
                                                    <Calendar className="w-3 h-3 text-slate-500" />
                                                    {ot.scheduled_date ? format(new Date(ot.scheduled_date), "dd MMM, yyyy", { locale: es }) : '---'}
                                                </div>
                                                <div className={`text-[10px] font-black uppercase px-2 py-1 rounded-lg w-fit ${ot.priority === 'P1' ? 'bg-red-500/10 text-red-400 border border-red-500/20' :
                                                    ot.priority === 'P2' ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20' :
                                                        'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                                                    }`}>
                                                    Prioridad {ot.priority}
                                                </div>
                                            </div>

                                            {/* Content */}
                                            <div className="flex-1 space-y-4">
                                                <div className="flex justify-between items-start">
                                                    <h4 className="text-lg font-black uppercase italic leading-tight group-hover:text-blue-400 transition-colors">
                                                        {ot.title}
                                                    </h4>
                                                    <Link
                                                        href={`/dashboard/work-orders/${ot.id}`}
                                                        className="p-2 bg-white/5 hover:bg-blue-600 rounded-full transition-all group/btn"
                                                    >
                                                        <ArrowRight className="w-4 h-4 group-hover/btn:translate-x-1 transition-transform" />
                                                    </Link>
                                                </div>

                                                <p className="text-sm text-slate-500 line-clamp-2">{ot.description}</p>

                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-4 border-t border-white/5">
                                                    {/* Vehículo y Equipo */}
                                                    <div className="space-y-4">
                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-600 uppercase mb-2 tracking-widest flex items-center gap-1">
                                                                <Truck className="w-2.5 h-2.5" /> Vehículo Asignado
                                                            </p>
                                                            {ot.vehicle ? (
                                                                <div className="bg-white/5 rounded-xl p-3 flex items-center gap-3 border border-white/5">
                                                                    <div className="text-sm font-black text-white">{ot.vehicle.plate}</div>
                                                                    <div className="text-[10px] text-slate-500 uppercase">{ot.vehicle.brand} {ot.vehicle.model}</div>
                                                                </div>
                                                            ) : (
                                                                <span className="text-[10px] text-slate-700 italic font-medium">No asignado</span>
                                                            )}
                                                        </div>

                                                        <div>
                                                            <p className="text-[8px] font-black text-slate-600 uppercase mb-2 tracking-widest flex items-center gap-1">
                                                                <Users className="w-2.5 h-2.5" /> Personal Técnico
                                                            </p>
                                                            <div className="flex flex-wrap gap-2">
                                                                {ot.assignments?.map((as: any) => (
                                                                    <div key={as.id} className="bg-white/5 rounded-lg px-2 py-1 border border-white/5 flex items-center gap-2">
                                                                        <div className="w-1.5 h-1.5 rounded-full bg-blue-500/50" />
                                                                        <span className="text-[9px] font-bold text-slate-300 uppercase">{as.mechanic.full_name}</span>
                                                                    </div>
                                                                ))}
                                                                {(!ot.assignments || ot.assignments.length === 0) && (
                                                                    <span className="text-[10px] text-slate-700 italic font-medium">Sin asignaciones</span>
                                                                )}
                                                            </div>
                                                        </div>
                                                    </div>

                                                    {/* Materiales */}
                                                    <div>
                                                        <p className="text-[8px] font-black text-slate-600 uppercase mb-2 tracking-widest flex items-center gap-1">
                                                            <Package className="w-2.5 h-2.5" /> Materiales e Insumos
                                                        </p>
                                                        <div className="space-y-1.5">
                                                            {ot.materials?.map((mat: any) => (
                                                                <div key={mat.id} className="flex justify-between items-center text-[10px] font-medium bg-white/5 px-3 py-2 rounded-lg border border-white/5">
                                                                    <span className="text-slate-300 uppercase">{mat.item.name}</span>
                                                                    <span className="text-blue-400 font-black">{mat.quantity} {mat.item.unit}</span>
                                                                </div>
                                                            ))}
                                                            {(!ot.materials || ot.materials.length === 0) && (
                                                                <div className="text-[10px] text-slate-700 italic font-medium py-2">Ningún material reportado</div>
                                                            )}
                                                        </div>
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        ) : (
                            <div className="bg-white/5 border border-dashed border-white/10 rounded-[2.5rem] p-12 flex flex-col items-center justify-center text-center">
                                <div className="w-16 h-16 rounded-full bg-white/5 flex items-center justify-center mb-4">
                                    <Clock className="w-8 h-8 text-slate-700" />
                                </div>
                                <h5 className="text-lg font-black uppercase text-slate-400">Sin historial</h5>
                                <p className="text-sm text-slate-600 mt-2 max-w-xs">Esta estación aún no registra visitas técnicas ni órdenes de trabajo ejecutadas.</p>
                            </div>
                        )}
                    </div>
                </div>

                {/* Sidebar: Estadísticas e Info Estática */}
                <div className="space-y-8">
                    {/* Tarjeta de Resumen */}
                    <div className="bg-gradient-to-br from-blue-600 to-blue-800 rounded-[2.5rem] p-8 shadow-2xl shadow-blue-900/20">
                        <h3 className="text-white text-xl font-black uppercase mb-6 italic">Performance EDS</h3>
                        <div className="space-y-6">
                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                <div>
                                    <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Total Visitas</p>
                                    <p className="text-4xl font-black text-white italic">{station.work_orders?.length || 0}</p>
                                </div>
                                <CheckCircle2 className="w-8 h-8 text-white/20" />
                            </div>
                            <div className="flex justify-between items-end border-b border-white/10 pb-4">
                                <div>
                                    <p className="text-[10px] font-black text-blue-100 uppercase tracking-widest">Materiales Consumidos</p>
                                    <p className="text-4xl font-black text-white italic">
                                        {station.work_orders?.reduce((acc: number, ot: any) => acc + (ot.materials?.length || 0), 0)}
                                    </p>
                                </div>
                                <Package className="w-8 h-8 text-white/20" />
                            </div>
                        </div>
                    </div>

                    {/* Información de Contacto */}
                    <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
                        <h3 className="text-xl font-black uppercase mb-6 flex items-center gap-3 tracking-tighter">
                            <Users className="w-5 h-5 text-blue-400" />
                            Contacto EDS
                        </h3>
                        <div className="space-y-6">
                            <div>
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Jefe de Estación</p>
                                <p className="text-sm font-bold text-white uppercase italic">{station.manager_name || 'Sin asignar'}</p>
                            </div>
                            <div>
                                <p className="text-[8px] font-black text-slate-600 uppercase tracking-widest mb-1">Teléfono</p>
                                <p className="text-sm font-bold text-blue-400">{station.manager_phone || '---'}</p>
                            </div>
                            <div className="pt-6 border-t border-white/5 space-y-4">
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${station.is_active ? 'bg-green-500 shadow-[0_0_10px_rgba(34,197,94,0.5)]' : 'bg-red-500'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Estado Operativo</span>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full ${station.is_active_sap ? 'bg-blue-500 shadow-[0_0_10px_rgba(59,130,246,0.5)]' : 'bg-slate-700'}`} />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Estado en SAP</span>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
