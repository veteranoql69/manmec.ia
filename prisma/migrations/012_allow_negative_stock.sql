-- ============================================================
-- MANMEC IA — Parche 012: Permitir Stock Negativo
-- ============================================================
-- Se modifica la funcion para permitir que el inventario baje de cero,
-- reflejando el principio de realidad fisica: si la OT informa el 
-- repuesto, el repuesto se uso y debe registrarse el descuento,
-- dejando temporalmente la bodega en negativo hasta su auditoria o cuadre.

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
    -- Actualizar Stock
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
                -- REGLA ACTUALIZADA (Parche 012):
                -- Ya no bloqueamos "Stock insuficiente". Si llega a negativo, 
                -- se permite para no romper la realidad del consumo en terreno.
                UPDATE "public"."manmec_inventory_stock" 
                SET quantity = quantity - NEW.quantity, updated_at = now() 
                WHERE id = v_stock.id;
            ELSE
                -- Si no existe la fila, la creamos directamente en negativo
                INSERT INTO "public"."manmec_inventory_stock" (item_id, warehouse_id, quantity) 
                VALUES (NEW.item_id, v_target_warehouse_id, 0 - NEW.quantity);
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
