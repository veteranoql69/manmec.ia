// ===========================
// Manmec IA — Global Types
// ===========================

/** Roles del sistema */
export type UserRole = "COMPANY_ADMIN" | "MANAGER" | "SUPERVISOR" | "MECHANIC";

/** Prioridades de Órdenes de Trabajo */
export type OTPriority = "P1" | "P2" | "P3";

/** Estado de Órdenes de Trabajo */
export type OTStatus =
    | "PENDING"
    | "ASSIGNED"
    | "IN_PROGRESS"
    | "PAUSED"
    | "COMPLETED"
    | "CANCELLED";
