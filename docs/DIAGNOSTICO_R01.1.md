# Diagnóstico R01.1 — Fundación de navegación

## Alcance revisado

Se revisaron los archivos reales de configuración, arranque, router, menú lateral y registro de los diez módulos del proyecto SmartRisk CZ5.

## Hallazgos confirmados

1. El router dependía de coincidencias exactas y no normalizaba barras finales, mayúsculas ni parámetros.
2. Una excepción durante `render()` o `bind()` podía dejar una vista vacía sin mecanismo de recuperación.
3. Las rutas no encontradas solo mostraban texto, sin retorno al Dashboard ni reintento.
4. ArcGIS estaba agregado manualmente al menú y fuera de `Config.navigation`, por lo que no recibía correctamente el estado activo.
5. El arranque descartaba silenciosamente módulos ausentes mediante `filter(Boolean)`.
6. El menú móvil permanecía abierto después de seleccionar una opción.
7. Los enlaces activos no exponían `aria-current="page"`.

## Mejoras aplicadas

- Normalización de rutas y alias `/` → `/dashboard`.
- Compatibilidad con barras finales y diferencias de mayúsculas.
- Pantallas recuperables para ruta inválida y error de módulo.
- Registro explícito y diagnóstico de módulos ausentes.
- ArcGIS integrado en la navegación configurada.
- Menú agrupado en Operación, Análisis y Datos.
- Cierre del menú móvil al navegar.
- Estado activo accesible.
- API de inspección: `SmartRisk.Router.list()` y `SmartRisk.Router.has(path)`.

## Riesgo del cambio

Bajo. No se modificaron datos, almacenamiento, formularios, servicios, integraciones ni lógica de negocio.
