-- ============================================================
-- MANMEC IA — Parche 011: Fix Split-Brain Trigger de Stock
-- ============================================================

-- 1. Eliminar el trigger antiguo de la migración 005 que utiliza
-- el patrón "INSERT... ON CONFLICT" defectuoso para Postgres.
DROP TRIGGER IF EXISTS trg_update_stock ON "public"."manmec_inventory_movements";

-- 2. Asegurarnos que la Función de la Migración 010 no intente insertar stock negativo en escenarios inválidos.
-- En su lugar, debe arrojar una excepción clara o insertar 0.
CREATE OR REPLACE FUNCTION public.manmec_process_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_stock RECORD;
    v_target_warehouse_id UUID;
    v_ot_vehicle_id UUID;
BEGIN
    -- Determinar qué bodega vamos a afectar.
    v_target_warehouse_id := NEW.warehouse_id;

    -- Si estamos en un movimiento de SALIDA por consumo de OT (tiene work_order_id y type = OUT)
    -- y no declararon un warehouse explícito, busquemos el vehículo de la OT.
    IF NEW.type = 'OUT' AND NEW.work_order_id IS NOT NULL AND v_target_warehouse_id IS NULL THEN
        SELECT vehicle_id INTO v_ot_vehicle_id FROM "public"."manmec_work_orders" WHERE id = NEW.work_order_id;
        
        -- Si la OT tiene un furgón, busquemos la bodega móvil de ese furgón
        IF v_ot_vehicle_id IS NOT NULL THEN
            SELECT id INTO v_target_warehouse_id FROM "public"."manmec_warehouses" 
            WHERE vehicle_id = v_ot_vehicle_id AND type = 'MOBILE' LIMIT 1;
        END IF;
    END IF;

    -- Legacy support (si venía station_id)
    IF v_target_warehouse_id IS NULL AND NEW.station_id IS NOT NULL THEN
        SELECT id INTO v_target_warehouse_id FROM "public"."manmec_warehouses" 
        WHERE organization_id = (SELECT organization_id FROM "public"."manmec_service_stations" WHERE id = NEW.station_id) 
        AND type = 'FIXED' LIMIT 1;
    END IF;

    -------------------------------------------------------------------------
    -- Actualizar Stock de Forma Segura (Sin evaluar INSERT con negativos)
    -------------------------------------------------------------------------
    IF v_target_warehouse_id IS NOT NULL THEN
        -- Buscar stock actual en esa bodega específica
        SELECT * INTO v_stock FROM "public"."manmec_inventory_stock" 
        WHERE item_id = NEW.item_id AND warehouse_id = v_target_warehouse_id;

        IF NEW.type = 'IN' THEN
            IF FOUND THEN
                UPDATE "public"."manmec_inventory_stock" 
                SET quantity = quantity + NEW.quantity, updated_at = now() 
                WHERE id = v_stock.id;
            ELSE
                INSERT INTO "public"."manmec_inventory_stock" (item_id, warehouse_id, quantity) 
                VALUES (NEW.item_id, v_target_warehouse_id, NEW.quantity);
            END IF;

        ELSIF NEW.type = 'OUT' THEN
            IF FOUND THEN
                -- Protegemos que la resta no sea negativa directamente (aunque la DB ya lo bloquea)
                IF (v_stock.quantity - NEW.quantity) < 0 THEN
                   RAISE EXCEPTION 'Stock insuficiente originado por trigger de base de datos.';
                END IF;

                UPDATE "public"."manmec_inventory_stock" 
                SET quantity = quantity - NEW.quantity, updated_at = now() 
                WHERE id = v_stock.id;
            ELSE
                RAISE EXCEPTION 'No se encontro una fila de stock previa en la bodega para descontar.';
            END IF;

        ELSIF NEW.type = 'ADJUSTMENT' THEN
            IF FOUND THEN
                UPDATE "public"."manmec_inventory_stock" 
                SET quantity = quantity + NEW.quantity, updated_at = now() 
                WHERE id = v_stock.id;
            ELSE 
                INSERT INTO "public"."manmec_inventory_stock" (item_id, warehouse_id, quantity) 
                VALUES (NEW.item_id, v_target_warehouse_id, NEW.quantity);
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- 3. Finalmente, enganchar la NUEVA función corregida a la tabla de Movimientos (lo que faltó en la migración 010)
DROP TRIGGER IF EXISTS trg_manmec_process_movement_stock ON "public"."manmec_inventory_movements";

CREATE TRIGGER trg_manmec_process_movement_stock
AFTER INSERT ON "public"."manmec_inventory_movements"
FOR EACH ROW EXECUTE FUNCTION public.manmec_process_inventory_movement();
