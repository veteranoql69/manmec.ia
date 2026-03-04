"use client";

import { useState } from "react";
import {
    Package, Search, LayoutGrid, List,
    ArrowRight, AlertTriangle, CheckCircle2,
    Settings2, Filter, Plus, X, Loader2,
    FileText, Warehouse, ShoppingCart,
    ChevronDown, ChevronUp, ArrowRightLeft,
    Wrench, Tag
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { createManualInsumo } from "./actions";
import { useTransition } from "react";
import { PendingTransfersInbox } from "./PendingTransfersInbox";
import { TransferInitiationModal } from "./TransferInitiationModal";

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

interface ToolItem {
    id: string;
    serial_number: string;
    name: string;
    brand: string | null;
    model: string | null;
    category: string | null;
    status: string;
    assigned_warehouse_id: string | null;
}

interface Warehouse {
    id: string;
    name: string;
}

export function InventoryClient({
    initialItems,
    initialTools = [],
    warehouses,
    initialWarehouseId = "all",
    pendingTransfers = []
}: {
    initialItems: InventoryItem[],
    initialTools?: ToolItem[],
    warehouses: Warehouse[],
    initialWarehouseId?: string,
    pendingTransfers?: any[]
}) {
    const [itemType, setItemType] = useState<"CONSUMABLE" | "TOOL">("CONSUMABLE");
    const [viewMode, setViewMode] = useState<"grid" | "list">("list");
    const [search, setSearch] = useState("");
    const [selectedWarehouseId, setSelectedWarehouseId] = useState<string>(initialWarehouseId);
    const [activeTab, setActiveTab] = useState<"all" | "critical" | "out_of_stock">("all");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isPending, startTransition] = useTransition();

    const [transferModalData, setTransferModalData] = useState<{
        isOpen: boolean;
        type?: "CONSUMABLE" | "TOOL";
        preSelectedId?: string;
        itemName?: string;
        maxQty?: number;
        fromWarehouseId?: string;
    }>({ isOpen: false });

    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (id: string) => {
        setExpandedGroups(prev => ({ ...prev, [id]: !prev[id] }));
    };

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

    // Aplicar lógica de "Progressive Disclosure"
    const filteredItems = initialItems.map(item => {
        // Compute correct total stock based on warehouse filter
        if (selectedWarehouseId !== "all") {
            const warehouseStock = item.stock_by_warehouse.find(s => s.warehouse_id === selectedWarehouseId)?.quantity || 0;
            return { ...item, total_stock: warehouseStock };
        }
        return item;
    }).filter(item => {
        // 1. Ocultar la basura (Cero total y cero mínimo) para no saturar 
        // a menos que estemos buscando algo específico
        if (search === "" && item.total_stock === 0 && item.min_stock === 0) {
            return false;
        }

        // 2. Filtro de Búsqueda
        const matchesSearch = item.name.toLowerCase().includes(search.toLowerCase()) ||
            item.sku?.toLowerCase().includes(search.toLowerCase()) ||
            item.barcode?.toLowerCase().includes(search.toLowerCase());

        if (!matchesSearch) return false;

        // 3. Filtro de Pestañas (Tabs)
        if (activeTab === "critical") {
            // Crítico es cuando te queda algo pero estás bajo el mínimo
            return item.total_stock <= item.min_stock && item.total_stock > 0;
        }
        if (activeTab === "out_of_stock") {
            return item.total_stock === 0;
        }

        return true;
    }).sort((a, b) => {
        // Orden semántico inteligente. 
        // Primero los que están más críticos (mayor brecha negativa entre stock y min_stock)
        const gapA = a.total_stock - a.min_stock;
        const gapB = b.total_stock - b.min_stock;

        if (gapA < 0 && gapB >= 0) return -1;
        if (gapB < 0 && gapA >= 0) return 1;
        return gapA - gapB;
    });

    const filteredTools = initialTools.filter(tool => {
        if (selectedWarehouseId !== "all" && tool.assigned_warehouse_id !== selectedWarehouseId) {
            return false;
        }
        const matchesSearch = tool.name.toLowerCase().includes(search.toLowerCase()) ||
            tool.serial_number.toLowerCase().includes(search.toLowerCase());
        return matchesSearch;
    });

    return (
        <div className="space-y-6">
            {/* Header incorporado */}
            <header className="flex flex-col md:flex-row md:items-center justify-between gap-6 mb-8">
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

            {/* Selector de Tipo de Inventario (Insumos vs Herramientas) */}
            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 w-fit overflow-x-auto max-w-full no-scrollbar mb-2">
                <button
                    onClick={() => setItemType("CONSUMABLE")}
                    className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${itemType === "CONSUMABLE" ? "bg-white/10 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                >
                    <Package size={14} /> Insumos
                </button>
                <button
                    onClick={() => setItemType("TOOL")}
                    className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 ${itemType === "TOOL" ? "bg-white/10 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                >
                    <Wrench size={14} /> Herramientas
                </button>
            </div>

            {/* Pestañas (Tabs) Progresivas - Solo para Insumos */}
            {itemType === "CONSUMABLE" && (
                <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 w-fit overflow-x-auto max-w-full no-scrollbar">
                    <button
                        onClick={() => setActiveTab("all")}
                        className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap ${activeTab === "all" ? "bg-white/10 text-white shadow-lg" : "text-slate-500 hover:text-slate-300"}`}
                    >
                        Todos (Con Stock)
                    </button>
                    <button
                        onClick={() => setActiveTab("critical")}
                        className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "critical" ? "bg-orange-500/20 text-orange-400 border border-orange-500/30 shadow-lg shadow-orange-900/20" : "text-slate-500 hover:text-orange-400/50"}`}
                    >
                        <AlertTriangle size={14} /> Stock Crítico
                    </button>
                    <button
                        onClick={() => setActiveTab("out_of_stock")}
                        className={`px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all flex items-center gap-2 whitespace-nowrap ${activeTab === "out_of_stock" ? "bg-red-500/20 text-red-400 border border-red-500/30 shadow-lg shadow-red-900/20" : "text-slate-500 hover:text-red-400/50"}`}
                    >
                        <X size={14} /> Agotados
                    </button>
                </div>
            )}

            {/* Bandeja de Traspasos Pendientes (Handshakes) */}
            <PendingTransfersInbox transfers={pendingTransfers} />

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
                {itemType === "CONSUMABLE" ? (
                    viewMode === "grid" ? (
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
                            className="space-y-4"
                        >
                            {filteredItems.map((item) => {
                                const isExpanded = expandedGroups[item.id];
                                const isCritical = item.total_stock <= item.min_stock;

                                return (
                                    <div key={item.id} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
                                        <div
                                            onClick={() => toggleGroup(item.id)}
                                            className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors group"
                                        >
                                            <div className="flex items-center gap-4 flex-1">
                                                <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center">
                                                    <Package className="w-5 h-5 text-blue-400" />
                                                </div>
                                                <div>
                                                    <h3 className="text-lg font-black tracking-tight uppercase line-clamp-1 group-hover:text-blue-400 transition-colors">{item.name}</h3>
                                                    <div className="flex gap-2 mt-1">
                                                        {item.sku && <span className="text-xs font-mono text-slate-400 bg-black px-2 py-0.5 rounded-lg border border-white/10">{item.sku}</span>}
                                                        {item.barcode && <span className="text-xs font-mono text-slate-500 border border-white/5 px-2 py-0.5 rounded-lg">{item.barcode}</span>}
                                                    </div>
                                                </div>
                                            </div>
                                            <div className="flex items-center gap-6">
                                                <div className="text-right hidden sm:block">
                                                    <p className="text-sm font-black text-white flex items-center justify-end gap-1">
                                                        <span className={isCritical ? 'text-red-500' : 'text-emerald-400'}>
                                                            {item.total_stock}
                                                        </span>
                                                        <span className="text-slate-400 font-medium text-xs lowercase"> {item.unit}s en total</span>
                                                    </p>
                                                    <p className="text-xs font-bold text-slate-500">Min. requerido: {item.min_stock}</p>
                                                </div>
                                                <div className="p-2 rounded-full bg-black border border-white/10 group-hover:border-blue-500/50 transition-colors">
                                                    {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                                </div>
                                            </div>
                                        </div>

                                        <AnimatePresence>
                                            {isExpanded && (
                                                <motion.div
                                                    initial={{ height: 0, opacity: 0 }}
                                                    animate={{ height: "auto", opacity: 1 }}
                                                    exit={{ height: 0, opacity: 0 }}
                                                    className="border-t border-white/5 bg-black/40"
                                                >
                                                    <table className="w-full text-left">
                                                        <thead className="text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-white/5">
                                                            <tr>
                                                                <th className="px-6 py-4">Ubicación (Bodega / Furgón)</th>
                                                                <th className="px-6 py-4 text-right">Cantidad Disponible</th>
                                                            </tr>
                                                        </thead>
                                                        <tbody>
                                                            {item.stock_by_warehouse.length > 0 ? (
                                                                item.stock_by_warehouse
                                                                    .filter(stock => stock.quantity > 0)
                                                                    .map((stock) => {
                                                                        const warehouseName = warehouses.find(w => w.id === stock.warehouse_id)?.name || "Bodega Desconocida";
                                                                        return (
                                                                            <tr key={`${item.id}-${stock.warehouse_id}`} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                                                <td className="px-6 py-4">
                                                                                    <div className="text-xs font-bold text-indigo-400 flex items-center gap-2">
                                                                                        <Warehouse className="w-3 h-3" />
                                                                                        {warehouseName}
                                                                                    </div>
                                                                                </td>
                                                                                <td className="px-6 py-4 text-right">
                                                                                    <div className="flex items-center justify-end gap-3">
                                                                                        <span className="text-sm font-black text-white bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                                                                                            {stock.quantity} <span className="text-[10px] font-medium text-slate-500 lowercase">{item.unit}s</span>
                                                                                        </span>
                                                                                        <button
                                                                                            onClick={() => {
                                                                                                setTransferModalData({
                                                                                                    isOpen: true,
                                                                                                    type: "CONSUMABLE",
                                                                                                    preSelectedId: item.id,
                                                                                                    itemName: item.name,
                                                                                                    maxQty: stock.quantity,
                                                                                                    fromWarehouseId: stock.warehouse_id
                                                                                                });
                                                                                            }}
                                                                                            className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors border border-orange-500/20"
                                                                                            title="Traspasar Insumo (Handshake)"
                                                                                        >
                                                                                            <ArrowRightLeft className="w-4 h-4" />
                                                                                        </button>
                                                                                    </div>
                                                                                </td>
                                                                            </tr>
                                                                        );
                                                                    })
                                                            ) : (
                                                                <tr>
                                                                    <td colSpan={2} className="px-6 py-8 text-center text-slate-500 text-xs font-bold uppercase tracking-wider">
                                                                        Sin inventario distribuido
                                                                    </td>
                                                                </tr>
                                                            )}
                                                        </tbody>
                                                    </table>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                );
                            })}
                        </motion.div>
                    )
                ) : (
                    <motion.div
                        key="tools-list"
                        initial={{ opacity: 0, scale: 0.98 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.98 }}
                        className="space-y-4"
                    >
                        {filteredTools.map((tool) => {
                            const isExpanded = expandedGroups[tool.id];
                            const warehouseName = warehouses.find(w => w.id === tool.assigned_warehouse_id)?.name || "Sin Asignar";
                            const isTransferring = tool.status === "IN_TRANSIT";

                            return (
                                <div key={tool.id} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
                                    {/* Cabecera del Grupo (Herramienta) */}
                                    <div
                                        onClick={() => toggleGroup(tool.id)}
                                        className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors group"
                                    >
                                        <div className="flex items-center gap-4 flex-1">
                                            <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center">
                                                <Wrench className="w-5 h-5 text-purple-400" />
                                            </div>
                                            <div>
                                                <h3 className="text-lg font-black tracking-tight uppercase line-clamp-1 group-hover:text-purple-400 transition-colors">{tool.name}</h3>
                                                <div className="flex gap-2 mt-1">
                                                    <span className="text-xs font-mono text-purple-300 bg-purple-500/10 px-2 py-0.5 rounded-lg border border-purple-500/20">S/N: {tool.serial_number}</span>
                                                    {tool.brand && <span className="text-xs font-mono text-slate-500 border border-white/5 px-2 py-0.5 rounded-lg">{tool.brand}</span>}
                                                </div>
                                            </div>
                                        </div>
                                        <div className="flex items-center gap-6">
                                            <div className="text-right hidden sm:block">
                                                <p className="text-sm font-black text-white flex items-center justify-end gap-1">
                                                    <span className="text-emerald-400">1</span>
                                                    <span className="text-slate-400 font-medium text-xs lowercase"> unidad en total</span>
                                                </p>
                                                {isTransferring ? (
                                                    <p className="text-xs font-bold text-yellow-500 uppercase mt-1">En Tránsito</p>
                                                ) : (
                                                    <p className="text-xs font-bold text-slate-500 mt-1 flex items-center justify-end gap-1">
                                                        <CheckCircle2 className="w-3 h-3" /> Disponible
                                                    </p>
                                                )}
                                            </div>
                                            <div className="p-2 rounded-full bg-black border border-white/10 group-hover:border-purple-500/50 transition-colors">
                                                {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                            </div>
                                        </div>
                                    </div>

                                    {/* Detalle Desplegable: Ubicación y Acción(es) */}
                                    <AnimatePresence>
                                        {isExpanded && (
                                            <motion.div
                                                initial={{ height: 0, opacity: 0 }}
                                                animate={{ height: "auto", opacity: 1 }}
                                                exit={{ height: 0, opacity: 0 }}
                                                className="border-t border-white/5 bg-black/40"
                                            >
                                                <table className="w-full text-left">
                                                    <thead className="text-[10px] uppercase font-black text-slate-500 tracking-widest border-b border-white/5">
                                                        <tr>
                                                            <th className="px-6 py-4">Ubicación (Bodega / Furgón)</th>
                                                            <th className="px-6 py-4 text-right">Acciones Disponibles</th>
                                                        </tr>
                                                    </thead>
                                                    <tbody>
                                                        <tr className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                            <td className="px-6 py-4">
                                                                <div className="text-xs font-bold text-purple-400 flex items-center gap-2 uppercase tracking-wider">
                                                                    <Warehouse className="w-4 h-4" />
                                                                    {warehouseName}
                                                                </div>
                                                            </td>
                                                            <td className="px-6 py-4 text-right">
                                                                <div className="flex items-center justify-end gap-3">
                                                                    <span className="text-sm font-black text-white bg-white/5 px-3 py-1 rounded-lg border border-white/10">
                                                                        1 <span className="text-[10px] font-medium text-slate-500 lowercase">unidad</span>
                                                                    </span>
                                                                    <button
                                                                        disabled={isTransferring || !tool.assigned_warehouse_id}
                                                                        onClick={() => {
                                                                            setTransferModalData({
                                                                                isOpen: true,
                                                                                type: "TOOL",
                                                                                preSelectedId: tool.id,
                                                                                itemName: tool.name,
                                                                                fromWarehouseId: tool.assigned_warehouse_id!
                                                                            });
                                                                        }}
                                                                        className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 disabled:opacity-50 transition-colors border border-orange-500/20"
                                                                        title={!tool.assigned_warehouse_id ? "No tiene bodega asignada" : "Traspasar Herramienta (Handshake)"}
                                                                    >
                                                                        <ArrowRightLeft className="w-4 h-4" />
                                                                    </button>
                                                                </div>
                                                            </td>
                                                        </tr>
                                                    </tbody>
                                                </table>
                                            </motion.div>
                                        )}
                                    </AnimatePresence>
                                </div>
                            );
                        })}
                    </motion.div>
                )}
            </AnimatePresence>

            {(itemType === "CONSUMABLE" ? filteredItems.length === 0 : filteredTools.length === 0) && (
                <div className="col-span-full py-40 text-center text-slate-500 border-2 border-dashed border-white/5 rounded-[3rem]">
                    {itemType === "CONSUMABLE" ? <Package size={48} className="mx-auto mb-4 opacity-10" /> : <Wrench size={48} className="mx-auto mb-4 opacity-10" />}
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
                                        Agregar Insumo
                                    </button>
                                </div>
                            </form>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Modal de Traspaso Express (Insumos/Herramientas de Bodega a Bodega) */}
            <TransferInitiationModal
                isOpen={transferModalData.isOpen}
                onClose={() => setTransferModalData({ isOpen: false })}
                warehouses={warehouses as any}
                currentWarehouseId={transferModalData.fromWarehouseId || selectedWarehouseId || warehouses[0]?.id || ""}
                preSelectedType={transferModalData.type}
                preSelectedId={transferModalData.preSelectedId}
                preSelectedName={transferModalData.itemName}
                maxQuantity={transferModalData.maxQty}
            />
        </div>
    );
}
