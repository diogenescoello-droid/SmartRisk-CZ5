(() => {
  "use strict";

  const VERSION = "11.0.0-rc7";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const normalize = value => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();

  const storage = {
    get(key, fallback = null) {
      try {
        const value = localStorage.getItem(`smartrisk.rc7.${key}`);
        return value === null ? fallback : value;
      } catch { return fallback; }
    },
    set(key, value) {
      try { localStorage.setItem(`smartrisk.rc7.${key}`, String(value)); } catch {}
    }
  };

  const ux = {
    initialized: false,
    autoTimer: null,
    popover: null,
    tour: null,
    lastRoute: null,
    observer: null
  };

  function appState() {
    return window.SmartRiskV11App?.state || null;
  }

  function routeId() {
    return appState()?.route || "inicio";
  }

  function routeTitle() {
    const route = window.SmartRiskV11Router?.getRoute?.(routeId());
    return route?.title || "SmartRisk";
  }

  function icon(name, size = 20) {
    if (window.SmartRiskV11App?.icon) return window.SmartRiskV11App.icon(name, size);
    return `<span aria-hidden="true">•</span>`;
  }

  function closePopover() {
    ux.popover?.remove();
    ux.popover = null;
    $$(".sr-icon-button[aria-expanded='true']").forEach(button => button.setAttribute("aria-expanded", "false"));
  }

  function toast(message, tone = "info") {
    let node = $("#srUxToast");
    if (!node) {
      node = document.createElement("div");
      node.id = "srUxToast";
      node.className = "sr-ux-toast";
      node.setAttribute("role", "status");
      node.setAttribute("aria-live", "polite");
      document.body.appendChild(node);
    }
    node.className = `sr-ux-toast ${tone} show`;
    node.textContent = message;
    clearTimeout(node._timer);
    node._timer = setTimeout(() => node.classList.remove("show"), 3200);
  }

  function positionPopover(panel, anchor) {
    const rect = anchor?.getBoundingClientRect?.();
    if (!rect) return;
    panel.style.visibility = "hidden";
    panel.style.display = "block";
    const width = Math.min(panel.offsetWidth || 360, window.innerWidth - 24);
    const left = Math.max(12, Math.min(rect.right - width, window.innerWidth - width - 12));
    panel.style.left = `${left}px`;
    panel.style.top = `${Math.min(rect.bottom + 8, window.innerHeight - panel.offsetHeight - 12)}px`;
    panel.style.visibility = "visible";
  }

  function getEntities(key) {
    return appState()?.data?.entities?.[key] || [];
  }

  function operationalNotifications() {
    const risks = [...getEntities("risks"), ...getEntities("criticalSites")];
    const actions = getEntities("actions");
    const validations = getEntities("validations");
    const monitoring = getEntities("monitoringReports");
    const critical = risks.filter(item => /critic|alto|alta/.test(normalize(`${item.prioridad} ${item.estado} ${item.detail}`))).length;
    const overdue = actions.filter(item => /venc/.test(normalize(`${item.estado} ${item.detail}`))).length;
    const pending = validations.filter(item => !/valid|verific|complet|descart|rechaz/.test(normalize(item.estado))).length;
    const alerts = monitoring.filter(item => /alert|advert|vigil/.test(normalize(`${item.estado} ${item.prioridad} ${item.detail}`))).length;
    const items = [];
    if (critical) items.push({ tone: "danger", route: "riesgos", title: `${critical} riesgo${critical === 1 ? "" : "s"} crítico${critical === 1 ? "" : "s"}`, detail: "Requieren lectura y priorización territorial.", icon: "risk" });
    if (overdue) items.push({ tone: "warning", route: "acciones", title: `${overdue} acción${overdue === 1 ? "" : "es"} vencida${overdue === 1 ? "" : "s"}`, detail: "Revisa responsable, plazo y evidencia.", icon: "actions" });
    if (pending) items.push({ tone: "info", route: "monitoreo", title: `${pending} validación${pending === 1 ? "" : "es"} pendiente${pending === 1 ? "" : "s"}`, detail: "La información aún no está técnicamente cerrada.", icon: "refresh" });
    if (alerts) items.push({ tone: "danger", route: "monitoreo", title: `${alerts} alerta${alerts === 1 ? "" : "s"} temprana${alerts === 1 ? "" : "s"}`, detail: "Revisa fuente, territorio y vigencia.", icon: "monitor" });
    if (!items.length) items.push({ tone: "success", route: "inicio", title: "Sin alertas operativas pendientes", detail: "No se detectaron condiciones críticas en el alcance actual.", icon: "check" });
    return items.slice(0, 5);
  }

  function updateNotificationBadge() {
    const button = $(".sr-notifications");
    if (!button) return;
    button.title = "Abrir notificaciones operativas";
    button.setAttribute("aria-haspopup", "dialog");
    button.setAttribute("aria-expanded", "false");
    const enabled = storage.get("notifications", "true") !== "false";
    const count = enabled ? operationalNotifications().filter(item => item.tone !== "success").length : 0;
    let badge = $("i", button);
    if (!badge) {
      badge = document.createElement("i");
      button.appendChild(badge);
    }
    const nextCount = String(count);
    if (badge.textContent !== nextCount) badge.textContent = nextCount;
    if (badge.hidden !== (count === 0)) badge.hidden = count === 0;
  }

  function showNotifications(anchor) {
    closePopover();
    const items = operationalNotifications();
    const panel = document.createElement("aside");
    panel.className = "sr-ux-popover sr-ux-notifications";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Notificaciones operativas");
    panel.innerHTML = `<header><div>${icon("bell", 21)}<div><b>Notificaciones operativas</b><small>Calculadas con los datos visibles de tu alcance</small></div></div><button type="button" data-ux-close aria-label="Cerrar">×</button></header><div class="sr-ux-notification-list">${items.map(item => `<button type="button" class="${item.tone}" data-ux-route="${item.route}"><span>${icon(item.icon, 20)}</span><div><b>${esc(item.title)}</b><small>${esc(item.detail)}</small></div><em>Ver →</em></button>`).join("")}</div><footer><button type="button" data-ux-route="configuracion">Configurar notificaciones</button></footer>`;
    document.body.appendChild(panel);
    ux.popover = panel;
    anchor.setAttribute("aria-expanded", "true");
    positionPopover(panel, anchor);
  }

  function initials(value) {
    return String(value || "U").split(/\s|@/).filter(Boolean).slice(0, 2).map(part => part[0]).join("").toUpperCase();
  }

  function applyTextSize(size = storage.get("textSize", "large")) {
    const allowed = ["normal", "large", "xlarge"];
    const current = allowed.includes(size) ? size : "large";
    document.body.classList.remove("sr-text-normal", "sr-text-large", "sr-text-xlarge");
    document.body.classList.add(`sr-text-${current}`);
    storage.set("textSize", current);
  }

  function applyCompact(enabled = storage.get("compact", "false") === "true") {
    document.body.classList.toggle("sr-compact-view", Boolean(enabled));
    storage.set("compact", Boolean(enabled));
  }

  function showProfile(anchor) {
    closePopover();
    const state = appState();
    const ctx = state?.profileContext || {};
    const size = storage.get("textSize", "large");
    const panel = document.createElement("aside");
    panel.className = "sr-ux-popover sr-ux-profile";
    panel.setAttribute("role", "dialog");
    panel.setAttribute("aria-label", "Perfil y accesibilidad");
    panel.innerHTML = `<header><div><span class="sr-ux-avatar">${esc(initials(ctx.userLabel || ctx.email))}</span><div><b>${esc(ctx.userLabel || "Usuario autorizado")}</b><small>${esc(ctx.roleLabel || "Perfil autorizado")}</small></div></div><button type="button" data-ux-close aria-label="Cerrar">×</button></header><dl><div><dt>Alcance</dt><dd>${esc(ctx.scopeLabel || "Alcance autorizado")}</dd></div><div><dt>Modo</dt><dd>Solo lectura</dd></div></dl><section><b>Tamaño de lectura</b><div class="sr-ux-text-buttons" role="group" aria-label="Tamaño de texto"><button type="button" data-text-size="normal" class="${size === "normal" ? "active" : ""}">A</button><button type="button" data-text-size="large" class="${size === "large" ? "active" : ""}">A+</button><button type="button" data-text-size="xlarge" class="${size === "xlarge" ? "active" : ""}">A++</button></div><small>La opción A+ queda recomendada para lectura cómoda.</small></section><footer><button type="button" data-ux-route="configuracion">Abrir configuración</button><button type="button" data-ux-logout class="danger">Cerrar sesión</button></footer>`;
    document.body.appendChild(panel);
    ux.popover = panel;
    anchor.setAttribute("aria-expanded", "true");
    positionPopover(panel, anchor);
  }

  const commonSteps = [
    { selector: ".sr-page-heading", title: "Contexto de la pantalla", question: "¿Dónde estoy y qué información estoy viendo?", resolves: "Identifica el módulo, tu rol, el alcance territorial y la fecha de actualización.", action: "Confirma que el territorio y el perfil correspondan a tu tarea." },
    { selector: ".sr-module-filter, .sr-dashboard-filter, .sr-top-control", title: "Selecciona el contexto", question: "¿Qué provincia, cantón, COE y evento necesito consultar?", resolves: "Los filtros conservan el contexto cuando cambias de módulo.", action: "Selecciona primero el territorio y luego el evento o problema." },
    { selector: ".sr-metrics-row, .sr-dashboard-kpis, .sr-summary-metrics", title: "Lee los indicadores", question: "¿Qué requiere atención inmediata?", resolves: "Los colores y cifras resumen el estado operativo del alcance seleccionado.", action: "Prioriza rojos y naranjas; después revisa verdes y azules." },
    { selector: "#srAssistantDock", title: "Asistentes contextuales", question: "¿Dónde pido ayuda sin perder la pantalla?", resolves: "Chat, Especialista GPT y Guía se abren sobre el módulo actual.", action: "Abre solo un asistente a la vez para mantener el contexto." }
  ];

  const stepsByRoute = {
    inicio: [
      { selector: ".sr-dashboard-intro button", title: "Inicia el flujo operativo", question: "¿Dónde comienzo cuando necesito entender la emergencia?", resolves: "Este botón abre Respuesta COE con el mismo alcance territorial.", action: "Úsalo para pasar del resumen a la secuencia operativa." },
      ...commonSteps.slice(1, 3),
      { selector: ".sr-dashboard-operational", title: "Accesos operativos", question: "¿Qué módulo debo abrir para cada necesidad?", resolves: "Agrupa Respuesta COE, Monitoreo, Riesgos, Acciones, Instituciones y Reportes.", action: "Selecciona la tarjeta que corresponda a tu pregunta." },
      { selector: ".sr-dashboard-priorities", title: "Prioridades del territorio", question: "¿Qué riesgos y acciones debo revisar primero?", resolves: "Muestra riesgos críticos y acciones activas del alcance.", action: "Abre el detalle antes de informar o escalar." },
      { selector: ".sr-dashboard-cycle", title: "Ciclo integrado", question: "¿Cómo se organizan las pestañas principales?", resolves: "Ordena operación COE, análisis territorial, coordinación y administración.", action: "Sigue los bloques de izquierda a derecha." },
      { selector: "#srRefresh", title: "Actualiza los datos", question: "¿Cómo confirmo que estoy viendo la información más reciente?", resolves: "Vuelve a consultar los registros autorizados.", action: "Actualiza antes de emitir un reporte de situación." }
    ],
    "respuesta-coe": [
      { selector: ".sr-guide-question", title: "Pregunta guía", question: "¿Qué debe resolver esta pantalla?", resolves: "Conecta etapa, responsable, riesgos y acción de mitigación.", action: "Mantén esta pregunta como hilo conductor." },
      { selector: ".sr-top-control", title: "Define el evento", question: "¿Para qué territorio y problema necesito una respuesta?", resolves: "Filtra provincia, cantón, estado del COE y evento.", action: "Evita mezclar eventos distintos." },
      { selector: ".sr-stage[data-stage-index='0']", title: "1. Reporte de monitoreo", question: "¿Qué ocurrió y quién lo reportó?", resolves: "Reúne reportes y alertas tempranas.", action: "Abre detalles y verifica fuente, fecha y ubicación." },
      { selector: ".sr-stage[data-stage-index='1']", title: "2. Validación técnica", question: "¿La información ya puede usarse para decidir?", resolves: "Distingue datos verificados de pendientes.", action: "No conviertas un reporte preliminar en decisión sin validación." },
      { selector: ".sr-stage[data-stage-index='2']", title: "3. Coordinación institucional", question: "¿Quién debe intervenir?", resolves: "Relaciona mesas, instituciones y capacidades.", action: "Identifica responsable principal y apoyos." },
      { selector: ".sr-stage[data-stage-index='3']", title: "4. Decisión COE", question: "¿Qué decisión formal está registrada o en evaluación?", resolves: "Vincula el análisis con decisiones del COE.", action: "Revisa responsable, alcance y estado de la decisión." },
      { selector: ".sr-stage[data-stage-index='4']", title: "5. Escalamiento operativo", question: "¿Qué acciones exceden la capacidad local?", resolves: "Muestra acciones en ejecución y escaladas.", action: "Escala solo con justificación, responsable y necesidad concreta." },
      { selector: ".sr-stage[data-stage-index='5']", title: "6. Mitigación", question: "¿La intervención está reduciendo el impacto?", resolves: "Resume progreso e impacto reducido.", action: "Exige evidencia antes de considerar cerrada una acción." },
      { selector: ".sr-support-card", title: "Instituciones de apoyo", question: "¿Qué actores pueden aportar recursos o competencias?", resolves: "Muestra instituciones vinculadas al evento.", action: "Abre detalles para revisar rol y disponibilidad." },
      { selector: ".sr-risk-card", title: "Riesgos detectados", question: "¿Qué condiciones pueden agravar la emergencia?", resolves: "Resume riesgos críticos y otros riesgos asociados.", action: "Relaciona cada riesgo con una decisión o acción." },
      { selector: ".sr-primary-actions", title: "Ruta de trabajo", question: "¿Qué hago después de comprender el flujo?", resolves: "Permite programar, revisar acciones o actualizar datos.", action: "Entra a programación para revisar responsables, plazos y progreso." },
      { selector: "#srProgramming", title: "Programación del COE", question: "¿Dónde reviso el seguimiento detallado?", resolves: "Concentra acciones, responsables, plazos y estado.", action: "Despliega la sección cuando necesites el detalle operativo." }
    ],
    monitoreo: [
      ...commonSteps,
      { selector: ".sr-timeline", title: "Línea de tiempo", question: "¿Qué se reportó primero y qué cambió después?", resolves: "Ordena reportes por fecha y fuente.", action: "Selecciona un reporte para abrir su detalle." },
      { selector: ".sr-source-grid", title: "Fuentes institucionales", question: "¿Quién está reportando?", resolves: "Resume las instituciones fuente y su volumen de reportes.", action: "Contrasta fuentes cuando existan versiones diferentes." },
      { selector: ".sr-detail-card", title: "Detalle del reporte", question: "¿Qué información sustenta el reporte?", resolves: "Muestra estado, ubicación, descripción y fecha.", action: "Confirma evidencia y validación antes de usarlo." }
    ],
    coe: [
      ...commonSteps,
      { selector: ".sr-session-list", title: "Sesiones del COE", question: "¿Qué COE está activo o programado?", resolves: "Muestra sesiones visibles por territorio.", action: "Abre la sesión para revisar contexto y estado." },
      { selector: ".sr-two-column.wide-left article:nth-child(2)", title: "Agenda y compromisos", question: "¿Qué compromisos surgieron del COE?", resolves: "Relaciona sesiones con acciones y responsables.", action: "Prioriza compromisos vencidos o sin responsable." }
    ],
    riesgos: [
      ...commonSteps,
      { selector: ".sr-risk-list", title: "Riesgos y sitios críticos", question: "¿Dónde están los riesgos prioritarios?", resolves: "Lista riesgos, ubicación y criticidad.", action: "Abre el detalle o llévalo al mapa." },
      { selector: ".sr-risk-matrix", title: "Matriz de criticidad", question: "¿Cómo se distribuyen los niveles de riesgo?", resolves: "Separa alta, media y baja o sin valorar.", action: "Revisa primero los riesgos altos y los no valorados." }
    ],
    acciones: [
      ...commonSteps,
      { selector: ".sr-table", title: "Tabla de acciones", question: "¿Quién hace qué, para cuándo y con qué avance?", resolves: "Reúne acción, etapa, responsable, prioridad, estado, plazo y progreso.", action: "Busca acciones vencidas, sin responsable o sin avance." }
    ],
    instituciones: [
      ...commonSteps,
      { selector: ".sr-institution-grid", title: "Instituciones y roles", question: "¿Qué instituciones participan y cuál es su rol?", resolves: "Relaciona institución, unidad y estado.", action: "Abre la institución antes de dirigir una solicitud." },
      { selector: ".sr-chat-preview", title: "Chat interinstitucional", question: "¿Cómo contacto a una institución o cargo?", resolves: "Prepara conversaciones por institución, cargo, COE o MTT/GT.", action: "Durante el piloto, utiliza la vista para estructurar el destinatario." }
    ],
    reportes: [
      ...commonSteps,
      { selector: ".sr-report-list", title: "Biblioteca de reportes", question: "¿Qué reportes están disponibles?", resolves: "Lista informes y reportes de monitoreo del alcance.", action: "Abre un reporte para revisar fuente y territorio." },
      { selector: ".sr-report-preview", title: "Vista previa", question: "¿Qué contiene el reporte seleccionado?", resolves: "Resume fuente, territorio y descripción.", action: "Verifica aprobación antes de compartirlo oficialmente." }
    ],
    mapas: [
      ...commonSteps,
      { selector: "#srMap", title: "Mapa operativo", question: "¿Dónde se ubican riesgos y reportes?", resolves: "Visualiza el territorio seleccionado y elementos georreferenciados.", action: "Acerca el mapa y abre los puntos para leer detalles." },
      { selector: ".sr-layer-panel", title: "Capas y leyenda", question: "¿Qué información cartográfica estoy viendo?", resolves: "Identifica límites, riesgos, reportes y niveles de criticidad.", action: "Usa únicamente capas con metadatos y vigencia conocidos." }
    ],
    herramientas: [
      { selector: ".sr-tool-tabs", title: "Categorías de herramientas", question: "¿Dónde encuentro utilidades, auditoría y administración?", resolves: "Las pestañas enfocan la tarjeta correspondiente sin cambiar el contenido.", action: "Selecciona la categoría que necesitas revisar." },
      { selector: ".sr-tool-grid", title: "Herramientas disponibles", question: "¿Qué capacidades están habilitadas en el piloto?", resolves: "Muestra cartografía, importaciones, auditoría y usuarios según rol.", action: "Respeta las funciones marcadas como solo lectura." },
      ...commonSteps.slice(3)
    ],
    configuracion: [
      { selector: ".sr-config-grid article:first-child", title: "Perfil y alcance", question: "¿Con qué rol y territorio estoy trabajando?", resolves: "Muestra identidad, rol, alcance y modo de acceso.", action: "Reporta cualquier alcance incorrecto antes de operar." },
      { selector: ".sr-config-grid article:nth-child(2)", title: "Preferencias", question: "¿Cómo adapto la lectura y las ayudas?", resolves: "Permite configurar notificaciones, guía y vista compacta.", action: "Mantén activa la guía y utiliza A+ o A++ para lectura cómoda." },
      { selector: ".sr-config-grid article:nth-child(3)", title: "Seguridad de la sesión", question: "¿Cómo cierro la sesión de manera segura?", resolves: "Explica la restricción territorial y permite cerrar sesión.", action: "Cierra sesión al terminar, especialmente en equipos compartidos." }
    ]
  };

  function cleanupTour() {
    clearTimeout(ux.autoTimer);
    $$(".sr-tour-target, .sr-tour-spotlight").forEach(node => node.classList.remove("sr-tour-target", "sr-tour-spotlight"));
    $$(".sr-tour-layer").forEach(node => node.classList.remove("sr-tour-layer"));
    $("#srTourOverlay")?.remove();
    $("#srTourPopover")?.remove();
    ux.tour = null;
  }

  function availableSteps(route = routeId()) {
    const steps = stepsByRoute[route] || commonSteps;
    return steps.filter(step => $(step.selector));
  }

  function positionTourPopover(popover, target) {
    const rect = target.getBoundingClientRect();
    const margin = 14;
    const width = Math.min(390, window.innerWidth - 24);
    popover.style.width = `${width}px`;
    popover.style.visibility = "hidden";
    popover.style.display = "block";
    const height = popover.offsetHeight;
    let top = rect.bottom + margin;
    if (top + height > window.innerHeight - 12) top = Math.max(12, rect.top - height - margin);
    let left = rect.left;
    if (rect.left < 230 && rect.right < window.innerWidth * 0.35) left = rect.right + margin;
    left = Math.max(12, Math.min(left, window.innerWidth - width - 12));
    popover.style.left = `${left}px`;
    popover.style.top = `${top}px`;
    popover.style.visibility = "visible";
  }

  function renderTourStep() {
    if (!ux.tour) return;
    const { intro, steps, index } = ux.tour;
    $$(".sr-tour-target, .sr-tour-spotlight").forEach(node => node.classList.remove("sr-tour-target", "sr-tour-spotlight"));
    $$(".sr-tour-layer").forEach(node => node.classList.remove("sr-tour-layer"));
    let target;
    let step;
    if (intro) {
      target = $("#srGuideTop") || $(".sr-dashboard-intro button") || $(".sr-page-heading");
      step = {
        title: "Guía dinámica de SmartRisk",
        question: "¿Necesitas una ruta rápida para encontrar la información durante una emergencia?",
        resolves: "La guía recorrerá esta pantalla botón por botón mediante preguntas y mensajes sugeridos.",
        action: "Pulsa Iniciar recorrido. Puedes cerrar la guía en cualquier momento."
      };
    } else {
      step = steps[index];
      target = step ? $(step.selector) : null;
    }
    if (!target || !step) { cleanupTour(); return; }
    target.scrollIntoView({ behavior: "smooth", block: "center", inline: "nearest" });
    target.classList.add("sr-tour-target");
    if (intro) {
      target.classList.add("sr-tour-spotlight");
      target.closest(".sr-page-heading, header, .sr-main")?.classList.add("sr-tour-layer");
    }

    let overlay = $("#srTourOverlay");
    if (!overlay) {
      overlay = document.createElement("div");
      overlay.id = "srTourOverlay";
      overlay.className = "sr-tour-overlay";
      document.body.appendChild(overlay);
    }
    overlay.classList.toggle("intro", intro);

    let popover = $("#srTourPopover");
    if (!popover) {
      popover = document.createElement("section");
      popover.id = "srTourPopover";
      popover.className = "sr-tour-popover";
      popover.setAttribute("role", "dialog");
      popover.setAttribute("aria-live", "polite");
      document.body.appendChild(popover);
    }
    const total = steps.length;
    popover.innerHTML = `<header><div><small>${intro ? "Bienvenida" : `Paso ${index + 1} de ${total}`}</small><h2>${esc(step.title)}</h2></div><button type="button" data-tour-close aria-label="Cerrar guía">×</button></header><div class="sr-tour-question"><b>${esc(step.question)}</b></div><p>${esc(step.resolves)}</p><div class="sr-tour-suggestion"><span>${icon("guide", 18)}</span><div><small>Acción sugerida</small><b>${esc(step.action)}</b></div></div><footer>${intro ? `<button type="button" data-tour-skip>Ahora no</button><button type="button" class="primary" data-tour-start>Iniciar recorrido →</button>` : `<button type="button" data-tour-prev ${index === 0 ? "disabled" : ""}>← Anterior</button><span>${index + 1}/${total}</span><button type="button" class="primary" data-tour-next>${index === total - 1 ? "Finalizar" : "Siguiente →"}</button>`}</footer>`;
    setTimeout(() => positionTourPopover(popover, target), 40);
    setTimeout(() => { if (ux.tour && $("#srTourPopover") === popover) positionTourPopover(popover, target); }, 420);
  }

  function startTour({ intro = false, auto = false } = {}) {
    closePopover();
    cleanupTour();
    const steps = availableSteps();
    if (!steps.length) {
      toast("No se encontraron elementos disponibles para la guía en esta pantalla.", "warning");
      return;
    }
    ux.tour = { route: routeId(), intro, auto, steps, index: 0 };
    if (auto) storage.set("guideSeen", "true");
    renderTourStep();
  }

  function showRecordDrawer(record) {
    if (!record) return;
    $("#srUxRecordDrawer")?.remove();
    const payload = record.payload || {};
    const drawer = document.createElement("aside");
    drawer.id = "srUxRecordDrawer";
    drawer.className = "sr-ux-record-drawer open";
    drawer.innerHTML = `<header><div><small>Detalle del reporte</small><h2>${esc(record.title || "Registro")}</h2></div><button type="button" data-ux-close-drawer aria-label="Cerrar">×</button></header><dl><div><dt>Estado</dt><dd>${esc(record.estado || "Sin estado")}</dd></div><div><dt>Fuente</dt><dd>${esc(record.institucion || "No indicada")}</dd></div><div><dt>Territorio</dt><dd>${esc([record.canton, record.provincia].filter(Boolean).join(" · ") || "Sin ubicación")}</dd></div><div><dt>Fecha</dt><dd>${esc(record.updatedAt || record.createdAt || "Sin fecha")}</dd></div><div><dt>Descripción</dt><dd>${esc(record.detail || payload.descripcion || payload.resumen || "Sin descripción")}</dd></div></dl><footer><button type="button" data-ux-route="monitoreo">Abrir Monitoreo</button></footer>`;
    document.body.appendChild(drawer);
  }

  function prepareGptPrompt(buttonText) {
    const state = appState();
    const filters = state?.filters || {};
    const selected = Object.values(state?.data?.entities || {}).flat().filter(record => {
      const same = (left, right) => !right || normalize(left) === normalize(right);
      return same(record.provincia, filters.provincia) && same(record.canton, filters.canton);
    });
    const instructionMap = {
      "Analizar datos clave y brechas": "Analiza los datos clave, identifica brechas de información y prioriza las verificaciones necesarias.",
      "Identificar la siguiente acción": "Identifica la siguiente acción operativa, su responsable institucional sugerido y el criterio de cierre.",
      "Revisar coherencia de un reporte": "Revisa la coherencia técnica del reporte, señala contradicciones y enumera los datos faltantes."
    };
    const prompt = `Actúa como especialista en gestión de riesgos de la Coordinación Zonal 5.\nPantalla: ${routeTitle()}.\nProvincia: ${filters.provincia || "Todo el alcance"}.\nCantón: ${filters.canton || "Todos"}.\nEvento: ${filters.evento || "Todos los eventos"}.\nRegistros visibles en el contexto: ${selected.length}.\nTarea: ${instructionMap[buttonText] || buttonText}.\nNo inventes información; diferencia datos confirmados, inferencias y datos faltantes.`;
    $("#srUxPromptDialog")?.remove();
    const dialog = document.createElement("section");
    dialog.id = "srUxPromptDialog";
    dialog.className = "sr-ux-modal";
    dialog.innerHTML = `<div><header><div>${icon("spark", 22)}<h2>Contexto para Especialista GPT</h2></div><button type="button" data-ux-close-prompt aria-label="Cerrar">×</button></header><p>El texto no incluye contraseñas ni credenciales. Revisa el contenido antes de compartirlo.</p><textarea readonly>${esc(prompt)}</textarea><footer><button type="button" data-ux-copy-prompt>Copiar contexto</button><button type="button" class="primary" data-ux-open-gpt>Abrir ChatGPT ↗</button></footer></div>`;
    document.body.appendChild(dialog);
    dialog._prompt = prompt;
  }

  function syncConfigurationControls() {
    $$(".sr-setting").forEach(label => {
      const input = $("input[type='checkbox']", label);
      if (!input) return;
      const text = normalize(label.textContent);
      if (text.includes("notificaciones")) input.checked = storage.get("notifications", "true") !== "false";
      if (text.includes("guia dinamica")) input.checked = storage.get("guideEnabled", "true") !== "false";
      if (text.includes("vista compacta")) input.checked = storage.get("compact", "false") === "true";
    });
  }

  function enhanceHeader() {
    const notification = $(".sr-notifications");
    const profile = $(".sr-heading-actions .sr-icon-button[aria-label='Perfil']");
    const guide = $("#srGuideTop");
    if (notification) {
      notification.type = "button";
      notification.setAttribute("aria-haspopup", "dialog");
    }
    if (profile) {
      profile.type = "button";
      profile.title = "Abrir perfil y opciones de lectura";
      profile.setAttribute("aria-haspopup", "dialog");
      profile.setAttribute("aria-expanded", "false");
    }
    if (guide) {
      guide.type = "button";
      guide.title = "Iniciar guía dinámica de esta pantalla";
    }
    updateNotificationBadge();
    syncConfigurationControls();
  }

  function maybeScheduleAutoGuide() {
    clearTimeout(ux.autoTimer);
    if (routeId() !== "inicio") return;
    if (storage.get("guideEnabled", "true") === "false") return;
    if (storage.get("guideSeen", "false") === "true") return;
    ux.autoTimer = setTimeout(() => {
      if (routeId() === "inicio" && !ux.tour && !ux.popover) startTour({ intro: true, auto: true });
    }, 2000);
  }

  function afterRender() {
    if (!document.body.classList.contains("v11-enabled")) return;
    enhanceHeader();
    const route = routeId();
    if (ux.lastRoute !== route) {
      if (ux.tour && ux.tour.route !== route) cleanupTour();
      closePopover();
      ux.lastRoute = route;
      maybeScheduleAutoGuide();
    }
  }

  function bindEvents() {
    document.addEventListener("click", event => {
      const guide = event.target.closest("#srGuideTop, #srAssistantDock [data-assistant='guide']");
      if (guide) {
        event.preventDefault();
        event.stopImmediatePropagation();
        startTour({ intro: false });
        return;
      }

      const notification = event.target.closest(".sr-notifications");
      if (notification) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showNotifications(notification);
        return;
      }

      const profile = event.target.closest(".sr-heading-actions .sr-icon-button[aria-label='Perfil']");
      if (profile) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showProfile(profile);
        return;
      }

      if (event.target.closest("[data-ux-close]")) { closePopover(); return; }
      const uxRoute = event.target.closest("[data-ux-route]");
      if (uxRoute) {
        closePopover();
        location.hash = `#/${uxRoute.dataset.uxRoute}`;
        return;
      }
      if (event.target.closest("[data-ux-logout]")) {
        closePopover();
        appState()?.auth?.signOut?.();
        return;
      }
      const sizeButton = event.target.closest("[data-text-size]");
      if (sizeButton) {
        applyTextSize(sizeButton.dataset.textSize);
        $$("[data-text-size]").forEach(button => button.classList.toggle("active", button === sizeButton));
        toast("Tamaño de lectura actualizado.", "success");
        return;
      }

      if (event.target.closest("[data-tour-close], [data-tour-skip]")) { cleanupTour(); return; }
      if (event.target.closest("[data-tour-start]")) {
        ux.tour.intro = false;
        ux.tour.index = 0;
        renderTourStep();
        return;
      }
      if (event.target.closest("[data-tour-prev]")) {
        if (ux.tour && ux.tour.index > 0) { ux.tour.index -= 1; renderTourStep(); }
        return;
      }
      if (event.target.closest("[data-tour-next]")) {
        if (!ux.tour) return;
        if (ux.tour.index >= ux.tour.steps.length - 1) {
          cleanupTour();
          toast("Recorrido completado. Puedes abrir la Guía cuando lo necesites.", "success");
        } else {
          ux.tour.index += 1;
          renderTourStep();
        }
        return;
      }

      const timeline = event.target.closest(".sr-timeline-item[data-record-id]");
      if (timeline) {
        event.preventDefault();
        const record = appState()?.data?.records?.find(item => String(item.id) === String(timeline.dataset.recordId));
        showRecordDrawer(record);
        return;
      }
      if (event.target.closest("[data-ux-close-drawer]")) { $("#srUxRecordDrawer")?.remove(); return; }

      const filterButton = event.target.closest(".sr-timeline header button");
      if (filterButton && normalize(filterButton.textContent).trim() === "filtros") {
        event.preventDefault();
        const filters = $(".sr-module-filter, .sr-dashboard-filter, .sr-top-control");
        filters?.scrollIntoView({ behavior: "smooth", block: "center" });
        filters?.classList.add("sr-ux-attention");
        setTimeout(() => filters?.classList.remove("sr-ux-attention"), 1800);
        toast("Usa los filtros superiores para delimitar territorio, COE y evento.");
        return;
      }

      const toolTab = event.target.closest(".sr-tool-tabs button");
      if (toolTab) {
        event.preventDefault();
        const tabs = $$(".sr-tool-tabs button");
        const cards = $$(".sr-tool-grid .sr-card");
        const index = tabs.indexOf(toolTab);
        tabs.forEach(button => button.classList.toggle("active", button === toolTab));
        cards.forEach(card => card.classList.remove("sr-tool-focus"));
        const card = cards[index];
        if (card) {
          card.classList.add("sr-tool-focus");
          card.scrollIntoView({ behavior: "smooth", block: "center" });
          setTimeout(() => card.classList.remove("sr-tool-focus"), 2200);
        }
        return;
      }

      const gptOption = event.target.closest(".sr-gpt-options button:not(#srOpenExternalGPT)");
      if (gptOption) {
        event.preventDefault();
        prepareGptPrompt(gptOption.textContent.trim());
        return;
      }
      if (event.target.closest("[data-ux-close-prompt]")) { $("#srUxPromptDialog")?.remove(); return; }
      if (event.target.closest("[data-ux-copy-prompt]")) {
        const dialog = $("#srUxPromptDialog");
        const prompt = dialog?._prompt || $("textarea", dialog)?.value || "";
        navigator.clipboard?.writeText(prompt).then(() => toast("Contexto copiado.", "success")).catch(() => toast("Selecciona y copia el texto manualmente.", "warning"));
        return;
      }
      if (event.target.closest("[data-ux-open-gpt]")) {
        window.open("https://chatgpt.com", "_blank", "noopener");
        return;
      }

      if (ux.popover && !event.target.closest(".sr-ux-popover")) closePopover();
    }, true);

    document.addEventListener("change", event => {
      const input = event.target.closest(".sr-setting input[type='checkbox']");
      if (!input) return;
      const text = normalize(input.closest("label")?.textContent);
      if (text.includes("notificaciones")) {
        storage.set("notifications", input.checked);
        updateNotificationBadge();
        toast(input.checked ? "Notificaciones operativas activadas." : "Notificaciones operativas ocultas.");
      }
      if (text.includes("guia dinamica")) {
        storage.set("guideEnabled", input.checked);
        if (!input.checked) cleanupTour();
        toast(input.checked ? "Guía dinámica activada." : "Inicio automático de la guía desactivado.");
      }
      if (text.includes("vista compacta")) {
        applyCompact(input.checked);
        toast(input.checked ? "Vista compacta activada." : "Vista cómoda activada.");
      }
    }, true);

    document.addEventListener("keydown", event => {
      if (event.key === "Escape") {
        cleanupTour();
        closePopover();
        $("#srUxRecordDrawer")?.remove();
        $("#srUxPromptDialog")?.remove();
      }
      if (!ux.tour || ux.tour.intro) return;
      if (event.key === "ArrowRight") {
        event.preventDefault();
        if (ux.tour.index < ux.tour.steps.length - 1) { ux.tour.index += 1; renderTourStep(); }
      }
      if (event.key === "ArrowLeft") {
        event.preventDefault();
        if (ux.tour.index > 0) { ux.tour.index -= 1; renderTourStep(); }
      }
    });

    window.addEventListener("resize", () => {
      if (ux.tour) renderTourStep();
      if (ux.popover) closePopover();
    });
  }

  function initialize() {
    if (ux.initialized) return;
    ux.initialized = true;
    applyTextSize();
    applyCompact();
    bindEvents();
    ux.observer = new MutationObserver(() => requestAnimationFrame(afterRender));
    ux.observer.observe(document.body, { childList: true, subtree: true });
    afterRender();
  }

  function afterAppStart() {
    initialize();
    afterRender();
  }

  window.SmartRiskV11UX = { VERSION, initialize, afterAppStart, startTour, applyTextSize };
  initialize();
})();
