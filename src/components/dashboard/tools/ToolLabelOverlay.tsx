"use client";

import { useEffect, useRef, useState } from "react";
import bwipjs from "bwip-js";
import { X, Printer, Download, Monitor } from "lucide-react";
import { Tool } from "@/app/dashboard/tools/actions";

interface Props {
    tool: Tool;
    onClose: () => void;
}

export function ToolLabelOverlay({ tool, onClose }: Props) {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (canvasRef.current) {
            try {
                bwipjs.toCanvas(canvasRef.current, {
                    bcid: "code128",       // Barcode type
                    text: tool.serial_number,    // Text to encode
                    scale: 3,               // 3x scaling factor
                    height: 10,              // Bar height, in millimeters
                    includetext: true,            // Show human-readable text
                    textxalign: "center",        // Always good to set this
                    backgroundcolor: "ffffff",
                });
                setLoading(false);
            } catch (e) {
                console.error("Barcode generation failed", e);
            }
        }
    }, [tool.serial_number]);

    const handlePrint = () => {
        const printContent = document.getElementById("label-to-print");
        const WindowPrt = window.open('', '', 'left=0,top=0,width=800,height=900,toolbar=0,scrollbars=0,status=0');

        if (WindowPrt && printContent) {
            WindowPrt.document.write(`
                <html>
                    <head>
                        <title>Imprimir Etiqueta - ${tool.serial_number}</title>
                        <style>
                            @page { size: auto; margin: 0mm; }
                            body { 
                                margin: 0; 
                                padding: 10px; 
                                font-family: system-ui, -apple-system, sans-serif;
                                display: flex;
                                justify-content: center;
                                align-items: center;
                                min-height: 100vh;
                            }
                            .label-container {
                                border: 1px solid #000;
                                padding: 15px;
                                width: 300px;
                                text-align: center;
                                background: white;
                            }
                            .tool-name { font-weight: 900; text-transform: uppercase; font-size: 18px; margin-bottom: 4px; }
                            .tool-brand { font-size: 12px; color: #333; margin-bottom: 10px; }
                            .company-badge { font-size: 10px; font-weight: 800; background: #000; color: #fff; padding: 2px 6px; display: inline-block; margin-top: 10px; }
                            canvas { max-width: 100%; height: auto; }
                        </style>
                    </head>
                    <body>
                        <div class="label-container">
                            <div class="tool-name">${tool.name}</div>
                            <div class="tool-brand">${tool.brand || ''} ${tool.model || ''}</div>
                            <img src="${canvasRef.current?.toDataURL()}" style="width: 100%;" />
                            <div class="company-badge">MANMEC IA - ASSET TRACKING</div>
                        </div>
                        <script>
                            setTimeout(() => {
                                window.print();
                                window.close();
                            }, 500);
                        </script>
                    </body>
                </html>
            `);
            WindowPrt.document.close();
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
            <div
                className="absolute inset-0 bg-black/90 backdrop-blur-xl"
                onClick={onClose}
            />

            <motion.div
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="relative w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-[2.5rem] shadow-2xl overflow-hidden"
            >
                <div className="p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h3 className="text-xl font-black uppercase tracking-tight">Vista Previa Etiqueta</h3>
                        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-full text-slate-500 hover:text-white transition-colors">
                            <X className="w-6 h-6" />
                        </button>
                    </div>

                    <div className="bg-white p-8 rounded-3xl flex flex-col items-center justify-center shadow-inner mb-8" id="label-to-print">
                        <div className="text-black font-black uppercase text-center mb-1 text-lg leading-tight">{tool.name}</div>
                        <div className="text-slate-500 font-bold text-[10px] text-center mb-4 uppercase">{tool.brand} {tool.model}</div>

                        <div className="w-full flex justify-center py-2">
                            <canvas ref={canvasRef} className="max-w-full" />
                        </div>

                        <div className="mt-4 bg-black text-white text-[8px] font-black tracking-widest px-3 py-1 rounded-full uppercase">
                            Manmec IA Asset Tag
                        </div>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <button
                            onClick={handlePrint}
                            className="bg-blue-600 hover:bg-blue-500 text-white font-black uppercase tracking-tight py-4 rounded-2xl flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-500/20 active:scale-95"
                        >
                            <Printer className="w-4 h-4" />
                            Imprimir
                        </button>
                        <button
                            onClick={onClose}
                            className="bg-white/5 hover:bg-white/10 text-white font-black uppercase tracking-tight py-4 rounded-2xl transition-all"
                        >
                            Cerrar
                        </button>
                    </div>
                </div>
            </motion.div>
        </div>
    );
}

// Helper to use motion without declaring it as a global if not needed
import { motion } from "framer-motion";
