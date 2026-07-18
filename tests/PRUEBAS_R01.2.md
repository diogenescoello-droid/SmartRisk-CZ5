# Pruebas manuales R01.2

Ejecutar con Live Server desde `frontend/index.html`.

## Navegación

1. Abrir `#/dashboard`. Debe verse el breadcrumb `Inicio › Operación › Dashboard`.
2. Usar el selector `Ir a` y elegir Territorios. Debe abrir `#/territorios`.
3. Navegar a Indicadores. El breadcrumb debe mostrar el grupo `Análisis`.
4. Navegar a KoboToolbox. El breadcrumb debe mostrar el grupo `Datos`.
5. Pulsar `Inicio` en el breadcrumb. Debe regresar al Dashboard.

## Controles

6. Pulsar el botón de alertas. Debe mostrarse una notificación.
7. Pulsar el botón de tema. Debe alternar el tema sin cambiar de ruta.
8. Pulsar el botón del menú. Debe contraer el menú en escritorio o abrirlo en móvil.

## Teclado y accesibilidad

9. Recargar y presionar Tab. Debe aparecer `Saltar al contenido principal`.
10. Activar ese enlace con Enter. El foco debe pasar al área principal.
11. Recorrer botones y selector con Tab. Debe observarse un contorno de foco visible.

## Responsive

12. Probar a 760 px o menos. El selector rápido debe ocultarse sin romper la barra.
13. Probar a 520 px o menos. El breadcrumb debe simplificarse.

## Regresión

14. Confirmar que las diez rutas continúan abriendo.
15. Confirmar que formularios, tablas y datos no presentan cambios funcionales.
