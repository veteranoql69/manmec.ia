import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

async function main() {
    console.log("=== CHECKING LPLR-15 STOCK DIRECTLY IN SUPABASE ===");

    // 1. Get vehicle and warehouse ID
    const { data: vehicle } = await supabase
        .from("manmec_vehicles")
        .select("id, plate")
        .eq("plate", "LPLR-15")
        .single();

    if (!vehicle) return console.log("Vehicle not found");

    console.log("Vehicle ID:", vehicle.id);

    // 2. Encontrar la bodega móvil del vehículo
    const { data: warehouse } = await supabase
        .from("manmec_warehouses")
        .select("id")
        .eq("vehicle_id", vehicle.id)
        .eq("type", "MOBILE")
        .maybeSingle();

    if (!warehouse) return console.log("Warehouse not found for vehicle");
    console.log("Warehouse ID:", warehouse.id);

    // 3. Obtener el stock con el inner join exacto que falla
    const { data: stock, error: stockError } = await supabase
        .from("manmec_inventory_stock")
        .select(`
            quantity,
            item:manmec_inventory_items!inner(name, sku, unit, is_sensitive)
        `)
        .eq("warehouse_id", warehouse.id)
        .gt("quantity", 0);

    console.log("Stock Result:");
    console.log(JSON.stringify(stock, null, 2));

    // 4. Herramientas Asignadas al vehículo
    const { data: tools, error: toolsError } = await supabase
        .from("manmec_tools")
        .select("id, name, serial_number, status, criticality")
        .eq("assigned_vehicle_id", vehicle.id)
        .is("deleted_at", null);

    console.log("Tools Result:");
    console.log(JSON.stringify(tools, null, 2));
    if (toolsError) console.error("Tools Error:", toolsError);
}

main().catch(console.error);
