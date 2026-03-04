# Feature Spec: Integración de Telemetría (GPS-Trace) y Conciencia Espacial IA

**Fecha:** Marzo 2026  
**Estado:** Propuesta / En Revisión  
**Autor:** [Tu Nombre / Equipo de Arquitectura]  
**Proyecto:** Sistema de Gestión de Órdenes de Trabajo (SaaS)

---

## 1. Contexto y Objetivos
Actualmente, el sistema gestiona OTs priorizadas (P1-P4) y cuenta con una adopción exitosa por parte de mecánicos (baja fricción digital) mediante logueo SSO (Google) y un Agente IA para consultas de bodega. 

**El problema:** Se requiere optimizar el despacho de OTs urgentes (P1), reducir la carga de interacción en la app para los mecánicos y obtener visibilidad real de la operación en terreno.  
**La solución:** Integrar la API de `gps-trace.com` para dotar al SaaS de telemetría en tiempo real y hacer que el Agente IA sea espacialmente consciente.

---

## 2. Propuesta de Valor (Mejoras Operacionales)

La integración de la API de GPS-Trace justifica la inversión (Hardware + Plan de Facturación API) al habilitar las siguientes capacidades core:

1. **Automatización por Geofencing (Zero-Click Updates):**
   * **Mecánica:** Al crear una OT, el backend define una geocerca lógica en GPS-Trace.
   * **Impacto:** Cuando el vehículo entra al radio del cliente, el estado de la OT cambia automáticamente a `En Sitio`. Al salir, pasa a `Completada` o `Retorno`. Reduce la fricción digital del mecánico a cero.
2. **Asignación Dinámica Real para OTs P1:**
   * **Mecánica:** Ante una OT P1, el sistema consulta la posición en vivo de la flota.
   * **Impacto:** El motor de reglas (vía Supabase Realtime) asigna y alerta al mecánico *físicamente más cercano* que cuente con el inventario adecuado, no al que está asignado estáticamente a la zona.
3. **Agente IA Espacialmente Consciente:**
   * **Mecánica:** El Agente IA consume el contexto de ubicación.
   * **Impacto:** Consultas en lenguaje natural como *"¿Dónde está Lucho?"* generan respuestas operacionales precisas: *"Lucho está a 3 km del Cliente X, llegará en 5 minutos"*.
4. **Ground Truth (Verdad Operacional):**
   * **Mecánica:** Cruce de datos entre escaneo nativo de repuestos (App) y ubicación geográfica (GPS-Trace).
   * **Impacto:** Auditoría a prueba de errores humanos. Garantiza que los repuestos se utilizaron en las coordenadas reales del cliente.

---

## 3. KPIs y Métricas de Éxito (Valor para el Cliente Final)

Esta integración desbloquea un nuevo dashboard gerencial con métricas de alto impacto para la venta del SaaS:

* **SLA de Respuesta Real (P1):** Disminución del tiempo desde la creación del ticket P1 hasta el cruce de la geocerca del cliente.
* **Eficiencia de Ruta (Planned vs Actual):** % de desviación entre la ruta óptima y la ruta real (impacto directo en ahorro de combustible).
* **Wrench Time (Tiempo de Llave):** Proporción del tiempo del turno invertido *dentro* de la geocerca del cliente vs. tiempo en tránsito.
* **Costo Real por OT:** Cálculo exacto = (Horas-Hombre) + (Costo Repuestos) + *(Costo de Desplazamiento Real)*.

---

## 4. Matriz de Decisión Arquitectónica

| Criterio | Decisión Tomada: API GPS-Trace (Hardware en Vehículo) | Alternativa Descartada: Tracking Nativo App (GPS Celular) |
| :--- | :--- | :--- |
| **Ingesta de Datos** | Webhooks desde GPS-Trace hacia backend. | Ping continuo desde la app hacia Supabase (PostGIS). |
| **Fricción Usuario** | **Nula.** El mecánico solo conduce. | **Alta.** Drena batería y requiere permisos invasivos. |
| **Confiabilidad** | **Alta.** Datos ininterrumpidos de hardware dedicado. | **Baja.** Depende de que el mecánico no cierre la app. |
| **Costo / Esfuerzo** | Pago de API + Hardware. Bajo esfuerzo de dev. | Sin costo de API externa. Alto esfuerzo de dev e ingesta. |

> **Decisión:** Se opta por **API GPS-Trace**. Delegamos la complejidad de ingesta de alta frecuencia (High-throughput telemetrics) a un proveedor especializado y consumimos eventos limpios.

---

## 5. Riesgos Críticos y Mitigaciones

| Riesgo | Impacto | Estrategia de Mitigación |
| :--- | :--- | :--- |
| **Data Overload (Sobrecarga)** | Caída del backend por polling continuo (preguntar posición cada 5 seg por vehículo). | Implementar arquitectura Event-Driven. Usar **Webhooks** de GPS-Trace solo para eventos clave (inicio/fin viaje, geocerca). |
| **Rechazo Sindical / Privacidad** | Los mecánicos sienten invasión a su privacidad fuera de horario. | Vincular el tracker al *vehículo*, no a la *persona*. UI transparente en la app indicando cuándo el tracking está activo (jornada laboral). |
| **Zonas sin Cobertura (Offline)** | Pérdida temporal de visibilidad y fallos en Webhooks. | Sincronización asíncrona. Validar timestamps de eventos cuando el hardware recupere señal y envíe el buffer acumulado. |

---

## 6. Roadmap de Implementación

**Fase 1: Trazabilidad Pasiva (Semanas 1-2)**
* Conexión a API de GPS-Trace (Autenticación / Listado de Flota).
* Modelo de base de datos en Supabase: Tabla de asociación `vehicle_id` (GPS) <-> `mechanic_id` (App).
* **Entregable:** Mapa en tiempo real en backoffice.

**Fase 2: Automatización Silenciosa (Semanas 3-4)**
* Creación automatizada de geocercas en la API de GPS-Trace al abrir una OT.
* Configuración de Webhook listener en el backend para eventos de *Geofence Enter/Exit*.
* **Entregable:** Cambios de estado en OTs automáticos (Zero-click).

**Fase 3: Routing Reactivo y Agente IA (Semanas 5-6)**
* Algoritmo de cálculo de ETA / Distancia para interrupciones P1.
* Inyección del contexto de telemetría en el prompt de sistema del Agente IA de bodega/operaciones.
* **Entregable:** Despacho automatizado vía Supabase Realtime y Agente IA omnisciente.