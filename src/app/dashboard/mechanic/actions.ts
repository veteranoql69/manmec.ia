"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

/**
 * Obtiene el ID de la bodega móvil asignada al mecánico actual
 */
async function getMechanicMobileWarehouseId(supabase: any, userId: string): Promise<string | null> {
    // Buscar la primera OT activa que tenga un vehículo asignado al mecánico
    const { data: assignments } = await supabase
        .from("manmec_work_order_assignments")
        .select("work_order_id")
        .eq("mechanic_id", userId);

    const assignedOtIds = assignments?.map((a: any) => a.work_order_id) || [];

    let query = supabase
        .from("manmec_work_orders")
        .select("vehicle_id")
        .in("status", ["IN_PROGRESS", "ASSIGNED", "PENDING"])
        .not("vehicle_id", "is", null);

    if (assignedOtIds.length > 0) {
        query = query.or(`assigned_to.eq.${userId},id.in.(${assignedOtIds.join(',')})`);
    } else {
        query = query.eq("assigned_to", userId);
    }

    const { data: otWithVehicle } = await query.limit(1).maybeSingle();

    if (!otWithVehicle?.vehicle_id) return null;

    // Obtener la bodega móvil del vehículo
    const { data: warehouse } = await supabase
        .from("manmec_warehouses")
        .select("id")
        .eq("vehicle_id", otWithVehicle.vehicle_id)
        .eq("type", "MOBILE")
        .single();

    return warehouse?.id || null;
}

/**
 * Obtiene las métricas clave para el panel del mecánico conectadas a sus datos reales
 */
export async function getDashboardStats() {
    const profile = await requireRole("MECHANIC");
    const supabase = await createClient();

    // 1. OTs Activas asignadas al mecánico (Líder o Apoyo)
    const { data: assignments } = await supabase
        .from("manmec_work_order_assignments")
        .select("work_order_id")
        .eq("mechanic_id", profile.id);

    const assignedOtIds = assignments?.map(a => a.work_order_id) || [];

    let activeOtsQuery = supabase
        .from("manmec_work_orders")
        .select("*", { count: 'exact', head: true })
        .eq("organization_id", profile.organization_id)
        .not("status", "in", '("COMPLETED","CANCELLED")');

    if (assignedOtIds.length > 0) {
        activeOtsQuery = activeOtsQuery.or(`assigned_to.eq.${profile.id},id.in.(${assignedOtIds.join(',')})`);
    } else {
        activeOtsQuery = activeOtsQuery.eq("assigned_to", profile.id);
    }

    const { count: activeOts } = await activeOtsQuery;

    // 3. Stock Crítico del furgón móvil
    let criticalCount = 0;
    const warehouseId = await getMechanicMobileWarehouseId(supabase, profile.id);

    if (warehouseId) {
        const { data: criticalStock } = await supabase
            .from("manmec_inventory_stock")
            .select(`
                quantity,
                item:manmec_inventory_items(min_stock)
            `)
            .eq("warehouse_id", warehouseId);

        if (criticalStock) {
            criticalCount = criticalStock.filter(s => {
                const item = s.item as any;
                return item?.min_stock > 0 && s.quantity <= item.min_stock;
            }).length;
        }
    }

    return {
        activeOts: activeOts || 0,
        activeMechanics: 1, // Se contabiliza a sí mismo
        criticalStock: criticalCount || 0
    };
}

/**
 * Obtiene los items específicos que están en stock crítico (Top 5) para el furgón
 */
export async function getCriticalInventory() {
    const profile = await requireRole("MECHANIC");
    const supabase = await createClient();

    const warehouseId = await getMechanicMobileWarehouseId(supabase, profile.id);
    if (!warehouseId) return [];

    const { data: stockRecords } = await supabase
        .from("manmec_inventory_stock")
        .select(`
            quantity,
            item:manmec_inventory_items(id, name, min_stock)
        `)
        .eq("warehouse_id", warehouseId);

    if (!stockRecords) return [];

    const processed = stockRecords.filter(s => {
        const item = s.item as any;
        return item?.min_stock > 0 && s.quantity <= item.min_stock;
    }).map(s => {
        const item = s.item as any;
        return {
            id: item.id,
            name: item.name,
            currentStock: s.quantity,
            minStock: Number(item.min_stock)
        };
    }).sort((a, b) => (a.currentStock - a.minStock) - (b.currentStock - b.minStock))
        .slice(0, 5);

    return processed;
}

/**
 * Obtiene la lista de operaciones en terreno filtradas para el mecánico actual
 */
export async function getCurrentOperations() {
    const profile = await requireRole("MECHANIC");
    const supabase = await createClient();

    const { data: assignments } = await supabase
        .from("manmec_work_order_assignments")
        .select("work_order_id")
        .eq("mechanic_id", profile.id);

    const assignedOtIds = assignments?.map(a => a.work_order_id) || [];

    let query = supabase
        .from("manmec_work_orders")
        .select(`
            id,
            status,
            created_at,
            updated_at,
            external_id,
            ot_type,
            assigned_user:assigned_to(full_name),
            vehicle:vehicle_id(plate),
            station:station_id(code)
        `)
        .eq("organization_id", profile.organization_id)
        .not("status", "in", '("COMPLETED","CANCELLED")')
        .order("updated_at", { ascending: false });

    if (assignedOtIds.length > 0) {
        query = query.or(`assigned_to.eq.${profile.id},id.in.(${assignedOtIds.join(',')})`);
    } else {
        query = query.eq("assigned_to", profile.id);
    }

    const { data: workOrders, error } = await query;

    if (error) {
        console.error("Error fetching current operations:", error);
        throw error;
    }

    return workOrders.map((wo: any) => {
        const assignedUser = wo.assigned_user as any;
        const vehicle = wo.vehicle as any;
        const station = wo.station as any;
        return {
            id: wo.id,
            mechanicName: assignedUser?.full_name || profile.full_name,
            vehicle: vehicle?.plate || "N/A",
            ot: wo.id,
            externalId: wo.external_id,
            stationCode: station?.code || null,
            otType: (wo.ot_type as string) || "CORRECTIVE",
            status: wo.status,
            createdAt: wo.created_at,
            updatedAt: wo.updated_at
        };
    });
}

/**
 * Obtiene el historial cronológico del mecánico
 */
export async function getRecentChronology() {
    const profile = await requireRole("MECHANIC");
    const supabase = await createClient();

    // Obtener la cronología donde él es el autor
    const { data, error } = await supabase
        .from("manmec_work_order_timeline")
        .select(`
            id,
            content,
            created_at,
            entry_type,
            user:user_id(full_name),
            work_order:work_order_id(id)
        `)
        .eq("user_id", profile.id)
        .order("created_at", { ascending: false })
        .limit(30);

    if (error) {
        console.error("Error fetching timeline:", error);
        return [];
    }

    const timelineData = (data || []) as Array<{
        id: string;
        content: string | null;
        created_at: string;
        entry_type: string;
        user: unknown;
        work_order: unknown;
    }>;

    return timelineData.map(entry => {
        const userProfile = Array.isArray(entry.user) ? entry.user[0] : (entry.user as { full_name: string } | null);
        const workOrder = Array.isArray(entry.work_order) ? entry.work_order[0] : (entry.work_order as { id: string } | null);

        return {
            id: entry.id,
            content: entry.content || "",
            timestamp: entry.created_at,
            type: entry.entry_type,
            userName: userProfile?.full_name || profile.full_name,
            otId: workOrder?.id?.slice(0, 8) || null
        };
    });
}
