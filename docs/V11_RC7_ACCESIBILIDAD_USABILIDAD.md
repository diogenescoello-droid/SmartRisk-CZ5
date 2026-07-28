# SmartRisk V11 RC7 — accesibilidad y usabilidad consolidada

## Objetivo

Cerrar los hallazgos prioritarios de la auditoría RC6 sin modificar el contrato visual, la arquitectura de módulos, el modelo de datos, Firebase, los alcances territoriales ni el modo de solo lectura.

## Ajustes incorporados

### 1. Guía dinámica contextual

- Aparece automáticamente a los dos segundos en `Inicio` durante el primer uso.
- La introducción oscurece la pantalla y resalta el botón que inicia la guía.
- Después de iniciar, desaparece la opacidad general y queda una burbuja contextual.
- Cada paso contiene:
  - una pregunta operativa;
  - la explicación de lo que resuelve el control;
  - una acción sugerida;
  - navegación Anterior/Siguiente;
  - indicador de progreso;
  - cierre mediante botón o tecla `Escape`.
- Incluye recorridos específicos para Inicio, Respuesta COE, Monitoreo, COE, Riesgos, Acciones, Instituciones, Reportes, Mapas, Herramientas y Configuración.
- Las flechas izquierda/derecha permiten recorrer los pasos desde el teclado.

### 2. Notificaciones funcionales

La campana superior abre un panel calculado con los datos visibles del alcance:

- riesgos críticos o altos;
- acciones vencidas;
- validaciones pendientes;
- alertas tempranas.

Cada notificación dirige al módulo correspondiente. No crea ni modifica registros.

### 3. Perfil y lectura cómoda

El botón de perfil abre:

- usuario;
- rol;
- alcance;
- modo de acceso;
- acceso a Configuración;
- cierre de sesión;
- tamaños de lectura `A`, `A+` y `A++`.

`A+` es el tamaño predeterminado recomendado. La selección queda guardada en el navegador.

### 4. Tipografía y accesibilidad

- Se eleva la tipografía operativa para evitar textos de 8–11 px.
- Se amplían controles, botones, filtros, tablas, tarjetas y textos secundarios.
- Se incorpora foco visible de alto contraste para teclado.
- Se mantiene respuesta adaptable para escritorio, resoluciones intermedias y móvil.
- La vista compacta reduce espacios, no el tamaño mínimo de lectura.

### 5. Controles previamente inactivos

- `Filtros` de Monitoreo dirige y resalta el bloque de filtros superior.
- Los elementos de la línea de tiempo abren un detalle funcional.
- Las pestañas de Herramientas enfocan la tarjeta correspondiente.
- Las opciones del Especialista GPT generan un contexto revisable, copiable y abrible en ChatGPT.
- Las preferencias de notificaciones, guía y vista compacta quedan operativas en el navegador.

## Límites que se conservan

RC7 no habilita:

- creación o edición de registros;
- validación formal;
- envío de chat;
- cierre de acciones;
- exportación oficial;
- importación de archivos;
- modificación de usuarios.

Estas funciones continúan visualmente identificadas como deshabilitadas durante el piloto de solo lectura.

## Archivos

- `web-release/index.html`
- `web-release/v11-rollout.js`
- `web-release/v11-ux-rc7.js`
- `web-release/v11-ux-rc7.css`
- `tests/v11-rc7-smoke.mjs`
- `docs/V11_RC7_ACCESIBILIDAD_USABILIDAD.md`

## Versión

`11.0.0-rc7`
