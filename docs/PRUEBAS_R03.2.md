# SmartRisk CZ5 · Pruebas R03.2

## Alcance
- contraseña temporal en el primer acceso;
- cambio obligatorio a contraseña personal;
- cambio voluntario desde el menú de usuario;
- recuperación local simulada mediante correo y código de seis dígitos;
- persistencia de contraseña en LocalStorage;
- registro local de último acceso y fecha de cambio.

## Prueba principal
1. Abrir `frontend/login.html`.
2. Seleccionar cualquier perfil y usar `1234`.
3. Crear una contraseña de al menos ocho caracteres.
4. Comparar la interfaz del perfil.
5. Cerrar sesión e ingresar con la nueva contraseña.
6. Probar “¿Olvidaste tu contraseña?” y utilizar el código mostrado en pantalla.

## Restricción deliberada
El envío real de correo no forma parte de R03.2. Requiere backend, base de datos y proveedor SMTP/API. En este sprint se valida el flujo funcional y la interfaz.
