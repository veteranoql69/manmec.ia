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
