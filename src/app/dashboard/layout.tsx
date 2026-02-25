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
    Users
} from "lucide-react";

export default async function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const profile = await requireAuth();

    return (
        <div className="flex min-h-screen bg-[#050505] text-slate-200">
            {/* Sidebar */}
            <aside className="w-64 border-r border-white/5 bg-black/20 backdrop-blur-xl hidden md:flex flex-col sticky top-0 h-screen">
                <div className="p-6">
                    <div className="flex items-center gap-2 mb-8">
                        <div className="w-8 h-8 rounded-lg bg-blue-500 flex items-center justify-center">
                            <BrainCircuit className="w-5 h-5 text-white" />
                        </div>
                        <span className="font-bold text-xl tracking-tight">Manmec <span className="text-blue-500 text-xs">IA</span></span>
                    </div>

                    <nav className="space-y-1">
                        <SidebarLink href="/dashboard" icon={<LayoutDashboard size={20} />} label="Dashboard" />
                        <SidebarLink href="/dashboard/ots" icon={<ClipboardList size={20} />} label="Tareas / OTs" />

                        <div className="pt-4 pb-2 px-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Gestión de Activos</p>
                        </div>
                        <SidebarLink href="/dashboard/tools" icon={<Wrench size={20} />} label="Herramientas" />
                        <SidebarLink href="/dashboard/inventory" icon={<Box size={20} />} label="Insumos / Stock" />
                        <SidebarLink href="/dashboard/shipments/new" icon={<PackageSearch size={20} />} label="Recibir Carga" />
                        <SidebarLink href="/dashboard/fleet" icon={<Truck size={20} />} label="Flota / Vehículos" />

                        <div className="pt-4 pb-2 px-4">
                            <p className="text-[10px] font-bold uppercase tracking-widest text-slate-500">Configuración Base</p>
                        </div>
                        <SidebarLink href="/dashboard/stations" icon={<LayoutDashboard size={20} />} label="Estaciones de Servicio" />
                        <SidebarLink href="/dashboard/team" icon={<Users size={20} />} label="Equipo de trabajo" />
                    </nav>
                </div>

                <div className="mt-auto p-6 space-y-4">
                    <SidebarLink href="/dashboard/settings" icon={<Settings size={20} />} label="Configuración" />

                    {/* Perfil Mini */}
                    <div className="flex items-center gap-3 p-3 rounded-xl bg-white/5 border border-white/5">
                        <div className="w-8 h-8 rounded-full bg-slate-700" />
                        <div className="flex-1 overflow-hidden">
                            <p className="text-xs font-bold truncate">{profile.full_name}</p>
                            <p className="text-[10px] text-slate-500 uppercase font-mono">{profile.role}</p>
                        </div>
                        <Link href="/api/auth/signout" className="text-slate-500 hover:text-white transition-colors">
                            <LogOut size={16} />
                        </Link>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col">
                {/* Mobile Header (Hidden on Desktop) */}
                <header className="md:hidden p-4 border-b border-white/5 flex justify-between items-center bg-black/40 backdrop-blur-md sticky top-0 z-50">
                    <div className="flex items-center gap-2">
                        <BrainCircuit className="w-6 h-6 text-blue-500" />
                        <span className="font-bold">Manmec IA</span>
                    </div>
                    {/* Hamburger placeholder */}
                    <button className="p-2 text-slate-400">
                        <Settings size={20} />
                    </button>
                </header>

                <main className="flex-1">
                    {children}
                </main>
            </div>
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
