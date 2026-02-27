-- ============================================================
-- MANMEC IA — Migración: Configuración de Notificaciones SaaS
-- Versión: 1.0.8
-- Objetivo: Añadir campos de configuración a la organización
-- ============================================================

-- 1. Añadir columnas a manmec_organizations
ALTER TABLE manmec_organizations 
ADD COLUMN IF NOT EXISTS client_notification_email text DEFAULT 'bodega@manmec.cl',
ADD COLUMN IF NOT EXISTS settings jsonb DEFAULT '{}';

-- 2. Comentarios para metadatos
COMMENT ON COLUMN manmec_organizations.client_notification_email IS 
  'Correo electrónico del mandante que actúa como disparador de procesos operativos.';
COMMENT ON COLUMN manmec_organizations.settings IS 
  'Configuraciones adicionales de la organización en formato JSON (SaaS ready).';

-- 3. Actualizar registros existentes para asegurar el valor de desarrollo
UPDATE manmec_organizations 
SET client_notification_email = 'bodega@manmec.cl' 
WHERE client_notification_email IS NULL;
