# Diagnóstico R02.1 — Workspace territorial

El módulo Territorios funcionaba únicamente como un resumen provincial. No permitía seleccionar un cantón ni relacionar, en una sola vista, el plan, los sitios, las acciones y las instituciones.

## Brechas atendidas

- ausencia de contexto territorial persistente;
- lectura fragmentada entre módulos;
- falta de priorización cantonal;
- inexistencia de accesos operativos contextualizados;
- exportación territorial no disponible.

## Solución

Se incorpora un workspace cantonal que consolida datos existentes sin modificar las estructuras almacenadas. El contexto seleccionado se conserva en `localStorage` y queda disponible para los siguientes sprints de Sitios, Acciones, Instituciones, Indicadores y Reportes.
