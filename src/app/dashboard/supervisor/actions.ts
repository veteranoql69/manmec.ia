"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";

/**
 * Obtiene las métricas clave para el panel del supervisor
 */
export async function getDashboardStats() {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    // 1. OTs Activas (No terminadas)
    const { count: activeOts } = await supabase
        .from("manmec_work_orders")
        .select("*", { count: 'exact', head: true })
        .eq("organization_id", profile.organization_id)
        .not("status", "eq", "COMPLETED")
        .not("status", "eq", "CANCELLED");

    // 2. Mecánicos en Ruta (Asignados a OTs activas)
    const { count: activeMechanics } = await supabase
        .from("manmec_work_order_assignments")
        .select("mechanic_id", { count: 'exact', head: true })
    // Nota: Esto requeriría un join o filtrar por OTs activas. 
    // Por ahora simplificamos a mecánicos diferentes en asignaciones.
    // Pero idealmente es mecánicos con OTs en estado distinto a COMPLETED.

    // 3. Stock Crítico
    const { count: criticalItems } = await supabase
        .from("manmec_inventory_items")
        .select("*", { count: 'exact', head: true })
    // .lte("current_stock", "min_stock") // Esto requiere join con tabla stock.

    return {
        activeOts: activeOts || 0,
        activeMechanics: 5, // Hardcoded por ahora hasta tener lógica de ruta
        criticalStock: criticalItems || 0
    };
}

/**
 * Obtiene la lista de operaciones en terreno filtradas por la org
 */
export async function getCurrentOperations() {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    // Consultar las OTs activas como fuente principal
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
        .not("status", "eq", "COMPLETED")
        .not("status", "eq", "CANCELLED")
        .order("created_at", { ascending: false });

    if (error) {
        console.error("Error fetching current operations:", error);
        throw error;
    }

    return workOrders.map(wo => ({
        id: wo.id,
        mechanicName: (wo.assigned_user as any)?.full_name || "POR ASIGNAR",
        vehicle: (wo.vehicle as any)?.plate || "N/A",
        ot: wo.id, // Pasamos el ID completo para el enlace
        status: wo.status,
        updatedAt: wo.updated_at
    }));
}

/**
 * Obtiene el historial cronológico de la organización
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
        .limit(10);

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
            content: entry.content,
            timestamp: entry.created_at,
            type: entry.entry_type,
            userName: userProfile?.full_name || "Sistema",
            otId: workOrder?.id?.slice(0, 8)
        };
    });
}
