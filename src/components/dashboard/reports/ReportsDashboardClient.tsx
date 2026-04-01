"use client";

import { motion } from "framer-motion";
import { 
    Activity, 
    Flame, 
    Waves, 
    Car,
    AlertTriangle,
    BrainCircuit,
    Lock,
    ExternalLink,
    Truck
} from "lucide-react";
import Link from "next/link";

export default function ReportsDashboardClient({ profile, data }: { profile: any, data: any }) {
    
    // Cálculos para porcentajes visuales en barras Q3
    const maxQ3 = Math.max(data.q3.totalIn, data.q3.totalOut, 1);
    const inPer = Math.round((data.q3.totalIn / maxQ3) * 100);
    const outPer = Math.round((data.q3.totalOut / maxQ3) * 100);

    return (
        <div className="space-y-8">
            {/* Grilla principal de Reportes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6">
                
                {/* Cuadrante 1 */}
                <ReportCard 
                    title="Control de Avance (OTs)" 
                    subtitle="Progreso Mensual Preventivo y Correctivo" 
                    icon={<Activity className="w-6 h-6 text-emerald-400" />}
                    color="emerald"
                    content={
                        <div className="space-y-5 mt-2">
                            {/* Termómetro Preventivo */}
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Termómetro Preventivo</p>
                                        <h4 className="text-2xl font-black text-white">{data.q1.closedPrev}<span className="text-sm text-slate-500 font-medium"> / {data.q1.totalPrev} OTs</span></h4>
                                    </div>
                                    <span className="text-xl font-black text-emerald-400">{data.q1.prevPercentage}%</span>
                                </div>
                                <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden flex border border-white/5 shadow-inner">
                                    <div className="h-full bg-emerald-500 relative" style={{ width: `${data.q1.prevPercentage}%` }}>
                                         <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                                    </div>
                                </div>
                            </div>

                            {/* Termómetro Correctivo */}
                            <div>
                                <div className="flex justify-between items-end mb-1">
                                    <div>
                                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Atención Correctiva</p>
                                        <h4 className="text-2xl font-black text-white">{data.q1.activeCorr}<span className="text-sm text-slate-500 font-medium"> tickets pendientes</span></h4>
                                    </div>
                                    {data.q1.activeCorr > 10 ? (
                                        <span className="text-xs font-bold text-rose-400 bg-rose-500/10 px-2 py-1 rounded border border-rose-500/20">Alta Carga</span>
                                    ) : (
                                        <span className="text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-1 rounded border border-emerald-500/20">Controlado</span>
                                    )}
                                </div>
                                <div className="h-2.5 w-full bg-white/5 rounded-full overflow-hidden flex border border-white/5 shadow-inner">
                                    <div className="h-full relative transition-all" style={{ 
                                        width: `${Math.min(100, data.q1.activeCorr * 5)}%`,
                                        backgroundColor: data.q1.activeCorr > 10 ? '#f43f5e' : '#10b981'
                                    }}>
                                        <div className="absolute inset-0 bg-white/20 w-full animate-[shimmer_2s_infinite]"></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                />

                {/* Cuadrante 2 */}
                <ReportCard 
                    title="Radar 'Burn-Rate'" 
                    subtitle="Velocidad de Consumo Predictivo" 
                    icon={<Flame className="w-6 h-6 text-amber-500" />}
                    color="amber"
                    content={
                        <div className="space-y-4 mt-2">
                            {data.q2_burnRate.length === 0 ? (
                                <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 rounded-xl text-center">
                                    <p className="text-sm font-bold text-emerald-400">Stock Operativo Estable</p>
                                    <p className="text-xs text-slate-400 mt-1">No hay agotamientos inminentes.</p>
                                </div>
                            ) : data.q2_burnRate.map((item: any, idx: number) => {
                                const isCritical = item.daysToExhaust <= 7;
                                const urlName = encodeURIComponent(item.name);
                                
                                return (
                                    <div key={item.id} className={`flex flex-col gap-2 p-3 rounded-xl border relative overflow-hidden group transition-colors
                                        ${isCritical ? 'bg-rose-500/5 border-rose-500/20' : 'bg-amber-500/5 border-amber-500/20'}
                                    `}>
                                        <div className={`absolute inset-0 bg-gradient-to-r opacity-0 group-hover:opacity-100 transition-opacity
                                            ${isCritical ? 'from-rose-500/10 to-transparent' : 'from-amber-500/10 to-transparent'}
                                        `}></div>
                                        <div className="flex items-start gap-4">
                                            <div className={`w-8 h-8 shrink-0 rounded-full flex items-center justify-center text-[10px] font-black ring-1
                                                ${isCritical ? 'bg-rose-500/20 text-rose-500 ring-rose-500/50' : 'bg-amber-500/20 text-amber-500 ring-amber-500/50'}
                                            `}>#{idx + 1}</div>
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start">
                                                    <Link href={`/dashboard/inventory?q=${urlName}`} className={`text-sm font-bold text-white hover:underline transition-all flex items-center gap-1 group/link
                                                        ${isCritical ? 'hover:text-rose-400 decoration-rose-500/50' : 'hover:text-amber-400 decoration-amber-500/50'}
                                                    `}>
                                                        {item.name}
                                                        <ExternalLink className="w-3 h-3 opacity-0 group-hover/link:opacity-100 transition-opacity" />
                                                    </Link>
                                                    <div className="text-right flex flex-col items-end gap-1">
                                                        <p className={`text-xs font-black ${isCritical ? 'text-rose-400 animate-pulse' : 'text-amber-400'}`}>
                                                            Agota en {item.daysToExhaust} Días
                                                        </p>
                                                        {item.inTransit > 0 ? (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                                                                <Truck className="w-2.5 h-2.5" /> +{item.inTransit} en camino
                                                            </span>
                                                        ) : (
                                                            <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold bg-slate-500/20 text-slate-400 border border-slate-500/30">
                                                                <Truck className="w-2.5 h-2.5" /> Sin guías activas
                                                            </span>
                                                        )}
                                                    </div>
                                                </div>
                                                <div className="flex items-center justify-between mt-1 text-[10px] text-slate-400 font-medium relative z-10">
                                                    <span>Stock: <span className="text-white font-bold">{item.stock} unds</span></span>
                                                    <span className="w-1 h-1 rounded-full bg-slate-600"></span>
                                                    <span>Consumo: <span className="text-white font-bold">{item.dailyConsumption} unds/día</span></span>
                                                </div>
                                            </div>
                                            {isCritical && <AlertTriangle className="w-5 h-5 text-rose-500 shrink-0 mt-1" />}
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    }
                />

                {/* Cuadrante 3 */}
                <ReportCard 
                    title="Balance de Flujo Logístico" 
                    subtitle="Repuestos Recibidos vs Instalados (30 d)" 
                    icon={<Waves className="w-6 h-6 text-cyan-400" />}
                    color="cyan"
                    content={
                        <div className="space-y-5 mt-2">
                            <div className={`flex flex-col items-center justify-center p-4 rounded-2xl border relative
                                ${data.q3.netBalance >= 0 ? 'bg-cyan-500/5 border-cyan-500/20' : 'bg-rose-500/5 border-rose-500/20'}
                            `}>
                                <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1">Balance Neto Mensual</p>
                                <h4 className={`text-4xl font-black ${data.q3.netBalance >= 0 ? 'text-cyan-400' : 'text-rose-500'}`}>
                                    {data.q3.netBalance > 0 ? '+' : ''}{data.q3.netBalance} <span className="text-xl font-bold text-slate-500">reps</span>
                                </h4>
                                <p className={`text-[10px] font-bold uppercase mt-1 px-2 py-0.5 rounded-full
                                    ${data.q3.netBalance >= 0 ? 'text-cyan-500/80 bg-cyan-500/10' : 'text-rose-500/80 bg-rose-500/10'}
                                `}>
                                    {data.q3.netBalance >= 0 ? 'Fase de Acumulación' : 'Déficit Logístico'}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <div className="flex justify-between text-xs font-bold mb-1">
                                        <span className="text-slate-400 uppercase tracking-wider">Rep Recibidos</span>
                                        <span className="text-emerald-400">{data.q3.totalIn}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex shadow-inner">
                                        <div className="h-full bg-emerald-500 opacity-80 transition-all" style={{ width: `${inPer}%` }}></div>
                                    </div>
                                </div>
                                <div>
                                     <div className="flex justify-between text-xs font-bold mb-1">
                                        <span className="text-slate-400 uppercase tracking-wider">Rep Instalados</span>
                                        <span className="text-rose-400">{data.q3.totalOut}</span>
                                    </div>
                                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden flex shadow-inner justify-end">
                                        <div className="h-full bg-rose-500 opacity-80 transition-all" style={{ width: `${outPer}%` }}></div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    }
                />

                {/* Cuadrante 4 */}
                <ReportCard 
                    title="Gasto Móvil (Auditoría)" 
                    subtitle="Promedio Repuestos Usados por OT (30 d)" 
                    icon={<Car className="w-6 h-6 text-indigo-400" />}
                    color="indigo"
                    content={
                        <div className="space-y-3 mt-2">
                           {data.q4_fleet?.slice(0, 3).map((f: any, idx: number) => {
                               // Clases dinámicas del ranking //
                               let ringClass = "bg-white/5 border-white/5 hover:bg-white/10 text-white";
                               let numClass = "bg-slate-500/20 text-slate-400";
                               let valClass = "text-slate-300";
                               let tagClass = "text-slate-500";
                               let tagLabel = "Normal";

                               if (idx === 0 && f.ratio > 2) {
                                   ringClass = "bg-rose-500/5 border-rose-500/20 hover:bg-rose-500/10 text-white";
                                   numClass = "bg-rose-500/20 text-rose-500";
                                   valClass = "text-rose-400";
                                   tagClass = "text-rose-500";
                                   tagLabel = "Excesivo";
                               } else if (idx === 2 || f.ratio <= 1.5) {
                                   ringClass = "bg-emerald-500/5 border-emerald-500/20 hover:bg-emerald-500/10 text-white";
                                   numClass = "bg-emerald-500/20 text-emerald-400";
                                   valClass = "text-emerald-400";
                                   tagClass = "text-emerald-500";
                                   tagLabel = "Óptimo";
                               }

                               return (
                                   <div key={idx} className={`flex items-center justify-between p-2 px-3 rounded-lg border transition-colors ${ringClass}`}>
                                        <div className="flex items-center gap-3">
                                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-black ${numClass}`}>
                                                #{idx + 1}
                                            </div>
                                            <div>
                                                <p className="text-sm font-bold">
                                                    Flota {f.plate === "Desconocido" ? "S/A" : f.plate}{" "}
                                                    <span className="text-[10px] font-normal text-slate-400">{f.driver}</span>
                                                </p>
                                            </div>
                                        </div>
                                        <div className="text-right flex flex-col items-end">
                                            <span className={`text-sm font-black ${valClass}`}>
                                                {f.ratio} <span className="text-[10px] text-slate-500">rep/OT</span>
                                            </span>
                                            <span className={`text-[8px] uppercase tracking-widest font-bold ${tagClass}`}>
                                                {tagLabel}
                                            </span>
                                        </div>
                                   </div>
                               );
                           })}

                           {data.q4_fleet?.length === 0 && (
                                <p className="text-xs text-slate-500 text-center py-4">No hay OTs completadas con vehículos asignados recientemente.</p>
                           )}
                        </div>
                    }
                />

            </div>
        </div>
    );
}

function ReportCard({ title, subtitle, icon, color, content }: { title: string, subtitle: string, icon: React.ReactNode, color: string, content: React.ReactNode }) {
    
    // Mapeo rudimentario de colores tailwind
    const colorMap: Record<string, string> = {
        rose: "bg-rose-500/10 border-rose-500/20 group-hover:bg-rose-500/20",
        amber: "bg-amber-500/10 border-amber-500/20 group-hover:bg-amber-500/20",
        cyan: "bg-cyan-500/10 border-cyan-500/20 group-hover:bg-cyan-500/20",
        indigo: "bg-indigo-500/10 border-indigo-500/20 group-hover:bg-indigo-500/20",
        emerald: "bg-emerald-500/10 border-emerald-500/20 group-hover:bg-emerald-500/20",
    }

    const iconBg = colorMap[color] || "bg-white/10 border-white/20";

    return (
        <motion.div 
            whileHover={{ y: -4 }}
            className={`bg-[#0A0A0A]/80 border border-white/5 p-6 rounded-3xl backdrop-blur-md relative overflow-hidden group transition-all duration-300 hover:border-white/10 hover:shadow-2xl`}
        >
            <div className="flex items-start justify-between mb-6">
                <div>
                    <h3 className="text-lg font-black text-white">{title}</h3>
                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest mt-1">{subtitle}</p>
                </div>
                <div className={`p-3 rounded-2xl border transition-colors ${iconBg}`}>
                    {icon}
                </div>
            </div>
            
            {content}
        </motion.div>
    );
}
