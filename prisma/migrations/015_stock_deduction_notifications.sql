-- ============================================================
-- 015 — Trigger automático de notificaciones por descuento de stock
-- Dispara en cada INSERT con type = 'OUT' en manmec_inventory_movements
-- Notifica a SUPERVISOR / MANAGER / COMPANY_ADMIN de la organización
-- ============================================================

CREATE OR REPLACE FUNCTION manmec_fn_stock_deduction_notification()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_org_id        uuid;
  v_item_name     text;
  v_warehouse_name text := '';
  v_station_name  text := '';
  v_ot_code       text := '';
  v_user_rec      RECORD;
BEGIN
  -- Solo movimientos de salida
  IF NEW.type != 'OUT' THEN
    RETURN NEW;
  END IF;

  -- Ignorar transferencias internas entre bodegas (no son consumos reales)
  IF NEW.reason ILIKE 'Transferencia%' OR NEW.reason ILIKE 'Traspaso%' THEN
    RETURN NEW;
  END IF;

  -- Obtener org e ítem
  SELECT i.organization_id, i.name
    INTO v_org_id, v_item_name
    FROM manmec_inventory_items i
   WHERE i.id = NEW.item_id;

  IF v_org_id IS NULL THEN
    RETURN NEW;
  END IF;

  -- Nombre de la bodega
  IF NEW.warehouse_id IS NOT NULL THEN
    SELECT COALESCE(w.name, '')
      INTO v_warehouse_name
      FROM manmec_warehouses w
     WHERE w.id = NEW.warehouse_id;
  END IF;

  -- Estación y código OT (si viene vinculado a una OT)
  IF NEW.work_order_id IS NOT NULL THEN
    SELECT
      COALESCE(ss.name, ss.code, ''),
      COALESCE(wo.external_id, wo.sap_order_id, wo.id::text, '')
    INTO v_station_name, v_ot_code
    FROM manmec_work_orders wo
    LEFT JOIN manmec_service_stations ss ON ss.id = wo.station_id
    WHERE wo.id = NEW.work_order_id;
  END IF;

  -- Insertar una notificación por cada supervisor/manager/admin del org
  FOR v_user_rec IN
    SELECT id
      FROM manmec_users
     WHERE organization_id = v_org_id
       AND is_active = true
       AND role IN ('SUPERVISOR', 'MANAGER', 'COMPANY_ADMIN')
  LOOP
    INSERT INTO manmec_notifications (
      organization_id,
      user_id,
      type,
      title,
      body,
      payload
    ) VALUES (
      v_org_id,
      v_user_rec.id,
      'stock_deduction',
      'Descuento: ' || v_item_name,
      'Se descontaron ' || NEW.quantity || ' unid.'
        || CASE WHEN v_station_name <> '' THEN ' — ' || v_station_name ELSE '' END
        || CASE WHEN v_warehouse_name <> '' THEN ' (' || v_warehouse_name || ')' ELSE '' END,
      jsonb_build_object(
        'item_name',      v_item_name,
        'quantity',       NEW.quantity,
        'warehouse_name', v_warehouse_name,
        'station_name',   v_station_name,
        'ot_id',          NEW.work_order_id,
        'ot_code',        v_ot_code,
        'reason',         COALESCE(NEW.reason, '')
      )
    );
  END LOOP;

  RETURN NEW;
END;
$$;

-- Eliminar si ya existe para poder recrear limpio
DROP TRIGGER IF EXISTS manmec_trg_stock_deduction_notification
  ON manmec_inventory_movements;

CREATE TRIGGER manmec_trg_stock_deduction_notification
  AFTER INSERT ON manmec_inventory_movements
  FOR EACH ROW
  EXECUTE FUNCTION manmec_fn_stock_deduction_notification();
