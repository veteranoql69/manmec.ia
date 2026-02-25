"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";
import { ManmecUserRole } from "@/generated/prisma";
import { requireRole } from "@/lib/auth";

/**
 * Cambia el rol de un miembro del equipo.
 * Solo COMPANY_ADMIN o MANAGER pueden hacer esto.
 */
export async function updateUserRole(targetUserId: string, newRole: ManmecUserRole) {
    // 1. Verificar que el ejecutor tenga permiso (MANAGER o ADMIN)
    const profile = await requireRole("MANAGER"); // requireRole permite ese rol o superior (COMPANY_ADMIN)

    const supabase = await createClient();

    // 2. Ejecutar el update
    const { error } = await supabase
        .from("manmec_users")
        .update({
            role: newRole,
            updated_at: new Date().toISOString()
        })
        .eq("id", targetUserId)
        .eq("organization_id", profile.organization_id); // Solo miembros de la misma org

    if (error) {
        console.error("Error updating user role:", error);
        throw new Error("No se pudo actualizar el rol del usuario");
    }

    revalidatePath("/dashboard/team");
    return { success: true };
}

/**
 * Obtiene todos los usuarios de la organización actual
 */
export async function getTeamMembers() {
    const profile = await requireRole("MECHANIC"); // Cualquiera del equipo puede ver la lista básica
    const supabase = await createClient();

    const { data, error } = await supabase
        .from("manmec_users")
        .select("*")
        .eq("organization_id", profile.organization_id)
        .order("full_name");

    if (error) throw error;
    return data;
}
