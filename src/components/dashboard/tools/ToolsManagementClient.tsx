"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search, Plus, Wrench, Settings2, Edit3, User, Truck, AlertCircle, CheckCircle2, History, Filter, Printer, Camera, Box, ChevronDown, ChevronUp, LayoutGrid, List, ArrowRightLeft, Package
} from "lucide-react";
import { Tool, deleteTool, ToolStatus } from "@/app/dashboard/tools/actions";
import { useRouter } from "next/navigation";
import { ToolModal } from "./ToolModal";
import { ToolScanner } from "./ToolScanner";
import { ToolLabelOverlay } from "./ToolLabelOverlay";
import { TransferInitiationModal } from "@/components/dashboard/inventory/TransferInitiationModal";

interface Props {
    initialTools: Tool[];
    members: any[];
    vehicles: any[];
    warehouses: any[];
}

const STATUS_MAP: Record<ToolStatus, { label: string, color: string, icon: any }> = {
    available: { label: 'Disponible', color: 'emerald', icon: CheckCircle2 },
    in_use: { label: 'En Uso', color: 'blue', icon: User },
    repair: { label: 'En Reparación', color: 'amber', icon: Settings2 },
    lost: { label: 'Extraviada', color: 'red', icon: AlertCircle },
    retired: { label: 'De Baja', color: 'slate', icon: History },
    IN_TRANSIT: { label: 'En Tránsito', color: 'orange', icon: ArrowRightLeft }
};

interface ToolGroup {
    id: string;
    name: string;
    brand: string;
    model: string;
    items: Tool[];
}

interface Props {
    initialTools: Tool[];
    members: any[];
    vehicles: any[];
    warehouses: any[];
}

export function ToolsManagementClient({ initialTools, members, vehicles, warehouses }: Props) {
    const router = useRouter();
    const [tools, setTools] = useState<Tool[]>(initialTools);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<ToolStatus | 'all'>('all');
    // Forzamos el modo lista por defecto
    const [viewMode, setViewMode] = useState<'list' | 'grid'>('list');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<Tool | null>(null);
    const [showGlobalScanner, setShowGlobalScanner] = useState(false);
    const [printingTool, setPrintingTool] = useState<Tool | null>(null);
    const [transferModalData, setTransferModalData] = useState<{
        isOpen: boolean;
        type: "CONSUMABLE" | "TOOL";
        preSelectedId?: string;
        itemName?: string;
        maxQty?: number;
        fromWarehouseId?: string;
    }>({ isOpen: false, type: "TOOL" });

    // Estado para controlar qué grupos están expandidos
    const [expandedGroups, setExpandedGroups] = useState<Record<string, boolean>>({});

    const toggleGroup = (groupId: string) => {
        setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
    };

    const filteredTools = useMemo(() => {
        return tools.filter(t => {
            const matchesSearch =
                t.name.toLowerCase().includes(search.toLowerCase()) ||
                t.serial_number.toLowerCase().includes(search.toLowerCase()) ||
                (t.brand || '').toLowerCase().includes(search.toLowerCase());

            const matchesStatus = filterStatus === 'all' || t.status === filterStatus;

            return matchesSearch && matchesStatus;
        });
    }, [tools, search, filterStatus]);

    // Lógica para agrupar herramientas idénticas (mismo nombre, marca y modelo)
    const groupedTools = useMemo(() => {
        const groups = new Map<string, ToolGroup>();
        filteredTools.forEach(t => {
            const key = `${t.name.toLowerCase().trim()}|${(t.brand || '').toLowerCase().trim()}|${(t.model || '').toLowerCase().trim()}`;
            if (!groups.has(key)) {
                groups.set(key, {
                    id: key,
                    name: t.name,
                    brand: t.brand || '',
                    model: t.model || '',
                    items: []
                });
            }
            groups.get(key)!.items.push(t);
        });
        return Array.from(groups.values()).sort((a, b) => a.name.localeCompare(b.name));
    }, [filteredTools]);

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de eliminar esta herramienta?")) return;
        try {
            await deleteTool(id);
            setTools(prev => prev.filter(t => t.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (tool: Tool) => {
        setEditingTool(tool);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingTool(null);
        setIsModalOpen(true);
    };

    const handleGlobalScan = (code: string) => {
        setSearch(code);
        const tool = tools.find(t => t.serial_number === code);
        if (tool) {
            handleEdit(tool);
        }
    };

    return (
        <div className="space-y-6">
            {/* Selector de Tipo de Inventario (Insumos vs Herramientas) para navegar */}
            <div className="flex bg-white/5 p-1.5 rounded-2xl border border-white/10 w-fit overflow-x-auto max-w-full no-scrollbar mb-2">
                <button
                    onClick={() => router.push('/dashboard/inventory')}
                    className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 text-slate-500 hover:text-slate-300"
                >
                    <Package size={14} /> Insumos
                </button>
                <button
                    className="px-6 py-2.5 rounded-xl font-bold text-xs uppercase tracking-widest transition-all whitespace-nowrap flex items-center gap-2 bg-white/10 text-white shadow-lg"
                >
                    <Wrench size={14} /> Herramientas
                </button>
            </div>

            <div className="flex flex-col lg:flex-row gap-4 justify-between items-center bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md">
                <div className="flex flex-col md:flex-row gap-4 w-full lg:w-auto flex-1">
                    <div className="relative flex-1 md:max-w-md">
                        <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o serie..."
                            className="w-full bg-black/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium"
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                        />
                    </div>
                    <div className="relative">
                        <Filter className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                        <select
                            className="appearance-none w-full md:w-48 bg-black/50 border border-white/10 rounded-2xl py-3 pl-12 pr-10 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all font-medium cursor-pointer"
                            value={filterStatus}
                            onChange={(e) => setFilterStatus(e.target.value as any)}
                        >
                            <option value="all">Todos los estados</option>
                            <option value="available">Disponibles</option>
                            <option value="in_use">En Uso</option>
                            <option value="repair">En Reparación</option>
                            <option value="lost">Extraviadas</option>
                            <option value="retired">Dadas de Baja</option>
                        </select>
                    </div>
                    <div className="flex gap-2 bg-black/50 p-1 rounded-2xl border border-white/10">
                        <button
                            onClick={() => setViewMode('list')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'list' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                            title="Vista Consolidada (Lista)"
                        >
                            <List className="w-5 h-5" />
                        </button>
                        <button
                            onClick={() => setViewMode('grid')}
                            className={`p-2 rounded-xl transition-all ${viewMode === 'grid' ? 'bg-blue-600 text-white' : 'text-slate-500 hover:text-white hover:bg-white/5'}`}
                            title="Vista Individual (Cuadrículas)"
                        >
                            <LayoutGrid className="w-5 h-5" />
                        </button>
                    </div>
                </div>
                <div className="flex gap-2 w-full lg:w-auto">
                    <button
                        onClick={() => setShowGlobalScanner(true)}
                        className="flex-1 lg:w-auto bg-black border border-white/10 hover:border-blue-500/50 text-slate-400 hover:text-blue-400 px-6 py-3 rounded-2xl font-bold uppercase flex items-center justify-center gap-2 transition-all active:scale-95 text-xs"
                    >
                        <Camera className="w-4 h-4" />
                        Escanear
                    </button>
                    <button
                        onClick={handleAdd}
                        className="flex-[2] lg:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-3 rounded-2xl font-black uppercase tracking-tight flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-900/20 active:scale-95 text-sm"
                    >
                        <Plus className="w-4 h-4" />
                        Nueva Herramienta
                    </button>
                </div>
            </div>

            {filteredTools.length === 0 ? (
                <div className="py-32 text-center bg-white/5 rounded-[4rem] border border-dashed border-white/10 backdrop-blur-sm">
                    <Wrench className="w-20 h-20 mx-auto mb-6 text-slate-800 opacity-20" />
                    <h3 className="text-2xl font-black text-slate-600 uppercase tracking-tighter">Inventario Vacío</h3>
                    <p className="text-slate-500 text-sm mt-2 font-medium">No hay herramientas o no coinciden con los filtros.</p>
                </div>
            ) : viewMode === 'list' ? (
                // --- VISTA CONSOLIDADA (AGRUPADA) ---
                <div className="space-y-4">
                    {groupedTools.map((group) => {
                        const isExpanded = expandedGroups[group.id];
                        // Podemos calcular conteos rápidos
                        const disponiblesCount = group.items.filter(i => i.status === 'available').length;
                        return (
                            <div key={group.id} className="bg-white/5 border border-white/10 rounded-3xl overflow-hidden backdrop-blur-md">
                                {/* Cabecera del Grupo */}
                                <div
                                    onClick={() => toggleGroup(group.id)}
                                    className="p-5 flex items-center justify-between cursor-pointer hover:bg-white/5 transition-colors group"
                                >
                                    <div className="flex items-center gap-4">
                                        <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center">
                                            <Wrench className="w-5 h-5 text-indigo-400" />
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-black tracking-tight uppercase line-clamp-1">{group.name}</h3>
                                            <div className="flex gap-2 mt-1">
                                                {group.brand && <span className="text-xs text-slate-400 bg-black px-2 py-0.5 rounded-lg border border-white/10">{group.brand}</span>}
                                                {group.model && <span className="text-xs text-slate-400 bg-black px-2 py-0.5 rounded-lg border border-white/10">{group.model}</span>}
                                            </div>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-6">
                                        <div className="text-right hidden sm:block">
                                            <p className="text-sm font-black text-white">{group.items.length} unidades totales</p>
                                            <p className="text-xs font-bold text-emerald-400">{disponiblesCount} disponibles</p>
                                        </div>
                                        <div className="p-2 rounded-full bg-black border border-white/10 group-hover:border-indigo-500/50 transition-colors">
                                            {isExpanded ? <ChevronUp className="w-5 h-5 text-slate-400" /> : <ChevronDown className="w-5 h-5 text-slate-400" />}
                                        </div>
                                    </div>
                                </div>

                                {/* Items Individuales (Desplegables) */}
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
                                                        <th className="px-6 py-4">N° Serie</th>
                                                        <th className="px-6 py-4">Estado</th>
                                                        <th className="px-6 py-4">Ubicación (Bodega / Furgón)</th>
                                                        <th className="px-6 py-4 text-right">Acciones</th>
                                                    </tr>
                                                </thead>
                                                <tbody>
                                                    {group.items.map((tool) => {
                                                        const status = STATUS_MAP[tool.status];
                                                        const StatusIcon = status.icon;
                                                        return (
                                                            <tr key={tool.id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                                                                <td className="px-6 py-4">
                                                                    <span className="font-mono text-xs font-bold bg-white/10 px-2 py-1 rounded text-slate-300">
                                                                        {tool.serial_number}
                                                                    </span>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-${status.color}-500/10 text-${status.color}-500 border border-${status.color}-500/20`}>
                                                                        <StatusIcon className="w-3 h-3" />
                                                                        {status.label}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4">
                                                                    <div className="text-xs font-bold">
                                                                        {tool.assigned_user ? (
                                                                            <span className="text-blue-400 flex items-center gap-1.5"><User className="w-3 h-3" /> {tool.assigned_user.full_name}</span>
                                                                        ) : tool.assigned_vehicle ? (
                                                                            <span className="text-amber-400 flex items-center gap-1.5"><Truck className="w-3 h-3" /> {tool.assigned_vehicle.plate}</span>
                                                                        ) : tool.assigned_warehouse ? (
                                                                            <span className="text-indigo-400 flex items-center gap-1.5"><Box className="w-3 h-3" /> {tool.assigned_warehouse.name}</span>
                                                                        ) : (
                                                                            <span className="text-slate-600 italic">Sin asignar</span>
                                                                        )}
                                                                    </div>
                                                                </td>
                                                                <td className="px-6 py-4 text-right">
                                                                    <div className="flex justify-end gap-2">
                                                                        <button
                                                                            disabled={tool.status === "IN_TRANSIT" || !tool.assigned_warehouse_id}
                                                                            onClick={() => {
                                                                                setTransferModalData({
                                                                                    isOpen: true,
                                                                                    type: "TOOL",
                                                                                    preSelectedId: tool.id,
                                                                                    itemName: `${tool.name} (${tool.serial_number})`,
                                                                                    fromWarehouseId: tool.assigned_warehouse_id!
                                                                                });
                                                                            }}
                                                                            className="p-1.5 rounded-lg bg-orange-500/10 text-orange-400 hover:bg-orange-500/20 transition-colors border border-orange-500/20 disabled:opacity-50"
                                                                            title={!tool.assigned_warehouse_id ? "Solo herramientas en bodega" : "Transferir"}
                                                                        >
                                                                            <ArrowRightLeft className="w-4 h-4" />
                                                                        </button>
                                                                        <button onClick={() => setPrintingTool(tool)} className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                                                                            <Printer className="w-4 h-4" />
                                                                        </button>
                                                                        <button onClick={() => handleEdit(tool)} className="p-1.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all">
                                                                            <Edit3 className="w-4 h-4" />
                                                                        </button>
                                                                    </div>
                                                                </td>
                                                            </tr>
                                                        );
                                                    })}
                                                </tbody>
                                            </table>
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>
                        );
                    })}
                </div>
            ) : (
                // --- VISTA INDIVIDUAL (GRID ORIGINAL) ---
                <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-6">
                    <AnimatePresence mode="popLayout">
                        {filteredTools.map((tool, i) => {
                            const status = STATUS_MAP[tool.status];
                            const StatusIcon = status.icon;

                            return (
                                <motion.div
                                    key={tool.id}
                                    layout
                                    initial={{ opacity: 0, y: 20 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0, scale: 0.9 }}
                                    transition={{ delay: i * 0.03 }}
                                    className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] backdrop-blur-md group hover:border-white/20 transition-all relative overflow-hidden"
                                >
                                    <div className="flex justify-between items-start mb-6">
                                        <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-inner group-hover:border-blue-500/50 transition-colors">
                                            <Wrench className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
                                        </div>
                                        <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                            <button
                                                disabled={tool.status === "IN_TRANSIT" || !tool.assigned_warehouse_id}
                                                onClick={() => {
                                                    setTransferModalData({
                                                        isOpen: true,
                                                        type: "TOOL",
                                                        preSelectedId: tool.id,
                                                        itemName: `${tool.name} (${tool.serial_number})`,
                                                        fromWarehouseId: tool.assigned_warehouse_id!
                                                    });
                                                }}
                                                className="p-2 hover:bg-orange-500/10 rounded-xl text-orange-400 hover:text-orange-300 transition-all disabled:opacity-50 shadow-lg shadow-black/50"
                                                title={!tool.assigned_warehouse_id ? "Solo herramientas en bodega" : "Transferir"}
                                            >
                                                <ArrowRightLeft className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => setPrintingTool(tool)}
                                                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all shadow-lg shadow-black/50"
                                            >
                                                <Printer className="w-4 h-4" />
                                            </button>
                                            <button
                                                onClick={() => handleEdit(tool)}
                                                className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all shadow-lg shadow-black/50"
                                            >
                                                <Edit3 className="w-4 h-4" />
                                            </button>
                                        </div>
                                    </div>

                                    <div className="space-y-1 mb-6">
                                        <h3 className="text-xl font-black tracking-tight uppercase line-clamp-1">{tool.name}</h3>
                                        <div className="flex items-center gap-2">
                                            <span className="text-[10px] font-black uppercase bg-white/10 px-2 py-0.5 rounded text-slate-300">
                                                {tool.serial_number}
                                            </span>
                                            <p className="text-xs text-slate-500 font-medium line-clamp-1">
                                                {tool.brand} {tool.model}
                                            </p>
                                        </div>
                                    </div>

                                    <div className="space-y-4 pt-4 border-t border-white/5">
                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] uppercase font-bold text-slate-600 tracking-widest">Estado</span>
                                            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full text-[10px] font-black uppercase bg-${status.color}-500/10 text-${status.color}-500 border border-${status.color}-500/20`}>
                                                <StatusIcon className="w-3 h-3" />
                                                {status.label}
                                            </div>
                                        </div>

                                        <div className="flex items-center justify-between">
                                            <span className="text-[10px] uppercase font-bold text-slate-600 tracking-widest">Ubicación</span>
                                            <div className="text-xs font-bold flex items-center gap-2">
                                                {tool.assigned_user ? (
                                                    <div className="flex items-center gap-1.5 bg-blue-500/10 text-blue-400 px-2 py-1 rounded-lg">
                                                        <User className="w-3 h-3" />
                                                        {tool.assigned_user.full_name}
                                                    </div>
                                                ) : tool.assigned_vehicle ? (
                                                    <div className="flex items-center gap-1.5 bg-amber-500/10 text-amber-400 px-2 py-1 rounded-lg">
                                                        <Truck className="w-3 h-3" />
                                                        {tool.assigned_vehicle.plate}
                                                    </div>
                                                ) : tool.assigned_warehouse ? (
                                                    <div className="flex items-center gap-1.5 bg-indigo-500/10 text-indigo-400 px-2 py-1 rounded-lg">
                                                        <Box className="w-3 h-3" />
                                                        {tool.assigned_warehouse.name}
                                                    </div>
                                                ) : (
                                                    <span className="text-slate-600 italic">Sin asignar</span>
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                </motion.div>
                            );
                        })}
                    </AnimatePresence>
                </div>
            )}

            {isModalOpen && (
                <ToolModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    tool={editingTool}
                    onSuccess={() => {
                        window.location.reload();
                    }}
                    members={members}
                    vehicles={vehicles}
                    warehouses={warehouses}
                />
            )}
            {showGlobalScanner && (
                <ToolScanner
                    onScan={handleGlobalScan}
                    onClose={() => setShowGlobalScanner(false)}
                />
            )}

            {printingTool && (
                <ToolLabelOverlay
                    tool={printingTool}
                    onClose={() => setPrintingTool(null)}
                />
            )}

            {transferModalData.isOpen && (
                <TransferInitiationModal
                    isOpen={transferModalData.isOpen}
                    onClose={() => setTransferModalData({ isOpen: false, type: "TOOL" })}
                    preSelectedType={transferModalData.type}
                    preSelectedId={transferModalData.preSelectedId}
                    preSelectedName={transferModalData.itemName}
                    warehouses={warehouses}
                    fromWarehouseId={transferModalData.fromWarehouseId || ""}
                    maxQuantity={transferModalData.maxQty}
                />
            )}
        </div>
    );
}
