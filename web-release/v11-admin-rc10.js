(() => {
  "use strict";

  const VERSION = "11.0.0-rc10";
  const PRINCIPAL_EMAIL = "dcoellom2@unemi.edu.ec";
  const $ = (selector, root = document) => root.querySelector(selector);
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);

  const runtime = {
    bound: false,
    observer: null,
    dataRef: null,
    baseRecords: [],
    baseEntities: {},
    baseFilters: {},
    mode: "principal",
    value: ""
  };

  const STAGES = [
    {
      id: "monitoreo", n: 1, title: "Reporte de monitoreo", route: "monitoreo", entity: "monitoringReports",
      checks: [
        ["Fuente institucional", ["institucion", "responsable", "payload.fuente", "payload.institucion"]],
        ["Fecha del reporte", ["updatedAt", "createdAt", "payload.fecha", "payload.fechaReporte"]],
        ["Ubicación", ["canton", "provincia", "lat", "lng", "payload.ubicacion"]],
        ["Evidencia", ["payload.evidencia", "payload.archivo", "payload.archivos", "payload.fotografias", "payload.adjuntos", "payload.url"]],
        ["Evento asociado", ["evento", "eventoId", "payload.evento", "payload.amenaza"]]
      ],
      suggestion: "Completar fuente, fecha, ubicación, evento y evidencia verificable antes de escalar el reporte."
    },
    {
      id: "validacion", n: 2, title: "Validación técnica", route: "monitoreo", entity: "validations",
      checks: [
        ["Técnico responsable", ["responsable", "institucion", "payload.tecnico", "payload.validador"]],
        ["Método o criterio", ["payload.metodo", "payload.metodologia", "payload.criterio", "payload.procedimiento"]],
        ["Evidencia revisada", ["payload.evidencia", "payload.archivo", "payload.cartografia", "payload.fuente"]],
        ["Resultado", ["estado", "payload.resultado", "payload.estadoValidacion"]],
        ["Fecha de validación", ["updatedAt", "createdAt", "payload.fechaValidacion", "payload.fecha"]]
      ],
      suggestion: "Asignar revisión técnica, contrastar cartografía y fuentes, y registrar método, resultado y fecha de validación."
    },
    {
      id: "coordinacion", n: 3, title: "Coordinación institucional", route: "instituciones", entity: "institutions",
      checks: [
        ["Institución competente", ["institucion", "title", "payload.institucion", "payload.entidad"]],
        ["Contacto operativo", ["payload.correo", "payload.email", "payload.telefono", "payload.celular"]],
        ["Cargo o rol", ["unidad", "payload.cargo", "payload.rol", "payload.mesa", "payload.mtt"]],
        ["Territorio", ["canton", "provincia", "territorioId"]],
        ["Estado de participación", ["estado", "payload.estado"]]
      ],
      suggestion: "Confirmar institución competente, contacto, cargo, MTT/GT y responsabilidad operativa para el problema seleccionado."
    },
    {
      id: "decision", n: 4, title: "Decisión COE", route: "coe", entity: "decisions",
      checks: [
        ["Autoridad responsable", ["responsable", "institucion", "payload.autoridad", "payload.presidente"]],
        ["Fecha o resolución", ["updatedAt", "createdAt", "payload.fecha", "payload.numeroResolucion", "payload.resolucion"]],
        ["Fundamento técnico", ["payload.fundamento", "payload.justificacion", "payload.evidencia", "payload.informe"]],
        ["Territorio o evento", ["canton", "provincia", "evento", "eventoId"]],
        ["Acción resultante", ["payload.accion", "payload.acciones", "payload.compromiso", "payload.actionId"]]
      ],
      suggestion: "Vincular la decisión con evidencia técnica, autoridad, fecha, territorio y acción resultante."
    },
    {
      id: "escalamiento", n: 5, title: "Escalamiento operativo", route: "acciones", entity: "actions",
      checks: [
        ["Responsable", ["responsable", "payload.responsable", "payload.encargado"]],
        ["Institución", ["institucion", "payload.institucion", "payload.entidad"]],
        ["Plazo", ["payload.fechaLimite", "payload.plazo", "payload.fechaFin", "payload.fecha"]],
        ["Prioridad", ["prioridad", "payload.prioridad", "payload.criticidad"]],
        ["Recursos", ["payload.recursos", "payload.insumos", "payload.personal", "payload.vehiculos", "payload.presupuesto"]],
        ["Brecha vinculada", ["payload.brecha", "payload.brechaId", "payload.hallazgo", "payload.problema"]],
        ["Estado", ["estado", "payload.estado"]]
      ],
      suggestion: "Completar responsable, institución, plazo, prioridad, recursos, estado y brecha que la acción busca resolver."
    },
    {
      id: "mitigacion", n: 6, title: "Mitigación y cierre", route: "acciones", entity: "actions",
      filter: record => /complet|cerrad|finaliz|mitig|ejec/.test(normalize(`${record.estado} ${record.detail}`)) || Number(record.avance) > 0,
      checks: [
        ["Evidencia de ejecución", ["payload.evidencia", "payload.archivo", "payload.fotografias", "payload.adjuntos", "payload.url"]],
        ["Criterio de cierre", ["payload.criterioCierre", "payload.resultado", "payload.producto", "payload.verificacion"]],
        ["Riesgo residual", ["payload.riesgoResidual", "payload.nivelResidual", "payload.valoracionFinal"]],
        ["Resultado o beneficiarios", ["payload.beneficiarios", "payload.resultados", "payload.impacto"]],
        ["Lecciones aprendidas", ["payload.lecciones", "payload.leccionesAprendidas", "payload.recomendaciones"]]
      ],
      suggestion: "Adjuntar evidencia, validar el cierre, valorar el riesgo residual y documentar resultados y lecciones aprendidas."
    }
  ];

  function appState() { return window.SmartRiskV11App?.state; }
  function isPrincipal() { return normalize(appState()?.user?.email) === normalize(PRINCIPAL_EMAIL); }
  function readPath(record, path) {
    return path.split(".").reduce((value, key) => value == null ? null : value[key], record);
  }
  function hasAny(record, paths) {
    return paths.some(path => {
      const value = readPath(record, path);
      if (Array.isArray(value)) return value.length > 0;
      if (typeof value === "number") return Number.isFinite(value);
      if (typeof value === "boolean") return true;
      return value !== undefined && value !== null && String(value).trim() !== "";
    });
  }
  function unique(values) { return [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "es")); }

  function captureData() {
    const state = appState();
    if (!state?.data || runtime.dataRef === state.data) return;
    runtime.dataRef = state.data;
    runtime.baseRecords = [...(state.data.records || [])];
    runtime.baseEntities = Object.fromEntries(Object.entries(state.data.entities || {}).map(([key, value]) => [key, [...value]]));
    runtime.baseFilters = Object.fromEntries(Object.entries(state.data.filters || {}).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]));
  }

  function restoreData() {
    const state = appState();
    captureData();
    state.data.records = [...runtime.baseRecords];
    state.data.entities = Object.fromEntries(Object.entries(runtime.baseEntities).map(([key, value]) => [key, [...value]]));
    state.data.grouped = state.data.entities;
    state.data.filters = Object.fromEntries(Object.entries(runtime.baseFilters).map(([key, value]) => [key, Array.isArray(value) ? [...value] : value]));
  }

  function perspectiveOptions(mode) {
    captureData();
    if (mode === "provincial") return unique(runtime.baseRecords.map(record => record.provincia));
    if (mode === "cantonal") return unique(runtime.baseRecords.filter(record => record.canton).map(record => `${record.provincia || "Sin provincia"}||${record.canton}`));
    if (mode === "institucion") return unique(runtime.baseRecords.flatMap(record => [record.institucion, record.entityType === "institutions" ? record.title : null]));
    if (mode === "unidad") return unique(runtime.baseRecords.flatMap(record => [record.unidad, record.payload?.mesa, record.payload?.mtt, record.payload?.grupoTrabajo]));
    return [];
  }

  function recordText(record) {
    let payloadText = "";
    try { payloadText = JSON.stringify(record.payload || {}); } catch {}
    return normalize([record.title, record.detail, record.institucion, record.unidad, record.responsable, payloadText].join(" "));
  }

  function filterDataByText(value, field) {
    const needle = normalize(value);
    const filtered = runtime.baseRecords.filter(record => {
      if (field === "institucion") return normalize(record.institucion) === needle || (record.entityType === "institutions" && normalize(record.title) === needle) || recordText(record).includes(needle);
      return normalize(record.unidad) === needle || recordText(record).includes(needle);
    });
    const ids = new Set(filtered.map(record => record.id));
    const state = appState();
    state.data.records = filtered;
    state.data.entities = Object.fromEntries(Object.entries(runtime.baseEntities).map(([key, records]) => [key, records.filter(record => ids.has(record.id))]));
    state.data.grouped = state.data.entities;
    state.data.filters = {
      ...runtime.baseFilters,
      provincias: unique(filtered.map(record => record.provincia)),
      cantones: unique(filtered.map(record => record.canton)),
      instituciones: unique(filtered.map(record => record.institucion)),
      unidades: unique(filtered.map(record => record.unidad)),
      eventos: unique(filtered.map(record => record.evento))
    };
  }

  function updateIdentity() {
    const state = appState();
    if (!state?.profileContext || !isPrincipal()) return;
    state.profileContext.roleKey = "principal";
    state.profileContext.roleLabel = "Administrador principal";
    if (!state.profileContext.scopeLabel) state.profileContext.scopeLabel = "Coordinación Zonal 5 completa";
    if (state.permissions) {
      state.permissions.role = "principal";
      state.permissions.canManageUsers = () => true;
      state.permissions.canViewAdministration = () => true;
    }
    document.body.dataset.adminPrincipal = "true";
    const role = $(".sr-user-card small");
    if (role) role.textContent = "Administrador principal";
  }

  function applyPerspective(mode = runtime.mode, value = runtime.value, rerender = true) {
    const state = appState();
    if (!state?.data || !isPrincipal()) return;
    runtime.mode = mode;
    runtime.value = value || "";
    restoreData();
    state.filters.provincia = "";
    state.filters.canton = "";

    if (mode === "provincial" && value) state.filters.provincia = value;
    if (mode === "cantonal" && value) {
      const [province, canton] = value.split("||");
      state.filters.provincia = province === "Sin provincia" ? "" : province;
      state.filters.canton = canton || "";
    }
    if (mode === "institucion" && value) filterDataByText(value, "institucion");
    if (mode === "unidad" && value) filterDataByText(value, "unidad");

    const scopeLabels = {
      principal: "Coordinación Zonal 5 completa",
      zonal: "Coordinación Zonal 5",
      provincial: value || "Selecciona una provincia",
      cantonal: value ? value.replace("||", " · ") : "Selecciona un cantón",
      institucion: value || "Selecciona una institución",
      unidad: value || "Selecciona una unidad o mesa"
    };
    state.profileContext.roleLabel = "Administrador principal";
    state.profileContext.scopeLabel = scopeLabels[mode] || scopeLabels.principal;
    localStorage.setItem("smartrisk.rc10.view", JSON.stringify({ mode, value: runtime.value }));
    if (rerender) window.SmartRiskV11App.render(location.hash);
    setTimeout(enhance, 0);
  }

  function currentRecords() {
    const state = appState();
    const records = state?.data?.records || [];
    return records.filter(record => {
      const same = (left, right) => !right || normalize(left) === normalize(right);
      const eventText = normalize(`${record.evento || ""} ${record.payload?.tema || ""} ${record.payload?.problema || ""}`);
      return same(record.provincia, state.filters.provincia)
        && same(record.canton, state.filters.canton)
        && (!state.filters.evento || !eventText || eventText.includes(normalize(state.filters.evento)));
    });
  }

  function analyzeStage(stage, records) {
    let candidates = records.filter(record => record.entityType === stage.entity);
    if (stage.filter) candidates = candidates.filter(stage.filter);
    const missing = stage.checks.map(([label, paths]) => ({ label, count: candidates.filter(record => !hasAny(record, paths)).length }));
    const required = candidates.length * stage.checks.length;
    const absent = missing.reduce((sum, item) => sum + item.count, 0);
    const score = required ? Math.max(0, Math.round(((required - absent) / required) * 100)) : 0;
    return { ...stage, records: candidates.length, missing, absent, score };
  }

  function auditData() {
    captureData();
    const visible = currentRecords();
    const direct = runtime.baseRecords.filter(record => !record.virtual && !record.normalizedFromPlan);
    const derived = runtime.baseRecords.filter(record => record.virtual || record.normalizedFromPlan);
    const canonical = direct.filter(record => record.scopeKey === "ZONAL:CZ5");
    const scoped = direct.filter(record => record.scopeKey && record.scopeKey !== "ZONAL:CZ5");
    const other = visible.filter(record => record.entityType === "other");
    const normalization = appState()?.data?.normalization || {};
    return {
      visible,
      direct,
      derived,
      canonical,
      scoped,
      other,
      hidden: Math.max(runtime.baseRecords.length - visible.length, 0),
      normalization,
      stages: STAGES.map(stage => analyzeStage(stage, visible))
    };
  }

  function viewBar() {
    const modes = [
      ["principal", "Administrador principal"], ["zonal", "Coordinación Zonal 5"],
      ["provincial", "Provincia"], ["cantonal", "Cantón"],
      ["institucion", "Institución"], ["unidad", "COE / MTT"]
    ];
    const options = perspectiveOptions(runtime.mode);
    const label = runtime.mode === "cantonal" ? "Territorio" : runtime.mode === "unidad" ? "Unidad / mesa" : "Contexto";
    return `<section id="sr10ViewBar" class="sr10-viewbar">
      <div><span class="sr10-crown">AP</span><div><b>Administrador principal</b><small>Consulta completa y simulación de vistas sin cambiar permisos ni datos.</small></div></div>
      <label>Vista<select id="sr10Mode">${modes.map(([value, text]) => `<option value="${value}" ${runtime.mode === value ? "selected" : ""}>${text}</option>`).join("")}</select></label>
      <label class="${options.length ? "" : "hidden"}">${label}<select id="sr10Context"><option value="">Seleccionar</option>${options.map(value => `<option value="${esc(value)}" ${runtime.value === value ? "selected" : ""}>${esc(runtime.mode === "cantonal" ? value.replace("||", " · ") : value)}</option>`).join("")}</select></label>
      <button type="button" data-sr10-audit>Auditoría de datos y brechas</button>
    </section>`;
  }

  function compactAudit(audit) {
    const average = Math.round(audit.stages.reduce((sum, stage) => sum + stage.score, 0) / audit.stages.length);
    return `<section id="sr10AuditSummary" class="sr-card sr10-audit-summary">
      <header><div><h2>Auditoría de cobertura y brechas</h2><p>Compara registros consolidados, derivados por RC9 y campos mínimos de las seis etapas.</p></div><button type="button" data-sr10-audit>Ver auditoría completa</button></header>
      <div class="sr10-audit-kpis">
        <article><small>Registros consolidados</small><b>${audit.direct.length}</b><span>${audit.canonical.length} zonales · ${audit.scoped.length} por alcance</span></article>
        <article><small>Derivados de planes</small><b>${audit.derived.length}</b><span>${audit.normalization.structuredPlans || 0} planes estructurados</span></article>
        <article><small>Visibles en esta vista</small><b>${audit.visible.length}</b><span>${audit.hidden} fuera del filtro actual</span></article>
        <article><small>Sin clasificación</small><b>${audit.other.length}</b><span>Requieren revisión semántica</span></article>
        <article><small>Cobertura del flujo</small><b>${average}%</b><span>Promedio de las 6 etapas</span></article>
      </div>
      <div class="sr10-stage-strip">${audit.stages.map(stage => `<button type="button" data-sr10-stage="${stage.id}"><i style="--score:${stage.score}%"></i><span>${stage.n}</span><div><b>${esc(stage.title)}</b><small>${stage.records} registros · ${stage.absent} campos faltantes</small></div><strong>${stage.score}%</strong></button>`).join("")}</div>
    </section>`;
  }

  function auditDrawer(audit, focus = "") {
    $("#sr10AuditDrawer")?.remove();
    const aside = document.createElement("aside");
    aside.id = "sr10AuditDrawer";
    aside.className = "sr10-drawer";
    aside.innerHTML = `<header><div><small>Administrador principal · RC10</small><h2>Auditoría de información y brechas</h2><p>${esc(appState()?.profileContext?.scopeLabel || "Coordinación Zonal 5")}</p></div><button type="button" data-sr10-close>×</button></header>
      <section class="sr10-reconciliation"><h3>Conciliación de información</h3><div>
        <article><b>${audit.direct.length}</b><span>registros consolidados leídos</span></article>
        <article><b>${audit.derived.length}</b><span>registros virtuales derivados de planes</span></article>
        <article><b>${audit.visible.length}</b><span>registros visibles en la perspectiva actual</span></article>
        <article><b>${audit.hidden}</b><span>registros fuera de filtros o perspectiva</span></article>
        <article><b>${audit.other.length}</b><span>registros sin clasificación operativa</span></article>
      </div><p>Los totales son posteriores a la consolidación y eliminación de duplicados; RC10 no escribe en Firestore.</p></section>
      <section class="sr10-stage-list">${audit.stages.map(stage => `<article id="sr10-${stage.id}" class="${focus === stage.id ? "focus" : ""}">
        <header><span>${stage.n}</span><div><h3>${esc(stage.title)}</h3><small>${stage.records} registros analizados</small></div><strong>${stage.score}%</strong></header>
        <div class="sr10-progress"><i style="width:${stage.score}%"></i></div>
        ${stage.records ? `<ul>${stage.missing.map(item => `<li class="${item.count ? "gap" : "ok"}"><b>${esc(item.label)}</b><span>${item.count ? `${item.count} registro(s) incompleto(s)` : "Completo en los registros visibles"}</span></li>`).join("")}</ul>` : `<p class="sr10-no-records">No existen registros clasificados para esta etapa en la perspectiva actual.</p>`}
        <footer><p><b>Sugerencia:</b> ${esc(stage.suggestion)}</p><button type="button" data-sr10-route="${stage.route}">Abrir módulo relacionado</button></footer>
      </article>`).join("")}</section>`;
    document.body.appendChild(aside);
    requestAnimationFrame(() => aside.classList.add("open"));
    if (focus) setTimeout(() => $("#sr10-" + focus)?.scrollIntoView({ behavior: "smooth", block: "start" }), 100);
  }

  function enhance() {
    if (!isPrincipal()) return;
    captureData();
    updateIdentity();
    const header = $("#srHeader");
    if (header && !$("#sr10ViewBar")) header.insertAdjacentHTML("beforeend", viewBar());
    const role = $(".sr-user-card small");
    if (role && runtime.mode === "principal") role.textContent = "Administrador principal";

    const state = appState();
    if (["inicio", "dashboard", "herramientas"].includes(state?.route) && $("#content") && !$("#sr10AuditSummary")) {
      $("#content").insertAdjacentHTML("beforeend", compactAudit(auditData()));
    }
  }

  function bindEvents() {
    if (runtime.bound) return;
    runtime.bound = true;
    document.addEventListener("change", event => {
      if (event.target.id === "sr10Mode") {
        const options = perspectiveOptions(event.target.value);
        applyPerspective(event.target.value, options[0] || "");
      }
      if (event.target.id === "sr10Context") applyPerspective(runtime.mode, event.target.value);
    });
    document.addEventListener("click", event => {
      if (event.target.closest("[data-sr10-audit]")) auditDrawer(auditData());
      const stage = event.target.closest("[data-sr10-stage]");
      if (stage) auditDrawer(auditData(), stage.dataset.sr10Stage);
      const route = event.target.closest("[data-sr10-route]");
      if (route) { $("#sr10AuditDrawer")?.remove(); location.hash = `#/${route.dataset.sr10Route}`; }
      if (event.target.closest("[data-sr10-close]")) $("#sr10AuditDrawer")?.remove();
    });
  }

  function afterAppStart() {
    if (!isPrincipal()) return;
    captureData();
    updateIdentity();
    bindEvents();
    try {
      const saved = JSON.parse(localStorage.getItem("smartrisk.rc10.view") || "{}");
      runtime.mode = saved.mode || "principal";
      runtime.value = saved.value || "";
    } catch {}
    applyPerspective(runtime.mode, runtime.value, true);
    runtime.observer = new MutationObserver(() => requestAnimationFrame(enhance));
    runtime.observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(enhance, 0);
  }

  window.SmartRiskV11AdminRC10 = { VERSION, PRINCIPAL_EMAIL, STAGES, afterAppStart, audit: auditData, applyPerspective };
})();
