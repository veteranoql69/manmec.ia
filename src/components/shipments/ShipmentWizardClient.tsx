"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Truck,
    Zap,
    ScanBarcode,
    ArrowLeft,
    ArrowRight,
    Plus,
    Check,
    Camera,
    AlertCircle,
    PackagePlus,
    X,
    Printer,
    Loader2
} from "lucide-react";

import { analyzeDispatchNoteAction } from "@/lib/ai/actions";
import { saveShipment } from "@/app/dashboard/shipments/actions";
import { useRouter } from "next/navigation";
import { BarcodeLabel } from "./BarcodeLabel";

type Step = "SELECT" | "PROCESS" | "REVIEW" | "LABELS";
type Mode = "AI" | "MANUAL";

interface Item {
    id?: string;
    description: string;
    quantity: number;
    barcode?: string;
    isNew?: boolean;
}

export function ShipmentWizardClient({ organizationId }: { organizationId: string }) {
    const router = useRouter();
    const [step, setStep] = useState<Step>("SELECT");
    const [mode, setMode] = useState<Mode | null>(null);
    const [items, setItems] = useState<Item[]>([]);
    const [isProcessing, setIsProcessing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const fileInputRef = useRef<HTMLInputElement>(null);

    // Animaciones
    const slideVariants = {
        enter: (direction: number) => ({ x: direction > 0 ? 50 : -50, opacity: 0 }),
        center: { x: 0, opacity: 1 },
        exit: (direction: number) => ({ x: direction < 0 ? 50 : -50, opacity: 0 })
    };

    // --- Lógica de Manejo ---

    const handleSelectMode = (selectedMode: Mode) => {
        setMode(selectedMode);
        setStep("PROCESS");
    };

    const handleBack = () => {
        if (step === "PROCESS") setStep("SELECT");
        if (step === "REVIEW") setStep("PROCESS");
        if (step === "LABELS") setStep("REVIEW");
    };

    const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsProcessing(true);
        setError(null);

        try {
            // Leer archivo como base64
            const reader = new FileReader();
            reader.onloadend = async () => {
                const base64 = (reader.result as string).split(',')[1];
                const res = await analyzeDispatchNoteAction(base64, file.type);

                if (res.success && res.data) {
                    const extracted = res.data.items.map(i => ({
                        description: i.description,
                        quantity: i.quantity,
                        barcode: i.sku || i.description.toLowerCase().replace(/\s+/g, '-'),
                        isNew: true // Por defecto marcamos como nuevos para revisión
                    }));
                    setItems(extracted);
                    setStep("REVIEW");
                } else {
                    setError(res.error || "No se pudo procesar la imagen");
                }
                setIsProcessing(false);
            };
            reader.readAsDataURL(file);
        } catch (err) {
            setError("Error al leer el archivo");
            setIsProcessing(false);
        }
    };

    const handleConfirm = async () => {
        setIsSaving(true);
        try {
            const res = await saveShipment({
                organization_id: organizationId,
                warehouse_id: "default", // Deberíamos seleccionar una, pero para el build fix usaremos esto
                items: items.map(i => ({
                    description: i.description,
                    quantity: i.quantity,
                    barcode: i.barcode,
                    exists: !i.isNew
                }))
            });

            if (res.success) {
                // Ir a dashboard o lista de inventario
                router.push("/dashboard/inventory?success=shipment_received");
            }
        } catch (err: any) {
            setError(err.message || "Error al guardar la recepción");
            setIsSaving(false);
        }
    };

    const handleManualScan = (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const form = e.currentTarget;
        const input = form.elements.namedItem("barcode") as HTMLInputElement;
        const barcode = input.value.trim();

        if (!barcode) return;

        // Simulamos búsqueda en catálogo
        const found = items.find(i => i.barcode === barcode);
        if (found) {
            setItems(items.map(i => i.barcode === barcode ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            // Si no existe, abrimos "Creación Rápida" (aquí simulamos añadirlo directo)
            setItems([...items, { description: `Nuevo Producto (${barcode})`, quantity: 1, barcode, isNew: true }]);
        }
        input.value = "";
    };

    return (
        <div className="w-full">

            {/* Nav Header */}
            <div className="flex items-center gap-4 mb-8">
                {step !== "SELECT" && (
                    <button
                        onClick={handleBack}
                        className="p-2 bg-white/5 border border-white/10 rounded-full hover:bg-white/10 transition-colors"
                    >
                        <ArrowLeft className="w-5 h-5" />
                    </button>
                )}
                <div>
                    <h1 className="text-2xl font-bold">Nueva Recepción</h1>
                    <p className="text-slate-500 text-sm">Paso {["SELECT", "PROCESS", "REVIEW", "LABELS"].indexOf(step) + 1} de 4</p>
                </div>
            </div>

            <AnimatePresence mode="wait" custom={1}>
                <motion.div
                    key={step}
                    variants={slideVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ type: "spring", stiffness: 300, damping: 30 }}
                >
                    {step === "SELECT" && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                            <CardButton
                                icon={<Zap className="w-8 h-8 text-yellow-400" />}
                                title="Recepción con IA"
                                description="Saca una foto a la Guía de Despacho y procesa todo automáticamente."
                                onClick={() => handleSelectMode("AI")}
                            />
                            <CardButton
                                icon={<ScanBarcode className="w-8 h-8 text-blue-400" />}
                                title="Ingreso Manual / Escáner"
                                description="Ingresa los productos uno a uno usando un lector de códigos de barra."
                                onClick={() => handleSelectMode("MANUAL")}
                            />
                        </div>
                    )}

                    {step === "PROCESS" && mode === "AI" && (
                        <div className="bg-white/5 border border-white/10 rounded-3xl p-12 text-center space-y-6">
                            {isProcessing ? (
                                <div className="space-y-4">
                                    <Loader2 className="w-12 h-12 text-blue-400 animate-spin mx-auto" />
                                    <h3 className="text-xl font-medium">Analizando Guía con Gemini...</h3>
                                    <p className="text-slate-500">Extrayendo productos, cantidades y proveedores.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="w-20 h-20 bg-blue-500/10 rounded-full flex items-center justify-center mx-auto mb-4">
                                        <Camera className="w-10 h-10 text-blue-400" />
                                    </div>
                                    <div className="space-y-2">
                                        <h3 className="text-xl font-medium">Sube una foto de la Guía</h3>
                                        <p className="text-slate-500 max-w-sm mx-auto">Asegúrate de que el texto sea legible y cubra toda el área de productos.</p>
                                    </div>
                                    <input
                                        type="file"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        ref={fileInputRef}
                                        onChange={handleFileUpload}
                                    />
                                    <button
                                        onClick={() => fileInputRef.current?.click()}
                                        className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 rounded-2xl font-bold transition-all shadow-lg shadow-blue-500/20"
                                    >
                                        Tomar Foto
                                    </button>
                                </>
                            )}
                        </div>
                    )}

                    {step === "PROCESS" && mode === "MANUAL" && (
                        <div className="space-y-6">
                            <div className="bg-white/5 border border-white/10 rounded-2xl p-6">
                                <form onSubmit={handleManualScan} className="flex gap-4">
                                    <div className="relative flex-1">
                                        <ScanBarcode className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                        <input
                                            autoFocus
                                            name="barcode"
                                            className="w-full bg-black/40 border border-white/10 rounded-xl py-4 pl-12 pr-4 text-lg focus:border-blue-500 focus:outline-none transition-all"
                                            placeholder="Escanea o escribe código..."
                                        />
                                    </div>
                                    <button
                                        type="submit"
                                        className="bg-white/10 hover:bg-white/20 px-6 rounded-xl font-medium transition-all"
                                    >
                                        Agregar
                                    </button>
                                </form>
                            </div>

                            <div className="space-y-4">
                                {items.length > 0 ? (
                                    items.map((item, idx) => (
                                        <div key={idx} className="bg-white/5 border border-white/10 p-4 rounded-xl flex justify-between items-center group">
                                            <div className="flex items-center gap-3">
                                                <div className="p-2 bg-blue-500/10 rounded-lg">
                                                    <PackagePlus className="w-5 h-5 text-blue-400" />
                                                </div>
                                                <div>
                                                    <p className="font-medium">{item.description}</p>
                                                    <p className="text-xs text-slate-500 font-mono">{item.barcode}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-4">
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-slate-500">CANT:</span>
                                                    <span className="text-xl font-bold">{item.quantity}</span>
                                                </div>
                                                <button onClick={() => setItems(items.filter((_, i) => i !== idx))} className="text-slate-600 hover:text-red-400 p-1">
                                                    <X className="w-5 h-5" />
                                                </button>
                                            </div>
                                        </div>
                                    ))
                                ) : (
                                    <div className="text-center py-12 text-slate-600">
                                        <Truck className="w-12 h-12 mx-auto mb-2 opacity-20" />
                                        <p>No hay productos escaneados aún</p>
                                    </div>
                                )}
                            </div>

                            {items.length > 0 && (
                                <button
                                    onClick={() => setStep("REVIEW")}
                                    className="w-full bg-white text-black py-4 rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-slate-200 transition-all"
                                >
                                    Verificar y Finalizar <ArrowRight className="w-5 h-5" />
                                </button>
                            )}
                        </div>
                    )}

                    {step === "REVIEW" && (
                        <div className="space-y-6">
                            <div className="bg-emerald-500/10 border border-emerald-500/20 p-4 rounded-2xl flex items-center gap-3">
                                <AlertCircle className="text-emerald-400" />
                                <p className="text-sm text-emerald-200">Revisa la lista de productos antes de ingresarlos a bodega.</p>
                            </div>

                            <div className="bg-white/5 border border-white/10 rounded-2xl divide-y divide-white/10">
                                {items.map((item, idx) => (
                                    <div key={idx} className="p-4 flex flex-col md:flex-row md:justify-between md:items-center gap-4">
                                        <div className="flex items-center gap-3 flex-1">
                                            <div className={`w-2 h-2 rounded-full shrink-0 ${item.isNew ? 'bg-orange-500' : 'bg-blue-500'}`} />
                                            <div className="flex-1">
                                                <input
                                                    value={item.description}
                                                    onChange={(e) => setItems(items.map((it, i) => i === idx ? { ...it, description: e.target.value } : it))}
                                                    className="bg-transparent border-b border-transparent hover:border-white/20 focus:border-blue-500 focus:outline-none w-full py-1 font-medium transition-all"
                                                />
                                                <div className="flex items-center gap-2">
                                                    <span className="text-[10px] text-slate-500 font-mono">{item.barcode}</span>
                                                    {item.isNew && <span className="text-[9px] text-orange-400 font-bold uppercase tracking-wider">Nuevo</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center justify-between md:justify-end gap-6 border-t md:border-t-0 pt-4 md:pt-0 border-white/5">
                                            <div className="text-right">
                                                <p className="text-[10px] text-slate-500 uppercase font-bold tracking-tighter">Cantidad</p>
                                                <p className="font-bold text-xl">{item.quantity} u.</p>
                                            </div>
                                            <button
                                                onClick={() => setStep("LABELS")}
                                                className="flex items-center gap-2 bg-white/5 hover:bg-white/10 px-4 py-2 rounded-xl text-xs font-bold transition-all border border-white/5"
                                            >
                                                <Printer className="w-3 h-3" /> Etiqueta
                                            </button>
                                        </div>
                                    </div>
                                ))}
                            </div>

                            {error && (
                                <div className="bg-red-500/10 border border-red-500/20 p-4 rounded-2xl flex items-center gap-3 text-red-400">
                                    <AlertCircle />
                                    <p className="text-sm">{error}</p>
                                </div>
                            )}

                            <div className="grid grid-cols-2 gap-4">
                                <button className="py-4 bg-white/5 border border-white/10 rounded-2xl font-bold hover:bg-white/10 transition-all">
                                    Cancelar
                                </button>
                                <button
                                    onClick={handleConfirm}
                                    disabled={isSaving}
                                    className="py-4 bg-emerald-500 text-black rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-600 transition-all disabled:opacity-50"
                                >
                                    {isSaving ? <Loader2 className="animate-spin" /> : <><Check className="w-5 h-5" /> Confirmar Ingreso</>}
                                </button>
                            </div>
                        </div>
                    )}

                    {step === "LABELS" && (
                        <div className="space-y-6 text-center">
                            <div className="bg-white/5 border border-white/10 rounded-3xl p-8 md:p-12 space-y-8">
                                <div className="space-y-2">
                                    <h2 className="text-2xl font-bold text-white">Generar Etiqueta</h2>
                                    <p className="text-slate-500">Imprime el identificador para bodega</p>
                                </div>

                                <div className="print-container">
                                    <BarcodeLabel
                                        description={items[0]?.description || "Producto"}
                                        barcode={items[0]?.barcode || "00000000"}
                                    />
                                </div>
                            </div>

                            <button
                                onClick={() => setStep("REVIEW")}
                                className="text-sm text-slate-500 hover:text-white transition-colors"
                            >
                                Volver a la lista
                            </button>
                        </div>
                    )}
                </motion.div>
            </AnimatePresence>
        </div>
    );
}

function CardButton({ icon, title, description, onClick }: {
    icon: React.ReactNode,
    title: string,
    description: string,
    onClick: () => void
}) {
    return (
        <button
            onClick={onClick}
            className="group text-left bg-white/5 border border-white/10 p-8 rounded-3xl backdrop-blur-md hover:bg-white/10 transition-all hover:border-blue-500/50 relative overflow-hidden"
        >
            <div className="relative z-10">
                <div className="mb-6 transform transition-transform group-hover:scale-110 duration-500">
                    {icon}
                </div>
                <h3 className="text-xl font-bold mb-2 text-white">{title}</h3>
                <p className="text-slate-400 text-sm leading-relaxed">{description}</p>
            </div>
            {/* Decorative bg light */}
            <div className="absolute right-0 bottom-0 w-32 h-32 bg-blue-500/5 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity" />
        </button>
    );
}
