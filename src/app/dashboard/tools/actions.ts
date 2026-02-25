"use server";

import { createClient } from "@/lib/supabase/server";
import { requireRole } from "@/lib/auth";
import { revalidatePath } from "next/cache";

export type ToolStatus = 'available' | 'in_use' | 'repair' | 'lost' | 'retired';

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
    assigned_user?: { full_name: string } | null;
    assigned_vehicle?: { plate: string } | null;
};

/**
 * Obtiene todas las herramientas de la organización con sus asignaciones
 */
export async function getTools() {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    // Simplificamos la consulta para diagnosticar si el problema es el join o la tabla base
    const { data, error } = await supabase
        .from("manmec_tools")
        .select("*")
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
