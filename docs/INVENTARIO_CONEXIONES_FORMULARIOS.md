# Inventario de conexiones de formularios SmartRisk

Fecha de corte: 2026-08-10

## Resultado de la revisión

La versión publicada no dispone todavía de una ingestión automática de extremo a extremo para todos los formularios. Existen dos fuentes cargadas como instantáneas estáticas y un formulario SmartRisk v0.6 publicado sin conector productivo hacia la base canónica. Esta distinción debe conservarse en toda comunicación institucional.

| Fuente | Identificador verificable | Estado actual | Destino funcional | Conexión automática |
|---|---|---|---|---|
| F03, registro cartográfico | Kobo `a86WYnMJZA3XCNJ8tcjQb2` | Instantánea incluida en `f03-data.js` | Cartografía, sitios y lectura territorial | No |
| F07, acciones y seguimiento | Kobo `aGBMqM63bGK9fLADxYfe4w` | Línea base incluida en `pilot-baseline-data.js` | Acciones, seguimientos e indicadores | No |
| SmartRisk, registro territorial de campo v0.6 | Formulario público `https://ee.kobotoolbox.org/x/aEcQSdRP`; ID XLSForm `smartrisk_registro_territorial_v06` | Formulario publicado; ingestión canónica pendiente | Sitios, geometrías, riesgos, calidad, acciones y revisión | No |

## Campos de enlace canónico del formulario v0.6

- Identidad: `id_evaluacion` (UUID generado una sola vez).
- Territorio: `provincia`, `canton` y `sector`.
- Geometría: `ubicacion_gps`, `geom_tramo`, `geom_area`, `latitud`, `longitud` y `precision_gps_m`.
- Control técnico: `estado_revision` y `apto_integracion_sig`.
- Resultado: `riesgo_integrado_score`, `riesgo_integrado_nivel` y `prioridad_auto`.
- Gestión: `accion_recomendada` y `recomendacion_tecnica`.

## Criterio para declarar una conexión debidamente habilitada

Una fuente solo podrá marcarse como conectada cuando cumpla simultáneamente:

1. recepción automática mediante un servicio de servidor o webhook autenticado;
2. secreto Kobo almacenado en el servidor, nunca en JavaScript ni en el navegador;
3. idempotencia por `_uuid` o `id_evaluacion`, sin registros duplicados;
4. cuarentena y registro de errores para envíos incompletos;
5. homologación explícita hacia territorio, sitio, acción, seguimiento y geometría;
6. marca de procedencia, fecha de actualización y auditoría;
7. prueba de un alta, una corrección y un reintento sin duplicación.

## Acceso al documento original de los planes

La revisión de planes ofrece el botón **Abrir PDF original** únicamente cuando existe una URL HTTPS registrada en el plan o en su entidad territorial. Si no existe una fuente verificable, se muestra **PDF original no vinculado** y no se construyen enlaces por inferencia. La apertura queda registrada en la auditoría de la plataforma.

La carpeta institucional de planes fue recorrida en profundidad el 2026-08-10. La revisión confirmó PDF en 55 territorios; San Cristóbal conserva únicamente archivos de control porque su plan fue devuelto y continúa pendiente de firma y oficio. Daule fue incorporado posteriormente con su PDF oficial. El catálogo inicial de enlaces verificables incluye Guayas provincial, Daule, Bolívar provincial, Los Ríos provincial, Galápagos provincial, Santa Elena provincial y La Libertad. Los demás enlaces deben incorporarse progresivamente, después de verificar que cada archivo corresponda al plan original y no a un informe o anexo.

## Decisión de arquitectura pendiente de despliegue

La automatización necesita un componente de servidor que reciba Kobo, transforme los datos y escriba en Firestore con privilegios controlados. El repositorio actual contiene hosting y Firestore, pero no una función productiva para esta tarea. No debe reutilizarse el conector experimental que conserva un token Kobo en el navegador.
