"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { Bell, X, Package, ArrowDownToLine, CheckCheck, ExternalLink, Wrench } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";

interface Notification {
    id: string;
    type: string;
    title: string;
    body: string | null;
    payload: Record<string, unknown> | null;
    is_read: boolean;
    created_at: string;
}

function timeAgo(dateStr: string): string {
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "hace un momento";
    if (diff < 3600) return `hace ${Math.floor(diff / 60)} min`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    return `hace ${Math.floor(diff / 86400)}d`;
}

function NotifIcon({ type }: { type: string }) {
    if (type === "stock_deduction") return <Package size={16} className="text-amber-400" />;
    if (type === "shipment_received") return <ArrowDownToLine size={16} className="text-emerald-400" />;
    if (type === "transfer_initiated") return <Wrench size={16} className="text-blue-400" />;
    return <Bell size={16} className="text-slate-400" />;
}

function typeLabel(type: string): string {
    if (type === "stock_deduction") return "Descuento de Repuesto";
    if (type === "shipment_received") return "Recepción de Guía";
    if (type === "transfer_initiated") return "Transferencia";
    return "Notificación";
}

function typeGlow(type: string): string {
    if (type === "stock_deduction") return "bg-amber-500";
    if (type === "shipment_received") return "bg-emerald-500";
    return "bg-blue-500";
}

function DetailRow({ label, value }: { label: string; value: string }) {
    return (
        <div className="flex items-start justify-between gap-4">
            <span className="text-xs text-slate-500 flex-shrink-0">{label}</span>
            <span className="text-xs font-bold text-slate-200 text-right">{value}</span>
        </div>
    );
}

function NotificationDetailModal({
    notification,
    onClose,
}: {
    notification: Notification;
    onClose: () => void;
}) {
    const p = notification.payload;
    const otId = p?.ot_id as string | undefined;
    const shipmentId = p?.shipment_id as string | undefined;

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[400] flex items-center justify-center p-4"
            onClick={onClose}
        >
            <div className="absolute inset-0 bg-black/70 backdrop-blur-md" />

            <motion.div
                initial={{ scale: 0.94, y: 12 }}
                animate={{ scale: 1, y: 0 }}
                exit={{ scale: 0.94, y: 12 }}
                transition={{ type: "spring", damping: 22, stiffness: 300 }}
                onClick={e => e.stopPropagation()}
                className="relative w-full max-w-md bg-[#0D0D0D]/95 backdrop-blur-2xl border border-white/10 rounded-3xl shadow-2xl overflow-hidden"
            >
                {/* Glow ambiental */}
                <div className={`absolute -top-10 -right-10 w-48 h-48 rounded-full blur-3xl opacity-15 pointer-events-none ${typeGlow(notification.type)}`} />
                <div className={`absolute -bottom-10 -left-10 w-32 h-32 rounded-full blur-3xl opacity-10 pointer-events-none ${typeGlow(notification.type)}`} />

                {/* Header */}
                <div className="relative flex items-center justify-between px-6 pt-6 pb-4 border-b border-white/5">
                    <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-2xl bg-white/5 border border-white/10 flex items-center justify-center">
                            <NotifIcon type={notification.type} />
                        </div>
                        <div>
                            <p className="text-[10px] text-slate-500 uppercase font-mono tracking-widest">
                                {typeLabel(notification.type)}
                            </p>
                            <p className="text-sm font-bold text-white leading-tight">{notification.title}</p>
                        </div>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-1.5 rounded-xl text-slate-500 hover:text-white hover:bg-white/5 transition-colors flex-shrink-0"
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Body */}
                <div className="relative px-6 py-5 space-y-4">
                    {notification.body && (
                        <p className="text-sm text-slate-300 leading-relaxed">{notification.body}</p>
                    )}

                    {p && Object.keys(p).length > 0 && (
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl p-4 space-y-3">
                            {p.item_name    != null && <DetailRow label="Repuesto"  value={String(p.item_name)} />}
                            {p.quantity     != null && p.unit != null && (
                                <DetailRow label="Cantidad" value={`${p.quantity} ${p.unit}`} />
                            )}
                            {p.station_name  != null && <DetailRow label="Estación"  value={String(p.station_name)} />}
                            {p.mechanic_name != null && <DetailRow label="Mecánico"  value={String(p.mechanic_name)} />}
                            {p.warehouse_name != null && <DetailRow label="Bodega"   value={String(p.warehouse_name)} />}
                            {p.ot_code       != null && <DetailRow label="OT"        value={String(p.ot_code)} />}
                            {p.supplier_name != null && <DetailRow label="Proveedor" value={String(p.supplier_name)} />}
                            {p.dispatch_note != null && <DetailRow label="Nº Guía"   value={String(p.dispatch_note)} />}
                            {p.item_count    != null && <DetailRow label="Ítems"     value={String(p.item_count)} />}
                            {p.reason        != null && <DetailRow label="Motivo"    value={String(p.reason)} />}
                        </div>
                    )}

                    <p className="text-[11px] text-slate-600">
                        {new Date(notification.created_at).toLocaleString("es-CL", {
                            day: "2-digit", month: "2-digit", year: "numeric",
                            hour: "2-digit", minute: "2-digit",
                        })}
                    </p>
                </div>

                {/* Footer con link */}
                {(otId || shipmentId) && (
                    <div className="relative px-6 pb-6">
                        <Link
                            href={otId ? `/dashboard/ots/${otId}` : `/dashboard/shipments`}
                            onClick={onClose}
                            className="flex items-center justify-center gap-2 w-full py-3 px-4 rounded-2xl bg-blue-500/10 border border-blue-500/20 text-blue-400 text-sm font-bold hover:bg-blue-500/20 transition-colors"
                        >
                            <ExternalLink size={14} />
                            {otId ? "Ver Orden de Trabajo" : "Ver Guía de Despacho"}
                        </Link>
                    </div>
                )}
            </motion.div>
        </motion.div>
    );
}

export default function NotificationBell({ userId }: { userId: string }) {
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [open, setOpen] = useState(false);
    const [selected, setSelected] = useState<Notification | null>(null);
    const dropdownRef = useRef<HTMLDivElement>(null);

    const unread = notifications.filter(n => !n.is_read).length;

    // Carga inicial
    useEffect(() => {
        const supabase = createClient();
        supabase
            .from("manmec_notifications")
            .select("*")
            .eq("user_id", userId)
            .order("created_at", { ascending: false })
            .limit(40)
            .then(({ data, error }) => {
                if (error) console.error("[NotificationBell] SELECT error:", error.message, error);
                if (data) setNotifications(data as Notification[]);
            });
    }, [userId]);

    // Suscripción Realtime filtrada por user_id
    useEffect(() => {
        const supabase = createClient();
        const channel = supabase
            .channel(`notif-bell-${userId}`)
            .on(
                "postgres_changes",
                {
                    event: "INSERT",
                    schema: "public",
                    table: "manmec_notifications",
                    filter: `user_id=eq.${userId}`,
                },
                payload => {
                    setNotifications(prev => [payload.new as Notification, ...prev]);
                }
            )
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [userId]);

    // Cerrar al hacer click fuera
    useEffect(() => {
        const handler = (e: MouseEvent) => {
            if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
                setOpen(false);
            }
        };
        document.addEventListener("mousedown", handler);
        return () => document.removeEventListener("mousedown", handler);
    }, []);

    const markAllRead = useCallback(async () => {
        const unreadIds = notifications.filter(n => !n.is_read).map(n => n.id);
        if (!unreadIds.length) return;
        const supabase = createClient();
        await supabase.from("manmec_notifications").update({ is_read: true }).in("id", unreadIds);
        setNotifications(prev => prev.map(n => ({ ...n, is_read: true })));
    }, [notifications]);

    const markOneRead = useCallback(async (id: string) => {
        const supabase = createClient();
        await supabase.from("manmec_notifications").update({ is_read: true }).eq("id", id);
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, is_read: true } : n));
    }, []);

    const handleNotifClick = useCallback((n: Notification) => {
        setSelected(n);
        setOpen(false);
        if (!n.is_read) markOneRead(n.id);
    }, [markOneRead]);

    return (
        <>
            <div ref={dropdownRef} className="relative">
                <button
                    onClick={() => setOpen(o => !o)}
                    className="relative p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                    aria-label="Notificaciones"
                >
                    <Bell size={20} />
                    <AnimatePresence>
                        {unread > 0 && (
                            <motion.span
                                key="badge"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                exit={{ scale: 0 }}
                                className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center shadow-[0_0_12px_rgba(239,68,68,0.7)]"
                            >
                                {unread > 99 ? "99+" : unread}
                            </motion.span>
                        )}
                    </AnimatePresence>
                </button>

                <AnimatePresence>
                    {open && (
                        <motion.div
                            initial={{ opacity: 0, y: -8, scale: 0.96 }}
                            animate={{ opacity: 1, y: 0, scale: 1 }}
                            exit={{ opacity: 0, y: -8, scale: 0.96 }}
                            transition={{ duration: 0.15 }}
                            className="absolute right-0 mt-2 w-[360px] bg-[#0C0C0C]/95 backdrop-blur-xl border border-white/10 rounded-2xl shadow-2xl z-[200] overflow-hidden"
                        >
                            {/* Header dropdown */}
                            <div className="flex items-center justify-between px-4 py-3 border-b border-white/5">
                                <div className="flex items-center gap-2">
                                    <Bell size={14} className="text-slate-400" />
                                    <span className="text-sm font-bold text-white">Notificaciones</span>
                                    {unread > 0 && (
                                        <span className="text-[10px] font-black px-2 py-0.5 rounded-full bg-red-500/20 text-red-400">
                                            {unread} nuevas
                                        </span>
                                    )}
                                </div>
                                {unread > 0 && (
                                    <button
                                        onClick={markAllRead}
                                        className="flex items-center gap-1 text-[11px] text-slate-500 hover:text-slate-200 transition-colors"
                                    >
                                        <CheckCheck size={12} />
                                        Marcar leídas
                                    </button>
                                )}
                            </div>

                            {/* Lista */}
                            <div className="max-h-[420px] overflow-y-auto divide-y divide-white/5">
                                {notifications.length === 0 ? (
                                    <div className="flex flex-col items-center justify-center py-10 gap-2 text-slate-600">
                                        <Bell size={28} strokeWidth={1} />
                                        <p className="text-sm">Sin notificaciones</p>
                                    </div>
                                ) : (
                                    notifications.map(n => (
                                        <button
                                            key={n.id}
                                            onClick={() => handleNotifClick(n)}
                                            className={`w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex gap-3 items-start ${!n.is_read ? "bg-white/[0.03]" : ""}`}
                                        >
                                            <div className="mt-0.5 flex-shrink-0 w-7 h-7 rounded-lg bg-white/5 border border-white/5 flex items-center justify-center">
                                                <NotifIcon type={n.type} />
                                            </div>
                                            <div className="flex-1 min-w-0">
                                                <p className={`text-xs font-bold leading-snug ${!n.is_read ? "text-white" : "text-slate-400"}`}>
                                                    {n.title}
                                                </p>
                                                {n.body && (
                                                    <p className="text-[11px] text-slate-500 truncate mt-0.5">{n.body}</p>
                                                )}
                                                <p className="text-[10px] text-slate-600 mt-1">{timeAgo(n.created_at)}</p>
                                            </div>
                                            {!n.is_read && (
                                                <div className="mt-2 w-1.5 h-1.5 rounded-full bg-red-500 flex-shrink-0 shadow-[0_0_6px_rgba(239,68,68,0.8)]" />
                                            )}
                                        </button>
                                    ))
                                )}
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>

            {/* Modal de detalle */}
            <AnimatePresence>
                {selected && (
                    <NotificationDetailModal
                        notification={selected}
                        onClose={() => setSelected(null)}
                    />
                )}
            </AnimatePresence>
        </>
    );
}
