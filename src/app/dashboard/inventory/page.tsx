import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Package, Plus } from "lucide-react";
import { InventoryClient } from "@/components/dashboard/inventory/InventoryClient";

export default async function InventoryPage({
    searchParams,
}: {
    searchParams: Promise<{ [key: string]: string | string[] | undefined }>
}) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();
    const resolvedParams = await searchParams;
    const initialWarehouseId = typeof resolvedParams.warehouse === 'string' ? resolvedParams.warehouse : "all";

    // 1. Consultar bodegas disponibles
    const { data: warehouses } = await supabase
        .from("manmec_warehouses")
        .select("*")
        .eq("organization_id", profile.organization_id!)
        .eq("is_active", true)
        .order("name", { ascending: true });

    // 2. Consultar catálogo enriquecido con stock real (por bodega)
    const { data: items, error } = await supabase
        .from("manmec_inventory_items")
        .select(`
            *,
            stock:manmec_inventory_stock(
                quantity,
                warehouse_id
            )
        `)
        .eq("organization_id", profile.organization_id!)
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error al cargar inventario:", error);
    }

    // 3. Procesar los items para tener el total_stock calculado
    const enrichedItems = items?.map(item => {
        const stockData = (item as any).stock || [];
        const total = (stockData as any[]).reduce((sum, s) => sum + Number(s.quantity), 0);

        return {
            id: item.id,
            name: item.name,
            sku: item.sku,
            barcode: item.barcode,
            unit: item.unit,
            min_stock: item.min_stock,
            total_stock: total,
            stock_by_warehouse: stockData // Pasamos el desglose por bodega al cliente
        };
    }) || [];

    // 4. Consultar herramientas disponibles
    const { data: tools, error: toolsError } = await supabase
        .from("manmec_tools")
        .select("*")
        .eq("organization_id", profile.organization_id!)
        .order("name", { ascending: true });

    if (toolsError) {
        console.error("Error al cargar herramientas:", toolsError);
    }

    // 5. Consultar traspasos entrantes pendientes para las bodegas donde el usuario tiene acceso
    const { data: pendingTransfers, error: pendingError } = await supabase
        .from("manmec_inventory_transfers")
        .select(`
            id,
            quantity,
            created_at,
            item:manmec_inventory_items(name, sku),
            tool:manmec_tools(name, serial_number),
            sender:manmec_users!manmec_inventory_transfers_sender_id_fkey(full_name),
            from_warehouse:manmec_warehouses!manmec_inventory_transfers_from_warehouse_id_fkey(name)
        `)
        .eq("organization_id", profile.organization_id!)
        .eq("status", "PENDING")
        .order("created_at", { ascending: false });

    if (pendingError) {
        console.error("DEBUG FETCHING TRANSFERS ERROR:", pendingError);
    }

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                {/* Componente Cliente para Filtros, Cambio de Vista, Bodegas y Creación */}
                <InventoryClient
                    initialItems={enrichedItems}
                    initialTools={tools || []}
                    warehouses={warehouses || []}
                    initialWarehouseId={initialWarehouseId}
                    pendingTransfers={pendingTransfers || []}
                />
            </div>
        </div>
    );
}
