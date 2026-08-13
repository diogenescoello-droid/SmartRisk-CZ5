# SmartRisk Consultoría — MVP UI

Prototipo aislado en la rama `feature/smartrisk-consultoria-mvp`.

## Objetivo
Construir una plataforma privada para gestionar el ciclo completo de consultorías técnicas: promoción, oportunidad, prefactibilidad, diseño técnico-económico, oferta, contratación, ejecución, procesamiento, entrega, cobro, cierre y postventa.

## Incluido en esta iteración
- Interfaz responsive y visualmente diferenciada del SmartRisk institucional.
- Selector de rol activo.
- Filtros combinables por provincia, cantón, etapa y búsqueda.
- Filtros rápidos por atención, presupuesto y ejecución.
- Tarjetas dinámicas de proyectos.
- Panel lateral con vistas de acciones, proyecto, presupuesto, documentos, Gates, alertas y auditoría.
- Restricción visual de información económica por rol.
- Drawer lateral para gestionar acciones o revisar expediente.
- Asistente de nuevo proyecto en cuatro pasos: Cliente → Territorio → Servicio → Presupuesto.
- Datos demostrativos de Salinas, Daule, Milagro y Babahoyo.

## Próxima iteración
1. Sustituir datos demo por Firestore.
2. Autenticación y asignación de roles reales.
3. Colecciones privadas de consultoría separadas del SmartRisk CZ5 institucional.
4. Integrar base territorial nacional provincia → cantón → área urbana/expansión.
5. Convertir el Super Presupuesto en motor económico de proyecto.
6. Implementar Gates con evidencia y aprobaciones reales.
7. Documentos y adjuntos por proyecto.
8. Alertas de plazos, costos, QA/QC, garantías y cobros.

## Aislamiento
Este módulo no debe publicar datos privados de consultoría dentro de las colecciones o vistas institucionales existentes. Su integración futura requiere reglas Firestore específicas y separación explícita de permisos, colecciones y navegación.
