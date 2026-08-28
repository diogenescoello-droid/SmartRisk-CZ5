# Base metodológica de auditoría e hitos — SmartRisk CZ5

## Propósito

Esta base define cómo se congela, revisa, corrige, valida y registra un hito de SmartRisk CZ5. Su objetivo es impedir que una mejora visual o una cifra aislada se considere válida sin trazabilidad territorial, semántica, técnica y de despliegue.

## 1. Principios rectores

1. **Universo antes que numerador.** Todo indicador territorial debe declarar primero su universo rector. Para ENOS CZ5 el universo canónico vigente es de **56 expedientes/GAD**, identificados por `n = 1…56` en `enos-gad-review-context.js`.
2. **Identidad canónica.** Un GAD se contabiliza por su identificador canónico, no por etiquetas, alias, filas, registros o variantes ortográficas. Un GAD solo puede incrementar una vez una cobertura agregada.
3. **Sin atribución no hay cobertura.** Un registro documental ambiguo puede conservarse y mostrarse como pendiente de homologación, pero no incrementa la cobertura de GAD.
4. **No mezclar magnitudes.** Registros, GAD, acciones, sitios, rubros, fases, ejes, verificables y montos son unidades distintas. Solo se agregan magnitudes comparables.
5. **Separación semántica.** Existencia documental, validación técnica, coordinación, decisión, escalamiento, mitigación/cierre, avance del Plan y cumplimiento institucional son conceptos diferentes. Ninguno se usa como proxy automático de otro.
6. **Fuente, corte y alcance.** Toda cifra defendible debe poder responder: fuente, fecha/hora de corte, alcance territorial, unidad de medida y regla de cálculo.
7. **Incertidumbre explícita.** Cuando una fuente no permite cerrar un universo se usa `Por verificar`, `Mínimo defendible`, `Cualitativo`, `Sin atribución` o equivalente; no se imputa cero ni se fuerza precisión.
8. **Defensa en profundidad.** La corrección debe existir en la lógica, en las pruebas automáticas, en el lenguaje de interfaz y en la documentación del hito.
9. **Despliegue verificable.** Un cambio no se considera cerrado hasta que la suite canónica pasa y `DEPLOYMENT_STATUS.json` registra publicación exitosa en Firebase Hosting.
10. **Historia preservada.** Las auditorías anteriores no se reescriben para aparentar continuidad. Se conservan como líneas base históricas y se documenta qué hallazgos fueron resueltos, parcialmente resueltos o permanecen abiertos.

## 2. Niveles de evidencia

| Nivel | Evidencia | Uso permitido |
|---|---|---|
| E0 | Suposición, texto inferido o dato sin fuente | No contabilizar; solo hipótesis |
| E1 | Registro existente sin atribución territorial inequívoca | Mostrar como pendiente; no incrementar cobertura |
| E2 | Registro atribuible a GAD canónico | Conteo documental territorial |
| E3 | Fuente rectora verificada y semántica definida | Indicador técnico/documental defendible |
| E4 | E3 + acto/validación competente + trazabilidad de cambio | Decisión o estado institucional formalizable |

## 3. Severidad de hallazgos

- **Crítico:** puede producir una decisión materialmente falsa, vulnerar acceso o publicar datos fuera del universo rector.
- **Alto:** puede alterar una lectura ejecutiva, fecha de corte, atribución o trazabilidad importante.
- **Medio:** deuda técnica o semántica que no cambia por sí sola la decisión actual, pero facilita regresiones.
- **Bajo:** presentación, mantenibilidad o documentación sin impacto inmediato en el resultado.

## 4. Ciclo obligatorio de un hito

1. **Congelar referencia:** identificar commit, despliegue y corte de datos de partida.
2. **Inventariar fuentes:** matriz maestra, F01–F07, Firestore, capas, expedientes y metadatos de release aplicables.
3. **Verificar integridad:** cardinalidad, duplicados, alias, claves, nulos, unidades y coherencia de denominadores.
4. **Revisar semántica:** comprobar que cada indicador mide lo que su etiqueta afirma medir.
5. **Revisar alcance:** zona, provincia, cantón y registros institucionales deben filtrarse sin contaminación cruzada.
6. **Revisar seguridad:** lectura, escritura, alcance territorial, bitácora y rutas heredadas.
7. **Revisar experiencia de uso:** evitar sobreafirmaciones, ceros falsos, porcentajes sin método y mensajes que parezcan cumplimiento oficial.
8. **Desafiar el resultado:** construir casos adversos: duplicados, alias, registros sin cantón, provincia sola, datos desactualizados y categorías similares.
9. **Corregir:** resolver primero críticos y altos; registrar residuales con responsable lógico y condición de cierre.
10. **Automatizar regresiones:** convertir el error encontrado en una prueba o validador reproducible.
11. **Construir y validar:** ejecutar `scripts/test-release.mjs`; cualquier fallo bloquea publicación.
12. **Publicar y comprobar:** Firebase live debe finalizar en `success` y registrar el commit fuente.
13. **Cerrar hito:** documentar resultados, correcciones, pruebas, commit, despliegue, limitaciones y siguiente línea base.

## 5. Reglas de aceptación para indicadores territoriales

Un indicador agregado se rechaza si ocurre cualquiera de estos casos:

- numerador mayor que denominador;
- denominador distinto del universo rector sin una explicación visible;
- duplicados o alias incrementan cobertura;
- un registro sin GAD inequívoco incrementa cobertura;
- se suman acciones con rubros, fases, sitios o registros como si fueran la misma unidad;
- un indicador documental se presenta como avance, cumplimiento o decisión oficial sin sustento;
- el corte visible es anterior al activo de datos que la plataforma está consumiendo;
- el cálculo no puede reproducirse con las fuentes versionadas.

## 6. Regla de triangulación

Para cifras ejecutivas sensibles se revisan al menos tres planos independientes:

- **Plano de fuente:** dato original o paquete versionado.
- **Plano de lógica:** transformación, normalización y conteo en código.
- **Plano de salida:** texto/indicador que ve el usuario.

Cuando corresponda se añade un cuarto plano: **seguridad y persistencia** (Firestore) y un quinto: **release/despliegue** (artefacto canónico + Firebase).

## 7. Registro mínimo de cada hito

Cada informe de hito debe contener:

- identificador y fecha local;
- commit de partida;
- fuente(s) y cortes activos;
- universo rector;
- hallazgos por severidad;
- correcciones aplicadas;
- pruebas nuevas o actualizadas;
- estado de seguridad;
- estado de despliegue;
- riesgos residuales y condición de cierre;
- commit final o commit fuente publicado.

## 8. Línea base vigente

A partir del hito `HITO-2026-08-27-AUDITORIA-INTEGRAL`, esta metodología es la referencia documental para futuras auditorías de SmartRisk CZ5. Los documentos anteriores, incluida `AUDITORIA_50_CORRIDAS.md` del 18 de julio de 2026, se mantienen como antecedentes históricos y no sustituyen el estado vigente.