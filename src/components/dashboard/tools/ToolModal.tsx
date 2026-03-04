"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    X, Save, Wrench, User, Truck, Box, Camera, Sparkles, Loader2, Info, Plus, Trash2
} from "lucide-react";
import { Tool, upsertTool, bulkUpsertTools, ToolDistribution, ToolStatus } from "@/app/dashboard/tools/actions";
import { analyzeToolImage } from "@/app/dashboard/tools/vision";
import { ToolScanner } from "./ToolScanner";

function generateToolPrefix(name: string) {
    if (!name) return "";
    const stopWords = ['de', 'la', 'el', 'para', 'con', 'y', 'en', 'un', 'una', 'los', 'las'];
    const words = name.toLowerCase().split(' ').filter(w => w.length > 2 && !stopWords.includes(w));
    if (words.length === 0) return "TOL";
    if (words.length === 1) return words[0].substring(0, 5).toUpperCase();
    return (words[0].substring(0, 3) + words[1].substring(0, 3)).toUpperCase();
}

interface Props {
    isOpen: boolean;
    onClose: () => void;
    tool: Tool | null;
    onSuccess: () => void;
    members: any[];
    vehicles: any[];
    warehouses: any[];
}

export function ToolModal({ isOpen, onClose, tool, onSuccess, members, vehicles, warehouses }: Props) {
    const isEditMode = !!tool;
    const [loading, setLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [showScanner, setShowScanner] = useState(false);

    // Bulk state
    const [quantity, setQuantity] = useState(1);
    const [distributions, setDistributions] = useState<ToolDistribution[]>([
        { quantity: 1, assigned_user_id: null, assigned_vehicle_id: null, assigned_warehouse_id: null }
    ]);

    const [assignmentType, setAssignmentType] = useState<'none' | 'user' | 'vehicle' | 'warehouse'>('none');
    const [formData, setFormData] = useState<Partial<Tool>>({
        name: "",
        serial_number: "",
        brand: "",
        model: "",
        category: "",
        status: "available",
        assigned_user_id: null,
        assigned_vehicle_id: null,
        assigned_warehouse_id: null
    });

    useEffect(() => {
        if (tool) {
            setFormData(tool);
            if (tool.assigned_user_id) setAssignmentType('user');
            else if (tool.assigned_vehicle_id) setAssignmentType('vehicle');
            else if (tool.assigned_warehouse_id) setAssignmentType('warehouse');
            else setAssignmentType('warehouse');
        }
    }, [tool]);

    const uiPrefix = (!formData.serial_number && formData.name) ? `${generateToolPrefix(formData.name)}-AUTO` : "";

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (isEditMode) {
                const dataToSubmit = { ...formData };
                if (assignmentType === 'none') {
                    dataToSubmit.assigned_user_id = null;
                    dataToSubmit.assigned_vehicle_id = null;
                    dataToSubmit.assigned_warehouse_id = null;
                } else if (assignmentType === 'user') {
                    dataToSubmit.assigned_vehicle_id = null;
                    dataToSubmit.assigned_warehouse_id = null;
                } else if (assignmentType === 'vehicle') {
                    dataToSubmit.assigned_user_id = null;
                    dataToSubmit.assigned_warehouse_id = null;
                } else if (assignmentType === 'warehouse') {
                    dataToSubmit.assigned_user_id = null;
                    dataToSubmit.assigned_vehicle_id = null;
                }
                const result = await upsertTool(dataToSubmit);
                if (result.success) {
                    onSuccess();
                    onClose();
                }
            } else {
                let dists = distributions;
                if (quantity === 1) {
                    dists = [{
                        quantity: 1,
                        assigned_user_id: assignmentType === 'user' ? formData.assigned_user_id || null : null,
                        assigned_vehicle_id: assignmentType === 'vehicle' ? formData.assigned_vehicle_id || null : null,
                        assigned_warehouse_id: assignmentType === 'warehouse' ? formData.assigned_warehouse_id || null : null,
                    }];
                } else {
                    const totalDist = distributions.reduce((acc, d) => acc + d.quantity, 0);
                    if (totalDist !== quantity) {
                        alert(`La suma de las distribuciones (${totalDist}) debe ser exactamente igual a la cantidad total (${quantity}).`);
                        setLoading(false);
                        return;
                    }
                    // Validate that all distributions have a destination
                    const missingDest = dists.find(d => !d.assigned_user_id && !d.assigned_vehicle_id && !d.assigned_warehouse_id);
                    if (missingDest) {
                        alert("Todas las filas de distribución deben tener un destino seleccionado.");
                        setLoading(false);
                        return;
                    }
                }

                const autoPrefix = formData.serial_number ? undefined : generateToolPrefix(formData.name || "");
                const result = await bulkUpsertTools(formData, dists, autoPrefix);
                if (result.success) {
                    onSuccess();
                    onClose();
                }
            }
        } catch (error) {
            console.error(error);
            alert("Ocurrió un error al guardar la información.");
        } finally {
            setLoading(false);
        }
    };

    const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setIsAnalyzing(true);
        try {
            const reader = new FileReader();
            reader.readAsDataURL(file);
            reader.onloadend = async () => {
                const base64data = (reader.result as string).split(',')[1];
                const result = await analyzeToolImage(base64data, file.type);

                if (result.success && result.data) {
                    const aiData = result.data;
                    setFormData(prev => ({
                        ...prev,
                        name: aiData.name || prev.name,
                        brand: aiData.brand || prev.brand,
                        model: aiData.model || prev.model,
                        serial_number: aiData.serial_number || prev.serial_number,
                        category: aiData.category || prev.category
                    }));
                } else {
                    alert(result.error || "No se pudo extraer información clara de la imagen.");
                }
                setIsAnalyzing(false);
            };
        } catch (error) {
            console.error(error);
            alert("Error procesando imagen local");
            setIsAnalyzing(false);
        }
    };

    const addDistributionRow = () => {
        setDistributions([...distributions, { quantity: 1, assigned_user_id: null, assigned_vehicle_id: null, assigned_warehouse_id: null }]);
    };

    const removeDistributionRow = (index: number) => {
        setDistributions(distributions.filter((_, i) => i !== index));
    };

    const updateDistribution = (index: number, field: keyof ToolDistribution, value: any) => {
        const newDists = [...distributions];
        if (field === 'assigned_user_id') {
            newDists[index] = { ...newDists[index], assigned_user_id: value, assigned_vehicle_id: null, assigned_warehouse_id: null };
        } else if (field === 'assigned_vehicle_id') {
            newDists[index] = { ...newDists[index], assigned_vehicle_id: value, assigned_user_id: null, assigned_warehouse_id: null };
        } else if (field === 'assigned_warehouse_id') {
            newDists[index] = { ...newDists[index], assigned_warehouse_id: value, assigned_user_id: null, assigned_vehicle_id: null };
        } else {
            newDists[index] = { ...newDists[index], [field]: value };
        }
        setDistributions(newDists);
    };

    const renderDynamicDistribution = () => {
        const totalAssigned = distributions.reduce((acc, d) => acc + d.quantity, 0);
        const isBalanced = totalAssigned === quantity;

        return (
            <div className="space-y-4 p-6 bg-slate-900/50 rounded-3xl border border-indigo-500/30">
                <div className="flex justify-between items-center">
                    <label className="text-[10px] uppercase font-black text-indigo-400 tracking-widest flex items-center gap-2">
                        <Box className="w-3 h-3" /> Distribución Múltiple
                    </label>
                    <span className={`text-xs font-bold px-3 py-1 rounded-full ${isBalanced ? 'bg-green-500/20 text-green-400' : 'bg-red-500/20 text-red-400'}`}>
                        Asignadas: {totalAssigned} de {quantity}
                    </span>
                </div>

                <div className="space-y-3">
                    {distributions.map((dist, idx) => (
                        <div key={idx} className="flex items-center gap-3 bg-black/40 p-3 rounded-2xl border border-white/5">
                            <input
                                type="number"
                                min="1"
                                max={quantity}
                                className="w-20 bg-black border border-white/10 rounded-xl py-3 px-3 text-center focus:ring-2 focus:ring-indigo-500/50"
                                value={dist.quantity}
                                onChange={(e) => updateDistribution(idx, 'quantity', parseInt(e.target.value) || 1)}
                            />
                            <div className="flex-1 flex gap-2">
                                <select
                                    className="flex-1 bg-black border border-white/10 rounded-xl py-3 px-3 text-xs focus:ring-2 focus:ring-indigo-500/50 appearance-none"
                                    value={dist.assigned_warehouse_id ? `W-${dist.assigned_warehouse_id}` : dist.assigned_vehicle_id ? `V-${dist.assigned_vehicle_id}` : dist.assigned_user_id ? `U-${dist.assigned_user_id}` : ""}
                                    onChange={(e) => {
                                        const val = e.target.value;
                                        if (val.startsWith('W-')) updateDistribution(idx, 'assigned_warehouse_id', val.replace('W-', ''));
                                        else if (val.startsWith('V-')) updateDistribution(idx, 'assigned_vehicle_id', val.replace('V-', ''));
                                        else if (val.startsWith('U-')) updateDistribution(idx, 'assigned_user_id', val.replace('U-', ''));
                                    }}
                                >
                                    <option value="" disabled>Seleccionar Destino...</option>
                                    <optgroup label="Bodegas">
                                        {warehouses.map(w => <option key={`W-${w.id}`} value={`W-${w.id}`}>{w.name}</option>)}
                                    </optgroup>
                                    <optgroup label="Vehículos">
                                        {vehicles.map(v => <option key={`V-${v.id}`} value={`V-${v.id}`}>{v.plate} - {v.brand}</option>)}
                                    </optgroup>
                                    <optgroup label="Técnicos">
                                        {members.map(m => <option key={`U-${m.id}`} value={`U-${m.id}`}>{m.full_name}</option>)}
                                    </optgroup>
                                </select>
                            </div>
                            {distributions.length > 1 && (
                                <button type="button" onClick={() => removeDistributionRow(idx)} className="p-3 text-red-400 hover:bg-red-400/10 rounded-xl transition-all">
                                    <Trash2 className="w-4 h-4" />
                                </button>
                            )}
                        </div>
                    ))}
                </div>

                <button
                    type="button"
                    onClick={addDistributionRow}
                    className="w-full py-3 border border-dashed border-indigo-500/30 text-indigo-400 rounded-2xl text-xs font-bold uppercase tracking-widest hover:bg-indigo-500/10 transition-all flex items-center justify-center gap-2"
                >
                    <Plus className="w-4 h-4" /> Añadir otra distribución
                </button>
            </div>
        );
    };

    return (
        <AnimatePresence>
            <div key="modal-backdrop" className="fixed inset-0 z-50 flex items-center justify-center p-4">
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
                    <div className="p-8 md:p-10 max-h-[85vh] overflow-y-auto custom-scrollbar">
                        <div className="flex justify-between items-center mb-10">
                            <div className="flex items-center gap-4">
                                <div className="w-12 h-12 rounded-2xl bg-blue-600/20 flex items-center justify-center text-blue-400 border border-blue-500/20 shadow-lg shadow-blue-500/10">
                                    <Wrench className="w-6 h-6" />
                                </div>
                                <h2 className="text-3xl font-black tracking-tight uppercase">
                                    {tool ? 'Editar Herramienta' : 'Nueva Herramienta'}
                                </h2>
                            </div>
                            <button type="button" onClick={onClose} className="p-3 hover:bg-white/5 rounded-full transition-colors text-slate-500 hover:text-white">
                                <X className="w-6 h-6" />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="space-y-8">
                            {/* Primer Paso: Identificación (Full Width) */}
                            <div className="space-y-4 p-5 bg-indigo-500/5 rounded-3xl border border-indigo-500/10">
                                <label className="text-[10px] uppercase font-black text-indigo-400 tracking-widest ml-1 flex items-center gap-1">
                                    <Sparkles className="w-3 h-3" /> 1. Identificación Inteligente
                                </label>
                                <div className="flex flex-col gap-4">
                                    <div className="flex gap-4">
                                        <div className="relative flex-1 group">
                                            <input
                                                className="w-full bg-black/50 border border-white/10 rounded-2xl py-4 pl-5 pr-14 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/50 font-mono tracking-wider uppercase transition-all placeholder:text-slate-600"
                                                placeholder={uiPrefix || "N° SERIE / CÓDIGO QR"}
                                                value={formData.serial_number}
                                                onChange={e => setFormData({ ...formData, serial_number: e.target.value })}
                                                disabled={isEditMode}
                                            />
                                            <button
                                                type="button"
                                                onClick={() => setShowScanner(true)}
                                                className="absolute right-2 top-1/2 -translate-y-1/2 p-2.5 bg-indigo-600/20 text-indigo-400 rounded-xl hover:bg-indigo-600/40 transition-all border border-indigo-500/30 group-hover:scale-105"
                                                title="Escanear con cámara"
                                            >
                                                <Camera className="w-5 h-5" />
                                            </button>
                                        </div>
                                        {!isEditMode && (
                                            <div className="w-32 relative">
                                                <label className="absolute -top-6 left-2 text-[10px] uppercase font-black text-slate-500 tracking-widest">Cant.</label>
                                                <input
                                                    type="number"
                                                    min="1"
                                                    max="50"
                                                    required
                                                    className="w-full bg-black border border-white/10 rounded-2xl py-4 px-5 text-center text-lg font-bold focus:ring-2 focus:ring-indigo-500/50"
                                                    value={quantity}
                                                    onChange={e => {
                                                        const q = parseInt(e.target.value) || 1;
                                                        setQuantity(q > 50 ? 50 : q);
                                                    }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                    <button
                                        type="button"
                                        onClick={() => document.getElementById('ai-image-upload')?.click()}
                                        disabled={isAnalyzing}
                                        className="bg-indigo-600 hover:bg-indigo-500 text-white rounded-2xl px-6 py-4 flex items-center justify-center gap-2 transition-all font-black text-sm tracking-tight whitespace-nowrap shadow-lg shadow-indigo-500/20 active:scale-95 disabled:opacity-50 w-full"
                                    >
                                        {isAnalyzing ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                                        <span>{isAnalyzing ? "Analizando..." : "Autocompletar con Foto"}</span>
                                    </button>
                                    <input
                                        type="file"
                                        id="ai-image-upload"
                                        accept="image/*"
                                        capture="environment"
                                        className="hidden"
                                        onChange={handleImageUpload}
                                    />
                                </div>
                            </div>

                            {/* Información Básica */}
                            <div className="grid grid-cols-2 gap-6">
                                <div className="space-y-2 col-span-2 sm:col-span-1">
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
                            {quantity > 1 ? renderDynamicDistribution() : (
                                <div className="space-y-4 p-6 bg-white/5 rounded-3xl border border-white/10 border-dashed">
                                    <label className="text-[10px] uppercase font-black text-blue-500 tracking-widest flex items-center gap-2">
                                        <Info className="w-3 h-3" /> Asignación Actual
                                    </label>

                                    <div className="grid grid-cols-3 gap-2">
                                        {[
                                            { id: 'warehouse', label: 'Bodega', icon: Box },
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

                                    {assignmentType === 'warehouse' && (
                                        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="space-y-2 mt-4">
                                            <select
                                                required
                                                className="w-full bg-black border border-white/10 rounded-2xl py-4 px-5 text-sm focus:outline-none font-bold appearance-none cursor-pointer"
                                                value={formData.assigned_warehouse_id || ""}
                                                onChange={e => setFormData({ ...formData, assigned_warehouse_id: e.target.value })}
                                            >
                                                <option value="">Seleccionar Bodega...</option>
                                                {warehouses.map(w => (
                                                    <option key={w.id} value={w.id}>{w.name}</option>
                                                ))}
                                            </select>
                                        </motion.div>
                                    )}
                                </div>
                            )}

                            <button
                                disabled={loading}
                                className="w-full bg-gradient-to-r from-blue-700 to-blue-600 hover:from-blue-600 hover:to-blue-500 disabled:opacity-50 text-white font-black uppercase tracking-widest py-5 rounded-[2rem] flex items-center justify-center gap-3 transition-all shadow-2xl shadow-blue-900/40 active:scale-95 mt-4"
                            >
                                {loading ? (
                                    <div className="w-6 h-6 border-4 border-white/30 border-t-white rounded-full animate-spin" />
                                ) : (
                                    <>
                                        <Save className="w-5 h-5" />
                                        {tool ? 'Actualizar Registro' : `Confirmar Ingreso ${quantity > 1 ? `(${quantity})` : ''}`}
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
