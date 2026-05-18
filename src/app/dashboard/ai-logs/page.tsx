import { getIaAutomationLogs } from "./actions";
import { AiAutomationLogsClient } from "@/components/dashboard/AiAutomationLogsClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Log IA | Manmec IA",
    description: "Avisos y órdenes de trabajo procesadas automáticamente por IA",
};

export default async function AiLogsPage() {
    const { logs, error } = await getIaAutomationLogs();

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">
            {/* Banner de acceso rápido al Monitor de Descuentos */}
            <div className="flex items-center justify-between bg-slate-800/50 border border-slate-700 rounded-xl px-5 py-4">
                <div>
                    <p className="text-white font-semibold text-sm">Monitor de Descuentos de Stock</p>
                    <p className="text-slate-400 text-xs mt-0.5">
                        Detecta OTs con descuentos faltantes y corrige movimientos desde el panel
                    </p>
                </div>
                <Link
                    href="/dashboard/ai-logs/stock-monitor"
                    className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm font-medium rounded-lg transition-colors shrink-0"
                >
                    <span>🔬</span>
                    <span>Abrir Monitor</span>
                </Link>
            </div>

            <AiAutomationLogsClient initialLogs={logs} fetchError={error} />
        </div>
    );
}
