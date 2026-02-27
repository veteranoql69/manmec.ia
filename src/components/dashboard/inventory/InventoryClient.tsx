"use client";

import { useState } from "react";
import {
    Package, Search, LayoutGrid, List,
    ArrowRight, AlertTriangle, CheckCircle2,
    Settings2, Filter, Plus, X, Loader2,
    FileText, Warehouse, ShoppingCart
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createManualInsumo } from "./actions";
import { useTransition } from "react";

interface InventoryItem {
    id: string;
    name: string;
    sku: string | null;
    barcode: string | null;
    unit: string;
    min_stock: number;
    total_stock: number;
    stock_by_warehouse: { warehouse_id: string; quantity: number }[];
}

interface Warehouse {
    id: string;
    name: string;
}

export function InventoryClient({ initialItems, warehouses }: { initialItems: InventoryItem[], warehouses: Warehouse[] }) {
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [search, setSearch] = useState("");
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [form, setForm] = useState({
        name: "",
        sku: "",
        unit: "unidad",
        min_stock: 0,
        initial_qty: 0,
        warehouse_id: warehouses[0]?.id || "",
        document_ref: "",
        supplier_name: ""
    });

    const handleCreateManual = async (e: React.FormEvent) => {
        e.preventDefault();
        startTransition(async () => {
            const result = await createManualInsumo(form);
            if (result.success) {
                setIsModalOpen(false);
                setForm({
                    name: "",
                    sku: "",
                    unit: "unidad",
                    min_stock: 0,
                    initial_qty: 0,
                    warehouse_id: warehouses[0]?.id || "",
                    document_ref: "",
                    supplier_name: ""
                });
            } else {
                alert("Error: " + result.error);
            }
        });
    };

    const filteredItems = initialItems.filter(item => {
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.sku?.toLowerCase().includes(search.toLowerCase()) ||
            item.barcode?.toLowerCase().includes(search.toLowerCase());

        if (selectedWarehouseId !== "all") {
            return matchesSearch;
        }

        return matchesSearch;
    }).map(item => {
        // Si hay una bodega seleccionada, sobreescribimos el total_stock para esa vista
        if (selectedWarehouseId !== "all") {
            const warehouseStock = item.stock_by_warehouse.find(s => s.warehouse_id === selectedWarehouseId)?.quantity || 0;
            return { ...item, total_stock: warehouseStock };
        }
        return item;
    });

    return (
        <div className="space-y-6">
            {/* Header incorporado */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-12">
                <div>
                    <h1 className="text-4xl font-black bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent tracking-tight uppercase">
                        Gestión de Insumos
                    </h1>
                    <p className="text-slate-400 mt-2 flex items-center gap-2 font-medium">
                        <Package size={20} className="text-blue-500" strokeWidth={3} />
                        Catálogo maestro y bodegas en tiempo real
                    </p>
                </div>
                <button
                    onClick={() => setIsModalOpen(true)}
                    className="bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-[2rem] font-black flex items-center gap-3 transition-all shadow-xl shadow-blue-900/40 active:scale-95 text-sm uppercase tracking-tighter group"
                >
                    <Plus size={20} strokeWidth={3} className="group-hover:rotate-90 transition-transform" /> Nuevo Insumo
                </button>
            </header>

            {/* Toolbar Inteligente */}
            <div className="flex flex-col lg:flex-row gap-4">
                <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-3.5 pl-12 pr-4 focus:outline-none focus:border-blue-500/50 transition-all text-sm"
                        placeholder="Buscar por nombre, SKU o código..."
                    />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                    {/* Selector de Bodega */}
                    <div className="relative group">
                        <Filter className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" size={14} />
                        <select
                            value={selectedWarehouseId}
                            onChange={(e) => setSelectedWarehouseId(e.target.value)}
                            className="bg-white/5 border border-white/10 rounded-2xl py-3 pl-10 pr-4 text-xs font-bold text-slate-400 focus:outline-none focus:border-blue-500/50 appearance-none cursor-pointer hover:bg-white/10 transition-all uppercase tracking-tighter"
                        >
                            <option value="all">TODAS LAS BODEGAS</option>
                            {warehouses.map(w => (
                                <option key={w.id} value={w.id}>{w.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="flex bg-white/5 p-1 rounded-2xl border border-white/10">
                        <button
                            onClick={() => setViewMode("grid")}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === "grid" ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : "text-slate-500 hover:text-white"}`}
                            title="Vista en Tarjetas"
                        >
                            <LayoutGrid size={20} />
                        </button>
                        <button
                            onClick={() => setViewMode("list")}
                            className={`p-2.5 rounded-xl transition-all ${viewMode === "list" ? "bg-blue-600 text-white shadow-lg shadow-blue-900/40" : "text-slate-500 hover:text-white"}`}
                            title="Vista en Lista"
                        >
                            <List size={20} />
                        </button>
                    </div>
                </div>
            </div>

            <AnimatePresence mode="wait">
                {viewMode === "grid" ? (
                    <motion.div
                        key="grid"
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -10 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {filteredItems.map((item) => (
                            <div key={item.id} className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md hover:bg-white/10 transition-all group relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                                    <Package size={80} />
                                </div>

                                <div className="flex justify-between items-start mb-4">
                                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                                        <Package size={22} />
                                    </div>
                                    <span className="text-[10px] font-mono font-bold text-slate-400 bg-white/5 px-2.5 py-1.5 rounded-xl border border-white/5">
                                        {item.sku || "N/A"}
                                    </span>
                                </div>

                                <h3 className="text-lg font-black text-white mt-1 leading-tight uppercase group-hover:text-blue-400 transition-colors">
                                    {item.name}
                                </h3>
                                <p className="text-[11px] text-slate-500 mt-2 font-mono uppercase tracking-wider">
                                    {item.barcode || "Sin Código EAN"}
                                </p>

                                <div className="mt-8 flex items-end justify-between">
                                    <div>
                                        <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] mb-1">Stock Total</p>
                                        <div className="flex items-baseline gap-2">
                                            <span className={`text-4xl font-black ${item.total_stock <= item.min_stock ? 'text-red-500' : 'text-white'}`}>
                                                {item.total_stock}
                                            </span>
                                            <span className="text-xs text-slate-500 font-bold lowercase">{item.unit}s</span>
                                        </div>
                                    </div>
                                    {item.total_stock <= item.min_stock ? (
                                        <div className="p-2 bg-red-500/10 rounded-xl text-red-500" title="Bajo Stock Crítico">
                                            <AlertTriangle size={20} />
                                        </div>
                                    ) : (
                                        <div className="p-2 bg-emerald-500/10 rounded-xl text-emerald-500">
                                            <CheckCircle2 size={20} />
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, x: 10 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -10 }}
                        className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden"
                    >
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-[10px] font-bold uppercase tracking-widest text-slate-500">
                                <tr>
                                    <th className="px-8 py-5">Insumo</th>
                                    <th className="px-8 py-5 text-center">SKU / Código</th>
                                    <th className="px-8 py-5 text-center">Unidad</th>
                                    <th className="px-8 py-5 text-center">Stock</th>
                                    <th className="px-8 py-5 text-right">Status</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredItems.map((item) => (
                                    <tr key={item.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3">
                                                <div className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400">
                                                    <Package size={18} />
                                                </div>
                                                <span className="text-sm font-black uppercase text-white truncate max-w-[300px]">
                                                    {item.name}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <p className="text-[11px] font-mono text-slate-400">{item.sku || '---'}</p>
                                            <p className="text-[9px] text-slate-600 font-mono mt-0.5">{item.barcode || ''}</p>
                                        </td>
                                        <td className="px-8 py-5 text-center text-xs text-slate-500 font-bold uppercase">
                                            {item.unit}
                                        </td>
                                        <td className="px-8 py-5 text-center">
                                            <span className={`text-xl font-black ${item.total_stock <= item.min_stock ? 'text-red-500' : 'text-white'}`}>
                                                {item.total_stock}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            {item.total_stock <= item.min_stock ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-500/10 text-red-500 text-[10px] font-black uppercase ring-1 ring-red-500/20">
                                                    <AlertTriangle size={12} /> Critico
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[10px] font-black uppercase ring-1 ring-emerald-500/20">
                                                    <CheckCircle2 size={12} /> Ok
                                                </span>
                                            )}
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </motion.div>
                )}
            </AnimatePresence>

            {filteredItems.length === 0 && (
                <div className="col-span-full py-40 text-center text-slate-500 border-2 border-dashed border-white/5 rounded-[3rem]">
                    <Package size={48} className="mx-auto mb-4 opacity-10" />
                    <p className="font-bold">No se encontraron resultados</p>
                    <p className="text-xs mt-1">Intenta con otro término de búsqueda.</p>
                </div>
            )}

            {/* Modal de Nuevo Insumo */}
            <AnimatePresence>
                {isModalOpen && (
                    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm">
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9, y: 20 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9, y: 20 }}
                            className="bg-[#0a0a0b] border border-white/10 w-full max-w-2xl rounded-[3rem] overflow-hidden shadow-2xl"
                        >
                            <div className="p-8 border-b border-white/5 flex items-center justify-between">
                                <div className="flex items-center gap-4">
                                    <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-500">
                                        <ShoppingCart size={24} />
                                    </div>
                                    <div>
                                        <h3 className="text-xl font-black text-white uppercase tracking-tight">Registro Manual</h3>
                                        <p className="text-xs text-slate-500 font-bold uppercase tracking-widest">Ingreso de Compra Propia</p>
                                    </div>
                                </div>
                                <button
                                    onClick={() => setIsModalOpen(false)}
                                    className="p-3 rounded-2xl hover:bg-white/5 text-slate-500 transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <form onSubmit={handleCreateManual} className="p-8 space-y-6">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nombre del Insumo</label>
                                        <input
                                            required
                                            value={form.name}
                                            onChange={e => setForm({ ...form, name: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                                            placeholder="Ej: Filtro Aceite X1"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">SKU / Código</label>
                                        <input
                                            value={form.sku}
                                            onChange={e => setForm({ ...form, sku: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all font-mono"
                                            placeholder="Opcional"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Bodega de Destino</label>
                                        <div className="relative">
                                            <Warehouse size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                            <select
                                                required
                                                value={form.warehouse_id}
                                                onChange={e => setForm({ ...form, warehouse_id: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm focus:outline-none focus:border-blue-500/50 transition-all appearance-none cursor-pointer"
                                            >
                                                {warehouses.map(w => (
                                                    <option key={w.id} value={w.id}>{w.name}</option>
                                                ))}
                                            </select>
                                        </div>
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Cantidad Inicial</label>
                                        <input
                                            type="number"
                                            required
                                            min="0"
                                            value={form.initial_qty}
                                            onChange={e => setForm({ ...form, initial_qty: Number(e.target.value) })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Proveedor / Tienda</label>
                                        <input
                                            value={form.supplier_name}
                                            onChange={e => setForm({ ...form, supplier_name: e.target.value })}
                                            className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                                            placeholder="Ej: Sodimac, Local..."
                                        />
                                    </div>

                                    <div className="space-y-2">
                                        <label className="text-[10px] font-black text-slate-500 uppercase tracking-widest ml-1">Nº Documento (OC/Guía)</label>
                                        <div className="relative">
                                            <FileText size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" />
                                            <input
                                                value={form.document_ref}
                                                onChange={e => setForm({ ...form, document_ref: e.target.value })}
                                                className="w-full bg-white/5 border border-white/10 rounded-2xl p-4 pl-12 text-sm focus:outline-none focus:border-blue-500/50 transition-all"
                                                placeholder="Referencia"
                                            />
                                        </div>
                                    </div>
                                </div>

                                <div className="flex justify-end gap-3 pt-4">
                                    <button
                                        type="button"
                                        onClick={() => setIsModalOpen(false)}
                                        className="px-6 py-4 rounded-2xl text-slate-400 font-bold hover:bg-white/5 transition-all uppercase text-xs"
                                    >
                                        Cancelar
                                    </button>
                                    <button
                                        type="submit"
                                        disabled={isPending}
                                        className="bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white px-10 py-4 rounded-2xl font-black flex items-center gap-3 transition-all shadow-xl shadow-blue-900/40 active:scale-95 text-xs uppercase tracking-tight"
                                    >
                                        {isPending ? <Loader2 className="animate-spin" size={18} /> : <Plus size={18} strokeWidth={3} />}
                                        Registrar Insumo
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>
        </div>
    );
}
