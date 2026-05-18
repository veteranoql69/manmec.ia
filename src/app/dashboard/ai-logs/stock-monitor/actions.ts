"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

// ─────────────────────────────────────────────────────────────────────────────
// TIPOS
// ─────────────────────────────────────────────────────────────────────────────

export interface SkuStockInfo {
    item_id: string;
    sku: string;
    name: string;
    stock_actual: number | null;
    bodega: string | null;
    movimientos: SkuMovement[];
}

export interface SkuMovement {
    id: string;
    type: "IN" | "OUT" | "ADJUSTMENT";
    quantity: number;
    reason: string | null;
    created_at: string;
    ot_external_id: string | null;
    bodega: string | null;
}

export interface UnregisteredDeduction {
    work_order_id: string;
    ot_external_id: string | null;
    sap_order_id: string | null;
    ot_title: string | null;
    completed_at: string | null;
    station_name: string | null;
    materials: UnregisteredMaterial[];
}

export interface UnregisteredMaterial {
    item_id: string;
    sku: string;
    item_name: string;
    quantity_expected: number;
    has_movement: boolean;
}

export interface OtAuditStep {
    step: string;
    label: string;
    status: "ok" | "error" | "warning" | "pending";
    detail: string | null;
    timestamp: string | null;
}

export interface OtAuditTrail {
    work_order_id: string;
    external_id: string | null;
    sap_order_id: string | null;
    title: string | null;
    wo_status: string;
    steps: OtAuditStep[];
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION 1: Búsqueda por SKU
// ─────────────────────────────────────────────────────────────────────────────

export async function searchBySku(
    sku: string
): Promise<{ data: SkuStockInfo | null; error: string | null }> {
    try {
        const profile = await requireRole("MANAGER");
        const supabase = await createClient();
        const orgId = profile.organization_id;

        // Buscar el ítem
        const { data: item, error: itemErr } = await supabase
            .from("manmec_inventory_items")
            .select("id, sku, name")
            .eq("organization_id", orgId)
            .eq("sku", sku.trim())
            .maybeSingle();

        if (itemErr) return { data: null, error: itemErr.message };
        if (!item) return { data: null, error: `SKU "${sku}" no encontrado en el catálogo.` };

        // Stock actual en bodega central (FIXED)
        const { data: stock } = await supabase
            .from("manmec_inventory_stock")
            .select("quantity, manmec_warehouses(name)")
            .eq("item_id", item.id)
            .limit(1)
            .maybeSingle();

        // Últimos 20 movimientos
        const { data: movimientos } = await supabase
            .from("manmec_inventory_movements")
            .select(`
                id,
                type,
                quantity,
                reason,
                created_at,
                manmec_warehouses(name),
                manmec_work_orders(external_id)
            `)
            .eq("item_id", item.id)
            .order("created_at", { ascending: false })
            .limit(20);

        return {
            data: {
                item_id: item.id,
                sku: item.sku,
                name: item.name,
                stock_actual: (stock as any)?.quantity ?? null,
                bodega: (stock as any)?.manmec_warehouses?.name ?? null,
                movimientos: (movimientos || []).map((m: any) => ({
                    id: m.id,
                    type: m.type,
                    quantity: m.quantity,
                    reason: m.reason,
                    created_at: m.created_at,
                    ot_external_id: m.manmec_work_orders?.external_id ?? null,
                    bodega: m.manmec_warehouses?.name ?? null,
                })),
            },
            error: null,
        };
    } catch (err: any) {
        return { data: null, error: err.message };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION 2: OTs completadas sin descuento registrado (últimos N días)
// ─────────────────────────────────────────────────────────────────────────────

export async function getUnregisteredDeductions(
    days = 14
): Promise<{ data: UnregisteredDeduction[]; error: string | null }> {
    try {
        const profile = await requireRole("MANAGER");
        const supabase = await createClient();
        const orgId = profile.organization_id;

        const since = new Date();
        since.setDate(since.getDate() - days);

        // OTs completadas con materiales asociados
        const { data: wos, error: wosErr } = await supabase
            .from("manmec_work_orders")
            .select(`
                id,
                external_id,
                sap_order_id,
                title,
                completed_at,
                manmec_service_stations(name, code),
                manmec_work_order_materials(
                    quantity,
                    manmec_inventory_items(id, sku, name)
                )
            `)
            .eq("organization_id", orgId)
            .eq("status", "COMPLETED")
            .gte("completed_at", since.toISOString())
            .not("manmec_work_order_materials", "is", null)
            .order("completed_at", { ascending: false });

        if (wosErr) return { data: [], error: wosErr.message };
        if (!wos || wos.length === 0) return { data: [], error: null };

        // Para cada OT, verificar qué materiales tienen movimiento
        const result: UnregisteredDeduction[] = [];

        for (const wo of wos as any[]) {
            const materials: UnregisteredMaterial[] = [];
            let hasMissingDeductions = false;

            for (const mat of wo.manmec_work_order_materials || []) {
                if (!mat.manmec_inventory_items) continue;

                const { data: movement } = await supabase
                    .from("manmec_inventory_movements")
                    .select("id")
                    .eq("work_order_id", wo.id)
                    .eq("item_id", mat.manmec_inventory_items.id)
                    .limit(1)
                    .maybeSingle();

                const hasMovement = !!movement;
                if (!hasMovement) hasMissingDeductions = true;

                materials.push({
                    item_id: mat.manmec_inventory_items.id,
                    sku: mat.manmec_inventory_items.sku,
                    item_name: mat.manmec_inventory_items.name,
                    quantity_expected: mat.quantity,
                    has_movement: hasMovement,
                });
            }

            // Solo incluir OTs con al menos un material sin movimiento
            if (hasMissingDeductions) {
                result.push({
                    work_order_id: wo.id,
                    ot_external_id: wo.external_id,
                    sap_order_id: wo.sap_order_id,
                    ot_title: wo.title,
                    completed_at: wo.completed_at,
                    station_name: wo.manmec_service_stations?.name ?? wo.manmec_service_stations?.code ?? null,
                    materials,
                });
            }
        }

        return { data: result, error: null };
    } catch (err: any) {
        return { data: [], error: err.message };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION 3: Auditoría completa de una OT (pipeline paso a paso)
// ─────────────────────────────────────────────────────────────────────────────

export async function getOtAuditTrail(
    searchTerm: string
): Promise<{ data: OtAuditTrail | null; error: string | null }> {
    try {
        const profile = await requireRole("MANAGER");
        const supabase = await createClient();
        const orgId = profile.organization_id;

        // Buscar la OT por external_id o sap_order_id
        const { data: wo, error: woErr } = await supabase
            .from("manmec_work_orders")
            .select("id, external_id, sap_order_id, title, status, created_at, completed_at")
            .eq("organization_id", orgId)
            .or(`external_id.eq.${searchTerm},sap_order_id.eq.${searchTerm}`)
            .limit(1)
            .maybeSingle();

        if (woErr) return { data: null, error: woErr.message };
        if (!wo) return { data: null, error: `No se encontró OT con aviso/SAP: "${searchTerm}"` };

        const steps: OtAuditStep[] = [];

        // PASO 1: Log de IA (recepción del email)
        const { data: iaLog } = await supabase
            .from("manmec_ia_automation_logs")
            .select("status, error_message, created_at, type")
            .eq("organization_id", orgId)
            .or(`external_id.eq.${wo.external_id},external_id.eq.${wo.sap_order_id}`)
            .order("created_at", { ascending: false })
            .limit(1)
            .maybeSingle();

        steps.push({
            step: "1_email_recibido",
            label: "Email recibido y procesado por IA",
            status: iaLog ? (iaLog.status === "SUCCESS" ? "ok" : "error") : "warning",
            detail: iaLog
                ? `Tipo: ${iaLog.type} | Estado: ${iaLog.status}${iaLog.error_message ? ` | Error: ${iaLog.error_message}` : ""}`
                : "No se encontró log de IA para esta OT",
            timestamp: iaLog?.created_at ?? null,
        });

        // PASO 2: Creación / cierre de OT
        steps.push({
            step: "2_ot_estado",
            label: "Estado de la Orden de Trabajo",
            status: wo.status === "COMPLETED" ? "ok" : wo.status === "PENDING" ? "pending" : "warning",
            detail: `Estado: ${wo.status}${wo.completed_at ? ` | Cerrada: ${new Date(wo.completed_at).toLocaleString("es-CL")}` : ""}`,
            timestamp: wo.completed_at ?? wo.created_at,
        });

        // PASO 3: Timeline (notas / warnings)
        const { data: timeline } = await supabase
            .from("manmec_work_order_timeline")
            .select("entry_type, content, created_at")
            .eq("work_order_id", wo.id)
            .order("created_at", { ascending: true });

        const warnings = (timeline || []).filter((t: any) => t.entry_type === "warning");
        const closureNote = (timeline || []).find((t: any) => t.entry_type === "note" && t.content?.includes("Cerrada vía email"));

        steps.push({
            step: "3_timeline",
            label: "Registro de cierre en Timeline",
            status: closureNote ? "ok" : "warning",
            detail: closureNote
                ? closureNote.content
                : "No se encontró nota de cierre vía email en el timeline",
            timestamp: closureNote?.created_at ?? null,
        });

        if (warnings.length > 0) {
            steps.push({
                step: "3b_warnings",
                label: `Advertencias registradas (${warnings.length})`,
                status: "warning",
                detail: warnings.map((w: any) => w.content).join(" | "),
                timestamp: warnings[0]?.created_at ?? null,
            });
        }

        // PASO 4: Materiales asociados
        const { data: materials } = await supabase
            .from("manmec_work_order_materials")
            .select("quantity, manmec_inventory_items(id, sku, name)")
            .eq("work_order_id", wo.id);

        steps.push({
            step: "4_materiales",
            label: "Materiales registrados en la OT",
            status: materials && materials.length > 0 ? "ok" : "error",
            detail: materials && materials.length > 0
                ? (materials as any[]).map((m) => `${m.manmec_inventory_items?.sku} x${m.quantity}`).join(", ")
                : "No hay materiales asociados a esta OT",
            timestamp: null,
        });

        // PASO 5: Movimientos de inventario
        const { data: movements } = await supabase
            .from("manmec_inventory_movements")
            .select("quantity, type, reason, created_at, manmec_inventory_items(sku)")
            .eq("work_order_id", wo.id);

        const materialsCount = materials?.length ?? 0;
        const movementsCount = movements?.length ?? 0;

        steps.push({
            step: "5_descuentos",
            label: "Descuentos de stock ejecutados",
            status:
                movementsCount === 0
                    ? "error"
                    : movementsCount < materialsCount
                    ? "warning"
                    : "ok",
            detail:
                movementsCount > 0
                    ? (movements as any[])
                          .map((m) => `${m.manmec_inventory_items?.sku} -${m.quantity} (${new Date(m.created_at).toLocaleDateString("es-CL")})`)
                          .join(", ")
                    : `⚠️ 0 de ${materialsCount} materiales fueron descontados del inventario`,
            timestamp: movements && movements.length > 0 ? (movements as any[])[0].created_at : null,
        });

        return {
            data: {
                work_order_id: wo.id,
                external_id: wo.external_id,
                sap_order_id: wo.sap_order_id,
                title: wo.title,
                wo_status: wo.status,
                steps,
            },
            error: null,
        };
    } catch (err: any) {
        return { data: null, error: err.message };
    }
}

// ─────────────────────────────────────────────────────────────────────────────
// ACTION 4: Registrar descuento manualmente (Panel B → botón "Registrar ahora")
// ─────────────────────────────────────────────────────────────────────────────

export async function registerManualDeduction(
    workOrderId: string,
    itemId: string,
    quantity: number
): Promise<{ success: boolean; error: string | null }> {
    try {
        const profile = await requireRole("MANAGER");
        const supabaseAdmin = createAdminClient();
        const supabase = await createClient();
        const orgId = profile.organization_id;

        // Verificar que la OT pertenece a la organización
        const { data: wo } = await supabase
            .from("manmec_work_orders")
            .select("id, external_id, sap_order_id")
            .eq("id", workOrderId)
            .eq("organization_id", orgId)
            .maybeSingle();

        if (!wo) return { success: false, error: "OT no encontrada o sin permisos." };

        // Bodega FIXED de la organización
        const { data: warehouse } = await supabase
            .from("manmec_warehouses")
            .select("id")
            .eq("organization_id", orgId)
            .eq("type", "FIXED")
            .limit(1)
            .maybeSingle();

        if (!warehouse) return { success: false, error: "No se encontró bodega central activa." };

        const { error: moveErr } = await supabaseAdmin
            .from("manmec_inventory_movements")
            .insert({
                item_id: itemId,
                warehouse_id: warehouse.id,
                work_order_id: workOrderId,
                user_id: profile.id,
                type: "OUT",
                quantity,
                reason: `Corrección manual desde Monitor de Auditoría (OT ${wo.external_id ?? wo.sap_order_id})`,
            });

        if (moveErr) return { success: false, error: moveErr.message };

        // Registrar en timeline
        await supabaseAdmin.from("manmec_work_order_timeline").insert({
            work_order_id: workOrderId,
            user_id: profile.id,
            entry_type: "note",
            content: `✅ Descuento registrado manualmente desde Monitor de Auditoría por ${profile.id}.`,
        });

        return { success: true, error: null };
    } catch (err: any) {
        return { success: false, error: err.message };
    }
}
