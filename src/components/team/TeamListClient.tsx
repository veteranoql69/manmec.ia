"use client";

import { useState } from "react";
import {
    Users,
    ShieldCheck,
    ShieldAlert,
    User,
    MoreVertical,
    ArrowUpCircle,
    Check,
    Loader2,
    Mail,
    Phone
} from "lucide-react";
import { ManmecUserRole } from "@/generated/prisma";
import { updateUserRole } from "./actions";

interface TeamMember {
    id: string;
    full_name: string;
    role: ManmecUserRole | null;
    avatar_url?: string | null;
    phone?: string | null;
    onboarding_status: string;
}

export function TeamListClient({
    initialMembers,
    currentUserRole
}: {
    initialMembers: any[],
    currentUserRole: ManmecUserRole
}) {
    const [members, setMembers] = useState<TeamMember[]>(initialMembers);
    const [updatingId, setUpdatingId] = useState<string | null>(null);

    const canManage = currentUserRole === "COMPANY_ADMIN" || currentUserRole === "MANAGER";

    const handlePromote = async (userId: string, newRole: ManmecUserRole) => {
        setUpdatingId(userId);
        try {
            const res = await updateUserRole(userId, newRole);
            if (res.success) {
                setMembers(members.map(m => m.id === userId ? { ...m, role: newRole } : m));
            }
        } catch (error) {
            console.error(error);
            alert("Error al actualizar el rol");
        } finally {
            setUpdatingId(null);
        }
    };

    return (
        <div className="space-y-6">
            <header className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-400 to-purple-500 bg-clip-text text-transparent">
                        Equipo de Trabajo
                    </h1>
                    <p className="text-slate-500">Gestiona los permisos y roles de tu equipo.</p>
                </div>
                <div className="bg-white/5 border border-white/10 px-4 py-2 rounded-2xl flex items-center gap-2">
                    <Users className="text-indigo-400 w-5 h-5" />
                    <span className="font-bold">{members.length} miembros</span>
                </div>
            </header>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {members.map((member) => (
                    <div key={member.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md hover:bg-white/10 transition-all group relative overflow-hidden">

                        {/* Status Badge */}
                        <div className="flex justify-between items-start mb-6">
                            <div className="flex items-center gap-3">
                                <div className="w-12 h-12 rounded-2xl bg-indigo-500/10 flex items-center justify-center border border-indigo-500/20">
                                    <User className="text-indigo-400" />
                                </div>
                                <div className="overflow-hidden">
                                    <h3 className="font-bold text-white truncate">{member.full_name}</h3>
                                    <p className="text-[10px] uppercase font-mono tracking-widest text-slate-500">
                                        {member.role || "Sin Rol"}
                                    </p>
                                </div>
                            </div>

                            {member.role === "COMPANY_ADMIN" && <ShieldCheck className="text-purple-400 w-5 h-5" />}
                            {member.role === "MANAGER" && <ShieldAlert className="text-blue-400 w-5 h-5" />}
                            {member.role === "SUPERVISOR" && <Check className="text-emerald-400 w-5 h-5" />}
                        </div>

                        {/* Info Section */}
                        <div className="space-y-2 mb-8">
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Mail className="w-3 h-3" />
                                <span>{member.onboarding_status === "complete" ? "Verificado" : "Pendiente"}</span>
                            </div>
                            <div className="flex items-center gap-2 text-xs text-slate-500">
                                <Phone className="w-3 h-3" />
                                <span>{member.phone || "Sin teléfono"}</span>
                            </div>
                        </div>

                        {/* Action Section */}
                        {canManage && member.role !== "COMPANY_ADMIN" && (
                            <div className="pt-6 border-t border-white/5 flex gap-2">
                                {member.role !== "MANAGER" && (
                                    <button
                                        disabled={updatingId === member.id}
                                        onClick={() => handlePromote(member.id, "MANAGER")}
                                        className="flex-1 bg-white hover:bg-indigo-50 text-black py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                                    >
                                        {updatingId === member.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <ArrowUpCircle className="w-3 h-3" />}
                                        Subir a Gerente
                                    </button>
                                )}
                                {member.role !== "SUPERVISOR" && member.role !== "MANAGER" && (
                                    <button
                                        disabled={updatingId === member.id}
                                        onClick={() => handlePromote(member.id, "SUPERVISOR")}
                                        className="flex-1 bg-white/5 border border-white/10 hover:bg-white/10 text-white py-2 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1"
                                    >
                                        Subir a Supervisor
                                    </button>
                                )}
                                {member.role !== "MECHANIC" && (
                                    <button
                                        onClick={() => handlePromote(member.id, "MECHANIC")}
                                        className="p-2 text-slate-600 hover:text-white transition-colors"
                                        title="Bajar a Mecánico"
                                    >
                                        <User className="w-4 h-4" />
                                    </button>
                                )}
                            </div>
                        )}

                        {/* Decoration */}
                        <div className="absolute top-0 right-0 w-24 h-24 bg-indigo-500/5 blur-3xl rounded-full" />
                    </div>
                ))}
            </div>
        </div>
    );
}
