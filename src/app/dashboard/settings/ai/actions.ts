"use server";

import { createClient } from "@/lib/supabase/server";
import { revalidatePath } from "next/cache";

export async function saveAiSettings(orgId: string, formData: FormData) {
    const supabase = await createClient();

    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error("Unauthorized");

    // Verificar Rol
    const { data: profile } = await supabase
        .from("manmec_users")
        .select("role")
        .eq("id", user.id)
        .single();

    if (profile?.role !== "MANAGER" && profile?.role !== "COMPANY_ADMIN") {
        throw new Error("Forbidden");
    }

    const aiSettings = {
        name: formData.get("ai_name") || "Asistente Manmec",
        voice_enabled: formData.get("voice_enabled") === "true",
        communication_style: formData.get("communication_style") || "formal",
        extra_instructions: formData.get("extra_instructions") || "",
        model_matrix: {
            chat: formData.get("model_chat") || "models/gemini-1.5-flash",
            voice: formData.get("model_voice") || "models/gemini-1.5-flash",
            vision: formData.get("model_vision") || "models/gemini-1.5-flash",
        }
    };

    const { error } = await supabase
        .from("manmec_organizations")
        .update({ ai_settings: aiSettings })
        .eq("id", orgId);

    if (error) {
        throw new Error(`Error Supabase: ${error.message} (Código: ${error.code})`);
    }

    revalidatePath("/dashboard/settings/ai");
    return { success: true };
}

/**
 * Obtiene la lista de modelos de Gemini disponibles para la API Key actual
 */
export async function getAvailableModels() {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) return [];

    try {
        const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`);
        const data = await response.json();

        if (data.models) {
            return data.models
                .filter((m: any) => m.supportedGenerationMethods.includes("generateContent"))
                .map((m: any) => ({
                    id: m.name, // models/gemini-1.5-flash
                    displayName: m.displayName,
                    description: m.description
                }));
        }
        return [];
    } catch (error) {
        console.error("Error fetching models from Google:", error);
        return [];
    }
}
