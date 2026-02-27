"use client";

import { useState } from "react";
import { Users, Truck, Plus, Check, Loader2 } from "lucide-react";
import { assignMechanicToWorkOrder, assignVehicleToWorkOrder } from "@/app/dashboard/ots/actions";

interface Resource {
    id: string;
    full_name?: string;
    plate?: string;
    brand?: string;
    model?: string;
}

interface Props {
    otId: string;
    availableMechanics: Resource[];
    availableVehicles: Resource[];
}

export function OTAssignmentManager({ otId, availableMechanics, availableVehicles }: Props) {
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

    return (
        <div className="space-y-6">
            <section className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-widest text-blue-400">
                    <Users className="w-4 h-4" /> Asignar Personal Técnico
                </h3>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {availableMechanics.map((m) => (
                        <div key={m.id} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl hover:border-blue-500/30 transition-all group">
                            <span className="text-xs font-bold text-slate-200">{m.full_name}</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => handleAssignMechanic(m.id, "lead")}
                                    disabled={!!loading}
                                    className="px-3 py-1 bg-blue-500/20 hover:bg-blue-500 text-blue-400 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all disabled:opacity-50"
                                >
                                    {loading === `mechanic-${m.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : "Líder"}
                                </button>
                                <button
                                    onClick={() => handleAssignMechanic(m.id, "support")}
                                    disabled={!!loading}
                                    className="px-3 py-1 bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all disabled:opacity-50"
                                >
                                    Apoyo
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            </section>

            <section className="bg-white/5 border border-white/10 p-6 rounded-[2rem] backdrop-blur-md">
                <h3 className="font-bold text-sm mb-4 flex items-center gap-2 uppercase tracking-widest text-emerald-400">
                    <Truck className="w-4 h-4" /> Asignar Vehículo / Logística
                </h3>
                <div className="grid grid-cols-1 gap-2 max-h-48 overflow-y-auto pr-2 custom-scrollbar">
                    {availableVehicles.map((v) => (
                        <div key={v.id} className="flex items-center justify-between p-3 bg-black/40 border border-white/5 rounded-xl hover:border-emerald-500/30 transition-all group">
                            <div>
                                <p className="text-xs font-black text-slate-200 font-mono">{v.plate}</p>
                                <p className="text-[10px] text-slate-500 uppercase">{v.brand} {v.model}</p>
                            </div>
                            <button
                                onClick={() => handleAssignVehicle(v.id)}
                                disabled={!!loading}
                                className="px-3 py-1 bg-emerald-500/20 hover:bg-emerald-500 text-emerald-400 hover:text-white rounded-lg text-[10px] font-black uppercase transition-all disabled:opacity-50"
                            >
                                {loading === `vehicle-${v.id}` ? <Loader2 className="w-3 h-3 animate-spin" /> : <Plus className="w-3 h-3" />}
                            </button>
                        </div>
                    ))}
                </div>
            </section>
        </div>
    );
}
