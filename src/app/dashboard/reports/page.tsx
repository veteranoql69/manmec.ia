import { requireRole } from "@/lib/auth";
import ReportsDashboardClient from "@/components/dashboard/reports/ReportsDashboardClient";
import { getOperationalReportsData } from "./actions";

export default async function ReportsPage() {
    const profile = await requireRole("SUPERVISOR");
    const data = await getOperationalReportsData();

    return (
        <div className="p-2 md:p-6">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase tracking-widest mb-2">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                            Conectado a Datos Reales (Supabase)
                        </div>
                        <h1 className="text-3xl md:text-5xl font-black bg-gradient-to-r from-emerald-400 via-cyan-400 to-blue-500 bg-clip-text text-transparent uppercase tracking-tighter">
                            Reportes Gerenciales
                        </h1>
                        <p className="text-slate-400 font-medium text-sm">
                            Telemetría e Inteligencia Artificial aplicada a la Flota
                        </p>
                    </div>
                </header>

                <ReportsDashboardClient profile={profile} data={data} />
            </div>
        </div>
    );
}
