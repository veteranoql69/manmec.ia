import { createAdminClient } from '../src/lib/supabase/admin';
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function prepareStock() {
    const supabase = createAdminClient();
    const otId = '5bd15112-b260-49a7-8bdf-f02e2ecd1766'; // ID de la OT en el dashboard que pasó el user
    const finalUserId = 'c09534c9-cbd4-4bf3-bb9a-7acdd30abf98';

    console.log("🛠️ Preparing stock for OT Test...");

    // 1. Obtener la OT para ver su vehículo
    const { data: ot } = await supabase.from('manmec_work_orders').select('vehicle_id, organization_id').eq('id', otId).single();
    if (!ot || !ot.vehicle_id) {
        console.error("❌ OT or vehicle not found. Need to assign vehicle first.");
        return;
    }

    // 2. Buscar/Crear Bodega Móvil para el vehículo (hbjw-80 de la imagen)
    const { data: warehouse } = await supabase
        .from('manmec_warehouses')
        .select('id')
        .eq('vehicle_id', ot.vehicle_id)
        .eq('type', 'MOBILE')
        .maybeSingle();

    let warehouseId = warehouse?.id;
    if (!warehouseId) {
        console.log("📦 Creating mobile warehouse for vehicle...");
        const { data: newWh } = await supabase.from('manmec_warehouses').insert({
            organization_id: ot.organization_id,
            name: `Bodega Móvil HBJW-80`,
            type: 'MOBILE',
            vehicle_id: ot.vehicle_id
        }).select('id').single();
        warehouseId = newWh?.id;
    }

    // 3. Cargar Stock (SKU 410720 y 405534)
    const skus = ['410720', '405534'];
    for (const sku of skus) {
        const { data: item } = await supabase.from('manmec_inventory_items').select('id, name').eq('sku', sku).single();
        if (item) {
            console.log(`📥 Adding 50 units of ${item.name} to warehouse...`);
            // Usamos UPSERT en stock para simplificar
            const { data: existingStock } = await supabase
                .from('manmec_inventory_stock')
                .select('id, quantity')
                .eq('warehouse_id', warehouseId)
                .eq('item_id', item.id)
                .maybeSingle();

            if (existingStock) {
                await supabase.from('manmec_inventory_stock').update({ quantity: 50 }).eq('id', existingStock.id);
            } else {
                await supabase.from('manmec_inventory_stock').insert({
                    warehouse_id: warehouseId,
                    item_id: item.id,
                    quantity: 50
                });
            }
        }
    }
    console.log("✅ Stock prepared successfully.");
}

prepareStock();
