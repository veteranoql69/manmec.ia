"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

/**
 * Obtiene las métricas clave para el panel del supervisor conectadas a datos reales
 */
export async function getDashboardStats() {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    // 1. OTs Activas (No terminadas ni canceladas)
    const { count: activeOts } = await supabase
        .from("manmec_work_orders")
        .select("*", { count: 'exact', head: true })
        .eq("organization_id", profile.organization_id)
        .not("status", "in", '("COMPLETED","CANCELLED")');

    // 2. Mecánicos en Ruta (Mecánicos asignados a OTs activas en este momento)
    const { count: activeMechanics } = await supabase
        .from("manmec_work_order_assignments")
        .select("mechanic_id", { count: 'exact', head: true })
        .eq("is_active", true);
    // Nota: Podríamos refinar esto uniendo con el estado de la OT, 
    // pero por ahora contamos asignaciones marcadas como activas.

    // 3. Stock Crítico (Basado en min_stock del catálogo)
    // Obtenemos los items y su stock actual
    const { data: items } = await supabase
        .from("manmec_inventory_items")
        .select(`
            id,
            min_stock,
            stock:manmec_inventory_stock(quantity)
        `)
        .eq("organization_id", profile.organization_id)
        .eq("is_active", true);

    const criticalCount = items?.filter(item => {
        const currentTotal = (item.stock as any[])?.reduce((acc, s) => acc + Number(s.quantity), 0) || 0;
        return currentTotal <= Number(item.min_stock);
    }).length || 0;

    return {
        activeOts: activeOts || 0,
        activeMechanics: activeMechanics || 0,
        criticalStock: criticalCount || 0
    };
}

/**
 * Obtiene los items específicos que están en stock crítico (Top 5)
 */
export async function getCriticalInventory() {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const { data: items } = await supabase
        .from("manmec_inventory_items")
        .select(`
            id,
            name,
            min_stock,
            stock:manmec_inventory_stock(quantity)
        `)
        .eq("organization_id", profile.organization_id)
        .eq("is_active", true);

    if (!items) return [];

    // Procesar y ordenar por los más críticos (menor stock relativo al mínimo)
    const processed = items.map(item => {
        const currentTotal = (item.stock as any[])?.reduce((acc, s) => acc + Number(s.quantity), 0) || 0;
        return {
            id: item.id,
            name: item.name,
            currentStock: currentTotal,
            minStock: Number(item.min_stock)
        };
    }).filter(item => item.currentStock <= item.minStock)
        .sort((a, b) => (a.currentStock - a.minStock) - (b.currentStock - b.minStock))
        .slice(0, 5);

    return processed;
}

/**
 * Obtiene la lista de operaciones en terreno filtradas por la org (Real Time)
 */
export async function getCurrentOperations() {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const { data: workOrders, error } = await supabase
        .from("manmec_work_orders")
        .select(`
            id,
            status,
            updated_at,
            assigned_user:assigned_to(full_name),
            vehicle:vehicle_id(plate)
        `)
        .eq("organization_id", profile.organization_id)
        .not("status", "in", '("COMPLETED","CANCELLED")')
        .order("updated_at", { ascending: false });

    if (error) {
        console.error("Error fetching current operations:", error);
        throw error;
    }

    return workOrders.map(wo => ({
        id: wo.id,
        mechanicName: (wo.assigned_user as any)?.full_name || "POR ASIGNAR",
        vehicle: (wo.vehicle as any)?.plate || "N/A",
        ot: wo.id,
        status: wo.status,
        updatedAt: wo.updated_at
    }));
}

/**
 * Obtiene el historial cronológico de la organización con un límite mayor para el cliente
 */
export async function getRecentChronology() {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

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
        .order("created_at", { ascending: false })
        .limit(30); // Aumentamos el límite para permitir agrupación eficiente en el cliente

    if (error) {
        console.error("Error fetching timeline:", error);
        return [];
    }

    const timelineData = data as any[];

    return timelineData.map(entry => {
        const userProfile = Array.isArray(entry.user) ? entry.user[0] : entry.user;
        const workOrder = Array.isArray(entry.work_order) ? entry.work_order[0] : entry.work_order;

        return {
            id: entry.id,
            content: entry.content || "",
            timestamp: entry.created_at,
            type: entry.entry_type,
            userName: userProfile?.full_name || "Sistema",
            otId: workOrder?.id?.slice(0, 8) || null
        };
    });
}
