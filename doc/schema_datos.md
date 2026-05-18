# Esquema de Datos - Manmec IA

Este documento describe la estructura de la base de datos del proyecto Manmec IA, basada en el esquema de Prisma y las migraciones de PostgreSQL.

## Modelos Principales

### 1. Organizaciones (`manmec_organizations`)
Define los tenants o empresas que utilizan el sistema.
- **Campos clave**: `id`, `name`, `rut`, `plan`, `settings`, `ai_settings`.
- **Relaciones**: Es el nodo raíz para usuarios, estaciones, órdenes de trabajo e inventario.

### 2. Usuarios (`manmec_users`)
Usuarios vinculados a una organización con roles específicos.
- **Roles**: `COMPANY_ADMIN`, `MANAGER`, `SUPERVISOR`, `MECHANIC`.
- **Campos clave**: `full_name`, `role`, `telegram_chat_id`, `is_active`.

### 3. Estaciones de Servicio (`manmec_service_stations`)
Ubicaciones físicas donde se realizan los servicios.
- **Campos clave**: `name`, `code` (SAP), `address`, `location_type` (e.g., "Estacion Industrial"), `commune`.
- **Campos SAP**: `sap_store_code`, `sap_store_id`, `brand`, `segment`, `cluster`.

### 4. Órdenes de Trabajo (`manmec_work_orders`)
El núcleo operativo del sistema.
- **Estados**: `PENDING`, `ASSIGNED`, `IN_PROGRESS`, `PAUSED`, `COMPLETED`, `CANCELLED`.
- **Prioridades**: `P1`, `P2`, `P3`, `P4`, `PM` (Preventivo).
- **Tipos**: `CORRECTIVE`, `PREVENTIVE`.
- **Relaciones**: Vinculada a una estación, un creador y un asignado.

### 5. Inventario y Bodegas
- **`manmec_warehouses`**: Bodegas fijas o furgones móviles (vinculados a un vehículo).
- **`manmec_inventory_items`**: Catálogo de productos/repuestos.
- **`manmec_inventory_stock`**: Saldo actual por ítem y bodega.
- **`manmec_inventory_movements`**: Historial inmutable de entradas, salidas y transferencias.

### 6. IA y Automatización
- **`manmec_ai_actions`**: Alertas y acciones proactivas generadas por el motor de IA.
- **`manmec_voice_commands`**: Transcripciones e interpretaciones de comandos de voz.
- **`manmec_ai_conversations`**: Chat histórico con el asistente IA (Text-to-SQL).

### 7. Auditoría y Seguridad
- **`manmec_audit_log`**: Registro inmutable de cambios en las tablas críticas.
- **`manmec_telegram_tokens`**: Validación de seguridad para vinculación con Telegram.

---
*Última actualización: 30 de Abril, 2026*
