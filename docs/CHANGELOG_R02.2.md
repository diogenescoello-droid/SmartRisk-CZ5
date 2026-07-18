# R02.2 — Smart Drawer

## Problema resuelto
El detalle de una acción ocupaba una columna fija, cubría parte de la matriz y no ofrecía un mecanismo visible para cerrarlo.

## Cambios
- Nuevo componente global `SmartRisk.Drawer` reutilizable.
- Panel lateral derecho con botón de cierre visible.
- Cierre mediante tecla `Esc`.
- Cierre al hacer clic fuera del panel.
- Restauración del foco al control que abrió el detalle.
- Adaptación a móvil como panel de ancho completo.
- La matriz de acciones recupera el ancho completo.
- Edición y eliminación continúan disponibles desde la ficha.

## Archivos funcionales
- `frontend/index.html`
- `frontend/components/drawer.js`
- `frontend/assets/css/drawer.css`
- `frontend/modules/acciones/acciones.js`
- `frontend/assets/css/acciones.css`
