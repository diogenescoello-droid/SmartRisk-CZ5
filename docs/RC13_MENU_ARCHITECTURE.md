# SmartRisk CZ5 — RC13

## Reorganización de la arquitectura funcional del menú principal

### Objetivo

Reorganizar la navegación de SmartRisk CZ5 sin cambiar la arquitectura técnica existente, las rutas internas, los identificadores de página, Firebase, ArcGIS, la base de datos ni los mecanismos de autenticación y autorización.

### Principio de implementación

RC13 funciona como una capa de presentación desacoplada. La aplicación mantiene los identificadores actuales (`dashboard`, `revision`, `acciones`, `territorios`, `sitios`, `herramientas`, `usuarios`, `instituciones`, `decisiones` y `cabina`). La nueva capa únicamente los agrupa y renombra visualmente.

## Arquitectura aprobada

### Funciones transversales

- **Panorama e indicadores** → `dashboard`
- **Centro de decisiones** → `decisiones`

Estas funciones combinan información de planificación, análisis territorial y respuesta operativa, por lo que no deben duplicarse dentro de los módulos.

### Módulo 1 — Planificación y gestión documental

- **Planes, checklist y brechas** → `revision`
- **Seguimiento e informes** → `acciones`

Cobertura funcional actual: revisión de planes, evaluación de cumplimiento, checklist, hallazgos, brechas, ajustes derivados, seguimiento de acciones, productos, indicadores, evidencias e informes.

### Módulo 2 — Análisis y monitoreo

- **Estado de GAD** → `territorios`
- **Sitios y polígonos** → `sitios`
- **Mapa, capas y tableros** → `herramientas`

Cobertura funcional actual: indicadores territoriales, estado operativo de GAD, sitios críticos, geometrías, cartografía, capas, alertas, fichas técnico-científicas y tableros.

### Módulo 3 — Respuesta operativa

- **COE y actores** → `usuarios`
- **Mesas técnicas** → `instituciones`
- **Monitoreo operativo** → `cabina`
- **Recursos operativos** → brecha funcional visible, todavía sin una pantalla propia

La entrada “Recursos operativos” se presenta deshabilitada para no simular una funcionalidad inexistente. Su desarrollo posterior deberá incorporar inventario, disponibilidad, ubicación, responsable, capacidad, estado y asignación.

## Reglas de compatibilidad

1. No modificar `app.js`, `scoped-app.js`, `access-gate.js`, Firebase ni los datos.
2. Conservar todos los atributos `data-page` y `data-scope-page`.
3. Respetar los botones que la aplicación ya filtró por rol.
4. No duplicar rutas ni funcionalidades.
5. Mantener el menú territorial segregado de solo lectura.
6. Permitir retirar RC13 eliminando dos referencias de `index.html` y dos archivos independientes.

## Criterios de aceptación

- El inicio de sesión funciona igual que antes.
- Los permisos por rol no cambian.
- Cada opción existente abre la misma pantalla que en la versión anterior.
- El menú se presenta agrupado en tres módulos y funciones transversales.
- La Cabina COE se muestra como acceso directo únicamente en la interfaz administrativa completa.
- La navegación territorial segregada conserva sus filtros y permisos.
- La interfaz es utilizable en escritorio, tableta y móvil.
- No se realizan escrituras nuevas en Firestore por efecto del menú.
