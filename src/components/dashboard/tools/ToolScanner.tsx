"use client";

import { useEffect, useRef, useState } from "react";
import { Html5QrcodeScanner, Html5QrcodeSupportedFormats } from "html5-qrcode";
import { X, Camera, RefreshCw } from "lucide-react";

interface Props {
    onScan: (decodedText: string) => void;
    onClose: () => void;
}

export function ToolScanner({ onScan, onClose }: Props) {
    const scannerRef = useRef<Html5QrcodeScanner | null>(null);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        // Inicializar el escáner
        const scanner = new Html5QrcodeScanner(
            "reader",
            {
                fps: 10,
                qrbox: { width: 250, height: 150 },
                aspectRatio: 1.0,
                formatsToSupport: [
                    Html5QrcodeSupportedFormats.CODE_128,
                    Html5QrcodeSupportedFormats.CODE_39,
                    Html5QrcodeSupportedFormats.EAN_13,
                    Html5QrcodeSupportedFormats.QR_CODE
                ]
            },
            /* verbose= */ false
        );

        scanner.render(
            (decodedText) => {
                onScan(decodedText);
                scanner.clear();
                onClose();
            },
            (errorMessage) => {
                // Errores de escaneo comunes (no hay código en vista) se ignoran
            }
        );

        scannerRef.current = scanner;

        return () => {
            if (scannerRef.current) {
                scannerRef.current.clear().catch(err => console.error("Error clearing scanner:", err));
            }
        };
    }, [onScan, onClose]);

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                onClick={onClose}
            />

            <div className="relative w-full max-w-lg bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden">
                <div className="p-6 border-b border-white/10 flex justify-between items-center bg-white/5">
                    <div className="flex items-center gap-3">
                        <div className="p-2 rounded-xl bg-blue-500/20 text-blue-400">
                            <Camera className="w-5 h-5" />
                        </div>
                        <h3 className="text-xl font-black uppercase tracking-tight">Escanear Código</h3>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 hover:bg-white/10 rounded-full transition-colors text-slate-500 hover:text-white"
                    >
                        <X className="w-6 h-6" />
                    </button>
                </div>

                <div className="p-8">
                    <div id="reader" className="w-full overflow-hidden rounded-2xl border-2 border-dashed border-white/20 bg-black/40 min-h-[300px]" />

                    <div className="mt-6 p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex gap-3 items-start">
                        <RefreshCw className="w-5 h-5 text-amber-500 mt-0.5" />
                        <p className="text-xs text-slate-400 font-medium leading-relaxed">
                            Apunta con la cámara al código de barras o QR de la herramienta.
                            Asegúrate de tener buena iluminación para una lectura rápida.
                        </p>
                    </div>
                </div>

                <div className="p-6 bg-white/5 border-t border-white/10 flex justify-center">
                    <button
                        onClick={onClose}
                        className="text-sm font-bold text-slate-500 hover:text-white transition-colors"
                    >
                        Cancelar Escaneo
                    </button>
                </div>
            </div>
        </div>
    );
}
