# Arquitectura y Stack Tecnológico - Manmec IA

Este documento detalla los componentes tecnológicos y la arquitectura de la aplicación Manmec IA.

## Stack Tecnológico

### Frontend
- **Framework**: Next.js 16 (App Router)
- **Lenguaje**: TypeScript
- **Estilizado**: Tailwind CSS 4 (con diseño moderno y proactivo)
- **Componentes**: Radix UI + Componentes personalizados (Shadcn-like)
- **Animaciones**: Framer Motion
- **Iconografía**: Lucide React

### Backend & Base de Datos
- **Base de Datos**: PostgreSQL (alojado en Supabase)
- **Autenticación**: Supabase Auth
- **ORM**: Prisma 7
- **Infraestructura**: Supabase (Edge Functions, Realtime, Storage)
- **Procesamiento de Voz**: Integración con modelos de IA para transcripción (Whisper/Gemini)

### Inteligencia Artificial
- **Modelo**: Google Gemini Pro (@google/generative-ai)
- **Capacidades**: 
    - Generación de reportes dinámicos vía Text-to-SQL.
    - Acciones proactivas basadas en análisis de stock y SLA de OTs.
    - Interpretación de comandos de voz para creación de OTs.

## Arquitectura de la Aplicación

### 1. Multi-tenant (SaaS)
La aplicación utiliza un modelo de aislamiento basado en `organization_id`. Todos los datos están vinculados a una organización específica, permitiendo que múltiples empresas compartan la misma infraestructura de forma segura.

### 2. Capa de Datos Proactiva
El sistema no es solo un CRUD. Utiliza un motor de alertas (`src/lib/alerts/sla.ts`) que analiza continuamente:
- Retrasos en Órdenes de Trabajo (SLA).
- Inconsistencias de stock.
- Necesidad de mantenimiento preventivo.

### 3. Integración con Telegram
Sistema de notificaciones bidireccional que permite a los mecánicos recibir alertas de nuevas OTs y enviar confirmaciones o fotos directamente desde el campo.

### 4. Logística Móvil
Gestión de bodegas móviles vinculadas a vehículos (`ManmecWarehouse` <-> `ManmecVehicle`), permitiendo transferencias de stock ("Handshake") entre mecánicos en ruta.

### 5. Auditoría
Uso de triggers a nivel de base de datos para poblar `manmec_audit_log`, asegurando que cada cambio crítico sea rastreable independientemente de la capa de aplicación.

---
*Última actualización: 30 de Abril, 2026*
