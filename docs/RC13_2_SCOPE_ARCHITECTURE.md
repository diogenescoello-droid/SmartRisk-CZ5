# RC13.2 — Interfaz unificada por alcance

## Objetivo

Todos los perfiles autorizados cargan la misma aplicación principal de
SmartRisk.

La diferencia entre administrador, técnico provincial y técnico cantonal
se aplica mediante el contexto territorial y no mediante otra interfaz.

## Comportamiento

### Administrador

- Acceso zonal.
- Conserva la aplicación y persistencia actuales.
- Administra usuarios y perfiles.

### Técnico provincial

- Misma interfaz principal.
- Consulta los cantones de la provincia asignada.
- Edita información de su ámbito.
- No administra perfiles.

### Técnico cantonal

- Misma interfaz principal.
- Consulta únicamente el cantón asignado.
- Edita planes, riesgos, acciones, COE y mesas.
- No consulta otros cantones.
- No administra perfiles.

## Persistencia de transición

Los perfiles no administrativos no escriben `plataforma/datos`.

Sus modificaciones se guardan en:

`territorialStates/{uid}`

Esto impide que una copia filtrada sobrescriba la base zonal completa.

## Seguridad

El archivo `firestore.rules` se genera como propuesta de reglas.

No debe desplegarse sin revisar primero que los perfiles activos tengan
`scopeKeys`, `territorioIds`, cantón o provincia correctamente asignados.


## Segregación de fuentes derivadas

Para perfiles no administrativos también se filtran antes de cargar
`app.js`:

- Estadísticas y revisiones ENOS.
- Menciones de sitios, tramos y áreas.
- Aportes F03 y sus geometrías.
- Fuentes heredadas de sitios.
- Expedientes históricos con identidad territorial.

Los controles de provincia y cantón se fijan según el perfil. La creación
de nuevos territorios permanece reservada para administración.
