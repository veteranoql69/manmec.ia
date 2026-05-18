"use client";

import { useState, useTransition } from "react";
import {
    searchBySku,
    getOtAuditTrail,
    registerManualDeduction,
    getUnregisteredDeductions,
    type SkuStockInfo,
    type OtAuditTrail,
    type UnregisteredDeduction,
} from "@/app/dashboard/ai-logs/stock-monitor/actions";

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────

function fmtDate(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleString("es-CL", {
        day: "2-digit", month: "2-digit", year: "numeric",
        hour: "2-digit", minute: "2-digit",
    });
}

function fmtDateShort(iso: string | null) {
    if (!iso) return "—";
    return new Date(iso).toLocaleDateString("es-CL", {
        day: "2-digit", month: "2-digit", year: "numeric",
    });
}

// ─────────────────────────────────────────────────────────────────────────────
// BADGE DE ESTADO
// ─────────────────────────────────────────────────────────────────────────────

function StatusBadge({ status }: { status: "ok" | "error" | "warning" | "pending" }) {
    const map = {
        ok:      { label: "OK",          cls: "bg-emerald-900/40 text-emerald-300 border-emerald-700" },
        error:   { label: "FALTANTE",    cls: "bg-red-900/40 text-red-300 border-red-700" },
        warning: { label: "ADVERTENCIA", cls: "bg-amber-900/40 text-amber-300 border-amber-700" },
        pending: { label: "PENDIENTE",   cls: "bg-slate-700/40 text-slate-300 border-slate-600" },
    };
    const { label, cls } = map[status];
    return (
        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full border ${cls}`}>
            {label}
        </span>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL A — BÚSQUEDA POR SKU
// ─────────────────────────────────────────────────────────────────────────────

function PanelSkuSearch() {
    const [sku, setSku] = useState("");
    const [result, setResult] = useState<SkuStockInfo | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleSearch() {
        if (!sku.trim()) return;
        setError(null);
        setResult(null);
        startTransition(async () => {
            const { data, error } = await searchBySku(sku.trim());
            if (error) setError(error);
            else setResult(data);
        });
    }

    const stockColor = result?.stock_actual == null
        ? "text-slate-400"
        : result.stock_actual <= 0
        ? "text-red-400"
        : result.stock_actual <= 5
        ? "text-amber-400"
        : "text-emerald-400";

    return (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <span className="text-lg">🔍</span>
                <h3 className="font-semibold text-white text-sm">Buscar por SKU</h3>
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={sku}
                    onChange={(e) => setSku(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="Ej: 400472"
                    className="flex-1 bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                    onClick={handleSearch}
                    disabled={isPending || !sku.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    {isPending ? "..." : "Buscar"}
                </button>
            </div>

            {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
                    {error}
                </div>
            )}

            {result && (
                <div className="flex flex-col gap-3">
                    {/* Info del ítem */}
                    <div className="bg-slate-900/50 rounded-lg p-4 flex flex-col gap-1">
                        <p className="text-xs text-slate-400 font-mono">{result.sku}</p>
                        <p className="text-white font-medium text-sm">{result.name}</p>
                        <div className="flex items-center gap-2 mt-2">
                            <span className="text-xs text-slate-400">Stock actual:</span>
                            <span className={`text-2xl font-bold ${stockColor}`}>
                                {result.stock_actual ?? "—"}
                            </span>
                            {result.bodega && (
                                <span className="text-xs text-slate-500">en {result.bodega}</span>
                            )}
                        </div>
                    </div>

                    {/* Historial de movimientos */}
                    <div>
                        <p className="text-xs text-slate-400 mb-2 font-medium uppercase tracking-wider">
                            Últimos movimientos
                        </p>
                        {result.movimientos.length === 0 ? (
                            <p className="text-slate-500 text-xs">Sin movimientos registrados.</p>
                        ) : (
                            <div className="flex flex-col gap-1 max-h-64 overflow-y-auto pr-1">
                                {result.movimientos.map((m) => (
                                    <div
                                        key={m.id}
                                        className="flex items-center justify-between bg-slate-900/40 rounded-lg px-3 py-2 text-xs"
                                    >
                                        <div className="flex items-center gap-2">
                                            <span className={
                                                m.type === "IN"
                                                    ? "text-emerald-400"
                                                    : m.type === "OUT"
                                                    ? "text-red-400"
                                                    : "text-amber-400"
                                            }>
                                                {m.type === "IN" ? "▲" : m.type === "OUT" ? "▼" : "◆"}
                                                {" "}{m.type}
                                            </span>
                                            <span className="text-slate-300">
                                                {m.type === "OUT" ? "-" : "+"}{m.quantity} uds
                                            </span>
                                            {m.ot_external_id && (
                                                <span className="text-slate-500 font-mono">OT {m.ot_external_id}</span>
                                            )}
                                        </div>
                                        <span className="text-slate-500">{fmtDateShort(m.created_at)}</span>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL B — DESCUENTOS SIN REGISTRO
// ─────────────────────────────────────────────────────────────────────────────

function PanelUnregistered({ initial }: { initial: UnregisteredDeduction[] }) {
    const [data, setData] = useState<UnregisteredDeduction[]>(initial);
    const [registering, setRegistering] = useState<Record<string, boolean>>({});
    const [msgs, setMsgs] = useState<Record<string, string>>({});
    const [isPending, startTransition] = useTransition();

    function handleRegister(woId: string, itemId: string, qty: number, key: string) {
        setRegistering((r) => ({ ...r, [key]: true }));
        startTransition(async () => {
            const { success, error } = await registerManualDeduction(woId, itemId, qty);
            if (success) {
                setMsgs((m) => ({ ...m, [key]: "✅ Registrado" }));
                // Quitar el material de la lista
                setData((prev) =>
                    prev
                        .map((d) => {
                            if (d.work_order_id !== woId) return d;
                            const updated = d.materials.map((mat) =>
                                mat.item_id === itemId ? { ...mat, has_movement: true } : mat
                            );
                            return { ...d, materials: updated };
                        })
                        .filter((d) => d.materials.some((mat) => !mat.has_movement))
                );
            } else {
                setMsgs((m) => ({ ...m, [key]: `❌ ${error}` }));
            }
            setRegistering((r) => ({ ...r, [key]: false }));
        });
    }

    function handleRefresh() {
        startTransition(async () => {
            const { data: fresh } = await getUnregisteredDeductions(14);
            setData(fresh);
        });
    }

    return (
        <div className="bg-slate-800/60 border border-amber-700/40 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                    <span className="text-lg">⚠️</span>
                    <h3 className="font-semibold text-white text-sm">Descuentos sin registro</h3>
                    <span className="text-xs font-bold px-2 py-0.5 bg-amber-800/50 text-amber-300 border border-amber-700 rounded-full">
                        {data.length} OTs afectadas
                    </span>
                </div>
                <button
                    onClick={handleRefresh}
                    disabled={isPending}
                    className="text-xs text-slate-400 hover:text-white transition-colors px-2 py-1 rounded border border-slate-700 hover:border-slate-500"
                >
                    {isPending ? "Actualizando..." : "↻ Actualizar"}
                </button>
            </div>

            {data.length === 0 ? (
                <div className="bg-emerald-900/20 border border-emerald-700/40 rounded-lg px-4 py-6 text-center">
                    <p className="text-emerald-400 font-medium text-sm">✅ Todo en orden</p>
                    <p className="text-slate-400 text-xs mt-1">No hay OTs con materiales sin descontar en los últimos 14 días</p>
                </div>
            ) : (
                <div className="flex flex-col gap-3 max-h-96 overflow-y-auto pr-1">
                    {data.map((d) => (
                        <div key={d.work_order_id} className="bg-slate-900/50 border border-slate-700 rounded-lg p-4 flex flex-col gap-2">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <p className="text-white text-xs font-medium truncate max-w-xs">
                                        {d.ot_title || `OT ${d.ot_external_id}`}
                                    </p>
                                    <div className="flex gap-2 mt-0.5">
                                        {d.ot_external_id && (
                                            <span className="text-slate-500 font-mono text-xs">Aviso {d.ot_external_id}</span>
                                        )}
                                        {d.station_name && (
                                            <span className="text-slate-500 text-xs">· {d.station_name}</span>
                                        )}
                                    </div>
                                </div>
                                <span className="text-slate-500 text-xs shrink-0">{fmtDateShort(d.completed_at)}</span>
                            </div>

                            {/* Materiales sin descuento */}
                            <div className="flex flex-col gap-1">
                                {d.materials.filter((m) => !m.has_movement).map((mat) => {
                                    const key = `${d.work_order_id}_${mat.item_id}`;
                                    return (
                                        <div
                                            key={key}
                                            className="flex items-center justify-between bg-red-900/20 border border-red-800/40 rounded-lg px-3 py-2"
                                        >
                                            <div className="flex items-center gap-2 min-w-0">
                                                <span className="text-red-400 text-xs">▼</span>
                                                <span className="font-mono text-xs text-slate-300 shrink-0">{mat.sku}</span>
                                                <span className="text-slate-400 text-xs truncate">{mat.item_name}</span>
                                                <span className="text-red-300 text-xs font-bold shrink-0">x{mat.quantity_expected}</span>
                                            </div>
                                            <div className="flex items-center gap-2 shrink-0">
                                                {msgs[key] ? (
                                                    <span className="text-xs">{msgs[key]}</span>
                                                ) : (
                                                    <button
                                                        onClick={() => handleRegister(d.work_order_id, mat.item_id, mat.quantity_expected, key)}
                                                        disabled={registering[key]}
                                                        className="text-xs px-3 py-1 bg-blue-700 hover:bg-blue-600 disabled:bg-slate-700 disabled:text-slate-500 text-white rounded-md transition-colors font-medium"
                                                    >
                                                        {registering[key] ? "..." : "Registrar"}
                                                    </button>
                                                )}
                                            </div>
                                        </div>
                                    );
                                })}
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// PANEL C — AUDITORÍA POR OT
// ─────────────────────────────────────────────────────────────────────────────

function StepIcon({ status }: { status: "ok" | "error" | "warning" | "pending" }) {
    if (status === "ok")      return <span className="w-6 h-6 rounded-full bg-emerald-700 text-white flex items-center justify-center text-xs font-bold shrink-0">✓</span>;
    if (status === "error")   return <span className="w-6 h-6 rounded-full bg-red-700 text-white flex items-center justify-center text-xs font-bold shrink-0">✗</span>;
    if (status === "warning") return <span className="w-6 h-6 rounded-full bg-amber-700 text-white flex items-center justify-center text-xs font-bold shrink-0">!</span>;
    return <span className="w-6 h-6 rounded-full bg-slate-600 text-white flex items-center justify-center text-xs shrink-0">○</span>;
}

function PanelAuditTrail() {
    const [search, setSearch] = useState("");
    const [result, setResult] = useState<OtAuditTrail | null>(null);
    const [error, setError] = useState<string | null>(null);
    const [isPending, startTransition] = useTransition();

    function handleSearch() {
        if (!search.trim()) return;
        setError(null);
        setResult(null);
        startTransition(async () => {
            const { data, error } = await getOtAuditTrail(search.trim());
            if (error) setError(error);
            else setResult(data);
        });
    }

    const statusSummary = result
        ? result.steps.some((s) => s.status === "error")
            ? "error"
            : result.steps.some((s) => s.status === "warning")
            ? "warning"
            : "ok"
        : null;

    return (
        <div className="bg-slate-800/60 border border-slate-700 rounded-xl p-5 flex flex-col gap-4">
            <div className="flex items-center gap-2">
                <span className="text-lg">🔬</span>
                <h3 className="font-semibold text-white text-sm">Trazabilidad por OT</h3>
                <span className="text-xs text-slate-500">Pipeline completo paso a paso</span>
            </div>

            <div className="flex gap-2">
                <input
                    type="text"
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    onKeyDown={(e) => e.key === "Enter" && handleSearch()}
                    placeholder="N° de aviso o SAP (ej: 82116986)"
                    className="flex-1 bg-slate-900/60 border border-slate-600 rounded-lg px-3 py-2 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-blue-500 font-mono"
                />
                <button
                    onClick={handleSearch}
                    disabled={isPending || !search.trim()}
                    className="px-4 py-2 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white text-sm font-medium rounded-lg transition-colors"
                >
                    {isPending ? "..." : "Auditar"}
                </button>
            </div>

            {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-lg px-4 py-3 text-red-300 text-sm">
                    {error}
                </div>
            )}

            {result && (
                <div className="flex flex-col gap-3">
                    {/* Header de la OT */}
                    <div className={`rounded-lg p-3 border flex items-start justify-between gap-2 ${
                        statusSummary === "ok"
                            ? "bg-emerald-900/20 border-emerald-700/40"
                            : statusSummary === "error"
                            ? "bg-red-900/20 border-red-700/40"
                            : "bg-amber-900/20 border-amber-700/40"
                    }`}>
                        <div>
                            <p className="text-white text-sm font-medium">{result.title || `OT ${result.external_id}`}</p>
                            <div className="flex gap-3 mt-0.5">
                                {result.external_id && <span className="text-slate-400 text-xs font-mono">Aviso {result.external_id}</span>}
                                {result.sap_order_id && <span className="text-slate-400 text-xs font-mono">SAP {result.sap_order_id}</span>}
                            </div>
                        </div>
                        <StatusBadge status={statusSummary!} />
                    </div>

                    {/* Steps del pipeline */}
                    <div className="flex flex-col gap-2">
                        {result.steps.map((step, idx) => (
                            <div
                                key={step.step}
                                className={`flex gap-3 p-3 rounded-lg border ${
                                    step.status === "ok"
                                        ? "bg-slate-900/30 border-slate-700"
                                        : step.status === "error"
                                        ? "bg-red-900/20 border-red-800/50"
                                        : step.status === "warning"
                                        ? "bg-amber-900/20 border-amber-800/50"
                                        : "bg-slate-900/20 border-slate-700/50"
                                }`}
                            >
                                <StepIcon status={step.status} />
                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center justify-between gap-2">
                                        <p className="text-sm text-white font-medium">{step.label}</p>
                                        {step.timestamp && (
                                            <span className="text-xs text-slate-500 shrink-0">{fmtDate(step.timestamp)}</span>
                                        )}
                                    </div>
                                    {step.detail && (
                                        <p className={`text-xs mt-0.5 break-words ${
                                            step.status === "error" ? "text-red-300" :
                                            step.status === "warning" ? "text-amber-300" :
                                            "text-slate-400"
                                        }`}>
                                            {step.detail}
                                        </p>
                                    )}
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    );
}

// ─────────────────────────────────────────────────────────────────────────────
// COMPONENTE PRINCIPAL
// ─────────────────────────────────────────────────────────────────────────────

interface Props {
    initialUnregistered: UnregisteredDeduction[];
}

export function StockMonitorClient({ initialUnregistered }: Props) {
    return (
        <div className="flex flex-col gap-6">
            {/* Header */}
            <div className="flex items-start justify-between">
                <div>
                    <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-white">Monitor de Descuentos de Stock</h2>
                        <span className="text-xs font-bold px-2.5 py-1 bg-red-900/40 text-red-300 border border-red-700 rounded-full uppercase tracking-wider">
                            Crítico
                        </span>
                    </div>
                    <p className="text-slate-400 text-sm mt-1">
                        Trazabilidad completa del descuento de repuestos por cierre de OT vía email
                    </p>
                </div>
            </div>

            {/* Alert si hay OTs con faltantes */}
            {initialUnregistered.length > 0 && (
                <div className="bg-amber-900/20 border border-amber-600/50 rounded-xl px-5 py-4 flex items-center gap-3">
                    <span className="text-2xl">⚠️</span>
                    <div>
                        <p className="text-amber-300 font-semibold text-sm">
                            {initialUnregistered.length} OT{initialUnregistered.length > 1 ? "s" : ""} con descuentos pendientes en los últimos 14 días
                        </p>
                        <p className="text-amber-400/70 text-xs mt-0.5">
                            Revisa el Panel B y registra los movimientos faltantes con un clic.
                        </p>
                    </div>
                </div>
            )}

            {/* Grid de paneles */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
                {/* Panel A: SKU */}
                <PanelSkuSearch />

                {/* Panel B: Sin registro */}
                <PanelUnregistered initial={initialUnregistered} />
            </div>

            {/* Panel C: Trazabilidad OT (ancho completo) */}
            <PanelAuditTrail />
        </div>
    );
}
