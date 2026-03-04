"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type TransferItemType = "CONSUMABLE" | "TOOL";

interface InitiateTransferParams {
    type: TransferItemType;
    itemId?: string; // id de ManmecInventoryItem
    toolId?: string; // id de ManmecTool
    fromWarehouseId: string;
    targetWarehouseId: string;
    quantity?: number; // solo para consumibles
    notes?: string;
}

/**
 * 1. INICIAR TRASPASO
 * El emisor escoge qué entregar y a qué BODEGA destinarlo.
 * Se descuenta el stock de su bodega y queda PENDING.
 */
export async function initiateTransfer(params: InitiateTransferParams) {
    try {
        const profile = await requireRole("MECHANIC"); // Cualquier operario puede transferir
        const supabase = await createClient();

        // Validar parámetros
        if (params.type === "CONSUMABLE" && (!params.itemId || !params.quantity || params.quantity <= 0)) {
            throw new Error("Datos de insumo inválidos.");
        }
        if (params.type === "TOOL" && !params.toolId) {
            throw new Error("Datos de herramienta inválidos.");
        }
        if (params.fromWarehouseId === params.targetWarehouseId) {
            throw new Error("No puedes transferir a la misma bodega.");
        }

        // 1. Obtener a quién le pertenece actualmente la bodega destino para notificarle
        // Si es vehículo, buscar el asignado a ese vehículo (simplificado por ahora, se puede buscar en turnos activos)
        let receiverId = profile.id; // Fallback al mismo usuario si no encontramos dueño
        const { data: targetWarehouse, error: targetWHError } = await supabase
            .from("manmec_warehouses")
            .select("vehicle_id, type")
            .eq("id", params.targetWarehouseId)
            .single();

        if (targetWHError) {
            console.error("DEBUG: Failed to fetch targetWarehouse", targetWHError);
            throw new Error(`Error buscando bodega destino: ${targetWHError.message}`);
        }

        if (targetWarehouse && targetWarehouse.type === "MOBILE" && targetWarehouse.vehicle_id) {
            // Buscar el último OT activo de ese vehículo para ver quién lo maneja, o una tabla de asignación de furgón directo.
            // Asumiremos por simplicidad un responsable general si existe, si no, lo dejamos genérico.
            // idealmente: const { data: driver } = await supabase.from('...').eq('vehicle_id', targetWarehouse.vehicle_id)
        }

        // TRANSACCIÓN DE DESCUENTO
        if (params.type === "CONSUMABLE") {
            // Verificar stock disponible
            const { data: currentStock, error: stockCheckError } = await supabase
                .from("manmec_inventory_stock")
                .select("quantity")
                .eq("warehouse_id", params.fromWarehouseId)
                .eq("item_id", params.itemId)
                .single();

            if (stockCheckError || !currentStock || Number(currentStock.quantity) < Number(params.quantity)) {
                console.error("DEBUG: Stock insufficient or not found", currentStock, params.quantity);
                throw new Error("Stock insuficiente para realizar el traspaso.");
            }

            // Crear el registro de transferencia (Handshake) PENDING
            const transferPayload = {
                organization_id: profile.organization_id,
                sender_id: profile.id,
                from_warehouse_id: params.fromWarehouseId,
                receiver_id: receiverId,
                to_warehouse_id: params.targetWarehouseId,
                item_id: params.itemId,
                quantity: params.quantity,
                status: "PENDING",
                notes: params.notes || "Traspaso de campo"
            };
            console.log("\n\n==== DEBUG SQL: Insert Transfer ====");
            console.log("INSERT INTO manmec_inventory_transfers (organization_id, sender_id, from_warehouse_id, receiver_id, to_warehouse_id, item_id, quantity, status, notes) VALUES (");
            console.log(`  '${transferPayload.organization_id}',`);
            console.log(`  '${transferPayload.sender_id}',`);
            console.log(`  '${transferPayload.from_warehouse_id}',`);
            console.log(`  '${transferPayload.receiver_id}',`);
            console.log(`  '${transferPayload.to_warehouse_id}',`);
            console.log(`  '${transferPayload.item_id}',`);
            console.log(`  ${transferPayload.quantity},`);
            console.log(`  '${transferPayload.status}',`);
            console.log(`  '${transferPayload.notes}'`);
            console.log(");");
            console.log("====================================\n\n");

            const { data: transfer, error: transferError } = await supabase
                .from("manmec_inventory_transfers")
                .insert(transferPayload)
                .select()
                .single();

            if (transferError) throw new Error(`[DEBUG SQL TRANSFER: INSERT INTO manmec_inventory_transfers (from_warehouse_id, to_warehouse_id, item_id, quantity) VALUES ('${params.fromWarehouseId}', '${params.targetWarehouseId}', '${params.itemId}', ${params.quantity})] — Original Error: ` + (transferError.message || JSON.stringify(transferError)));

            // Descontar stock provisionalmente vía trigger insertando un movimiento OUT
            const outMovementPayload = {
                item_id: params.itemId,
                warehouse_id: params.fromWarehouseId,
                user_id: profile.id,
                type: "OUT",
                quantity: params.quantity,
                reason: `Traspaso enviado (Pendiente) ID: ${transfer.id.split('-')[0]}`
            };

            console.log("\n\n==== DEBUG SQL: Insert Movement OUT ====");
            console.log("INSERT INTO manmec_inventory_movements (item_id, warehouse_id, user_id, type, quantity, reason) VALUES (");
            console.log(`  '${outMovementPayload.item_id}',`);
            console.log(`  '${outMovementPayload.warehouse_id}',`);
            console.log(`  '${outMovementPayload.user_id}',`);
            console.log(`  '${outMovementPayload.type}',`);
            console.log(`  ${outMovementPayload.quantity},`);
            console.log(`  '${outMovementPayload.reason}'`);
            console.log(");");
            console.log("========================================\n\n");

            const { error: moveOutError } = await supabase.from("manmec_inventory_movements").insert(outMovementPayload);

            if (moveOutError) {
                // Rollback manual del transfer si falla el movimiento de inventario
                await supabase.from("manmec_inventory_transfers").delete().eq("id", transfer.id);
                throw new Error(`[DEBUG SQL MOVEMENT: INSERT INTO manmec_inventory_movements (item_id, warehouse_id, type, quantity) VALUES ('${params.itemId}', '${params.fromWarehouseId}', 'OUT', ${params.quantity})] — Original Error: ` + (moveOutError.message || JSON.stringify(moveOutError)));
            }

        } else if (params.type === "TOOL") {
            // Crear handshake Tool
            const { data: transfer, error: transferError } = await supabase
                .from("manmec_inventory_transfers")
                .insert({
                    organization_id: profile.organization_id,
                    sender_id: profile.id,
                    from_warehouse_id: params.fromWarehouseId,
                    receiver_id: receiverId,
                    to_warehouse_id: params.targetWarehouseId,
                    tool_id: params.toolId,
                    status: "PENDING",
                    notes: params.notes || "Préstamo de herramienta"
                })
                .select()
                .single();

            if (transferError) throw new Error(transferError.message || JSON.stringify(transferError));

            // Las herramientas unitarias no desaparecen, las marcaremos "EN TRÁNSITO"
            await supabase.from("manmec_tools").update({ status: "IN_TRANSIT" }).eq("id", params.toolId);
        }

        revalidatePath("/dashboard/inventory");
        return { success: true };
    } catch (e: any) {
        console.error("Initiate Transfer Error", e);
        return {
            success: false,
            error: e.message || "Error desconocido en la base de datos."
        };
    }
}

/**
 * 2. ACEPTAR TRASPASO
 * El receptor cuenta físicamente y acepta. El Insumo entra a su bodega de forma oficial.
 */
export async function acceptTransfer(transferId: string) {
    const profile = await requireRole("MECHANIC");
    const supabase = await createClient();

    // 1. Validar el transfer
    const { data: transfer, error: fetchError } = await supabase
        .from("manmec_inventory_transfers")
        .select("*")
        .eq("id", transferId)
        .eq("status", "PENDING")
        .single();

    if (fetchError || !transfer) throw new Error("Traspaso no encontrado o ya procesado.");

    // 2. Procesar (Sumar al destino)
    if (transfer.item_id && transfer.quantity) {
        // Sumar stock en destino ya lo hace el trigger cuando insertamos el TRANSFER en Movements
        // Pero cambiaremos el 'type' a 'IN' explícitamente por si acaso, aunque 'TRANSFER' funciona igual por el ELSE del trigger.
        // Es mejor ser explícito para Analytics.

        // Registrar en Auditoría Gral (Movimiento oficial)
        await supabase.from("manmec_inventory_movements").insert({
            item_id: transfer.item_id,
            warehouse_id: transfer.to_warehouse_id,
            user_id: profile.id, // El que recibió
            type: "IN", // Suma al destino
            quantity: transfer.quantity,
            reason: `Handshake de traspaso ID: ${transfer.id.split('-')[0]}`
        });
    } else if (transfer.tool_id) {
        // Asignar la herramienta a la nueva bodega y liberarla del tránsito
        await supabase.from("manmec_tools").update({
            assigned_warehouse_id: transfer.to_warehouse_id,
            status: "available"
        }).eq("id", transfer.tool_id);
    }

    // 3. Marcar completado
    await supabase.from("manmec_inventory_transfers").update({
        status: "COMPLETED",
        resolved_at: new Date().toISOString(),
        receiver_id: profile.id // Sellar quién realmente lo recibió, sin importar a quién se notificó
    }).eq("id", transferId);

    revalidatePath("/dashboard/inventory");
    return { success: true };
}

/**
 * 3. RECHAZAR TRASPASO
 * El receptor declina. El insumo/herramienta vuelve a la bodega del emisor.
 */
export async function rejectTransfer(transferId: string, reason: string) {
    const profile = await requireRole("MECHANIC");
    const supabase = await createClient();

    const { data: transfer } = await supabase
        .from("manmec_inventory_transfers")
        .select("*")
        .eq("id", transferId)
        .eq("status", "PENDING")
        .single();

    if (!transfer) throw new Error("Traspaso no válido.");

    // Reversar el stock "retenido" devolviéndoselo al emisor
    if (transfer.item_id && transfer.quantity) {
        // Devolver el stock "retenido" insertando un movimiento IN devuelta en el origen
        await supabase.from("manmec_inventory_movements").insert({
            item_id: transfer.item_id,
            warehouse_id: transfer.from_warehouse_id, // DE VUELTA AL ORIGEN
            user_id: profile.id,
            type: "IN",
            quantity: transfer.quantity,
            reason: `Traspaso RECHAZADO ID: ${transfer.id.split('-')[0]}`
        });
    } else if (transfer.tool_id) {
        await supabase.from("manmec_tools").update({
            status: "available"
        }).eq("id", transfer.tool_id);
    }

    // Cambiar estado a Rechazado
    await supabase.from("manmec_inventory_transfers").update({
        status: "REJECTED",
        resolved_at: new Date().toISOString(),
        notes: `RECHAZADO: ${reason}`,
        receiver_id: profile.id
    }).eq("id", transferId);

    revalidatePath("/dashboard/inventory");
    return { success: true };
}
