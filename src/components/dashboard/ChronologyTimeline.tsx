"use client";

import { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Clock,
    User,
    CheckCircle2,
    AlertCircle,
    Package,
    Truck,
    ArrowRightCircle,
    ClipboardList,
    ChevronDown,
    ChevronRight,
    Sparkles,
    ExternalLink
} from "lucide-react";
import Link from "next/link";
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

interface GroupedActivity {
    id: string;
    type: string;
    userName: string;
    otId?: string;
    latestTimestamp: string;
    items: Activity[];
}

export function ChronologyTimeline({ activities }: { activities: Activity[] }) {
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
    };

    // Lógica de Agrupación Inteligente
    const groupedActivities = useMemo(() => {
        const groups: GroupedActivity[] = [];
        let currentGroup: GroupedActivity | null = null;

        activities.forEach((activity) => {
            // Criterio de agrupación: Mismo usuario, misma OT y mismo tipo
            // O si es una acción de sistema repetitiva sobre la misma OT
            const canGroup = currentGroup &&
                currentGroup.userName === activity.userName &&
                currentGroup.otId === activity.otId &&
                currentGroup.type === activity.type;

            if (canGroup && currentGroup) {
                currentGroup.items.push(activity);
            } else {
                currentGroup = {
                    id: activity.id,
                    type: activity.type,
                    userName: activity.userName,
                    otId: activity.otId,
                    latestTimestamp: activity.timestamp,
                    items: [activity]
                };
                groups.push(currentGroup);
            }
        });

        return groups;
    }, [activities]);

    const getIcon = (type: string) => {
        switch (type.toLowerCase()) {
            case "ot_update": return <ClipboardList className="w-4 h-4 text-blue-400" />;
            case "shipment": return <Package className="w-4 h-4 text-emerald-400" />;
            case "route": return <Truck className="w-4 h-4 text-indigo-400" />;
            case "completion": return <CheckCircle2 className="w-4 h-4 text-emerald-500" />;
            case "alert": return <AlertCircle className="w-4 h-4 text-red-400" />;
            case "note": return <Sparkles className="w-3.5 h-3.5 text-purple-400" />;
            default: return <ArrowRightCircle className="w-4 h-4 text-slate-400" />;
        }
    };

    return (
        <section className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] backdrop-blur-md shadow-2xl relative overflow-hidden group/card">
            <h2 className="text-xl font-black mb-8 flex items-center gap-3 text-white uppercase tracking-tighter">
                <div className="p-2 bg-white/5 rounded-xl border border-white/10">
                    <Clock className="w-5 h-5 text-blue-400 animate-pulse" />
                </div>
                Cronología
            </h2>

            <div className="relative space-y-6">
                {/* Vertical Tree Line */}
                <div className="absolute left-[19px] top-4 bottom-4 w-[1px] bg-gradient-to-b from-blue-500/50 via-white/5 to-transparent" />

                {groupedActivities.length > 0 ? (
                    groupedActivities.map((group, i) => {
                        const isExpanded = expandedGroups[group.id];
                        const hasMultiple = group.items.length > 1;

                        return (
                            <motion.div
                                key={group.id}
                                initial={{ opacity: 0, x: -10 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: i * 0.05 }}
                                className="relative"
                            >
                                <div className="flex gap-4 group/item">
                                    {/* Icon / Node */}
                                    <div className="relative z-10 w-10 h-10 rounded-full bg-black border border-white/10 flex items-center justify-center shrink-0 group-hover/item:border-blue-500/50 transition-all shadow-2xl group-hover/item:shadow-blue-500/10 h-10 w-10">
                                        {getIcon(group.type)}
                                        {hasMultiple && !isExpanded && (
                                            <span className="absolute -top-1 -right-1 bg-blue-500 text-[8px] font-black w-4 h-4 rounded-full flex items-center justify-center border-2 border-black">
                                                {group.items.length}
                                            </span>
                                        )}
                                    </div>

                                    {/* Content Block */}
                                    <div className="flex-1 min-w-0">
                                        <div
                                            className={`p-4 rounded-2xl transition-all border ${hasMultiple ? 'hover:bg-white/[0.04] cursor-pointer' : ''} ${isExpanded ? 'bg-white/[0.04] border-white/10' : 'bg-transparent border-transparent'}`}
                                            onClick={() => hasMultiple && toggleGroup(group.id)}
                                        >
                                            <div className="flex justify-between items-start gap-2">
                                                <div className="min-w-0">
                                                    <p className="text-xs font-bold text-slate-200 leading-relaxed truncate">
                                                        <span className="text-blue-400 mr-1">@{group.userName}</span>
                                                        {group.items[0].content}
                                                    </p>
                                                    <div className="flex items-center gap-2 mt-1.5">
                                                        {group.otId && (
                                                            <Link
                                                                href={`/dashboard/ots/${group.otId}`}
                                                                target="_blank"
                                                                className="flex items-center gap-1 text-[9px] bg-blue-500/10 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono text-blue-400 hover:bg-blue-500/20 transition-all group/link"
                                                                onClick={(e) => e.stopPropagation()}
                                                            >
                                                                OT: {group.otId.slice(0, 8)}
                                                                <ExternalLink className="w-2 h-2 opacity-50 group-hover/link:opacity-100" />
                                                            </Link>
                                                        )}
                                                        <span className="text-[9px] text-slate-600 uppercase font-black tracking-widest">
                                                            {group.type}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div className="flex flex-col items-end gap-1 shrink-0">
                                                    <span className="text-[10px] font-black text-slate-500 tabular-nums">
                                                        {formatDistanceToNow(new Date(group.latestTimestamp), { addSuffix: true, locale: es })}
                                                    </span>
                                                    {hasMultiple && (
                                                        <div className="text-blue-400/50">
                                                            {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
                                                        </div>
                                                    )}
                                                </div>
                                            </div>

                                            {/* Sub-items (Tree branch) */}
                                            <AnimatePresence>
                                                {isExpanded && (
                                                    <motion.div
                                                        initial={{ height: 0, opacity: 0 }}
                                                        animate={{ height: "auto", opacity: 1 }}
                                                        exit={{ height: 0, opacity: 0 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="mt-4 pt-4 border-t border-white/5 space-y-4">
                                                            {group.items.slice(1).map((item) => (
                                                                <div key={item.id} className="flex items-center gap-3 pl-2 group/sub">
                                                                    <div className="w-1.5 h-1.5 rounded-full bg-slate-700 group-hover/sub:bg-blue-400 transition-colors" />
                                                                    <div className="flex-1 flex justify-between items-center text-[11px]">
                                                                        <span className="text-slate-400 italic truncate max-w-[150px]">
                                                                            {item.content}
                                                                        </span>
                                                                        <span className="text-[9px] text-slate-600 tabular-nums">
                                                                            {new Date(item.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                                        </span>
                                                                    </div>
                                                                </div>
                                                            ))}
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })
                ) : (
                    <div className="py-12 text-center text-slate-600">
                        <Clock className="w-12 h-12 mx-auto mb-2 opacity-20" />
                        <p className="text-sm">No hay actividad reciente.</p>
                    </div>
                )}
            </div>

            <div className="mt-8 pt-6 border-t border-white/5 flex justify-center">
                <button className="text-[10px] font-black text-slate-500 hover:text-white transition-all uppercase tracking-[0.2em] flex items-center gap-2">
                    Historial Completo
                    <ArrowRightCircle className="w-3 h-3" />
                </button>
            </div>
        </section>
    );
}
