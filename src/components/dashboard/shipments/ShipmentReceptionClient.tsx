"use client";

import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Calendar, Camera, Upload, CheckCircle2, AlertCircle, Loader2, Save, X, Plus, Package, FileText, Scan, Sparkles, Truck, ChevronRight, Info, AlertTriangle } from "lucide-react";
import { processShipmentImage, saveShipment, getPreAdvisedShipments } from "@/app/dashboard/shipments/actions";
import { useRouter } from "next/navigation";
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

import { format } from "date-fns";
import { es } from "date-fns/locale";

function cn(...inputs: ClassValue[]) {
    return twMerge(clsx(inputs));
}

interface EnrichedItem {
    code: string;
    description: string;
    quantity: number; // Cantidad en Guía (IA)
    emailQuantity?: number; // Cantidad anunciada por Email
    receivedQuantity: number; // Cantidad recibida físicamente
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
    const [loading, setLoading] = useState(false);
    const [processing, setProcessing] = useState(false);
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(
        warehouses.find(w => w.is_active)?.id || ""
    );
    const [preAdvisedShipments, setPreAdvisedShipments] = useState<any[]>([]);
    const [selectedPreAdvisedId, setSelectedPreAdvisedId] = useState<string | null>(null);
    const [viewingPreAdvised, setViewingPreAdvised] = useState<any | null>(null);

    const [extractedData, setExtractedData] = useState<{
        dispatch_note_number: string;
        order_number: string;
        supplier_name: string;
        is_duplicate?: boolean;
        items: EnrichedItem[];
    } | null>(null);

    const [saveError, setSaveError] = useState<string | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    // Cargar pre-avisos al iniciar
    useEffect(() => {
        getPreAdvisedShipments().then(setPreAdvisedShipments);
    }, []);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => {
                setImage(reader.result as string);
                setExtractedData(null); // Reset al cambiar imagen
            };
            reader.readAsDataURL(file);
        }
    };

    const handleAnalyze = async () => {
        if (!image) return;
        setProcessing(true);
        setSaveError(null);
        try {
            const result = await processShipmentImage(image);

            // Vincular con pre-aviso si existe el mismo Nº de guía
            const matchingPreAdvised = preAdvisedShipments.find(s => s.dispatch_note_number === result.dispatch_note_number);

            const enrichedItems: EnrichedItem[] = result.items.map(item => {
                const preItem = matchingPreAdvised?.items.find((pi: any) =>
                    pi.product?.sku === item.code || pi.notes?.includes(item.description)
                );
                return {
                    ...item,
                    quantity: item.quantity,
                    emailQuantity: preItem ? Number(preItem.expected_qty) : undefined,
                    receivedQuantity: item.quantity, // Por defecto asumimos que llegó lo de la guía
                };
            });

            setExtractedData({
                ...result,
                items: enrichedItems
            });

            if (matchingPreAdvised) {
                setSelectedPreAdvisedId(matchingPreAdvised.id);
            }

            if (result.is_duplicate) {
                setSaveError(`⚠️ La Guía de Despacho Nº ${result.dispatch_note_number} ya fue ingresada previamente.`);
            }
        } catch (error: any) {
            setSaveError("Error al procesar: " + (error.message || "Error desconocido"));
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

    const getStatusColor = (item: EnrichedItem) => {
        const { quantity, emailQuantity, receivedQuantity } = item;

        // Rojo: Físico < Guía o Físico < Email
        if (receivedQuantity < quantity || (emailQuantity !== undefined && receivedQuantity < emailQuantity)) {
            return "text-red-500 border-red-500/30 bg-red-500/5";
        }

        // Amarillo: Guía != Email (pero recibimos lo que dice la guía)
        if (emailQuantity !== undefined && quantity !== emailQuantity && receivedQuantity === quantity) {
            return "text-yellow-500 border-yellow-500/30 bg-yellow-500/5";
        }

        // Verde: Todo coincide
        return "text-emerald-500 border-emerald-500/30 bg-emerald-500/5";
    };

    const handleSave = async () => {
        if (!extractedData) return;
        setLoading(true);
        setSaveError(null);
        try {
            const result = await saveShipment({
                organization_id: organizationId,
                warehouse_id: selectedWarehouseId,
                supplier_name: extractedData.supplier_name,
                dispatch_note_number: extractedData.dispatch_note_number,
                order_number: extractedData.order_number,
                items: extractedData.items.map(item => ({
                    description: item.description,
                    quantity: Number(item.quantity), // Cantidad Guía
                    received_qty: Number(item.receivedQuantity), // Cantidad Real
                    code: String(item.code),
                    exists: item.exists
                }))
            });

            if (result.success) {
                router.push("/dashboard/shipments");
                router.refresh();
            } else {
                setSaveError(result.error || "Error al intentar guardar la recepción.");
            }
        } catch (error: any) {
            setSaveError("Error al guardar en BD: " + (error.message || "Error desconocido"));
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 pb-20">
            {/* Header con Estado de Pre-Avisos */}
            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8 flex flex-col md:flex-row items-center justify-between gap-6">
                <div className="flex items-center gap-6">
                    <div className="w-16 h-16 rounded-3xl bg-blue-600/20 flex items-center justify-center text-blue-400">
                        <Truck className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-black uppercase tracking-tight">
                            Gestión de <span className="text-blue-500">Carga</span>
                        </h2>
                        <div className="flex items-center gap-2 mt-1">
                            <span className="flex h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
                            <p className="text-slate-400 font-medium text-xs">{preAdvisedShipments.length} Guías pre-anunciadas por Email</p>
                        </div>
                    </div>
                </div>

                <div className="flex gap-4">
                    <div className="flex flex-col gap-1.5">
                        <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest ml-1">Bodega Destino</label>
                        <select
                            value={selectedWarehouseId}
                            onChange={(e) => setSelectedWarehouseId(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-2xl px-6 py-3 text-sm font-bold text-white focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all cursor-pointer min-w-[200px]"
                        >
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id} className="bg-[#0f0f0f]">{w.name}</option>
                            ))}
                        </select>
                    </div>

                    {!extractedData && (
                        <div className="flex flex-col gap-1.5 justify-end">
                            <button
                                onClick={() => fileInputRef.current?.click()}
                                className="flex items-center gap-3 px-8 py-3.5 rounded-2xl bg-blue-600 hover:bg-blue-500 text-white font-black text-sm transition-all shadow-xl shadow-blue-900/40 active:scale-[0.98]"
                            >
                                <Camera className="w-5 h-5" /> ESCANEAR GUÍA FÍSICA
                            </button>
                        </div>
                    )}
                </div>
            </div>

            <input type="file" ref={fileInputRef} onChange={handleFileChange} accept="image/*" className="hidden" />

            {!extractedData ? (
                <div className="space-y-6">
                    {image ? (
                        <div className="relative group rounded-[2.5rem] overflow-hidden border border-white/10 bg-white/5 p-4">
                            <div className="aspect-video relative rounded-3xl overflow-hidden bg-black max-h-[400px]">
                                <img src={image} className="w-full h-full object-contain" alt="Guía" />
                                {processing && (
                                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center gap-6">
                                        <Loader2 className="w-16 h-16 text-blue-500 animate-spin" />
                                        <p className="text-xl font-black uppercase tracking-widest animate-pulse">Analizando con Visión IA...</p>
                                    </div>
                                )}
                            </div>
                            {!processing && (
                                <div className="mt-6 flex gap-4">
                                    <button
                                        onClick={handleAnalyze}
                                        className="flex-1 bg-white text-black font-black py-4 rounded-2xl flex items-center justify-center gap-2 hover:bg-slate-200 transition-all uppercase tracking-tighter"
                                    >
                                        <Sparkles className="w-5 h-5" /> Iniciar Triple Validación
                                    </button>
                                    <button
                                        onClick={() => setImage(null)}
                                        className="w-16 h-16 bg-white/5 border border-white/10 rounded-2xl flex items-center justify-center text-red-500 hover:bg-red-500/10 transition-all"
                                    >
                                        <X className="w-6 h-6" />
                                    </button>
                                </div>
                            )}
                        </div>
                    ) : (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <div
                                onClick={() => fileInputRef.current?.click()}
                                className="border-2 border-dashed border-white/10 rounded-[2.5rem] p-12 flex flex-col items-center justify-center gap-4 hover:border-blue-500/50 hover:bg-blue-500/5 transition-all cursor-pointer group"
                            >
                                <div className="w-20 h-20 rounded-3xl bg-white/5 flex items-center justify-center text-slate-500 group-hover:text-blue-500 group-hover:bg-blue-500/10 transition-all">
                                    <Camera className="w-8 h-8" />
                                </div>
                                <div className="text-center">
                                    <p className="font-bold text-lg">Tomar Foto a Guía</p>
                                    <p className="text-sm text-slate-400">Escanea la realidad física</p>
                                </div>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-[2.5rem] p-8">
                                <h3 className="text-xs font-black uppercase tracking-widest text-slate-500 mb-6 flex items-center gap-2">
                                    <Info className="w-4 h-4 text-emerald-500" /> Guías Pre-Avisadas (Email)
                                </h3>
                                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2 custom-scrollbar">
                                    {preAdvisedShipments.length === 0 ? (
                                        <p className="text-sm text-slate-600 italic">No hay pre-avisos pendientes...</p>
                                    ) : (
                                        preAdvisedShipments.map(s => {
                                            const ocrItems = s.ocr_data?.items || s.ocr_data?.details?.items || s.ocr_data?.metadata?.repuestos || [];
                                            const reportedItems = ocrItems.length || s.items?.length || 0;
                                            return (
                                                <div key={s.id} className="p-4 rounded-2xl bg-white/5 border border-white/5 hover:border-blue-500/30 transition-all group">
                                                    <div className="flex justify-between items-start">
                                                        <div>
                                                            <button 
                                                                onClick={() => setViewingPreAdvised(s)}
                                                                className="text-sm font-black text-blue-400 hover:text-blue-300 transition-colors uppercase cursor-pointer text-left"
                                                            >
                                                                Guía #{s.dispatch_note_number}
                                                            </button>
                                                            <p className="text-[10px] text-slate-500 uppercase font-bold mt-0.5">{s.supplier_name}</p>
                                                        </div>
                                                        <div className="flex flex-col items-end gap-1">
                                                            <span className="px-2 py-1 rounded-md bg-emerald-500/10 text-emerald-500 text-[8px] font-black uppercase tracking-widest">Anunciada</span>
                                                            <span className="text-[9px] text-slate-400 font-mono mt-1 text-right">
                                                                {format(new Date(s.created_at), "dd/MMM/yyyy", { locale: es })}
                                                            </span>
                                                        </div>
                                                    </div>
                                                    <div className="mt-3 flex items-center justify-between">
                                                        <div className="flex flex-col">
                                                            <p className="text-[10px] text-slate-400 font-medium">{reportedItems} ítems reportados</p>
                                                            <p className="text-[8px] text-yellow-500/80 font-bold tracking-widest uppercase mt-0.5">Pendiente de confirmación física</p>
                                                        </div>
                                                        <button 
                                                            onClick={async () => {
                                                                setSelectedPreAdvisedId(s.id);
                                                                if (!extractedData) {
                                                                    // Placeholder action si no hay foto escaneada
                                                                }
                                                            }}
                                                            className="text-[10px] font-black text-blue-500 hover:text-white transition-colors flex items-center gap-1 uppercase"
                                                        >
                                                            Vincular a carga <ChevronRight className="w-3 h-3" />
                                                        </button>
                                                    </div>
                                                </div>
                                            );
                                        })
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            ) : (
                <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="space-y-6">
                    {/* Panel de Control de Discrepancias */}
                    <div className="bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] overflow-hidden shadow-2xl">
                        <div className="p-8 border-b border-white/10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                            <div>
                                <div className="flex items-center gap-3">
                                    <div className="px-3 py-1 rounded-lg bg-blue-500/20 text-blue-400 font-black text-xs uppercase tracking-widest">Dashboard de Validación</div>
                                    {selectedPreAdvisedId && (
                                        <div className="px-3 py-1 rounded-lg bg-emerald-500/20 text-emerald-400 font-black text-xs uppercase tracking-widest flex items-center gap-2">
                                            <CheckCircle2 className="w-3 h-3" /> Vinculado a Email
                                        </div>
                                    )}
                                </div>
                                <h3 className="text-3xl font-black mt-2">Comparativa de <span className="text-blue-500">Insumos</span></h3>
                            </div>

                            <div className="flex gap-4">
                                <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/5 min-w-[100px]">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Items OK</p>
                                    <p className="text-2xl font-black text-emerald-500">{extractedData.items.filter(i => getStatusColor(i).includes('emerald')).length}</p>
                                </div>
                                <div className="text-center p-4 bg-white/5 rounded-2xl border border-white/5 min-w-[100px]">
                                    <p className="text-[10px] font-bold text-slate-500 uppercase mb-1">Discrepancias</p>
                                    <p className="text-2xl font-black text-red-500">{extractedData.items.filter(i => getStatusColor(i).includes('red') || getStatusColor(i).includes('yellow')).length}</p>
                                </div>
                            </div>
                        </div>

                        <div className="overflow-x-auto">
                            <table className="w-full text-left">
                                <thead className="bg-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                    <tr>
                                        <th className="px-8 py-6">Estado</th>
                                        <th className="px-8 py-6">Insumo / Descripción</th>
                                        <th className="px-8 py-6 text-center">Anunciado (Email)</th>
                                        <th className="px-8 py-6 text-center">En Guía (IA)</th>
                                        <th className="px-8 py-6 text-center">Recibido Físico</th>
                                        <th className="px-8 py-6 text-right">Mapeo</th>
                                    </tr>
                                </thead>
                                <tbody className="divide-y divide-white/5">
                                    {extractedData.items.map((item, i) => (
                                        <tr key={i} className="group hover:bg-white/[0.02] transition-colors">
                                            <td className="px-8 py-6 whitespace-nowrap">
                                                <div className={cn("inline-flex items-center gap-2 px-3 py-1.5 rounded-full border text-[10px] font-black uppercase tracking-tighter", getStatusColor(item))}>
                                                    {getStatusColor(item).includes('emerald') ? <CheckCircle2 className="w-3 h-3" /> : <AlertTriangle className="w-3 h-3" />}
                                                    {getStatusColor(item).includes('emerald') ? 'Correcto' : getStatusColor(item).includes('red') ? 'Pérdida/Error' : 'Diferencia Admin'}
                                                </div>
                                            </td>
                                            <td className="px-8 py-6">
                                                <div className="flex flex-col">
                                                    <span className="text-sm font-black text-white uppercase">{item.description}</span>
                                                    <span className="text-[10px] font-mono text-slate-500 mt-1">SKU: {item.code}</span>
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <span className="text-lg font-mono text-slate-400">{item.emailQuantity ?? '--'}</span>
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <input
                                                    type="number"
                                                    value={item.quantity}
                                                    onChange={(e) => handleItemChange(i, 'quantity', Number(e.target.value))}
                                                    className="w-16 bg-white/5 border border-white/10 rounded-lg py-1.5 text-center text-sm font-bold focus:border-blue-500 outline-none"
                                                />
                                            </td>
                                            <td className="px-8 py-6 text-center">
                                                <div className="relative inline-block">
                                                    <input
                                                        type="number"
                                                        value={item.receivedQuantity}
                                                        onChange={(e) => handleItemChange(i, 'receivedQuantity', Number(e.target.value))}
                                                        className={cn(
                                                            "w-20 bg-white/10 border-2 rounded-xl py-3 text-center text-xl font-black outline-none transition-all",
                                                            getStatusColor(item).includes('red') ? "border-red-500 text-red-500 focus:ring-red-500/50" : "border-emerald-500/30 focus:border-blue-500"
                                                        )}
                                                    />
                                                </div>
                                            </td>
                                            <td className="px-8 py-6 text-right">
                                                {item.exists ? (
                                                    <div className="flex flex-col items-end">
                                                        <span className="text-[10px] font-black text-emerald-500 uppercase">En Catálogo</span>
                                                        <span className="text-[9px] text-slate-500 uppercase max-w-[120px] truncate">{item.systemName}</span>
                                                    </div>
                                                ) : (
                                                    <span className="text-[10px] font-black text-blue-500 uppercase">Crear como Nuevo</span>
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    </div>

                    {saveError && (
                        <div className="bg-red-500/10 border border-red-500/20 p-6 rounded-3xl flex items-center gap-4 text-red-400 shadow-lg">
                            <AlertCircle className="w-6 h-6 shrink-0" />
                            <p className="font-bold">{saveError}</p>
                        </div>
                    )}

                    <div className="flex flex-col md:flex-row gap-4 pt-6">
                        <button
                            disabled={loading}
                            onClick={handleSave}
                            className="flex-[2] bg-blue-600 hover:bg-blue-500 text-white font-black py-6 rounded-[2rem] flex items-center justify-center gap-4 shadow-2xl shadow-blue-900/40 transition-all uppercase tracking-tight text-xl active:scale-[0.98] disabled:opacity-50"
                        >
                            {loading ? <Loader2 className="w-8 h-8 animate-spin" /> : <Save className="w-8 h-8" />}
                            Confirmar Ingesta y Notificar Discrepancias
                        </button>
                        <button
                            onClick={() => { setExtractedData(null); setImage(null); }}
                            className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 py-6 rounded-[2rem] font-bold text-slate-400 transition-all uppercase tracking-widest text-sm"
                        >
                            Descartar
                        </button>
                    </div>
                </motion.div>
            )}

            {/* Modal de Detalle de Pre-Aviso */}
            <AnimatePresence>
                {viewingPreAdvised && (
                    <motion.div 
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md"
                        onClick={(e) => {
                            if (e.target === e.currentTarget) setViewingPreAdvised(null);
                        }}
                    >
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.95, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 20 }}
                            className="w-full max-w-2xl bg-[#0f0f0f] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh]"
                        >
                            <div className="p-6 md:p-8 border-b border-white/10 flex items-start justify-between bg-white/[0.02]">
                                <div>
                                    <div className="flex flex-wrap items-center gap-3 mb-2">
                                        <span className="px-3 py-1 bg-emerald-500/10 text-emerald-400 text-[10px] font-black uppercase tracking-widest rounded-lg ring-1 ring-emerald-500/20">
                                            Guía Anunciada
                                        </span>
                                        <span className="text-xs text-slate-400 font-medium flex items-center gap-1.5">
                                            <Calendar className="w-3.5 h-3.5" /> 
                                            {format(new Date(viewingPreAdvised.created_at), "dd 'de' MMMM, yyyy - HH:mm", { locale: es })}
                                        </span>
                                    </div>
                                    <h3 className="text-2xl font-black text-white uppercase tracking-tight">
                                        Guía Fantasma <span className="text-blue-500">#{viewingPreAdvised.dispatch_note_number}</span>
                                    </h3>
                                    <p className="text-sm font-bold text-slate-500 uppercase mt-1">Proveedor: {viewingPreAdvised.supplier_name || 'Desconocido'}</p>
                                </div>
                                <button 
                                    onClick={() => setViewingPreAdvised(null)}
                                    className="p-2 bg-white/5 hover:bg-red-500/20 hover:text-red-400 rounded-full transition-colors text-slate-400"
                                >
                                    <X className="w-6 h-6" />
                                </button>
                            </div>
                            
                            <div className="p-6 md:p-8 overflow-y-auto custom-scrollbar flex-1 bg-black/20">
                                <div className="mb-4 flex items-center gap-2">
                                    <Package className="w-5 h-5 text-blue-500" />
                                    <h4 className="text-sm font-black uppercase text-slate-300">Insumos Reportados por Correo</h4>
                                </div>
                                
                                {(!viewingPreAdvised.ocr_data?.items && !viewingPreAdvised.ocr_data?.details?.items && !viewingPreAdvised.ocr_data?.metadata?.repuestos) || ((viewingPreAdvised.ocr_data?.items?.length || 0) === 0 && (viewingPreAdvised.ocr_data?.details?.items?.length || 0) === 0 && (viewingPreAdvised.ocr_data?.metadata?.repuestos?.length || 0) === 0) ? (
                                    <div className="p-8 text-center border border-dashed border-white/10 rounded-3xl">
                                        <p className="text-slate-500 italic">No se detectaron ítems específicos en esta pre-anunciación.</p>
                                    </div>
                                ) : (
                                    <div className="space-y-3">
                                        {(viewingPreAdvised.ocr_data.items || viewingPreAdvised.ocr_data.details?.items || viewingPreAdvised.ocr_data.metadata?.repuestos || []).map((item: any, idx: number) => (
                                            <div key={idx} className="p-4 bg-white/5 border border-white/10 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 group hover:border-blue-500/30 transition-colors">
                                                <div className="flex-1">
                                                    <p className="text-sm font-black text-white uppercase group-hover:text-blue-400 transition-colors">{item.description || item.nombre || item.name || 'Insumo sin nombre'}</p>
                                                    <p className="text-[10px] text-slate-500 font-mono mt-1">
                                                        Código/SKU: {item.code || item.codigo || item.sku || 'N/A'}
                                                    </p>
                                                </div>
                                                <div className="flex items-end flex-col justify-center sm:text-right bg-black/40 px-4 py-2 rounded-xl border border-white/5">
                                                    <span className="text-[10px] uppercase font-bold tracking-widest text-slate-500 mb-0.5">Cant. Esperada</span>
                                                    <span className="text-xl font-black text-emerald-400">{item.cantidad || item.quantity || item.qty || item.expected_qty || 0}</span>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                                
                                <div className="mt-8 p-4 bg-yellow-500/10 border border-yellow-500/20 rounded-2xl flex gap-3">
                                    <AlertTriangle className="w-5 h-5 text-yellow-500 shrink-0 mt-0.5" />
                                    <div>
                                        <p className="text-xs font-bold text-yellow-500 uppercase tracking-widest mb-1">Carga NO ingresada a stock</p>
                                        <p className="text-[10px] text-yellow-500/80 leading-relaxed">
                                            Estos ítems fueron comunicados automáticamente por IA a través del correo del proveedor pero aún no han sido verificados físicamente. Para inyectarlos al inventario oficial, ingresa a la vista principal y escanea el papel de la guía para hacer la triple validación.
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </motion.div>
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    );
}
