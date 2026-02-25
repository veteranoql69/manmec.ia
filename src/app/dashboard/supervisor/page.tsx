import { requireRole } from "@/lib/auth";
import { SupervisorDashboardClient } from "@/components/dashboard/SupervisorDashboardClient";
import { getDashboardStats, getCurrentOperations, getRecentChronology } from "./actions";

export default async function SupervisorDashboardPage() {
    // Solo SUPERVISOR o superior
    const profile = await requireRole("SUPERVISOR");

    // Obtener datos reales
    const [stats, currentOps, chronology] = await Promise.all([
        getDashboardStats(),
        getCurrentOperations(),
        getRecentChronology()
    ]);

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black bg-gradient-to-r from-emerald-400 to-cyan-500 bg-clip-text text-transparent uppercase tracking-tighter">
                            Control Operacional IA
                        </h1>
                        <p className="text-slate-500 font-medium">
                            Supervisando {profile.organization_id ? "Sonda Manmec" : "Organización"}
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        {/* Status pill */}
                        <div className="px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[10px] font-black uppercase flex items-center gap-2 tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.8)]"></span>
                            Sistema Online
                        </div>
                    </div>
                </header>

                <SupervisorDashboardClient
                    profile={profile}
                    stats={stats}
                    currentOps={currentOps}
                    chronology={chronology}
                />
            </div>
        </div>
    );
}
