# SmartRisk CZ5

**V1.0.0 PILOTO ESTABLE · SmartRisk CZ5**

Plataforma de gestión territorial de riesgos de la Zona 5. La versión vigente conserva un universo rector de **56 expedientes/GAD** y separa explícitamente existencia documental, revisión técnica, seguimiento operativo y decisiones institucionales.

## Hito vigente

`HITO-2026-08-27-AUDITORIA-INTEGRAL`

- Metodología de auditoría e hitos: `.github/docs/BASE_METODOLOGICA_HITOS.md`
- Informe del hito: `.github/docs/HITO_2026-08-27_AUDITORIA_INTEGRAL.md`
- Línea base histórica: `AUDITORIA_50_CORRIDAS.md` (18-jul-2026)
- Backlog posterior a V1: `.github/docs/BACKLOG_POST_V1.md`
- Estado verificable de despliegue: `DEPLOYMENT_STATUS.json`

## Reglas de integridad vigentes

- El denominador territorial procede de la matriz maestra de 56 GAD.
- Un GAD cuenta una sola vez mediante su identificador canónico.
- Registros sin atribución GAD inequívoca no incrementan cobertura.
- Registros, GAD, acciones, sitios, fases, rubros y verificables no se mezclan como unidades equivalentes.
- El estado documental no representa por sí mismo avance del Plan, cumplimiento del GAD ni una decisión oficial.
- Cada release se construye y valida con `node scripts/test-release.mjs` antes de su publicación en Firebase Hosting.

Producción: `https://smartrisk-cz5-produccion.web.app/`
