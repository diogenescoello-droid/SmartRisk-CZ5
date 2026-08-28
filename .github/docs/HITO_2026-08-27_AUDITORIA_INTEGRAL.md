# HITO-2026-08-27 — Auditoría integral SmartRisk CZ5

Fecha local de corte: 27 de agosto de 2026 · UTC-5  
Referencia de partida: commit `ca05b791b952d1e6f962af688912e0f44405078c`  
Corrección inmediata previa: `dc68ef836860ca7ec1fcf14726677203c7605a92`  
Método: `.github/docs/BASE_METODOLOGICA_HITOS.md`

## 1. Objetivo

Cerrar como hito verificable el estado alcanzado por SmartRisk CZ5 después de corregir la inconsistencia visible `58 de 56 GAD`, revisar el sistema desde perspectivas independientes y convertir las lecciones del incidente en controles permanentes de integridad.

## 2. Alcance revisado

La auditoría cubre:

- universo territorial y matriz maestra de 56 expedientes;
- normalización de GAD, provincias, cantones y alias;
- estado documental del panel principal;
- semántica de monitoreo, validación, coordinación, decisión, escalamiento, mitigación y cierre;
- seguimiento F07 vigente;
- metadatos de release y fecha de corte;
- seguridad y alcance de Firestore;
- bitácora de cambios;
- construcción, pruebas y publicación Firebase;
- documentación histórica, backlog y trazabilidad de hitos.

## 3. Hallazgos y verificación multidimensional

### H-01 · Numerador territorial superior al universo — CRÍTICO — RESUELTO

**Incidente:** la interfaz mostró `58 de 56 GAD` porque registros/etiquetas territoriales podían actuar como unidades de cobertura.

**Verificación:** la matriz maestra contiene exactamente 56 expedientes, numerados `1…56`, distribuidos en 26 Guayas, 14 Los Ríos, 8 Bolívar, 4 Santa Elena y 4 Galápagos/CGREG. La corrección usa `doc.n` como identificador de cobertura y `Set` para deduplicar GAD.

**Resultado:** ningún número de registros, duplicados o alias puede incrementar por sí mismo el número de GAD cubiertos.

### H-02 · Registros ambiguos podían confundirse con cobertura — ALTO — RESUELTO

**Corrección:** un registro sin GAD inequívoco se conserva como `sin atribución`, pero queda fuera del numerador territorial. Un registro provincial sin cantón solo se atribuye a la entidad provincial cuando existe señal explícita de Prefectura/CGREG/nivel provincial.

### H-03 · Proxy semántico demasiado amplio — ALTO — RESUELTO CON RESIDUAL

**Problema:** `institutions` no equivale automáticamente a coordinación, ni `breaches` a escalamiento.

**Corrección:** coordinación, decisión, escalamiento y mitigación/cierre requieren señales semánticas explícitas en el registro; ya no basta pertenecer a una colección genérica.

**Residual:** la clasificación sigue siendo una regla conservadora basada en campos/texto y no una validación institucional E4. La interfaz debe seguir tratándola como lectura documental, no como acto oficial.

### H-04 · Metadatos de release desactualizados — ALTO — DETECTADO EN ESTA AUDITORÍA

**Hallazgo:** `f07-current-data.js` ya registra sincronización `2026-08-28T00:01:36.732Z`, última remisión `2026-08-27T21:48:10` y 164 seguimientos, mientras `release-config.js` y `RELEASE_MANIFEST.json` seguían declarando corte/sincronización del 23 de agosto y un mínimo de 116 seguimientos.

**Acción:** sincronizar ambos metadatos con el activo F07 realmente publicado y añadir prueba automática de concordancia.

### H-05 · Falta de prueba específica contra la regresión 58/56 — ALTO — DETECTADO EN ESTA AUDITORÍA

**Hallazgo:** existían pruebas sólidas del universo maestro de 56 GAD, pero no una prueba adversarial que inyectara más registros que GAD y verificara que la cobertura permaneciera en 56.

**Acción:** incorporar `tests/hito-integrity-20260827.mjs` con duplicados, alias, provincia sin cantón, cantón inexistente y categorías semánticamente próximas.

### H-06 · Seguridad territorial — ALTO HISTÓRICO — PARCIALMENTE RESUELTO

La auditoría histórica del 18 de julio señalaba que cualquier autenticado podía modificar el documento operativo global. Las reglas actuales restringen la escritura global a administradores y habilitan escrituras operativas segmentadas por `scopeKey`, con validación de autor, revisión e identificadores. La bitácora `alcances/{scopeKey}/cambios` es append-only.

**Residual:** `/plataforma/datos` conserva lectura para cualquier perfil activo como compatibilidad de migración. Esto significa que el principio de mínimo privilegio de lectura todavía depende parcialmente de retirar el legado global cuando la migración esté cerrada.

### H-07 · Trazabilidad de despliegue — CONFORME

La publicación usa construcción canónica, validadores, todas las pruebas `.mjs`, chequeo sintáctico de JavaScript y artefacto de validación. El despliegue anterior quedó registrado como `deployed` para `dc68ef836860ca7ec1fcf14726677203c7605a92`.

El cierre definitivo de este hito se actualizará con el commit fuente y el resultado Firebase del paquete de correcciones de la auditoría integral.

## 4. Controles de aceptación del hito

- [x] Universo canónico = 56 expedientes.
- [x] Numeración única 1–56.
- [x] Distribución territorial suma 56.
- [x] Cobertura agregada usa identificadores canónicos.
- [x] Duplicados no elevan cobertura.
- [x] Registros sin atribución no elevan cobertura.
- [x] Alias se resuelven contra el GAD canónico.
- [x] Provincia sin cantón no se transforma automáticamente en Prefectura.
- [x] Institución no equivale automáticamente a coordinación.
- [x] Brecha no equivale automáticamente a escalamiento.
- [x] Estado documental se separa de avance/cumplimiento.
- [x] Reglas Firestore limitan escritura global a administrador.
- [x] Bitácora segmentada de cambios es append-only.
- [ ] Metadatos release/F07 sincronizados — se corrige en este hito.
- [ ] Prueba adversarial 58/56 — se incorpora en este hito.
- [ ] Despliegue final del hito — pendiente de la corrida final de CI/CD.

## 5. Riesgos residuales

1. **Lectura global heredada:** `plataforma/datos` continúa legible por perfiles activos durante la migración.
2. **Clasificación semántica heurística:** coordinación/escalamiento/cierre requieren normalización estructurada futura para alcanzar evidencia E3/E4 sin depender de texto.
3. **Duplicación de normalizadores:** existen tablas/funciones de alias en más de un módulo de escritorio. No altera el universo actual, pero es deuda de mantenibilidad y debe centralizarse progresivamente.
4. **Pruebas predominantemente estáticas/determinísticas:** la suite protege regresiones de código, pero no sustituye una prueba E2E autenticada en navegador sobre todos los perfiles y condiciones de red.
5. **Fuentes con distintos cortes:** el hito distingue el corte de la matriz maestra del corte F07. No deben presentarse como si fueran una sola fecha de observación.

## 6. Estado del hito

**EN CIERRE TÉCNICO.** Los críticos del incidente `58/56` están resueltos. El hito quedará `CERRADO Y DESPLEGADO` una vez aplicadas las correcciones de metadatos, incorporada la prueba de regresión y confirmada la publicación final en Firebase.