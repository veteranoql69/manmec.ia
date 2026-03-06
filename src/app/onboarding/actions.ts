"use server";

import { createClient } from "@/lib/supabase/server";
import { createClient as createAdminClient } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { z } from "zod";

// ── Validación y normalización del RUT chileno ──────────────────────────────

/**
 * Normaliza un RUT chileno a formato canónico: "12345678-9" o "12345678-K"
 * Acepta: "12.345.678-9", "123456789", "12345678-9", "12345678K"
 */
function normalizeRut(raw: string): string {
    // Quitar puntos, espacios y convertir k→K
    const clean = raw.replace(/\./g, "").replace(/\s/g, "").toUpperCase();
    // Separar en cuerpo + dígito verificador
    const match = clean.match(/^(\d{7,8})-?([0-9K])$/);
    if (!match) return clean; // inválido → lo dejamos pasar para que falle la validación
    return `${match[1]}-${match[2]}`;
}

/**
 * Calcula el dígito verificador usando el algoritmo de módulo 11.
 * Retorna "0"-"9" o "K".
 */
function calcVerificador(body: string): string {
    let sum = 0;
    let factor = 2;
    for (let i = body.length - 1; i >= 0; i--) {
        sum += parseInt(body[i]) * factor;
        factor = factor === 7 ? 2 : factor + 1;
    }
    const rest = 11 - (sum % 11);
    if (rest === 11) return "0";
    if (rest === 10) return "K";
    return String(rest);
}

function validateRut(normalized: string): boolean {
    const match = normalized.match(/^(\d{7,8})-([0-9K])$/);
    if (!match) return false;
    const expected = calcVerificador(match[1]);
    return match[2] === expected;
}

// ── Schema Zod ──────────────────────────────────────────────────────────────

const OnboardingSchema = z.object({
    org_name: z
        .string()
        .min(2, "El nombre debe tener al menos 2 caracteres")
        .max(100)
        .optional()
        .or(z.literal("")),
    org_rut: z
        .string()
        .optional()
        .transform((val) => (val?.trim() ? val.trim() : undefined))
        .refine(
            (val) => {
                if (!val) return true; // campo opcional
                const normalized = normalizeRut(val);
                return validateRut(normalized);
            },
            { message: "RUT inválido. Ingresa un RUT chileno válido (ej: 76.967.390-3)" }
        )
        .transform((val) => (val ? normalizeRut(val) : undefined)),
    org_domain: z
        .string()
        .optional()
        .transform((val) => val?.trim().toLowerCase().replace(/^@/, "") || undefined),
    phone: z
        .string()
        .min(8, "El teléfono es requerido"),
    role: z
        .enum(["COMPANY_ADMIN", "MANAGER", "SUPERVISOR", "MECHANIC"], {
            message: "Selecciona un rol válido"
        }),
    hasOrg: z.string().optional(),
});

export type OnboardingState = {
    error?: string;
    telegramToken?: string;
    fieldErrors?: {
        org_name?: string[];
        org_rut?: string[];
        org_domain?: string[];
        phone?: string[];
        role?: string[];
    };
};

// ── Server Action ───────────────────────────────────────────────────────────

export async function completeOnboarding(
    _prevState: OnboardingState,
    formData: FormData
): Promise<OnboardingState> {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
        return { error: "Sesión expirada. Por favor inicia sesión nuevamente." };
    }

    console.log("[completeOnboarding] user:", user.id, user.email);

    const parsed = OnboardingSchema.safeParse({
        org_name: formData.get("org_name") || undefined,
        org_rut: formData.get("org_rut") || undefined,
        org_domain: formData.get("org_domain") || undefined,
        phone: formData.get("phone"),
        role: formData.get("role"),
        hasOrg: formData.get("hasOrg"),
    });

    if (!parsed.success) {
        console.log("[completeOnboarding] validation errors:", parsed.error.flatten());
        return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const { org_name, org_rut, org_domain, phone, role, hasOrg } = parsed.data;
    const isNewOrg = hasOrg !== "true";
    const finalRole = isNewOrg ? role : "MECHANIC";

    // Cliente admin para bypassar RLS
    const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // 1. Crear / Asegurar Perfil
    const { data: existingProfile } = await admin
        .from("manmec_users")
        .select("id, onboarding_status")
        .eq("id", user.id)
        .maybeSingle();

    if (!existingProfile) {
        // En lugar de insert (ya que Auth ya maneja el ID via triggers, o debiese), 
        // a veces NextAuth o Supabase Auth no disparan el trigger correctamente en entornos de dev.
        // Hacemos un UPSERT por si acaso para no soltar un error 500 silencioso.
        const meta = user.user_metadata as Record<string, unknown>;
        const fullName = (meta?.full_name as string) || (meta?.name as string) || user.email || "";

        const { error: upsertError } = await admin.from("manmec_users").upsert({
            id: user.id,
            full_name: fullName,
            email: user.email,
            avatar_url: (meta?.avatar_url as string) || null,
            auth_provider: "google",
            onboarding_status: "pending",
        });
        if (upsertError) {
            console.error("[completeOnboarding] Error Upsert profile:", upsertError);
            return { error: `Error al crear tu perfil: ${upsertError.message}` };
        }
    }

    // 2. Si es Organización nueva, crearla e inscribir al Manager
    if (isNewOrg) {
        // En Postgres: role es lowercase ("manager", "mechanic"), Prisma maps it to uppercase Enum
        const { data: orgData, error: orgError } = await admin.rpc("manmec_fn_complete_onboarding", {
            p_user_id: user.id,
            p_org_name: org_name,
            p_org_rut: org_rut ?? null,
            p_org_domain: org_domain ?? null,
        });

        if (orgError) {
            if (orgError.message?.includes("organizations_rut_key") || orgError.code === "23505") {
                return { fieldErrors: { org_rut: ["Ya existe una organización con ese RUT."] } };
            }
            return { error: `Error al crear la organización: ${orgError.message}` };
        }
    }

    // 3. Actualizar Teléfono, Rol del usuario 
    // Wait, the RPC manmec_fn_complete_onboarding sets the user to MANAGER + onboarding_status = complete
    // We should explicitly override the phone, role correctly.
    // Notice: Prisma user roles enum: COMPANY_ADMIN, MANAGER, SUPERVISOR, MECHANIC
    const { error: updateError } = await admin.from("manmec_users").update({
        phone: phone,
        role: finalRole,
        onboarding_status: "pending" // Let's keep it pending until Telegram is linked or simply override it
    }).eq("id", user.id);

    if (updateError) {
        console.error("[completeOnboarding] Error Update user:", updateError);
        return { error: `Error al actualizar datos del usuario: ${updateError.message}` };
    }

    // 4. Generar Token Temporal para Telegram
    const newToken = Math.random().toString(36).substring(2, 10) + Math.random().toString(36).substring(2, 6);
    // Expires in 15 minutes
    const expiresAt = new Date(Date.now() + 15 * 60 * 1000).toISOString();

    const { error: tokenError } = await admin.from("manmec_telegram_tokens").insert({
        token: newToken,
        phone_number: phone,
        user_id: user.id,
        expires_at: expiresAt
    });

    if (tokenError) {
        console.error("Error creating telegram token:", tokenError);
        return { error: "No pudimos generar el token seguro para Telegram. Intenta de nuevo." };
    }

    // Retorna el token al cliente (Paso 2) sin redirigir aún.
    return { telegramToken: newToken };
}
