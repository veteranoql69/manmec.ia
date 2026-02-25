import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

// Rutas públicas (no requieren autenticación)
const PUBLIC_PATHS = ["/login", "/auth/callback", "/auth/confirm"];

// Rutas de "auth incompleta" (permiten sesión pero sin org completa)
const ONBOARDING_PATHS = ["/onboarding", "/pending"];

export async function updateSession(request: NextRequest) {
    let supabaseResponse = NextResponse.next({ request });

    const supabase = createServerClient(
        process.env.NEXT_PUBLIC_SUPABASE_URL!,
        process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
        {
            cookies: {
                getAll() {
                    return request.cookies.getAll();
                },
                setAll(cookiesToSet) {
                    cookiesToSet.forEach(({ name, value }) =>
                        request.cookies.set(name, value)
                    );
                    supabaseResponse = NextResponse.next({ request });
                    cookiesToSet.forEach(({ name, value, options }) =>
                        supabaseResponse.cookies.set(name, value, options)
                    );
                },
            },
        }
    );

    const pathname = request.nextUrl.pathname;
    const isPublicPath = PUBLIC_PATHS.some((p) => pathname.startsWith(p));
    const isOnboardingPath = ONBOARDING_PATHS.some((p) => pathname.startsWith(p));

    // Verificar sesión (no agregar lógica entre createServerClient y getUser)
    const {
        data: { user },
    } = await supabase.auth.getUser();

    // 1. Sin sesión → solo permite rutas públicas
    if (!user) {
        if (!isPublicPath) {
            const url = request.nextUrl.clone();
            url.pathname = "/login";
            return NextResponse.redirect(url);
        }
        return supabaseResponse;
    }

    // 2. Con sesión en ruta pública → verificar estado y redirigir
    if (isPublicPath && pathname !== "/auth/callback" && pathname !== "/auth/confirm") {
        // Leer onboarding_status para decidir destino
        const { data: profile } = await supabase
            .from("manmec_users")
            .select("organization_id, role, onboarding_status")
            .eq("id", user.id)
            .single();

        const url = request.nextUrl.clone();
        if (!profile || profile.onboarding_status === "pending") {
            url.pathname = "/onboarding";
        } else if (!profile.role || !profile.organization_id) {
            url.pathname = "/pending";
        } else {
            url.pathname = "/dashboard";
        }
        return NextResponse.redirect(url);
    }

    // 3. Con sesión en ruta de dashboard → verificar onboarding completo
    if (!isPublicPath && !isOnboardingPath) {
        const { data: profile } = await supabase
            .from("manmec_users")
            .select("organization_id, role, onboarding_status")
            .eq("id", user.id)
            .single();

        const url = request.nextUrl.clone();
        if (!profile || profile.onboarding_status === "pending") {
            url.pathname = "/onboarding";
            return NextResponse.redirect(url);
        }
        if (!profile.role || !profile.organization_id) {
            url.pathname = "/pending";
            return NextResponse.redirect(url);
        }
    }

    return supabaseResponse;
}
