# 🗺️ Plan General del Proyecto: Manmec IA (MVP)

Este documento centraliza la hoja de ruta estratégica, técnica y funcional para llevar a "Manmec IA" a su fase de Producto Mínimo Viable (MVP).

## 1. El Tablero Principal (Dashboard Gerencial/Supervisor)

El panel de control ("Sonda Manmec") es el cerebro de la operación. Debe ser de solo lectura y acción rápida, sin saturar al usuario.

* **Centro de Pantalla (Terreno en Tiempo Real):** Muestra el estado en vivo de mecánicos, vehículos y OTs. **Estado:** UI Completada ("Filete").
* **Cronología de Actividad:**
  * **¿Cómo alimentarlo con datos reales?** Utilizaremos la tabla `manmec_audit_log` (que ya captura todo vía Triggers en la BD) combinada con `manmec_notifications`.
  * **Implementación:** Crearemos un *Server Action* que consulte los últimos 20 eventos relevantes (ej. cambio de estado de OT a "IN_PROGRESS", consumo de un repuesto crítico, o alertas de la IA) y los formatee en lenguaje natural ("Lucho inició la OT-034 hace 5 min"). Supabase Realtime puede inyectar los nuevos eventos al cliente de Next.js.
* **Tarjetas de Resumen:** OTs Activas, Mecánicos en Ruta, Stock Crítico y Recepción de Repuestos.

---

## 2. 🧠 IA Insights & Agente de Telegram (El "Core" Operativo)

La visión de tener un Agente IA escuchando y accionando vía Telegram o Web es **100% factible** y de hecho, el modelo de datos actual de Manmec está **diseñado específicamente para soportarlo**.

### 2.1 Factibilidad Técnica y de Arquitectura

* **¿La estructura lo soporta? SÍ.**
  * Tenemos la tabla `manmec_voice_commands` preparada para guardar audios, transcripciones, la interpretación de la IA (`intent`, `entities`) y la acción resultante.
  * Tenemos las tablas `manmec_ai_conversations`, `manmec_ai_messages` y `manmec_ai_actions`.
  * Tenemos el sistema de roles (`manmec_users.role`: MECHANIC, SUPERVISOR, MANAGER) que la IA puede usar para decidir qué permisos tiene el usuario que le habla.

### 2.2 Plan de Ejecución y Modelos (Ecosistema Google Gemini)

Para obtener el máximo rendimiento nativo y aprovechar las capacidades multimodales (audio/video/texto sin intermediarios), utilizaremos estrictamente el **universo de modelos de Google Gemini**.

1. **Recepción Multimodal (Telegram Webhook):**
    * **Si es Texto:** Pasa directo a la API de Gemini.
    * **Si es Audio (Nota de Voz):** Se envía el archivo `.ogg` de Telegram **directamente** a la API Multimodal de Gemini. No necesitamos Whisper; Gemini 1.5 Pro y Flash soportan procesar el audio de forma nativa en un solo paso (Native Audio Understanding).

2. **Capa de Autenticación y Seguridad (RBAC):**
    * El bot asocia el `user_id` de Telegram con el perfil de Supabase `auth.users`.
    * Define los permisos según el `role` del usuario (Mecánico vs. Supervisor/Gerente).

3. **Procesamiento Semántico y Lógica de Negocio (Function Calling / Tools):**
    * La entrada (audio o texto) entra al Motor Principal de IA.
    * *Modelos recomendados:* **Gemini 1.5 Pro** (para los análisis proactivos pesados del cronjob y razonamiento complejo) o **Gemini 1.5 Flash** (para el bot de respuesta hiperrápida en Telegram).
    * Se exponen Herramientas/Functions (vía Prisma/SDK de Gemini): `get_ot_status`, `reassign_ot`, `check_inventory`.
    * Gemini decide ejecutar la acción correspondiente extrayendo los parámetros del audio/texto.

4. **Ejecución y Reflejo en Tiempo Real:**
    * El backend en Next.js ejecuta la herramienta que Gemini pidió en la base de datos (Prisma).
    * Los triggers de *Supabase Realtime* disparan eventos que actualizan el Dashboard sin intervención manual.

5. **Respuesta Sensorial (Bimodal):**
    * Gemini genera un mensaje de texto de éxito ("Listo jefe, asigné a Lucho a la P1 de Yungay").
    * Google Cloud Text-to-Speech (o las futuras capacidades nativas *voice-to-voice* de Gemini) puede devolver el audio a Telegram.

### 2.3 Insights Proactivos (Dashboard Inteligente)

El agente no solo debe reaccionar a peticiones, sino ser un "copiloto operacional" que vigila el terreno y arroja sugerencias de alto valor de forma asincrónica.

En el Dashboard, la tarjeta **"IA INSIGHTS"** mostrará un *feed* dinámico de recomendaciones que la IA genera automáticamente basándose en análisis estadísticos y reglas de negocio.

**Tipos de Indicadores/Insights que el motor generará:**

1. **Optimización de Flota (Furgones):**
    * *Insight:* "Según los registros recientes, en el furgón **HBJW-80** se han consumido todos los filtros en las OTs 34343 y 346347. Se sugiere solicitar reposición urgente para su bodega móvil."
    * *Beneficio:* Evita que el mecánico llegue a una estación sin los repuestos críticos.
2. **Detección de Anomalías en Consumo:**
    * *Insight:* "Hay un alza del 300% en el uso del repuesto `PROTECCIÓN PLAST. AZUL PISTOLA 1"` durante la última semana. Frecuencia inusual."
    * *Beneficio:* Alerta posibles fallos sistémicos en una zona o malas prácticas de instalación.
3. **Predicción de Quiebre de Stock:**
    * *Insight:* "Al ritmo de consumo actual de la Zona Norte, necesitas pedir **15 Filtros de Aire** para evitar un quiebre de stock el viernes."
    * *Acción Integada:* Mostrar un botón de `[ GENERAR SOLICITUD ]` que envíe el requerimiento a Compras con un solo clic.
4. **Eficiencia de Ruteo:**
    * *Insight:* "Noté que Luis (P1 Yungay) está a solo 2km de la EDS 'Los Héroes' que tiene una OT preventiva pendiente (P3). ¿Deseas agregársela a su ruta de hoy?"

**Implementación Técnica de la Proactividad:**

* Se creará un `cron job` (tarea programada) en Next.js (o un trigger programado de Supabase).
* Cada 2 horas, el sistema recopilará metadata estadística (ej. tablas `manmec_inventory_movements` y `manmec_work_orders`) y se la enviará al LLM con un prompt analítico.
* Si el LLM detecta algo de valor, insertará un registro en la tabla `manmec_ai_actions` con severidad `warning`, `info` o `critical`.
* El Dashboard simplemente estará suscrito (vía Realtime) a esta tabla para mostrar la tarjeta dinámica en pantalla.

---

## 3. Hoja de Ruta de Microactividades (Siguientes Pasos)

Para llegar a este MVP sin romper lo que hay, estas son las etapas:

* [ ] **Fase 0: Triggers por Email (Integración con COPEC)**
  * [x] **Configuración SaaS (Base de Datos):** Agregar campo `allowed_email_domains` en la tabla `manmec_organizations` y crear interfaz web en Configuración para que el usuario ingrese desde qué dominios autoriza crear OTs.
  * [x] **Seguridad del Webhook:** Refactorizar `src/app/api/webhooks/notifications/email/route.ts` para que valide un Token secreto y cruce el dominio del remitente con el `allowed_email_domains` de esa organización.
  * [ ] **Migración a Zod:** Actualizar `email-parser.ts` para que use *Structured Outputs* nativos de Gemini, asegurando que el JSON nunca falle.
  * [ ] **Simulación End-to-End:** Ejecutar localmente `test_email_automation.ts` para verificar la correcta inserción de OTs y Pre-Guías (`manmec_shipments`) en Prisma.
  * [ ] **Conexión a Producción:** Configurar *SendGrid Inbound Parse* o *Postmark* en el dominio para enrutar los correos de `bodega@manmec.cl` hacia nuestro webhook.

* [ ] **Fase 1: Onboarding y Conexión de Datos**
  * [ ] Crear el endpoint/action para la *Cronología de Actividad* leyendo de `manmec_audit_log` y renderizarlo en la UI.
  * [ ] **Pantalla de Onboarding "Zero-Friction":** Formulario obligatorio post-login de Google para recolectar el Rol y Teléfono del usuario.
  * [ ] **Emparejamiento Seguro (QR Code & Deep Link):**
    * *Modo Desktop (PC/Tablet):* Generar un código QR dinámico en pantalla para escanear con el celular.
    * *Modo Mobile (Mismo dispositivo):* Mostrar un Botón Gigante (Ej: "Abrir Telegram") que use un *Deep Link* (`tg://resolve?domain=ManmecBot&start=token_unico`) para redirigir automáticamente a la app sin usar la cámara.
  * [ ] **Validación de Identidad:** El Webhook verifica que el número de teléfono con el que el usuario escribe en Telegram coincida con el ingresado en la web. Si difieren, abortar el enrolamiento, mostrar error en Telegram y recargar el QR/Enlace en la web.
* [ ] **Fase 2: Setup del Bot de Telegram Base & Arquitectura Omnicanal**
  * [ ] Crear el Bot en BotFather de Telegram y obtener el Token.
  * [ ] **Cerebro Central IA (`src/lib/ai/agent.ts`):** Centralizar la lógica del LLM separada de los canales de comunicación, para que sea agnóstica a la plataforma.
  * [ ] Programar un Webhook en Next.js (`/api/telegram/webhook`) para recibir los mensajes ruteándolos al Cerebro Central.
  * [ ] **Canal Web:** Implementar Widget flotante de chat en la App (`localhost:3000`) conectado al mismo Cerebro Central.
  * [ ] Implementar la función de emparejamiento (vincular cuenta de Telegram con `auth.users` de Supabase para RBAC consistente en todos los canales).
* [ ] **Fase 3: Transcripción, Seguridad y Módulo de Herramientas**
  * [ ] Implementar el enrutamiento del audio nativo `.ogg` directamente a la API de Gemini 1.5.
  * [ ] Condicionar el Prompt inicial del Agente basado en el `manmec_users.role` del remitente.
  * [ ] **Módulo Herramientas "Zero-Friction":** Integrar escáner de cámara (QR/Código de Barras) y autocompletado visual con **Gemini Vision** para ingresos hiper-rápidos.
  * [ ] **Módulo Herramientas (Asignación):** Refactorizar formulario para reemplazar estado "Libre" por selector dinámico de "Bodega" (Central o Móvil).
* [ ] **Fase 4: Function Calling y Conexión al Motor**
  * [ ] Definir el set de herramientas del LLM (Tool schema en Prisma/Zod).
  * [ ] Conectar la ejecución del LLM a las mutaciones de Prisma.
  * [ ] Probar el ciclo completo: Hablar en Telegram -> Ver cómo la UI del Dashboard cambia sola sin tocar un click.

* [ ] **Fase 5: Validaciones Obligatorias en Entorno de Producción (`bodega.manmec.cl`)**
  * [ ] **Webhooks Periféricos Reales:** Validar y probar el ruteo del correo externo (`bodega@manmec.cl`) con SendGrid/Postmark directo al webhook desplegado.
  * [ ] **Autenticación en Vivo:** Probar el registro del equipo usando dominios corporativos autorizados vía Google OAuth para verificar el candado de seguridad y autoasignación de roles ("Zero Trust").
  * [ ] **Agente IA en la Nube:** Registrar y probar el webhook de Telegram usando el dominio público de producción. Verificar que los audios e interacciones en terreno tengan latencia aceptable.
  * [ ] **Conexión WebSocket:** Confirmar con mecánicos en terreno usando la versión móvil que las notificaciones y cambios de estado (Realtime) llegan a sus teléfonos instantáneamente con redes 4G/LTE.

* [ ] **Fase 6: Correcciones y Sugerencias de Arquitectura (Skills Globales)**
  * [ ] **Seguridad & Backend (Zero Trust):** Crear el archivo `src/middleware.ts` para proteger las rutas privadas bajo `/dashboard` verificando la sesión con Supabase Auth.
  * [ ] **Frontend & Diseño:** Actualizar los metadatos base en `src/app/layout.tsx` (title, description) por los definitivos de Manmec IA, para SEO y branding.
  * [ ] **Frontend & Diseño:** Generar la pantalla de Login con Google Auth (`app/login/page.tsx`) aplicando principios Mobile-First (Ley de Fitts).

---

## 🚀 Posibles Funcionalidades Futuras (Post-MVP)

*Esta sección contiene ideas aprobadas a nivel de arquitectura, pero que **NO son bloqueantes** para salir a producción con la Fase MVP.*

### Integración de Telemetría (GPS-Trace) y Conciencia Espacial IA

* **Objetivo:** Optimizar el despacho de OTs urgentes (P1) y obtener visibilidad real de la operación en terreno reduciendo la fricción a cero.
* **Componentes Clave a Desarrollar:**
  * [ ] **Modelo de Datos:** Implementar extensión PostGIS en Supabase.
  * [ ] **Vínculo Físico:** Añadir `gps_trace_uuid` a la tabla `vehicles` y crear tabla temporal `vehicle_telemetry`.
  * [ ] **Geocercas (Zonas Críticas):** Extender `work_orders` para incluir radio/polígono geográfico.
  * [ ] **Webhooks Seguros:** Backend listener para eventos de GPS-Trace (Enter/Exit Geofence) protegido con firma criptográfica.
  * [ ] **Automatización Zero-Friction:** Actualización automática del estado de la OT a "En Sitio" cuando el furgón entra a la zona del cliente.
  * [ ] **Despacho Reactivo:** Motor P1 basado en posición real (Supabase Realtime) y no solo asignación estática zonal.
  * [ ] **Agente IA Mejorado:** Inyectar la telemetría en el contexto del Master Agente para responder consultas espaciales en lenguaje natural (Ej: "¿Dónde está Lucho?").
  * [ ] **UI Backoffice:** Live Map Dashboard integrando `react-map-gl`/`leaflet` con blips actualizados por WebSockets.
