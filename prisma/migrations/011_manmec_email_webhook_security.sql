-- ============================================================
-- Migración: 011_manmec_email_webhook_security.sql
-- Propósito: Agregar soporte para dominios de correo de webhook
-- ============================================================

-- Añadir de forma segura la columna a la organización
ALTER TABLE manmec_organizations
ADD COLUMN IF NOT EXISTS "allowed_email_domains" text[] NOT NULL DEFAULT '{}';

COMMENT ON COLUMN manmec_organizations.allowed_email_domains IS 'Dominios autorizados por el inquilino para disparar creacion de OTs via Email Webhook (ej. copec.cl, miempresa.com)';

-- ============================================================
-- Semilla INICIAL para la primera Organización (si existe)
-- ============================================================
UPDATE manmec_organizations
SET allowed_email_domains = ARRAY['copec.cl']
WHERE (name ILIKE '%copec%' OR name ILIKE '%demo%')
  AND array_length(allowed_email_domains, 1) IS NULL;
