"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Camera, Upload, CheckCircle2, AlertCircle, Loader2, Save, X, Plus, Package, FileText, Scan, Sparkles, Truck, ChevronRight } from "lucide-react";
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

interface Warehouse {
    id: string;
    name: string;
    is_active: boolean;
}

export function ShipmentReceptionClient({
    organizationId,
    warehouses
}: {
    organizationId: string;
    warehouses: Warehouse[];
}) {
    const router = useRouter();
    const [image, setImage] = useState<string | null>(null);
    const [fileName, setFileName] = useState<string | null>(null);
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
        warehouses.find(w => w.is_active)?.id || ""
    );
    const [extractedData, setExtractedData] = useState<{
        dispatch_note_number: string;
        order_number: string;
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
            console.error("Error en análisis IA:", error);
            alert("Error al procesar: " + (error.message || "Error desconocido"));
        } finally {
            setProcessing(false);
        }
    };

    const handleItemChange = (index: number, field: keyof EnrichedItem, value: any) => {
        if (!extractedData) return;
        const newItems = [...extractedData.items];
        newItems[index] = { ...newItems[index], [field]: value };
        setExtractedData({ ...extractedData, items: newItems });
    };

    const handleSave = async () => {
        if (!extractedData) return;
        setLoading(true);
        try {
            const result = await saveShipment({
                organization_id: organizationId,
                warehouse_id: selectedWarehouseId,
                supplier_name: extractedData.supplier_name,
                dispatch_note_number: extractedData.dispatch_note_number,
                order_number: extractedData.order_number,
                items: extractedData.items.map(item => ({
                    description: item.description,
                    quantity: Number(item.quantity),
                    code: String(item.code),
                    exists: item.exists
                }))
            });
            if (result.success) {
                router.push("/dashboard/shipments");
                router.refresh();
            }
        } catch (error: any) {
            console.error("Error al guardar recepción:", error);
            alert("Error al guardar en BD: " + (error.message || "Error desconocido"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                    <h2 className="text-3xl font-black uppercase tracking-tight flex items-center gap-3">
                        Recepción <span className="text-blue-500">Inteligente</span>
                    </h2>
                    <p className="text-slate-400 font-medium text-sm mt-1">Sube la guía y corrige cualquier dato detectado antes de guardar.</p>
                </div>

                <div className="flex flex-col md:flex-row items-end md:items-center gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1 flex items-center gap-1.5">
                            <Truck className="w-3 h-3" /> Destino de Carga
                        </label>
                        <div className="relative group">
                            <select
                                value={selectedWarehouseId}
                                onChange={(e) => setSelectedWarehouseId(e.target.value)}
                                className="appearance-none bg-white/5 border border-white/10 rounded-2xl px-6 py-3 pr-12 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer min-w-[200px]"
                            >
                                {warehouses.map(w => (
                                    <option key={w.id} value={w.id} className="bg-[#0f0f0f] text-white">
                                        {w.name} {w.is_active ? '' : '(Inactiva)'}
                                    </option>
                                ))}
                            </select>
                            <ChevronRight className="w-4 h-4 text-slate-500 absolute right-4 top-1/2 -translate-y-1/2 rotate-90 pointer-events-none group-hover:text-blue-500 transition-colors" />
                        </div>
                    </div>

                    {!extractedData && (
                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className="flex items-center gap-2 px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm transition-all shadow-xl shadow-blue-900/20 active:scale-[0.98] h-[50px]"
                        >
                            <Camera className="w-4 h-4" /> CAPTURAR GUÍA
                        </button>
                    )}
                </div>
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
                                            <p className="text-xl font-black uppercase tracking-widest text-white animate-pulse">Analizando con Visión IA...</p>
                                        </div>
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
                                        <Sparkles className="w-5 h-5" /> Enviar a Análisis Gemini
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
                                <p className="font-bold text-lg">Inicia la Recepción</p>
                                <p className="text-sm text-slate-500">Haz clic para subir o tomar foto de la Guía de Despacho</p>
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
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4 group focus-within:border-blue-500/50 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400">
                                <FileText className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Nº de Guía</p>
                                <input
                                    className="bg-transparent text-xl font-black w-full outline-none text-white"
                                    value={extractedData.dispatch_note_number}
                                    onChange={(e) => setExtractedData({ ...extractedData, dispatch_note_number: e.target.value })}
                                />
                            </div>
                        </div>
                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4 group focus-within:border-emerald-500/50 transition-all">
                            <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 flex items-center justify-center text-emerald-400">
                                <Package className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Proveedor</p>
                                <input
                                    className="bg-transparent text-xl font-black w-full outline-none text-white"
                                    value={extractedData.supplier_name}
                                    onChange={(e) => setExtractedData({ ...extractedData, supplier_name: e.target.value })}
                                />
                            </div>
                        </div>

                        {/* Nueva sección para el Pedido */}
                        <div className="bg-white/5 border border-white/10 p-6 rounded-3xl flex items-center gap-4 group focus-within:border-blue-500/50 transition-all md:col-span-2">
                            <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center text-slate-400">
                                <Truck className="w-6 h-6" />
                            </div>
                            <div className="flex-1">
                                <p className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Nº de Pedido / SAP</p>
                                <input
                                    className="bg-transparent text-xl font-black w-full outline-none text-white"
                                    value={extractedData.order_number}
                                    placeholder="No detectado"
                                    onChange={(e) => setExtractedData({ ...extractedData, order_number: e.target.value })}
                                />
                            </div>
                        </div>
                    </div>

                    <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] overflow-hidden">
                        <div className="p-6 border-b border-white/10 flex items-center justify-between">
                            <h3 className="font-bold uppercase tracking-widest text-xs flex items-center gap-2 text-slate-400">
                                <Scan className="w-4 h-4 text-blue-500" /> Detalle de Insumos (Edita si hay errores)
                            </h3>
                            <div className="flex gap-2">
                                <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[10px] font-bold tracking-tighter">EXISTENTE</span>
                                <span className="px-2 py-1 rounded-md bg-blue-500/10 text-blue-500 text-[10px] font-bold tracking-tighter">A CREAR</span>
                            </div>
                        </div>
                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    <tr>
                                        <th className="px-6 py-4">Status</th>
                                        <th className="px-6 py-4 min-w-[140px]">Código / SKU</th>
                                        <th className="px-6 py-4 min-w-[300px]">Descripción / Insumo</th>
                                        <th className="px-6 py-4">Cant.</th>
                                        <th className="px-6 py-4">Unidad</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {extractedData.items.map((item, i) => (
                                        <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="px-6 py-4 whitespace-nowrap">
                                                {item.exists ? (
                                                    <div className="flex items-center gap-2 text-emerald-500">
                                                        <CheckCircle2 className="w-4 h-4" />
                                                        <span className="text-[9px] font-bold">VINCULADO</span>
                                                    </div>
                                                ) : (
                                                    <div className="flex items-center gap-2 text-blue-400">
                                                        <Plus className="w-4 h-4" />
                                                        <span className="text-[9px] font-bold">NUEVO</span>
                                                    </div>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 w-full text-sm font-mono text-slate-300 focus:border-blue-500/50 outline-none"
                                                    value={item.code}
                                                    onChange={(e) => handleItemChange(i, 'code', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 w-full text-sm font-bold uppercase text-white focus:border-blue-500/50 outline-none"
                                                    value={item.description}
                                                    onChange={(e) => handleItemChange(i, 'description', e.target.value)}
                                                />
                                                {item.exists && (
                                                    <p className="text-[9px] text-emerald-500 mt-1 uppercase opacity-60">ID en Sistema: {item.systemName}</p>
                                                )}
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    type="number"
                                                    className="bg-white/5 border border-white/5 rounded-lg px-3 py-1.5 w-20 text-sm font-black text-center text-white focus:border-blue-500/50 outline-none"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(i, 'quantity', e.target.value)}
                                                />
                                            </td>
                                            <td className="px-6 py-4">
                                                <input
                                                    className="bg-transparent w-12 text-slate-500 text-[10px] uppercase font-bold outline-none"
                                                    value={item.unit}
                                                    onChange={(e) => handleItemChange(i, 'unit', e.target.value)}
                                                />
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

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
                            className="bg-white/5 border border-white/10 hover:bg-white/10 px-8 py-6 rounded-3xl font-bold transition-all flex items-center justify-center gap-2 uppercase tracking-tighter text-sm text-slate-400"
                        >
                            <AlertCircle className="w-4 h-4" /> Descartar y Re-Escanear
                        </button>
                    </div>
                </motion.div>
            )}
        </div>
    );
}
