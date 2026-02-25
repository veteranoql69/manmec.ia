import { requireRole } from "@/lib/auth";
import { createClient } from "@/lib/supabase/server";
import { Package, Search, Plus } from "lucide-react";

export default async function InventoryPage() {
    const profile = await requireRole("SUPERVISOR");
    const supabase = await createClient();

    // Consultar catálogo
    const { data: items } = await supabase
        .from("manmec_inventory_items")
        .select("*")
        .eq("organization_id", profile.organization_id!)
        .order("created_at", { ascending: false });

    return (
        <div className="p-4 md:p-8">
            <div className="max-w-6xl mx-auto space-y-8">
                <header className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                    <div>
                        <h1 className="text-4xl font-black bg-gradient-to-r from-white to-slate-500 bg-clip-text text-transparent tracking-tight uppercase">
                            Gestión de Insumos
                        </h1>
                        <p className="text-slate-400 mt-2 flex items-center gap-2 font-medium">
                            <Package size={20} className="text-blue-500" />
                            Catálogo de repuestos y materiales consumibles
                        </p>
                    </div>
                    <button className="bg-blue-600 hover:bg-blue-500 text-white px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all shadow-xl shadow-blue-900/20 active:scale-95 text-sm">
                        <Plus size={20} /> Nuevo Insumo
                    </button>
                </header>

                {/* Filtros */}
                <div className="relative">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-500" size={20} />
                    <input
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-4 pl-12 pr-4 focus:outline-none focus:border-blue-500/50 transition-all"
                        placeholder="Buscar por nombre, SKU o código de barras..."
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {items?.map((item) => (
                        <div key={item.id} className="bg-white/5 border border-white/10 p-6 rounded-3xl backdrop-blur-md hover:bg-white/10 transition-all group">
                            <div className="flex justify-between items-start mb-4">
                                <div className="p-3 bg-blue-500/10 rounded-2xl text-blue-400">
                                    <Package size={24} />
                                </div>
                                <span className="text-[10px] font-mono text-slate-500 bg-white/5 px-2 py-1 rounded-md">
                                    {item.sku || "Sin SKU"}
                                </span>
                            </div>
                            <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">{item.name}</h3>
                            <p className="text-sm text-slate-400 mb-6 font-mono">{item.barcode || "Sin Código de Barras"}</p>

                            <div className="flex items-center justify-between pt-4 border-t border-white/5">
                                <div className="text-xs text-slate-500 uppercase font-bold tracking-widest">Stock Total</div>
                                <div className="text-2xl font-black text-white">0 <span className="text-xs text-slate-500">u.</span></div>
                            </div>
                        </div>
                    ))}

                    {(!items || items.length === 0) && (
                        <div className="col-span-full py-20 text-center text-slate-600 border-2 border-dashed border-white/5 rounded-3xl">
                            <Package size={48} className="mx-auto mb-4 opacity-20" />
                            <p>El catálogo está vacío. Realiza una recepción para agregar productos.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
