"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

export async function getOperationalReportsData() {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    // Fecha hace 30 y 15 días
    const date30DaysAgo = new Date();
    date30DaysAgo.setDate(date30DaysAgo.getDate() - 30);
    const date15DaysAgo = new Date();
    date15DaysAgo.setDate(date15DaysAgo.getDate() - 15);

    /* =========================================================
       CUADRANTE 1: CONTROL DE AVANCE (Preventivas vs Correctivas)
       ========================================================= */
    
    // Total Preventivas en el sistema (idealmente las de este mes, pero por ahora sacamos totales activos/recientes)
    // Para simplificar lógica en este MVP, contaremos las recientes.
    const { data: q1PrevTotal } = await supabase
        .from("manmec_work_orders")
        .select("id")
        .eq("organization_id", profile.organization_id)
        .eq("ot_type", "PREVENTIVE");
    
    const { data: q1PrevClosed } = await supabase
        .from("manmec_work_orders")
        .select("id")
        .eq("organization_id", profile.organization_id)
        .eq("ot_type", "PREVENTIVE")
        .eq("status", "COMPLETED");

    const totalPrev = q1PrevTotal?.length || 1; // evitar division por 0
    const closedPrev = q1PrevClosed?.length || 0;
    const prevPercentage = Math.round((closedPrev / totalPrev) * 100);

    // Correctivas Activas (Pendientes o en Progreso)
    const { data: q1CorrActive } = await supabase
        .from("manmec_work_orders")
        .select("id")
        .eq("organization_id", profile.organization_id)
        .neq("ot_type", "PREVENTIVE") // Asumimos TODO lo demás es correctivo/urgencia
        .in("status", ["PENDING", "IN_PROGRESS"]);

    const activeCorr = q1CorrActive?.length || 0;

    /* =========================================================
       CUADRANTE 2: RADAR BURN-RATE (Velocidad Predictiva)
       ========================================================= */
       
    // a. Stock Actual por Item
    const { data: itemsStock } = await supabase
        .from("manmec_inventory_items")
        .select(`
            id, name, sku,
            stock:manmec_inventory_stock(quantity)
        `)
        .eq("organization_id", profile.organization_id);

    // b & a. Consumo de Materiales en OTs completadas
    const { data: completedOts } = await supabase
        .from("manmec_work_orders")
        .select(`
            id,
            completed_at,
            materials:manmec_work_order_materials(item_id, quantity)
        `)
        .eq("organization_id", profile.organization_id)
        .eq("status", "COMPLETED")
        .gte("completed_at", date30DaysAgo.toISOString());

    const materialsConsumed15d: any[] = [];
    let totalOut = 0;

    completedOts?.forEach(ot => {
        const isLast15Days = new Date(ot.completed_at) >= date15DaysAgo;
        if (ot.materials && Array.isArray(ot.materials)) {
            ot.materials.forEach(m => {
                totalOut += Number(m.quantity || 0); // para Q3
                if (isLast15Days) {
                    materialsConsumed15d.push(m); // para Q2
                }
            });
        }
    });

    // c. Despachos en Transito (PRE_ADVISED) - "En Camino"
    const { data: pendingShipments } = await supabase
        .from("manmec_shipments")
        .select(`
            id,
            items:manmec_shipment_items(item_id, expected_qty)
        `)
        .eq("organization_id", profile.organization_id)
        .eq("status", "PRE_ADVISED");

    // Mapear items en transito
    const itemsInTransit: Record<string, number> = {};
    pendingShipments?.forEach(shipment => {
        if (shipment.items && Array.isArray(shipment.items)) {
            shipment.items.forEach((i: any) => {
                const itemId = String(i.item_id);
                itemsInTransit[itemId] = (itemsInTransit[itemId] || 0) + Number(i.expected_qty || 0);
            });
        }
    });

    // Calcular Burn-Rate por item (Q2)
    const burnRates = (itemsStock || []).map(item => {
        // Stock total
        const stockItems = (item.stock as any[]) || [];
        const totalStock = stockItems.reduce((acc, s) => acc + Number(s.quantity), 0);

        // Consumo total 15d
        const itemConsumptions = materialsConsumed15d.filter(mc => mc.item_id === item.id);
        const totalConsumed15d = itemConsumptions.reduce((acc, mc) => acc + Number(mc.quantity), 0);
        
        let dailyConsumption = totalConsumed15d / 15;
        if (dailyConsumption === 0) dailyConsumption = 0.01; // Evitar infinity

        const daysToExhaust = Math.round(totalStock / dailyConsumption);

        return {
            id: item.id,
            name: item.name,
            stock: totalStock,
            dailyConsumption: Number(dailyConsumption.toFixed(1)),
            daysToExhaust,
            inTransit: itemsInTransit[item.id] || 0
        };
    })
    .filter(br => br.stock > 0 && br.dailyConsumption > 0.01) // Solo items que se gastan y tienen stock
    .sort((a, b) => a.daysToExhaust - b.daysToExhaust)
    .slice(0, 5); // Tomamos el Top 5 más crítico


    /* =========================================================
       CUADRANTE 3: BALANCE DE FLUJO (Últimos 30 días)
       ========================================================= */

    // a. Repuestos Instalados/Gastados (Últimos 30 días)
    // Ya calculado arriba en totalOut

    // b. Repuestos Recibidos (Guías RECEIVED últimos 30 días)
    const { data: completedShipments30d } = await supabase
        .from("manmec_shipments")
        .select(`
            id,
            items:manmec_shipment_items(received_qty, expected_qty)
        `)
        .eq("organization_id", profile.organization_id)
        .eq("status", "RECEIVED")
        .gte("created_at", date30DaysAgo.toISOString());

    let totalIn = 0;
    completedShipments30d?.forEach(shipment => {
        if (shipment.items && Array.isArray(shipment.items)) {
            shipment.items.forEach((i: any) => {
                totalIn += Number(i.received_qty || i.expected_qty || 0); 
            });
        }
    });

    const netBalance = totalIn - totalOut;

    /* =========================================================
       CUADRANTE 4: GASTO MÓVIL (Rentabilidad por Flota 30d)
       ========================================================= */

    // Traemos OTs completadas con su vehículo y materiales
    const { data: vehicleOts } = await supabase
        .from("manmec_work_orders")
        .select(`
            id,
            vehicle:manmec_vehicles(plate),
            assigned:manmec_users!assigned_to(full_name),
            materials:manmec_work_order_materials(quantity)
        `)
        .eq("organization_id", profile.organization_id)
        .eq("status", "COMPLETED")
        .not("vehicle_id", "is", null)
        .gte("created_at", date30DaysAgo.toISOString());

    const fleetUsageMap: Record<string, { plate: string, driver: string, otCount: number, materialsCount: number }> = {};

    vehicleOts?.forEach((ot: any) => {
        const plate = ot.vehicle?.plate || "Desconocido";
        const driver = ot.assigned?.full_name?.split(" ")[0] || "NA";
        const materialsUsed = (ot.materials || []).reduce((acc: number, m: any) => acc + Number(m.quantity), 0);

        if (!fleetUsageMap[plate]) {
            fleetUsageMap[plate] = { plate, driver, otCount: 0, materialsCount: 0 };
        }
        
        fleetUsageMap[plate].otCount += 1;
        fleetUsageMap[plate].materialsCount += materialsUsed;
    });

    const fleetEfficiency = Object.values(fleetUsageMap)
        .filter(f => f.otCount > 0)
        .map(f => {
            const ratio = f.materialsCount / f.otCount;
            return {
                ...f,
                ratio: Number(ratio.toFixed(2))
            };
        })
        .sort((a, b) => b.ratio - a.ratio); // De mayor gasto (pésimo) a menor gasto (excelente)

    const topFleet = fleetEfficiency.length > 0 ? fleetEfficiency : [
        { plate: "SIN DATA", driver: "", otCount: 0, materialsCount: 0, ratio: 0 }
    ];

    // ======== RETORNO DEL SUPER-OBJETO DE INTELIGENCIA ========
    return {
        q1: {
            totalPrev,
            closedPrev,
            prevPercentage,
            activeCorr
        },
        q2_burnRate: burnRates,
        q3: {
            totalIn,
            totalOut,
            netBalance
        },
        q4_fleet: topFleet
    };
}
