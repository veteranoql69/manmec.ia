export interface TimeRange {
    start: string; // formato "HH:mm"
    end: string;   // formato "HH:mm"
}

export interface SchedulerOrgConfig {
    timezone: string;
    working_hours?: TimeRange;
    silence_hours?: TimeRange;
}

/**
 * Obtiene la hora actual formateada como "HH:mm" según la zona horaria del tenant.
 */
export function getHHMMInTimezone(timezone: string = 'America/Santiago'): string {
    const formatter = new Intl.DateTimeFormat('en-US', {
        timeZone: timezone,
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
    });
    
    const parts = formatter.formatToParts(new Date());
    const hour = parts.find(p => p.type === 'hour')?.value || '00';
    const minute = parts.find(p => p.type === 'minute')?.value || '00';
    
    // Normalizar 24 a 00 en caso de implementaciones JS extrañas
    const finalHour = hour === '24' ? '00' : hour;
    return `${finalHour}:${minute}`;
}

/**
 * Verifica si "timeStr" (HH:mm) cae dentro del rango especificado (inclusive).
 * Soporta rangos que intersecan la medianoche (ej: 22:00 a 06:59).
 */
export function isTimeInRange(timeStr: string, range: TimeRange): boolean {
    const currentMatches = timeStr.match(/^(\d{2}):(\d{2})$/);
    if (!currentMatches) return false;
    const currentMins = parseInt(currentMatches[1], 10) * 60 + parseInt(currentMatches[2], 10);

    const startMatches = range.start.match(/^(\d{2}):(\d{2})$/);
    const endMatches = range.end.match(/^(\d{2}):(\d{2})$/);
    
    if (!startMatches || !endMatches) return true; // Si hay error en formato, asumimos true para no frenar
    
    const startMins = parseInt(startMatches[1], 10) * 60 + parseInt(startMatches[2], 10);
    const endMins = parseInt(endMatches[1], 10) * 60 + parseInt(endMatches[2], 10);

    if (startMins <= endMins) {
        // Horario diurno normal, e.g. 07:00 -> 21:00
        return currentMins >= startMins && currentMins <= endMins;
    } else {
        // Cruza medianoche, e.g. 22:00 -> 06:59
        return currentMins >= startMins || currentMins <= endMins;
    }
}

/**
 * Determina si es seguro mandar una alerta en este preciso instante para un Tenant.
 * - Siempre retorna true si la alerta es isCritical
 * - Retorna false si cae dentro de las silence_hours
 * - Retorna false si no está en working_hours (a menos que no se definan)
 */
export function canSendAlertNow(config: SchedulerOrgConfig, isCritical: boolean = false): boolean {
    if (isCritical) return true;

    const currentTime = getHHMMInTimezone(config.timezone);

    // 1. Evaluar horas de silencio absolutas
    if (config.silence_hours && isTimeInRange(currentTime, config.silence_hours)) {
        return false;
    }

    // 2. Si hay working hours, debe estar dentro
    if (config.working_hours) {
        return isTimeInRange(currentTime, config.working_hours);
    }

    // Si no tiene config especifica, se asume que puede
    return true;
}
