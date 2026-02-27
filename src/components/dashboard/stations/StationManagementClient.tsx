"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Plus, Search, MapPin, Phone, User,
    Edit2, Trash2, Power, Navigation,
    LayoutGrid, List, AlertCircle, Building2,
    ShieldCheck, ShieldAlert
} from "lucide-react";
import Link from "next/link";
import { ServiceStation, toggleStationStatus, deleteServiceStation } from "@/app/dashboard/stations/actions";
import { StationModal } from "./StationModal";

export default function StationManagementClient({ initialStations }: { initialStations: ServiceStation[] }) {
    const [stations, setStations] = useState(initialStations);
    const [search, setSearch] = useState("");
    const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStation, setEditingStation] = useState<ServiceStation | null>(null);
    const [quickInfoId, setQuickInfoId] = useState<string | null>(null);

    const filteredStations = useMemo(() => {
        const term = search.toLowerCase();
        return stations.filter(s =>
            s.name.toLowerCase().includes(term) ||
            s.address?.toLowerCase().includes(term) ||
            s.code?.toLowerCase().includes(term) ||
            s.sap_store_code?.toLowerCase().includes(term) ||
            s.brand?.toLowerCase().includes(term) ||
            s.segment?.toLowerCase().includes(term) ||
            s.commune?.toLowerCase().includes(term) ||
            s.manager_name?.toLowerCase().includes(term) ||
            s.pos_system?.toLowerCase().includes(term)
        );
    }, [stations, search]);

    const handleToggleStatus = async (id: string, current: boolean) => {
        if (!confirm(`¿Estás seguro de que deseas ${current ? 'desactivar' : 'activar'} esta estación?`)) return;
        try {
            await toggleStationStatus(id, current);
            setStations(prev => prev.map(s =>
                s.id === id ? { ...s, is_active: !current } : s
            ));
        } catch (error) {
            console.error(error);
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("¿Estás seguro de que deseas eliminar esta estación? Esta acción no se puede deshacer.")) return;
        try {
            await deleteServiceStation(id);
            setStations(prev => prev.filter(s => s.id !== id));
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (station: ServiceStation) => {
        setEditingStation(station);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingStation(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-8">
            {/* Controles de Vista */}
            <div className="flex justify-end">
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

            {/* Toolbar: Search & Add */}
            <div className="flex flex-col lg:flex-row gap-4 items-center bg-white/5 p-4 rounded-[2rem] border border-white/10 backdrop-blur-md">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={18} />
                    <input
                        type="text"
                        placeholder="Búsqueda Inteligente: nombre, SAP, jerga, marca, comuna, POS..."
                        className="w-full bg-black/40 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:ring-2 focus:ring-blue-500/20 transition-all text-sm font-medium placeholder:text-slate-600"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>

                <button
                    onClick={handleAdd}
                    className="w-full lg:w-auto bg-blue-600 hover:bg-blue-500 text-white px-8 py-4 rounded-2xl font-black flex items-center justify-center gap-3 transition-all shadow-xl shadow-blue-900/20 active:scale-95 text-sm uppercase tracking-tight group"
                >
                    <Plus className="w-5 h-5 group-hover:rotate-90 transition-transform" strokeWidth={3} />
                    Nueva Estación
                </button>
            </div>

            {/* Contenido Principal con Animaciones */}
            <AnimatePresence mode="wait">
                {viewMode === "grid" ? (
                    <motion.div
                        key="grid"
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
                    >
                        {filteredStations.map((station) => (
                            <div key={station.id} className="bg-white/5 border border-white/10 p-6 rounded-[2.5rem] backdrop-blur-md hover:bg-white/10 transition-all group relative overflow-hidden">
                                {/* Decoración de fondo */}
                                <div className="absolute top-0 right-0 p-6 opacity-[0.03] group-hover:opacity-[0.07] transition-opacity">
                                    <Building2 size={100} />
                                </div>

                                <div className="flex justify-between items-start mb-6">
                                    <div
                                        className="relative group/gps"
                                        onMouseEnter={() => setQuickInfoId(station.id)}
                                        onMouseLeave={() => setQuickInfoId(null)}
                                    >
                                        <div className="w-12 h-12 rounded-2xl bg-black/50 border border-white/10 flex items-center justify-center shadow-inner group-hover/gps:border-blue-500/50 transition-colors cursor-help">
                                            <MapPin className="w-6 h-6 text-slate-500 group-hover/gps:text-blue-400 transition-colors" />
                                        </div>

                                        {/* Popover de Información Rápida */}
                                        <AnimatePresence>
                                            {quickInfoId === station.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, scale: 0.9, y: 10, x: 20 }}
                                                    animate={{ opacity: 1, scale: 1, y: 0, x: 10 }}
                                                    exit={{ opacity: 0, scale: 0.9, y: 10, x: 20 }}
                                                    className="absolute left-full top-0 z-[60] ml-4 w-64 bg-[#0a0a0b] border border-white/10 rounded-3xl p-5 shadow-2xl backdrop-blur-xl"
                                                >
                                                    <div className="space-y-4">
                                                        <div className="flex items-center gap-2 border-b border-white/5 pb-2">
                                                            <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                                                            <span className="text-[10px] font-black uppercase text-slate-400 tracking-widest">Detalles EDS</span>
                                                        </div>

                                                        <div className="grid grid-cols-2 gap-3">
                                                            <div className="space-y-1">
                                                                <p className="text-[8px] font-black text-slate-600 uppercase">Segmento</p>
                                                                <p className="text-[10px] font-bold text-slate-300">{station.segment || 'N/A'}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[8px] font-black text-slate-600 uppercase">Comuna</p>
                                                                <p className="text-[10px] font-bold text-slate-300">{station.commune || 'N/A'}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[8px] font-black text-slate-600 uppercase">Sentido</p>
                                                                <p className="text-[10px] font-bold text-slate-300">{station.direction_sense || 'N/A'}</p>
                                                            </div>
                                                            <div className="space-y-1">
                                                                <p className="text-[8px] font-black text-slate-600 uppercase">Tipo Ubic.</p>
                                                                <p className="text-[10px] font-bold text-blue-400">{station.location_type || 'N/A'}</p>
                                                            </div>
                                                        </div>

                                                        {station.services && (
                                                            <div className="pt-2 border-t border-white/5">
                                                                <p className="text-[8px] font-black text-slate-600 uppercase mb-1.5">Servicios</p>
                                                                <div className="flex flex-wrap gap-1">
                                                                    {station.services.split(',').slice(0, 3).map((s, idx) => (
                                                                        <span key={idx} className="text-[8px] px-1.5 py-0.5 rounded-md bg-white/5 border border-white/5 text-slate-400 font-bold uppercase">
                                                                            {s.trim()}
                                                                        </span>
                                                                    ))}
                                                                </div>
                                                            </div>
                                                        )}
                                                    </div>

                                                    {/* Flechita del popover */}
                                                    <div className="absolute top-5 -left-1 w-2 h-2 bg-[#0a0a0b] border-l border-b border-white/10 rotate-45" />
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => handleEdit(station)}
                                            className="p-2.5 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all bg-white/5"
                                        >
                                            <Edit2 size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleToggleStatus(station.id, station.is_active)}
                                            className={`p-2.5 rounded-xl transition-all bg-white/5 ${station.is_active ? 'text-emerald-500 hover:bg-emerald-500/10' : 'text-amber-500 hover:bg-amber-500/10'}`}
                                        >
                                            <Power size={16} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(station.id)}
                                            className="p-2.5 hover:bg-red-500/10 rounded-xl text-slate-400 hover:text-red-500 transition-all bg-white/5"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </div>
                                </div>

                                <div className="space-y-1 mb-6">
                                    <div className="flex-1 min-w-0">
                                        <Link
                                            href={`/dashboard/stations/${station.id}`}
                                            className="block hover:text-blue-400 transition-colors"
                                        >
                                            <h3 className="text-xl font-black uppercase tracking-tight truncate leading-tight">
                                                {station.name}
                                            </h3>
                                        </Link>
                                        <div className="flex gap-2 items-center mt-1">
                                            {station.code && (
                                                <span className="text-[10px] font-black text-blue-400 bg-blue-500/10 px-2 py-0.5 rounded-md border border-blue-500/20 tracking-wider">
                                                    CÓD: {station.code}
                                                </span>
                                            )}
                                            {station.sap_store_code && (
                                                <span className="text-[10px] font-black text-slate-400 bg-white/5 px-2 py-0.5 rounded-md border border-white/10 tracking-wider">
                                                    SAP: {station.sap_store_code}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1.5 mt-3">
                                        {station.brand && (
                                            <span className="px-2 py-0.5 rounded-md bg-purple-500/10 text-purple-400 text-[9px] font-black uppercase tracking-tighter border border-purple-500/20">
                                                {station.brand}
                                            </span>
                                        )}
                                        {station.segment && (
                                            <span className="px-2 py-0.5 rounded-md bg-amber-500/10 text-amber-400 text-[9px] font-black uppercase tracking-tighter border border-amber-500/20">
                                                {station.segment}
                                            </span>
                                        )}
                                    </div>
                                    <p className="text-xs text-slate-400 font-medium flex items-center gap-1.5 pt-2">
                                        <Navigation className="w-3.5 h-3.5 text-blue-500/50" />
                                        <span className="truncate">{station.address || "Sin dirección"}</span>
                                    </p>
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-6 border-t border-white/5">
                                    <div className="space-y-1">
                                        <p className="text-[9px] uppercase font-black text-slate-600 tracking-widest">Responsable</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center">
                                                <User size={10} className="text-slate-400" />
                                            </div>
                                            <p className="text-[11px] font-bold truncate text-slate-300">{station.manager_name || "N/A"}</p>
                                        </div>
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-[9px] uppercase font-black text-slate-600 tracking-widest">Sistema POS</p>
                                        <div className="flex items-center gap-2">
                                            <div className="w-5 h-5 rounded-md bg-white/5 flex items-center justify-center">
                                                <Navigation size={10} className="text-slate-400" />
                                            </div>
                                            <p className="text-[11px] font-bold truncate text-slate-300">{station.pos_system || "N/A"}</p>
                                        </div>
                                    </div>
                                </div>

                                <div className="mt-6 flex items-center gap-2">
                                    <div className={`w-2 h-2 rounded-full shadow-[0_0_8px] ${station.is_active ? 'bg-emerald-500 shadow-emerald-500/50' : 'bg-amber-500 shadow-amber-500/50'}`} />
                                    <span className={`text-[10px] font-black uppercase tracking-wider ${station.is_active ? 'text-emerald-500' : 'text-amber-500'}`}>
                                        {station.is_active ? 'Operativa' : 'Mantenimiento / Pausa'}
                                    </span>
                                </div>
                            </div>
                        ))}
                    </motion.div>
                ) : (
                    <motion.div
                        key="list"
                        initial={{ opacity: 0, x: 20 }}
                        animate={{ opacity: 1, x: 0 }}
                        exit={{ opacity: 0, x: -20 }}
                        className="bg-white/5 border border-white/10 rounded-[2.5rem] overflow-hidden backdrop-blur-md"
                    >
                        <table className="w-full text-left">
                            <thead className="bg-white/5 text-[10px] font-black uppercase tracking-widest text-slate-500 border-b border-white/5">
                                <tr>
                                    <th className="px-8 py-5">Estación / Identificación</th>
                                    <th className="px-8 py-5">Marca / Segmento</th>
                                    <th className="px-8 py-5">Ubicación / Comuna</th>
                                    <th className="px-8 py-5">Sistema POS</th>
                                    <th className="px-8 py-5">Estado</th>
                                    <th className="px-8 py-5 text-right">Acciones</th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-white/5">
                                {filteredStations.map((station) => (
                                    <tr key={station.id} className="group hover:bg-white/[0.02] transition-colors">
                                        <td className="px-8 py-5">
                                            <div className="flex items-center gap-3 relative group/listgps">
                                                <div
                                                    className="w-10 h-10 rounded-xl bg-blue-500/10 flex items-center justify-center text-blue-400 group-hover/listgps:scale-110 transition-transform cursor-help"
                                                    onMouseEnter={() => setQuickInfoId(station.id + '_list')}
                                                    onMouseLeave={() => setQuickInfoId(null)}
                                                >
                                                    <Building2 size={18} />
                                                </div>

                                                {/* Popover en Lista */}
                                                <AnimatePresence>
                                                    {quickInfoId === (station.id + '_list') && (
                                                        <motion.div
                                                            initial={{ opacity: 0, scale: 0.9, x: -20 }}
                                                            animate={{ opacity: 1, scale: 1, x: 0 }}
                                                            exit={{ opacity: 0, scale: 0.9, x: -20 }}
                                                            className="absolute left-full top-0 z-[60] ml-4 w-60 bg-[#0a0a0b] border border-white/10 rounded-2xl p-4 shadow-2xl backdrop-blur-xl"
                                                        >
                                                            <div className="grid grid-cols-1 gap-2">
                                                                <div className="flex justify-between items-center border-b border-white/5 pb-1 mb-1">
                                                                    <span className="text-[9px] font-black text-blue-400 uppercase">Ficha Técnica</span>
                                                                    <span className="text-[8px] text-slate-500 font-mono">{station.sap_store_id || 'ID: ---'}</span>
                                                                </div>
                                                                <p className="text-[10px] text-slate-400 font-medium">
                                                                    <span className="text-slate-600 mr-1 uppercase font-black text-[8px]">Segmento:</span> {station.segment || 'N/A'}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 font-medium">
                                                                    <span className="text-slate-600 mr-1 uppercase font-black text-[8px]">Comuna:</span> {station.commune || 'N/A'}
                                                                </p>
                                                                <p className="text-[10px] text-slate-400 font-medium">
                                                                    <span className="text-slate-600 mr-1 uppercase font-black text-[8px]">Sentido:</span> {station.direction_sense || 'N/A'}
                                                                </p>
                                                                <div className="pt-1 mt-1 border-t border-white/5">
                                                                    <p className="text-[10px] text-blue-400 font-bold">
                                                                        <span className="text-slate-600 mr-1 uppercase font-black text-[8px]">Ubicación:</span> {station.location_type || 'N/A'}
                                                                    </p>
                                                                </div>
                                                            </div>
                                                            <div className="absolute top-4 -left-1 w-2 h-2 bg-[#0a0a0b] border-l border-b border-white/10 rotate-45" />
                                                        </motion.div>
                                                    )}
                                                </AnimatePresence>

                                                <div className="flex flex-col">
                                                    <Link
                                                        href={`/dashboard/stations/${station.id}`}
                                                        className="text-sm font-black uppercase text-white truncate max-w-[200px] hover:text-blue-400 transition-colors"
                                                    >
                                                        {station.name}
                                                    </Link>
                                                    <div className="flex gap-2 items-center mt-1">
                                                        <span className="text-[9px] font-black text-blue-400/80 uppercase">
                                                            {station.code || 'S-N/A'}
                                                        </span>
                                                        <span className="text-[9px] font-bold text-slate-600 uppercase">
                                                            SAP: {station.sap_store_code || '---'}
                                                        </span>
                                                    </div>
                                                </div>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <div className="flex flex-col gap-1">
                                                <span className="text-[10px] font-black text-purple-400 uppercase tracking-tighter">
                                                    {station.brand || 'SIN MARCA'}
                                                </span>
                                                <span className="text-[9px] font-bold text-slate-500 uppercase">
                                                    {station.segment || 'SIN SEGMENTO'}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-8 py-5">
                                            <p className="text-xs text-slate-300 truncate max-w-[200px] font-medium">{station.address || '---'}</p>
                                            <p className="text-[10px] text-slate-600 font-black uppercase mt-0.5 tracking-widest">{station.commune || 'S/C'}</p>
                                        </td>
                                        <td className="px-8 py-5">
                                            <span className="text-[10px] font-black text-slate-400 uppercase px-2.5 py-1.5 bg-white/5 rounded-xl border border-white/5">
                                                {station.pos_system || '---'}
                                            </span>
                                        </td>
                                        <td className="px-8 py-5">
                                            {station.is_active ? (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 text-emerald-500 text-[9px] font-black uppercase border border-emerald-500/20">
                                                    <ShieldCheck size={12} /> Operativa
                                                </span>
                                            ) : (
                                                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-500/10 text-amber-500 text-[9px] font-black uppercase border border-amber-500/20">
                                                    <ShieldAlert size={12} /> Pausa
                                                </span>
                                            )}
                                        </td>
                                        <td className="px-8 py-5 text-right">
                                            <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                                <button
                                                    onClick={() => handleEdit(station)}
                                                    className="p-2.5 hover:bg-blue-500/10 rounded-xl text-slate-400 hover:text-blue-400 transition-all bg-white/5"
                                                >
                                                    <Edit2 size={14} />
                                                </button>
                                                <button
                                                    onClick={() => handleDelete(station.id)}
                                                    className="p-2.5 hover:bg-red-500/10 rounded-xl text-slate-400 hover:text-red-500 transition-all bg-white/5"
                                                >
                                                    <Trash2 size={14} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Empty State Mejorado */}
            {filteredStations.length === 0 && (
                <div className="py-40 text-center bg-white/[0.02] rounded-[4rem] border-2 border-dashed border-white/5 backdrop-blur-xl">
                    <AlertCircle size={64} className="mx-auto mb-6 text-slate-800" strokeWidth={1} />
                    <h3 className="text-2xl font-black text-slate-500 uppercase tracking-tighter">Sin coincidencias exactas</h3>
                    <p className="text-slate-600 text-sm mt-2 max-w-md mx-auto font-medium lowercase">
                        No hemos encontrado estaciones con el término <span className="text-blue-400 font-black">"{search}"</span>.
                        Intenta buscando por código SAP, marca o comuna.
                    </p>
                </div>
            )}

            {/* Modal de Gestión */}
            {isModalOpen && (
                <StationModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    station={editingStation}
                    onSuccess={(newStation: ServiceStation) => {
                        if (editingStation) {
                            setStations(prev => prev.map(s => s.id === newStation.id ? newStation : s));
                        } else {
                            setStations(prev => [...prev, newStation].sort((a, b) => a.name.localeCompare(b.name)));
                        }
                        setIsModalOpen(false);
                    }}
                />
            )}
        </div>
    );
}
