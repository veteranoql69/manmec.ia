import { getUnregisteredDeductions } from "./actions";
import { StockMonitorClient } from "@/components/dashboard/StockMonitorClient";
import Link from "next/link";

export const dynamic = "force-dynamic";

export const metadata = {
    title: "Monitor de Descuentos | Manmec IA",
    description: "Auditoría de descuentos de stock por cierre de OT vía email",
};

export default async function StockMonitorPage() {
    const { data: unregistered, error } = await getUnregisteredDeductions(14);

    return (
        <div className="p-4 md:p-8 max-w-7xl mx-auto flex flex-col gap-6">
            {/* Breadcrumb */}
            <nav className="flex items-center gap-2 text-sm text-slate-400">
                <Link href="/dashboard" className="hover:text-white transition-colors">
                    Dashboard
                </Link>
                <span>/</span>
                <Link href="/dashboard/ai-logs" className="hover:text-white transition-colors">
                    Log IA
                </Link>
                <span>/</span>
                <span className="text-white">Monitor de Descuentos</span>
            </nav>

            {error && (
                <div className="bg-red-900/30 border border-red-700 rounded-xl px-5 py-4 text-red-300 text-sm">
                    Error al cargar datos: {error}
                </div>
            )}

            <StockMonitorClient initialUnregistered={unregistered ?? []} />
        </div>
    );
}
