# Changelog

## HITO-2026-08-27-AUDITORIA-INTEGRAL

- Se establece el universo rector canónico de **56 GAD/expedientes** como denominador obligatorio para coberturas territoriales ENOS.
- Se corrige la regresión que permitió mostrar `58 de 56 GAD`: duplicados, alias y registros sin atribución inequívoca ya no incrementan cobertura.
- Se endurece la semántica de coordinación, decisión, escalamiento y mitigación/cierre para evitar proxies automáticos entre colecciones distintas.
- Se sincronizan `release-config.js` y `RELEASE_MANIFEST.json` con el corte F07 vigente del 27-ago-2026: 164 seguimientos, última remisión 27-ago-2026 21:48:10.
- Se incorporan la base metodológica de auditoría/hitos y el informe integral del hito.
- Se añaden controles `no-cache` para metadatos y módulos críticos de integridad territorial.
- Se incorpora una prueba adversarial específica para impedir numeradores territoriales superiores al universo rector.
- Se conserva `AUDITORIA_50_CORRIDAS.md` como línea base histórica; sus hallazgos no se reescriben retrospectivamente.

## v2.0.0-alpha

- Arquitectura inicial.
