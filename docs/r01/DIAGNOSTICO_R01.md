# Diagnóstico R01 — Navegación y usabilidad base

## Alcance
Se revisaron el router, menú lateral, barra superior, modales, tablas y mecanismos de recuperación. La intervención conserva los módulos y el modelo de datos existentes.

## Hallazgos priorizados

| ID | Hallazgo | Impacto | Mejora aplicada |
|---|---|---:|---|
| NAV-001 | Coincidencia estricta de rutas y ausencia de alias | Alto | Normalización, soporte para `/` y eliminación de barra final |
| NAV-002 | Ruta inválida sin opciones de recuperación | Alto | Pantalla 404 con Dashboard y Regresar |
| NAV-003 | Errores de renderizado sin recuperación | Alto | Captura de errores y botón Reintentar |
| UX-001 | Menú sin agrupación funcional | Medio | Grupos Operación, Análisis y Datos |
| UX-002 | Falta de orientación global | Alto | Breadcrumb y selector rápido de módulo |
| UX-003 | Menú móvil permanece abierto | Medio | Cierre automático al seleccionar una ruta |
| ACC-001 | Controles sin nombres accesibles | Alto | `aria-label`, `aria-current` y estructura semántica |
| ACC-002 | Modales sin Escape ni gestión de foco | Alto | Escape, trampa de foco y restauración del foco |
| ACC-003 | Sin acceso directo al contenido | Medio | Enlace “Saltar al contenido principal” |
| UI-001 | Estado vacío poco informativo | Medio | Mensaje descriptivo en tablas |

## Resultado estimado
La intervención mejora especialmente orientación, memorabilidad, prevención de errores, recuperación y uso mediante teclado. No modifica la lógica de negocio ni las integraciones.
