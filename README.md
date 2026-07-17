# SmartRisk CZ5 — Sprint 1.6B

Versión `v2.7.0-alpha`.

## Conector Google Sheets

Este paquete incorpora el Centro de Sincronización y deja precargada la matriz real `Matriz_ENOS_CZ5_COMPLETA_GoogleSheets`.

ID configurado: `14pw4tCwW2gp0Vn_xd9dxOmjj84_4-m6m2qXpbrGkxPw`

Funciones principales:

- Configuración editable del Spreadsheet y las pestañas.
- Consulta de `BASE_LIMPIA` mediante la salida CSV de Google Visualization.
- Vista previa antes de modificar la caché local.
- Validación de columnas, identificadores duplicados, provincia y cantón.
- Mapeo de registros a Territorios, Instituciones y Acciones.
- Importación segura a `localStorage`.
- Historial de sincronizaciones.
- Registro de observaciones.
- Integración con Dashboard, Territorios, Indicadores y Reportes.

## Condición de acceso

La hoja debe permitir lectura mediante enlace compartido. No se almacena contraseña ni credencial dentro del proyecto. Si la política institucional impide el acceso público, la integración deberá migrarse en una versión posterior a OAuth 2.0 o Apps Script como proxy autenticado.
