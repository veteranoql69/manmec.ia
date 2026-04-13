export interface OrgAlertRulesConfig {
    sla_hours: Record<string, number | null>;
    alert_window_days: Record<string, number>;
    reminder_thresholds_pct?: number[];
    reminder_thresholds_absolute?: Record<string, number[]>;
    working_hours?: { start: string; end: string; timezone?: string };
    silence_hours?: { start: string; end: string; timezone?: string };
    anomaly_min_samples?: number;
    escalation_timeouts_min?: Record<string, number>;
}

export interface MinimalWorkOrder {
    id: string;
    priority: string;
    status: string;
    created_at: Date;
    started_at: Date | null;
    scheduled_date: Date | null;
}

export interface SlaState {
    hoursRemaining: number | null;
    pctConsumed: number | null;
    isExpired: boolean;
    isActive: boolean; // True solo si el SLA está corriendo (tiene started_at)
}

/**
 * Filtro Cronológico. Evalúa si la orden no es una "OT Fantasma".
 * Si lleva abierta demasiados días según la ventana de su prioridad, se saca del loop
 * principal de alertas de countdown para evitar spam, y entra a otro canal semanal.
 */
export function isWithinAlertWindow(wo: MinimalWorkOrder, rules: OrgAlertRulesConfig): boolean {
    const windowDays = rules.alert_window_days?.[wo.priority];
    
    // Si no hay limite definido para la prioridad (ej. PM), se considera válida
    if (windowDays === undefined || windowDays === null) return true; 

    const referenceDate = wo.started_at ?? wo.created_at;
    const ageInDays = (Date.now() - new Date(referenceDate).getTime()) / 86_400_000; // ms a días
    
    return ageInDays <= windowDays;
}

/**
 * Calcula el estado preciso del SLA actual.
 * La corrección principal arquitectónica manda que el SLA arranca en `started_at`.
 */
export function getSlaState(wo: MinimalWorkOrder, rules: OrgAlertRulesConfig): SlaState {
    const limitHours = rules.sla_hours?.[wo.priority];
    
    // Órdenes sin límite de SLA no tienen presiones de tiempo (ej. PM antes de empezar)
    if (limitHours === null || limitHours === undefined) {
        return { hoursRemaining: null, pctConsumed: null, isExpired: false, isActive: false };
    }

    if (!wo.started_at) {
        // La OT fue creada pero el mecánico aún no la inicia ni se le ha asignado formalmente
        return { hoursRemaining: limitHours, pctConsumed: 0, isExpired: false, isActive: false };
    }

    const elapsedMs = Date.now() - new Date(wo.started_at).getTime();
    const elapsedHours = elapsedMs / 3_600_000;
    
    const hoursRemaining = limitHours - elapsedHours;
    const pctConsumed = (elapsedHours / limitHours) * 100;
    
    return {
        hoursRemaining,
        pctConsumed,
        isExpired: hoursRemaining <= 0,
        isActive: true
    };
}
