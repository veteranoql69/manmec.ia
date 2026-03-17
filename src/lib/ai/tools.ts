import { createClient } from "@supabase/supabase-js";
import { Client } from "pg";

/**
 * Filtra los datos sensibles para el modelo de IA
 */
function getSupabaseAdmin() {
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseServiceKey) {
        throw new Error("Supabase Admin credentials missing. Check environment variables.");
    }

    return createClient(supabaseUrl, supabaseServiceKey);
}

/**
 * Ejecuta una consulta SQL de solo lectura (READ-ONLY) contra la base de datos.
 * Esta es la herramienta principal del Agente IA-SQL.
 */
export async function executeReadOnlyQuery(organization_id: string, sql: string) {
    if (!process.env.DATABASE_URL) {
        throw new Error("DATABASE_URL is missing.");
    }

    // Seguridad básica: Solo permitir SELECT
    const normalizedSql = sql.trim().toUpperCase();
    if (!normalizedSql.startsWith("SELECT")) {
        throw new Error("Only SELECT queries are allowed for security reasons.");
    }

    // Prevenir comandos destructivos o de escritura
    const forbiddenKeywords = ["INSERT", "UPDATE", "DELETE", "DROP", "TRUNCATE", "ALTER", "CREATE", "GRANT", "REVOKE"];
    for (const keyword of forbiddenKeywords) {
        if (normalizedSql.includes(keyword + " ") || normalizedSql.includes(" " + keyword)) {
          throw new Error(`Security violation: Forbidden keyword '${keyword}' detected.`);
        }
    }

    const client = new Client({
        connectionString: process.env.DATABASE_URL,
        ssl: { rejectUnauthorized: false } // Supabase requiere SSL
    });

    try {
        await client.connect();
        
        // Ejecutar la consulta
        // NOTA: El prompt del sistema obliga a la IA a incluir siempre el organization_id
        console.log(`[AI-SQL] Ejecutando: ${sql}`);
        const res = await client.query(sql);
        
        return res.rows;
    } catch (error: any) {
        console.error("[AI-SQL ERROR]", error);
        return { error: error.message };
    } finally {
        await client.end();
    }
}

/**
 * Consulta el stock de materiales o herramientas (Búsqueda Avanzada)
 * Busca por nombre, descripción o SKU y retorna la bodega.
 */
export async function getInventoryStock(organization_id: string, query?: string) {
    // ... (Mantener por compatibilidad interna de momento)
    const supabase = getSupabaseAdmin();
    let supabaseQuery = supabase
        .from("manmec_inventory_stock")
        .select(`
            quantity,
            warehouse:manmec_warehouses(name, type),
            item:manmec_inventory_items!inner(id, sku, name, description, unit, organization_id)
        `)
        .eq("item.organization_id", organization_id);

    if (query) {
        supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,sku.ilike.%${query}%,description.ilike.%${query}%`, { foreignTable: 'manmec_inventory_items' });
    }

    const { data, error } = await supabaseQuery;
    if (error) throw error;

    return data.map((s: any) => ({
        sku: s.item.sku,
        nombre: s.item.name,
        cantidad: s.quantity,
        unidad: s.item.unit,
        bodega: s.warehouse.name,
        tipo_bodega: s.warehouse.type
    }));
}

/**
 * Consulta las órdenes de trabajo activas con detalle de mecánicos asignados.
 */
export async function getWorkOrders(organization_id: string, status?: string) {
    const supabase = getSupabaseAdmin();
    let supabaseQuery = supabase
        .from("manmec_work_orders")
        .select(`
            id,
            external_id,
            title,
            status,
            priority,
            created_at,
            station:manmec_service_stations(name, code),
            assignments:manmec_work_order_assignments(
                mechanic:manmec_users(full_name)
            )
        `)
        .eq("organization_id", organization_id);

    if (status) {
        supabaseQuery = supabaseQuery.eq("status", status);
    } else {
        supabaseQuery = supabaseQuery.not("status", "in", '("COMPLETED","CANCELLED")');
    }

    const { data, error } = await supabaseQuery;
    if (error) throw error;

    return data.map((wo: any) => ({
        id_sistema: wo.id,
        aviso: wo.external_id,
        titulo: wo.title,
        estado: wo.status,
        estacion: wo.station?.name,
        estacion_codigo: wo.station?.code,
        mecanicos: wo.assignments?.map((a: any) => a.mechanic?.full_name).join(", ") || "Sin asignar"
    }));
}

/**
 * Consulta información de las Estaciones de Servicio (EDS) por nombre o código SAP.
 */
export async function getServiceStations(organization_id: string, query?: string) {
    const supabase = getSupabaseAdmin();
    let supabaseQuery = supabase
        .from("manmec_service_stations")
        .select("name, code, sap_store_code, address, manager_name, contact_phone")
        .eq("organization_id", organization_id);

    if (query) {
        supabaseQuery = supabaseQuery.or(`name.ilike.%${query}%,code.ilike.%${query}%,sap_store_code.ilike.%${query}%`);
    }

    const { data, error } = await supabaseQuery;
    if (error) throw error;
    return data;
}

/**
 * Consulta el estado actual de los mecánicos (qué están haciendo).
 */
export async function getMechanicsStatus(organization_id: string) {
    const supabase = getSupabaseAdmin();
    
    const { data, error } = await supabase
        .from("manmec_work_order_assignments")
        .select(`
            assigned_at,
            mechanic:manmec_users!inner(full_name, organization_id),
            work_order:manmec_work_orders!inner(id, external_id, title, status, station:manmec_service_stations(name))
        `)
        .eq("mechanic.organization_id", organization_id)
        .not("work_order.status", "in", '("COMPLETED","CANCELLED")');

    if (error) throw error;

    return data.map((a: any) => ({
        mecanico: a.mechanic.full_name,
        tarea_actual: a.work_order.title,
        ot_aviso: a.work_order.external_id,
        lugar: a.work_order.station?.name,
        estado_ot: a.work_order.status
    }));
}
