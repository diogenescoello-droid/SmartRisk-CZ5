# SmartRisk CZ5 · Reconstrucción RC14.4.4

Fecha de trabajo: 2026-07-30
Rama: `rescate/rc14.4.4-windows-20260730`
Base: `main` / RC14.4.3
PR de revisión: `#4` — borrador, sin publicación productiva

## Objetivo

Reconstruir desde Windows la actualización observada en la Mac, sin alterar la publicación productiva, conservando la interfaz y las funciones ya validadas y recuperando el flujo de credenciales personales, trazabilidad y control administrativo.

## Estado de implementación

### Completado en RC14.4.4-rc1

- [x] Rama de rescate separada de `main`.
- [x] Identificación visible de la compilación RC14.4.4.
- [x] Formulario de invitación con nombre, correo, teléfono, rol y territorio.
- [x] Creación de cuenta mediante instancia secundaria de Firebase Auth.
- [x] Envío de enlace para que el usuario defina su contraseña personal.
- [x] Reenvío del enlace sin revelar ni conocer la contraseña.
- [x] Estados: sin credenciales, credenciales creadas, invitación enviada, correo pendiente, activo y suspendido.
- [x] Suspensión y reactivación mediante el estado del perfil de Firestore.
- [x] Panel administrativo con filtros, resumen, UID y actividad registrada.
- [x] Registro de primer y último acceso, alcance y versión utilizada.
- [x] Reglas Firestore propuestas para `accesos/{uid}`.
- [x] Protección frente a registros huérfanos cuando falla la creación del perfil.
- [x] PR `#4` creado como borrador para revisión y comparación.

### Pendiente de prueba o implementación

- [ ] Desplegar las reglas de Firestore de la rama en un entorno controlado.
- [ ] Ejecutar una invitación real con correo de prueba no utilizado.
- [ ] Confirmar definición de contraseña e ingreso del invitado.
- [ ] Verificar alcance cantonal y menús por rol.
- [ ] Probar suspensión, rechazo del ingreso y reactivación.
- [ ] Registrar cierre de sesión y consultas a módulos sensibles.
- [ ] Incorporar trazabilidad específica para exportaciones, observaciones y aperturas de expedientes.
- [ ] Comparar con los archivos locales de la Mac.
- [ ] Actualizar `VERSION.txt` y la validación de despliegue cuando se apruebe la versión final.

### Limitación arquitectónica conocida

La creación de cuentas usa Firebase Auth desde el navegador porque la aplicación actual es estática. El perfil obligatorio en Firestore impide que una cuenta sin autorización acceda a SmartRisk, pero una implementación definitiva debería trasladar la creación y revocación de usuarios a una función administrativa con Firebase Admin SDK. La versión piloto mantiene esta restricción documentada.

## Línea base que debe conservarse

1. Interfaz operativa RC13.2 y módulos territoriales existentes.
2. Firebase Authentication y Firestore del proyecto `smartrisk-cz5-produccion`.
3. Acceso únicamente para usuarios con perfil activo en `perfiles/{uid}`.
4. Reconocimiento del administrador y alcance zonal.
5. Alcances zonal, provincial y cantonal, con filtrado de información y permisos.
6. Sincronización central con control de revisiones y detección de conflictos.
7. Recuperación y cambio de contraseña mediante Firebase.
8. Auditoría de cambios con usuario, fecha, acción, entidad y registro.
9. Publicación mediante GitHub Actions sin modificar `main` hasta validar.

## Ajustes que deben reconstruirse o verificarse

### A. Cuenta personal y credenciales

- La cuenta es personal y no debe compartirse.
- Cada invitado debe definir su propia contraseña.
- No se permitirá el registro público sin autorización previa.
- El correo debe quedar asociado al perfil, institución, rol y territorio autorizado.
- El primer acceso debe exigir cambio de contraseña temporal o aceptación de invitación.
- Debe existir recuperación de acceso por correo.

### B. Administración de usuarios

- Visualización de usuarios invitados, pendientes, activos, suspendidos y revocados.
- Identificación del UID de Firebase y del perfil de Firestore.
- Asignación de rol y alcance territorial.
- Reenvío de invitación o recuperación sin conocer la contraseña personal.
- Registro de quién autorizó, modificó, suspendió o revocó cada acceso.

### C. Trazabilidad

Registrar, como mínimo:

- inicio y cierre de sesión;
- consulta de expedientes o módulos sensibles;
- creación, edición, validación y cierre de registros;
- observaciones y actualizaciones;
- cambios de rol, territorio y estado de usuario;
- exportaciones y apertura del analista externo.

Cada evento debe conservar usuario, fecha y hora, módulo, acción, registro afectado y detalle suficiente para auditoría.

### D. Identificación inequívoca de versión

- Mostrar versión funcional, fecha de compilación y commit en la interfaz.
- Usar la misma versión en HTML, CSS y JavaScript para evitar caché mezclada.
- Incluir `VERSION.txt` coherente con la interfaz realmente publicada.
- Añadir una comprobación de despliegue que valide más que el texto de `VERSION.txt`.

## Pruebas de aceptación

1. Administrador ingresa y visualiza alcance zonal completo.
2. Usuario invitado registra o define credencial personal.
3. Usuario sin perfil activo no puede ingresar.
4. Usuario cantonal solo visualiza su cantón.
5. Usuario provincial solo visualiza su provincia.
6. Recuperación de contraseña envía correo sin revelar credenciales.
7. Dos usuarios editando simultáneamente reciben control de conflicto.
8. Una consulta, observación y actualización quedan asociadas al usuario correcto.
9. La versión visible coincide con `VERSION.txt` y con los recursos cargados.
10. La publicación productiva no cambia hasta aprobación expresa.

## Comparación con la Mac

Antes de integrar, comparar los archivos locales de la Mac mediante `git status`, `git diff` y `git log`. Todo cambio exclusivo de la Mac debe incorporarse a esta rama o conservarse en una rama separada antes de actualizar `main`.
