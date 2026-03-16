"use client";

import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Menu, 
    X, 
    BrainCircuit, 
    LayoutDashboard, 
    ClipboardList, 
    Wrench, 
    Box, 
    Warehouse, 
    Truck, 
    Users, 
    PackageSearch,
    Settings,
    LogOut
} from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { ManmecUserProfile } from "@/lib/auth";

interface MobileNavbarProps {
    profile: ManmecUserProfile;
}

export default function MobileNavbar({ profile }: MobileNavbarProps) {
    const [isOpen, setIsOpen] = useState(false);
    const pathname = usePathname();

    // Cerrar el menú cuando cambia la ruta
    useEffect(() => {
        setIsOpen(false);
    }, [pathname]);

    // Bloquear scroll cuando el menú está abierto
    useEffect(() => {
        if (isOpen) {
            document.body.style.overflow = "hidden";
        } else {
            document.body.style.overflow = "unset";
        }
    }, [isOpen]);

    const menuItems = [
        { href: "/dashboard", icon: <LayoutDashboard size={20} />, label: "Dashboard" },
        { href: "/dashboard/ots", icon: <ClipboardList size={20} />, label: "Tareas / OTs" },
        { href: "/dashboard/tools", icon: <Wrench size={20} />, label: "Herramientas", category: "Activos" },
        { href: "/dashboard/inventory", icon: <Box size={20} />, label: "Insumos / Stock" },
    ];

    if (profile.role !== "MECHANIC") {
        menuItems.push(
            { href: "/dashboard/warehouses", icon: <Warehouse size={20} />, label: "Bodegas" },
            { href: "/dashboard/shipments/new", icon: <PackageSearch size={20} />, label: "Recibir Carga" },
            { href: "/dashboard/fleet", icon: <Truck size={20} />, label: "Flota / Vehículos" },
            { href: "/dashboard/stations", icon: <LayoutDashboard size={20} />, label: "Estaciones", category: "Config" },
            { href: "/dashboard/team", icon: <Users size={20} />, label: "Equipo" }
        );
    }

    return (
        <>
            <header className="md:hidden p-4 border-b border-white/5 flex justify-between items-center bg-black/60 backdrop-blur-xl sticky top-0 z-50">
                <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                        <BrainCircuit className="w-5 h-5 text-white" />
                    </div>
                    <span className="font-bold tracking-tight text-white">Manmec <span className="text-blue-500">IA</span></span>
                </div>
                
                <button 
                    onClick={() => setIsOpen(true)}
                    className="p-2 text-slate-300 hover:text-white transition-colors bg-white/5 rounded-lg border border-white/10"
                >
                    <Menu size={24} />
                </button>
            </header>

            <AnimatePresence>
                {isOpen && (
                    <>
                        {/* Overlay */}
                        <motion.div 
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            onClick={() => setIsOpen(false)}
                            className="fixed inset-0 bg-black/80 backdrop-blur-sm z-[60] md:hidden"
                        />

                        {/* Drawer */}
                        <motion.div 
                            initial={{ x: "100%" }}
                            animate={{ x: 0 }}
                            exit={{ x: "100%" }}
                            transition={{ type: "spring", damping: 25, stiffness: 200 }}
                            className="fixed inset-y-0 right-0 w-[280px] bg-[#0A0A0A] border-l border-white/10 z-[70] shadow-2xl md:hidden flex flex-col"
                        >
                            <div className="p-6 flex justify-between items-center border-b border-white/5">
                                <span className="text-sm font-black uppercase tracking-widest text-slate-500">Menú</span>
                                <button 
                                    onClick={() => setIsOpen(false)}
                                    className="p-2 text-slate-400 hover:text-white transition-colors"
                                >
                                    <X size={20} />
                                </button>
                            </div>

                            <nav className="flex-1 overflow-y-auto p-4 space-y-2">
                                {menuItems.map((item, i) => (
                                    <div key={item.href}>
                                        {item.category && (
                                            <p className="px-4 pt-4 pb-2 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-600">
                                                {item.category}
                                            </p>
                                        )}
                                        <Link
                                            href={item.href}
                                            className={`flex items-center gap-4 px-4 py-4 rounded-2xl transition-all ${
                                                pathname === item.href 
                                                ? "bg-blue-500/10 border border-blue-500/20 text-blue-400" 
                                                : "text-slate-400 hover:text-white hover:bg-white/5 border border-transparent"
                                            }`}
                                        >
                                            <span className={pathname === item.href ? "text-blue-400" : "text-slate-500"}>
                                                {item.icon}
                                            </span>
                                            <span className="text-base font-bold">{item.label}</span>
                                        </Link>
                                    </div>
                                ))}
                            </nav>

                            <div className="p-6 border-t border-white/5 bg-white/[0.02]">
                                <div className="flex items-center gap-3 mb-6 p-1">
                                    <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 border border-white/10 flex items-center justify-center text-xs font-black">
                                        {profile.full_name?.charAt(0)}
                                    </div>
                                    <div className="flex-1 overflow-hidden">
                                        <p className="text-sm font-black text-white truncate">{profile.full_name}</p>
                                        <p className="text-[10px] text-slate-500 uppercase font-mono tracking-tighter">{profile.role}</p>
                                    </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3">
                                    <Link 
                                        href="/dashboard/settings" 
                                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-white/5 border border-white/10 text-slate-300 text-xs font-bold"
                                    >
                                        <Settings size={16} /> Perfil
                                    </Link>
                                    <Link 
                                        href="/logout" 
                                        className="flex items-center justify-center gap-2 p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-400 text-xs font-bold"
                                    >
                                        <LogOut size={16} /> Salir
                                    </Link>
                                </div>
                            </div>
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </>
    );
}
