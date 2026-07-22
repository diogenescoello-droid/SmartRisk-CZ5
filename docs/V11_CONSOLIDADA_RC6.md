# SmartRisk V11 RC6 — versión consolidada

## Objetivo

Consolidar en una sola entrega los ajustes V11 aprobados hasta RC5 y recuperar una pantalla inicial tipo dashboard con los datos clave del alcance autorizado.

## Principios que no se modifican

- Se conserva el contrato visual aprobado: interfaz clara, barra lateral azul, tarjetas blancas, acentos institucionales y asistentes flotantes.
- No se cambia el contenido funcional de Respuesta COE, Monitoreo, COE, Riesgos, Acciones, Instituciones, Reportes, Mapas, Herramientas o Configuración.
- No se cambian Firebase, autenticación, reglas, permisos, scopeKeys ni segregación territorial.
- El piloto permanece en solo lectura.
- Todos los perfiles conservan la misma arquitectura visual; cambian los datos y las acciones permitidas.

## Ajustes consolidados

1. Se incorpora `Inicio`, un dashboard interactivo con indicadores clave, prioridades y accesos operativos.
2. Se reorganiza el orden del menú sin eliminar módulos:
   - Resumen: Inicio.
   - Operación COE: Respuesta COE, COE y Acciones.
   - Análisis y territorio: Monitoreo, Riesgos y Mapas.
   - Coordinación y productos: Instituciones y Reportes.
   - Administración: Herramientas y Configuración.
3. Se conserva la versión RC5 de conectores neuronales dinámicos.
4. Se conserva la normalización territorial y la persistencia del contexto entre pantallas.
5. Se actualiza la versión de caché a `11.0.0-rc6`.

## Dashboard inicial

El dashboard no crea un modelo de datos nuevo. Resume las entidades ya autorizadas para el usuario:

- COE activos.
- Riesgos críticos.
- Reportes de monitoreo.
- Acciones activas y avance.
- Cobertura territorial.
- Calidad mínima de los registros.
- Riesgos y acciones prioritarias.
- Accesos rápidos a los módulos existentes.

## Referencias visuales

Las imágenes aprobadas incluidas en el paquete son el contrato de comparación para las pantallas y sus estados. La primera referencia de Respuesta COE define el patrón principal; las demás definen guía, paneles laterales, programación, acciones, mapas, instituciones, monitoreo y respuesta final.

## Validación requerida

La instalación ejecuta pruebas de sintaxis y una prueba de humo estructural. La aprobación final continúa siendo visual en navegador a 100 % de zoom y en las resoluciones de referencia.
