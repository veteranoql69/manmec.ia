"use client";

import { motion } from "framer-motion";
import {
    Clock,
    User,
    CheckCircle2,
    AlertCircle,
    Package,
    Truck,
    ArrowRightCircle,
    ClipboardList
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface Activity {
    id: string;
    content: string | null;
    timestamp: string;
    type: string;
    userName: string;
    otId?: string;
}

export function ChronologyTimeline({ activities }: { activities: Activity[] }) {

    const getIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case "ot_update": return <ClipboardList className="w-4 h-4 text-blue-400" />;
            case "shipment": return <Package className="w-4 h-4 text-emerald-400" />;
            case "route": return <Truck className="w-4 h-4 text-indigo-400" />;
            case "completion": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case "alert": return <AlertCircle className="w-4 h-4 text-red-400" />;
            default: return <ArrowRightCircle className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <section className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md">
            <h2 className="text-xl font-bold mb-6 flex items-center gap-2">
                <Clock className="w-5 h-5 text-slate-400" />
                Cronología de Actividad
            </h2>

            <div className="relative space-y-8">
                {/* Vertical Line */}
                <div className="absolute left-[19px] top-2 bottom-2 w-0.5 bg-white/5" />

                {activities.length > 0 ? (
                    activities.map((activity, i) => (
                        <motion.div
                            key={activity.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: i * 0.05 }}
                            className="relative flex gap-4 group"
                        >
                            {/* Dot / Icon */}
                            <div className="relative z-10 w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center shrink-0 group-hover:border-blue-500/50 transition-colors shadow-xl">
                                {getIcon(activity.type)}
                            </div>

                            {/* Content */}
                            <div className="flex-1 pt-1">
                                <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-1">
                                    <p className="text-sm font-medium text-slate-200 leading-tight">
                                        <span className="text-blue-400 font-bold">{activity.userName}</span> {activity.content}
                                    </p>
                                    <span className="text-[10px] uppercase font-bold text-slate-500 whitespace-nowrap">
                                        {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true, locale: es })}
                                    </span>
                                </div>
                                <div className="flex items-center gap-2 mt-2">
                                    {activity.otId && (
                                        <span className="text-[10px] bg-white/5 border border-white/10 px-2 py-0.5 rounded-md font-mono text-slate-400">
                                            OT: {activity.otId}
                                        </span>
                                    )}
                                    <span className="text-[10px] text-slate-600 uppercase tracking-widest font-bold">
                                        {activity.type}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))
                ) : (
                    <div className="py-12 text-center text-slate-600">
                        <Clock className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No hay actividad reciente registrada.</p>
                    </div>
                )}
            </div>

            <div className="mt-8 pt-4 border-t border-white/5 text-center">
                <button className="text-xs font-bold text-slate-500 hover:text-white transition-colors uppercase tracking-widest">
                    Ver historial completo
                </button>
            </div>
        </section>
    );
}
