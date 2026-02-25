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
        .max(100),
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
});

export type OnboardingState = {
    error?: string;
    fieldErrors?: {
        org_name?: string[];
        org_rut?: string[];
        org_domain?: string[];
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
        org_name: formData.get("org_name"),
        org_rut: formData.get("org_rut") || undefined,
        org_domain: formData.get("org_domain") || undefined,
    });

    if (!parsed.success) {
        console.log("[completeOnboarding] validation errors:", parsed.error.flatten());
        return { fieldErrors: parsed.error.flatten().fieldErrors };
    }

    const { org_name, org_rut, org_domain } = parsed.data;
    console.log("[completeOnboarding] data:", { org_name, org_rut, org_domain });

    // Cliente admin para bypassar RLS en operaciones de bootstrap
    const admin = createAdminClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.SUPABASE_SERVICE_ROLE_KEY!,
    );

    // Verificar si el usuario ya tiene perfil en manmec_users
    const { data: existingProfile } = await admin
        .from("manmec_users")
        .select("id, onboarding_status")
        .eq("id", user.id)
        .maybeSingle();

    // Si el trigger de auth no creó el perfil, lo creamos manualmente
    if (!existingProfile) {
        const meta = user.user_metadata as Record<string, unknown>;
        const fullName = (meta?.full_name as string) || (meta?.name as string) || user.email || "";

        const { error: insertError } = await admin.from("manmec_users").insert({
            id: user.id,
            full_name: fullName,
            avatar_url: (meta?.avatar_url as string) || null,
            auth_provider: "google",
            onboarding_status: "pending",
        });

        if (insertError) {
            console.error("[completeOnboarding] insert profile error:", insertError.message);
            return { error: "No pudimos crear tu perfil. Contacta a soporte." };
        }
    }

    // Llamar a la función PostgreSQL atómica
    const { data, error } = await admin.rpc("manmec_fn_complete_onboarding", {
        p_user_id: user.id,
        p_org_name: org_name,
        p_org_rut: org_rut ?? null,
        p_org_domain: org_domain ?? null,
    });

    console.log("[completeOnboarding] rpc:", { data, error: error?.message, code: error?.code });

    if (error) {
        // Error de RUT duplicado → mensaje amigable
        if (error.message?.includes("organizations_rut_key") || error.code === "23505") {
            return {
                fieldErrors: {
                    org_rut: ["Ya existe una organización con ese RUT. Si tu empresa ya está registrada, contacta a tu administrador."],
                },
            };
        }
        return { error: `Error al crear la organización: ${error.message}` };
    }

    if (!data) {
        return { error: "No se pudo crear la organización. Intenta nuevamente." };
    }

    console.log("[completeOnboarding] ✅ success, org:", data);
    redirect("/dashboard");
}
