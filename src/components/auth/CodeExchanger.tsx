"use client";

import { useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";

/**
 * Detecta el ?code= que GoTrue envía a /login y redirige al Route Handler
 * /auth/callback que SÍ puede leer las cookies de PKCE e intercambiar el código.
 *
 * Por qué no hacemos el exchange aquí directamente:
 * - @supabase/ssr guarda el PKCE code_verifier en cookies HttpOnly del servidor
 * - Un Client Component en hidratación no puede leer esas cookies
 * - Solo un Route Handler (server-side) puede leer y escribir cookies correctamente
 */
export function CodeExchanger() {
    const searchParams = useSearchParams();
    const code = searchParams.get("code");
    const [redirecting, setRedirecting] = useState(false);

    useEffect(() => {
        if (!code) return;
        setRedirecting(true);
        // Delegar al Route Handler que puede manejar PKCE correctamente
        window.location.replace(`/auth/callback?code=${encodeURIComponent(code)}`);
    }, [code]);

    if (!code) return null;

    if (redirecting) {
        return (
            <div className="mt-4 flex flex-col items-center gap-3">
                <svg className="animate-spin h-6 w-6 text-blue-400" viewBox="0 0 24 24" fill="none">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                </svg>
                <p className="text-sm text-slate-400">Iniciando sesión...</p>
            </div>
        );
    }

    return null;
}
