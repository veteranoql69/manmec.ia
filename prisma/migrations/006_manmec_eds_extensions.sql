-- ============================================================
-- MANMEC IA — Parche 006: Extensión EDS y Activos Sensibles
-- Instrucciones: Pegar en Supabase Studio → SQL Editor → Run
-- ============================================================

-- 1. Extensión de ManmecServiceStation
ALTER TABLE manmec_service_stations 
  ADD COLUMN IF NOT EXISTS sap_store_code  text,
  ADD COLUMN IF NOT EXISTS sap_store_id    text,
  ADD COLUMN IF NOT EXISTS brand           text,
  ADD COLUMN IF NOT EXISTS location_type   text,
  ADD COLUMN IF NOT EXISTS segment         text,
  ADD COLUMN IF NOT EXISTS cluster         text,
  ADD COLUMN IF NOT EXISTS format          text,
  ADD COLUMN IF NOT EXISTS operation_type  text,
  ADD COLUMN IF NOT EXISTS commune         text,
  ADD COLUMN IF NOT EXISTS region_id       integer,
  ADD COLUMN IF NOT EXISTS direction_sense text,
  ADD COLUMN IF NOT EXISTS shop_radius     numeric,
  ADD COLUMN IF NOT EXISTS route_radius    numeric,
  ADD COLUMN IF NOT EXISTS pos_system      text,
  ADD COLUMN IF NOT EXISTS services        text, -- Lista CSV como texto por simplicidad en importación
  ADD COLUMN IF NOT EXISTS is_active_sap   boolean DEFAULT true;

-- 2. Campos de Seguimiento Sensible en Herramientas e Inventario
ALTER TABLE manmec_tools 
  ADD COLUMN IF NOT EXISTS is_sensitive    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS criticality     text DEFAULT 'normal'
    CHECK (criticality IN ('normal', 'medium', 'high', 'critical'));

ALTER TABLE manmec_inventory_items 
  ADD COLUMN IF NOT EXISTS is_sensitive    boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS criticality     text DEFAULT 'normal'
    CHECK (criticality IN ('normal', 'medium', 'high', 'critical'));

-- 3. Índices útiles para búsqueda SAP
CREATE INDEX IF NOT EXISTS idx_stations_sap_code ON manmec_service_stations(sap_store_code);

-- 4. Comentarios explicativos
COMMENT ON COLUMN manmec_service_stations.sap_store_code IS 'Código identificador de la tienda en SAP.';
COMMENT ON COLUMN manmec_tools.is_sensitive IS 'Marca si la herramienta es un activo sensible (alto valor/merma).';
COMMENT ON COLUMN manmec_inventory_items.is_sensitive IS 'Marca si el repuesto/insumo es un activo sensible.';
