-- ==============================================================================
-- Migration 010: Flota Logística Integral (Bodegas Móviles y Destinos de Guías)
-- ==============================================================================

-- 1. Añadir campos a la tabla de Bodegas para que pueda ser Móvil (Furgón)
ALTER TABLE "public"."manmec_warehouses"
ADD COLUMN "type" text NOT NULL DEFAULT 'FIXED', -- 'FIXED' o 'MOBILE'
ADD COLUMN "vehicle_id" uuid UNIQUE REFERENCES "public"."manmec_vehicles"("id");

-- Hacer que el nombre sea opcional si es una bodega móvil, ya que podemos inferirlo del auto
-- pero por ahora lo dejamos obligatorio y se llenará como "Móvil PYKD-75" en la app.

-- 2. Añadir destino específico a la Recepción de Camiones (Shipments)
ALTER TABLE "public"."manmec_shipments"
ADD COLUMN "destination_warehouse_id" uuid REFERENCES "public"."manmec_warehouses"("id");

-- 3. Crear el Trigger para Auto-Crear "Bodegas Móviles" al registrar un nuevo Vehículo
-- Así Lucho no tiene que crear la bodega a mano
CREATE OR REPLACE FUNCTION public.manmec_auto_create_mobile_warehouse()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO "public"."manmec_warehouses" (
        "id",
        "organization_id",
        "name",
        "type",
        "vehicle_id",
        "is_active"
    ) VALUES (
        gen_random_uuid(),
        NEW."organization_id",
        'Furgón ' || NEW."plate",
        'MOBILE',
        NEW."id",
        true
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enlazar Trigger a creation de Vehículos
DROP TRIGGER IF EXISTS trg_manmec_auto_create_mobile_warehouse ON "public"."manmec_vehicles";
CREATE TRIGGER trg_manmec_auto_create_mobile_warehouse
AFTER INSERT ON "public"."manmec_vehicles"
FOR EACH ROW EXECUTE FUNCTION public.manmec_auto_create_mobile_warehouse();

-- ==============================================================================
-- 4. Modificar Lógica de Consumo (- Stock) para usar la Bodega Móvil en terreno
-- ==============================================================================
-- Actualización a la función existente `manmec_process_inventory_movement()`:
-- El consumo de Materiales en OT ahora buscará restar del vehículo asignado si existe.

CREATE OR REPLACE FUNCTION public.manmec_process_inventory_movement()
RETURNS TRIGGER AS $$
DECLARE
    v_stock RECORD;
    v_target_warehouse_id UUID;
    v_ot_vehicle_id UUID;
BEGIN
    -- Determinar qué bodega vamos a afectar.
    -- Si el movimiento trae un warehouse explicitamente (Ej. TRANSFER), usamos ese.
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

    -- Si todavía no hay bodega (es decir, una OT sin furgón), 
    -- o para evitar fallos de NULL en la inserción antigua, usamos la primera bodega FIJA de la organización por defecto.
    IF v_target_warehouse_id IS NULL AND NEW.station_id IS NOT NULL THEN
        -- Legacy support (si venía station_id, agarramos el pañol central de esa org)
        SELECT id INTO v_target_warehouse_id FROM "public"."manmec_warehouses" 
        WHERE organization_id = (SELECT organization_id FROM "public"."manmec_service_stations" WHERE id = NEW.station_id) 
        AND type = 'FIXED' LIMIT 1;
    END IF;

    -------------------------------------------------------------------------
    -- Actualizar Stock
    -------------------------------------------------------------------------
    -- Usamos v_target_warehouse_id en lugar del de la tabla.
    -- (Nota real: Por integridad referencial, actualizamos NEW antes de continuar)
    -- NOTA IMPORTANTE PARA SUPABASE O POSTGRES:
    -- En un trigger AFTER INSERT is not possible directly update NEW record unless it's BEFORE INSERT. 
    -- We assume the business logic sends the correct warehouse_id. 
    -- Modificamos directmanente la tabla manmec_inventory_stock:

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
                UPDATE "public"."manmec_inventory_stock" 
                SET quantity = quantity - NEW.quantity, updated_at = now() 
                WHERE id = v_stock.id;
            ELSE
                -- En teoría no debería salir algo que no existe, pero forzamos stock negativo para que avisen
                INSERT INTO "public"."manmec_inventory_stock" (item_id, warehouse_id, quantity) 
                VALUES (NEW.item_id, v_target_warehouse_id, -NEW.quantity);
            END IF;

        ELSIF NEW.type = 'ADJUSTMENT' THEN
            -- ... omited logic ... similar update 
            IF FOUND THEN
                UPDATE "public"."manmec_inventory_stock" 
                SET quantity = quantity + NEW.quantity, updated_at = now() 
                WHERE id = v_stock.id;
            END IF;
        END IF;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FIN DE MIGRACION 010
