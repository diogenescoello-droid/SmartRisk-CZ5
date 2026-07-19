# SmartRisk CZ5 · Pruebas R03.3

## Alcance

- listado, búsqueda y filtrado de usuarios;
- creación y edición de cuentas;
- asignación de rol e institución;
- asignación territorial zonal, provincial o cantonal;
- activación, suspensión y bloqueo;
- restablecimiento de contraseña temporal;
- validación de correos duplicados;
- protección contra eliminación o suspensión de la cuenta propia;
- restricción del rol Administrador para coordinadores zonales.

## Prueba principal

1. Ingresar como Administrador.
2. Abrir **Administración > Usuarios**.
3. Crear una cuenta provincial y comprobar la clave temporal `1234`.
4. Editar su institución, cargo y ámbito.
5. Suspenderla y comprobar que no puede iniciar sesión.
6. Activarla, restablecer la clave y comprobar que exige cambio en el primer acceso.
7. Intentar crear un correo duplicado y verificar que el sistema lo rechaza.
8. Ingresar como Coordinador zonal y verificar que no puede crear ni editar administradores.

## Restricción deliberada

Los usuarios y contraseñas siguen almacenados en LocalStorage. La seguridad criptográfica, el envío real de correo y la persistencia centralizada corresponden a R04 Backend.
