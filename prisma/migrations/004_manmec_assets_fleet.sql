-- ============================================================
-- MANMEC IA — Parche 004: Gestión de Flota, Herramientas y Recepción
-- Instrucciones: Pegar en Supabase Studio → SQL Editor → Run
-- Ejecutar DESPUÉS de 001, 002 y 003
-- ============================================================

-- -----------------------------------------------------------
-- 1. Gestión de Vehículos (Flota)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_vehicles (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES manmec_organizations(id) ON DELETE CASCADE,
  plate           text        NOT NULL,                      -- Patente
  brand           text,
  model           text,
  year            integer,
  vin             text,                                      -- Número de chasis
  last_mileage    numeric     DEFAULT 0,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_vehicles_plate_org 
  ON manmec_vehicles(plate, organization_id) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------
-- 2. Catastro de Herramientas (Activos Serializados)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_tools (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES manmec_organizations(id) ON DELETE CASCADE,
  serial_number   text        NOT NULL,
  name            text        NOT NULL,
  brand           text,
  model           text,
  category        text,                                      -- Taladros, Medidores, etc.
  status          text        NOT NULL DEFAULT 'available'
                              CHECK (status IN ('available', 'in_use', 'repair', 'lost', 'retired')),
  assigned_user_id uuid       REFERENCES manmec_users(id),
  assigned_vehicle_id uuid    REFERENCES manmec_vehicles(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_tools_serial_org 
  ON manmec_tools(serial_number, organization_id) WHERE deleted_at IS NULL;

-- -----------------------------------------------------------
-- 3. Recepción de Camiones (Guías de Despacho)
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_shipments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES manmec_organizations(id) ON DELETE CASCADE,
  supplier_name   text,
  dispatch_note_number text,                                 -- Número de Guía
  dispatch_note_url text,                                    -- Foto en Storage
  ocr_data        jsonb,                                     -- Resultado de Gemini Vision
  status          text        NOT NULL DEFAULT 'PENDING'
                              CHECK (status IN ('PENDING', 'RECEIVED', 'VARIANCES', 'CANCELLED')),
  received_by     uuid        REFERENCES manmec_users(id),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS manmec_shipment_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  shipment_id     uuid        NOT NULL REFERENCES manmec_shipments(id) ON DELETE CASCADE,
  item_id         uuid        NOT NULL REFERENCES manmec_inventory_items(id),
  expected_qty    numeric     NOT NULL,
  received_qty    numeric     DEFAULT 0,
  unit_price      numeric,
  notes           text
);

-- -----------------------------------------------------------
-- 4. Modificaciones a Órdenes de Trabajo
-- -----------------------------------------------------------
ALTER TABLE manmec_work_orders 
  ADD COLUMN IF NOT EXISTS vehicle_id uuid REFERENCES manmec_vehicles(id);

COMMENT ON COLUMN manmec_work_orders.vehicle_id IS 
  'Vehículo (furgón) asignado para atender esta OT.';

-- -----------------------------------------------------------
-- 5. RLS (Row Level Security)
-- -----------------------------------------------------------
ALTER TABLE manmec_vehicles       ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_tools          ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_shipments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_shipment_items ENABLE ROW LEVEL SECURITY;

-- Vehículos y Herramientas: Todos leen los de su org, solo supervisores/admins editan
CREATE POLICY "vehicles_select" ON manmec_vehicles FOR SELECT USING (organization_id = manmec_my_org_id());
CREATE POLICY "vehicles_all_managers" ON manmec_vehicles FOR ALL USING (organization_id = manmec_my_org_id() AND manmec_is_manager());

CREATE POLICY "tools_select" ON manmec_tools FOR SELECT USING (organization_id = manmec_my_org_id());
CREATE POLICY "tools_all_managers" ON manmec_tools FOR ALL USING (organization_id = manmec_my_org_id() AND manmec_is_manager());

-- Shipments: Solo managers/supervisores pueden crear/ver recepciones de carga
CREATE POLICY "shipments_select" ON manmec_shipments FOR SELECT 
  USING (organization_id = manmec_my_org_id() AND manmec_my_role() IN ('COMPANY_ADMIN', 'MANAGER', 'SUPERVISOR'));

CREATE POLICY "shipments_insert" ON manmec_shipments FOR INSERT 
  WITH CHECK (organization_id = manmec_my_org_id() AND manmec_my_role() IN ('COMPANY_ADMIN', 'MANAGER', 'SUPERVISOR'));

CREATE POLICY "shipment_items_select" ON manmec_shipment_items FOR SELECT 
  USING (EXISTS (SELECT 1 FROM manmec_shipments s WHERE s.id = shipment_id AND s.organization_id = manmec_my_org_id()));

-- -----------------------------------------------------------
-- 6. Triggers updated_at
-- -----------------------------------------------------------
CREATE TRIGGER trg_updated_vehicles BEFORE UPDATE ON manmec_vehicles FOR EACH ROW EXECUTE FUNCTION manmec_fn_set_updated_at();
CREATE TRIGGER trg_updated_tools    BEFORE UPDATE ON manmec_tools    FOR EACH ROW EXECUTE FUNCTION manmec_fn_set_updated_at();
CREATE TRIGGER trg_updated_shipments BEFORE UPDATE ON manmec_shipments FOR EACH ROW EXECUTE FUNCTION manmec_fn_set_updated_at();
