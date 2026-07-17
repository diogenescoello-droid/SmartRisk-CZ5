# SmartRisk CZ5 — Sprint 1.7A

Versión `v2.8.0-alpha`.

Este paquete incorpora la integración con **KoboToolbox**:

- Configuración del servidor KoboToolbox.
- UID del formulario y token API.
- Consulta de metadatos y envíos mediante API v2.
- Vista previa segura antes de importar.
- Mapeo editable de campos.
- Validación de provincia, cantón e identificadores.
- Conversión de envíos en sitios, acciones e instituciones.
- Fusión por identificador para reducir duplicados.
- Historial local de importaciones.
- Compatibilidad con `kf.kobotoolbox.org` y servidores Kobo compatibles.

## Seguridad

El token se guarda en el almacenamiento local del navegador. Esta solución es apropiada para pruebas y operación controlada. La versión institucional debe ocultar el token detrás de un servicio backend o proxy seguro.

## Operación

1. Abra KoboToolbox.
2. Copie el UID del formulario.
3. Genere o copie su token API.
4. Configure el mapeo según los nombres reales de las preguntas.
5. Ejecute Vista previa.
6. Revise las observaciones.
7. Pulse Importar envíos.
