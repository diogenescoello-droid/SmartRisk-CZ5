# Auditoría de seguridad de accesos — SmartRisk CZ5

**Fecha:** 2026-08-03  
**Versión revisada:** RC14.3.3 y corrección RC14.4.0-security  
**Alcance:** Firebase Authentication, perfiles Firestore, roles, alcances, recuperación de contraseña, reglas de acceso y flujo operativo de entrega de credenciales.

## 1. Dictamen ejecutivo

La falla del piloto no correspondió únicamente a la entrega del correo de recuperación. El acceso dependía de que cuatro elementos coincidieran sin existir una conciliación automática:

1. correo de la base de contactos;
2. correo de Firebase Authentication;
3. UID de Authentication;
4. ID y contenido del documento `perfiles/{uid}`.

Además, la plataforma intentaba crear usuarios con el SDK web desde el navegador. Ese mecanismo no es una consola administrativa segura y podía dejar estados parciales: usuario creado, perfil no guardado, correo no enviado o contacto sin `authUid`.

**Conclusión:** la versión anterior no era apta para entregar credenciales masivamente sin una validación individual previa.

## 2. Hallazgos

### Críticos

- **Provisionamiento desde el navegador.** `createUserWithEmailAndPassword` es una operación de registro del SDK cliente, no una operación administrativa. El alta institucional debe realizarse con Firebase Console o Firebase Admin SDK en un entorno confiable.
- **Exposición de contraseña temporal.** Un complemento mostraba la clave en una alerta, la copiaba al portapapeles y la conservaba en una variable global del navegador.
- **Dos fuentes de verdad.** `data.usuarios` funcionaba como directorio de contactos, mientras Authentication y `perfiles` controlaban el ingreso. No existía reconciliación entre ellos.
- **Autorización global insuficiente.** La base `plataforma/datos` permitía a perfiles activos modificar arreglos globales según campos de primer nivel. El filtrado JavaScript no constituye un límite de seguridad.
- **Reglas incompletas para `alcances`.** La interfaz usa `alcances/{scopeKey}/registros` y `alcances/{scopeKey}/estado`, pero esas rutas no estaban declaradas en las reglas del repositorio.

### Altos

- Roles institucionales como `Visor provincial AME` no eran aceptados por el menú interno.
- La lista de administradores no era uniforme entre reglas, contexto y aplicación.
- El correo de recuperación se mostraba como exitoso aunque el error se hubiera ocultado.
- Una falla posterior a la creación de Authentication podía dejar el proceso incompleto.
- El correo almacenado en el perfil podía diferir del correo real de Authentication.

### Medios

- No existe todavía una conciliación automática periódica Auth ↔ Firestore.
- No se ha configurado App Check para reducir abuso desde clientes no autorizados.
- No existe MFA obligatorio para administradores.
- GitHub Pages limita la aplicación de encabezados HTTP de seguridad administrados por el servidor.

## 3. Correcciones RC14.4.0-security

- Se retiró del HTML el componente que exponía contraseñas temporales.
- Se eliminó el alta de usuarios del flujo operativo recomendado.
- Se añadió validación explícita de UID, correo, estado, rol y alcance antes de cargar la plataforma.
- Se normalizaron los roles institucionales sin modificar globalmente el prototipo de Firestore.
- Se añadió cambio obligatorio de contraseña en el primer ingreso mediante el campo `requiereCambioClave`.
- Se creó `access-admin.html`, una consola restringida para vincular un UID existente con su perfil y auditar la estructura de `perfiles`.
- Se creó `scripts/audit-firebase-access.mjs` para conciliar Authentication y Firestore con Firebase Admin SDK.
- Se endurecieron las reglas para que la base global sea de escritura administrativa y los usuarios territoriales trabajen en su alcance autorizado.
- Se añadieron exclusiones para impedir que credenciales o informes sensibles se suban al repositorio.

## 4. Procedimiento aprobado para entregar credenciales

### Alta individual

1. En Firebase Console → Authentication, crear o revisar el usuario.
2. Confirmar el correo letra por letra y copiar el UID completo.
3. Abrir `access-admin.html` e ingresar con una cuenta administrativa autorizada.
4. Registrar el UID, el mismo correo, el rol, el estado y los `scopeKeys`.
5. Mantener activado `requiereCambioClave`.
6. Entregar la contraseña temporal únicamente por canal individual.
7. Probar en ventana privada.
8. Confirmar que el usuario cambia la contraseña y visualiza solo su alcance.

### Criterio de credencial funcional

Una credencial se considera funcional únicamente cuando cumple todos estos controles:

- Authentication: usuario existente y no deshabilitado;
- Firestore: documento `perfiles/{uid}` existente;
- correo del perfil idéntico al correo de Authentication;
- `estado = Activo`;
- rol compatible;
- alcance definido;
- primer cambio de contraseña completado;
- ingreso probado en ventana privada;
- cierre de sesión probado;
- lectura y escritura verificadas según el rol.

## 5. Conciliación completa con Admin SDK

Desde Google Cloud Shell, en una carpeta temporal:

```bash
npm init -y
npm install firebase-admin
export FIREBASE_PROJECT_ID=smartrisk-cz5-produccion
node scripts/audit-firebase-access.mjs
```

El script informa:

- usuarios de Authentication sin perfil;
- perfiles sin usuario Authentication;
- UID o correo desalineado;
- cuentas deshabilitadas;
- roles incompatibles;
- duplicidad de correos;
- perfiles sin alcance.

Para aprovisionar desde un manifiesto controlado:

```bash
node scripts/audit-firebase-access.mjs --apply scripts/pilot-users.example.json
```

El archivo `pilot-credentials-*.json` contiene información confidencial. Debe distribuirse de forma individual y eliminarse después.

## 6. Despliegue obligatorio

Los cambios del repositorio no garantizan que las reglas ya estén activas en Firebase. Debe desplegarse y verificarse:

```bash
firebase use smartrisk-cz5-produccion
firebase deploy --only firestore:rules
```

GitHub Pages debe publicar el commit de `main`. Después, abrir la plataforma con un parámetro de versión y realizar `Ctrl + F5`.

## 7. Pruebas mínimas antes de reabrir el piloto

| Caso | Resultado esperado |
|---|---|
| Correo inexistente | No ingresa; mensaje de credencial inválida |
| Authentication sin perfil | Rechazo específico por perfil faltante |
| UID correcto y correo diferente | Rechazo por desalineación |
| Perfil inactivo | Rechazo por estado |
| Rol no compatible | Rechazo por rol |
| Técnico territorial | Ve únicamente su alcance y puede registrar cambios permitidos |
| Visor AME | Ve su alcance y no puede escribir |
| Administrador | Acceso zonal y consola de auditoría |
| Primer ingreso | Exige contraseña personal de 12 caracteres o más |
| Segundo ingreso | Acepta la contraseña personal y no repite el cambio |
| Dos navegadores | Los cambios autorizados se sincronizan sin exponer otros territorios |

## 8. Riesgo residual

La conciliación real de todos los usuarios no puede probarse únicamente revisando el código. Debe ejecutarse el script con credenciales administrativas o revisarse Authentication y Firestore en el proyecto Firebase. Hasta completar esa conciliación y desplegar las reglas, el estado debe considerarse **corregido en código, pendiente de validación operativa**.

## Referencias técnicas

- Firebase Authentication, Admin SDK: administración segura de usuarios desde servidor.
- Firebase Authentication: generación de enlaces de restablecimiento con Admin SDK para entrega mediante correo propio.
- Cloud Firestore Security Rules: las reglas no son filtros y deben ajustarse a las consultas y documentos autorizados.
- Firebase API keys: identifican el proyecto; la autorización depende de reglas, IAM y App Check.
