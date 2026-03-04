import { requireRole } from "@/lib/auth";
import { getWorkOrderDetail, getAvailableResources } from "../actions";
import { OTAssignmentManager } from "@/components/dashboard/OTAssignmentManager";
import { MobileWarehouseTabs } from "@/components/dashboard/MobileWarehouseTabs";
import {
    ChevronLeft,
    MapPin,
    Truck,
    Clock,
    User,
    AlertTriangle,
    CheckCircle2,
    Package,
    Phone,
    Users,
    Activity,
    ClipboardList
} from "lucide-react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ChronologyTimeline } from "@/components/dashboard/ChronologyTimeline";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface PageProps {
    params: { id: string };
}

export default async function OTDetailPage({ params }: PageProps) {
    const { id } = await params;
    await requireRole("SUPERVISOR");

    let ot, resources;
    try {
        [ot, resources] = await Promise.all([
            getWorkOrderDetail(id),
            getAvailableResources()
        ]);
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

            {/* Banner de Comando Vista 360 */}
            <div className="mb-10 p-1 rounded-[2.5rem] bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 shadow-2xl shadow-blue-900/20">
                <div className="bg-black/90 backdrop-blur-xl rounded-[2.4rem] p-6 md:p-8 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="flex items-center gap-6">
                        <div className="w-16 h-16 rounded-3xl bg-blue-600/10 border border-blue-500/20 flex items-center justify-center">
                            <Activity className="w-8 h-8 text-blue-400" />
                        </div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="text-sm font-mono font-black text-blue-400 bg-blue-500/10 px-3 py-1 rounded-full border border-blue-500/20">
                                    {ot.code || "OT-PENDIENTE"}
                                </span>
                                <span className="px-3 py-1 rounded-full bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-400">
                                    Vista 360 Operativa
                                </span>
                            </div>
                            <h1 className="text-3xl font-black uppercase italic tracking-tight">{ot.title}</h1>
                        </div>
                    </div>

                    <div className="flex items-center gap-4 border-l border-white/10 pl-6 h-16 hidden md:flex">
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Estación</p>
                            <p className="font-black text-blue-400 font-mono text-lg">{ot.station?.code || "S-SIN-COD"}</p>
                        </div>
                        <div className="w-px h-8 bg-white/10 mx-2" />
                        <div className="text-right">
                            <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Vehículo</p>
                            <p className="font-black text-emerald-400 font-mono text-lg">{ot.vehicle?.plate || "SIN-ASIG"}</p>
                        </div>
                    </div>
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                {/* Columna Principal: Detalle de la OT y Equipo */}
                <div className="lg:col-span-2 space-y-8">
                    {/* Detalles del Trabajo */}
                    <section className="bg-white/5 border border-white/10 p-8 rounded-[3rem] backdrop-blur-md relative overflow-hidden">
                        <div className={`absolute top-0 right-0 px-8 py-3 rounded-bl-[2rem] text-[10px] font-black uppercase tracking-widest ${ot.priority === 'P1' ? 'bg-red-500 text-white' :
                            ot.priority === 'P2' ? 'bg-amber-500 text-black' : 'bg-blue-500 text-white'
                            }`}>
                            Prioridad {ot.priority}
                        </div>

                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <ClipboardList className="text-blue-500 w-5 h-5" /> Detalles del Requerimiento
                        </h2>

                        <div className="p-6 bg-black/40 border border-white/5 rounded-3xl mb-8">
                            <p className="text-slate-300 leading-relaxed italic text-lg whitespace-pre-line">
                                "{ot.description || "Sin descripción adicional proporcionada."}"
                            </p>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2">Estado Actual</p>
                                <div className="flex items-center gap-3">
                                    <div className={`w-3 h-3 rounded-full animate-pulse ${ot.status === 'COMPLETED' ? 'bg-emerald-500' : ot.status === 'IN_PROGRESS' ? 'bg-blue-500' : 'bg-slate-500'}`} />
                                    <span className="font-black uppercase tracking-tight">{ot.status}</span>
                                </div>
                            </div>
                            <div className="p-4 rounded-2xl bg-white/5 border border-white/5">
                                <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest mb-2">Fecha Solicitud</p>
                                <div className="flex items-center gap-3 text-slate-300">
                                    <Clock className="w-4 h-4 text-blue-500" />
                                    <span className="font-bold">{format(new Date(ot.created_at), "dd 'de' MMMM, yyyy", { locale: es })}</span>
                                </div>
                            </div>
                        </div>
                    </section>

                    {/* Equipo Humano (Mecánicos) */}
                    <section className="bg-white/5 border border-white/10 p-8 rounded-[3rem] backdrop-blur-md">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <Users className="text-indigo-400 w-5 h-5" /> Equipo Técnico en Sitio
                        </h2>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {/* Responsable Principal (Join Directo) */}
                            <div className="flex items-center gap-4 p-4 bg-indigo-500/10 border border-indigo-500/20 rounded-[2rem]">
                                <div className="w-14 h-14 rounded-full bg-indigo-600 flex items-center justify-center text-xl font-black text-white shadow-lg">
                                    {ot.assigned_user?.full_name?.charAt(0) || "?"}
                                </div>
                                <div>
                                    <p className="font-black text-white uppercase tracking-tight leading-tight">{ot.assigned_user?.full_name || "Sin líder"}</p>
                                    <span className="text-[10px] font-black uppercase text-indigo-400 tracking-widest">Técnico Líder</span>
                                </div>
                            </div>

                            {/* Equipo de Apoyo */}
                            {ot.team?.filter((m: any) => m.role === 'support').map((m: any, idx: number) => (
                                <div key={idx} className="flex items-center gap-4 p-4 bg-white/5 border border-white/5 rounded-[2rem]">
                                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center font-bold text-slate-400">
                                        {m.mechanic.full_name.charAt(0)}
                                    </div>
                                    <div>
                                        <p className="font-bold text-slate-200 text-sm">{m.mechanic.full_name}</p>
                                        <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Apoyo</span>
                                    </div>
                                </div>
                            ))}

                            {(!ot.team || ot.team.length === 0) && (
                                <div className="p-4 border border-dashed border-white/10 rounded-[2rem] text-center md:col-span-2">
                                    <p className="text-xs text-slate-500">No se han registrado turnos de apoyo para esta OT.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Información de la Estación (EDS) */}
                    <section className="bg-white/5 border border-white/10 p-8 rounded-[3rem] backdrop-blur-md">
                        <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
                            <MapPin className="text-red-500 w-5 h-5" /> Punto de Servicio (EDS)
                        </h2>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <div className="p-6 bg-black/40 border border-white/5 rounded-[2rem]">
                                    <p className="text-[10px] font-black uppercase text-slate-500 tracking-widest mb-1">Nombre Comercial</p>
                                    <p className="text-2xl font-black uppercase italic">{ot.station?.name || "N/A"}</p>
                                    <p className="text-sm text-slate-400 mt-1 flex items-center gap-1">
                                        <MapPin className="w-3 h-3" /> {ot.station?.address || "Sin dirección"}
                                    </p>
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div className="p-6 bg-blue-600/10 border border-blue-500/20 rounded-[2rem]">
                                    <p className="text-[10px] font-black uppercase text-blue-400 tracking-widest mb-4">Gerencia de Terminal / Jefe EDS</p>
                                    <div className="flex items-center gap-4 mb-3">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <User className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <p className="font-black uppercase tracking-tight">{ot.station?.manager_name || "Sin registrar"}</p>
                                    </div>
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-full bg-blue-500/20 flex items-center justify-center">
                                            <Phone className="w-5 h-5 text-blue-400" />
                                        </div>
                                        <p className="font-mono font-bold text-blue-300">{ot.station?.manager_phone || "N/A"}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </section>
                </div>

                {/* Columna Lateral: Logística e Insumos */}
                <div className="space-y-8">
                    {/* Panel de Gestión de Asignaciones (Solo visible si no está completada) */}
                    {ot.status !== 'COMPLETED' && (
                        <OTAssignmentManager
                            otId={ot.id}
                            availableMechanics={resources.mechanics}
                            availableVehicles={resources.vehicles}
                        />
                    )}

                    {/* Pestañas de Gestión de Furgón e IA */}
                    <MobileWarehouseTabs ot={ot} />


                    {/* Consumo Real de la OT (Registrado manualmente o via furgón) */}
                    <section className="bg-white/5 border border-white/10 p-8 rounded-[3rem] backdrop-blur-md">
                        <h3 className="font-bold text-lg mb-6 flex items-center gap-3">
                            <CheckCircle2 className="text-emerald-500 w-5 h-5" /> Insumos Registrados
                        </h3>

                        <div className="space-y-3">
                            {ot.materials && ot.materials.length > 0 ? (
                                ot.materials.map((mat: any, idx: number) => (
                                    <div key={idx} className="flex items-center gap-4 p-4 bg-emerald-500/5 border border-emerald-500/10 rounded-2xl">
                                        <div className="flex-1 overflow-hidden">
                                            <p className="text-xs font-black text-emerald-100 truncate uppercase tracking-tight">{mat.item?.name}</p>
                                            <p className="text-[9px] font-bold text-emerald-600 italic">{mat.notes || "Sin observación"}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-emerald-400 leading-none">{mat.quantity}</p>
                                            <p className="text-[8px] uppercase font-bold text-emerald-600 tracking-tight">{mat.item?.unit}</p>
                                        </div>
                                    </div>
                                ))
                            ) : (
                                <div className="p-6 bg-white/5 rounded-[2rem] text-center border border-dashed border-white/10">
                                    <p className="text-xs text-slate-600">No se han registrado insumos manualmente.</p>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* Detección de Insumos por IA (Extraído de PDF) */}
                    {ot.metadata?.repuestos && ot.metadata.repuestos.length > 0 && (
                        <section className="bg-blue-600/5 border border-blue-500/20 p-8 rounded-[3rem] backdrop-blur-md">
                            <h3 className="font-bold text-lg mb-6 flex items-center gap-3">
                                <Activity className="text-blue-400 w-5 h-5" /> Detectado por IA (PDF)
                            </h3>
                            <div className="space-y-3">
                                {ot.metadata.repuestos.map((rep: any, idx: number) => (
                                    <div key={idx} className="flex items-center justify-between p-4 bg-white/5 border border-white/10 rounded-2xl">
                                        <div>
                                            <p className="text-sm font-bold text-blue-100">{rep.nombre}</p>
                                            <p className="text-[10px] text-slate-500 italic">Código: {rep.codigo || 'N/A'}</p>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-lg font-black text-blue-400">{rep.cantidad}</p>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </section>
                    )}

                </div>
            </div>
        </div>
    );
}
