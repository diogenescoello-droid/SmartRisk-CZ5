# Protocolo científico y de calidad de datos de SmartRisk CZ5

## Propósito

Preparar la base para análisis reproducibles, revisión por pares y publicación
científica. La plataforma operativa y la base de investigación compartirán las
mismas fuentes, pero no confundirán hallazgos automáticos, validaciones técnicas
y decisiones institucionales.

## Unidad de análisis

La unidad principal será el **expediente territorial de riesgo**. Un expediente
puede contener varios correos, versiones, informes, anexos, fotografías y capas
cartográficas. Los archivos no se contarán como casos independientes.

Cada expediente tendrá:

- identificador estable;
- provincia, cantón, parroquia, sector, sitio, tramo o área;
- amenaza y periodo del evento;
- documento rector y documentos complementarios;
- versión, fecha de corte, autor e institución;
- procedencia y localización exacta de la evidencia;
- amenaza, exposición, vulnerabilidad y capacidad;
- decisiones, acciones, responsables, plazos, indicadores y verificables;
- geometría, sistema de referencia, escala, resolución y metadatos;
- estado de revisión y nivel de confianza.

## Estados de la evidencia

1. **Localizada:** el archivo o correo fue identificado.
2. **Inventariada:** posee metadatos mínimos y huella digital.
3. **Extraída:** sus datos fueron estructurados.
4. **Revisada:** pasó control documental y técnico.
5. **Validada:** un técnico competente confirmó el dato.
6. **Corroborada:** existe convergencia de fuentes independientes.
7. **Cerrada:** la acción tiene resultado y evidencia verificable.

La interfaz deberá mostrar siempre el estado. Un dato extraído automáticamente
no se presentará como validado.

## Jerarquía de fuentes

1. Informe técnico final firmado o acto oficial.
2. Informe de situación, evaluación o inspección con metodología identificable.
3. Plan aprobado y sus anexos.
4. Cartografía institucional con metadatos.
5. Registro operativo, bitácora o boletín oficial.
6. Comunicación institucional y evidencia fotográfica.
7. Inferencia analítica, claramente etiquetada y nunca tratada como hecho.

Cuando existan contradicciones se conservarán ambas versiones, sus fechas y
autores. La plataforma no reemplazará silenciosamente un dato.

## Deduplicación y versiones

- Calcular una huella SHA-256 de cada archivo.
- Agrupar correos reenviados y adjuntos idénticos.
- Identificar versiones mediante número de informe, título, territorio, fecha y
  contenido.
- Conservar la versión rectora y la cadena de versiones.
- Registrar por qué una versión fue incluida, sustituida o excluida.

## Calidad técnica

Cada registro recibirá una evaluación separada de:

- completitud;
- precisión territorial;
- actualidad;
- autoridad de la fuente;
- consistencia interna;
- corroboración externa;
- validez cartográfica;
- utilidad operativa;
- trazabilidad.

El puntaje no sustituye el juicio experto. Se publicarán sus componentes,
reglas, datos faltantes y responsable de validación.

## Control cartográfico

Toda geometría deberá registrar, cuando sea posible:

- tipo de elemento: punto, línea, polígono o ráster;
- clasificación: amenaza, exposición, vulnerabilidad, capacidad o acción;
- sistema de referencia y transformación aplicada;
- escala o resolución;
- fecha de levantamiento;
- institución y responsable;
- método de captura;
- precisión declarada;
- restricciones de uso;
- relación con el expediente y la fuente documental.

Los datos sin estos campos podrán visualizarse, pero aparecerán como
“cartografía pendiente de validación”.

## Separación analítica

Los resultados se expresarán en cuatro niveles:

- **Dato documentado:** transcripción o variable con referencia exacta.
- **Dato calculado:** resultado reproducible con fórmula y versión del código.
- **Inferencia:** interpretación razonada sustentada en datos.
- **Decisión:** disposición institucional con responsable y fecha.

No se asignará riesgo alto, medio o bajo sin registrar la regla utilizada y los
componentes disponibles.

## Revisión humana

La revisión tendrá dos evaluadores independientes para una muestra inicial y
para los casos de alta prioridad. Las discrepancias se resolverán mediante un
tercer criterio.

Se medirán:

- acuerdo en inclusión de expedientes;
- acuerdo en clasificación de amenaza, exposición, vulnerabilidad y capacidad;
- acuerdo en valoración de calidad;
- errores de extracción automática;
- cambios realizados después de validación territorial.

## Auditoría y reproducibilidad

Cada actualización deberá guardar:

- fecha y usuario;
- valor anterior y nuevo;
- motivo del cambio;
- fuente que lo respalda;
- versión del esquema y del algoritmo;
- registro de inclusión y exclusión.

Los resultados para publicación se generarán desde una versión congelada de la
base, con diccionario de datos, código, fecha de corte y diagrama de selección
de expedientes.

## Indicadores de preparación para publicación

- porcentaje de universo inventariado;
- porcentaje de expedientes únicos deduplicados;
- porcentaje estructurado;
- porcentaje revisado técnicamente;
- porcentaje validado por territorio;
- porcentaje con trazabilidad completa;
- porcentaje con geometría técnicamente válida;
- porcentaje con exposición cuantificada;
- porcentaje con acción, responsable, plazo e indicador;
- acuerdo entre revisores;
- tasa de error de extracción.

No se reportará un único porcentaje de “base completa” sin presentar estas
dimensiones.

## Referentes metodológicos

El diseño adopta los principios FAIR para localización, accesibilidad,
interoperabilidad, reutilización y procedencia; utiliza estándares OGC para
datos geoespaciales y prepara una matriz de reporte compatible con diseños
observacionales tipo STROBE. La guía final aplicable se definirá cuando se
seleccione la pregunta científica y la revista objetivo.
