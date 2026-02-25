"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Plus,
    Wrench,
    Settings2,
    ChevronRight,
    Edit3,
    Hash,
    User,
    Truck,
    AlertCircle,
    CheckCircle2,
    Wrench as WrenchIcon,
    History,
    Filter,
    Printer,
    Camera
} from "lucide-react";
import { Tool, deleteTool, ToolStatus } from "@/app/dashboard/tools/actions";
import { ToolModal } from "./ToolModal";
import { ToolScanner } from "./ToolScanner";
import { ToolLabelOverlay } from "./ToolLabelOverlay";

interface Props {
    initialTools: Tool[];
    members: any[];
    vehicles: any[];
}

const STATUS_MAP: Record<ToolStatus, { label: string, color: string, icon: any }> = {
    available: { label: 'Disponible', color: 'emerald', icon: CheckCircle2 },
    in_use: { label: 'En Uso', color: 'blue', icon: User },
    repair: { label: 'En Reparación', color: 'amber', icon: Settings2 },
    lost: { label: 'Extraviada', color: 'red', icon: AlertCircle },
    retired: { label: 'De Baja', color: 'slate', icon: History }
};

export function ToolsManagementClient({ initialTools, members, vehicles }: Props) {
    const [tools, setTools] = useState<Tool[]>(initialTools);
    const [search, setSearch] = useState("");
    const [filterStatus, setFilterStatus] = useState<ToolStatus | 'all'>('all');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingTool, setEditingTool] = useState<Tool | null>(null);
    const [showGlobalScanner, setShowGlobalScanner] = useState(false);
    const [printingTool, setPrintingTool] = useState<Tool | null>(null);

    const filteredTools = useMemo(() => {
        return tools.filter(t => {
            const matchesSearch =
                t.name.toLowerCase().includes(search.toLowerCase()) ||
                t.serial_number.toLowerCase().includes(search.toLowerCase()) ||
                t.brand?.toLowerCase().includes(search.toLowerCase());

            const matchesStatus = filterStatus === 'all' || t.status === filterStatus;

            return matchesSearch && matchesStatus;
        });
    }, [tools, search, filterStatus]);

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
        setSearch(code); // Filtrar por el código escaneado
        const tool = tools.find(t => t.serial_number === code);
        if (tool) {
            handleEdit(tool); // Si lo encuentra, abrir modal directamente
        }
    };

    return (
        <div className="space-y-6">
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
                                        <WrenchIcon className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
                                    </div>
                                    <div className="flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                        <button
                                            onClick={() => setPrintingTool(tool)}
                                            className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all shadow-lg shadow-black/50"
                                            title="Imprimir etiqueta"
                                        >
                                            <Printer className="w-4 h-4" />
                                        </button>
                                        <button
                                            onClick={() => handleEdit(tool)}
                                            className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all shadow-lg shadow-black/50"
                                            title="Editar"
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
                                        <p className="text-xs text-slate-500 font-medium">
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
                                        <span className="text-[10px] uppercase font-bold text-slate-600 tracking-widest">Asignación</span>
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
                                            ) : (
                                                <span className="text-slate-600 italic">Sin asignar (En Bodega)</span>
                                            )}
                                        </div>
                                    </div>
                                </div>
                            </motion.div>
                        );
                    })}
                </AnimatePresence>
            </div>

            {filteredTools.length === 0 && (
                <div className="py-32 text-center bg-white/5 rounded-[4rem] border border-dashed border-white/10 backdrop-blur-sm">
                    <Wrench className="w-20 h-20 mx-auto mb-6 text-slate-800 opacity-20" />
                    <h3 className="text-2xl font-black text-slate-600 uppercase tracking-tighter">Inventario Vacío</h3>
                    <p className="text-slate-500 text-sm mt-2 font-medium">No hay herramientas que coincidan con tu búsqueda.</p>
                </div>
            )}

            {isModalOpen && (
                <ToolModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    tool={editingTool}
                    onSuccess={() => {
                        window.location.reload(); // Simplificado para garantizar consistencia de asignaciones
                    }}
                    members={members}
                    vehicles={vehicles}
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
        </div>
    );
}
