# Pruebas manuales R01.1

1. Abrir `frontend/index.html` con Live Server.
2. Confirmar que abre `#/dashboard`.
3. Probar cada enlace del menú, incluido ArcGIS Online.
4. Abrir directamente `#/DASHBOARD/` y confirmar que carga el Dashboard.
5. Abrir `#/ruta-inexistente` y confirmar que aparecen “Ir al Dashboard” y “Reintentar”.
6. Desde una ruta inválida, pulsar “Ir al Dashboard”.
7. Usar Atrás y Adelante del navegador.
8. En una ventana menor a 860 px, abrir el menú y seleccionar una ruta; el menú debe cerrarse.
9. Abrir la consola y ejecutar `SmartRisk.Router.list()`; deben aparecer diez rutas.
10. Ejecutar `SmartRisk.Router.has('/arcgis')`; debe devolver `true`.
