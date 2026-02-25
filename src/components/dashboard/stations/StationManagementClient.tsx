"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Plus,
    MapPin,
    Power,
    Edit3,
    Phone,
    User,
    Navigation,
    MoreVertical,
    Trash2
} from "lucide-react";
import { ServiceStation, toggleStationStatus, deleteServiceStation } from "@/app/dashboard/stations/actions";
import { StationModal } from "./StationModal";

interface Props {
    initialStations: ServiceStation[];
}

export function StationManagementClient({ initialStations }: Props) {
    const [stations, setStations] = useState<ServiceStation[]>(initialStations);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingStation, setEditingStation] = useState<ServiceStation | null>(null);

    const filteredStations = useMemo(() => {
        return stations.filter(s =>
            s.name.toLowerCase().includes(search.toLowerCase()) ||
            s.address?.toLowerCase().includes(search.toLowerCase()) ||
            s.contact_name?.toLowerCase().includes(search.toLowerCase())
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
        <div className="space-y-6">
            {/* Search & Add Bar */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar por nombre, dirección o contacto..."
                        className="w-full bg-black/50 border border-white/10 rounded-2xl py-3 pl-12 pr-4 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500/50 transition-all"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
                <button
                    onClick={handleAdd}
                    className="w-full md:w-auto bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center justify-center gap-2 transition-all shadow-xl shadow-blue-900/20 active:scale-95 text-sm"
                >
                    <Plus className="w-4 h-4" />
                    Nueva Estación
                </button>
            </div>

            {/* Grid display */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredStations.map((station, i) => (
                        <motion.div
                            key={station.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md group hover:border-white/20 transition-all relative overflow-hidden"
                        >
                            {/* Status Glow */}
                            <div className={`absolute -right-10 -top-10 w-32 h-32 blur-3xl rounded-full opacity-10 transition-colors ${station.is_active ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-inner group-hover:border-blue-500/50 transition-colors">
                                    <MapPin className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(station)}
                                        className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleToggleStatus(station.id, station.is_active)}
                                        className={`p-2 rounded-xl transition-all ${station.is_active ? 'text-amber-400 hover:bg-amber-400/10' : 'text-emerald-400 hover:bg-emerald-400/10'}`}
                                        title={station.is_active ? "Desactivar" : "Activar"}
                                    >
                                        <Power className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(station.id)}
                                        className="p-2 hover:bg-red-400/10 rounded-xl text-slate-400 hover:text-red-400 transition-all"
                                    >
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1 mb-4">
                                <h3 className="text-xl font-black tracking-tight uppercase truncate">{station.name}</h3>
                                <p className="text-sm text-slate-400 font-medium flex items-center gap-1">
                                    <Navigation className="w-3 h-3" />
                                    <span className="truncate">{station.address || "Sin dirección"}</span>
                                </p>
                            </div>

                            <div className="grid grid-cols-1 gap-3 pt-4 border-t border-white/5">
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
                                        <User className="w-3.5 h-3.5 text-slate-500" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[10px] uppercase font-bold text-slate-600 tracking-widest">Contacto</p>
                                        <p className="text-xs font-bold truncate">{station.contact_name || "N/A"}</p>
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <div className="w-7 h-7 rounded-lg bg-white/5 flex items-center justify-center">
                                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-[10px] uppercase font-bold text-slate-600 tracking-widest">Teléfono</p>
                                        <p className="text-xs font-bold truncate">{station.contact_phone || "N/A"}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-4 flex justify-between items-center">
                                <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${station.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                    {station.is_active ? 'Activa' : 'Inactiva'}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Empty State */}
            {filteredStations.length === 0 && (
                <div className="py-20 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                    <MapPin className="w-16 h-16 mx-auto mb-4 text-slate-700 opacity-20" />
                    <h3 className="text-xl font-bold text-slate-500">No se encontraron estaciones</h3>
                    <p className="text-slate-600 text-sm mt-1">Intenta con otra búsqueda o registra una nueva.</p>
                </div>
            )}

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
                    }}
                />
            )}
        </div>
    );
}
