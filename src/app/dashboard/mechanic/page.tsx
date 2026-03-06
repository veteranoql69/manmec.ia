import { requireRole } from "@/lib/auth";
import { SupervisorDashboardClient } from "@/components/dashboard/SupervisorDashboardClient";
import { getDashboardStats, getCurrentOperations, getRecentChronology, getCriticalInventory } from "./actions";

export default async function MechanicDashboardPage() {
    // Verificamos que sea MECHANIC o superior
    const profile = await requireRole("MECHANIC");

    // Obtener datos reales filtrados SOLO para las asignaciones del mecánico
    const [stats, currentOps, chronology, criticalInventory] = await Promise.all([
        getDashboardStats(),
        getCurrentOperations(),
        getRecentChronology(),
        getCriticalInventory()
    ]);

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-7xl mx-auto space-y-8">
                {/* Header idéntico en estilo visual al del Supervisor */}
                <header className="flex flex-col md:flex-row md:items-end justify-between gap-4">
                    <div className="space-y-2">
                        <h1 className="text-3xl font-black bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent uppercase tracking-tighter">
                            Panel de Operaciones
                        </h1>
                        <p className="text-slate-500 font-medium">
                            Bienvenido, {profile.full_name}. Tienes activas {stats.activeOts} OTs hoy.
                        </p>
                    </div>
                    <div className="flex space-x-3">
                        {/* Status pill */}
                        <div className="px-3 py-1 rounded-full bg-blue-500/10 border border-blue-500/20 text-blue-400 text-[10px] font-black uppercase flex items-center gap-2 tracking-widest">
                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse shadow-[0_0_8px_rgba(59,130,246,0.8)]"></span>
                            Modo Terreno
                        </div>
                    </div>
                </header>

                <SupervisorDashboardClient
                    profile={profile}
                    stats={stats}
                    currentOps={currentOps}
                    chronology={chronology}
                    criticalInventory={criticalInventory}
                />
            </div>
        </div>
    );
}
