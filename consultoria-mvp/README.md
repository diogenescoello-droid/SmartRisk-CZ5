# SmartRisk Consultoría — MVP funcional

Módulo privado aislado en la rama `feature/smartrisk-consultoria-mvp`.

## Objetivo
Gestionar el ciclo completo de consultorías técnicas: promoción, oportunidad, prefactibilidad, diseño técnico-económico, oferta, contratación, ejecución, procesamiento, entrega, cobro, cierre y postventa.

## Implementado
- Interfaz responsive diferenciada del SmartRisk institucional.
- Autenticación con Firebase Authentication y modo demostración sin escritura.
- Perfil de consultoría independiente en `consultoria_perfiles/{uid}`.
- Roles: Gerencia, Comercial, Coordinación Técnica, Geotecnia, Geofísica, SIG/Modelación, Gestión Contractual, Finanzas, QA/QC, Cliente/GAD y Auditor.
- Asignación de acceso por proyecto.
- Filtros por provincia, cantón, etapa, texto y filtros rápidos.
- Vista de proyectos en tarjetas o lista.
- Panel de acciones, Ficha Maestra, presupuesto, documentos, Gates, alertas y auditoría.
- Drawer para registrar acciones y evidencias.
- Asistente de proyecto: Cliente → Territorio → Servicio → Presupuesto.
- Motor paramétrico inicial de presupuesto con perforación a USD 90/m, Vs, HVSR, personal y administrador contractual.
- Persistencia Firestore para proyectos y acciones cuando las reglas estén desplegadas.
- Catálogo nacional de 24 provincias y 222 cantones, incluyendo Sevilla Don Bosco.
- Separación de datos económicos en `consultoria_proyectos/{id}/economia/resumen` para evitar exponer margen/costos a perfiles técnicos o clientes.
- Auditoría inmutable por proyecto.
- Reglas Firestore específicas para el módulo privado.
- `release-assets.json` incluye `consultoria-mvp` para que el build copie el módulo a `dist`.

## Colecciones Firestore

```text
consultoria_perfiles/{uid}
consultoria_catalogos/{documento}
consultoria_territorios/{territorio}
consultoria_proyectos/{projectId}
  ├─ economia/resumen
  ├─ acciones/{actionId}
  ├─ gates/{gateId}
  ├─ documentos/{documentId}
  ├─ observaciones_cliente/{observationId}
  └─ auditoria/{auditId}
```

El documento principal del proyecto no debe almacenar costos internos ni margen. Eso permite que los clientes y especialistas consulten la información necesaria sin recibir información económica confidencial.

## Seguridad
- Acceso de menor privilegio.
- Perfil privado separado del perfil institucional.
- Gerencia administra perfiles y proyectos.
- Finanzas y Gerencia acceden a economía interna.
- Técnicos acceden solo a proyectos asignados.
- Cliente/GAD accede solo a productos y observaciones liberadas.
- Auditoría no puede modificarse ni eliminarse.
- El comodín final de Firestore continúa denegando cualquier ruta no declarada.

## Pendiente inmediato
1. Poblar `consultoria_perfiles` con usuarios reales.
2. Desplegar las nuevas reglas Firestore en un entorno controlado.
3. Incorporar áreas urbanas y de expansión verificadas desde PDOT/PUGS al catálogo territorial.
4. Convertir el presupuesto paramétrico en el motor completo del Super Presupuesto.
5. Gates persistentes con checklist, evidencia, aprobador y sello temporal.
6. Gestión real de archivos y versiones de entregables.
7. Alertas automáticas de plazos, garantías, QA/QC, sobrecostos y cobros.
8. Dashboard gerencial consolidado de cartera, rentabilidad y riesgos.

## Aislamiento institucional
SmartRisk Consultoría utiliza el mismo stack tecnológico del repositorio, pero no debe mezclar datos comerciales o privados con las colecciones institucionales de SmartRisk CZ5. El aislamiento se aplica a colecciones, reglas, roles y navegación.
