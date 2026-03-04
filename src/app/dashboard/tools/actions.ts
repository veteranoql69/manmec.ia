"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ToolStatus = 'available' | 'in_use' | 'repair' | 'lost' | 'retired' | 'IN_TRANSIT';

export type Tool = {
    id: string;
    serial_number: string;
    name: string;
    brand: string | null;
    model: string | null;
    category: string | null;
    status: ToolStatus;
    assigned_user_id: string | null;
    assigned_vehicle_id: string | null;
    assigned_warehouse_id: string | null;
    assigned_user?: { full_name: string } | null;
    assigned_vehicle?: { plate: string } | null;
    assigned_warehouse?: { name: string } | null;
};

/**
 * Obtiene todas las herramientas de la organización con sus asignaciones
 */
export async function getTools() {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("manmec_tools")
        .select(`
            *,
            assigned_user:manmec_users(id, full_name),
            assigned_vehicle:manmec_vehicles(id, plate),
            assigned_warehouse:manmec_warehouses(id, name)
        `)
        .eq("organization_id", profile.organization_id)
        .is("deleted_at", null)
        .order("name", { ascending: true });

    if (error) {
        // Forzamos el log como string para que se vea en el overlay de Next.js
        console.error("DETALLE ERROR HERRAMIENTAS:", JSON.stringify(error, null, 2));
        throw error;
    }

    return data as any[] as Tool[];
}

/**
 * Crea o actualiza una herramienta
 */
export async function upsertTool(data: Partial<Tool>) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const toolData = {
        ...data,
        organization_id: profile.organization_id,
        updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
        .from("manmec_tools")
        .upsert(toolData);

    if (error) {
        console.error("Error upserting tool:", error);
        throw error;
    }

    revalidatePath("/dashboard/tools");
    return { success: true };
}

/**
 * Borrado lógico de una herramienta
 */
export async function deleteTool(id: string) {
    await requireRole("SUPERVISOR");
    const supabase = await createClient();

    const { error } = await supabase
        .from("manmec_tools")
        .update({ deleted_at: new Date().toISOString() })
        .eq("id", id);

    if (error) {
        console.error("Error deleting tool:", error);
        throw error;
    }

    revalidatePath("/dashboard/tools");
    return { success: true };
}

export interface ToolDistribution {
    quantity: number;
    assigned_user_id: string | null;
    assigned_vehicle_id: string | null;
    assigned_warehouse_id: string | null;
}

/**
 * Ingreso masivo de herramientas con autogeneración de correlativos (Bulk Intake)
 */
export async function bulkUpsertTools(baseData: Partial<Tool>, distributions: ToolDistribution[], autoPrefix?: string) {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    let currentSequence = 0;

    // 1. Resolver el correlativo actual si hay prefijo
    if (autoPrefix) {
        const { data: latestTools, error: searchError } = await supabase
            .from("manmec_tools")
            .select("serial_number")
            .eq("organization_id", profile.organization_id)
            .ilike("serial_number", `${autoPrefix}-%`)
            .order("serial_number", { ascending: false })
            .limit(1);

        if (searchError) {
            console.error("Error buscando prefijo:", searchError);
            throw searchError;
        }

        if (latestTools && latestTools.length > 0) {
            const lastSerial = latestTools[0].serial_number;
            const match = lastSerial.match(/-(\d+)$/);
            if (match && match[1]) {
                currentSequence = parseInt(match[1], 10);
            }
        }
    }

    // 2. Construir el array final de inserciones basado en la distribución
    const toolsToInsert = [];

    for (const dist of distributions) {
        for (let i = 0; i < dist.quantity; i++) {
            let serial = baseData.serial_number; // default

            if (autoPrefix) {
                currentSequence++;
                serial = `${autoPrefix}-${currentSequence.toString().padStart(3, '0')}`;
            }

            toolsToInsert.push({
                ...baseData,
                organization_id: profile.organization_id,
                serial_number: serial,
                assigned_user_id: dist.assigned_user_id,
                assigned_vehicle_id: dist.assigned_vehicle_id,
                assigned_warehouse_id: dist.assigned_warehouse_id,
                updated_at: new Date().toISOString(),
            });
        }
    }

    if (toolsToInsert.length === 0) return { success: true };

    // 3. Insertar el lote completo
    // Usamos retry-loop simple para colisiones de correlativo
    let attempt = 0;
    const MAX_ATTEMPTS = 3;
    let finalError = null;

    while (attempt < MAX_ATTEMPTS) {
        try {
            const { error: insertError } = await supabase
                .from("manmec_tools")
                .insert(toolsToInsert);

            if (insertError) {
                // Violación de llave única (serial_number duplicado)
                if (insertError.code === '23505' && autoPrefix) {
                    attempt++;
                    console.log(`Colisión detectada. Reintentando (${attempt}/${MAX_ATTEMPTS})...`);
                    currentSequence++; // Saltamos 1 lugar

                    // Reasignar todos los seriales
                    let newSeq = currentSequence;
                    for (let j = 0; j < toolsToInsert.length; j++) {
                        toolsToInsert[j].serial_number = `${autoPrefix}-${newSeq.toString().padStart(3, '0')}`;
                        newSeq++;
                    }
                    continue;
                }
                throw insertError;
            }
            // Si pasamos sin error, rompemos el loop
            break;
        } catch (err) {
            finalError = err;
            break;
        }
    }

    if (finalError) {
        console.error("Error bulk inserting tools:", finalError);
        throw finalError;
    }

    revalidatePath("/dashboard/tools");
    return { success: true, count: toolsToInsert.length };
}
