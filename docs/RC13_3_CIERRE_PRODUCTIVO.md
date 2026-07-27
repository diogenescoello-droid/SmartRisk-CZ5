# RC13.3 — Cierre productivo

## Rama

agent/rc13-3-cierre-productivo

## Respaldo inicial

- Commit base: d703847
- Etiqueta: backup-rc13-3-inicio-d703847

## Higiene de GitHub Pages

El workflow oficial es:

.github/workflows/pages.yml

La publicación se construye en la carpeta temporal `_site`.

Se excluyen del artefacto público:

- web-release/.firebase
- web-release/outputs
- web-release/frontend
- web-release/web-release
- archivos ZIP
- archivos inspect.ndjson
- archivos temporales de Office

## Pendientes posteriores

- Persistencia compartida por alcance.
- Reglas Firestore con perfil activo.
- Eliminación de administración por correo codificado.
- Validación de scopeKey en cada escritura.
- Migración de datos operativos estáticos a Firestore.
- Pruebas multiusuario y negativas.
- Fusión final con principal.

## Restricciones

- firestore.rules no debe desplegarse todavía.
- No ejecutar Pages desde esta rama hasta completar las pruebas.
