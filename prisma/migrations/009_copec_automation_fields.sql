-- ============================================================
-- MANMEC IA — Migración: Automatización Email-to-Action
-- Versión: 1.0.9
-- Objetivo: Soportar OTs externas y pre-recepción de guías
-- ============================================================

-- 1. Extensiones para Órdenes de Trabajo (manmec_work_orders)
ALTER TABLE manmec_work_orders 
ADD COLUMN IF NOT EXISTS external_id text,
ADD COLUMN IF NOT EXISTS external_source text;

-- Crear índice único por organización y external_id para evitar duplicados de Copec/Enex
CREATE UNIQUE INDEX IF NOT EXISTS idx_wo_external_id_org 
ON manmec_work_orders (organization_id, external_id) 
WHERE external_id IS NOT NULL;

-- 2. Extensiones para Despachos (manmec_shipments)
ALTER TABLE manmec_shipments 
ADD COLUMN IF NOT EXISTS external_id text,
ADD COLUMN IF NOT EXISTS order_number text;

-- Índice único para no procesar la misma guía dos veces
CREATE UNIQUE INDEX IF NOT EXISTS idx_shipment_external_id_org 
ON manmec_shipments (organization_id, external_id) 
WHERE external_id IS NOT NULL;

-- 3. Comentarios de Auditoría
COMMENT ON COLUMN manmec_work_orders.external_id IS 'ID de ticket externo (ej. No. Aviso de Copec).';
COMMENT ON COLUMN manmec_shipments.order_number IS 'Número de pedido administrativo (ej. Pedido SAP).';

-- 4. Asegurar que los estados de shipment sean consistentes
-- No es necesario un ALTER TYPE ya que status es text con default PENDING
