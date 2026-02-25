-- ============================================================
-- MANMEC IA — Parche 002: OT Multi-mecánico, Tipos y Timeline
-- Instrucciones: Pegar en Supabase Studio → SQL Editor → Run
-- Ejecutar DESPUÉS de 001_manmec_init.sql
-- ============================================================


-- ============================================================
-- 1. NUEVO ENUM: tipo de OT
-- ============================================================
DO $$ BEGIN
  CREATE TYPE manmec_ot_type AS ENUM ('CORRECTIVE', 'PREVENTIVE');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;


-- ============================================================
-- 2. MODIFICAR manmec_work_orders
--    + ot_type (correctiva/preventiva)
--    + recurrence_interval_days (solo preventivas)
--    + assigned_to pasa a ser "mecánico líder" (mantener para compatibilidad)
-- ============================================================
ALTER TABLE manmec_work_orders
  ADD COLUMN IF NOT EXISTS ot_type                  manmec_ot_type NOT NULL DEFAULT 'CORRECTIVE',
  ADD COLUMN IF NOT EXISTS recurrence_interval_days integer;       -- NULL=no recurrente, 30=mensual, 90=trimestral

COMMENT ON COLUMN manmec_work_orders.ot_type IS
  'CORRECTIVE = falla reportada. PREVENTIVE = mantenimiento programado.';
COMMENT ON COLUMN manmec_work_orders.recurrence_interval_days IS
  'Solo para OTs PREVENTIVE. Días entre cada recurrencia. NULL = única vez.';
COMMENT ON COLUMN manmec_work_orders.assigned_to IS
  'Mecánico líder/responsable principal. Para el equipo completo ver manmec_work_order_assignments.';


-- ============================================================
-- 3. NUEVA TABLA: manmec_work_order_assignments
--    Múltiples mecánicos por OT
-- ============================================================
CREATE TABLE IF NOT EXISTS manmec_work_order_assignments (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id   uuid        NOT NULL REFERENCES manmec_work_orders(id) ON DELETE CASCADE,
  mechanic_id     uuid        NOT NULL REFERENCES manmec_users(id)       ON DELETE CASCADE,
  role            text        NOT NULL DEFAULT 'support'
                              CHECK (role IN ('lead', 'support')),
  assigned_at     timestamptz NOT NULL DEFAULT now(),
  assigned_by     uuid        REFERENCES manmec_users(id),
  CONSTRAINT uq_wo_mechanic UNIQUE (work_order_id, mechanic_id)
);

COMMENT ON TABLE manmec_work_order_assignments IS
  'Equipo de mecánicos asignados a una OT. role=lead es el responsable principal.';
COMMENT ON COLUMN manmec_work_order_assignments.role IS
  'lead = responsable principal (mismo que work_orders.assigned_to). support = mecánico de apoyo.';

CREATE INDEX IF NOT EXISTS idx_wo_assignments_wo
  ON manmec_work_order_assignments(work_order_id);
CREATE INDEX IF NOT EXISTS idx_wo_assignments_mechanic
  ON manmec_work_order_assignments(mechanic_id);


-- ============================================================
-- 4. NUEVA TABLA: manmec_work_order_timeline
--    Historial de avances, cambios de estado y fotos
--    Las fotos se almacenan en DigitalOcean Spaces (solo la URL aquí)
-- ============================================================
CREATE TABLE IF NOT EXISTS manmec_work_order_timeline (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  work_order_id   uuid        NOT NULL REFERENCES manmec_work_orders(id) ON DELETE CASCADE,
  user_id         uuid        NOT NULL REFERENCES manmec_users(id),
  entry_type      text        NOT NULL DEFAULT 'progress'
                              CHECK (entry_type IN (
                                'progress',        -- nota de avance libre
                                'status_change',   -- cambio de estado de la OT
                                'material_added',  -- se agregó material
                                'photo',           -- solo foto con caption
                                'assignment',      -- mecánico asignado/removido
                                'note'             -- nota interna
                              )),
  content         text,                            -- texto del avance / descripción
  photo_url       text,                            -- URL de DigitalOcean Spaces (NO binario)
  photo_thumbnail_url text,                        -- Thumbnail generado en DO Spaces
  metadata        jsonb,                           -- ej: {from_status: 'PENDING', to_status: 'IN_PROGRESS'}
  created_at      timestamptz NOT NULL DEFAULT now()
);

COMMENT ON TABLE manmec_work_order_timeline IS
  'Historial cronológico de una OT. Fotos como URLs de DigitalOcean Spaces, nunca binarios en Supabase.';
COMMENT ON COLUMN manmec_work_order_timeline.photo_url IS
  'URL pública o signed URL de DigitalOcean Spaces. El upload va directo desde el frontend a DO Spaces.';
COMMENT ON COLUMN manmec_work_order_timeline.metadata IS
  'Datos contextuales de la entrada. status_change: {from, to}. material_added: {item_id, quantity}.';

CREATE INDEX IF NOT EXISTS idx_timeline_wo
  ON manmec_work_order_timeline(work_order_id, created_at);
CREATE INDEX IF NOT EXISTS idx_timeline_user
  ON manmec_work_order_timeline(user_id);


-- ============================================================
-- 5. ACTUALIZAR manmec_work_order_photos (deprecar → migrar a timeline)
--    La tabla antigua queda pero el nuevo código usa timeline
-- ============================================================
COMMENT ON TABLE manmec_work_order_photos IS
  'DEPRECADO: usar manmec_work_order_timeline con entry_type=photo. Esta tabla se mantiene por compatibilidad.';


-- ============================================================
-- 6. TRIGGER: auto-insertar en timeline al cambiar estado de OT
-- ============================================================
CREATE OR REPLACE FUNCTION manmec_fn_timeline_status_change()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  -- Solo si el status realmente cambió
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO manmec_work_order_timeline (
      work_order_id, user_id, entry_type, content, metadata
    ) VALUES (
      NEW.id,
      auth.uid(),
      'status_change',
      'Estado actualizado: ' || OLD.status::text || ' → ' || NEW.status::text,
      jsonb_build_object(
        'from_status', OLD.status::text,
        'to_status',   NEW.status::text,
        'changed_by',  auth.uid()
      )
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_timeline_status_change ON manmec_work_orders;
CREATE TRIGGER trg_timeline_status_change
  AFTER UPDATE ON manmec_work_orders
  FOR EACH ROW EXECUTE FUNCTION manmec_fn_timeline_status_change();


-- ============================================================
-- 7. RLS para las nuevas tablas
-- ============================================================

-- manmec_work_order_assignments
ALTER TABLE manmec_work_order_assignments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "wo_assign_select" ON manmec_work_order_assignments
  FOR SELECT USING (
    work_order_id IN (
      SELECT id FROM manmec_work_orders
      WHERE organization_id = manmec_my_org_id()
    )
  );

CREATE POLICY "wo_assign_manage" ON manmec_work_order_assignments
  FOR ALL USING (
    work_order_id IN (
      SELECT id FROM manmec_work_orders
      WHERE organization_id = manmec_my_org_id()
    )
    AND manmec_my_role() IN ('COMPANY_ADMIN', 'MANAGER', 'SUPERVISOR')
  );

-- manmec_work_order_timeline
ALTER TABLE manmec_work_order_timeline ENABLE ROW LEVEL SECURITY;

-- Todos los que pueden ver la OT pueden ver su timeline
CREATE POLICY "timeline_select" ON manmec_work_order_timeline
  FOR SELECT USING (
    work_order_id IN (
      SELECT id FROM manmec_work_orders
      WHERE organization_id = manmec_my_org_id()
      AND deleted_at IS NULL
    )
  );

-- Cualquier usuario asignado a la OT puede agregar entradas
CREATE POLICY "timeline_insert_assigned" ON manmec_work_order_timeline
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND work_order_id IN (
      SELECT work_order_id FROM manmec_work_order_assignments
      WHERE mechanic_id = auth.uid()
      UNION
      SELECT id FROM manmec_work_orders
      WHERE assigned_to = auth.uid()
    )
  );

-- Managers y supervisores pueden agregar entradas en cualquier OT de su org
CREATE POLICY "timeline_insert_managers" ON manmec_work_order_timeline
  FOR INSERT WITH CHECK (
    user_id = auth.uid()
    AND work_order_id IN (
      SELECT id FROM manmec_work_orders
      WHERE organization_id = manmec_my_org_id()
    )
    AND manmec_my_role() IN ('COMPANY_ADMIN', 'MANAGER', 'SUPERVISOR')
  );


-- ============================================================
-- FIN DEL PARCHE 002
-- ============================================================
-- Verificar:
-- SELECT column_name, data_type FROM information_schema.columns
-- WHERE table_name = 'manmec_work_orders'
-- AND column_name IN ('ot_type', 'recurrence_interval_days');
