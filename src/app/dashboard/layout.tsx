import { requireAuth } from "@/lib/auth";
import Link from "next/link";
import {
    LayoutDashboard,
    ClipboardList,
    Truck,
    Wrench,
    Box,
    LogOut,
    BrainCircuit,
    Settings,
    PackageSearch,
    Users,
    Warehouse
} from "lucide-react";
import AiChatWidget from "@/components/dashboard/AiChatWidget";
import MobileNavbar from "@/components/dashboard/MobileNavbar";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const profile = await requireAuth();

    return (
        <div className="flex min-h-screen bg-[#050505] text-slate-200">
            {/* Sidebar (Desktop Only) */}
            <aside className="w-64 border-r border-white/5 bg-black/20 backdrop-blur-xl hidden md:flex flex-col sticky top-0 h-screen">
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                            <BrainCircuit className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight text-white">Manmec <span className="text-blue-500 text-xs text-blue-500">IA</span></span>
                    </div>

                    <nav className="space-y-1">
                        <SidebarLink href="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
                        <SidebarLink href="/dashboard/ots" icon={<ClipboardList size={20} />} label="Tareas / OTs" />

                        <div className="pt-4 pb-2 px-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Gestión de Activos</p>
                        </div>
                        <SidebarLink href="/dashboard/tools" icon={<Wrench size={20} />} label="Herramientas" />
                        <SidebarLink href="/dashboard/inventory" icon={<Box size={20} />} label="Insumos / Stock" />
                        {profile.role !== "MECHANIC" && (
                            <>
                                <SidebarLink href="/dashboard/warehouses" icon={<Warehouse size={20} />} label="Bodegas" />
                                <SidebarLink href="/dashboard/shipments/new" icon={<PackageSearch size={20} />} label="Recibir Carga" />
                                <SidebarLink href="/dashboard/fleet" icon={<Truck size={20} />} label="Flota / Vehículos" />

                                <div className="pt-4 pb-2 px-4">
                                    <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Configuración Base</p>
                                </div>
                                <SidebarLink href="/dashboard/ai-logs" icon={<BrainCircuit size={20} className="text-blue-400" />} label="Logs IA (Beta)" />
                                <SidebarLink href="/dashboard/settings/ai" icon={<BrainCircuit size={20} />} label="Asistente IA" />
                                <SidebarLink href="/dashboard/stations" icon={<LayoutDashboard size={20} />} label="Estaciones de Servicio" />
                                <SidebarLink href="/dashboard/team" icon={<Users size={20} />} label="Equipo de trabajo" />
                            </>
                        )}
                    </nav>
                </div>

                <div className="mt-auto p-6 space-y-4">
                    {profile.role === "COMPANY_ADMIN" && (
                        <SidebarLink href="/dashboard/settings" icon={<Settings size={20} />} label="Configuración" />
                    )}

                    {/* Perfil Mini */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-slate-700 to-slate-800 flex items-center justify-center text-[10px] font-black">
                            {profile.full_name?.charAt(0)}
                        </div>
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-bold truncate">{profile.full_name}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-mono">{profile.role}</p>
                        </div>
                        <Link href="/logout" className="text-slate-500 hover:text-white transition-colors">
                            <LogOut size={16} />
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col min-w-0">
                {/* Navigation Móvil */}
                <MobileNavbar profile={profile} />

                <main className="flex-1 p-4 md:p-8">
                    {children}
                </main>
            </div>

            {/* Asistente IA Flotante */}
            <AiChatWidget />
        </div>
    );
}

function SidebarLink({ href, icon, label }: { href: string; icon: React.ReactNode; label: string }) {
    return (
        <Link
            href={href}
            className="flex items-center gap-3 px-4 py-3 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all group"
        >
            <span className="group-hover:scale-110 transition-transform">{icon}</span>
            <span className="text-sm font-medium">{label}</span>
        </Link>
    );
}
