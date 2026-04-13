"use client";

import { useState, useMemo } from "react";
import {
    Bell, BellOff, Save, CheckCircle2, Shield, Clock,
    Package, Wrench, Truck, TrendingUp, Ghost, ChevronDown,
    ChevronRight, Eye, Zap, AlertTriangle, Info
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface SlaHours { P1: number; P2: number; P3: number; P4: number; PM: number | null }
interface AlertWindowDays { P1: number; P2: number; P3: number; P4: number; PM: number }
interface WorkingHours { start: string; end: string; timezone: string }
interface EscalationTimeouts { to_supervisor: number; to_manager: number; to_admin: number }

interface AlertRules {
    sla_hours: SlaHours;
    alert_window_days: AlertWindowDays;
    working_hours: WorkingHours;
    escalation_timeouts_min: EscalationTimeouts;
    telegram_enabled: boolean;
    stock_alert_enabled: boolean;
    digest_hour: string;
    anomaly_min_samples: number;
}

const DEFAULT_RULES: AlertRules = {
    sla_hours: { P1: 4, P2: 12, P3: 48, P4: 120, PM: null },
    alert_window_days: { P1: 2, P2: 5, P3: 14, P4: 30, PM: 7 },
    working_hours: { start: "07:00", end: "21:00", timezone: "America/Santiago" },
    escalation_timeouts_min: { to_supervisor: 30, to_manager: 60, to_admin: 90 },
    telegram_enabled: true,
    stock_alert_enabled: true,
    digest_hour: "07:00",
    anomaly_min_samples: 15,
};

const PRIORITY_CONFIG = {
    P1: { label: "P1 — Crítico", color: "text-red-400", bg: "bg-red-500/10", border: "border-red-500/20", ring: "ring-red-500/30", pulse: "bg-red-500", maxHours: 24 },
    P2: { label: "P2 — Urgente", color: "text-orange-400", bg: "bg-orange-500/10", border: "border-orange-500/20", ring: "ring-orange-500/30", pulse: "bg-orange-500", maxHours: 48 },
    P3: { label: "P3 — Normal", color: "text-yellow-400", bg: "bg-yellow-500/10", border: "border-yellow-500/20", ring: "ring-yellow-500/30", pulse: "bg-yellow-500", maxHours: 120 },
    P4: { label: "P4 — Baja prioridad", color: "text-slate-400", bg: "bg-slate-500/10", border: "border-slate-500/20", ring: "ring-slate-500/30", pulse: "bg-slate-500", maxHours: 240 },
};

const TIMEZONES = ["America/Santiago", "America/Lima", "America/Bogota", "America/Buenos_Aires", "America/Mexico_City", "America/New_York", "UTC"];

// ─── Componente Principal ─────────────────────────────────────────────────────

export function AlertsConfigClient({ org }: { org: { id: string; name: string; settings: Record<string, unknown>; timezone?: string } | null }) {
    const initial: AlertRules = {
        ...DEFAULT_RULES,
        ...(org?.settings?.alert_rules as AlertRules ?? {}),
    };

    const [rules, setRules] = useState<AlertRules>(initial);
    const [activeTab, setActiveTab] = useState<"sla" | "inventory" | "operations" | "schedule">("sla");
    const [isSaving, setIsSaving] = useState(false);
    const [saveStatus, setSaveStatus] = useState<"idle" | "success" | "error">("idle");
    const [previewVisible, setPreviewVisible] = useState(false);
    const [expandedSection, setExpandedSection] = useState<string | null>("escalation");

    // ── Handlers ───────────────────────────────────────────────────────────────

    const setSla = (p: keyof SlaHours, v: number) =>
        setRules(r => ({ ...r, sla_hours: { ...r.sla_hours, [p]: v } }));

    const setWindow = (p: keyof AlertWindowDays, v: number) =>
        setRules(r => ({ ...r, alert_window_days: { ...r.alert_window_days, [p]: v } }));

    const setWorkingHours = (k: keyof WorkingHours, v: string) =>
        setRules(r => ({ ...r, working_hours: { ...r.working_hours, [k]: v } }));

    const setEscalation = (k: keyof EscalationTimeouts, v: number) =>
        setRules(r => ({ ...r, escalation_timeouts_min: { ...r.escalation_timeouts_min, [k]: v } }));

    const handleSave = async () => {
        setIsSaving(true);
        setSaveStatus("idle");
        try {
            const res = await fetch("/api/settings/alerts", {
                method: "PATCH",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ alert_rules: rules }),
            });
            setSaveStatus(res.ok ? "success" : "error");
            setTimeout(() => setSaveStatus("idle"), 3000);
        } catch {
            setSaveStatus("error");
        } finally {
            setIsSaving(false);
        }
    };

    // ── Preview del mensaje Telegram ───────────────────────────────────────────
    const previewMsg = useMemo(() => {
        const hrs = rules.sla_hours.P1;
        const rem = Math.round(hrs * 0.75);
        return `🚨 ALERTA SLA — PRIORIDAD 1\n\n📋 OT #AVISO-45821\n📍 EDS Los Héroes (Stgo Centro)\n👷 Asignado a: Carlos Rodríguez\n⏱ Tiempo restante: ${rem}h 0 min\n📊 Estado: EN PROGRESO\n\nEl tiempo de resolución para avisos P1 es de ${hrs} horas.\nPor favor, ingresa a la plataforma web para gestionar este aviso.`;
    }, [rules.sla_hours.P1]);

    const tabs = [
        { id: "sla", label: "SLA & Prioridades", icon: <Zap size={14} /> },
        { id: "inventory", label: "Inventario", icon: <Package size={14} /> },
        { id: "operations", label: "Operaciones", icon: <Wrench size={14} /> },
        { id: "schedule", label: "Horarios", icon: <Clock size={14} /> },
    ] as const;

    return (
        <div className="max-w-5xl mx-auto space-y-8">

            {/* ── Header ─────────────────────────────────────────────────────── */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                        Alertas <span className="text-blue-400">Proactivas</span>
                    </h2>
                    <p className="text-slate-400 text-sm mt-1 font-medium">
                        Motor de monitoreo automático — {org?.name ?? "Organización"}
                    </p>
                </div>
                <div className="flex items-center gap-3">
                    {/* Toggle Telegram global */}
                    <button
                        onClick={() => setRules(r => ({ ...r, telegram_enabled: !r.telegram_enabled }))}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-black uppercase tracking-widest transition-all border ${rules.telegram_enabled
                            ? "bg-blue-500/15 border-blue-500/30 text-blue-400 hover:bg-blue-500/25"
                            : "bg-white/5 border-white/10 text-slate-500 hover:bg-white/10"
                            }`}
                    >
                        {rules.telegram_enabled ? <Bell size={13} /> : <BellOff size={13} />}
                        Telegram {rules.telegram_enabled ? "Activo" : "Inactivo"}
                    </button>

                    <div className="hidden md:flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white/5 border border-white/10 text-[10px] font-black uppercase tracking-widest text-slate-500">
                        <Shield size={12} /> Solo Administradores
                    </div>
                </div>
            </div>

            {/* ── Tabs ────────────────────────────────────────────────────────── */}
            <div className="flex gap-1 p-1 bg-white/5 border border-white/5 rounded-2xl w-fit">
                {tabs.map(tab => (
                    <button
                        key={tab.id}
                        onClick={() => setActiveTab(tab.id)}
                        className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-xs font-bold uppercase tracking-widest transition-all ${activeTab === tab.id
                            ? "bg-blue-500 text-white shadow-lg shadow-blue-900/30"
                            : "text-slate-400 hover:text-white hover:bg-white/5"
                            }`}
                    >
                        {tab.icon} {tab.label}
                    </button>
                ))}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">

                {/* ── Panel Principal ────────────────────────────────────────── */}
                <div className="lg:col-span-2 space-y-4">

                    {/* TAB: SLA */}
                    {activeTab === "sla" && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 border border-white/10 rounded-[2rem] p-7 space-y-6"
                        >
                            <div>
                                <h3 className="text-base font-black uppercase tracking-widest text-white">SLA por Prioridad</h3>
                                <p className="text-xs text-slate-500 mt-1">Horas máximas de resolución desde que la OT es asignada (<code className="text-slate-400">started_at</code>)</p>
                            </div>

                            {(Object.keys(PRIORITY_CONFIG) as (keyof typeof PRIORITY_CONFIG)[]).map(p => {
                                const cfg = PRIORITY_CONFIG[p];
                                const slaVal = rules.sla_hours[p] ?? 0;
                                const winVal = rules.alert_window_days[p];
                                return (
                                    <div key={p} className={`p-5 rounded-2xl ${cfg.bg} border ${cfg.border} space-y-4`}>
                                        <div className="flex items-center justify-between">
                                            <div className="flex items-center gap-3">
                                                <span className={`w-2 h-2 rounded-full ${cfg.pulse} animate-pulse`} />
                                                <span className={`text-sm font-black uppercase tracking-widest ${cfg.color}`}>{cfg.label}</span>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="text-right">
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">SLA</p>
                                                    <p className={`text-lg font-black ${cfg.color}`}>{slaVal}h</p>
                                                </div>
                                                <div className="text-right">
                                                    <p className="text-[10px] text-slate-500 uppercase tracking-wider">Ventana</p>
                                                    <p className="text-lg font-black text-slate-300">{winVal}d</p>
                                                </div>
                                            </div>
                                        </div>

                                        {/* Slider SLA */}
                                        <div className="space-y-1">
                                            <div className="flex justify-between text-[10px] text-slate-500 uppercase tracking-wider">
                                                <span>SLA: 1h</span>
                                                <span>{cfg.maxHours}h</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={1}
                                                max={cfg.maxHours}
                                                value={slaVal}
                                                onChange={e => setSla(p, Number(e.target.value))}
                                                style={{ 
                                                    background: `linear-gradient(to right, ${
                                                        p === "P1" ? "#ef4444" : p === "P2" ? "#f97316" : p === "P3" ? "#eab308" : "#94a3b8"
                                                    } ${((slaVal - 1) / (cfg.maxHours - 1)) * 100}%, rgba(0,0,0,0.4) ${((slaVal - 1) / (cfg.maxHours - 1)) * 100}%)`
                                                }}
                                                className="w-full h-2 rounded-full appearance-none cursor-pointer outline-none border border-white/5 transition-all
                                                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                                                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white 
                                                    [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(255,255,255,0.4)]
                                                    hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-90 
                                                    [&::-webkit-slider-thumb]:transition-all"
                                            />
                                            <p className="text-[10px] text-slate-500">
                                                Primera alerta cuando queden{" "}
                                                <span className={`font-bold ${cfg.color}`}>
                                                    {p === "P1" || p === "P2"
                                                        ? `${Math.round(slaVal * 0.25)}h`
                                                        : `${Math.ceil(slaVal / 24 / 2 * 24)}h`}
                                                </span>
                                            </p>
                                        </div>

                                        {/* Slider Ventana de Activación */}
                                        <div className="space-y-1 border-t border-white/5 pt-3">
                                            <div className="flex justify-between items-center">
                                                <span className="text-[10px] text-slate-500 uppercase tracking-wider flex items-center gap-1.5">
                                                    <Ghost size={10} /> Ventana máx. antes de OT Fantasma
                                                </span>
                                                <span className="text-[10px] text-slate-400 font-bold">{winVal} días</span>
                                            </div>
                                            <input
                                                type="range"
                                                min={1}
                                                max={60}
                                                value={winVal}
                                                onChange={e => setWindow(p, Number(e.target.value))}
                                                style={{ 
                                                    background: `linear-gradient(to right, #a855f7 ${((winVal - 1) / 59) * 100}%, rgba(0,0,0,0.4) ${((winVal - 1) / 59) * 100}%)`
                                                }}
                                                className="w-full h-2 rounded-full appearance-none cursor-pointer outline-none border border-white/5 transition-all
                                                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                                                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white 
                                                    [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(168,85,247,0.5)]
                                                    hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-90 
                                                    [&::-webkit-slider-thumb]:transition-all"
                                            />
                                            <p className="text-[10px] text-slate-600 italic">
                                                OTs {p} con más de {winVal} días abiertas → Reporte Semanal de OTs Fantasma.
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}

                            {/* Escalamiento */}
                            <CollapsibleSection
                                id="escalation"
                                title="Cadena de Escalamiento"
                                icon={<AlertTriangle size={14} className="text-amber-400" />}
                                expanded={expandedSection}
                                setExpanded={setExpandedSection}
                            >
                                <p className="text-[11px] text-slate-500 mb-4">Tiempo sin respuesta antes de escalar al siguiente rol (todos dentro de la misma organización).</p>
                                <div className="space-y-3">
                                    {[
                                        { key: "to_supervisor" as const, label: "Mecánico → Supervisor", color: "text-orange-400" },
                                        { key: "to_manager" as const, label: "Supervisor → Manager", color: "text-red-400" },
                                        { key: "to_admin" as const, label: "Manager → Admin", color: "text-purple-400" },
                                    ].map(({ key, label, color }) => (
                                        <div key={key} className="flex items-center gap-4">
                                            <span className={`text-xs font-bold ${color} w-44 shrink-0`}>{label}</span>
                                            <input
                                                type="range"
                                                min={5}
                                                max={120}
                                                value={rules.escalation_timeouts_min[key]}
                                                onChange={e => setEscalation(key, Number(e.target.value))}
                                                style={{ 
                                                    background: `linear-gradient(to right, ${
                                                        key === "to_supervisor" ? "#f97316" : key === "to_manager" ? "#ef4444" : "#a855f7"
                                                    } ${((rules.escalation_timeouts_min[key] - 5) / 115) * 100}%, rgba(0,0,0,0.4) ${((rules.escalation_timeouts_min[key] - 5) / 115) * 100}%)`
                                                }}
                                                className="flex-1 h-2 rounded-full appearance-none cursor-pointer outline-none border border-white/5 transition-all
                                                    [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                                                    [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white 
                                                    [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(255,255,255,0.4)]
                                                    hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-90 
                                                    [&::-webkit-slider-thumb]:transition-all"
                                            />
                                            <span className="text-xs text-slate-400 font-mono w-14 text-right">
                                                {rules.escalation_timeouts_min[key]} min
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </CollapsibleSection>
                        </motion.div>
                    )}

                    {/* TAB: INVENTARIO */}
                    {activeTab === "inventory" && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 border border-white/10 rounded-[2rem] p-7 space-y-6"
                        >
                            <div>
                                <h3 className="text-base font-black uppercase tracking-widest text-white">Alertas de Inventario</h3>
                                <p className="text-xs text-slate-500 mt-1">Stock crítico, predicciones y anomalías de consumo</p>
                            </div>

                            <ToggleRow
                                label="Stock bajo mínimo configurado"
                                description="Alerta inmediata cuando un ítem baja de su stock mínimo"
                                enabled={rules.stock_alert_enabled}
                                onToggle={() => setRules(r => ({ ...r, stock_alert_enabled: !r.stock_alert_enabled }))}
                                icon={<Package size={16} className="text-emerald-400" />}
                            />

                            <div className="border-t border-white/5 pt-5">
                                <div className="flex items-center justify-between mb-2">
                                    <div className="flex items-center gap-2">
                                        <TrendingUp size={14} className="text-blue-400" />
                                        <span className="text-xs font-black uppercase tracking-widest text-slate-300">Mínimo de muestras para detección de anomalías</span>
                                    </div>
                                    <span className="text-sm font-black text-blue-400">{rules.anomaly_min_samples}</span>
                                </div>
                                <input
                                    type="range"
                                    min={5}
                                    max={60}
                                    value={rules.anomaly_min_samples}
                                    onChange={e => setRules(r => ({ ...r, anomaly_min_samples: Number(e.target.value) }))}
                                    style={{ 
                                        background: `linear-gradient(to right, #3b82f6 ${((rules.anomaly_min_samples - 5) / 55) * 100}%, rgba(0,0,0,0.4) ${((rules.anomaly_min_samples - 5) / 55) * 100}%)`
                                    }}
                                    className="w-full h-2 rounded-full appearance-none cursor-pointer outline-none border border-white/5 transition-all
                                        [&::-webkit-slider-thumb]:appearance-none [&::-webkit-slider-thumb]:w-5 [&::-webkit-slider-thumb]:h-5 
                                        [&::-webkit-slider-thumb]:rounded-full [&::-webkit-slider-thumb]:bg-white 
                                        [&::-webkit-slider-thumb]:shadow-[0_0_15px_rgba(59,130,246,0.5)]
                                        hover:[&::-webkit-slider-thumb]:scale-110 active:[&::-webkit-slider-thumb]:scale-90 
                                        [&::-webkit-slider-thumb]:transition-all"
                                />
                                <p className="text-[10px] text-slate-600 mt-1 italic">
                                    Se necesitan al menos {rules.anomaly_min_samples} registros de movimiento en 30 días para detectar consumo anómalo. Evita falsos positivos en sistemas nuevos.
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20">
                                <p className="text-[11px] text-amber-400/80 font-bold leading-relaxed uppercase tracking-tighter">
                                    INV-02 (predicción de quiebre) e INV-03 (consumo anómalo) se activarán en Sprint 4. Puedes configurarlos ahora.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* TAB: OPERACIONES */}
                    {activeTab === "operations" && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 border border-white/10 rounded-[2rem] p-7 space-y-6"
                        >
                            <div>
                                <h3 className="text-base font-black uppercase tracking-widest text-white">Alertas Operacionales</h3>
                                <p className="text-xs text-slate-500 mt-1">Mecánicos, OTs zombis y estado del equipo de campo</p>
                            </div>

                            <div className="p-5 rounded-2xl bg-purple-500/10 border border-purple-500/20 space-y-3">
                                <div className="flex items-center gap-2">
                                    <Ghost size={16} className="text-purple-400" />
                                    <span className="text-sm font-black uppercase tracking-widest text-purple-400">Reporte Semanal — OTs Fantasma</span>
                                </div>
                                <p className="text-xs text-slate-400 leading-relaxed">
                                    Cada lunes a las 8am, el sistema envía un reporte de OTs que superaron su ventana de activación.
                                    Estas OTs probablemente fueron resueltas en terreno pero no cerradas en el sistema.
                                </p>
                                <div className="p-3 rounded-xl bg-black/30 font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed">
                                    {`👻 OTs Fantasma — Semana actual\n• OT #AVISO-3201 (P2 · EDS Ñuñoa) — 18 días\n• OT #AVISO-2987 (P3 · EDS Yungay) — 22 días\nIngresa a la plataforma para cerrar o cancelar.`}
                                </div>
                            </div>

                            <ToggleRow
                                label="Digest diario 7am"
                                description="Resumen matutino para supervisores y managers (según timezone de la organización)"
                                enabled={true}
                                onToggle={() => { }}
                                icon={<TrendingUp size={16} className="text-blue-400" />}
                                disabled
                            />
                        </motion.div>
                    )}

                    {/* TAB: HORARIOS */}
                    {activeTab === "schedule" && (
                        <motion.div
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="bg-white/5 border border-white/10 rounded-[2rem] p-7 space-y-6"
                        >
                            <div>
                                <h3 className="text-base font-black uppercase tracking-widest text-white">Horarios y Silenciamiento</h3>
                                <p className="text-xs text-slate-500 mt-1">Fuera del horario laboral, solo se envían alertas críticas (P1)</p>
                            </div>

                            <div className="grid grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Inicio horario laboral</label>
                                    <input
                                        type="time"
                                        value={rules.working_hours.start}
                                        onChange={e => setWorkingHours("start", e.target.value)}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Fin horario laboral</label>
                                    <input
                                        type="time"
                                        value={rules.working_hours.end}
                                        onChange={e => setWorkingHours("end", e.target.value)}
                                        className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Zona Horaria</label>
                                <select
                                    value={rules.working_hours.timezone}
                                    onChange={e => setWorkingHours("timezone", e.target.value)}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3 text-white font-medium focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                >
                                    {TIMEZONES.map(tz => <option key={tz} value={tz}>{tz}</option>)}
                                </select>
                            </div>

                            <div className="space-y-2">
                                <label className="text-[10px] font-black uppercase tracking-widest text-slate-400">Hora del Digest Diario</label>
                                <input
                                    type="time"
                                    value={rules.digest_hour}
                                    onChange={e => setRules(r => ({ ...r, digest_hour: e.target.value }))}
                                    className="w-full bg-slate-900/50 border border-white/10 rounded-2xl px-4 py-3 text-white font-mono focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                                />
                                <p className="text-[10px] text-slate-600">
                                    El digest se entregará a las {rules.digest_hour} hora {rules.working_hours.timezone}
                                </p>
                            </div>

                            <div className="p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 flex gap-3">
                                <Info size={14} className="text-blue-400 shrink-0 mt-0.5" />
                                <p className="text-[11px] text-blue-300/80 leading-relaxed">
                                    Fuera del horario laboral ({rules.working_hours.start}–{rules.working_hours.end}), solo las alertas P1 se envían de inmediato.
                                    P2, P3 y P4 se encolan y llegan al inicio del siguiente día laboral.
                                </p>
                            </div>
                        </motion.div>
                    )}

                    {/* Botón Guardar */}
                    <div className="flex items-center justify-between">
                        <button
                            onClick={() => setPreviewVisible(!previewVisible)}
                            className="flex items-center gap-2 px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-sm font-bold text-slate-400 hover:text-white hover:bg-white/10 transition-all"
                        >
                            <Eye size={14} />
                            {previewVisible ? "Ocultar preview" : "Ver preview Telegram"}
                        </button>

                        <button
                            onClick={handleSave}
                            disabled={isSaving}
                            className={`flex items-center gap-3 px-10 py-4 rounded-2xl font-black text-sm uppercase tracking-widest transition-all active:scale-95 ${isSaving
                                ? "bg-slate-800 text-slate-500 cursor-not-allowed"
                                : saveStatus === "success"
                                    ? "bg-emerald-600 hover:bg-emerald-500 text-white"
                                    : saveStatus === "error"
                                        ? "bg-red-700 text-white"
                                        : "bg-blue-600 hover:bg-blue-500 text-white shadow-lg shadow-blue-900/30"
                                }`}
                        >
                            <AnimatePresence mode="wait">
                                {saveStatus === "success" ? (
                                    <motion.span key="ok" initial={{ scale: 0 }} animate={{ scale: 1 }} className="flex items-center gap-2">
                                        <CheckCircle2 size={16} /> Guardado
                                    </motion.span>
                                ) : isSaving ? (
                                    <motion.span key="saving">Guardando...</motion.span>
                                ) : (
                                    <motion.span key="idle" className="flex items-center gap-2">
                                        <Save size={16} /> Guardar cambios
                                    </motion.span>
                                )}
                            </AnimatePresence>
                        </button>
                    </div>
                </div>

                {/* ── Sidebar Derecho ────────────────────────────────────────── */}
                <div className="space-y-4">

                    {/* Preview Telegram */}
                    <AnimatePresence>
                        {previewVisible && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: "auto" }}
                                exit={{ opacity: 0, height: 0 }}
                                className="overflow-hidden"
                            >
                                <div className="p-5 rounded-2xl bg-black/40 border border-blue-500/30 space-y-3">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 bg-blue-400 rounded-full animate-pulse" />
                                        <span className="text-[10px] font-black uppercase tracking-widest text-blue-400">Preview — Telegram</span>
                                    </div>
                                    <pre className="font-mono text-[11px] text-slate-300 whitespace-pre-wrap leading-relaxed bg-[#17212b] rounded-xl p-4 border border-white/5">
                                        {previewMsg}
                                    </pre>
                                    <p className="text-[9px] text-slate-600">Se actualiza en tiempo real según la configuración de SLA P1.</p>
                                </div>
                            </motion.div>
                        )}
                    </AnimatePresence>

                    {/* Resumen de estado */}
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-4">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">Estado del Motor</h4>
                        <div className="space-y-2">
                            <StatusRow label="Telegram" active={rules.telegram_enabled} />
                            <StatusRow label="Alertas de Stock" active={rules.stock_alert_enabled} />
                            <StatusRow label="OTs Fantasma (semanal)" active />
                            <StatusRow label="Digest diario" active />
                        </div>
                    </div>

                    {/* Tabla SLA rápida */}
                    <div className="p-5 rounded-2xl bg-white/5 border border-white/10 space-y-3">
                        <h4 className="text-[10px] font-black uppercase tracking-widest text-slate-400">SLA Actual</h4>
                        {(Object.keys(PRIORITY_CONFIG) as (keyof typeof PRIORITY_CONFIG)[]).map(p => (
                            <div key={p} className="flex items-center justify-between">
                                <span className={`text-xs font-bold ${PRIORITY_CONFIG[p].color}`}>{p}</span>
                                <div className="flex items-center gap-2">
                                    <span className="text-xs text-slate-400">{rules.sla_hours[p] ?? "—"}h</span>
                                    <span className="text-[9px] text-slate-600">/ {rules.alert_window_days[p]}d ventana</span>
                                </div>
                            </div>
                        ))}
                    </div>

                    {/* Info org */}
                    <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                        <p className="text-[10px] font-black uppercase tracking-widest text-emerald-400 mb-1">Organización</p>
                        <p className="text-sm font-bold text-white">{org?.name ?? "—"}</p>
                        <p className="text-[10px] text-slate-500 font-mono mt-1">{rules.working_hours.timezone}</p>
                    </div>
                </div>
            </div>
        </div>
    );
}

// ─── Sub-componentes ───────────────────────────────────────────────────────────

function ToggleRow({ label, description, enabled, onToggle, icon, disabled }: {
    label: string; description: string; enabled: boolean;
    onToggle: () => void; icon: React.ReactNode; disabled?: boolean;
}) {
    return (
        <div className={`flex items-center justify-between gap-4 py-4 border-b border-white/5 ${disabled ? "opacity-50" : ""}`}>
            <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center shrink-0">{icon}</div>
                <div>
                    <p className="text-sm font-bold text-white">{label}</p>
                    <p className="text-xs text-slate-500 mt-0.5">{description}</p>
                    {disabled && <p className="text-[10px] text-amber-500 mt-1 uppercase font-bold">Próximamente</p>}
                </div>
            </div>
            <button
                onClick={disabled ? undefined : onToggle}
                className={`w-12 h-6 rounded-full transition-all relative shrink-0 ${enabled ? "bg-emerald-500" : "bg-slate-700"} ${disabled ? "cursor-not-allowed" : "cursor-pointer"}`}
            >
                <span className={`absolute top-1 w-4 h-4 rounded-full bg-white transition-all ${enabled ? "left-7" : "left-1"}`} />
            </button>
        </div>
    );
}

function StatusRow({ label, active }: { label: string; active: boolean }) {
    return (
        <div className="flex items-center justify-between">
            <span className="text-xs text-slate-400">{label}</span>
            <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-full ${active ? "bg-emerald-500/20 text-emerald-400" : "bg-slate-700/50 text-slate-500"}`}>
                {active ? "Activo" : "Inactivo"}
            </span>
        </div>
    );
}

function CollapsibleSection({ id, title, icon, children, expanded, setExpanded }: {
    id: string; title: string; icon: React.ReactNode;
    children: React.ReactNode;
    expanded: string | null;
    setExpanded: (v: string | null) => void;
}) {
    const isOpen = expanded === id;
    return (
        <div className="border-t border-white/5 pt-4">
            <button
                onClick={() => setExpanded(isOpen ? null : id)}
                className="flex items-center justify-between w-full text-left group"
            >
                <div className="flex items-center gap-2">
                    {icon}
                    <span className="text-xs font-black uppercase tracking-widest text-slate-300 group-hover:text-white transition-colors">{title}</span>
                </div>
                {isOpen ? <ChevronDown size={14} className="text-slate-500" /> : <ChevronRight size={14} className="text-slate-500" />}
            </button>
            <AnimatePresence>
                {isOpen && (
                    <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden"
                    >
                        <div className="pt-4">{children}</div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
