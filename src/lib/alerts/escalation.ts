import { createAdminClient } from "@/lib/supabase/admin";

export interface TargetUser {
    id: string;
    full_name: string;
    telegram_chat_id: string | null;
    onboarding_status: string;
    role: string;
}

/**
 * Retorna la cadena completa de usuarios (Mecánico -> Supervisor -> Managers -> Admins)
 * que debiesen ser notificados en caso de que un SLA siga fallando.
 * TODA lectura está estrictamente limitada al `organizationId`.
 */
export async function getEscalationChain(
    organizationId: string, 
    mechanicId?: string | null
): Promise<TargetUser[]> {
    const supabase = createAdminClient();
    const chain: TargetUser[] = [];
    const addedIds = new Set<string>();

    const safeAdd = (user: TargetUser) => {
        if (!addedIds.has(user.id)) {
            chain.push(user);
            addedIds.add(user.id);
        }
    }

    // Nivel 1: El propio mecánico si está asignado a la OT
    if (mechanicId) {
        const { data: mechanic } = await supabase
            .from('manmec_users')
            .select('id, full_name, telegram_chat_id, onboarding_status, role')
            .eq('id', mechanicId)
            .eq('organization_id', organizationId)
            .single();
            
        if (mechanic) safeAdd(mechanic as TargetUser);

        // Nivel 2: Su supervisor directo (si lo tiene asignado)
        const { data: assignment } = await supabase
            .from('manmec_supervisor_assignments')
            .select('supervisor_id')
            .eq('mechanic_id', mechanicId)
            .eq('organization_id', organizationId)
            .single();

        if (assignment && assignment.supervisor_id) {
            const { data: supervisor } = await supabase
                .from('manmec_users')
                .select('id, full_name, telegram_chat_id, onboarding_status, role')
                .eq('id', assignment.supervisor_id)
                .eq('organization_id', organizationId)
                .single();
                
            if (supervisor) safeAdd(supervisor as TargetUser);
        }
    }

    // Nivel 3: Los Managers de la organización (Backup)
    const { data: managers } = await supabase
        .from('manmec_users')
        .select('id, full_name, telegram_chat_id, onboarding_status, role')
        .eq('organization_id', organizationId)
        .eq('role', 'MANAGER')
        .eq('is_active', true);
        
    if (managers) managers.forEach(m => safeAdd(m as TargetUser));

    // Nivel 4: Los Administradores (Último recurso total)
    const { data: admins } = await supabase
        .from('manmec_users')
        .select('id, full_name, telegram_chat_id, onboarding_status, role')
        .eq('organization_id', organizationId)
        .eq('role', 'COMPANY_ADMIN')
        .eq('is_active', true);

    if (admins) admins.forEach(a => safeAdd(a as TargetUser));

    return chain;
}
