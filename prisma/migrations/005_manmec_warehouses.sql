-- ============================================================
-- MANMEC IA — Migración 005: Estructura Operativa (Bodegas y EDS)
-- ============================================================

-- 1. ACTUALIZACIÓN DE ESTACIONES DE SERVICIO (EDS)
ALTER TABLE manmec_service_stations 
  ADD COLUMN IF NOT EXISTS code           text,                  -- Ej: S-20088
  ADD COLUMN IF NOT EXISTS manager_name   text,                  -- Nombre Jefe EDS
  ADD COLUMN IF NOT EXISTS manager_phone  text;                  -- Número Jefe EDS

COMMENT ON COLUMN manmec_service_stations.code IS 'Código interno de la estación (Ej: S-20088)';

-- 2. CREACIÓN DE BODEGAS (CENTROS DE LOGÍSTICA)
CREATE TABLE IF NOT EXISTS manmec_warehouses (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES manmec_organizations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  address         text,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE manmec_warehouses ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "warehouses_select" ON manmec_warehouses;
CREATE POLICY "warehouses_select" ON manmec_warehouses FOR SELECT USING (organization_id = manmec_my_org_id());

DROP POLICY IF EXISTS "warehouses_all_managers" ON manmec_warehouses;
CREATE POLICY "warehouses_all_managers" ON manmec_warehouses FOR ALL 
  USING (organization_id = manmec_my_org_id() AND manmec_my_role() IN ('COMPANY_ADMIN','MANAGER','SUPERVISOR'));

-- 3. REFACTORIZACIÓN DE STOCK
DROP TABLE IF EXISTS manmec_inventory_stock CASCADE;

CREATE TABLE manmec_inventory_stock (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         uuid        NOT NULL REFERENCES manmec_inventory_items(id) ON DELETE CASCADE,
  warehouse_id    uuid        NOT NULL REFERENCES manmec_warehouses(id) ON DELETE CASCADE,
  quantity        numeric     NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_stock_item_warehouse UNIQUE (item_id, warehouse_id)
);

ALTER TABLE manmec_inventory_stock ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "stock_select" ON manmec_inventory_stock;
CREATE POLICY "stock_select" ON manmec_inventory_stock FOR SELECT USING (
  warehouse_id IN (SELECT id FROM manmec_warehouses WHERE organization_id = manmec_my_org_id())
);

-- 4. MOVIMIENTOS E HISTORIAL (CON SOPORTE PARA BODEGAS Y VEHÍCULOS)
ALTER TABLE manmec_inventory_movements 
  ADD COLUMN IF NOT EXISTS warehouse_id uuid REFERENCES manmec_warehouses(id),
  ADD COLUMN IF NOT EXISTS vehicle_id   uuid REFERENCES manmec_vehicles(id),
  ALTER COLUMN station_id DROP NOT NULL;

DROP POLICY IF EXISTS "movements_insert" ON manmec_inventory_movements;
CREATE POLICY "movements_insert" ON manmec_inventory_movements
  FOR INSERT WITH CHECK (
    (station_id IN (SELECT id FROM manmec_service_stations WHERE organization_id = manmec_my_org_id()))
    OR
    (warehouse_id IN (SELECT id FROM manmec_warehouses WHERE organization_id = manmec_my_org_id()))
  );

DROP POLICY IF EXISTS "movements_select" ON manmec_inventory_movements;
CREATE POLICY "movements_select" ON manmec_inventory_movements
  FOR SELECT USING (
    (station_id IN (SELECT id FROM manmec_service_stations WHERE organization_id = manmec_my_org_id()))
    OR
    (warehouse_id IN (SELECT id FROM manmec_warehouses WHERE organization_id = manmec_my_org_id()))
  );

COMMENT ON COLUMN manmec_inventory_movements.vehicle_id IS 
  'Vehículo al que se le asigna el insumo (salida de bodega hacia furgón).';

-- 5. TRIGGER DE STOCK (SECURITY DEFINER)
CREATE OR REPLACE FUNCTION manmec_fn_update_stock()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  IF NEW.warehouse_id IS NULL THEN RETURN NEW; END IF;

  INSERT INTO manmec_inventory_stock (item_id, warehouse_id, quantity, updated_at)
  VALUES (NEW.item_id, NEW.warehouse_id, 
    CASE WHEN NEW.type = 'OUT' THEN -NEW.quantity ELSE NEW.quantity END, now())
  ON CONFLICT (item_id, warehouse_id)
  DO UPDATE SET
    quantity = manmec_inventory_stock.quantity + 
               (CASE WHEN NEW.type = 'OUT' THEN -NEW.quantity ELSE NEW.quantity END),
    updated_at = now();

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_stock ON manmec_inventory_movements;
CREATE TRIGGER trg_update_stock AFTER INSERT ON manmec_inventory_movements
FOR EACH ROW EXECUTE FUNCTION manmec_fn_update_stock();
