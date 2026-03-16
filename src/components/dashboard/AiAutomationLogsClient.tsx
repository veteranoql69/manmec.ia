"use client";

import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
    Cpu, 
    CheckCircle2, 
    XCircle, 
    AlertTriangle, 
    Clock, 
    ExternalLink, 
    FileText, 
    Eye,
    Search,
    RefreshCcw,
    ChevronRight,
    SearchCode,
    Package
} from "lucide-react";
import { IaAutomationLog } from "@/app/dashboard/ai-logs/actions";
import { format } from "date-fns";
import { es } from "date-fns/locale";

interface Props {
    initialLogs: IaAutomationLog[];
    fetchError?: string | null;
}

export function AiAutomationLogsClient({ initialLogs, fetchError }: Props) {
    const [selectedLog, setSelectedLog] = useState<IaAutomationLog | null>(null);
    const [search, setSearch] = useState("");

    if (fetchError === 'TABLE_MISSING') {
        return (
            <div className="max-w-4xl mx-auto mt-12 p-8 rounded-3xl border border-rose-500/30 bg-rose-500/5 backdrop-blur-xl">
                <div className="flex items-center gap-4 mb-6">
                    <div className="p-3 rounded-2xl bg-rose-500/20 text-rose-400">
                        <AlertTriangle className="w-8 h-8" />
                    </div>
                    <div>
                        <h2 className="text-2xl font-bold text-white">Configuración Pendiente</h2>
                        <p className="text-rose-200/60">La tabla de auditoría no ha sido creada en la base de datos.</p>
                    </div>
                </div>

                <div className="space-y-4">
                    <p className="text-slate-300 leading-relaxed">
                        Para poder ver los logs de la IA y habilitar el monitoreo en tiempo real, necesitas ejecutar la migración SQL en tu panel de Supabase.
                    </p>
                    
                    <div className="bg-slate-950 rounded-2xl border border-slate-800 p-6 overflow-hidden relative group">
                        <div className="absolute right-4 top-4 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button 
                                onClick={() => navigator.clipboard.writeText(`CREATE TABLE IF NOT EXISTS manmec_ia_automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES manmec_organizations(id) ON DELETE CASCADE,
  external_id text,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'SUCCESS',
  raw_payload jsonb,
  ai_response jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE manmec_ia_automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ia_logs_select" ON manmec_ia_automation_logs FOR SELECT 
  USING (organization_id = manmec_my_org_id() AND manmec_my_role() IN ('COMPANY_ADMIN','MANAGER','SUPERVISOR'));`)}
                                className="flex items-center gap-2 px-3 py-1.5 bg-blue-600 hover:bg-blue-500 text-white text-xs font-bold rounded-lg transition-colors"
                            >
                                <RefreshCcw className="w-3 h-3" />
                                Copiar SQL
                            </button>
                        </div>
                        <pre className="text-[10px] text-blue-300 font-mono leading-relaxed whitespace-pre-wrap">
{`CREATE TABLE IF NOT EXISTS manmec_ia_automation_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid NOT NULL REFERENCES manmec_organizations(id) ON DELETE CASCADE,
  external_id text,
  type text NOT NULL,
  status text NOT NULL DEFAULT 'SUCCESS',
  raw_payload jsonb,
  ai_response jsonb,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE manmec_ia_automation_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "ia_logs_select" ON manmec_ia_automation_logs FOR SELECT 
  USING (organization_id = manmec_my_org_id() AND manmec_my_role() IN ('COMPANY_ADMIN','MANAGER','SUPERVISOR'));`}
                        </pre>
                    </div>

                    <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/10 border border-blue-500/20 text-blue-200 text-sm">
                        <Clock className="w-5 h-5 shrink-0" />
                        <span>Una vez ejecutado, refresca esta página para ver los logs.</span>
                    </div>
                </div>
            </div>
        );
    }

    const filteredLogs = initialLogs.filter(log => 
        (log.external_id || "").includes(search) || 
        (log.type || "").toLowerCase().includes(search.toLowerCase())
    );

    const getStatusIcon = (status: string) => {
        switch (status) {
            case 'SUCCESS': return <CheckCircle2 className="w-5 h-5 text-emerald-400" />;
            case 'ERROR': return <XCircle className="w-5 h-5 text-rose-400" />;
            case 'WARNING': return <AlertTriangle className="w-5 h-5 text-amber-400" />;
            default: return <Clock className="w-5 h-5 text-slate-400" />;
        }
    };

    const getStatusStyle = (status: string) => {
        switch (status) {
            case 'SUCCESS': return 'border-emerald-500/20 bg-emerald-500/5 text-emerald-300';
            case 'ERROR': return 'border-rose-500/20 bg-rose-500/5 text-rose-300';
            case 'WARNING': return 'border-amber-500/20 bg-amber-500/5 text-amber-300';
            default: return 'border-slate-500/20 bg-slate-500/5 text-slate-300';
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-slate-900/40 p-6 rounded-2xl border border-slate-800 backdrop-blur-sm">
                <div>
                    <h1 className="text-2xl font-bold text-white flex items-center gap-3">
                        <Cpu className="text-blue-400" />
                        Auditoría de Automatización IA
                    </h1>
                    <p className="text-slate-400 mt-1">Monitorea en tiempo real las decisiones y extracciones del motor Gemini.</p>
                </div>
                
                <div className="relative w-full md:w-80">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                    <input 
                        type="text" 
                        placeholder="Buscar por Aviso o Tipo..."
                        className="w-full bg-slate-950/50 border border-slate-800 rounded-xl py-2.5 pl-10 pr-4 text-white placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500/40 transition-all font-medium"
                        value={search}
                        onChange={(e) => setSearch(e.target.value)}
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
                <div className="lg:col-span-8 flex flex-col gap-3">
                    <AnimatePresence mode="popLayout">
                        {filteredLogs.map((log) => (
                            <motion.button
                                layout
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, scale: 0.95 }}
                                key={log.id}
                                onClick={() => setSelectedLog(log)}
                                className={`group flex items-center gap-4 p-4 rounded-xl border transition-all text-left ${
                                    selectedLog?.id === log.id 
                                    ? 'bg-blue-600/10 border-blue-500/50 ring-1 ring-blue-500/20' 
                                    : 'bg-slate-900/30 border-slate-800 hover:border-slate-700 hover:bg-slate-800/40'
                                }`}
                            >
                                <div className={`p-2.5 rounded-lg border ${getStatusStyle(log.status)}`}>
                                    {getStatusIcon(log.status)}
                                </div>

                                <div className="flex-1 min-w-0">
                                    <div className="flex items-center gap-3 mb-1">
                                        <span className="font-bold text-white text-lg">
                                            {log.external_id || 'Global'}
                                        </span>
                                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-slate-800 text-slate-400 tracking-wider">
                                            {log.type}
                                        </span>
                                    </div>
                                    <div className="flex items-center gap-4 text-xs text-slate-500">
                                        <span className="flex items-center gap-1.5 font-medium">
                                            <Clock className="w-3.5 h-3.5" />
                                            {format(new Date(log.created_at), "HH:mm:ss ' - ' d MMM", { locale: es })}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                                    <span className="text-xs font-bold text-blue-400">Ver detalles</span>
                                    <ChevronRight className="w-4 h-4 text-blue-400" />
                                </div>
                            </motion.button>
                        ))}
                    </AnimatePresence>
                </div>

                <div className="lg:col-span-4 sticky top-24 h-fit">
                    <AnimatePresence mode="wait">
                        {selectedLog ? (
                            <motion.div
                                initial={{ opacity: 0, x: 20 }}
                                animate={{ opacity: 1, x: 0 }}
                                exit={{ opacity: 0, x: 20 }}
                                className="bg-slate-900/60 border border-slate-800 rounded-2xl overflow-hidden backdrop-blur-md shadow-2xl"
                            >
                                <div className="p-6 border-b border-slate-800 bg-slate-900/80">
                                    <div className="flex justify-between items-start mb-4">
                                        <h3 className="text-xl font-bold text-white flex items-center gap-2">
                                            <Eye className="w-5 h-5 text-blue-400" />
                                            Detalle de Ejecución
                                        </h3>
                                        <button onClick={() => setSelectedLog(null)} className="text-slate-500 hover:text-white transition-colors">
                                            <XCircle className="w-6 h-6" />
                                        </button>
                                    </div>
                                    
                                    {selectedLog.error_message && (
                                        <div className="p-3 mb-4 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-300 text-xs font-semibold flex gap-2 items-start leading-relaxed">
                                            <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                            {selectedLog.error_message}
                                        </div>
                                    )}
                                </div>

                                <div className="p-6 space-y-6">
                                    <div>
                                        <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-2">IA Parsed Result</label>
                                        <div className="bg-slate-950 p-4 rounded-xl border border-slate-800 font-mono text-xs overflow-auto max-h-[300px] scrollbar-thin scrollbar-thumb-slate-800">
                                            <pre className="text-blue-300">{JSON.stringify(selectedLog.ai_response, null, 2)}</pre>
                                        </div>
                                    </div>

                                    {selectedLog.ai_response?.metadata?.repuestos && (
                                        <div>
                                            <label className="text-[10px] font-bold text-slate-500 uppercase tracking-widest block mb-3 flex items-center gap-2">
                                                <Package className="w-3.5 h-3.5 text-blue-400" />
                                                Repuestos Detectados
                                            </label>
                                            <div className="space-y-2">
                                                {selectedLog.ai_response.metadata.repuestos.map((r: any, i: number) => (
                                                    <div key={i} className="flex justify-between items-center bg-slate-800/40 p-3 rounded-lg border border-slate-700/50">
                                                        <div>
                                                            <div className="text-xs font-bold text-white">{r.nombre}</div>
                                                            <div className="text-[10px] text-slate-500 font-mono">SKU: {r.codigo}</div>
                                                        </div>
                                                        <div className="text-blue-400 font-black text-sm">x{r.cantidad}</div>
                                                    </div>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </motion.div>
                        ) : (
                            <div className="h-64 flex flex-col items-center justify-center text-slate-600 border border-dashed border-slate-800 rounded-2xl">
                                <SearchCode className="w-12 h-12 mb-4 opacity-20" />
                                <p className="text-sm font-bold">Selecciona un log para ver el detalle</p>
                            </div>
                        )}
                    </AnimatePresence>
                </div>
            </div>
        </div>
    );
}
