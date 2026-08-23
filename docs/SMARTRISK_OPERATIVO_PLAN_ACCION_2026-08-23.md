# SmartRisk Operativo — Plan metódico de correcciones

**Fecha de inicio:** 23 de agosto de 2026  
**Objetivo:** convertir las brechas de la auditoría integral en acciones verificables y evolucionar SmartRisk desde plataforma de supervisión hacia espacio de trabajo operativo, manteniendo control documental, trazabilidad, seguridad y compatibilidad histórica ENOS.

## Principio de trabajo

Cada bloque se ejecuta de forma independiente y solo se considera cerrado cuando cumple sus criterios de aceptación. No se mezclan cambios visuales con cambios de datos o seguridad sin evidencia de regresión. Kobo permanece disponible únicamente como mecanismo de contingencia durante la transición y no se retira hasta que SmartRisk cubra el 100 % del flujo equivalente F01–F07 en campo y producción.

## Modelo rector

El objeto central es el **sitio/ámbito territorial**. La cadena canónica será:

`siteId → actionId → followupId → evidenceId`

Los formularios F01–F07 se conservan como taxonomía metodológica y compatibilidad histórica, pero la experiencia del técnico se organiza por objetos de trabajo: riesgo, exposición, infraestructura, cartografía, acciones, recursos, preparación, seguimiento y evidencias.

## Bloques de implementación

### P0 — Núcleo de operación, permisos y persistencia

**Brecha:** V11 estaba forzada a solo lectura y el almacenamiento territorial dependía de un overlay consolidado.

**Acciones:**
1. Sustituir el candado universal por RBAC según rol y `modoAcceso`.
2. Mantener perfiles de consulta sin escritura.
3. Permitir creación/edición operativa solo dentro del alcance autorizado.
4. Reservar validación/cierre a Coordinación/Administración.
5. Crear persistencia por registro en `alcances/{scopeKey}/registros/{recordId}`.
6. Incorporar revisión incremental y metadatos de autor/fecha.
7. Crear bitácora append-only en `alcances/{scopeKey}/cambios/{changeId}`.
8. Prohibir eliminación territorial; el cierre se representa mediante estado.

**Criterios de cierre:** permisos coherentes UI/backend; create/update territorial autorizado; consulta sin escritura; revisión + autor + fecha persistidos; bitácora no editable; prueba automatizada aprobada.

### P1 — Acciones y seguimiento integrado

**Brecha:** el editor operativo existe en la capa legacy, mientras V11 consulta y deriva actualización a Kobo.

**Acciones:**
1. Integrar un editor V11 simplificado en cinco pasos: qué, dónde, quién/cuándo, recursos/costo, resultado/evidencia.
2. Usar catálogos para prioridad, estado, tipo de acción, institución y fuente financiera.
3. Mantener campos avanzados bajo expansión progresiva.
4. Implementar borrador → revisión → observado → corregido → validado.
5. Crear seguimiento directamente desde una acción.
6. Exigir `actionId` para seguimiento de acción y separar seguimiento general del plan.
7. Eliminar nuevos registros `SIN-CODIGO`.
8. Añadir programación, próximo corte, alertas de vencimiento y vista lista/Kanban/calendario.

**Criterios de cierre:** acción normal registrable en ≤2 min; actualización ≤1 min; F07 equivalente ligado a `actionId`; historial y evidencia visibles; pruebas de rol y flujo aprobadas.

### P2 — Sitios, amenazas, exposición e infraestructura

**Brecha:** información histórica reutiliza IDs y mezcla sitio, amenaza, afectación y acción.

**Acciones:**
1. Generar `siteId` canónico estable.
2. Separar amenaza, exposición, vulnerabilidad/brecha y nivel de riesgo.
3. Incorporar taxonomía multiamenaza.
4. Relacionar infraestructura esencial y cartografía al sitio.
5. Evitar que acciones o tramos genéricos se registren como sitios sin tipificación.
6. Mantener equivalencias con F01, F02 y F03.

**Criterios de cierre:** cada sitio tiene identidad única, ubicación/fuente/vigencia; ninguna acción depende de texto libre para identificar su sitio; relaciones F01–F03 auditables.

### P3 — Fortalecimiento, respuesta, recursos y presupuesto

**Brecha:** recursos/capacidades y presupuestos pueden ser narrativos o mezclar valores referenciales con disponibilidad real.

**Acciones:**
1. Modelar recurso con propietario, cantidad, operatividad, disponibilidad, ubicación y tiempo de movilización.
2. Diferenciar prevención/mitigación, preparación y respuesta.
3. Incorporar condición de activación cuando aplique.
4. Separar presupuesto estimado/referencial, programado, certificado/asignado y ejecutado.
5. Diferenciar fuente prevista de fuente confirmada.
6. Mantener compatibilidad F04–F06.

**Criterios de cierre:** tableros no interpretan presupuesto referencial como disponible; recursos tienen estado operativo; acciones de respuesta tienen activación y responsable.

### P4 — Evidencias, documentos y trazabilidad institucional

**Brecha:** verificables y documentos históricos no siempre están ligados a un objeto canónico.

**Acciones:**
1. Crear `evidenceId` y vincularlo a sitio/acción/seguimiento.
2. Registrar tipo, fecha, autor, archivo/enlace, descripción y fuente.
3. Mantener versión y documento rector por plan.
4. Diferenciar brecha administrativa (p. ej. Quipux) de validez técnica.
5. Sincronizar manifiesto de release con el corte real de datos.

**Criterios de cierre:** toda evidencia abre desde el objeto que respalda; fuente y corte visibles; manifiesto y UI reportan el mismo corte.

### P5 — Móvil, offline y sustitución controlada de Kobo

**Brecha:** el flujo móvil actual abre Kobo para registrar sitio y seguimiento.

**Acciones:**
1. Captura nativa de sitio, acción, seguimiento, evidencia y coordenadas.
2. Borradores locales y cola de sincronización para conectividad degradada.
3. Indicadores claros de pendiente/sincronizado/error.
4. Pruebas de recuperación tras pérdida de conexión.
5. Mantener Kobo como contingencia durante dos ciclos de aceptación.
6. Retirar enlaces Kobo solo cuando la paridad funcional y de campo esté aprobada.

**Criterios de cierre:** flujo crítico ejecutable desde teléfono sin salir de SmartRisk; borrador sobrevive sin conexión; sincronización no duplica registros; contingencia documentada.

### P6 — Seguridad y administración

**Brecha:** lectura global heredada, correos administrativos codificados, App Check/MFA y conciliación Auth↔Firestore pendientes.

**Acciones:**
1. Eliminar dependencia de lectura territorial del documento global `plataforma/datos`.
2. Restringir backend por alcance real, no por filtro JavaScript.
3. Migrar privilegios administrativos a perfil/claims gestionados.
4. Activar/verificar App Check.
5. Exigir MFA a administradores.
6. Ejecutar conciliación Auth ↔ perfiles ↔ scopeKeys.
7. Verificar reglas desplegadas en Firebase, no solo en repositorio.

**Criterios de cierre:** usuario territorial no puede leer/escribir otro alcance mediante API directa; administradores con MFA; auditoría de identidades sin discrepancias críticas.

### P7 — Consolidación, rendimiento y auditoría integral de cierre

**Brecha:** acumulación de RC, adaptadores y documentación histórica.

**Acciones:**
1. Consolidar frontend oficial y retirar capas que ya no participan del runtime.
2. Actualizar arquitectura y diccionario de datos.
3. Generar manifiesto de release automáticamente.
4. Ejecutar suite completa de regresión, accesibilidad, seguridad y rendimiento.
5. Realizar prueba de usabilidad con técnicos y medir éxito, tiempo, errores y SUS/UMUX-Lite.
6. Documentar rollback y recuperación.

**Criterios de cierre:** suite estable; documentación coincide con runtime; cero rutas de escritura legacy activas; resultados de usabilidad dentro de meta; rollback comprobable.

## Matriz de control

| Bloque | Prioridad | Estado inicial | Dependencia | Resultado esperado |
|---|---|---|---|---|
| P0 Núcleo | P0 crítica | EN EJECUCIÓN | Ninguna | escritura segura por registro |
| P1 Acciones/F07 | P0 crítica | Pendiente | P0 | workspace diario del técnico |
| P2 Sitios/riesgo | P1 alta | Pendiente | P0 | identidad territorial canónica |
| P3 Recursos/presupuesto | P1 alta | Pendiente | P1–P2 | operación y costos comparables |
| P4 Evidencias/documentos | P1 alta | Pendiente | P1–P2 | trazabilidad documental completa |
| P5 Móvil/Kobo | P1 alta | Pendiente | P1–P4 | operación nativa de campo |
| P6 Seguridad | P0/P1 | Pendiente | P0 y migración de lectura | aislamiento backend verificable |
| P7 Consolidación | P1 | Pendiente | P0–P6 | release institucional auditable |

## Regla de control de cambios

- Desarrollo en rama específica por bloque.
- Prueba automatizada antes de integración.
- Comparación de cambios y revisión de regresión.
- Integración a `main` únicamente cuando los criterios del bloque están cumplidos.
- Despliegue y validación de servidor posterior a integración.
- Cada bloque genera documentación de qué cambió, cómo verificarlo y cómo revertirlo.

## Estado de P0 al iniciar

Se implementan en la rama `operativo/p0-core-escritura`:
- RBAC V11 operativo/consulta.
- Persistencia granular por registro.
- Revisión incremental.
- Bitácora append-only.
- Reglas Firestore de create/update territorial con alcance.
- Prohibición de eliminación territorial.
- Prueba automatizada específica del bloque.

El overlay heredado y la lectura global permanecen temporalmente por compatibilidad. Su retiro pertenece a P6, después de que P1–P5 dejen de depender de ellos.
