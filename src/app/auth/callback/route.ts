import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
    const { searchParams, origin } = new URL(request.url);
    const code = searchParams.get("code");
    const next = searchParams.get("next") ?? "/dashboard";

    // DEBUG: log en consola del servidor para diagnóstico
    console.log("[auth/callback] origin:", origin);
    console.log("[auth/callback] code present:", !!code);

    if (!code) {
        const errorDesc = searchParams.get("error_description") ?? "no_code";
        console.error("[auth/callback] No code received. Error:", searchParams.get("error"), errorDesc);
        return NextResponse.redirect(
            `${origin}/login?error=no_code&details=${encodeURIComponent(errorDesc)}`
        );
    }

    const supabase = await createClient();
    const { data, error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
        console.error("[auth/callback] exchangeCodeForSession error:", error.message, error.status);
        return NextResponse.redirect(
            `${origin}/login?error=exchange_failed&details=${encodeURIComponent(error.message)}`
        );
    }

    console.log("[auth/callback] session ok, user:", data.user?.email);

    // Éxito: redirigir al destino
    const forwardedHost = request.headers.get("x-forwarded-host");
    const isLocalEnv = process.env.NODE_ENV === "development";

    if (isLocalEnv) {
        return NextResponse.redirect(`${origin}${next}`);
    } else if (forwardedHost) {
        return NextResponse.redirect(`https://${forwardedHost}${next}`);
    } else {
        return NextResponse.redirect(`${origin}${next}`);
    }
}
