# Backlog posterior a SmartRisk CZ5 v1.0

Este documento registra mejoras detectadas durante el desarrollo que no deben interrumpir la finalización de la versión funcional.

## Estado al HITO-2026-08-27-AUDITORIA-INTEGRAL

La auditoría integral del 27 de agosto de 2026 convierte este backlog en un registro de deuda controlada. Una tarea marcada como parcial o pendiente no invalida el hito vigente, pero tampoco debe presentarse como resuelta hasta que cumpla la condición de cierre correspondiente.

| Estado | Control | Situación al hito |
|---|---|---|
| Hecho | Suite automática de release | `scripts/test-release.mjs` construye, valida, ejecuta pruebas y chequea sintaxis antes del despliegue. |
| Hecho | Escritura territorial por alcance | Firestore usa `scopeKey`, perfil activo, modo de acceso y validación de revisión/autor. |
| Hecho | Bitácora nueva append-only | `alcances/{scopeKey}/cambios` admite creación autorizada y niega actualización/eliminación. |
| Hecho | Base metodológica de hitos | Se formalizan universo rector, evidencia, severidad, triangulación, regresiones y cierre verificable. |
| Hecho | Integridad de cobertura 56 GAD | La cobertura usa identificadores canónicos; registros ambiguos no incrementan el numerador. |
| Parcial | Retiro del almacenamiento global heredado | `/plataforma/datos` conserva lectura para perfiles activos durante la migración; retirar cuando los módulos dependientes operen únicamente con repositorios segmentados. |
| Parcial | Normalizador territorial único | Persisten tablas de alias y lógica territorial duplicadas en varios módulos de escritorio. Centralizar sin romper compatibilidad. |
| Parcial | Clasificación documental estructurada | Coordinación, escalamiento y cierre usan reglas semánticas conservadoras; migrar a campos/tipos normalizados y validación competente. |
| Pendiente | Pruebas E2E autenticadas | Complementar la suite determinística con pruebas reales de navegador, perfiles, red y persistencia. |
| Pendiente | Cierre completo del ciclo COE | Mantener como trabajo posterior: periodo operacional, SITREP, relevo, recursos, alojamientos, servicios esenciales, información pública y cierre. |

## V1.1 — Estabilización y rendimiento

| Prioridad | Tarea | Resultado esperado |
|---|---|---|
| Alta | Optimizar carga de módulos | Mejor rendimiento con mayor volumen de registros |
| Alta | Eliminar código duplicado | Menor mantenimiento y menor riesgo de errores |
| Media | Mejorar manejo de errores | Mensajes claros y recuperación ante fallos |
| Media | Incorporar pruebas automatizadas | Validación continua de funciones críticas |
| Baja | Ampliar documentación técnica | Facilitar mantenimiento y transferencia |

## V1.2 — Arquitectura y datos

| Prioridad | Tarea | Resultado esperado |
|---|---|---|
| Alta | Crear DataService central | Unificar lectura y escritura de datos |
| Alta | Separar repositorios de datos | Sustituir LocalStorage sin modificar interfaces |
| Media | Incorporar API interna | Estandarizar intercambio entre módulos |
| Media | Versionar estructuras de datos | Evitar incompatibilidades entre actualizaciones |
| Baja | Implementar caché controlada | Mejorar velocidad y disponibilidad |

## V1.3 — Automatización e integraciones

| Prioridad | Tarea | Resultado esperado |
|---|---|---|
| Alta | Sincronización incremental | Descargar únicamente cambios |
| Alta | Integración robusta con KoboToolbox | Actualización automatizada de formularios |
| Alta | Integración robusta con ArcGIS Online | Uso de capas y servicios territoriales |
| Media | Integración bidireccional con Google Sheets | Lectura y escritura controladas |
| Media | Automatización de reportes | Generación periódica de productos |
| Baja | Cola de procesos | Control de tareas pesadas o diferidas |

## V1.4 — Seguridad, auditoría y continuidad

| Prioridad | Tarea | Resultado esperado |
|---|---|---|
| Alta | Roles y permisos avanzados | Control por perfil institucional |
| Alta | Auditoría de cambios | Identificar quién modificó cada registro |
| Alta | Respaldo y recuperación | Reducir pérdida de información |
| Media | Historial de versiones | Recuperar estados anteriores |
| Media | Autenticación robusta | Protección de acceso |
| Baja | Firma electrónica y flujos de aprobación | Formalización documental |

## V2.0 — Inteligencia artificial

| Prioridad | Tarea | Resultado esperado |
|---|---|---|
| Alta | Detección automática de brechas | Identificar registros incompletos o inconsistentes |
| Alta | Recomendaciones progresivas | Orientar acciones según el nivel de avance |
| Alta | Generación asistida de informes | Reducir tiempos de elaboración |
| Media | Priorización territorial automática | Ordenar cantones y sitios según criterios |
| Media | Asistentes especializados | Apoyo por análisis, fortalecimiento y respuesta |
| Baja | Modelos predictivos | Anticipar tendencias cuando existan datos suficientes |

## Ideas complementarias registradas

- Modo offline.
- Aplicación móvil.
- Dashboard nacional.
- Notificaciones y alertas.
- Gestión documental.
- Integración con Quipux.
- Integración con correo institucional.
- Integración con otros sistemas de la SNGR.
- Accesibilidad avanzada.
- Workflow institucional de revisión y aprobación.
