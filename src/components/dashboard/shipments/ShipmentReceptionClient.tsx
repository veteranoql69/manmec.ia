"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, CheckCircle2, AlertCircle, Loader2, Save, X, Plus, Package, FileText, Scan, Sparkles } from "lucide-react";
import { processShipmentImage, saveShipment } from "@/app/dashboard/shipments/actions";
import { useRouter } from "next/navigation";

interface EnrichedItem {
    code: string;
    description: string;
    quantity: number;
    unit: string;
    exists: boolean;
    existingId: string | null;
    systemName: string | null;
}

export function ShipmentReceptionClient({ organizationId }: { organizationId: string }) {
    const router = useRouter();
    const [image, setImage] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [extractedData, setExtractedData] = useState<{
        dispatch_note_number: string;
        supplier_name: string;
        items: EnrichedItem[];
    } | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setFileName(file.name);
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!image) return;
        setProcessing(true);
        try {
            const result = await processShipmentImage(image);
            setExtractedData(result);
        } catch (error: any) {
            console.error(error);
            alert(error.message || "Error al procesar la imagen");
        } finally {
            setProcessing(false);
        }
    };

    const handleSave = async () => {
        if (!extractedData) return;
        setLoading(true);
        try {
            const result = await saveShipment({
                organization_id: organizationId,
                supplier_name: extractedData.supplier_name,
                dispatch_note_number: extractedData.dispatch_note_number,
                items: extractedData.items.map(item => ({
                    description: item.description,
                    quantity: item.quantity,
                    code: item.code,
                    exists: item.exists
                }))
            });
            if (result.success) {
                router.push("/dashboard/shipments");
                router.refresh();
            }
        } catch (error) {
            console.error(error);
            alert("Error al guardar la recepción");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            {/* Header con Badge de IA */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                        Recepción <span className="text-blue-500">Inteligente</span>
                    </h2>
                    <p className="text-slate-400 font-medium text-sm mt-1">Sube una foto de la guía y deja que la IA haga el resto.</p>
                </div>
                {!extractedData && (
                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-6 py-3 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-bold text-sm transition-all"
                        >
                            <Camera className="w-4 h-4" /> Capturar / Subir
                        </button>
                    </div>
                )}
            </div>

            <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept="image/*"
                capture="environment"
                className="hidden"
            />

            {!extractedData ? (
                <AnimatePresence>
                    {image ? (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className="relative group rounded-[2.5rem] overflow-hidden border border-white/10 bg-white/5 p-4"
                        >
                            <div className="aspect-[3/4] md:aspect-video relative rounded-3xl overflow-hidden bg-black">
                                <img src={image} className="w-full h-full object-contain" alt="Guía" />
                                {processing && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
                                        <div className="relative">
                                            <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                                            <div className="absolute inset-0 bg-blue-500/20 blur-2xl rounded-full" />
                                        </div>
                                        <div className="text-center">
                                            <p className="text-xl font-black uppercase tracking-widest text-white animate-pulse">Analizando Guía...</p>
                                            <p className="text-xs text-slate-400 mt-2">Gemini Vision 2.0 extrayendo SKU y Cantidades</p>
                                        </div>
                                        {/* Escáner Láser Animado */}
                                        <motion.div
                                            initial={{ top: 0 }}
                                            animate={{ top: "100%" }}
                                            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                                            className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-blue-500 to-transparent shadow-[0_0_15px_rgba(59,130,246,0.8)] z-10"
                                        />
                                    </div>
                                )}
                            </div>
                            {!processing && (
                                <div className="mt-6 flex gap-4">
                                    <button
                                        onClick={handleAnalyze}
                                        className="flex-1 bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all uppercase tracking-tighter"
                                    >
                                        <Sparkles className="w-5 h-5" /> Iniciar Procesamiento IA
                                    </button>
                                    <button
                                        onClick={() => setImage(null)}
                                        className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-all"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        <motion.div
                            onClick={() => fileInputRef.current?.click()}
                            className="border-2 border-dashed border-white/10 rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group"
                        >
                            <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-all">
                                <Upload className="w-8 h-8" />
                            </div>
                            <div className="text-center">
                                <p className="font-bold text-lg">Subir o Capturar Guía</p>
                                <p className="text-sm text-slate-500">JPG, PNG o PDF de la Guía de Despacho</p>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            ) : (
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="space-y-6"
                >
                    {/* Resumen de la Guía */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Nº de Guía</p>
                                <p className="text-xl font-black">{extractedData.dispatch_note_number}</p>
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 flex items-center justify-center text-emerald-400">
                                <Package className="w-6 h-6" />
                            </div>
                            <div>
                                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Proveedor</p>
                                <p className="text-xl font-black">{extractedData.supplier_name}</p>
                            </div>
                        </div>
                    </div>

                    {/* Tabla "Mágica" de Resultados */}
                    <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] overflow-hidden">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2">
                                <Scan className="w-4 h-4 text-blue-500" /> Detalle de Insumos Detectados
                            </h3>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold">● EXISTENTE</span>
                                <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-500 text-[10px] font-bold">● NUEVO</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4">Código / SKU</th>
                                        <th className="px-6 py-4">Descripción Extraída</th>
                                        <th className="px-6 py-4">Cant.</th>
                                        <th className="px-6 py-4">Unidad</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {extractedData.items.map((item, i) => (
                                        <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4">
                                                {item.exists ? (
                                                    <div className="flex items-center gap-2 text-emerald-500">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        <span className="text-[10px] font-bold">Ready</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-blue-400">
                                                        <Sparkles className="w-4 h-4" />
                                                        <span className="text-[10px] font-bold uppercase">Auto-Create</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-mono text-sm text-slate-300">{item.code}</td>
                                            <td className="px-6 py-4">
                                                <p className="font-bold text-sm uppercase">{item.description}</p>
                                                {item.exists && (
                                                    <p className="text-[9px] text-emerald-500 mt-1 uppercase">Identificado como: {item.systemName}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4 font-black">{item.quantity}</td>
                                            <td className="px-6 py-4 text-slate-500 text-xs">{item.unit}</td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {/* Footer Actions */}
                    <div className="flex flex-col md:flex-row gap-4 pt-4">
                        <button
                            disabled={loading}
                            onClick={handleSave}
                            className="flex-1 bg-blue-600 hover:bg-blue-500 text-white font-black py-6 rounded-3xl flex items-center justify-center gap-3 shadow-xl shadow-blue-900/40 transition-all active:scale-[0.98] disabled:opacity-50 uppercase tracking-tight text-lg"
                        >
                            {loading ? <Loader2 className="w-6 h-6 animate-spin" /> : <Save className="w-6 h-6" />}
                            Confirmar Ingesta e Incrementar Stock
                        </button>
                        <button
                            onClick={() => setExtractedData(null)}
                            className="bg-white/5 border border-white/10 hover:bg-white/10 px-8 py-6 rounded-3xl font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-tighter text-sm"
                        >
                            <AlertCircle className="w-4 h-4" /> Volver a Escanear
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
