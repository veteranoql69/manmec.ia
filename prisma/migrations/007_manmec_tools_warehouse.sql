-- ============================================================
-- MANMEC IA — Parche 007: Asignación de Herramientas a Bodegas
-- Instrucciones: Pegar en Supabase Studio → SQL Editor → Run
-- ============================================================

-- 1. Agregar la relación hacia almacenes (warehouses)
ALTER TABLE manmec_tools 
  ADD COLUMN IF NOT EXISTS assigned_warehouse_id uuid REFERENCES manmec_warehouses(id);

COMMENT ON COLUMN manmec_tools.assigned_warehouse_id IS 
  'Bodega (Central o Móvil) donde está físicamente guardada la herramienta.';
