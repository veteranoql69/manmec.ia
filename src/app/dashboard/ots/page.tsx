import { requireRole } from "@/lib/auth";
import { getWorkOrders } from "./actions";
import { OTListClient } from "@/components/dashboard/ots/OTListClient";
import { ClipboardList } from "lucide-react";

export default async function WorkOrdersPage() {
    const profile = await requireRole("SUPERVISOR");
    const workOrders = await getWorkOrders();

    return (
        <div className="p-6 md:p-10 min-h-screen bg-[#0a0a0a] text-white">
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent tracking-tight">
                        Órdenes de Trabajo
                    </h1>
                    <p className="text-slate-400 mt-2 flex items-center gap-2 font-medium">
                        <ClipboardList className="w-4 h-4 text-blue-500" />
                        Listado maestro y control de requerimientos
                    </p>
                </div>
            </header>

            <OTListClient initialOts={workOrders} />
        </div>
    );
}
