import { createAdminClient } from '../src/lib/supabase/admin';
import * as dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

async function searchItems() {
    const supabase = createAdminClient();

    const itemsToSearch = [
        { name: 'PROTECCION PLASTICO AZUL 6 HKB 11A OPW', code: '400417' },
        { name: 'CODO GIRATORIO 3/4" OPW MOD. 45-5060', code: '410720' }
    ];

    console.log("🔍 Searching for items in manmec_inventory_items...");

    for (const search of itemsToSearch) {
        const { data, error } = await supabase
            .from('manmec_inventory_items')
            .select('id, name, sku')
            .or(`name.ilike.%${search.name}%,sku.eq.${search.code}`)
            .limit(1);

        if (data && data.length > 0) {
            console.log(`✅ Found: ${search.name} -> ID: ${data[0].id}, SKU: ${data[0].sku}`);
        } else {
            console.log(`❌ Not found: ${search.name} (Code: ${search.code})`);
        }
    }

    // List some items just in case
    console.log("\n📦 Listing first 10 items for reference:");
    const { data: allItems } = await supabase.from('manmec_inventory_items').select('id, name, sku').limit(10);
    console.log(JSON.stringify(allItems, null, 2));
}

searchItems();
