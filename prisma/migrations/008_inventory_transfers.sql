-- ============================================================
-- MANMEC IA — Parche 008: Traspasos Express (Express Transfers)
-- ============================================================

-- Tabla para gestionar el "Handshake" (Apretón de manos) entre bodegas

CREATE TABLE IF NOT EXISTS manmec_inventory_transfers (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id uuid NOT NULL REFERENCES manmec_organizations(id) ON DELETE CASCADE,
    
    -- El emisor y su bodega
    sender_id uuid NOT NULL REFERENCES manmec_users(id),
    from_warehouse_id uuid NOT NULL REFERENCES manmec_warehouses(id),
    
    -- El receptor y su bodega
    receiver_id uuid NOT NULL REFERENCES manmec_users(id),
    to_warehouse_id uuid NOT NULL REFERENCES manmec_warehouses(id),
    
    -- Lo que se transfiere (O Insumo o Herramienta)
    item_id uuid REFERENCES manmec_inventory_items(id),
    quantity numeric(10, 2), -- Solo aplica si es Insumo
    
    tool_id uuid REFERENCES manmec_tools(id), -- Solo aplica si es herramienta unitaria
    
    -- Estado del Traspaso
    status varchar(50) NOT NULL DEFAULT 'PENDING', -- PENDING, COMPLETED, REJECTED, CANCELLED
    notes text,
    
    -- Trazabilidad de Tiempo
    created_at timestamp with time zone NOT NULL DEFAULT now(),
    updated_at timestamp with time zone NOT NULL DEFAULT now(),
    resolved_at timestamp with time zone,
    
    -- Restricción: Debe ser Insumo o Herramienta, no ambos ni ninguno
    CONSTRAINT item_or_tool_check CHECK (
        (item_id IS NOT NULL AND quantity IS NOT NULL AND quantity > 0 AND tool_id IS NULL) 
        OR 
        (tool_id IS NOT NULL AND item_id IS NULL AND quantity IS NULL)
    )
);

-- Índices para búsquedas rápidas en la UI de "Pendientes"
CREATE INDEX IF NOT EXISTS idx_transfers_org ON manmec_inventory_transfers(organization_id);
CREATE INDEX IF NOT EXISTS idx_transfers_receiver ON manmec_inventory_transfers(receiver_id, status);
CREATE INDEX IF NOT EXISTS idx_transfers_sender ON manmec_inventory_transfers(sender_id, status);

COMMENT ON TABLE manmec_inventory_transfers IS 'Gestión de handshake de traspaso en terreno entre mecánicos (Furgón a Furgón)';
