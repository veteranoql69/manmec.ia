"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Plus,
    Truck,
    Settings2,
    ChevronRight,
    Power,
    Edit3,
    Hash,
    Calendar,
    Gauge
} from "lucide-react";
import { Vehicle, toggleVehicleStatus } from "@/app/dashboard/fleet/actions";
import { VehicleModal } from "./VehicleModal";

interface Props {
    initialVehicles: Vehicle[];
}

export function FleetManagementClient({ initialVehicles }: Props) {
    const [vehicles, setVehicles] = useState<Vehicle[]>(initialVehicles);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

    const filteredVehicles = useMemo(() => {
        return vehicles.filter(v =>
            v.plate.toLowerCase().includes(search.toLowerCase()) ||
            v.brand?.toLowerCase().includes(search.toLowerCase()) ||
            v.model?.toLowerCase().includes(search.toLowerCase())
        );
    }, [vehicles, search]);

    const handleToggleStatus = async (id: string, current: boolean) => {
        try {
            await toggleVehicleStatus(id, current);
            setVehicles(prev => prev.map(v =>
                v.id === id ? { ...v, is_active: !current } : v
            ));
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (vehicle: Vehicle) => {
        setEditingVehicle(vehicle);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingVehicle(null);
        setIsModalOpen(true);
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-center bg-white/5 p-4 rounded-3xl border border-white/10 backdrop-blur-md">
                <div className="relative w-full md:w-96">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input
                        type="text"
                        placeholder="Buscar por patente, marca o modelo..."
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
                    Registrar Vehículo
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredVehicles.map((vehicle, i) => (
                        <motion.div
                            key={vehicle.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md group hover:border-white/20 transition-all relative overflow-hidden"
                        >
                            {/* Glow Effect */}
                            <div className={`absolute -right-10 -top-10 w-32 h-32 blur-3xl rounded-full opacity-10 transition-colors ${vehicle.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />

                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-inner group-hover:border-blue-500/50 transition-colors">
                                    <Truck className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(vehicle)}
                                        className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleToggleStatus(vehicle.id, vehicle.is_active)}
                                        className={`p-2 rounded-xl transition-all ${vehicle.is_active ? 'text-red-400 hover:bg-red-400/10' : 'text-emerald-400 hover:bg-emerald-400/10'}`}
                                    >
                                        <Power className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1 mb-4">
                                <h3 className="text-2xl font-black tracking-tighter uppercase">{vehicle.plate}</h3>
                                <p className="text-sm text-slate-400 font-medium">
                                    {vehicle.brand} {vehicle.model}
                                    {vehicle.year && <span className="ml-2 opacity-50">• {vehicle.year}</span>}
                                </p>
                            </div>

                            <div className="grid grid-cols-2 gap-3 pt-4 border-t border-white/5">
                                <div className="space-y-1">
                                    <p className="text-[10px] uppercase font-bold text-slate-600 tracking-widest flex items-center gap-1">
                                        <Gauge className="w-3 h-3" /> Kilometraje
                                    </p>
                                    <p className="text-sm font-bold">{Number(vehicle.last_mileage).toLocaleString()} km</p>
                                </div>
                                <div className="space-y-1 text-right">
                                    <p className="text-[10px] uppercase font-bold text-slate-600 tracking-widest flex items-center gap-1 justify-end">
                                        Estado
                                    </p>
                                    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${vehicle.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                        {vehicle.is_active ? 'Operativo' : 'Inactivo'}
                                    </span>
                                </div>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {filteredVehicles.length === 0 && (
                <div className="py-20 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                    <Truck className="w-16 h-16 mx-auto mb-4 text-slate-700 opacity-20" />
                    <h3 className="text-xl font-bold text-slate-500">No se encontraron vehículos</h3>
                    <p className="text-slate-600 text-sm mt-1">Intenta con otra búsqueda o registra uno nuevo.</p>
                </div>
            )}

            {isModalOpen && (
                <VehicleModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    vehicle={editingVehicle}
                    onSuccess={(newVehicle) => {
                        if (editingVehicle) {
                            setVehicles(prev => prev.map(v => v.id === newVehicle.id ? newVehicle : v));
                        } else {
                            setVehicles(prev => [...prev, newVehicle].sort((a, b) => a.plate.localeCompare(b.plate)));
                        }
                    }}
                />
            )}
        </div>
    );
}
