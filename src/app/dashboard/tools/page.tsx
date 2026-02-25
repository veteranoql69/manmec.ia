import { requireRole } from "@/lib/auth";
import { ToolsManagementClient } from "@/components/dashboard/tools/ToolsManagementClient";
import { getTools } from "./actions";
import { getTeamMembers } from "@/components/team/actions";
import { getVehicles } from "@/app/dashboard/fleet/actions";
import { Wrench } from "lucide-react";

export default async function ToolsPage() {
    const profile = await requireRole("SUPERVISOR");
    const tools = await getTools();
    const members = await getTeamMembers();
    const vehicles = await getVehicles();

    return (
        <div className="p-6 md:p-10 min-h-screen bg-[#0a0a0a] text-white">
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent tracking-tight uppercase">
                        Gestión de Herramientas
                    </h1>
                    <p className="text-slate-400 mt-2 flex items-center gap-2 font-medium">
                        <Wrench className="w-4 h-4 text-blue-500" />
                        Control de activos serializados y asignaciones
                    </p>
                </div>
            </header>

            <ToolsManagementClient
                initialTools={tools}
                members={members as any[]}
                vehicles={vehicles}
            />
        </div>
    );
}
