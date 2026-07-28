# Auditoría crítica de SmartRisk CZ5 — 100 perspectivas

Fecha: 18 de julio de 2026  
Alcance: interfaz, código, modelo de datos, reglas de Firestore y recorridos funcionales sin alterar registros reales.  
Método: 100 escenarios heurísticos y trazables, no una encuesta a 100 personas. Cada escenario se calificó como **Operativo**, **Parcial** o **No resuelto**. Puntaje = operativo + 0,5 × parcial.

## Resultado ejecutivo

- Preparación funcional ponderada: **56/100**.
- Operativos: **36/100**.
- Parciales: **39/100**.
- No resueltos o deliberadamente fuera de la competencia de la plataforma: **25/100**.
- Superficie revisada: **10 módulos**, **153 botones renderizados**, **70 enlaces de clic**, **17 formularios**, **27 controles de cambio** y **17 diálogos especializados**.
- La cifra 56 no representa porcentaje de desarrollo ni disponibilidad del servicio. Representa cuánto del ciclo integral puede resolverse hoy, con controles suficientes, en los 100 escenarios definidos.

| Dominio | Operativo | Parcial | No resuelto | Puntaje |
|---|---:|---:|---:|---:|
| Acceso, perfiles y seguridad | 3 | 3 | 4 | 45 |
| Territorios y planes | 5 | 4 | 1 | 70 |
| Sitios críticos | 5 | 4 | 1 | 70 |
| Decisiones y control | 4 | 4 | 2 | 60 |
| Acciones, evidencia e informes | 5 | 4 | 1 | 70 |
| SIG y cartografía | 4 | 4 | 2 | 60 |
| COE, mesas y grupos | 3 | 4 | 3 | 50 |
| Usabilidad y accesibilidad | 4 | 4 | 2 | 60 |
| Concurrencia, conectividad y escala | 1 | 3 | 6 | 25 |
| Gobernanza, legalidad y auditoría | 2 | 5 | 3 | 45 |

## Lectura crítica

SmartRisk ya funciona como un **sistema de conducción del riesgo** y no solamente como un repositorio: conecta plan → hallazgo → ficha territorial → decisión → acción → evidencia. Su mayor fortaleza es hacer visible lo pendiente y convertirlo en trabajo asignable. Su mayor debilidad es que el modelo técnico continúa concentrado en un único documento compartido; esto limita la seguridad territorial, la concurrencia, la escala y la fuerza probatoria de la auditoría.

La auditoría anterior indicaba que cualquier autenticado podía actualizar todo. Esa afirmación ya no es exacta: las reglas actuales restringen campos por rol. La brecha vigente es más específica y todavía seria: dentro de los arreglos autorizados, el servidor no valida que cada registro corresponda al territorio, institución, acción o sesión asignada al usuario.

## Las 100 perspectivas

### 1. Acceso, perfiles y seguridad

1. Administrador inicia sesión y cambia contraseña — **Operativo**.
2. Usuario recupera contraseña sin intervención técnica — **Operativo**.
3. Cuenta sin perfil activo intenta entrar — **Operativo**: se deniega.
4. Técnico distingue contacto vigente de acceso habilitado — **Parcial**: la explicación existe, pero el alta completa todavía requiere coordinación administrativa.
5. Perfil cambia de territorio durante una emergencia — **Parcial**: puede editarse, sin vigencia temporal ni historial específico de asignación.
6. Líder MTT intenta editar una colección no autorizada — **Parcial**: Firestore restringe campos, pero la interfaz puede mostrar rutas incompatibles.
7. Técnico intenta modificar otro cantón manipulando el cliente — **No resuelto**: la regla no valida el territorio de cada registro.
8. Usuario con rol autorizado lee datos de todos los territorios — **No resuelto**: la lectura del documento operativo es global.
9. Administrador delegado distinto de los correos codificados — **No resuelto**: la administración depende de dos correos fijos.
10. Revocación inmediata de una sesión comprometida — **No resuelto**: no existe consola operativa de sesiones/dispositivos.

### 2. Territorios y revisión de planes

11. Coordinador identifica territorios sin plan — **Operativo**.
12. Técnico busca su cantón y abre el panorama — **Operativo**.
13. Revisor consulta evidencia y página del plan — **Operativo**.
14. Revisor distingue hallazgo documental de validación territorial — **Operativo**.
15. Control identifica acciones nuevas propuestas por el propio plan — **Operativo**.
16. Se recibe una nueva versión del plan — **Parcial**: falta versionado documental y comparación entre versiones.
17. Dos planes nombran distinto el mismo territorio — **Parcial**: la normalización existe, pero persisten variantes heredadas.
18. Documento escaneado con OCR deficiente — **Parcial**: puede marcarse evidencia insuficiente, no medirse confianza de extracción.
19. Técnico valida un hallazgo en campo — **Parcial**: registra avance, sin firma, coordenada de levantamiento ni adjunto robusto.
20. Se necesita demostrar que se revisó el archivo original completo — **No resuelto**: no hay repositorio versionado ni huella del documento fuente.

### 3. Sitios críticos

21. Técnico diferencia mención, ficha pendiente y ficha gestionable — **Operativo**.
22. Completa sitio, tramo o área con campos faltantes — **Operativo**.
23. Guarda avance sin aprobar una ficha incompleta — **Operativo**.
24. Administrador aprueba y convierte la ficha — **Operativo**.
25. Usuario filtra por riesgo, brecha, acción y facilidad — **Operativo**.
26. Varias menciones corresponden al mismo sitio — **Parcial**: falta fusión asistida y control de duplicados espaciales.
27. El nombre del lugar es ambiguo o no oficial — **Parcial**: puede describirse, pero falta catálogo geográfico/gazetteer.
28. Un sitio cruza dos cantones — **Parcial**: la ficha presupone una asignación territorial principal.
29. Una ficha cambia de nivel de riesgo con nueva evidencia — **Parcial**: se actualiza, sin historial comparativo del cambio.
30. Se necesita archivar una ficha errónea conservando trazabilidad — **No resuelto**: no hay flujo formal de archivo o anulación.

### 4. Bandeja de decisiones

31. Control filtra decisiones por categoría — **Operativo**.
32. Abre contexto, evidencia y ruta de respuesta — **Operativo**.
33. Asigna responsable, compromiso y estado — **Operativo**.
34. Impide cerrar como resuelta sin evidencia — **Operativo**.
35. Una decisión deriva de varias fuentes — **Parcial**: el sustento es textual, sin expediente de fuentes versionadas.
36. Una decisión requiere aprobación de dos autoridades — **Parcial**: no hay aprobación secuencial o colegiada.
37. Se debe escalar por subsidiariedad — **Parcial**: puede registrarse, no controlar solicitud, aceptación y nivel.
38. Cambia el dato que originó una decisión — **Parcial**: falta congelar la evidencia y versión usada.
39. La autoridad necesita firmar el acto decisorio — **No resuelto**.
40. Se intenta emitir automáticamente una alerta o evacuación — **No resuelto** y no debe automatizarse: corresponde a autoridad competente.

### 5. Acciones, evidencia e informes

41. Convierte una ficha real en acción — **Operativo**.
42. Define responsable, plazo, producto, indicador y cierre — **Operativo**.
43. Controla pendiente, vencida, detenida y avance — **Operativo**.
44. Impide completar una acción sin evidencia — **Operativo**.
45. Descarga informe Word de seguimientos — **Operativo**.
46. Evidencia geográfica comprueba área, tramo o punto atendido — **Parcial**: es opcional y depende de calidad cartográfica.
47. Acción depende de otra institución — **Parcial**: el campo existe, sin aceptación ni bloqueo automatizado.
48. Acción periódica requiere varios cortes de seguimiento — **Parcial**: falta serie histórica de avances.
49. Informe debe incluir anexos, fotos y firmas — **Parcial**: el Word reproduce datos, pero no incorpora expediente documental.
50. Informe debe ser verificable contra una fuente inmutable — **No resuelto**: código temporal sin hash, firma o repositorio sellado.

### 6. SIG y cartografía

51. Carga KML/KMZ y lo proyecta — **Operativo**.
52. Carga ZIP/SHP y lo transforma — **Operativo**.
53. Dibuja punto, línea, polígono o buffer — **Operativo**.
54. Exporta selección a KMZ o GeoJSON — **Operativo**.
55. Clasifica amenaza, vulnerabilidad, exposición y capacidad — **Parcial**: existen aportes sin clasificar.
56. Consulta fuente, fecha, institución y validez — **Parcial**: metadatos desiguales entre aportes.
57. Usa colores para leer riesgo — **Parcial**: la clasificación es preliminar y no una modelación oficial homogénea.
58. Vincula geometría con sitio, acción o sesión COE — **Parcial**: el vínculo existe, sin control topológico o precisión.
59. Reproyecta un SHP con sistema de referencia desconocido — **No resuelto**: falta selección/validación explícita de CRS.
60. Ejecuta análisis de red para rutas seguras — **No resuelto**.

### 7. Cabina COE, mesas y grupos

61. Crea sesión desde un problema territorial — **Operativo**.
62. Asigna acción, actor, mesa, plazo y producto — **Operativo**.
63. Visualiza flujo ideal y actores faltantes — **Operativo**.
64. Configura objetivo y actividades de MTT/GT — **Parcial**: falta catálogo oficial completo y vigencias.
65. Exige producto para cerrar actividad — **Parcial**: el producto es referencia textual.
66. Coordina dependencia entre mesas — **Parcial**: se muestra destino, sin motor de dependencias.
67. Construye panorama común con mapa F03 — **Parcial**: sin fuentes operativas en tiempo real.
68. Cierra periodo operacional con relevo y pendientes — **No resuelto**.
69. Genera SITREP consolidado — **No resuelto**.
70. Controla recursos, alojamientos y servicios esenciales — **No resuelto**.

### 8. Usabilidad y accesibilidad

71. Usuario nuevo entiende el flujo mediante preguntas guía — **Operativo**.
72. Sombreado inicial desaparece y la guía queda opcional — **Operativo**.
73. Listas extensas usan categorías y paginación — **Operativo**.
74. Pantallas explican estados vacíos y siguiente paso — **Operativo**.
75. Técnico usa la plataforma en tableta — **Parcial**: hay diseño adaptable, faltan pruebas sistemáticas de gestos y mapas.
76. Usuario trabaja con teclado — **Parcial**: algunos controles tienen etiquetas, no hay cobertura accesible completa.
77. Usuario con baja visión interpreta color y estado — **Parcial**: se acompaña con texto en varios módulos, no existe auditoría WCAG.
78. Usuario bajo presión encuentra acción urgente — **Parcial**: filtros ayudan, pero no hay búsqueda global o modo emergencia.
79. Lector de pantalla interpreta mapas y diagramas — **No resuelto**.
80. Usuario reduce animaciones o movimiento — **No resuelto**: no se detectó `prefers-reduced-motion`.

### 9. Concurrencia, conectividad y escala

81. Un usuario guarda con conexión estable — **Operativo**.
82. Pierde conexión y conserva respaldo local — **Parcial**: informa modo local.
83. Recupera conexión después de editar sin red — **Parcial**: falta cola de cambios y resolución campo por campo.
84. Otro usuario modifica antes de guardar — **Parcial**: detecta revisión y recarga, pero puede perder trabajo local.
85. Veinte técnicos guardan simultáneamente — **No resuelto**: un único documento y una única revisión serializan todo.
86. La cartografía hace superar 900 kB — **No resuelto**: la aplicación detiene sincronización.
87. El documento alcanza el límite de Firestore — **No resuelto**.
88. Una edición pequeña obliga a transferir el estado completo — **No resuelto**.
89. Crecen miles de acciones, decisiones y capas — **No resuelto**: sin consultas paginadas de servidor.
90. Falla el mapa base o una librería externa durante el COE — **No resuelto**: no hay paquete operativo sin conexión.

### 10. Gobernanza, legalidad y auditoría

91. Se registra quién cambió una acción y cuándo — **Operativo**.
92. Se conserva fuente y estado preliminar de cartografía — **Operativo**.
93. Se separa dato reportado de validación territorial — **Parcial**.
94. Se registra fundamento normativo de una decisión — **Parcial**: campo libre, sin catálogo ni acto enlazado.
95. Se aplica minimización por perfil — **Parcial**: menú y escritura por rol, lectura operativa global.
96. Se demuestra cadena de custodia de evidencia — **Parcial**: hay referencias, no integridad criptográfica.
97. Se define retención, archivo y disposición — **Parcial**: no hay política operacionalizada.
98. Auditoría conserva historia completa — **No resuelto**: se recorta a 500 eventos y permanece mutable.
99. Se atiende rectificación sin destruir trazabilidad — **No resuelto**.
100. Se acredita autenticidad de informe y acto — **No resuelto**: falta firma, sello de tiempo o verificación institucional.

## Hallazgos prioritarios

### Críticos

1. **Migrar el documento global a colecciones por entidad.** Separar planes, fichas, decisiones, acciones, capas, sesiones y auditoría. El diseño actual tiene límite práctico de 900 kB, conflictos globales y consultas poco escalables.
2. **Autorizar por registro y territorio en servidor.** Las reglas deben comprobar territorio, institución, rol, asignación y operación permitida; no solamente el nombre del arreglo modificado.
3. **Crear auditoría append-only.** Cada evento debe almacenarse por separado, con actor, rol, fecha de servidor, versión anterior/nueva, evidencia y fundamento.
4. **Construir evidencia institucional.** Adjuntos en almacenamiento, hash, versión, custodio, firma/aprobación y enlace estable desde decisiones, acciones e informes.

### Altos

5. Resolver concurrencia por registro y mostrar borradores recuperables.
6. Añadir periodo operacional, SITREP, relevo, recursos, alojamientos, servicios esenciales y comunicación pública a la Cabina COE.
7. Incorporar versionado de planes, comparación entre versiones y huella del archivo fuente.
8. Establecer flujo de fusión, archivo y anulación de fichas sin perder trazabilidad.
9. Formalizar aprobación multinivel y escalamiento de decisiones.
10. Completar accesibilidad WCAG, teclado, lector de pantalla y reducción de movimiento.

### Medios

11. Añadir búsqueda global y “modo emergencia” compacto.
12. Implementar series históricas de monitoreo, avance y cambio de riesgo.
13. Normalizar catálogos territoriales, instituciones, amenazas, MTT/GT y estados.
14. Añadir validación de CRS, precisión, escala, topología y custodio cartográfico.
15. Generar informes por territorio, periodo, estado, responsable y sesión COE.

## Preguntas que responde hoy con utilidad

- ¿Qué planes fueron recibidos, revisados y qué evidencia o brechas contienen?
- ¿Qué menciones todavía deben convertirse en fichas gestionables?
- ¿Qué sitios tienen mayor prioridad documental y territorial?
- ¿Qué decisión está pendiente, vencida, respondida o sin evidencia?
- ¿Qué acción tiene responsable, plazo, avance, producto y criterio de cierre?
- ¿Qué geometría existe, de dónde proviene y con qué validez preliminar?
- ¿Qué actor, mesa o grupo debe producir y entregar información?
- ¿Qué queda pendiente antes de considerar controlado un problema?

## Preguntas que todavía debe poder responder

- ¿Qué cambió desde el corte anterior y con qué nivel de confianza?
- ¿Qué usuario está autorizado para modificar exactamente este registro y territorio?
- ¿Qué población y servicios están expuestos, con desglose y hora de corte?
- ¿Qué recurso fue solicitado, aprobado, movilizado, recibido y utilizado?
- ¿Qué ruta, alojamiento o servicio esencial está disponible y verificado?
- ¿Qué autoridad aprobó la decisión y cuál es el acto que la sustenta?
- ¿Qué evidencia demuestra el resultado y cómo se acredita su integridad?
- ¿Qué pendientes se transfieren al siguiente periodo operacional o a recuperación?

## Orden recomendado de ejecución

1. Seguridad por registro + migración del documento global.
2. Auditoría inmutable + repositorio de evidencias.
3. Versionado de planes, fichas, decisiones y acciones.
4. Ciclo COE completo y reportes por periodo operacional.
5. Accesibilidad, modo emergencia y operación con conectividad limitada.

