import { requireRole } from "@/lib/auth";
import { MechanicDashboardClient } from "@/components/dashboard/MechanicDashboardClient";

export default async function MechanicDashboardPage() {
    // Verificamos que sea MECHANIC o superior (aunque para mecánicos usaremos el dashboard específico)
    const profile = await requireRole("MECHANIC");

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Header */}
                <header className="flex flex-col space-y-2">
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-400 to-indigo-500 bg-clip-text text-transparent">
                        Panel de Operaciones
                    </h1>
                    <p className="text-slate-400">
                        Bienvenido, {profile.full_name}. Tienes OTs pendientes hoy.
                    </p>
                </header>

                <MechanicDashboardClient profile={profile} />
            </div>
        </div>
    );
}
