# Corrección del error de integración

## Error encontrado

La RC14.2 no estaba construida sobre la RC13.2 efectiva. En `web-release/index.html` se habían retirado `scope-context.js`, `scope-repository.js` y `scope-ui.js`; además se modificó `rc13-menu.js`. Esto explicaba que la propuesta no conservara exactamente el alcance, navegación y apariencia de la plataforma vigente.

## Corrección aplicada

- Se reconstruyó la versión desde la base RC13.2.
- `rc13-menu.js` y `rc13-menu.css` permanecen idénticos a RC13.2.
- No se creó ninguna ruta ni pestaña principal nueva.
- La línea base F07 se carga como datos de apoyo antes del filtrado territorial.
- Los 51 cantones, 56 entidades y 100 seguimientos se integran en la estructura de datos.
- El formulario `Registrar actualización` se incorporó dentro de la pantalla actual de Acciones.
- Los datos alimentan los indicadores existentes, el estado territorial y la Bandeja de decisiones.
- Una actualización migrada no modifica una acción oficial mientras no se vincule a una acción y una ficha o sitio existentes.
