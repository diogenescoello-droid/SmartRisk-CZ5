# Auditoría funcional y normativa — 50 recorridos SmartRisk CZ5

Fecha: 18 de julio de 2026  
Método: 50 simulaciones determinísticas de rutas de uso sobre el código, modelo de datos y reglas de acceso; 10 por perfil. PASS = responde operativamente; PARTIAL = responde con límites; FAIL = no responde o no debe ejecutar la decisión por sí sola.

## Resultado ejecutivo

- Cobertura funcional ponderada: **50%**.
- Responde operativamente: **15/50 (30%)**.
- Responde parcialmente: **20/50 (40%)**.
- No responde o requiere control externo: **15/50 (30%)**.
- Inventario estático: 121 botones renderizados, 60 enlaces de clic, 16 formularios, 25 controles de cambio, 10 constructores de página y 17 formularios/diálogos especializados.
- Verificación visual autenticada: las 9 rutas principales abrieron sin error visible. La existencia de la pantalla no implica que todas sus decisiones estén completas o autorizadas.

## Resultado por perfil

| Perfil | Operativo | Parcial | No resuelto | Puntaje |
|---|---:|---:|---:|---:|
| Administrador zonal | 4 | 4 | 2 | 60% |
| Técnico territorial | 4 | 4 | 2 | 60% |
| Coordinador COE | 2 | 4 | 4 | 40% |
| Líder MTT/GT | 3 | 4 | 3 | 50% |
| Tomador de decisión/control | 2 | 4 | 4 | 40% |

## Las 50 corridas

| # | Perfil | Ruta | Pregunta | Resultado | Evidencia/limitación |
|---:|---|---|---|---|---|
| 1 | Administrador zonal | Ingresar y recuperar acceso | ¿Puede administrar su acceso sin intervención técnica? | PASS | Login, recuperación y cambio de contraseña están implementados. |
| 2 | Administrador zonal | Gestionar usuarios | ¿Quién está activo y quién tiene acceso? | PARTIAL | Distingue contacto y acceso, pero los permisos de negocio no se aplican en servidor por rol. |
| 3 | Administrador zonal | Asignar territorio | ¿Cada técnico queda limitado a su jurisdicción? | FAIL | El filtro es de interfaz; Firestore permite actualizar el documento global a cualquier autenticado. |
| 4 | Administrador zonal | Revisar territorios | ¿Qué cantones presentan mayores brechas? | PARTIAL | Hay panorama y trazabilidad, pero los hallazgos documentales no equivalen a riesgo validado. |
| 5 | Administrador zonal | Configurar instituciones | ¿Qué institución integra cada mesa o grupo? | PARTIAL | Existe configuración, sin catálogo oficial completo ni validación de competencia. |
| 6 | Administrador zonal | Revisar planes | ¿Qué está documentado, incompleto y validado? | PASS | El módulo separa evidencia documental, hallazgos y revisión. |
| 7 | Administrador zonal | Gestionar sitios | ¿Qué fichas están pendientes o gestionables? | PASS | Existe transición de mención/ficha pendiente a ficha gestionable. |
| 8 | Administrador zonal | Controlar acciones | ¿Qué acción está vencida, sin responsable o sin evidencia? | PASS | Se registran responsable, plazo, avance y evidencia operativa. |
| 9 | Administrador zonal | Administrar cartografía | ¿Qué capas F03/KML/KMZ tienen validez técnica? | PARTIAL | Hay clasificación y evaluación preliminar; falta aprobación formal del custodio competente. |
| 10 | Administrador zonal | Auditar cambios | ¿Quién cambió qué y cuándo con evidencia inmutable? | FAIL | El registro está dentro del mismo documento mutable y no constituye bitácora inmutable. |
| 11 | Técnico territorial | Ver territorio asignado | ¿Qué riesgos y pendientes corresponden a mi cantón? | PARTIAL | La interfaz filtra por asignación, pero una cuenta sin coincidencia puede ver información global. |
| 12 | Técnico territorial | Completar ficha pendiente | ¿Qué dato falta para convertir una mención en sitio gestionable? | PASS | La ficha indica campos y permite completar ubicación, riesgo, brecha y trazabilidad. |
| 13 | Técnico territorial | Validar ubicación | ¿El sitio, tramo o área está correctamente localizado? | PARTIAL | Permite geometría y mapa, pero no valida precisión, sistema de referencia ni levantamiento de campo. |
| 14 | Técnico territorial | Cargar KMZ/KML | ¿Puedo incorporar evidencia geográfica del territorio? | PASS | Existe carga, lectura y visualización por capas. |
| 15 | Técnico territorial | Crear vector operativo | ¿Puedo dibujar punto, línea o polígono para una emergencia? | PASS | La herramienta de geometría operativa está implementada. |
| 16 | Técnico territorial | Clasificar elemento | ¿Es amenaza, vulnerabilidad o exposición? | PARTIAL | La clasificación existe, pero puede ser inferida y requiere criterio técnico documentado. |
| 17 | Técnico territorial | Semaforizar riesgo | ¿Cuál es el nivel de riesgo del elemento? | PARTIAL | El color apoya priorización, pero no demuestra una metodología oficial de cálculo y validación. |
| 18 | Técnico territorial | Actualizar acción | ¿Qué avance y evidencia tiene mi acción? | PASS | El técnico puede actualizar seguimiento y evidencia. |
| 19 | Técnico territorial | Consultar otro territorio | ¿Puedo modificar información fuera de mi competencia? | FAIL | La seguridad en servidor no restringe escrituras por territorio. |
| 20 | Técnico territorial | Responder monitoreo | ¿Qué cambió desde la última observación y qué umbral se superó? | FAIL | No hay series temporales, umbrales oficiales ni fuente de monitoreo versionada. |
| 21 | Coordinador COE | Abrir sesión operativa | ¿Cuál es el problema, ámbito y periodo operacional? | PARTIAL | La cabina crea sesiones, pero el periodo operacional y la activación oficial no quedan plenamente formalizados. |
| 22 | Coordinador COE | Ver flujo de actores | ¿Quién informa, decide, ejecuta y verifica? | PASS | El diagrama COE muestra actores, conexiones y faltantes. |
| 23 | Coordinador COE | Asignar tarea | ¿Quién debe hacer qué, dónde y hasta cuándo? | PASS | La cabina permite responsables, tareas, territorios y plazos. |
| 24 | Coordinador COE | Escalar necesidad | ¿Qué apoyo debe solicitarse por subsidiariedad? | PARTIAL | Puede registrarse una decisión, pero falta flujo formal de solicitud, aceptación y nivel escalado. |
| 25 | Coordinador COE | Construir panorama común | ¿Qué ocurre, dónde, a quién afecta y qué respuesta está activa? | PARTIAL | Integra planes, sitios, capas y acciones, pero faltan fuentes en tiempo real y validación territorial completa. |
| 26 | Coordinador COE | Consultar población expuesta | ¿Cuántas personas y grupos prioritarios están expuestos? | PARTIAL | Hay valores reportados, sin desglose, cobertura ni verificación suficiente. |
| 27 | Coordinador COE | Controlar rutas | ¿Qué vías están cerradas y qué rutas de evacuación son seguras? | FAIL | No existe análisis de red, estado vial en tiempo real ni validación de rutas seguras. |
| 28 | Coordinador COE | Gestionar alojamientos | ¿Qué alojamiento tiene capacidad y servicios disponibles? | FAIL | No hay inventario operativo de capacidad, ocupación y servicios de alojamientos temporales. |
| 29 | Coordinador COE | Emitir alerta | ¿Puede la plataforma declarar el nivel de alerta? | FAIL | La declaratoria corresponde a la autoridad competente con sustento técnico-científico; la plataforma solo debe mostrar o recomendar. |
| 30 | Coordinador COE | Cerrar periodo | ¿Qué decisiones, resultados, pendientes y relevo quedan al siguiente periodo? | FAIL | No hay cierre operacional estructurado, relevo ni SITREP consolidado. |
| 31 | Líder MTT/GT | Definir objetivo | ¿Qué objetivo operativo debe cumplir la mesa o grupo? | PASS | El módulo permite configurar objetivos de trabajo. |
| 32 | Líder MTT/GT | Registrar actores | ¿Están presentes principal, alterno y enlace operativo? | PARTIAL | Registra actores, pero no controla formalmente alternos, disponibilidad y aceptación de convocatoria. |
| 33 | Líder MTT/GT | Crear actividad | ¿Qué actividad aporta al objetivo y con qué producto? | PASS | Se pueden crear actividades vinculadas al grupo. |
| 34 | Líder MTT/GT | Gestionar dependencia | ¿Qué actividad depende de otra institución o mesa? | PARTIAL | Los flujos se visualizan, pero no existe motor de dependencias, bloqueo y aceptación. |
| 35 | Líder MTT/GT | Controlar plazo | ¿Qué compromiso está vencido o próximo a vencer? | PASS | Fechas y estados permiten seguimiento básico. |
| 36 | Líder MTT/GT | Adjuntar evidencia | ¿La actividad tiene producto verificable? | PARTIAL | Hay campos de evidencia, sin repositorio documental robusto, firma, hash o versionado. |
| 37 | Líder MTT/GT | Reportar recursos | ¿Qué personal, equipo, insumo o presupuesto falta? | FAIL | No existe catálogo/inventario de recursos y brechas logísticas. |
| 38 | Líder MTT/GT | Coordinar información pública | ¿Qué mensaje fue aprobado, por quién y para qué audiencia? | FAIL | No hay flujo de vocería, aprobación y publicación de mensajes. |
| 39 | Líder MTT/GT | Evaluar desempeño | ¿La mesa cumplió objetivo, tiempo, calidad e impacto? | PARTIAL | Hay avance, pero faltan indicadores de producto, resultado e impacto. |
| 40 | Líder MTT/GT | Transferir a recuperación | ¿Qué acciones pasan de respuesta a recuperación? | FAIL | No existe transición formal entre fases ni plan de recuperación vinculado. |
| 41 | Tomador de decisión/control | Priorizar territorios | ¿Qué territorios requieren apoyo inmediato? | PARTIAL | El ranking usa brechas y datos disponibles; no es una valoración integral validada del riesgo. |
| 42 | Tomador de decisión/control | Identificar brecha crítica | ¿Qué brecha impide reducir el riesgo? | PASS | La plataforma consolida brechas de planes, sitios, acciones y cartografía. |
| 43 | Tomador de decisión/control | Ver decisión vencida | ¿Qué decisión está sin responsable o fuera de plazo? | PASS | La bandeja permite seguimiento de responsables y plazos. |
| 44 | Tomador de decisión/control | Evaluar escenario | ¿Qué puede ocurrir si no se interviene? | PARTIAL | Hay información base, pero no modelación probabilística, escenarios temporales ni incertidumbre explícita. |
| 45 | Tomador de decisión/control | Ordenar evacuación | ¿Debe evacuarse y qué población, ruta y destino aplican? | FAIL | Faltan rutas validadas, población objetivo, alojamientos y acto de autoridad; la plataforma no debe decidirlo automáticamente. |
| 46 | Tomador de decisión/control | Activar COE | ¿Corresponde activar el COE y en qué nivel? | PARTIAL | Puede aportar criterios, pero la activación debe registrarse como acto de la autoridad competente. |
| 47 | Tomador de decisión/control | Asignar recursos | ¿Qué recursos se requieren, existen y fueron movilizados? | FAIL | No existe inventario, disponibilidad, despacho, recepción y costo trazable. |
| 48 | Tomador de decisión/control | Controlar servicios esenciales | ¿Qué servicios críticos están afectados y cuándo se restablecen? | FAIL | No hay tablero de continuidad de servicios esenciales. |
| 49 | Tomador de decisión/control | Autorizar comunicación | ¿Qué información pública está verificada y autorizada? | FAIL | No existe validación de fuente, vocería ni autorización de publicación. |
| 50 | Tomador de decisión/control | Ver trazabilidad legal | ¿Qué autoridad tomó la decisión, con qué fundamento y evidencia? | PARTIAL | Hay registro de decisión, pero falta base legal estructurada, firma, integridad y retención. |

## Hallazgos críticos

1. **Autorización insuficiente en servidor.** Cualquier cuenta autenticada puede leer y actualizar el documento operativo global. La asignación territorial y buena parte de los roles se aplican en la interfaz, no en las reglas de Firestore.
2. **Una cuenta no asociada a un contacto puede ampliar visibilidad.** Varias consultas admiten todos los territorios cuando no encuentran `assignedUser`.
3. **Bitácora no inmutable.** La auditoría comparte el documento mutable con los datos operativos; no acredita integridad, autoría ni cadena de custodia.
4. **Indicadores preliminares confundibles con decisiones oficiales.** Riesgo, prioridad, validez cartográfica y población expuesta necesitan mostrar método, fuente, fecha, cobertura, incertidumbre y responsable de validación.
5. **La cabina aún no cubre el ciclo COE completo.** Faltan periodo operacional, SITREP, relevo, necesidades verificadas, recursos, alojamientos, servicios esenciales, información pública y cierre.
6. **Calidad territorial inconsistente.** Los filtros muestran provincias duplicadas por mayúsculas/minúsculas y variantes; también se observó `GUARANDA · galapagos`, registros `Sin cantón` y componentes sin clasificar.
7. **Carga cognitiva alta.** Territorios, decisiones y sitios críticos presentan entre 117 y 248 botones accesibles en una sola vista; se requiere paginación, acciones contextuales y revelado progresivo.
8. **Cartografía aún no validada.** El visor contiene 78 aportes F03, 61 con geometría, 56 con respaldo o enlace y 0 validados técnicamente.

## Preguntas que ya puede responder

- ¿Qué planes fueron recibidos, revisados y qué brechas documentales presentan?
- ¿Qué menciones de sitios se convirtieron en fichas gestionables y qué campos faltan?
- ¿Qué acciones tienen responsable, plazo, avance, evidencia o vencimiento?
- ¿Qué actores, mesas, grupos, flujos y actividades están configurados?
- ¿Qué capas F03, KML o KMZ existen y cuál es su evaluación técnica preliminar?
- ¿Qué decisiones registradas carecen de responsable o seguimiento?

## Preguntas que debe responder para gestión integral

- ¿Cuál es el evento, alerta oficial, fuente, hora de corte, ámbito y tendencia?
- ¿Qué población está afectada o expuesta, con desglose de grupos prioritarios y nivel de verificación?
- ¿Qué rutas están habilitadas, restringidas o verificadas para evacuación y acceso?
- ¿Qué alojamientos temporales tienen capacidad, ocupación, servicios y responsables?
- ¿Qué recursos están disponibles, solicitados, movilizados, recibidos y faltantes?
- ¿Qué servicios esenciales están afectados, qué dependencia tienen y cuál es su tiempo estimado de recuperación?
- ¿Qué objetivo, producto, dependencia y criterio de cierre tiene cada MTT/GT?
- ¿Qué decisión fue tomada por qué autoridad, bajo qué competencia, evidencia y fundamento normativo?
- ¿Qué información pública está verificada, autorizada y emitida por la vocería competente?
- ¿Qué pendientes y riesgos residuales pasan al siguiente periodo operacional o a recuperación?

## Límites legales que la plataforma debe imponer

- No declarar por sí sola estados de alerta, emergencias, evacuaciones ni activaciones oficiales; debe registrar la fuente y el acto de la autoridad competente.
- No presentar una inferencia documental o cartográfica como riesgo oficialmente validado.
- Aplicar competencia territorial, descentralización subsidiaria y escalamiento formal.
- Aplicar minimización de datos, finalidad, trazabilidad, segregación de accesos y medidas continuas de seguridad.
- Separar contacto vigente, usuario con acceso, rol operativo, institución, territorio y autoridad decisoria.

## Prioridad de mejora

1. Dividir el documento global en colecciones por entidad y aplicar reglas por rol, territorio y acción.
2. Denegar por defecto a usuarios sin perfil/asignación y hacer pruebas automáticas de autorización.
3. Crear bitácora append-only con actor, autoridad, fecha, evidencia, versión y fundamento.
4. Incorporar módulo de situación COE: evento, alerta oficial, periodo operacional, SITREP, necesidades, recursos, alojamientos, servicios y comunicación.
5. Etiquetar cada indicador como reportado, inferido, validado territorialmente u oficial, con fuente y fecha.

## Fuentes normativas oficiales

- Ley Orgánica para la Gestión Integral del Riesgo de Desastres, Registro Oficial 488 (30-01-2024).
- Reglamento General a la Ley Orgánica para la Gestión Integral del Riesgo de Desastres, Registro Oficial 646 (18-09-2024).
- Manual del Comité de Operaciones de Emergencia, Servicio Nacional de Gestión de Riesgos y Emergencias.
- Ley Orgánica de Protección de Datos Personales, Registro Oficial 459, y criterios de la Superintendencia de Protección de Datos Personales.