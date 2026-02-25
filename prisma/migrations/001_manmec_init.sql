-- ============================================================
-- MANMEC IA — Migración Inicial Completa
-- Versión: MVP 1.0.0
-- Fecha: 2026-02-24
-- Instrucciones: Pegar completo en Supabase Studio → SQL Editor → Run
-- ============================================================


-- ============================================================
-- 0. EXTENSIONES
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "pgcrypto";     -- gen_random_uuid()
-- NOTA: pg_net ya viene instalado en Supabase self-hosted, no reinstalar


-- ============================================================
-- 1. ENUMs
-- ============================================================
DO $$ BEGIN
  CREATE TYPE manmec_user_role AS ENUM (
    'COMPANY_ADMIN',
    'MANAGER',
    'SUPERVISOR',
    'MECHANIC'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE manmec_ot_priority AS ENUM ('P1', 'P2', 'P3');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE manmec_ot_status AS ENUM (
    'PENDING',
    'ASSIGNED',
    'IN_PROGRESS',
    'PAUSED',
    'COMPLETED',
    'CANCELLED'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE manmec_movement_type AS ENUM (
    'IN',
    'OUT',
    'ADJUSTMENT',
    'TRANSFER'
  );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

DO $$ BEGIN
  CREATE TYPE manmec_action_severity AS ENUM ('info', 'warning', 'critical');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- 2. TABLAS
-- ============================================================

-- -----------------------------------------------------------
-- 2.1 manmec_organizations
-- Multi-tenancy: cada empresa es un tenant
-- allowed_domains: dominios de Google Workspace autorizados
--   ej: ARRAY['empresa.cl','empresa.com']
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_organizations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text        NOT NULL,
  rut             text        UNIQUE,
  logo_url        text,
  plan            text        NOT NULL DEFAULT 'free',
  allowed_domains text[]      NOT NULL DEFAULT '{}',   -- Google Workspace domains
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);

COMMENT ON COLUMN manmec_organizations.allowed_domains IS
  'Dominios de email autorizados para auto-asignar usuarios. Ej: {empresa.cl,empresa.com}';


-- -----------------------------------------------------------
-- 2.2 manmec_users
-- Perfil extendido vinculado 1:1 con auth.users
-- auth_provider: preparado para Azure AD, Okta, etc. en V2
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_users (
  id              uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  organization_id uuid REFERENCES manmec_organizations(id) ON DELETE SET NULL,
  role            manmec_user_role,                         -- NULL = pendiente de aprobación
  full_name       text        NOT NULL DEFAULT '',
  phone           text,
  avatar_url      text,
  auth_provider   text        NOT NULL DEFAULT 'google',    -- 'google' | 'azure' | 'okta'
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN manmec_users.organization_id IS
  'NULL = usuario autenticado pero sin tenant asignado (muestra pantalla de acceso pendiente)';
COMMENT ON COLUMN manmec_users.auth_provider IS
  'MVP=google. V2: azure, okta, saml';


-- -----------------------------------------------------------
-- 2.3 manmec_supervisor_assignments
-- Qué mecánicos puede ver/gestionar cada supervisor
-- Un mecánico puede tener múltiples supervisores
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_supervisor_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES manmec_organizations(id) ON DELETE CASCADE,
  supervisor_id   uuid        NOT NULL REFERENCES manmec_users(id) ON DELETE CASCADE,
  mechanic_id     uuid        NOT NULL REFERENCES manmec_users(id) ON DELETE CASCADE,
  created_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_supervisor_mechanic UNIQUE (supervisor_id, mechanic_id)
);


-- -----------------------------------------------------------
-- 2.4 manmec_service_stations
-- Estaciones de servicio donde se ejecutan las OTs
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_service_stations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES manmec_organizations(id) ON DELETE CASCADE,
  name            text        NOT NULL,
  address         text,
  latitude        double precision,
  longitude       double precision,
  contact_name    text,
  contact_phone   text,
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);


-- -----------------------------------------------------------
-- 2.5 manmec_work_orders
-- OTs con prioridad P1/P2/P3 — P1 interrumpe rutas en tiempo real
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_work_orders (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid              NOT NULL REFERENCES manmec_organizations(id) ON DELETE CASCADE,
  station_id      uuid              NOT NULL REFERENCES manmec_service_stations(id),
  created_by      uuid              NOT NULL REFERENCES manmec_users(id),
  assigned_to     uuid              REFERENCES manmec_users(id),
  code            text              UNIQUE,                  -- auto: OT-2026-0001
  title           text              NOT NULL,
  description     text,
  priority        manmec_ot_priority NOT NULL DEFAULT 'P3',
  status          manmec_ot_status   NOT NULL DEFAULT 'PENDING',
  scheduled_date  date,
  started_at      timestamptz,
  completed_at    timestamptz,
  source          text              NOT NULL DEFAULT 'manual', -- manual | voice | ai_suggestion
  created_at      timestamptz       NOT NULL DEFAULT now(),
  updated_at      timestamptz       NOT NULL DEFAULT now(),
  deleted_at      timestamptz
);


-- -----------------------------------------------------------
-- 2.6 manmec_work_order_tasks
-- Checklist de tareas dentro de cada OT
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_work_order_tasks (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id   uuid        NOT NULL REFERENCES manmec_work_orders(id) ON DELETE CASCADE,
  description     text        NOT NULL,
  is_completed    boolean     NOT NULL DEFAULT false,
  completed_at    timestamptz,
  sort_order      integer     NOT NULL DEFAULT 0
);


-- -----------------------------------------------------------
-- 2.7 manmec_inventory_items  ← definida ANTES de work_order_materials (FK dependency)
-- Catálogo de repuestos/insumos con soporte barcode
-- barcode_type: formato para lector físico y para impresión de etiquetas
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_inventory_items (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES manmec_organizations(id) ON DELETE CASCADE,
  sku             text,
  barcode         text,
  barcode_type    text        NOT NULL DEFAULT 'CODE128'
                              CHECK (barcode_type IN ('CODE128', 'EAN13', 'EAN8', 'QR', 'ITF')),
  name            text        NOT NULL,
  description     text,
  unit            text        NOT NULL DEFAULT 'unidad',
  min_stock       numeric     NOT NULL DEFAULT 0 CHECK (min_stock >= 0),
  is_active       boolean     NOT NULL DEFAULT true,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON COLUMN manmec_inventory_items.barcode_type IS
  'Formato del código de barras. CODE128 = estándar industrial. EAN13 = productos retail.';


-- -----------------------------------------------------------
-- 2.8 manmec_work_order_materials
-- Materiales usados en una OT
-- INSERT aquí → trigger descuenta stock automáticamente
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_work_order_materials (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id   uuid        NOT NULL REFERENCES manmec_work_orders(id) ON DELETE CASCADE,
  item_id         uuid        NOT NULL REFERENCES manmec_inventory_items(id),
  quantity        numeric     NOT NULL CHECK (quantity > 0),
  notes           text,
  created_at      timestamptz NOT NULL DEFAULT now()
);


-- -----------------------------------------------------------
-- 2.9 manmec_work_order_photos
-- Evidencia fotográfica: antes / durante / después
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_work_order_photos (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id   uuid        NOT NULL REFERENCES manmec_work_orders(id) ON DELETE CASCADE,
  uploaded_by     uuid        NOT NULL REFERENCES manmec_users(id),
  storage_path    text        NOT NULL,
  caption         text,
  photo_type      text        NOT NULL DEFAULT 'progress'
                              CHECK (photo_type IN ('before', 'progress', 'after')),
  created_at      timestamptz NOT NULL DEFAULT now()
);


-- -----------------------------------------------------------
-- 2.10 manmec_inventory_stock
-- Stock actual por ítem por estación
-- ⛔ NUNCA actualizar directamente — solo vía trigger desde movements
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_inventory_stock (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         uuid        NOT NULL REFERENCES manmec_inventory_items(id) ON DELETE CASCADE,
  station_id      uuid        NOT NULL REFERENCES manmec_service_stations(id) ON DELETE CASCADE,
  quantity        numeric     NOT NULL DEFAULT 0 CHECK (quantity >= 0),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_stock_item_station UNIQUE (item_id, station_id)
);


-- -----------------------------------------------------------
-- 2.11 manmec_inventory_movements
-- Historial inmutable de todos los movimientos de inventario
-- RLS: solo INSERT — cero UPDATE/DELETE
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_inventory_movements (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  item_id         uuid                 NOT NULL REFERENCES manmec_inventory_items(id),
  station_id      uuid                 NOT NULL REFERENCES manmec_service_stations(id),
  user_id         uuid                 NOT NULL REFERENCES manmec_users(id),
  work_order_id   uuid                 REFERENCES manmec_work_orders(id),
  type            manmec_movement_type NOT NULL,
  quantity        numeric              NOT NULL,
  reason          text,
  created_at      timestamptz          NOT NULL DEFAULT now()
);


-- -----------------------------------------------------------
-- 2.12 manmec_route_plans
-- Ruta diaria de un mecánico — máximo 1 por mecánico por día
-- DISRUPTED = fue interrumpida por una OT P1
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_route_plans (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES manmec_organizations(id) ON DELETE CASCADE,
  mechanic_id     uuid        NOT NULL REFERENCES manmec_users(id),
  plan_date       date        NOT NULL,
  status          text        NOT NULL DEFAULT 'PLANNED'
                              CHECK (status IN ('PLANNED','IN_PROGRESS','COMPLETED','DISRUPTED')),
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT uq_route_mechanic_date UNIQUE (mechanic_id, plan_date)
);


-- -----------------------------------------------------------
-- 2.13 manmec_route_stops
-- Paradas dentro de una ruta — ordenadas y con tiempos reales
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_route_stops (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  route_plan_id       uuid    NOT NULL REFERENCES manmec_route_plans(id) ON DELETE CASCADE,
  work_order_id       uuid    NOT NULL REFERENCES manmec_work_orders(id),
  station_id          uuid    NOT NULL REFERENCES manmec_service_stations(id),
  sort_order          integer NOT NULL,
  estimated_arrival   timestamptz,
  actual_arrival      timestamptz,
  actual_departure    timestamptz,
  status              text    NOT NULL DEFAULT 'PENDING'
                              CHECK (status IN ('PENDING','EN_ROUTE','ARRIVED','COMPLETED','SKIPPED'))
);


-- -----------------------------------------------------------
-- 2.14 manmec_notifications
-- Alertas en tiempo real — escuchadas vía Supabase Realtime
-- P1_INTERRUPT se genera automáticamente por trigger
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_notifications (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES manmec_organizations(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES manmec_users(id) ON DELETE CASCADE,
  type            text        NOT NULL
                              CHECK (type IN ('P1_INTERRUPT','STOCK_ALERT','AI_ACTION','ROUTE_CHANGE')),
  title           text        NOT NULL,
  body            text,
  payload         jsonb,
  is_read         boolean     NOT NULL DEFAULT false,
  created_at      timestamptz NOT NULL DEFAULT now()
);


-- -----------------------------------------------------------
-- 2.15 manmec_ai_conversations
-- Sesiones de chat con el Asistente Gerencial (Text-to-SQL)
-- Disponible solo para MANAGER, SUPERVISOR, COMPANY_ADMIN
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_ai_conversations (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid        NOT NULL REFERENCES manmec_organizations(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES manmec_users(id),
  title           text,
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now()
);


-- -----------------------------------------------------------
-- 2.16 manmec_ai_messages
-- Mensajes de una conversación IA
-- metadata: tokens, modelo, latencia, sql_generated
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_ai_messages (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id uuid        NOT NULL REFERENCES manmec_ai_conversations(id) ON DELETE CASCADE,
  role            text        NOT NULL CHECK (role IN ('user','assistant','system')),
  content         text        NOT NULL,
  metadata        jsonb,
  created_at      timestamptz NOT NULL DEFAULT now()
);


-- -----------------------------------------------------------
-- 2.17 manmec_ai_actions
-- Dashboard IA: registro de todas las acciones proactivas de la IA
-- is_acknowledged: el humano vio y aceptó la acción
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_ai_actions (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id     uuid                   NOT NULL REFERENCES manmec_organizations(id) ON DELETE CASCADE,
  action_type         text                   NOT NULL
                      CHECK (action_type IN (
                        'STOCK_ALERT','ROUTE_SUGGESTION','OT_CREATED',
                        'INVENTORY_ADJUSTMENT','PERFORMANCE_INSIGHT'
                      )),
  title               text                   NOT NULL,
  description         text,
  severity            manmec_action_severity NOT NULL DEFAULT 'info',
  related_entity_type text,
  related_entity_id   uuid,
  is_acknowledged     boolean                NOT NULL DEFAULT false,
  acknowledged_by     uuid REFERENCES manmec_users(id),
  created_at          timestamptz            NOT NULL DEFAULT now()
);


-- -----------------------------------------------------------
-- 2.18 manmec_voice_commands
-- Registro de comandos de voz → transcripción → OT
-- audio_storage_path: ruta en MinIO/Storage
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_voice_commands (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id      uuid        NOT NULL REFERENCES manmec_organizations(id) ON DELETE CASCADE,
  user_id              uuid        NOT NULL REFERENCES manmec_users(id),
  audio_storage_path   text,
  transcription        text,
  ai_interpretation    jsonb,                               -- {intent, entities, confidence}
  resulting_action     text        DEFAULT 'NONE'
                       CHECK (resulting_action IN ('OT_CREATED','OT_UPDATED','NONE')),
  resulting_entity_id  uuid,
  status               text        NOT NULL DEFAULT 'PROCESSING'
                       CHECK (status IN ('PROCESSING','COMPLETED','FAILED')),
  created_at           timestamptz NOT NULL DEFAULT now()
);


-- -----------------------------------------------------------
-- 2.19 manmec_audit_log
-- Auditoría inmutable — solo INSERT vía triggers, nunca desde cliente
-- -----------------------------------------------------------
CREATE TABLE IF NOT EXISTS manmec_audit_log (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  organization_id uuid,
  user_id         uuid,
  action          text        NOT NULL CHECK (action IN ('INSERT','UPDATE','DELETE')),
  table_name      text        NOT NULL,
  record_id       uuid,
  old_data        jsonb,
  new_data        jsonb,
  ip_address      text,
  created_at      timestamptz NOT NULL DEFAULT now()
);


-- ============================================================
-- 3. ÍNDICES
-- ============================================================

-- organizaciones
CREATE INDEX IF NOT EXISTS idx_users_org          ON manmec_users(organization_id);
CREATE INDEX IF NOT EXISTS idx_stations_org       ON manmec_service_stations(organization_id);
CREATE INDEX IF NOT EXISTS idx_items_org          ON manmec_inventory_items(organization_id);

-- OTs
CREATE INDEX IF NOT EXISTS idx_wo_assigned_status ON manmec_work_orders(assigned_to, status, scheduled_date);
CREATE INDEX IF NOT EXISTS idx_wo_station_status  ON manmec_work_orders(station_id, status);
CREATE INDEX IF NOT EXISTS idx_wo_org             ON manmec_work_orders(organization_id);
CREATE INDEX IF NOT EXISTS idx_wo_priority        ON manmec_work_orders(priority) WHERE deleted_at IS NULL;

-- Inventario
CREATE UNIQUE INDEX IF NOT EXISTS idx_items_barcode
  ON manmec_inventory_items(organization_id, barcode)
  WHERE barcode IS NOT NULL;

-- Rutas
CREATE INDEX IF NOT EXISTS idx_routes_org         ON manmec_route_plans(organization_id);

-- Notificaciones
CREATE INDEX IF NOT EXISTS idx_notif_user_unread  ON manmec_notifications(user_id, is_read, created_at);

-- Auditoría
CREATE INDEX IF NOT EXISTS idx_audit_entity       ON manmec_audit_log(table_name, record_id, created_at);

-- Asignaciones supervisor
CREATE INDEX IF NOT EXISTS idx_assign_supervisor  ON manmec_supervisor_assignments(supervisor_id);
CREATE INDEX IF NOT EXISTS idx_assign_mechanic    ON manmec_supervisor_assignments(mechanic_id);


-- ============================================================
-- 4. REALTIME
-- Activar Realtime en tablas que requieren push en tiempo real
-- ============================================================
ALTER TABLE manmec_notifications      REPLICA IDENTITY FULL;
ALTER TABLE manmec_work_orders        REPLICA IDENTITY FULL;
ALTER TABLE manmec_inventory_stock    REPLICA IDENTITY FULL;

-- Agregar al publication de Supabase Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE manmec_notifications;
ALTER PUBLICATION supabase_realtime ADD TABLE manmec_work_orders;
ALTER PUBLICATION supabase_realtime ADD TABLE manmec_inventory_stock;


-- ============================================================
-- 5. TRIGGERS Y FUNCIONES
-- ============================================================

-- -----------------------------------------------------------
-- 5.1 Auto-crear perfil de usuario al registrarse con Google
-- Lógica:
--   1. Extrae el dominio del email
--   2. Busca si existe una org con ese dominio en allowed_domains
--   3. Si hay match → asigna org y rol MECHANIC por defecto
--   4. Si no hay match → crea perfil sin org (acceso pendiente)
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION manmec_fn_create_user_profile()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_email         text;
  v_domain        text;
  v_org_id        uuid;
  v_full_name     text;
  v_avatar_url    text;
  v_provider      text;
BEGIN
  v_email      := NEW.email;
  v_domain     := split_part(v_email, '@', 2);
  v_full_name  := COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', v_email);
  v_avatar_url := NEW.raw_user_meta_data->>'avatar_url';
  v_provider   := COALESCE(NEW.raw_app_meta_data->>'provider', 'google');

  -- Buscar organización por dominio
  SELECT id INTO v_org_id
  FROM manmec_organizations
  WHERE v_domain = ANY(allowed_domains)
    AND deleted_at IS NULL
  LIMIT 1;

  INSERT INTO manmec_users (
    id, organization_id, role, full_name, avatar_url, auth_provider
  ) VALUES (
    NEW.id,
    v_org_id,                                             -- NULL si no hay match de dominio
    CASE WHEN v_org_id IS NOT NULL THEN 'MECHANIC'::manmec_user_role ELSE NULL END,
    v_full_name,
    v_avatar_url,
    v_provider
  )
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_create_user_profile ON auth.users;
CREATE TRIGGER trg_create_user_profile
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION manmec_fn_create_user_profile();


-- -----------------------------------------------------------
-- 5.2 Auto-generar código de OT: OT-YYYY-NNNN
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION manmec_fn_generate_ot_code()
RETURNS trigger
LANGUAGE plpgsql
AS $$
DECLARE
  v_year  text;
  v_count integer;
BEGIN
  IF NEW.code IS NOT NULL THEN
    RETURN NEW;
  END IF;

  v_year := to_char(now(), 'YYYY');

  SELECT COUNT(*) + 1 INTO v_count
  FROM manmec_work_orders
  WHERE organization_id = NEW.organization_id
    AND to_char(created_at, 'YYYY') = v_year;

  NEW.code := 'OT-' || v_year || '-' || lpad(v_count::text, 4, '0');
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_generate_ot_code ON manmec_work_orders;
CREATE TRIGGER trg_generate_ot_code
  BEFORE INSERT ON manmec_work_orders
  FOR EACH ROW EXECUTE FUNCTION manmec_fn_generate_ot_code();


-- -----------------------------------------------------------
-- 5.3 Actualizar stock atómicamente al insertar un movimiento
-- Usa INSERT ... ON CONFLICT DO UPDATE para evitar race conditions
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION manmec_fn_update_stock()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  INSERT INTO manmec_inventory_stock (item_id, station_id, quantity, updated_at)
  VALUES (NEW.item_id, NEW.station_id, NEW.quantity, now())
  ON CONFLICT (item_id, station_id)
  DO UPDATE SET
    quantity   = manmec_inventory_stock.quantity + EXCLUDED.quantity,
    updated_at = now();

  -- Verificar que el resultado no sea negativo (doble seguridad)
  IF (SELECT quantity FROM manmec_inventory_stock
      WHERE item_id = NEW.item_id AND station_id = NEW.station_id) < 0 THEN
    RAISE EXCEPTION 'Stock insuficiente para el ítem % en la estación %', NEW.item_id, NEW.station_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_update_stock ON manmec_inventory_movements;
CREATE TRIGGER trg_update_stock
  AFTER INSERT ON manmec_inventory_movements
  FOR EACH ROW EXECUTE FUNCTION manmec_fn_update_stock();


-- -----------------------------------------------------------
-- 5.4 Notificación P1: al asignar o cambiar una OT a P1
-- Crea una notificación para el mecánico asignado
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION manmec_fn_p1_notification()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Disparar solo si priority es P1 Y hubo cambio real (insert o cambio de priority/assigned_to)
  IF NEW.priority = 'P1' AND NEW.assigned_to IS NOT NULL THEN
    IF (TG_OP = 'INSERT') OR
       (TG_OP = 'UPDATE' AND (OLD.priority <> 'P1' OR OLD.assigned_to IS DISTINCT FROM NEW.assigned_to))
    THEN
      INSERT INTO manmec_notifications (
        organization_id, user_id, type, title, body, payload
      ) VALUES (
        NEW.organization_id,
        NEW.assigned_to,
        'P1_INTERRUPT',
        '🚨 OT Prioritaria P1: ' || NEW.title,
        'Se te asignó una orden de trabajo urgente en ' || NEW.station_id::text,
        jsonb_build_object(
          'work_order_id', NEW.id,
          'code',          NEW.code,
          'station_id',    NEW.station_id,
          'priority',      'P1'
        )
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_p1_notification ON manmec_work_orders;
CREATE TRIGGER trg_p1_notification
  AFTER INSERT OR UPDATE ON manmec_work_orders
  FOR EACH ROW EXECUTE FUNCTION manmec_fn_p1_notification();


-- -----------------------------------------------------------
-- 5.5 Auditoría de OTs
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION manmec_fn_audit_work_orders()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO manmec_audit_log (
    organization_id, user_id, action, table_name, record_id, old_data, new_data
  ) VALUES (
    COALESCE(NEW.organization_id, OLD.organization_id),
    auth.uid(),
    TG_OP,
    'manmec_work_orders',
    COALESCE(NEW.id, OLD.id),
    CASE WHEN TG_OP = 'INSERT' THEN NULL ELSE to_jsonb(OLD) END,
    CASE WHEN TG_OP = 'DELETE' THEN NULL ELSE to_jsonb(NEW) END
  );
  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_work_orders ON manmec_work_orders;
CREATE TRIGGER trg_audit_work_orders
  AFTER INSERT OR UPDATE OR DELETE ON manmec_work_orders
  FOR EACH ROW EXECUTE FUNCTION manmec_fn_audit_work_orders();


-- -----------------------------------------------------------
-- 5.6 Auditoría de movimientos de inventario
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION manmec_fn_audit_inventory()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO manmec_audit_log (
    organization_id, user_id, action, table_name, record_id, new_data
  )
  SELECT
    s.organization_id,
    auth.uid(),
    'INSERT',
    'manmec_inventory_movements',
    NEW.id,
    to_jsonb(NEW)
  FROM manmec_service_stations s
  WHERE s.id = NEW.station_id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_audit_inventory ON manmec_inventory_movements;
CREATE TRIGGER trg_audit_inventory
  AFTER INSERT ON manmec_inventory_movements
  FOR EACH ROW EXECUTE FUNCTION manmec_fn_audit_inventory();


-- -----------------------------------------------------------
-- 5.7 Auto-actualizar updated_at en tablas principales
-- -----------------------------------------------------------
CREATE OR REPLACE FUNCTION manmec_fn_set_updated_at()
RETURNS trigger LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE OR REPLACE TRIGGER trg_updated_organizations
  BEFORE UPDATE ON manmec_organizations
  FOR EACH ROW EXECUTE FUNCTION manmec_fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_updated_users
  BEFORE UPDATE ON manmec_users
  FOR EACH ROW EXECUTE FUNCTION manmec_fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_updated_stations
  BEFORE UPDATE ON manmec_service_stations
  FOR EACH ROW EXECUTE FUNCTION manmec_fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_updated_work_orders
  BEFORE UPDATE ON manmec_work_orders
  FOR EACH ROW EXECUTE FUNCTION manmec_fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_updated_inventory_items
  BEFORE UPDATE ON manmec_inventory_items
  FOR EACH ROW EXECUTE FUNCTION manmec_fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_updated_routes
  BEFORE UPDATE ON manmec_route_plans
  FOR EACH ROW EXECUTE FUNCTION manmec_fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_updated_ai_conversations
  BEFORE UPDATE ON manmec_ai_conversations
  FOR EACH ROW EXECUTE FUNCTION manmec_fn_set_updated_at();


-- ============================================================
-- 6. ROW LEVEL SECURITY (RLS)
-- ============================================================

-- Habilitar RLS en todas las tablas
ALTER TABLE manmec_organizations            ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_users                    ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_supervisor_assignments   ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_service_stations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_work_orders              ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_work_order_tasks         ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_work_order_materials     ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_work_order_photos        ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_inventory_items          ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_inventory_stock          ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_inventory_movements      ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_route_plans              ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_route_stops              ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_notifications            ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_ai_conversations         ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_ai_messages              ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_ai_actions               ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_voice_commands           ENABLE ROW LEVEL SECURITY;
ALTER TABLE manmec_audit_log                ENABLE ROW LEVEL SECURITY;

-- Helper: obtener organization_id del usuario actual
CREATE OR REPLACE FUNCTION manmec_my_org_id()
RETURNS uuid LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT organization_id FROM manmec_users WHERE id = auth.uid();
$$;

-- Helper: obtener role del usuario actual
CREATE OR REPLACE FUNCTION manmec_my_role()
RETURNS manmec_user_role LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role FROM manmec_users WHERE id = auth.uid();
$$;

-- Helper: ¿es admin o manager?
CREATE OR REPLACE FUNCTION manmec_is_manager()
RETURNS boolean LANGUAGE sql SECURITY DEFINER STABLE AS $$
  SELECT role IN ('COMPANY_ADMIN','MANAGER') FROM manmec_users WHERE id = auth.uid();
$$;

-- -----------------------------------------------------------
-- 6.1 manmec_organizations — solo COMPANY_ADMIN edita, todos leen la propia
-- -----------------------------------------------------------
CREATE POLICY "org_select" ON manmec_organizations
  FOR SELECT USING (id = manmec_my_org_id());

CREATE POLICY "org_update" ON manmec_organizations
  FOR UPDATE USING (id = manmec_my_org_id() AND manmec_my_role() = 'COMPANY_ADMIN');


-- -----------------------------------------------------------
-- 6.2 manmec_users
-- -----------------------------------------------------------
-- Cada user ve su propio perfil siempre
CREATE POLICY "users_select_self" ON manmec_users
  FOR SELECT USING (id = auth.uid());

-- Admin/Manager ven todos los users del tenant
CREATE POLICY "users_select_managers" ON manmec_users
  FOR SELECT USING (
    organization_id = manmec_my_org_id()
    AND manmec_is_manager()
  );

-- Supervisor ve sus mecánicos asignados
CREATE POLICY "users_select_supervisor" ON manmec_users
  FOR SELECT USING (
    manmec_my_role() = 'SUPERVISOR'
    AND id IN (
      SELECT mechanic_id FROM manmec_supervisor_assignments
      WHERE supervisor_id = auth.uid()
    )
  );

-- Solo COMPANY_ADMIN puede crear/modificar usuarios
CREATE POLICY "users_insert" ON manmec_users
  FOR INSERT WITH CHECK (organization_id = manmec_my_org_id() AND manmec_my_role() = 'COMPANY_ADMIN');

CREATE POLICY "users_update" ON manmec_users
  FOR UPDATE USING (
    organization_id = manmec_my_org_id()
    AND (manmec_my_role() = 'COMPANY_ADMIN' OR id = auth.uid())
  );


-- -----------------------------------------------------------
-- 6.3 manmec_supervisor_assignments
-- -----------------------------------------------------------
CREATE POLICY "assign_select" ON manmec_supervisor_assignments
  FOR SELECT USING (organization_id = manmec_my_org_id());

CREATE POLICY "assign_manage" ON manmec_supervisor_assignments
  FOR ALL USING (organization_id = manmec_my_org_id() AND manmec_is_manager());


-- -----------------------------------------------------------
-- 6.4 manmec_service_stations
-- -----------------------------------------------------------
CREATE POLICY "stations_select" ON manmec_service_stations
  FOR SELECT USING (organization_id = manmec_my_org_id() AND deleted_at IS NULL);

CREATE POLICY "stations_manage" ON manmec_service_stations
  FOR ALL USING (organization_id = manmec_my_org_id() AND manmec_is_manager());


-- -----------------------------------------------------------
-- 6.5 manmec_work_orders
-- -----------------------------------------------------------
-- COMPANY_ADMIN y MANAGER ven todo el tenant
CREATE POLICY "wo_select_managers" ON manmec_work_orders
  FOR SELECT USING (
    organization_id = manmec_my_org_id()
    AND manmec_is_manager()
    AND deleted_at IS NULL
  );

-- SUPERVISOR ve las OTs de sus mecánicos asignados
CREATE POLICY "wo_select_supervisor" ON manmec_work_orders
  FOR SELECT USING (
    organization_id = manmec_my_org_id()
    AND manmec_my_role() = 'SUPERVISOR'
    AND assigned_to IN (
      SELECT mechanic_id FROM manmec_supervisor_assignments
      WHERE supervisor_id = auth.uid()
    )
    AND deleted_at IS NULL
  );

-- MECHANIC ve solo sus propias OTs
CREATE POLICY "wo_select_mechanic" ON manmec_work_orders
  FOR SELECT USING (
    organization_id = manmec_my_org_id()
    AND manmec_my_role() = 'MECHANIC'
    AND assigned_to = auth.uid()
    AND deleted_at IS NULL
  );

-- MECHANIC puede actualizar SOLO status y campos operativos de sus OTs
CREATE POLICY "wo_update_mechanic" ON manmec_work_orders
  FOR UPDATE USING (
    organization_id = manmec_my_org_id()
    AND manmec_my_role() = 'MECHANIC'
    AND assigned_to = auth.uid()
  );

-- MANAGER/SUPERVISOR/ADMIN crean y editan OTs
CREATE POLICY "wo_insert" ON manmec_work_orders
  FOR INSERT WITH CHECK (
    organization_id = manmec_my_org_id()
    AND manmec_my_role() IN ('COMPANY_ADMIN','MANAGER','SUPERVISOR')
  );

CREATE POLICY "wo_update_managers" ON manmec_work_orders
  FOR UPDATE USING (
    organization_id = manmec_my_org_id()
    AND manmec_my_role() IN ('COMPANY_ADMIN','MANAGER','SUPERVISOR')
  );


-- -----------------------------------------------------------
-- 6.6 Inventario
-- -----------------------------------------------------------
CREATE POLICY "items_select" ON manmec_inventory_items
  FOR SELECT USING (organization_id = manmec_my_org_id() AND is_active = true);

CREATE POLICY "items_manage" ON manmec_inventory_items
  FOR ALL USING (organization_id = manmec_my_org_id() AND manmec_is_manager());

CREATE POLICY "stock_select" ON manmec_inventory_stock
  FOR SELECT USING (
    station_id IN (
      SELECT id FROM manmec_service_stations WHERE organization_id = manmec_my_org_id()
    )
  );

-- movements: solo INSERT — nunca UPDATE/DELETE
CREATE POLICY "movements_insert" ON manmec_inventory_movements
  FOR INSERT WITH CHECK (
    station_id IN (
      SELECT id FROM manmec_service_stations WHERE organization_id = manmec_my_org_id()
    )
  );

CREATE POLICY "movements_select" ON manmec_inventory_movements
  FOR SELECT USING (
    station_id IN (
      SELECT id FROM manmec_service_stations WHERE organization_id = manmec_my_org_id()
    )
  );


-- -----------------------------------------------------------
-- 6.7 Rutas
-- -----------------------------------------------------------
CREATE POLICY "routes_select_managers" ON manmec_route_plans
  FOR SELECT USING (organization_id = manmec_my_org_id() AND manmec_is_manager());

CREATE POLICY "routes_select_supervisor" ON manmec_route_plans
  FOR SELECT USING (
    organization_id = manmec_my_org_id()
    AND manmec_my_role() = 'SUPERVISOR'
    AND mechanic_id IN (
      SELECT mechanic_id FROM manmec_supervisor_assignments WHERE supervisor_id = auth.uid()
    )
  );

CREATE POLICY "routes_select_mechanic" ON manmec_route_plans
  FOR SELECT USING (
    organization_id = manmec_my_org_id()
    AND mechanic_id = auth.uid()
  );

CREATE POLICY "routes_manage" ON manmec_route_plans
  FOR ALL USING (
    organization_id = manmec_my_org_id()
    AND manmec_my_role() IN ('COMPANY_ADMIN','MANAGER','SUPERVISOR')
  );

CREATE POLICY "stops_select" ON manmec_route_stops
  FOR SELECT USING (
    route_plan_id IN (
      SELECT id FROM manmec_route_plans WHERE organization_id = manmec_my_org_id()
    )
  );

CREATE POLICY "stops_manage" ON manmec_route_stops
  FOR ALL USING (
    route_plan_id IN (
      SELECT id FROM manmec_route_plans WHERE organization_id = manmec_my_org_id()
    )
    AND manmec_my_role() IN ('COMPANY_ADMIN','MANAGER','SUPERVISOR')
  );


-- -----------------------------------------------------------
-- 6.8 Notificaciones — cada usuario ve solo las suyas
-- -----------------------------------------------------------
CREATE POLICY "notif_select" ON manmec_notifications
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "notif_update" ON manmec_notifications
  FOR UPDATE USING (user_id = auth.uid());  -- solo para marcar is_read


-- -----------------------------------------------------------
-- 6.9 IA
-- -----------------------------------------------------------
CREATE POLICY "ai_conv_select" ON manmec_ai_conversations
  FOR SELECT USING (
    organization_id = manmec_my_org_id()
    AND (user_id = auth.uid() OR manmec_is_manager())
  );

CREATE POLICY "ai_conv_insert" ON manmec_ai_conversations
  FOR INSERT WITH CHECK (
    organization_id = manmec_my_org_id()
    AND manmec_my_role() IN ('COMPANY_ADMIN','MANAGER','SUPERVISOR')
  );

CREATE POLICY "ai_msg_select" ON manmec_ai_messages
  FOR SELECT USING (
    conversation_id IN (
      SELECT id FROM manmec_ai_conversations WHERE organization_id = manmec_my_org_id()
    )
  );

CREATE POLICY "ai_msg_insert" ON manmec_ai_messages
  FOR INSERT WITH CHECK (
    conversation_id IN (
      SELECT id FROM manmec_ai_conversations WHERE organization_id = manmec_my_org_id()
    )
  );

CREATE POLICY "ai_actions_select" ON manmec_ai_actions
  FOR SELECT USING (
    organization_id = manmec_my_org_id()
    AND manmec_my_role() IN ('COMPANY_ADMIN','MANAGER','SUPERVISOR')
  );

CREATE POLICY "ai_actions_ack" ON manmec_ai_actions
  FOR UPDATE USING (
    organization_id = manmec_my_org_id()
    AND manmec_my_role() IN ('COMPANY_ADMIN','MANAGER','SUPERVISOR')
  );

CREATE POLICY "voice_select" ON manmec_voice_commands
  FOR SELECT USING (
    organization_id = manmec_my_org_id()
    AND (user_id = auth.uid() OR manmec_is_manager())
  );

CREATE POLICY "voice_insert" ON manmec_voice_commands
  FOR INSERT WITH CHECK (
    organization_id = manmec_my_org_id()
    AND manmec_my_role() IN ('COMPANY_ADMIN','MANAGER','SUPERVISOR')
  );


-- -----------------------------------------------------------
-- 6.10 manmec_audit_log — solo lectura para admins
-- -----------------------------------------------------------
CREATE POLICY "audit_select" ON manmec_audit_log
  FOR SELECT USING (
    organization_id = manmec_my_org_id()
    AND manmec_my_role() IN ('COMPANY_ADMIN','MANAGER')
  );


-- ============================================================
-- 7. DATOS INICIALES (seed mínimo para pruebas)
-- ============================================================

-- Inserta una organización de ejemplo con tu dominio
-- MODIFICA el nombre, rut y allowed_domains antes de ejecutar
/*
INSERT INTO manmec_organizations (name, rut, allowed_domains, plan)
VALUES (
  'Empresa Demo',
  '12.345.678-9',
  ARRAY['tudominio.cl'],    -- reemplaza con el dominio real de Google Workspace
  'pro'
)
ON CONFLICT DO NOTHING;
*/


-- ============================================================
-- FIN DE LA MIGRACIÓN
-- ============================================================
-- Verificar tablas creadas:
-- SELECT table_name FROM information_schema.tables
-- WHERE table_schema = 'public' AND table_name LIKE 'manmec_%'
-- ORDER BY table_name;
