# SmartRisk CZ5 — Control de cambios y recuperación

## Versión estable vigente

- Versión pública: RC14.4.4 RC5.
- Build: 14.4.4-rc5.
- Corte de datos: 30 de julio de 2026.
- URL única: `https://diogenescoello-droid.github.io/SmartRisk-CZ5/`.
- Universo mínimo validado: 56 territorios, 55 planes disponibles y 106 seguimientos.
- Respaldo de recuperación: `backup/rc14.4.4-rc5-estable-20260730`.
- Commit de recuperación anterior a las garantías: `0067de1c9b2e035f151ee5f7342d6ea1ab0a4678`.

## Regla de publicación

`main` representa únicamente la versión pública estable. Ningún cambio funcional o de datos debe llegar directamente a `main`. El flujo obligatorio es:

1. Crear una rama `feature/*`, `fix/*` o `chore/*` desde el último `main`.
2. Actualizar `RELEASE_MANIFEST.json` cuando cambien versión, corte, fuentes o conteos.
3. Ejecutar `node scripts/validate-release.mjs`.
4. Verificar que la rama no esté detrás de `main`.
5. Revisar la vista de prueba y los indicadores con un usuario administrador y un usuario territorial.
6. Confirmar persistencia en Firestore y abrir la misma información desde un segundo navegador o computadora.
7. Promover a `main` únicamente si todas las pruebas son satisfactorias.
8. No mantener pull requests antiguos abiertos cuando hayan sido superados por una versión estable.

## Fuentes y prelación

Cuando existan diferencias, se usa el registro más reciente y trazable por entidad:

1. Envío Kobo F07 con identificador de submission y fecha.
2. Documento formal y matriz documental actualizada en Drive.
3. Correo institucional con oficio, plan o informe adjunto.
4. Registro directo en SmartRisk con auditoría.
5. Instantáneas anteriores solo como antecedente; nunca deben sobrescribir información posterior.

Cada actualización debe conservar fuente, fecha de corte, entidad, enlace o identificador y responsable de consolidación.

## Controles automáticos

El despliegue debe detenerse cuando ocurra cualquiera de estas condiciones:

- La versión del manifiesto no coincide con la interfaz o la compuerta de acceso.
- El paquete comprimido de datos no puede descomprimirse o interpretarse.
- El corte del paquete no coincide con el manifiesto.
- Hay menos de 56 territorios, 55 planes disponibles o 106 seguimientos.
- Faltan módulos obligatorios del seguimiento R02.3.
- La compuerta no carga `latest-data-update.js`.
- Las reglas de Firestore no reconocen la administración institucional.
- El workflow no ejecuta la validación antes del despliegue.

## Prueba mínima antes de declarar estable

- Ingreso desde la URL principal sin utilizar `/preview/`.
- Identificación visible de versión y fecha de datos.
- Cobertura de seguimiento distinta de `0 de 0`.
- Consulta de un territorio con plan actualizado.
- Consulta de una actualización Kobo reciente.
- Creación o modificación controlada de un registro de prueba.
- Estado de sincronización visible como `Sincronizado`.
- Cierre de sesión, ingreso desde otro navegador o computadora y verificación del mismo registro.
- Validación de que el usuario territorial no puede acceder a territorios no asignados.
- Confirmación de que el administrador puede recuperar la versión desde la rama de respaldo.

## Recuperación

Si una publicación presenta pérdida de datos, versión incorrecta o fallo de carga:

1. Suspender nuevas modificaciones de usuarios.
2. Registrar captura, hora, usuario y mensaje de sincronización.
3. Comparar `main` con `backup/rc14.4.4-rc5-estable-20260730`.
4. Restaurar el commit estable mediante fast-forward o reversión controlada; nunca borrar el historial.
5. Verificar Firestore antes de reabrir la plataforma.
6. Documentar causa, corrección y prueba de no regresión.

## Responsabilidad operativa

La Coordinación Zonal 5 aprueba la publicación y el corte de datos. Las fuentes Kobo, Drive y correo son insumos de consolidación; Firestore es la persistencia compartida de la plataforma. El navegador local es un respaldo temporal y no puede considerarse fuente oficial por sí solo.
