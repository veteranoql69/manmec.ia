"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X,
    Save,
    Wrench,
    Hash,
    Tag,
    Info,
    User,
    Truck,
    Box,
    AlertTriangle,
    Camera
} from "lucide-react";
import { Tool, upsertTool, ToolStatus } from "@/app/dashboard/tools/actions";
import { ToolScanner } from "./ToolScanner";

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tool: Tool | null;
    onSuccess: () => void;
    members: any[];
    vehicles: any[];
}

export function ToolModal({ isOpen, onClose, tool, onSuccess, members, vehicles }: Props) {
    const [loading, setLoading] = useState(false);
    const [showScanner, setShowScanner] = useState(false);
    const [assignmentType, setAssignmentType] = useState<'none' | 'user' | 'vehicle'>('none');
    const [formData, setFormData] = useState<Partial<Tool>>({
        name: "",
        serial_number: "",
        brand: "",
        model: "",
        category: "",
        status: "available",
        assigned_user_id: null,
        assigned_vehicle_id: null
    });

    useEffect(() => {
        if (tool) {
            setFormData(tool);
            if (tool.assigned_user_id) setAssignmentType('user');
            else if (tool.assigned_vehicle_id) setAssignmentType('vehicle');
            else setAssignmentType('none');
        }
    }, [tool]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        const dataToSubmit = { ...formData };
        if (assignmentType === 'none') {
            dataToSubmit.assigned_user_id = null;
            dataToSubmit.assigned_vehicle_id = null;
        } else if (assignmentType === 'user') {
            dataToSubmit.assigned_vehicle_id = null;
        } else {
            dataToSubmit.assigned_user_id = null;
        }

        try {
            const result = await upsertTool(dataToSubmit);
            if (result.success) {
                onSuccess();
                onClose();
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    return (
        <AnimatePresence>
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    onClick={onClose}
                    className="absolute inset-0 bg-black/90 backdrop-blur-md"
                />

                <motion.div
                    initial={{ opacity: 0, scale: 0.95, y: 20 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95, y: 20 }}
                    className="relative w-full max-w-xl bg-[#0a0a0a] border border-white/10 rounded-[3rem] shadow-2xl overflow-hidden"
                >
                    <div className="p-8 md:p-10 max-h-[90vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/10">
                                    <Wrench className="w-6 h-6" />
                                </div>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    {tool ? 'Editar Herramienta' : 'Nueva Herramienta'}
                                </h2>
                            </div>
                            <button onClick={onClose} className="p-3 hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Información Básica */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-2">
                                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Nombre de Herramienta</label>
                                    <input
                                        required
                                        className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-bold"
                                        placeholder="Ej: Multímetro Digital Fluke"
                                        value={formData.name}
                                        onChange={e => setFormData({ ...formData, name: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1 flex items-center gap-1">
                                        <Hash className="w-3 h-3" /> N° de Serie
                                    </label>
                                    <div className="relative group">
                                        <input
                                            required
                                            className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-mono tracking-wider uppercase transition-all"
                                            placeholder="SN-123456"
                                            value={formData.serial_number}
                                            onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                                        />
                                        <button
                                            type="button"
                                            onClick={() => setShowScanner(true)}
                                            className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-blue-600/20 text-blue-400 rounded-xl hover:bg-blue-600/40 transition-all border border-blue-500/30 group-hover:scale-105"
                                            title="Escanear con cámara"
                                        >
                                            <Camera className="w-5 h-5" />
                                        </button>
                                    </div>
                                </div>
                                <div className="space-y-2 col-span-2 sm:col-span-1">
                                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Estado</label>
                                    <select
                                        className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 font-bold appearance-none cursor-pointer"
                                        value={formData.status}
                                        onChange={e => setFormData({ ...formData, status: e.target.value as ToolStatus })}
                                    >
                                        <option value="available">Disponible</option>
                                        <option value="in_use">En Uso</option>
                                        <option value="repair">En Reparación</option>
                                        <option value="lost">Extraviada</option>
                                        <option value="retired">Baja</option>
                                    </select>
                                </div>
                            </div>

                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Marca</label>
                                    <input
                                        className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="Ej: Bosch"
                                        value={formData.brand || ""}
                                        onChange={e => setFormData({ ...formData, brand: e.target.value })}
                                    />
                                </div>
                                <div className="space-y-2">
                                    <label className="text-[10px] uppercase font-black text-slate-500 tracking-widest ml-1">Modelo</label>
                                    <input
                                        className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                                        placeholder="Ej: GSB 18V-55"
                                        value={formData.model || ""}
                                        onChange={e => setFormData({ ...formData, model: e.target.value })}
                                    />
                                </div>
                            </div>

                            {/* Sección de Asignación */}
                            <div className="space-y-4 p-6 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                                <label className="text-[10px] uppercase font-black text-blue-500 tracking-widest flex items-center gap-2">
                                    <Info className="w-3 h-3" /> Asignación Actual
                                </label>

                                <div className="grid grid-cols-3 gap-2">
                                    {[
                                        { id: 'none', label: 'Libre', icon: Box },
                                        { id: 'user', label: 'Técnico', icon: User },
                                        { id: 'vehicle', label: 'Vehículo', icon: Truck }
                                    ].map(type => {
                                        const Icon = type.icon;
                                        const active = assignmentType === type.id;
                                        return (
                                            <button
                                                key={type.id}
                                                type="button"
                                                onClick={() => setAssignmentType(type.id as any)}
                                                className={`flex flex-col items-center gap-2 p-3 rounded-2xl border transition-all ${active ? 'bg-blue-600 border-blue-500 text-white shadow-lg shadow-blue-500/20' : 'bg-black border-white/10 text-slate-500 hover:border-white/20'}`}
                                            >
                                                <Icon className="w-5 h-5" />
                                                <span className="text-[10px] font-black uppercase">{type.label}</span>
                                            </button>
                                        );
                                    })}
                                </div>

                                {assignmentType === 'user' && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 mt-4">
                                        <select
                                            required
                                            className="w-full bg-black border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none font-bold appearance-none cursor-pointer"
                                            value={formData.assigned_user_id || ""}
                                            onChange={e => setFormData({ ...formData, assigned_user_id: e.target.value })}
                                        >
                                            <option value="">Seleccionar Mecánico...</option>
                                            {members.map(m => (
                                                <option key={m.id} value={m.id}>{m.full_name}</option>
                                            ))}
                                        </select>
                                    </motion.div>
                                )}

                                {assignmentType === 'vehicle' && (
                                    <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 mt-4">
                                        <select
                                            required
                                            className="w-full bg-black border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none font-bold appearance-none cursor-pointer"
                                            value={formData.assigned_vehicle_id || ""}
                                            onChange={e => setFormData({ ...formData, assigned_vehicle_id: e.target.value })}
                                        >
                                            <option value="">Seleccionar Vehículo...</option>
                                            {vehicles.map(v => (
                                                <option key={v.id} value={v.id}>{v.plate} - {v.brand} {v.model}</option>
                                            ))}
                                        </select>
                                    </motion.div>
                                )}
                            </div>

                            <button
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 disabled:opacity-50 text-white font-black uppercase tracking-widest py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all shadow-2xl shadow-blue-900/40 active:scale-95 mt-4"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        {tool ? 'Actualizar Registro' : 'Confirmar Ingreso'}
                                    </>
                                )}
                            </button>
                        </form>
                    </div>
                </motion.div>
            </div>
            {showScanner && (
                <ToolScanner
                    onScan={(code) => setFormData({ ...formData, serial_number: code })}
                    onClose={() => setShowScanner(false)}
                />
            )}
        </AnimatePresence>
    );
}
