# Parche de seguridad territorial V10.1

## Objetivo

Impedir que un perfil no administrador cargue:

- `data.js`
- `window.SEED_DATA`
- el documento global `plataforma/datos`
- los demás archivos estáticos con datos zonales

## Comportamiento

- Administradores: conservan temporalmente la aplicación actual.
- Perfiles no administradores activos: solo ven su perfil y alcance, sin descargar la base zonal.
- Perfiles inactivos o inexistentes: no ingresan.
- Cambio de usuario después de una sesión administrativa: fuerza recarga completa.
- Soporte técnico: `diogenes.coello@gestionderiesgos.gob.ec`.

## Archivos

Copiar dentro de la carpeta `web-release` de la rama `seguridad-territorial-v10`:

1. `index.html` — reemplaza el archivo actual.
2. `access-gate.js` — archivo nuevo.

## Importante

Este parche es de contención. Todavía no habilita el trabajo operativo de los usuarios territoriales. El siguiente parche incorporará la lectura por `territorioIds`, `provinciaIds` y `unidadIds`.
