# Pruebas manuales R01.3

## Preparación

1. Confirme que la rama actual sea `feature/r01-ux-navigation`.
2. Abra `frontend/index.html` con Live Server.
3. Acceda a `#/dashboard`.
4. Actualice con `Ctrl + F5` después de instalar el parche.

## Casos de prueba

### 1. Carga general

- El Dashboard debe cargar sin errores en consola.
- Debe aparecer una franja con estado operativo, última sincronización y cobertura.

### 2. KPIs navegables

- Pulse Avance operativo: debe abrir `#/acciones`.
- Regrese al Dashboard.
- Pulse Sitios registrados: debe abrir `#/sitios`.
- Pulse Instituciones: debe abrir `#/instituciones`.
- Pulse Alertas operativas: debe abrir `#/acciones`.

### 3. Alertas

- Cada alerta debe ser seleccionable.
- Las alertas de acciones deben abrir Acciones.
- Las alertas de sitios deben abrir Sitios.

### 4. Actualización

- Pulse Actualizar.
- La vista debe actualizarse sin recargar completamente el navegador.
- Debe aparecer un mensaje de confirmación.

### 5. Exportación

- Pulse Exportar resumen.
- Debe descargarse `resumen-ejecutivo-smartrisk.csv`.
- El archivo debe incluir acciones sin evidencias y última sincronización.

### 6. Responsive

- Pruebe anchos aproximados de 1366 px, 768 px y 390 px.
- No debe existir desbordamiento horizontal general.
- La tabla cantonal puede desplazarse horizontalmente dentro de su panel.

### 7. Teclado

- Navegue con Tab.
- KPIs, alertas, actividad y accesos rápidos deben mostrar foco visible y activarse con Enter.
