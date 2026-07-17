# Arquitectura — Sprint 1.1B

SmartRisk CZ5 utiliza una arquitectura frontend modular sin dependencias externas.

## Capas

1. **Core**
   - `constants.js`
   - `config.js`
   - `events.js`
   - `storage.js`
   - `utils.js`
   - `router.js`

2. **Componentes**
   - Sidebar
   - Navbar
   - Toast

3. **Módulos**
   - Dashboard
   - Territorios
   - Instituciones
   - Sitios
   - Acciones

4. **Bootstrap**
   - `app.js`

## Decisión técnica

Se utiliza enrutamiento por hash (`#/dashboard`) para mantener compatibilidad con:

- apertura directa del archivo HTML;
- GitHub Pages;
- servidores estáticos sin configuración de reescritura.
