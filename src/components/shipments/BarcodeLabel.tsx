"use client";

import { Printer, Download } from "lucide-react";

interface Props {
    description: string;
    barcode: string;
    organizationName?: string;
}

export function BarcodeLabel({ description, barcode, organizationName = "MANMEC IA" }: Props) {

    const handlePrint = () => {
        window.print();
    };

    return (
        <div className="flex flex-col items-center space-y-4 print:space-y-0">
            {/* Etiqueta Visual */}
            <div className="bg-white w-[80mm] h-[50mm] rounded-sm p-4 flex flex-col justify-between border-2 border-slate-200 shadow-xl print:shadow-none print:border-none print:m-0">

                {/* Header Etiqueta */}
                <div className="flex justify-between items-start border-b border-black pb-1">
                    <div className="text-left">
                        <p className="text-[12px] font-black text-black leading-none uppercase">{organizationName}</p>
                        <p className="text-[8px] text-slate-600 font-bold uppercase tracking-tighter">Sonda Chile / Repuestos</p>
                    </div>
                    <div className="bg-black text-white px-1 py-0.5 rounded-sm">
                        <p className="text-[8px] font-mono leading-none">v1.2</p>
                    </div>
                </div>

                {/* Zona Código de Barras (CODE128 Simulado) */}
                <div className="flex-1 flex flex-col items-center justify-center py-2">
                    <div className="w-full h-16 bg-white flex items-center justify-center gap-[1px] px-2">
                        {/* Generamos barras pseudo-aleatorias basadas en el string del barcode para que 'parezca' real */}
                        {barcode.split('').map((char, i) => {
                            const weight = (char.charCodeAt(0) % 4) + 1;
                            return (
                                <div
                                    key={i}
                                    className="h-full bg-black shrink-0"
                                    style={{ width: `${weight}px`, marginRight: `${(i % 2) === 0 ? '1px' : '2px'}` }}
                                />
                            );
                        })}
                        {/* Relleno para que siempre se vea 'lleno' */}
                        {Array.from({ length: Math.max(0, 30 - barcode.length) }).map((_, i) => (
                            <div key={`fill-${i}`} className="h-full bg-black w-[2px] mr-[1px]" />
                        ))}
                    </div>
                    <p className="mt-1 text-[12px] font-mono font-bold text-black tracking-[4px]">{barcode}</p>
                </div>

                {/* Footer Etiqueta */}
                <div className="border-t border-black pt-1">
                    <p className="text-[10px] font-bold text-black truncate uppercase leading-tight">{description}</p>
                    <div className="flex justify-between mt-1 text-[7px] font-bold text-slate-500 uppercase tracking-widest">
                        <span>ORIGINAL PARTS</span>
                        <span>{new Date().toLocaleDateString()}</span>
                    </div>
                </div>
            </div>

            {/* Controles (No se imprimen) */}
            <div className="flex gap-4 no-print">
                <button
                    onClick={handlePrint}
                    className="flex items-center gap-2 bg-blue-500 hover:bg-blue-600 text-white px-6 py-2 rounded-xl font-bold transition-all shadow-lg shadow-blue-500/20"
                >
                    <Printer className="w-4 h-4" /> Imprimir Etiqueta
                </button>
                <button className="flex items-center gap-3 bg-white/10 hover:bg-white/20 text-white px-6 py-2 rounded-xl font-bold transition-all">
                    <Download className="w-4 h-4" /> PNG
                </button>
            </div>

            <style jsx global>{`
                @media print {
                    .no-print {
                        display: none !important;
                    }
                    body * {
                        visibility: hidden;
                    }
                    .print-container, .print-container * {
                        visibility: visible;
                    }
                    .print-container {
                        position: absolute;
                        left: 0;
                        top: 0;
                        width: 100%;
                    }
                }
            `}</style>
        </div>
    );
}
