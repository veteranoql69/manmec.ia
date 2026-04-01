"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { createClient } from "@/lib/supabase/client";

export default function RealtimeSidebarLink({
    href,
    icon,
    label,
    listenTable,
    filterKey,
    filterValue,
    badgeColor = "bg-blue-500",
}: {
    href: string;
    icon: React.ReactNode;
    label: string;
    listenTable?: string;
    filterKey?: string;
    filterValue?: string;
    badgeColor?: string;
}) {
    const [unreadCount, setUnreadCount] = useState(0);
    const pathname = usePathname();

    // Resetear contador cuando el usuario entra en la ruta de la alerta
    useEffect(() => {
        if (pathname?.startsWith(href)) {
            setUnreadCount(0);
        }
    }, [pathname, href]);

    // Suscripción Realtime a Supabase
    useEffect(() => {
        if (!listenTable) return;

        const supabase = createClient();
        
        let filter = undefined;
        if (filterKey && filterValue) {
            filter = `${filterKey}=eq.${filterValue}`;
        }

        const channel = supabase.channel(`sidebar-${listenTable}`)
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: listenTable, filter: filter },
                (payload) => {
                    // Si el usuario no está actualmente en la página de esa alerta, sumar 1
                    if (!window.location.pathname.startsWith(href)) {
                        setUnreadCount((prev) => prev + 1);
                    }
                }
            )
            .subscribe((status) => {
                if(status === "SUBSCRIBED" && process.env.NODE_ENV === "development") {
                    console.log(`🔌 Sidebar escuchando insertos en: ${listenTable}`);
                }
            });

        return () => {
            supabase.removeChannel(channel);
        };
    }, [listenTable, filterKey, filterValue, href]);

    const isActive = pathname === href || (href !== '/dashboard' && pathname?.startsWith(href));

    return (
        <Link
            href={href}
            className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all group relative overflow-hidden ${
                isActive ? "bg-white/10 text-white" : "text-slate-400 hover:text-white hover:bg-white/5"
            }`}
        >
            <div className="flex items-center gap-3 relative z-10 w-full">
                <span className={`transition-transform duration-300 ${isActive ? "scale-110" : "group-hover:scale-110"}`}>
                    {icon}
                </span>
                <span className={`text-sm ${isActive ? "font-bold text-white tracking-wide" : "font-medium"}`}>
                    {label}
                </span>
            </div>
            
            {/* Animación del Badge en vivo */}
            {unreadCount > 0 && (
                <div className={`relative z-10 flex min-w-5 h-5 px-1.5 rounded-full items-center justify-center ${badgeColor} text-white shadow-[0_0_15px_rgba(59,130,246,0.6)] animate-in fade-in zoom-in spin-in-12 duration-300`}>
                    <span className="text-[10px] font-black">{unreadCount > 99 ? '99+' : unreadCount}</span>
                </div>
            )}
            
            {/* Destello de fondo si hay notificaciones */}
             {unreadCount > 0 && (
                 <div className={`absolute -right-4 top-1/2 -translate-y-1/2 w-16 h-16 ${badgeColor} opacity-20 blur-xl animate-pulse`}></div>
             )}
        </Link>
    );
}
