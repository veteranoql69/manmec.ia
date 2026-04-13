import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { NextRequest, NextResponse } from "next/server";

export async function PATCH(req: NextRequest) {
    try {
        await requireRole("MANAGER");
    } catch {
        return NextResponse.json({ error: "Unauthorized" }, { status: 403 });
    }

    const body = await req.json();
    const { alert_rules } = body;

    if (!alert_rules) {
        return NextResponse.json({ error: "Payload inválido" }, { status: 400 });
    }

    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return NextResponse.json({ error: "No auth" }, { status: 401 });

    const { data: profile, error: profileErr } = await supabase
        .from("manmec_users")
        .select("organization_id")
        .eq("id", user.id)
        .single();

    if (profileErr || !profile) {
        console.error("Profile fetch error:", profileErr);
        return NextResponse.json({ error: "No profile" }, { status: 401 });
    }

    // Leer settings actuales y hacer merge (no sobreescribir todo el JSON)
    const { data: org } = await supabase
        .from("manmec_organizations")
        .select("settings")
        .eq("id", profile.organization_id)
        .single();

    const updatedSettings = {
        ...(org?.settings ?? {}),
        alert_rules,
    };

    const { error } = await supabase
        .from("manmec_organizations")
        .update({ settings: updatedSettings })
        .eq("id", profile.organization_id);

    if (error) {
        console.error("[alerts-settings] Error guardando:", error);
        return NextResponse.json({ error: "Error al guardar" }, { status: 500 });
    }

    return NextResponse.json({ ok: true });
}
