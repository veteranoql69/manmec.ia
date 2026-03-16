"use client";

import { useState, useRef } from "react";
import { X, UploadCloud, FileSpreadsheet, Loader2, CheckCircle2, AlertTriangle } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface PM02ImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
}

export function PM02ImportModal({ isOpen, onClose, onSuccess }: PM02ImportModalProps) {
    const [file, setFile] = useState<File | null>(null);
    const [isUploading, setIsUploading] = useState(false);
    const [result, setResult] = useState<{ success?: boolean; count?: number; errors?: number; message?: string } | null>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files.length > 0) {
            setFile(e.target.files[0]);
            setResult(null);
        }
    };

    const handleUpload = async () => {
        if (!file) return;

        setIsUploading(true);
        try {
            const text = await file.text();

            // Usar PapaParse para manejar comas dentro de textos entre comillas (Ej: "Filtro, Aceite")
            const Papa = (await import("papaparse")).default;

            const p = new Promise<any[]>((resolve, reject) => {
                Papa.parse(text, {
                    header: true,
                    skipEmptyLines: true,
                    dynamicTyping: true,
                    delimitersToGuess: [',', ';', '\t', '|'],
                    complete: (results) => {
                        resolve(results.data as any[]);
                    },
                    error: (err: any) => {
                        reject(new Error(err.message));
                    }
                });
            });

            const jsonData = await p;

            if (jsonData.length === 0) throw new Error("Archivo vacío o sin datos válidos");

            const res = await fetch("/api/work-orders/import", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify(jsonData)
            });

            const data = await res.json();

            if (!res.ok) {
                const errorResult = {
                    success: false,
                    message: data.error || "Error al importar",
                    details: data.details,
                    code: data.code
                };
                setResult(errorResult);
                return;
            }

            setResult({
                success: data.success,
                count: data.count,
                errors: data.errors,
                message: data.message
            });

            if (data.success) {
                setTimeout(() => {
                    onSuccess();
                }, 1500);
            }

        } catch (error: any) {
            setResult({
                success: false,
                message: error.message || "Error desconocido",
                errors: 1
            });
        } finally {
            setIsUploading(false);
        }
    };

    return (
        <AnimatePresence>
            {isOpen && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ duration: 0.2 }}
                    className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-md"
                >
                    <motion.div
                        initial={{ scale: 0.95, y: 20 }}
                        animate={{ scale: 1, y: 0 }}
                        exit={{ scale: 0.95, y: 20 }}
                        className="bg-[#111] border border-white/10 w-full max-w-lg rounded-[2rem] overflow-hidden shadow-2xl relative"
                    >
                        {/* Header */}
                        <div className="flex items-center justify-between p-6 border-b border-white/5 bg-white/5">
                            <div>
                                <h2 className="text-xl font-black text-white uppercase tracking-tight flex items-center gap-2">
                                    <FileSpreadsheet className="w-5 h-5 text-emerald-500" />
                                    Importar Preventivos
                                </h2>
                                <p className="text-xs text-slate-400 font-medium mt-1">Carga masiva de PM02 mensual</p>
                            </div>
                            <button
                                onClick={onClose}
                                className="p-2 text-slate-400 hover:text-white bg-white/5 hover:bg-white/10 rounded-full transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>

                        {/* Body */}
                        <div className="p-8 space-y-6">
                            {!result ? (
                                <>
                                    <div
                                        onClick={() => fileInputRef.current?.click()}
                                        className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all ${file ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/20 hover:border-white/40 hover:bg-white/5'
                                            }`}
                                    >
                                        <input
                                            type="file"
                                            ref={fileInputRef}
                                            onChange={handleFileChange}
                                            accept=".csv, .tsv, .txt"
                                            className="hidden"
                                        />
                                        <UploadCloud className={`w-12 h-12 mx-auto mb-4 ${file ? 'text-emerald-500' : 'text-slate-500'}`} />
                                        <h3 className="text-sm font-bold text-white mb-1">
                                            {file ? file.name : 'Haz clic para subir tu CSV'}
                                        </h3>
                                        <p className="text-xs text-slate-500 font-medium">
                                            {file ? `${(file.size / 1024).toFixed(2)} KB` : 'Asegúrate de incluir las columnas: Nº Orden, E/S, Texto breve'}
                                        </p>
                                    </div>

                                    <div className="flex justify-end gap-3 pt-4">
                                        <button
                                            onClick={onClose}
                                            className="px-6 py-3 rounded-full text-xs font-bold text-slate-400 hover:text-white transition-colors"
                                        >
                                            CANCELAR
                                        </button>
                                        <button
                                            onClick={handleUpload}
                                            disabled={!file || isUploading}
                                            className={`px-8 py-3 rounded-full text-xs font-black uppercase tracking-widest flex items-center gap-2 transition-all ${!file || isUploading
                                                ? 'bg-white/10 text-white/40 cursor-not-allowed'
                                                : 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-lg shadow-emerald-900/20'
                                                }`}
                                        >
                                            {isUploading ? (
                                                <><Loader2 className="w-4 h-4 animate-spin" /> PROCESANDO</>
                                            ) : (
                                                <><UploadCloud className="w-4 h-4" /> IMPORTAR</>
                                            )}
                                        </button>
                                    </div>
                                </>
                            ) : (
                                <div className="text-center py-6 space-y-4">
                                    {result.success ? (
                                        <>
                                            <div className="w-16 h-16 bg-emerald-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <CheckCircle2 className="w-8 h-8 text-emerald-500" />
                                            </div>
                                            <h3 className="text-xl font-black text-white">¡Importación Completada!</h3>
                                            <div className="bg-white/5 rounded-xl p-4 mt-4 space-y-2">
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-slate-400">Total detectado:</span>
                                                    <span className="text-white font-bold">{(result as any).totalItems || result.count}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-emerald-400">Procesados OK:</span>
                                                    <span className="text-emerald-400 font-bold">{result.count}</span>
                                                </div>
                                                <div className="flex justify-between text-xs">
                                                    <span className="text-rose-400">Errores/Omitidos:</span>
                                                    <span className="text-rose-400 font-bold">{result.errors}</span>
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            <div className="w-16 h-16 bg-rose-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
                                                <AlertTriangle className="w-8 h-8 text-rose-500" />
                                            </div>
                                            <h3 className="text-xl font-black text-white">Error en Importación</h3>
                                            <p className="text-rose-400/80 font-medium text-sm">{result.message}</p>
                                            {(result as any).details && (
                                                <div className="mt-4 text-[10px] text-slate-500 bg-white/5 p-3 rounded-lg border border-white/5 text-left font-mono break-all max-h-48 overflow-y-auto">
                                                    <p className="text-rose-500 font-bold mb-1 uppercase">Detalle Técnico:</p>
                                                    <pre className="whitespace-pre-wrap">
                                                        {typeof (result as any).details === 'string'
                                                            ? (result as any).details
                                                            : JSON.stringify((result as any).details, null, 2)}
                                                    </pre>
                                                    {(result as any).code && <p className="mt-2 opacity-50 border-t border-white/5 pt-1">Código: {(result as any).code}</p>}
                                                </div>
                                            )}
                                        </>
                                    )}

                                    <div className="pt-6">
                                        <button
                                            onClick={onClose}
                                            className="px-8 py-3 bg-white/10 hover:bg-white/20 text-white text-xs font-black uppercase tracking-widest rounded-full transition-all"
                                        >
                                            Cerrar
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    );
}
