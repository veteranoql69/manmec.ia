"use client";

import { useState } from "react";
import { Users, Truck, Plus, Check, Loader2, X } from "lucide-react";
import {
    assignMechanicToWorkOrder,
    assignVehicleToWorkOrder,
    unassignMechanicFromWorkOrder,
    unassignVehicleFromWorkOrder
} from "@/app/dashboard/ots/actions";

interface Resource {
    id: string;
    full_name?: string;
    plate?: string;
    brand?: string | null;
    model?: string | null;
}

interface Props {
    otId: string;
    availableMechanics: Resource[];
    availableVehicles: Resource[];
    currentTeam?: Array<{
        mechanic: { id: string; full_name: string };
        role: "lead" | "support";
    }>;
    currentVehicleId?: string | null;
}

export function OTAssignmentManager({
    otId,
    availableMechanics,
    availableVehicles,
    currentTeam = [],
    currentVehicleId
}: Props) {
    const [loading, setLoading] = useState<string | null>(null);

    const handleAssignMechanic = async (mechanicId: string, role: "lead" | "support") => {
        setLoading(`mechanic-${mechanicId}`);
        try {
            await assignMechanicToWorkOrder(otId, mechanicId, role);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    };

    const handleUnassignMechanic = async (mechanicId: string) => {
        setLoading(`mechanic-${mechanicId}`);
        try {
            await unassignMechanicFromWorkOrder(otId, mechanicId);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    };

    const handleAssignVehicle = async (vehicleId: string) => {
        setLoading(`vehicle-${vehicleId}`);
        try {
            await assignVehicleToWorkOrder(otId, vehicleId);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    };

    const handleUnassignVehicle = async () => {
        setLoading(`vehicle-unassign`);
        try {
            await unassignVehicleFromWorkOrder(otId);
        } catch (e) {
            console.error(e);
        } finally {
            setLoading(null);
        }
    };

    return (
        <div className="space-y-6">
            <section className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-widest text-blue-400">
                    <Users className="w-4 h-4" /> Asignar Personal Técnico
                </h3>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {availableMechanics.map((m) => {
                        const assignedMember = currentTeam.find(tm => tm.mechanic.id === m.id);
                        const isAssigned = !!assignedMember;

                        return (
                            <div key={m.id} className={`flex items-center justify-between p-3 bg-black/40 border rounded-xl transition-all group ${isAssigned ? 'border-blue-500/50 bg-blue-500/5' : 'border-white/5 hover:border-white/10'}`}>
                                <div className="flex flex-col">
                                    <span className="text-xs font-bold text-slate-200">{m.full_name}</span>
                                    {isAssigned && (
                                        <span className="text-[8px] font-black uppercase text-blue-400 tracking-tighter">
                                            {assignedMember.role === 'lead' ? 'Líder' : 'Apoyo'}
                                        </span>
                                    )}
                                </div>

                                <div className="flex gap-2">
                                    {isAssigned ? (
                                        <button
                                            onClick={() => handleUnassignMechanic(m.id)}
                                            disabled={!!loading}
                                            className="p-1.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all disabled:opacity-50"
                                            title="Quitar asignación"
                                        >
                                            {loading === `mechanic-${m.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                        </button>
                                    ) : (
                                        <>
                                            <button
                                                onClick={() => handleAssignMechanic(m.id, "lead")}
                                                disabled={!!loading}
                                                className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all disabled:opacity-50"
                                            >
                                                Líder
                                            </button>
                                            <button
                                                onClick={() => handleAssignMechanic(m.id, "support")}
                                                disabled={!!loading}
                                                className="px-3 py-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all disabled:opacity-50"
                                            >
                                                Apoyo
                                            </button>
                                        </>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </section>

            <section className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-widest text-emerald-400">
                    <Truck className="w-4 h-4" /> Asignar Vehículo / Logística
                </h3>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {availableVehicles.map((v) => {
                        const isAssigned = currentVehicleId === v.id;

                        return (
                            <div key={v.id} className={`flex items-center justify-between p-3 bg-black/40 border rounded-xl transition-all group ${isAssigned ? 'border-emerald-500/50 bg-emerald-500/5' : 'border-white/5 hover:border-white/10'}`}>
                                <div>
                                    <p className="text-xs font-black text-slate-200 font-mono">{v.plate}</p>
                                    <p className="text-[10px] text-slate-500 uppercase">{v.brand} {v.model}</p>
                                </div>

                                {isAssigned ? (
                                    <button
                                        onClick={() => handleUnassignVehicle()}
                                        disabled={!!loading}
                                        className="p-1.5 bg-red-500/20 hover:bg-red-500 text-red-400 hover:text-white rounded-lg transition-all disabled:opacity-50"
                                        title="Quitar vehículo"
                                    >
                                        {loading === `vehicle-unassign` ? <Loader2 className="w-3 h-3 animate-spin" /> : <X className="w-3 h-3" />}
                                    </button>
                                ) : (
                                    <button
                                        onClick={() => handleAssignVehicle(v.id)}
                                        disabled={!!loading}
                                        className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all disabled:opacity-50"
                                    >
                                        {loading === `vehicle-${v.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                                    </button>
                                )}
                            </div>
                        );
                    })}
                </div>
            </section>
        </div>
    );
}
