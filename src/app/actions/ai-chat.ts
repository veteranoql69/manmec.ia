"use server";

import { requireAuth } from "@/lib/auth";
import { generateAiResponse } from "@/lib/ai/gemini";
import { createClient } from "@/lib/supabase/server";

export async function sendAiChatMessage(message: string) {
    try {
        const profile = await requireAuth();
        const supabase = await createClient();

        // Obtener configuración de la organización
        const { data: org } = await supabase
            .from("manmec_organizations")
            .select("ai_settings")
            .eq("id", profile.organization_id!)
            .single();

        const orgSettings = (org as any)?.ai_settings || {};

        // Generar respuesta
        const response = await generateAiResponse(
            message,
            {
                organization_id: profile.organization_id!,
                full_name: profile.full_name,
                role: profile.role || "GUEST"
            },
            orgSettings
        );

        return { success: true, text: response };
    } catch (error: any) {
        console.error("[AI CHAY ACTION ERROR]", error);
        return {
            success: false,
            error: "Lo siento, no pude procesar tu mensaje en este momento."
        };
    }
}
