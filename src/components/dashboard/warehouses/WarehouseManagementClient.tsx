"use client";

import { useState, useMemo } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
    Search,
    Plus,
    Warehouse,
    Power,
    Edit3,
    MapPin,
    Navigation,
    Package,
    ArrowRight
} from "lucide-react";
import { Warehouse as WarehouseType, toggleWarehouseStatus } from "@/app/dashboard/warehouses/actions";
import { WarehouseModal } from "./WarehouseModal";
import Link from "next/link";

interface Props {
    initialWarehouses: WarehouseType[];
}

export function WarehouseManagementClient({ initialWarehouses }: Props) {
    const [warehouses, setWarehouses] = useState<WarehouseType[]>(initialWarehouses);
    const [search, setSearch] = useState("");
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [editingWarehouse, setEditingWarehouse] = useState<WarehouseType | null>(null);

    const filteredWarehouses = useMemo(() => {
        return warehouses.filter(w =>
            w.name.toLowerCase().includes(search.toLowerCase()) ||
            w.address?.toLowerCase().includes(search.toLowerCase())
        );
    }, [warehouses, search]);

    const handleToggleStatus = async (id: string, current: boolean) => {
        if (!confirm(`¿Estás seguro de que deseas ${current ? 'desactivar' : 'activar'} esta bodega?`)) return;
        try {
            await toggleWarehouseStatus(id, current);
            setWarehouses(prev => prev.map(w =>
                w.id === id ? { ...w, is_active: !current } : w
            ));
        } catch (error) {
            console.error(error);
        }
    };

    const handleEdit = (warehouse: WarehouseType) => {
        setEditingWarehouse(warehouse);
        setIsModalOpen(true);
    };

    const handleAdd = () => {
        setEditingWarehouse(null);
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
                        placeholder="Buscar por nombre o dirección..."
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
                    Nueva Bodega
                </button>
            </div>

            {/* Grid display */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                <AnimatePresence mode="popLayout">
                    {filteredWarehouses.map((warehouse, i) => (
                        <motion.div
                            key={warehouse.id}
                            layout
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            transition={{ delay: i * 0.05 }}
                            className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md group hover:border-white/20 transition-all relative overflow-hidden"
                        >
                            {/* Status Glow */}
                            <div className={`absolute -right-10 -top-10 w-32 h-32 blur-3xl rounded-full opacity-10 transition-colors ${warehouse.is_active ? 'bg-emerald-500' : 'bg-amber-500'}`} />

                            <div className="flex justify-between items-start mb-6">
                                <div className="w-12 h-12 rounded-2xl bg-black border border-white/10 flex items-center justify-center shadow-inner group-hover:border-blue-500/50 transition-colors">
                                    <Warehouse className="w-6 h-6 text-slate-400 group-hover:text-blue-400 transition-colors" />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(warehouse)}
                                        className="p-2 hover:bg-white/10 rounded-xl text-slate-400 hover:text-white transition-all"
                                    >
                                        <Edit3 className="w-4 h-4" />
                                    </button>
                                    <button
                                        onClick={() => handleToggleStatus(warehouse.id, warehouse.is_active)}
                                        className={`p-2 rounded-xl transition-all ${warehouse.is_active ? 'text-amber-400 hover:bg-amber-400/10' : 'text-emerald-400 hover:bg-emerald-400/10'}`}
                                        title={warehouse.is_active ? "Desactivar" : "Activar"}
                                    >
                                        <Power className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>

                            <div className="space-y-1 mb-4">
                                <h3 className="text-xl font-black tracking-tight uppercase truncate">{warehouse.name}</h3>
                                <p className="text-sm text-slate-400 font-medium flex items-center gap-1">
                                    <Navigation className="w-3 h-3" />
                                    <span className="truncate">{warehouse.address || "Sin dirección"}</span>
                                </p>
                            </div>

                            <div className="mt-6 flex flex-col gap-3">
                                <Link
                                    href={`/dashboard/inventory?warehouse=${warehouse.id}`}
                                    className="flex items-center justify-between p-3 rounded-2xl bg-white/5 hover:bg-white/10 border border-white/5 transition-all text-xs font-bold"
                                >
                                    <div className="flex items-center gap-2 text-slate-400">
                                        <Package className="w-4 h-4" />
                                        Ver Inventario
                                    </div>
                                    <ArrowRight className="w-4 h-4 text-blue-500" />
                                </Link>

                                <span className={`inline-flex self-start items-center px-2 py-0.5 rounded-md text-[10px] font-black uppercase ${warehouse.is_active ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'}`}>
                                    {warehouse.is_active ? 'Activa' : 'Inactiva'}
                                </span>
                            </div>
                        </motion.div>
                    ))}
                </AnimatePresence>
            </div>

            {/* Empty State */}
            {filteredWarehouses.length === 0 && (
                <div className="py-20 text-center bg-white/5 rounded-[3rem] border border-dashed border-white/10">
                    <Warehouse className="w-16 h-16 mx-auto mb-4 text-slate-700 opacity-20" />
                    <h3 className="text-xl font-bold text-slate-500">No se encontraron bodegas</h3>
                    <p className="text-slate-600 text-sm mt-1">Intenta con otra búsqueda o registra una nueva.</p>
                </div>
            )}

            {isModalOpen && (
                <WarehouseModal
                    isOpen={isModalOpen}
                    onClose={() => setIsModalOpen(false)}
                    warehouse={editingWarehouse}
                    onSuccess={(newWarehouse: WarehouseType) => {
                        if (editingWarehouse) {
                            setWarehouses(prev => prev.map(w => w.id === newWarehouse.id ? newWarehouse : w));
                        } else {
                            setWarehouses(prev => [...prev, newWarehouse].sort((a, b) => a.name.localeCompare(b.name)));
                        }
                    }}
                />
            )}
        </div>
    );
}
