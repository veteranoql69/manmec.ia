import { requireRole } from "@/lib/auth";
import { FleetManagementClient } from "@/components/dashboard/fleet/FleetManagementClient";
import { getVehicles } from "./actions";
import { Truck } from "lucide-react";

export default async function FleetPage() {
    const profile = await requireRole("SUPERVISOR");
    const vehicles = await getVehicles();

    return (
        <div className="p-6 md:p-10 min-h-screen bg-[#0a0a0a] text-white">
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent tracking-tight">
                        Gestión de Flota
                    </h1>
                    <p className="text-slate-400 mt-2 flex items-center gap-2 font-medium">
                        <Truck className="w-4 h-4" />
                        Control y catastro de vehículos operativos
                    </p>
                </div>
            </header>

            <FleetManagementClient initialVehicles={vehicles} />
        </div>
    );
}
