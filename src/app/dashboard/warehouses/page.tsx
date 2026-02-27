import { requireRole } from "@/lib/auth";
import { getWarehouses } from "./actions";
import { WarehouseManagementClient } from "@/components/dashboard/warehouses/WarehouseManagementClient";
import { Warehouse } from "lucide-react";

export default async function WarehousesPage() {
    await requireRole("SUPERVISOR");
    const warehouses = await getWarehouses();

    return (
        <div className="p-6 md:p-10 min-h-screen bg-[#0a0a0a] text-white">
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent tracking-tight">
                        Gestión de Bodegas
                    </h1>
                    <p className="text-slate-400 mt-2 flex items-center gap-2 font-medium">
                        <Warehouse className="w-4 h-4 text-emerald-500" />
                        Control de centros de acopio y stock físico centralizado
                    </p>
                </div>
            </header>

            <WarehouseManagementClient initialWarehouses={warehouses} />
        </div>
    );
}
