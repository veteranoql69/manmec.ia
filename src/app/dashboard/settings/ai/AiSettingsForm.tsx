"use client";

import { useTransition, useState, useMemo, useEffect } from "react";
import { saveAiSettings, getAvailableModels } from "./actions";
import { generateSystemPrompt } from "@/lib/ai/prompts";

interface AiSettingsFormProps {
    initialSettings: Record<string, any>;
    orgId: string;
}

interface GeminiModel {
    id: string;
    displayName: string;
    description: string;
}

export function AiSettingsForm({ initialSettings, orgId }: AiSettingsFormProps) {
    const [isPending, startTransition] = useTransition();
    const [isSaved, setIsSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [availableModels, setAvailableModels] = useState<GeminiModel[]>([]);

    // Cargar modelos disponibles
    useEffect(() => {
        async function loadModels() {
            try {
                const models = await getAvailableModels();
                setAvailableModels(models);
            } catch (err) {
                console.error("Error loading models:", err);
            }
        }
        loadModels();
    }, []);

    const [settings, setSettings] = useState({
        name: (initialSettings?.name as string) || "Asistente Manmec",
        communication_style: (initialSettings?.communication_style as string) || "formal",
        extra_instructions: (initialSettings?.extra_instructions as string) || "",
        model_matrix: {
            chat: initialSettings?.model_matrix?.chat || "models/gemini-1.5-flash",
            voice: initialSettings?.model_matrix?.voice || "models/gemini-1.5-flash",
            vision: initialSettings?.model_matrix?.vision || "models/gemini-1.5-flash",
        }
    });

    const currentPrompt = useMemo(() => generateSystemPrompt(settings), [settings]);

    const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        const { name, value } = e.target;

        if (name.startsWith("model_")) {
            const key = name.replace("model_", "");
            setSettings(prev => ({
                ...prev,
                model_matrix: {
                    ...prev.model_matrix,
                    [key]: value
                }
            }));
            return;
        }

        const keyMap: Record<string, string> = {
            'ai_name': 'name',
            'communication_style': 'communication_style',
            'extra_instructions': 'extra_instructions'
        };

        if (keyMap[name]) {
            setSettings(prev => ({ ...prev, [keyMap[name]]: value }));
        }
    };

    const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        setIsSaved(false);
        setError(null);

        const formData = new FormData(e.currentTarget);

        startTransition(async () => {
            try {
                await saveAiSettings(orgId, formData);
                setIsSaved(true);
                setTimeout(() => setIsSaved(false), 3000);
            } catch (err: unknown) {
                const message = err instanceof Error ? err.message : "Error desconocido al guardar";
                setError(message);
            }
        });
    };

    return (
        <form onSubmit={handleSubmit} className="space-y-6">

            {/* Matrix Models Group */}
            <div className="space-y-4">
                <h3 className="text-lg font-medium text-blue-400 border-b border-blue-500/20 pb-2 flex items-center gap-2">
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 3v2m6-2v2M9 19v2m6-2v2M5 9H3m2 6H3m18-6h-2m2 6h-2M7 19h10a2 2 0 002-2V7a2 2 0 00-2-2H7a2 2 0 00-2 2v10a2 2 0 002 2zM9 9h6v6H9V9z" />
                    </svg>
                    Matriz de Motores IA
                </h3>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Chat & Texto (Web)</label>
                        <select
                            name="model_chat"
                            value={settings.model_matrix.chat}
                            onChange={handleChange}
                            className="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-sm text-white"
                        >
                            {availableModels.map(m => (
                                <option key={m.id} value={m.id}>{m.displayName || m.id}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-500 leading-tight">Optimizado para respuestas rápidas y precisas en el chat.</p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Voz & Audios (Telegram)</label>
                        <select
                            name="model_voice"
                            value={settings.model_matrix.voice}
                            onChange={handleChange}
                            className="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-sm text-white"
                        >
                            {availableModels.map(m => (
                                <option key={m.id} value={m.id}>{m.displayName || m.id}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-500 leading-tight">Especializado en transcripción y comprensión de audios de terreno.</p>
                    </div>

                    <div className="bg-white/5 p-4 rounded-xl border border-white/10 space-y-3">
                        <label className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Visión & Documentos (PDF)</label>
                        <select
                            name="model_vision"
                            value={settings.model_matrix.vision}
                            onChange={handleChange}
                            className="w-full bg-slate-900 border border-white/20 rounded-lg p-2 text-sm text-white"
                        >
                            {availableModels.map(m => (
                                <option key={m.id} value={m.id}>{m.displayName || m.id}</option>
                            ))}
                        </select>
                        <p className="text-[10px] text-slate-500 leading-tight">Mejor capacidad para extraer datos de Guías de Despacho y Certificados.</p>
                    </div>
                </div>
            </div>

            {/* Identity Group */}
            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">Identidad Básica</h3>

                <div>
                    <label htmlFor="ai_name" className="block text-sm font-medium text-slate-300 mb-1.5">
                        Nombre del Asistente
                    </label>
                    <input
                        id="ai_name"
                        name="ai_name"
                        type="text"
                        defaultValue={settings.name}
                        onChange={handleChange}
                        placeholder="Ej: Manbot, Copiloto"
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors"
                    />
                    <p className="mt-1.5 text-xs text-slate-500">
                        Así se presentará el bot en el chat web y en el tono de sus mensajes de Telegram.
                    </p>
                </div>
            </div>

            {/* Comportamiento Group */}
            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">Comportamiento y Tono</h3>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                        <label htmlFor="communication_style" className="block text-sm font-medium text-slate-300 mb-1.5">
                            Estilo de Comunicación
                        </label>
                        <select
                            id="communication_style"
                            name="communication_style"
                            defaultValue={settings.communication_style}
                            onChange={handleChange}
                            className="w-full px-4 py-3 rounded-xl bg-slate-800 border border-white/10 text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors appearance-none"
                        >
                            <option value="formal">Corporativo Formal (Seguro y directo)</option>
                            <option value="informal">Informal (Amigable, tuteo ligero)</option>
                            <option value="terreno">Lenguaje de Terreno (Jerga técnica, directo al grano)</option>
                        </select>
                    </div>

                    <div className="flex items-center space-x-4 pt-6 md:pl-4">
                        <label className="relative inline-flex items-center cursor-pointer">
                            <input
                                type="checkbox"
                                name="voice_enabled"
                                value="true"
                                defaultChecked={(initialSettings?.voice_enabled as boolean) ?? true}
                                className="sr-only peer"
                            />
                            <div className="w-11 h-6 bg-slate-700 peer-focus:outline-none peer-focus:ring-2 peer-focus:ring-blue-500 rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-slate-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-blue-600"></div>
                            <span className="ml-3 text-sm font-medium text-slate-300">Permitir respuestas con audio</span>
                        </label>
                    </div>
                </div>
            </div>

            {/* Prompt Libre */}
            <div className="space-y-4 pt-4">
                <h3 className="text-lg font-medium text-white border-b border-white/10 pb-2">Reglas Personalizadas</h3>

                <div>
                    <label htmlFor="extra_instructions" className="block text-sm font-medium text-slate-300 mb-1.5">
                        Instrucciones Extra (Contexto de Prompt)
                    </label>
                    <textarea
                        id="extra_instructions"
                        name="extra_instructions"
                        rows={5}
                        defaultValue={settings.extra_instructions}
                        onChange={handleChange}
                        placeholder="Ej: Si preguntan por vacaciones, indícales que hablen con RRHH llamando al anexo 2200."
                        className="w-full px-4 py-3 rounded-xl bg-white/5 border border-white/10 text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-colors resize-y"
                    />
                    <p className="mt-1.5 text-xs text-slate-500">
                        Estas instrucciones se cargarán en el System Prompt principal y afectarán cómo opera y modela sus respuestas. Mantenlas breves y precisas.
                    </p>
                </div>
            </div>

            {/* Error & Feedback */}
            {error && (
                <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-3">
                    <p className="text-sm text-red-400 font-medium">{error}</p>
                </div>
            )}

            {isSaved && (
                <div className="bg-green-500/10 border border-green-500/20 rounded-xl px-4 py-3 flex items-center gap-2">
                    <svg className="w-5 h-5 text-green-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <p className="text-sm text-green-400 font-medium">Configuración guardada exitosamente.</p>
                </div>
            )}

            <div className="pt-4 flex justify-end">
                <button
                    type="submit"
                    disabled={isPending}
                    className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white font-semibold rounded-xl px-6 py-3 transition-all disabled:opacity-60 disabled:cursor-not-allowed shadow-lg shadow-blue-500/20"
                >
                    {isPending ? (
                        <>
                            <svg className="animate-spin -ml-1 mr-2 h-4 w-4 text-white" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                            Guardando...
                        </>
                    ) : (
                        "Guardar Cambios"
                    )}
                </button>
            </div>
        </form>
    );
}
