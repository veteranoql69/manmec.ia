"use client";

import { useActionState, useRef, type ChangeEvent } from "react";
import { completeOnboarding, type OnboardingState } from "./actions";

interface OnboardingFormProps {
    prefilledDomain: string | null;
}

const initialState: OnboardingState = {};

/**
 * Formatea un RUT mientras el usuario escribe (ej: 769673903 -> 76.967.390-3)
 */
function formatRut(value: string): string {
    const clean = value.replace(/[^0-9kK]/g, "").toUpperCase();
    if (clean.length <= 1) return clean;

    const body = clean.slice(0, -1);
    const dv = clean.slice(-1);

    // Formatear cuerpo con puntos
    let formattedBody = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");

    return `${formattedBody}-${dv}`;
}

export function OnboardingForm({ prefilledDomain }: OnboardingFormProps) {
    const [state, formAction, isPending] = useActionState(completeOnboarding, initialState);
    const formRef = useRef<HTMLFormElement>(null);

    const handleRutChange = (e: ChangeEvent<HTMLInputElement>) => {
        const cursorPosition = e.target.selectionStart;
        const previousLength = e.target.value.length;

        const formatted = formatRut(e.target.value);
        e.target.value = formatted;

        // Intentar mantener posición del cursor
        if (cursorPosition !== null) {
            const newPosition = cursorPosition + (formatted.length - previousLength);
            e.target.setSelectionRange(newPosition, newPosition);
        }
    };

    return (
        <form ref={formRef} action={formAction} className="space-y-5">

            {/* Nombre de la empresa */}
            <div>
                <label htmlFor="org_name" className="block text-sm font-medium text-slate-300 mb-1.5">
                    Nombre de la empresa <span className="text-red-400">*</span>
                </label>
                <input
                    id="org_name"
                    name="org_name"
                    type="text"
                    required
                    placeholder="Ej: Combustibles del Sur Ltda."
                    className="
                        w-full px-4 py-3 rounded-xl
                        bg-white/5 border border-white/10
                        text-white placeholder:text-slate-500
                        focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                        transition-colors
                    "
                    aria-describedby={state.fieldErrors?.org_name ? "org_name_error" : undefined}
                />
                {state.fieldErrors?.org_name && (
                    <p id="org_name_error" className="mt-1.5 text-xs text-red-400">
                        {state.fieldErrors.org_name[0]}
                    </p>
                )}
            </div>

            {/* RUT empresa (opcional) */}
            <div>
                <label htmlFor="org_rut" className="block text-sm font-medium text-slate-300 mb-1.5">
                    RUT empresa{" "}
                    <span className="text-slate-500 font-normal">(opcional)</span>
                </label>
                <input
                    id="org_rut"
                    name="org_rut"
                    type="text"
                    onChange={handleRutChange}
                    maxLength={12} // 12.345.678-K
                    placeholder="Ej: 76.967.390-3"
                    className={`
                        w-full px-4 py-3 rounded-xl
                        bg-white/5 border ${state.fieldErrors?.org_rut ? "border-red-500/50" : "border-white/10"}
                        text-white placeholder:text-slate-500
                        focus:outline-none focus:ring-2 ${state.fieldErrors?.org_rut ? "focus:ring-red-500/50" : "focus:ring-blue-500/50"}
                        transition-colors
                    `}
                    aria-describedby={state.fieldErrors?.org_rut ? "org_rut_error" : undefined}
                />
                {state.fieldErrors?.org_rut && (
                    <p id="org_rut_error" className="mt-1.5 text-xs text-red-400 bg-red-500/5 p-2 rounded-lg border border-red-500/10">
                        {state.fieldErrors.org_rut[0]}
                    </p>
                )}
            </div>

            {/* Dominio corporativo */}
            <div>
                <label htmlFor="org_domain" className="block text-sm font-medium text-slate-300 mb-1.5">
                    Dominio de correo corporativo{" "}
                    <span className="text-slate-500 font-normal">(opcional)</span>
                </label>
                <div className="relative">
                    <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm select-none">
                        @
                    </span>
                    <input
                        id="org_domain"
                        name="org_domain"
                        type="text"
                        defaultValue={prefilledDomain ?? ""}
                        placeholder="empresa.cl"
                        className="
                            w-full pl-8 pr-4 py-3 rounded-xl
                            bg-white/5 border border-white/10
                            text-white placeholder:text-slate-500
                            focus:outline-none focus:ring-2 focus:ring-blue-500/50 focus:border-blue-500/50
                            transition-colors
                        "
                        aria-describedby={state.fieldErrors?.org_domain ? "org_domain_error" : undefined}
                    />
                </div>
                {state.fieldErrors?.org_domain && (
                    <p id="org_domain_error" className="mt-1.5 text-xs text-red-400">
                        {state.fieldErrors.org_domain[0]}
                    </p>
                )}
                <p className="mt-1.5 text-xs text-slate-500">
                    Los usuarios con este dominio podrán unirse automáticamente.
                </p>
            </div>

            {/* Error global */}
            {state.error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <p className="text-sm text-red-400 font-medium">{state.error}</p>
                </div>
            )}

            {/* Submit */}
            <button
                id="btn-complete-onboarding"
                type="submit"
                disabled={isPending}
                className="
                    w-full flex items-center justify-center gap-2
                    bg-blue-600 hover:bg-blue-500 active:bg-blue-700
                    text-white font-semibold
                    rounded-xl px-6 py-4 min-h-[52px]
                    shadow-lg shadow-blue-600/25 hover:shadow-blue-500/30
                    transition-all duration-200
                    disabled:opacity-60 disabled:cursor-not-allowed
                    mt-2
                "
            >
                {isPending ? (
                    <>
                        <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24" fill="none">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        Creando tu empresa...
                    </>
                ) : (
                    "Comenzar →"
                )}
            </button>
        </form>
    );
}
