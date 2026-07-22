# SmartRisk V11 RC9 — Normalización integral de planes

RC9 corrige la diferencia entre un plan visible y sus componentes operativos disponibles en los módulos.

## Cambios

- integra campos planos de Firestore con `payload` y `data`;
- interpreta arreglos, objetos y JSON anidados dentro de planes;
- deriva en memoria acciones, brechas, riesgos, alertas y contactos;
- conserva cantón, provincia, evento y plan de origen;
- normaliza responsable, institución, estado, prioridad, plazo y avance;
- evita duplicados mediante firmas operativas;
- diferencia cero acciones reales de información no estructurada;
- muestra trazabilidad del plan de origen en la tabla de Acciones;
- expone un resumen de normalización en `state.data.normalization`.

## Seguridad

Los registros derivados son virtuales y existen únicamente en memoria durante la sesión. RC9 no escribe, modifica ni elimina documentos de Firestore.
