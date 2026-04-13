import { createAdminClient } from "@/lib/supabase/admin";
import { canSendAlertNow, SchedulerOrgConfig } from "./scheduler";
import { getSlaState, isWithinAlertWindow, MinimalWorkOrder, OrgAlertRulesConfig } from "./sla";
import { getEscalationChain } from "./escalation";
import { sendTelegramMessage } from "../telegram/sender";

export async function runAlertsEngineForOrg(orgId: string, settings: any) {
    const supabase = createAdminClient();
    
    // Extraer reglas del JSON de forma segura
    const rules: OrgAlertRulesConfig = settings.alert_rules || {};
    const schedulerConfig: SchedulerOrgConfig = {
        timezone: settings.timezone || 'America/Santiago',
        working_hours: rules.working_hours, 
        silence_hours: rules.silence_hours 
    };

    // 1. Obtener Órdenes de Trabajo Activas (Filtro mandatorio por tenant)
    const { data: rawOrders } = await supabase
        .from('manmec_work_orders')
        .select(`
            id, code, priority, status, created_at, started_at, scheduled_date, 
            title, assigned_to
        `)
        .eq('organization_id', orgId)
        .in('status', ['PENDING', 'ASSIGNED', 'IN_PROGRESS', 'PAUSED']);
        
    if (!rawOrders || rawOrders.length === 0) return;

    // 2. Ejecutar Lógica de Alertas SLA para cada Orden
    for (const raw of rawOrders) {
        const wo: MinimalWorkOrder = {
            id: String(raw.id),
            priority: String(raw.priority),
            status: String(raw.status),
            created_at: new Date(raw.created_at),
            started_at: raw.started_at ? new Date(raw.started_at) : null,
            scheduled_date: raw.scheduled_date ? new Date(raw.scheduled_date) : null
        };

        // Filtro contra "OTs Fantasma" oxidadas para no generar ruido
        if (!isWithinAlertWindow(wo, rules)) continue; 

        // Cálculo algorítmico del SLA restante  
        const state = getSlaState(wo, rules);
        if (!state.isActive || state.hoursRemaining === null) continue;

        // Niveles de Alerta: 0 (Ok), 1 (Aviso), 2 (Crítico/Escalamiento)
        let alertLevel = 0; 
        
        if (state.isExpired) {
            alertLevel = 2; // ¡SLA Roto!
        } else if (['P1', 'P2'].includes(wo.priority) && state.pctConsumed !== null) {
            if (state.pctConsumed >= 90) alertLevel = 2;
            else if (state.pctConsumed >= 75) alertLevel = 1;
        } else if (['P3', 'P4'].includes(wo.priority)) {
            if (state.hoursRemaining <= 4) alertLevel = 2;
            else if (state.hoursRemaining <= 24) alertLevel = 1;
        }

        // Si la orden ya escaló o peligra...
        if (alertLevel > 0) {
            // Generar identificador Anti-spam
            const statusKey = state.isExpired ? 'EXPIRED' : (alertLevel === 2 ? 'L2' : 'L1');
            const alertKey = `${orgId}:${wo.id}:SLA:${statusKey}`;

            // Validar de-duplicación
            const { data: existing } = await supabase
                .from('manmec_ai_actions')
                .select('id')
                .eq('alert_key', alertKey)
                .single();

            if (existing) continue; // Alerta ya fue notificada previamente.

            const isCritical = alertLevel === 2;
            
            // Si es de madruga/horario de silencio y NO es crítica, se salta hasta la mañana.
            if (!canSendAlertNow(schedulerConfig, isCritical)) continue; 

            // Cargar jerarquía de empleados para alertar
            const chain = await getEscalationChain(orgId, raw.assigned_to);
            
            // Si es crítica avisamos a múltiples niveles, si es info, solo al nivel 1 (Mecánico)
            const targetUsers = isCritical ? chain : (chain.length > 0 ? [chain[0]] : []);

            for (const target of targetUsers) {
                // Generación de Texto Simplificado 
                // (Próxima iteración MVP pasará esto a Gemini Flash para más lenguaje natural)
                const urgentIcon = state.isExpired ? '🚨' : '⚠️';
                const message = `${urgentIcon} <b>ALERTA SLA ${state.isExpired ? 'VENCIDO' : 'CRÍTICO'}</b>\n\n` +
                                `📋 OT #${raw.code || raw.id.substring(0,6)}\n` +
                                `🔧 Prioridad: ${wo.priority}\n` +
                                `⏱️ Restante: ${state.isExpired ? 'SLA Caducado' : Math.ceil(state.hoursRemaining) + ' h'}\n\n` +
                                `<i>Por favor gestiona esto a la brevedad.</i>`;

                await sendTelegramMessage(target.telegram_chat_id, message, {
                    organizationId: orgId,
                    userId: target.id,
                    actionType: 'SLA_ALERT'
                });
            }

            // Marcar en la BD como enviada (Para no repetirla en otros cron jobs de los siguientes 15 min)
            await supabase.from('manmec_ai_actions').insert({
                organization_id: orgId,
                action_type: 'SLA_ALERT',
                title: `SLA Alert ${statusKey} - OT ${raw.code}`,
                alert_key: alertKey,
                sent_at: new Date().toISOString()
            });
        }
    }
}
