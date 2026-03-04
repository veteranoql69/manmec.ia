"use client";

import { useActionState, useRef, type ChangeEvent, useState } from "react";
import { completeOnboarding, type OnboardingState } from "./actions";
import { TelegramLinkStep } from "./TelegramLinkStep";

interface OnboardingFormProps {
    prefilledDomain: string | null;
    hasOrg: boolean;
    orgName?: string | null;
    userId: string;
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

/**
 * Formato de celular chileno +56 9 XXXX XXXX
 */
function formatPhone(value: string): string {
    let clean = value.replace(/\D/g, "");
    if (clean.startsWith("56")) clean = clean.substring(2);
    if (clean.startsWith("9")) clean = clean.substring(1);

    // Max 8 digits after +56 9
    clean = clean.substring(0, 8);

    if (clean.length === 0) return "+56 9 ";
    if (clean.length <= 4) return `+56 9 ${clean}`;
    return `+56 9 ${clean.slice(0, 4)} ${clean.slice(4)}`;
}

export function OnboardingForm({ prefilledDomain, hasOrg, orgName, userId }: OnboardingFormProps) {
    const [state, formAction, isPending] = useActionState(completeOnboarding, initialState);
    const formRef = useRef<HTMLFormElement>(null);

    const handleRutChange = (e: ChangeEvent<HTMLInputElement>) => {
        const cursorPosition = e.target.selectionStart;
        const previousLength = e.target.value.length;

        const formatted = formatRut(e.target.value);
        e.target.value = formatted;

        // Intentar mantener posición del cursor
        if (cursorPosition !== null && cursorPosition > 0) {
            const newPosition = cursorPosition + (formatted.length - previousLength);
            e.target.setSelectionRange(newPosition, newPosition);
        }
    };

    const handlePhoneChange = (e: ChangeEvent<HTMLInputElement>) => {
        e.target.value = formatPhone(e.target.value);
    };

    // If step 2 (telegram token received)
    if (state.telegramToken) {
        return <TelegramLinkStep userId={userId} token={state.telegramToken} />;
    }

    return (
        <form ref={formRef} action={formAction} className="space-y-5">
            <input type="hidden" name="hasOrg" value={hasOrg ? "true" : "false"} />

            {!hasOrg && (
                <>
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
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                        />
                        {state.fieldErrors?.org_name && (
                            <p className="mt-1.5 text-xs text-red-400">{state.fieldErrors.org_name[0]}</p>
                        )}
                    </div>

                    {/* RUT empresa (opcional) */}
                    <div>
                        <label htmlFor="org_rut" className="block text-sm font-medium text-slate-300 mb-1.5">
                            RUT empresa <span className="text-slate-500 font-normal">(opcional)</span>
                        </label>
                        <input
                            id="org_rut"
                            name="org_rut"
                            type="text"
                            onChange={handleRutChange}
                            maxLength={12}
                            placeholder="Ej: 76.967.390-3"
                            className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                        />
                        {state.fieldErrors?.org_rut && (
                            <p className="mt-1.5 text-xs text-red-400">{state.fieldErrors.org_rut[0]}</p>
                        )}
                    </div>

                    {/* Dominio corporativo */}
                    <div>
                        <label htmlFor="org_domain" className="block text-sm font-medium text-slate-300 mb-1.5">
                            Dominio corporativo <span className="text-slate-500 font-normal">(opcional)</span>
                        </label>
                        <div className="relative">
                            <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500 text-sm">@</span>
                            <input
                                id="org_domain"
                                name="org_domain"
                                type="text"
                                defaultValue={prefilledDomain ?? ""}
                                placeholder="empresa.cl"
                                className="w-full pl-8 pr-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                            />
                        </div>
                        {state.fieldErrors?.org_domain && (
                            <p className="mt-1.5 text-xs text-red-400">{state.fieldErrors.org_domain[0]}</p>
                        )}
                    </div>

                    <div className="h-px bg-white/10 my-6" />
                </>
            )}

            {/* Datos de Organización si ya pertenece a una */}
            {hasOrg && orgName && (
                <div className="bg-blue-500/10 border border-blue-500/20 rounded-xl p-4 mb-6">
                    <p className="text-sm text-blue-200">
                        Te estás uniendo a la empresa: <span className="font-bold text-white">{orgName}</span>
                    </p>
                </div>
            )}

            {/* Datos del Usuario */}
            <div className="space-y-5">
                <h3 className="text-lg font-medium text-white mb-2">Tus Datos Personales</h3>

                {/* Teléfono */}
                <div>
                    <label htmlFor="phone" className="block text-sm font-medium text-slate-300 mb-1.5">
                        Teléfono (WhatsApp/Telegram) <span className="text-red-400">*</span>
                    </label>
                    <input
                        id="phone"
                        name="phone"
                        type="tel"
                        required
                        onChange={handlePhoneChange}
                        placeholder="+56 9 1234 5678"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                    />
                    {state.fieldErrors?.phone && (
                        <p className="mt-1.5 text-xs text-red-400">{state.fieldErrors.phone[0]}</p>
                    )}
                </div>

                {/* Rol */}
                <div>
                    <label htmlFor="role" className="block text-sm font-medium text-slate-300 mb-1.5">
                        Rol en la Empresa <span className="text-red-400">*</span>
                    </label>
                    <select
                        id="role"
                        name="role"
                        required
                        className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors appearance-none"
                    >
                        <option value="">Selecciona tu rol...</option>
                        {/* Only allow MANAGER creation if they are creating the org */}
                        {!hasOrg && <option value="MANAGER">Administrador / Gerente</option>}
                        <option value="SUPERVISOR">Supervisor</option>
                        <option value="MECHANIC">Técnico / Mecánico</option>
                    </select>
                    {state.fieldErrors?.role && (
                        <p className="mt-1.5 text-xs text-red-400">{state.fieldErrors.role[0]}</p>
                    )}
                </div>
            </div>

            {/* Error global */}
            {state.error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <p className="text-sm text-red-400 font-medium">{state.error}</p>
                </div>
            )}

            {/* Submit */}
            <button
                type="submit"
                disabled={isPending}
                className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl px-6 py-4 transition-all disabled:opacity-60 disabled:cursor-not-allowed mt-4 shadow-lg shadow-blue-500/20"
            >
                {isPending ? "Procesando..." : "Continuar →"}
            </button>
        </form>
    );
}
