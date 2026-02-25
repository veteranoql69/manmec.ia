import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";

/**
 * Tipos centrales del sistema de autenticación Manmec
 */
export type ManmecUserRole =
    | "COMPANY_ADMIN"
    | "MANAGER"
    | "SUPERVISOR"
    | "MECHANIC";

export interface ManmecUserProfile {
    id: string;
    organization_id: string | null;
    role: ManmecUserRole | null;
    full_name: string;
    avatar_url: string | null;
    onboarding_status: "pending" | "complete";
}

/**
 * Obtiene el usuario autenticado de Supabase Auth.
 * NO contacta la BD — solo verifica la sesión JWT.
 */
export async function getAuthUser() {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();
    return user;
}

/**
 * Obtiene el perfil extendido de manmec_users para el usuario autenticado.
 * Incluye organization_id, role, y onboarding_status.
 */
export async function getUserProfile(): Promise<ManmecUserProfile | null> {
    const supabase = await createClient();
    const {
        data: { user },
    } = await supabase.auth.getUser();

    if (!user) return null;

    const { data: profile } = await supabase
        .from("manmec_users")
        .select("id, organization_id, role, full_name, avatar_url, onboarding_status")
        .eq("id", user.id)
        .single();

    return profile as ManmecUserProfile | null;
}

/**
 * Para Server Components y Route Handlers que requieren autenticación.
 * Redirige automáticamente si no hay sesión o si el usuario no completó onboarding.
 */
export async function requireAuth(): Promise<ManmecUserProfile> {
    const profile = await getUserProfile();

    if (!profile) {
        redirect("/login");
    }

    if (profile.onboarding_status === "pending") {
        redirect("/onboarding");
    }

    if (!profile.role || !profile.organization_id) {
        redirect("/pending");
    }

    return profile;
}

/**
 * Requiere un rol específico o superior.
 * Orden de jerarquía: COMPANY_ADMIN > MANAGER > SUPERVISOR > MECHANIC
 */
const ROLE_HIERARCHY: Record<ManmecUserRole, number> = {
    COMPANY_ADMIN: 4,
    MANAGER: 3,
    SUPERVISOR: 2,
    MECHANIC: 1,
};

export async function requireRole(
    minimumRole: ManmecUserRole
): Promise<ManmecUserProfile> {
    const profile = await requireAuth();

    if (!profile.role) {
        redirect("/pending");
    }

    if (ROLE_HIERARCHY[profile.role] < ROLE_HIERARCHY[minimumRole]) {
        redirect("/dashboard?error=unauthorized");
    }

    return profile;
}

/**
 * El claim `hd` de Google OAuth indica si es cuenta Google Workspace (corporativa).
 * Solo disponible en auth.users.raw_user_meta_data → lo pasamos desde el callback.
 */
export function extractGoogleWorkspaceDomain(
    rawMetadata: Record<string, unknown> | null
): string | null {
    if (!rawMetadata) return null;
    const hd = rawMetadata.hd;
    if (typeof hd === "string" && hd.length > 0) return hd;
    return null;
}
