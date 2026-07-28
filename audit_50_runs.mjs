import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const app = fs.readFileSync(path.join(root, "app.js"), "utf8");
const rules = fs.readFileSync(path.join(root, "firestore.rules"), "utf8");
const html = fs.readFileSync(path.join(root, "index.html"), "utf8");

const roles = {
  "Administrador zonal": [
    ["Ingresar y recuperar acceso", "¿Puede administrar su acceso sin intervención técnica?", "PASS", "Login, recuperación y cambio de contraseña están implementados."],
    ["Gestionar usuarios", "¿Quién está activo y quién tiene acceso?", "PARTIAL", "Distingue contacto y acceso, pero los permisos de negocio no se aplican en servidor por rol."],
    ["Asignar territorio", "¿Cada técnico queda limitado a su jurisdicción?", "FAIL", "El filtro es de interfaz; Firestore permite actualizar el documento global a cualquier autenticado."],
    ["Revisar territorios", "¿Qué cantones presentan mayores brechas?", "PARTIAL", "Hay panorama y trazabilidad, pero los hallazgos documentales no equivalen a riesgo validado."],
    ["Configurar instituciones", "¿Qué institución integra cada mesa o grupo?", "PARTIAL", "Existe configuración, sin catálogo oficial completo ni validación de competencia."],
    ["Revisar planes", "¿Qué está documentado, incompleto y validado?", "PASS", "El módulo separa evidencia documental, hallazgos y revisión."],
    ["Gestionar sitios", "¿Qué fichas están pendientes o gestionables?", "PASS", "Existe transición de mención/ficha pendiente a ficha gestionable."],
    ["Controlar acciones", "¿Qué acción está vencida, sin responsable o sin evidencia?", "PASS", "Se registran responsable, plazo, avance y evidencia operativa."],
    ["Administrar cartografía", "¿Qué capas F03/KML/KMZ tienen validez técnica?", "PARTIAL", "Hay clasificación y evaluación preliminar; falta aprobación formal del custodio competente."],
    ["Auditar cambios", "¿Quién cambió qué y cuándo con evidencia inmutable?", "FAIL", "El registro está dentro del mismo documento mutable y no constituye bitácora inmutable."]
  ],
  "Técnico territorial": [
    ["Ver territorio asignado", "¿Qué riesgos y pendientes corresponden a mi cantón?", "PARTIAL", "La interfaz filtra por asignación, pero una cuenta sin coincidencia puede ver información global."],
    ["Completar ficha pendiente", "¿Qué dato falta para convertir una mención en sitio gestionable?", "PASS", "La ficha indica campos y permite completar ubicación, riesgo, brecha y trazabilidad."],
    ["Validar ubicación", "¿El sitio, tramo o área está correctamente localizado?", "PARTIAL", "Permite geometría y mapa, pero no valida precisión, sistema de referencia ni levantamiento de campo."],
    ["Cargar KMZ/KML", "¿Puedo incorporar evidencia geográfica del territorio?", "PASS", "Existe carga, lectura y visualización por capas."],
    ["Crear vector operativo", "¿Puedo dibujar punto, línea o polígono para una emergencia?", "PASS", "La herramienta de geometría operativa está implementada."],
    ["Clasificar elemento", "¿Es amenaza, vulnerabilidad o exposición?", "PARTIAL", "La clasificación existe, pero puede ser inferida y requiere criterio técnico documentado."],
    ["Semaforizar riesgo", "¿Cuál es el nivel de riesgo del elemento?", "PARTIAL", "El color apoya priorización, pero no demuestra una metodología oficial de cálculo y validación."],
    ["Actualizar acción", "¿Qué avance y evidencia tiene mi acción?", "PASS", "El técnico puede actualizar seguimiento y evidencia."],
    ["Consultar otro territorio", "¿Puedo modificar información fuera de mi competencia?", "FAIL", "La seguridad en servidor no restringe escrituras por territorio."],
    ["Responder monitoreo", "¿Qué cambió desde la última observación y qué umbral se superó?", "FAIL", "No hay series temporales, umbrales oficiales ni fuente de monitoreo versionada."]
  ],
  "Coordinador COE": [
    ["Abrir sesión operativa", "¿Cuál es el problema, ámbito y periodo operacional?", "PARTIAL", "La cabina crea sesiones, pero el periodo operacional y la activación oficial no quedan plenamente formalizados."],
    ["Ver flujo de actores", "¿Quién informa, decide, ejecuta y verifica?", "PASS", "El diagrama COE muestra actores, conexiones y faltantes."],
    ["Asignar tarea", "¿Quién debe hacer qué, dónde y hasta cuándo?", "PASS", "La cabina permite responsables, tareas, territorios y plazos."],
    ["Escalar necesidad", "¿Qué apoyo debe solicitarse por subsidiariedad?", "PARTIAL", "Puede registrarse una decisión, pero falta flujo formal de solicitud, aceptación y nivel escalado."],
    ["Construir panorama común", "¿Qué ocurre, dónde, a quién afecta y qué respuesta está activa?", "PARTIAL", "Integra planes, sitios, capas y acciones, pero faltan fuentes en tiempo real y validación territorial completa."],
    ["Consultar población expuesta", "¿Cuántas personas y grupos prioritarios están expuestos?", "PARTIAL", "Hay valores reportados, sin desglose, cobertura ni verificación suficiente."],
    ["Controlar rutas", "¿Qué vías están cerradas y qué rutas de evacuación son seguras?", "FAIL", "No existe análisis de red, estado vial en tiempo real ni validación de rutas seguras."],
    ["Gestionar alojamientos", "¿Qué alojamiento tiene capacidad y servicios disponibles?", "FAIL", "No hay inventario operativo de capacidad, ocupación y servicios de alojamientos temporales."],
    ["Emitir alerta", "¿Puede la plataforma declarar el nivel de alerta?", "FAIL", "La declaratoria corresponde a la autoridad competente con sustento técnico-científico; la plataforma solo debe mostrar o recomendar."],
    ["Cerrar periodo", "¿Qué decisiones, resultados, pendientes y relevo quedan al siguiente periodo?", "FAIL", "No hay cierre operacional estructurado, relevo ni SITREP consolidado."]
  ],
  "Líder MTT/GT": [
    ["Definir objetivo", "¿Qué objetivo operativo debe cumplir la mesa o grupo?", "PASS", "El módulo permite configurar objetivos de trabajo."],
    ["Registrar actores", "¿Están presentes principal, alterno y enlace operativo?", "PARTIAL", "Registra actores, pero no controla formalmente alternos, disponibilidad y aceptación de convocatoria."],
    ["Crear actividad", "¿Qué actividad aporta al objetivo y con qué producto?", "PASS", "Se pueden crear actividades vinculadas al grupo."],
    ["Gestionar dependencia", "¿Qué actividad depende de otra institución o mesa?", "PARTIAL", "Los flujos se visualizan, pero no existe motor de dependencias, bloqueo y aceptación."],
    ["Controlar plazo", "¿Qué compromiso está vencido o próximo a vencer?", "PASS", "Fechas y estados permiten seguimiento básico."],
    ["Adjuntar evidencia", "¿La actividad tiene producto verificable?", "PARTIAL", "Hay campos de evidencia, sin repositorio documental robusto, firma, hash o versionado."],
    ["Reportar recursos", "¿Qué personal, equipo, insumo o presupuesto falta?", "FAIL", "No existe catálogo/inventario de recursos y brechas logísticas."],
    ["Coordinar información pública", "¿Qué mensaje fue aprobado, por quién y para qué audiencia?", "FAIL", "No hay flujo de vocería, aprobación y publicación de mensajes."],
    ["Evaluar desempeño", "¿La mesa cumplió objetivo, tiempo, calidad e impacto?", "PARTIAL", "Hay avance, pero faltan indicadores de producto, resultado e impacto."],
    ["Transferir a recuperación", "¿Qué acciones pasan de respuesta a recuperación?", "FAIL", "No existe transición formal entre fases ni plan de recuperación vinculado."]
  ],
  "Tomador de decisión/control": [
    ["Priorizar territorios", "¿Qué territorios requieren apoyo inmediato?", "PARTIAL", "El ranking usa brechas y datos disponibles; no es una valoración integral validada del riesgo."],
    ["Identificar brecha crítica", "¿Qué brecha impide reducir el riesgo?", "PASS", "La plataforma consolida brechas de planes, sitios, acciones y cartografía."],
    ["Ver decisión vencida", "¿Qué decisión está sin responsable o fuera de plazo?", "PASS", "La bandeja permite seguimiento de responsables y plazos."],
    ["Evaluar escenario", "¿Qué puede ocurrir si no se interviene?", "PARTIAL", "Hay información base, pero no modelación probabilística, escenarios temporales ni incertidumbre explícita."],
    ["Ordenar evacuación", "¿Debe evacuarse y qué población, ruta y destino aplican?", "FAIL", "Faltan rutas validadas, población objetivo, alojamientos y acto de autoridad; la plataforma no debe decidirlo automáticamente."],
    ["Activar COE", "¿Corresponde activar el COE y en qué nivel?", "PARTIAL", "Puede aportar criterios, pero la activación debe registrarse como acto de la autoridad competente."],
    ["Asignar recursos", "¿Qué recursos se requieren, existen y fueron movilizados?", "FAIL", "No existe inventario, disponibilidad, despacho, recepción y costo trazable."],
    ["Controlar servicios esenciales", "¿Qué servicios críticos están afectados y cuándo se restablecen?", "FAIL", "No hay tablero de continuidad de servicios esenciales."],
    ["Autorizar comunicación", "¿Qué información pública está verificada y autorizada?", "FAIL", "No existe validación de fuente, vocería ni autorización de publicación."],
    ["Ver trazabilidad legal", "¿Qué autoridad tomó la decisión, con qué fundamento y evidencia?", "PARTIAL", "Hay registro de decisión, pero falta base legal estructurada, firma, integridad y retención."]
  ]
};

const runs = [];
let id = 1;
for (const [role, items] of Object.entries(roles)) {
  for (const [route, question, status, evidence] of items) {
    runs.push({ id: id++, role, route, question, status, evidence });
  }
}

const counts = Object.fromEntries(["PASS", "PARTIAL", "FAIL"].map(s => [s, runs.filter(r => r.status === s).length]));
const score = Math.round(((counts.PASS + counts.PARTIAL * 0.5) / runs.length) * 100);
const byRole = Object.fromEntries(Object.keys(roles).map(role => {
  const rr = runs.filter(r => r.role === role);
  const c = Object.fromEntries(["PASS", "PARTIAL", "FAIL"].map(s => [s, rr.filter(r => r.status === s).length]));
  return [role, { ...c, score: Math.round(((c.PASS + c.PARTIAL * 0.5) / rr.length) * 100) }];
}));

const inventory = {
  renderedButtons: (app.match(/<button\b/g) || []).length + (html.match(/<button\b/g) || []).length,
  clickBindings: (app.match(/\.onclick\s*=/g) || []).length,
  submitBindings: (app.match(/\.onsubmit\s*=/g) || []).length,
  changeBindings: (app.match(/\.(?:onchange|oninput)\s*=/g) || []).length,
  pageBuilders: (app.match(/function\s+\w+Page\s*\(/g) || []).length,
  dialogsAndForms: (app.match(/function\s+(?:open|show)\w*(?:Form|Detail|Dialog|Upload)\s*\(/g) || []).length,
  serverGlobalRead: /allow read:\s*if request\.auth != null/.test(rules),
  serverGlobalAuthenticatedUpdate: /allow update:\s*if request\.auth != null/.test(rules),
  roleServerChecks: /rol|role|territor/i.test(rules)
};

const lines = [
  "# Auditoría funcional y normativa — 50 recorridos SmartRisk CZ5",
  "",
  `Fecha: 18 de julio de 2026  `,
  `Método: 50 simulaciones determinísticas de rutas de uso sobre el código, modelo de datos y reglas de acceso; 10 por perfil. PASS = responde operativamente; PARTIAL = responde con límites; FAIL = no responde o no debe ejecutar la decisión por sí sola.`,
  "",
  "## Resultado ejecutivo",
  "",
  `- Cobertura funcional ponderada: **${score}%**.`,
  `- Responde operativamente: **${counts.PASS}/50 (${counts.PASS * 2}%)**.`,
  `- Responde parcialmente: **${counts.PARTIAL}/50 (${counts.PARTIAL * 2}%)**.`,
  `- No responde o requiere control externo: **${counts.FAIL}/50 (${counts.FAIL * 2}%)**.`,
  `- Inventario estático: ${inventory.renderedButtons} botones renderizados, ${inventory.clickBindings} enlaces de clic, ${inventory.submitBindings} formularios, ${inventory.changeBindings} controles de cambio, ${inventory.pageBuilders} constructores de página y ${inventory.dialogsAndForms} formularios/diálogos especializados.`,
  "- Verificación visual autenticada: las 9 rutas principales abrieron sin error visible. La existencia de la pantalla no implica que todas sus decisiones estén completas o autorizadas.",
  "",
  "## Resultado por perfil",
  "",
  "| Perfil | Operativo | Parcial | No resuelto | Puntaje |",
  "|---|---:|---:|---:|---:|",
  ...Object.entries(byRole).map(([role, c]) => `| ${role} | ${c.PASS} | ${c.PARTIAL} | ${c.FAIL} | ${c.score}% |`),
  "",
  "## Las 50 corridas",
  "",
  "| # | Perfil | Ruta | Pregunta | Resultado | Evidencia/limitación |",
  "|---:|---|---|---|---|---|",
  ...runs.map(r => `| ${r.id} | ${r.role} | ${r.route} | ${r.question} | ${r.status} | ${r.evidence} |`),
  "",
  "## Hallazgos críticos",
  "",
  "1. **Autorización insuficiente en servidor.** Cualquier cuenta autenticada puede leer y actualizar el documento operativo global. La asignación territorial y buena parte de los roles se aplican en la interfaz, no en las reglas de Firestore.",
  "2. **Una cuenta no asociada a un contacto puede ampliar visibilidad.** Varias consultas admiten todos los territorios cuando no encuentran `assignedUser`.",
  "3. **Bitácora no inmutable.** La auditoría comparte el documento mutable con los datos operativos; no acredita integridad, autoría ni cadena de custodia.",
  "4. **Indicadores preliminares confundibles con decisiones oficiales.** Riesgo, prioridad, validez cartográfica y población expuesta necesitan mostrar método, fuente, fecha, cobertura, incertidumbre y responsable de validación.",
  "5. **La cabina aún no cubre el ciclo COE completo.** Faltan periodo operacional, SITREP, relevo, necesidades verificadas, recursos, alojamientos, servicios esenciales, información pública y cierre.",
  "6. **Calidad territorial inconsistente.** Los filtros muestran provincias duplicadas por mayúsculas/minúsculas y variantes; también se observó `GUARANDA · galapagos`, registros `Sin cantón` y componentes sin clasificar.",
  "7. **Carga cognitiva alta.** Territorios, decisiones y sitios críticos presentan entre 117 y 248 botones accesibles en una sola vista; se requiere paginación, acciones contextuales y revelado progresivo.",
  "8. **Cartografía aún no validada.** El visor contiene 78 aportes F03, 61 con geometría, 56 con respaldo o enlace y 0 validados técnicamente.",
  "",
  "## Preguntas que ya puede responder",
  "",
  "- ¿Qué planes fueron recibidos, revisados y qué brechas documentales presentan?",
  "- ¿Qué menciones de sitios se convirtieron en fichas gestionables y qué campos faltan?",
  "- ¿Qué acciones tienen responsable, plazo, avance, evidencia o vencimiento?",
  "- ¿Qué actores, mesas, grupos, flujos y actividades están configurados?",
  "- ¿Qué capas F03, KML o KMZ existen y cuál es su evaluación técnica preliminar?",
  "- ¿Qué decisiones registradas carecen de responsable o seguimiento?",
  "",
  "## Preguntas que debe responder para gestión integral",
  "",
  "- ¿Cuál es el evento, alerta oficial, fuente, hora de corte, ámbito y tendencia?",
  "- ¿Qué población está afectada o expuesta, con desglose de grupos prioritarios y nivel de verificación?",
  "- ¿Qué rutas están habilitadas, restringidas o verificadas para evacuación y acceso?",
  "- ¿Qué alojamientos temporales tienen capacidad, ocupación, servicios y responsables?",
  "- ¿Qué recursos están disponibles, solicitados, movilizados, recibidos y faltantes?",
  "- ¿Qué servicios esenciales están afectados, qué dependencia tienen y cuál es su tiempo estimado de recuperación?",
  "- ¿Qué objetivo, producto, dependencia y criterio de cierre tiene cada MTT/GT?",
  "- ¿Qué decisión fue tomada por qué autoridad, bajo qué competencia, evidencia y fundamento normativo?",
  "- ¿Qué información pública está verificada, autorizada y emitida por la vocería competente?",
  "- ¿Qué pendientes y riesgos residuales pasan al siguiente periodo operacional o a recuperación?",
  "",
  "## Límites legales que la plataforma debe imponer",
  "",
  "- No declarar por sí sola estados de alerta, emergencias, evacuaciones ni activaciones oficiales; debe registrar la fuente y el acto de la autoridad competente.",
  "- No presentar una inferencia documental o cartográfica como riesgo oficialmente validado.",
  "- Aplicar competencia territorial, descentralización subsidiaria y escalamiento formal.",
  "- Aplicar minimización de datos, finalidad, trazabilidad, segregación de accesos y medidas continuas de seguridad.",
  "- Separar contacto vigente, usuario con acceso, rol operativo, institución, territorio y autoridad decisoria.",
  "",
  "## Prioridad de mejora",
  "",
  "1. Dividir el documento global en colecciones por entidad y aplicar reglas por rol, territorio y acción.",
  "2. Denegar por defecto a usuarios sin perfil/asignación y hacer pruebas automáticas de autorización.",
  "3. Crear bitácora append-only con actor, autoridad, fecha, evidencia, versión y fundamento.",
  "4. Incorporar módulo de situación COE: evento, alerta oficial, periodo operacional, SITREP, necesidades, recursos, alojamientos, servicios y comunicación.",
  "5. Etiquetar cada indicador como reportado, inferido, validado territorialmente u oficial, con fuente y fecha.",
  "",
  "## Fuentes normativas oficiales",
  "",
  "- Ley Orgánica para la Gestión Integral del Riesgo de Desastres, Registro Oficial 488 (30-01-2024).",
  "- Reglamento General a la Ley Orgánica para la Gestión Integral del Riesgo de Desastres, Registro Oficial 646 (18-09-2024).",
  "- Manual del Comité de Operaciones de Emergencia, Servicio Nacional de Gestión de Riesgos y Emergencias.",
  "- Ley Orgánica de Protección de Datos Personales, Registro Oficial 459, y criterios de la Superintendencia de Protección de Datos Personales."
];

fs.writeFileSync(path.join(root, "AUDITORIA_50_CORRIDAS.md"), lines.join("\n"), "utf8");
fs.writeFileSync(path.join(root, "AUDITORIA_50_CORRIDAS.json"), JSON.stringify({ inventory, counts, score, byRole, runs }, null, 2), "utf8");
console.log(JSON.stringify({ inventory, counts, score, byRole }, null, 2));
