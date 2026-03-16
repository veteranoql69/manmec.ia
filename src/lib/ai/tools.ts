import { createClient } from "@supabase/supabase-js";

/**
 * Filtra los datos sensibles para el modelo de IA
 */
function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        // Durante el build, estas variables pueden no estar. 
        // Retornamos un proxy o lanzamos error solo si se intenta usar realmente.
        throw new Error("Supabase Admin credentials missing. Check environment variables.");
    }

    return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Consulta el stock de materiales o herramientas en una bodega específica o globalmente
 */
export async function getInventoryStock(organization_id: string, query?: string) {
    const supabase = getSupabaseAdmin();
    let supabaseQuery = supabase
        .from("manmec_inventory_stock")
        .select(`
            quantity,
            warehouse:manmec_warehouses(name),
            item:manmec_inventory_items!inner(name, criticality, unit, organization_id)
        `)
        .eq("item.organization_id", organization_id);

    if (query) {
        supabaseQuery = supabaseQuery.ilike("item.name", `%${query}%`);
    }

    const { data, error } = await supabaseQuery;
    if (error) throw error;
    return data;
}

/**
 * Consulta el estado de las órdenes de trabajo abiertas
 */
export async function getWorkOrders(organization_id: string, status?: string) {
    const supabase = getSupabaseAdmin();
    let supabaseQuery = supabase
        .from("manmec_work_orders")
        .select(`
            code,
            title,
            status,
            priority,
            created_at,
            station:manmec_service_stations(name),
            assignee:manmec_users!manmec_work_orders_assigned_to_fkey(full_name)
        `)
        .eq("organization_id", organization_id);

    if (status) {
        supabaseQuery = supabaseQuery.eq("status", status);
    }

    const { data, error } = await supabaseQuery;
    if (error) throw error;
    return data;
}

/**
 * Consulta información de las Estaciones de Servicio (EDS)
 */
export async function getServiceStations(organization_id: string, name_query?: string) {
    const supabase = getSupabaseAdmin();
    let supabaseQuery = supabase
        .from("manmec_service_stations")
        .select("name, code, address, manager_name, contact_phone")
        .eq("organization_id", organization_id);

    if (name_query) {
        supabaseQuery = supabaseQuery.ilike("name", `%${name_query}%`);
    }

    const { data, error } = await supabaseQuery;
    if (error) throw error;
    return data;
}
