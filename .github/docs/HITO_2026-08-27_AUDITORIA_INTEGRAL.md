# HITO-2026-08-27 — Auditoría integral SmartRisk CZ5

Fecha local de corte: 27 de agosto de 2026 · UTC-5  
Referencia de partida: commit `ca05b791b952d1e6f962af688912e0f44405078c`  
Corrección inmediata del incidente: `dc68ef836860ca7ec1fcf14726677203c7605a92`  
Fuente operativa final validada y desplegada: `9c8fda89113a6f09eb865e016060b0e956e98c88`  
Validación canónica final: GitHub Actions run `33137671304` · `success`  
Firebase Hosting final: GitHub Actions run `33137671301` · `success`  
Método: `.github/docs/BASE_METODOLOGICA_HITOS.md`  
Registro histórico: `.github/docs/HITOS_REGISTRO.md`

## 1. Objetivo

Cerrar como hito verificable el estado alcanzado por SmartRisk CZ5 después de corregir la inconsistencia visible `58 de 56 GAD`, revisar el sistema desde perspectivas independientes y convertir las lecciones del incidente en controles permanentes de integridad, trazabilidad y continuidad del release.

## 2. Alcance revisado

La auditoría cubre:

- universo territorial y matriz maestra de 56 expedientes;
- normalización de GAD, provincias, cantones y alias;
- estado documental del panel principal;
- semántica de monitoreo, validación, coordinación, decisión, escalamiento, mitigación y cierre;
- seguimiento F07 vigente y separación territorial/institucional;
- metadatos de release y fechas de corte;
- continuidad de la sincronización automática F07;
- seguridad y alcance de Firestore;
- bitácora de cambios;
- caché de activos críticos;
- construcción, pruebas y publicación Firebase;
- documentación histórica, backlog y trazabilidad de hitos.

## 3. Hallazgos y verificación multidimensional

### H-01 · Numerador territorial superior al universo — CRÍTICO — RESUELTO

**Incidente:** la interfaz mostró `58 de 56 GAD` porque registros/etiquetas territoriales podían actuar como unidades de cobertura.

**Verificación:** la matriz maestra contiene exactamente 56 expedientes, numerados `1…56`, distribuidos en 26 Guayas, 14 Los Ríos, 8 Bolívar, 4 Santa Elena y 4 Galápagos/CGREG. La cobertura usa el identificador canónico `doc.n` y un conjunto deduplicado de GAD.

**Prueba adversarial permanente:** la suite crea deliberadamente 58 registros atribuibles a los 56 expedientes y exige que el resultado permanezca en **56 GAD**. Luego añade un cantón inexistente y exige que el registro quede `sin atribución`, sin incrementar el numerador.

### H-02 · Registros ambiguos podían confundirse con cobertura — ALTO — RESUELTO

Un registro sin GAD inequívoco se conserva como `sin atribución`, pero queda fuera del numerador territorial. Un registro provincial sin cantón solo se atribuye a la entidad provincial cuando existe señal explícita de Prefectura/CGREG/nivel provincial.

Los alias territoriales se resuelven contra el expediente canónico; por ejemplo, `Jujan` no crea un GAD adicional respecto de Alfredo Baquerizo Moreno.

### H-03 · Proxy semántico demasiado amplio — ALTO — RESUELTO CON RESIDUAL

**Problema:** `institutions` no equivale automáticamente a coordinación, ni `breaches` a escalamiento.

**Corrección:** coordinación, decisión, escalamiento y mitigación/cierre requieren señales semánticas explícitas en el registro; ya no basta pertenecer a una colección genérica.

**Residual:** la clasificación sigue siendo una regla conservadora basada en campos/texto y no una validación institucional E4. La interfaz debe seguir tratándola como lectura documental, no como acto oficial.

### H-04 · Metadatos de release desactualizados — ALTO — RESUELTO

**Hallazgo:** `f07-current-data.js` registraba sincronización `2026-08-28T00:01:36.732Z`, última remisión `2026-08-27T21:48:10` y 164 seguimientos, mientras los metadatos del release aún reflejaban el corte del 23 de agosto y un mínimo de 116 seguimientos.

**Corrección:** `release-config.js` y `RELEASE_MANIFEST.json` quedaron sincronizados con el activo F07 publicado, y la suite comprueba automáticamente que `syncedAt`, última remisión y número de seguimientos coincidan.

### H-05 · Falta de prueba específica contra la regresión 58/56 — ALTO — RESUELTO

Se incorporó `tests/hito-integrity-20260827.mjs`, que prueba universo 1–56, distribución provincial, duplicados, alias, cantón inexistente, provincia sin cantón, falsos positivos semánticos, metadatos F07, sincronización futura, reglas Firestore, bitácora y caché de activos críticos.

### H-06 · Seguridad territorial — ALTO HISTÓRICO — PARCIALMENTE RESUELTO

La auditoría histórica del 18 de julio señalaba que cualquier autenticado podía modificar el documento operativo global. Las reglas actuales restringen la escritura global a administradores y habilitan escrituras operativas segmentadas por `scopeKey`, con validación de autor, revisión e identificadores. La bitácora `alcances/{scopeKey}/cambios` es append-only.

**Residual:** `/plataforma/datos` conserva lectura para cualquier perfil activo como compatibilidad de migración. El principio de mínimo privilegio de lectura aún depende parcialmente de retirar este legado cuando todos los módulos consuman repositorios segmentados.

### H-07 · Trazabilidad de despliegue — CONFORME

La publicación usa construcción canónica, validadores, todas las pruebas `.mjs`, chequeo sintáctico de JavaScript y evidencia de CI.

La corrida canónica final `33137671304` terminó en `success`. El artefacto reportó **164 activos**, **56 territorios**, **56 planes disponibles**, **38 pruebas** y **110 archivos JavaScript verificados**.

Firebase Hosting terminó en `success` para la fuente operativa `9c8fda89113a6f09eb865e016060b0e956e98c88`. `DEPLOYMENT_STATUS.json` registra `validation=success`, `deployment=success` y `status=deployed`.

### H-08 · Sincronización F07 podía volver a desalinear el release — ALTO — RESUELTO

**Hallazgo:** el sondeo F07 programado cada 15 minutos reescribía `syncedAt` aun sin cambios sustantivos y actualizaba únicamente `f07-current-data.js`. Esto podía provocar despliegues innecesarios y volver a dejar desalineados F07, manifiesto y configuración del release.

**Corrección:** la sincronización ahora:

1. construye una instantánea canónica y distingue `consulta` de `cambio sustantivo`;
2. conserva `syncedAt` si Kobo no cambió;
3. actualiza conjuntamente `f07-current-data.js`, `RELEASE_MANIFEST.json` y `release-config.js`;
4. ejecuta la suite completa antes de publicar;
5. verifica en producción los tres activos mediante comparación byte a byte y caché invalidada;
6. solo después de comprobar producción registra el commit de sincronización.

Esto convierte datos F07 + metadatos en una unidad de release verificable y evita que el control introducido por este hito se deteriore en el siguiente sondeo automático.

### H-09 · Cardinalidad F07 podía confundirse con cardinalidad territorial — ALTO — CONTROLADO

La auditoría semántica final demuestra:

- **164 registros F07 totales**;
- **162 registros territoriales** asociados al universo de 56 GAD;
- **2 registros institucionales zonales**;
- **56 expedientes procesados**.

Por tanto, `164`, `162` y `56` son magnitudes distintas. Ninguno de los conteos de registros F07 puede utilizarse como numerador de GAD sin una agregación previa por identificador territorial canónico.

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
- [x] F07 territorial se separa de registros institucionales zonales.
- [x] Metadatos release/F07 sincronizados.
- [x] Sincronización futura mantiene datos y metadatos como una unidad.
- [x] Prueba adversarial 58/56 incorporada y aprobada.
- [x] Reglas Firestore limitan escritura global a administrador.
- [x] Bitácora segmentada de cambios es append-only.
- [x] Activos críticos usan política `no-cache`.
- [x] Suite canónica final aprobada: 38 pruebas + 110 archivos JavaScript.
- [x] Firebase Hosting publicado y verificado.
- [x] Hito incorporado al registro histórico.

## 5. Riesgos residuales

1. **Lectura global heredada:** `plataforma/datos` continúa legible por perfiles activos durante la migración.
2. **Clasificación semántica heurística:** coordinación/escalamiento/cierre requieren normalización estructurada futura para alcanzar evidencia E3/E4 sin depender de texto.
3. **Duplicación de normalizadores:** existen tablas/funciones de alias en más de un módulo de escritorio. No altera el universo actual, pero es deuda de mantenibilidad y debe centralizarse progresivamente.
4. **Pruebas predominantemente determinísticas:** la suite protege regresiones de datos, seguridad y código, pero no sustituye una prueba E2E autenticada en navegador sobre todos los perfiles, dispositivos y condiciones de red.
5. **Fuentes con distintos cortes:** la matriz maestra tiene corte técnico 22-ago-2026 y F07 tiene corte operativo 27-ago-2026. Deben seguir mostrándose como fuentes/cortes independientes.
6. **Validación institucional:** el motor puede demostrar presencia, atribución y consistencia documental; no debe convertir automáticamente esos hallazgos en aprobación, cumplimiento o decisión institucional E4.

## 6. Resultado de cierre

**CERRADO Y DESPLEGADO.** El incidente `58/56` dejó de ser solamente una corrección puntual y se convirtió en un control estructural del release. El universo de 56 GAD está protegido en lógica, prueba adversarial, semántica de interfaz, metadatos, sincronización automática, seguridad, caché y documentación.

La referencia operativa de este hito es `9c8fda89113a6f09eb865e016060b0e956e98c88`. Los riesgos residuales anteriores permanecen abiertos de forma explícita y deberán cerrarse mediante hitos posteriores, no mediante sobreafirmaciones en este documento.