# Registro de hitos — SmartRisk CZ5

Este registro conserva la secuencia de líneas base verificables del proyecto. Un hito no reemplaza retrospectivamente a otro: cada uno conserva su fecha, alcance, evidencia, hallazgos y estado de despliegue.

## Reglas del registro

1. Cada hito debe vincular una metodología, un informe de auditoría o cierre y una referencia de código/datos.
2. Los hitos históricos no se editan para hacerlos coincidir con el estado actual; se documenta su evolución en un hito posterior.
3. `CERRADO Y DESPLEGADO` exige validación automática satisfactoria y evidencia de publicación productiva.
4. Las fuentes con fechas de corte distintas se registran por separado; no se fusionan en una fecha ficticia única.
5. Los riesgos residuales permanecen visibles hasta que otro hito documente su cierre.

## Línea de hitos

| Hito | Fecha local | Estado | Referencia principal | Evidencia |
|---|---|---|---|---|
| `BASELINE-2026-07-18-AUDITORIA-50` | 2026-07-18 | Histórico | Auditoría de 50 recorridos | `AUDITORIA_50_CORRIDAS.md` |
| `HITO-2026-08-27-AUDITORIA-INTEGRAL` | 2026-08-27 | **CERRADO Y DESPLEGADO** | Fuente operativa `9c8fda89113a6f09eb865e016060b0e956e98c88` | `.github/docs/HITO_2026-08-27_AUDITORIA_INTEGRAL.md`; `DEPLOYMENT_STATUS.json` |

## HITO-2026-08-27-AUDITORIA-INTEGRAL — síntesis de cierre

- Universo rector: **56 expedientes/GAD**.
- Prueba adversarial: **58 registros atribuibles → 56 GAD**, sin exceder el universo.
- F07 vigente al cierre: **164 registros = 162 territoriales + 2 institucionales zonales**; esta cardinalidad no equivale a número de GAD.
- Suite canónica: **38 pruebas + 110 archivos JavaScript**, resultado `PASS`.
- Firebase Hosting: `validation=success`, `deployment=success`, `status=deployed`.
- Commit fuente desplegado: `9c8fda89113a6f09eb865e016060b0e956e98c88`.
- Metodología vigente: `.github/docs/BASE_METODOLOGICA_HITOS.md`.

## Próximo criterio de apertura de hito

Debe abrirse un nuevo hito cuando ocurra al menos una de estas condiciones:

- cambio del universo rector o de la estructura territorial;
- cambio material del modelo de datos F01–F07;
- retiro del almacenamiento global heredado `/plataforma/datos`;
- sustitución de las reglas semánticas heurísticas por clasificación documental estructurada;
- incorporación de pruebas E2E autenticadas como requisito de release;
- cambio mayor de arquitectura, seguridad, roles/permisos o ciclo COE;
- incidente de integridad que obligue a modificar reglas de cálculo o controles de aceptación.