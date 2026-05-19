"use client";

import { useState, useTransition } from "react";
import { updateWorkOrderStatus } from "@/app/dashboard/ots/actions";
import { ChevronDown, Loader2 } from "lucide-react";

const STATUS_OPTIONS = [
    { value: "PENDING",     label: "En Espera",   dot: "bg-slate-500" },
    { value: "ASSIGNED",    label: "Asignado",    dot: "bg-indigo-500" },
    { value: "IN_PROGRESS", label: "En Proceso",  dot: "bg-blue-500 animate-pulse" },
    { value: "PAUSED",      label: "Pausado",     dot: "bg-amber-500" },
    { value: "DERIVADO",    label: "Derivado",    dot: "bg-purple-500" },
    { value: "COMPLETED",   label: "Cerrado",     dot: "bg-emerald-500" },
    { value: "CANCELLED",   label: "Cancelado",   dot: "bg-red-500" },
] as const;

const DOT_COLORS: Record<string, string> = {
    PENDING:     "bg-slate-500",
    ASSIGNED:    "bg-indigo-500",
    IN_PROGRESS: "bg-blue-500 animate-pulse",
    PAUSED:      "bg-amber-500",
    DERIVADO:    "bg-purple-500",
    COMPLETED:   "bg-emerald-500",
    CANCELLED:   "bg-red-500",
};

interface OTStatusChangerProps {
    otId: string;
    currentStatus: string;
    role: string;
}

export function OTStatusChanger({ otId, currentStatus, role }: OTStatusChangerProps) {
    const [status, setStatus] = useState(currentStatus);
    const [isPending, startTransition] = useTransition();
    const [saved, setSaved] = useState(false);

    const canEdit = role === "COMPANY_ADMIN" || role === "MANAGER";
    const currentOption = STATUS_OPTIONS.find(o => o.value === status);

    if (!canEdit) {
        return (
            <div className="flex items-center gap-3">
                <div className={`w-3 h-3 rounded-full ${DOT_COLORS[status] ?? "bg-slate-500"}`} />
                <span className="font-black uppercase tracking-tight">
                    {currentOption?.label ?? status}
                </span>
            </div>
        );
    }

    const handleChange = (newStatus: string) => {
        if (newStatus === status) return;
        setSaved(false);
        startTransition(async () => {
            try {
                await updateWorkOrderStatus(otId, newStatus);
                setStatus(newStatus);
                setSaved(true);
                setTimeout(() => setSaved(false), 2500);
            } catch {
                // el error se propaga desde el server action
            }
        });
    };

    return (
        <div className="space-y-2">
            <div className="relative">
                <div className={`absolute left-3 top-1/2 -translate-y-1/2 w-2.5 h-2.5 rounded-full ${DOT_COLORS[status] ?? "bg-slate-500"}`} />
                <select
                    value={status}
                    onChange={e => handleChange(e.target.value)}
                    disabled={isPending}
                    className="w-full appearance-none bg-white/5 border border-white/10 rounded-xl pl-8 pr-10 py-2.5 text-sm font-black uppercase tracking-tight text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 disabled:opacity-60 cursor-pointer hover:border-blue-500/30 transition-colors"
                >
                    {STATUS_OPTIONS.map(opt => (
                        <option key={opt.value} value={opt.value} className="bg-[#0a0a0a]">
                            {opt.label}
                        </option>
                    ))}
                </select>
                <div className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2">
                    {isPending
                        ? <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />
                        : <ChevronDown className="w-4 h-4 text-slate-500" />
                    }
                </div>
            </div>
            {saved && (
                <p className="text-[10px] text-emerald-400 font-bold uppercase tracking-widest pl-1">
                    ✓ Estado actualizado
                </p>
            )}
        </div>
    );
}
