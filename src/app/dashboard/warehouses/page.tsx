import { requireRole } from "@/lib/auth";
import { getWarehouses } from "./actions";
import { WarehouseManagementClient } from "@/components/dashboard/warehouses/WarehouseManagementClient";
import { Warehouse } from "lucide-react";
import { createClient } from "@/lib/supabase/server";

export default async function WarehousesPage() {
    const profile = await requireRole("SUPERVISOR");
    const warehouses = await getWarehouses();

    const supabase = await createClient();
    // Fetch items with their stock to pass to the transfer modal
    const { data: items } = await supabase
        .from("manmec_inventory_items")
        .select(`id, name, sku, stock:manmec_inventory_stock(quantity, warehouse_id)`)
        .eq("organization_id", profile.organization_id!)
        .eq("is_active", true)
        .order("name", { ascending: true });

    // Fetch vehicles to allow manual creation of Mobile Warehouses
    const { data: vehicles } = await supabase
        .from("manmec_vehicles")
        .select("id, plate, mobile_warehouse:manmec_warehouses(id)")
        .eq("organization_id", profile.organization_id!)
        .order("plate", { ascending: true });

    // Filter vehicles that do NOT have a warehouse assigned yet
    // Handle both array (if one-to-many left join in postgrest) or single object
    const availableVehicles = (vehicles || []).filter(v => {
        if (!v.mobile_warehouse) return true;
        if (Array.isArray(v.mobile_warehouse) && v.mobile_warehouse.length === 0) return true;
        return false;
    });

    return (
        <div className="p-6 md:p-10 min-h-screen bg-[#0a0a0a] text-white">
            <header className="mb-10 flex flex-col md:flex-row md:items-center justify-between gap-4">
                <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent tracking-tight">
                        Gestión de Bodegas
                    </h1>
                    <p className="text-slate-400 mt-2 flex items-center gap-2 font-medium">
                        <Warehouse className="w-4 h-4 text-emerald-500" />
                        Control de centros logísticos y furgones en terreno
                    </p>
                </div>
            </header>

            <WarehouseManagementClient
                initialWarehouses={warehouses}
                items={items || []}
                availableVehicles={availableVehicles.map(v => ({ id: v.id, plate: v.plate }))}
            />
        </div>
    );
}
