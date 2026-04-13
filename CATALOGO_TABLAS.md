# Catálogo de Tablas - Manmec IA

Este catálogo detalla la estructura exacta de la base de datos PostgreSQL de Manmec. Su objetivo es servir de referencia para la generación de consultas SQL precisas por parte del Agente de IA en n8n.

## Glosario Tecnológico

* **OT**: Orden de Trabajo (Ticket de mantenimiento).
* **EDS / EESS**: Estación de Servicio (Gasolinera).
* **SKU**: Código identificador único de repuesto.
* **Warehouse**: Bodega de repuestos (puede ser fija o móvil en un furgón).

---

## 1. Núcleo: Órdenes de Trabajo (OT)

### `manmec_work_orders` (Tabla Principal)

Guarda la cabecera de todas las órdenes de trabajo.

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | Identificador único (PK). |
| `external_id` | VARCHAR | **Número de OT/Aviso** visible para el usuario (ej: 12649842). |
| `organization_id` | UUID | Filtro obligatorio por empresa. |
| `station_id` | UUID | FK a la estación de servicio. |
| `assigned_to` | UUID | FK al mecánico principal (**ManmecUser.id**). |
| `title` | TEXT | Título breve del problema reporte. |
| `description` | TEXT | Detalle extenso del trabajo. |
| `status` | ENUM | `PENDING`, `ASSIGNED`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `CANCELLED`. |
| `priority` | ENUM | `P1` (Crítica), `P2`, `P3`, `P4`, `PM` (Preventiva). |
| `ot_type` | ENUM | `CORRECTIVE`, `PREVENTIVE`. |
| `scheduled_date` | DATE | Fecha programada para el trabajo. |
| `created_at` | TIMESTAMPTZ | Fecha de ingreso al sistema. |

### `manmec_work_order_assignments` (Asignaciones de Equipo)

Permite tener múltiples mecánicos en una misma OT.

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `work_order_id` | UUID | ID de la OT. |
| `mechanic_id` | UUID | ID del mecánico (**ManmecUser.id**). |
| `role` | VARCHAR | Rol (`lead`, `support`). |

### `manmec_work_order_timeline` (Historial/Fotos)

Eventos y fotos de avance de la OT.

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `work_order_id` | UUID | ID de la OT. |
| `user_id` | UUID | Usuario que crea la entrada. |
| `entry_type` | VARCHAR | `progress`, `photo`, `status_change`. |
| `content` | TEXT | Comentario del avance. |
| `photo_url` | TEXT | URL de la imagen en Spaces. |

---

## 2. Inventario y Bodegas

### `manmec_inventory_items` (Catálogo de Repuestos)

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | PK. |
| `sku` | VARCHAR | Código interno del repuesto. |
| `name` | VARCHAR | Nombre comercial del repuesto. |
| `description` | TEXT | Especificaciones técnicas. |
| `unit` | VARCHAR | Unidad (unidad, litros, metros). |

### `manmec_warehouses` (Bodegas)

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | PK. |
| `type` | VARCHAR | `FIXED` (Bodega central) o `MOBILE` (Furgón). |
| `vehicle_id` | UUID | Si es móvil, ID del furgón asociado. |
| `name` | VARCHAR | Nombre identificador de la bodega. |

### `manmec_inventory_stock` (Stock Actual)

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `item_id` | UUID | ID del repuesto. |
| `warehouse_id` | UUID | ID de la bodega. |
| `quantity` | DECIMAL | Stock físico disponible. |

### `manmec_work_order_materials` (Consumo de materiales en OT)

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `work_order_id` | UUID | OT donde se usó el material. |
| `item_id` | UUID | ID del repuesto usado. |
| `quantity` | DECIMAL | Cantidad consumida. |

---

## 3. Entidades Geográficas y Personal

### `manmec_service_stations` (Estaciones EESS / EDS)

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | PK. |
| `name` | VARCHAR | Nombre de la estación. |
| `code` | VARCHAR | Código interno/SAP de la estación. |
| `sap_store_code` | VARCHAR | Código de tienda SAP. |
| `address` | TEXT | Dirección física. |
| `commune` | VARCHAR | Comuna. |

### `manmec_users` (Personal)

| Campo | Tipo | Descripción |
| :--- | :--- | :--- |
| `id` | UUID | PK. |
| `full_name` | VARCHAR | Nombre completo. |
| `role` | ENUM | `COMPANY_ADMIN`, `MANAGER`, `SUPERVISOR`, `MECHANIC`. |
| `telegram_chat_id` | VARCHAR | ID para vinculación con Telegram. |
| `is_active` | BOOLEAN | Estado activo/inactivo. |

---

## Tips de Consultas SQL (Best Practices)

1. **Unir OT con Estación y Mecánico Principal**:

   ```sql
   SELECT wo.external_id, wo.title, ss.name AS estacion, u.full_name AS mecanico, wo.status
   FROM manmec_work_orders wo
   JOIN manmec_service_stations ss ON wo.station_id = ss.id
   LEFT JOIN manmec_users u ON wo.assigned_to = u.id
   WHERE wo.organization_id = '{{organization_id}}';
   ```

2. **Calcular Stock Total Global de un SKU**:

   ```sql
   SELECT i.name, SUM(s.quantity) as stock_total
   FROM manmec_inventory_items i
   JOIN manmec_inventory_stock s ON i.id = s.item_id
   WHERE i.name ILIKE '%filtro%'
   GROUP BY i.name;
   ```

3. **Ver Stock por Bodega (Furgón o Central)**:

   ```sql
   SELECT w.name AS bodega, i.name AS repuesto, s.quantity
   FROM manmec_inventory_stock s
   JOIN manmec_inventory_items i ON s.item_id = i.id
   JOIN manmec_warehouses w ON s.warehouse_id = w.id
   WHERE i.sku = 'SKU_BUSCADO';
   ```
