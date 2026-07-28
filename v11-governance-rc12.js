(() => {
  "use strict";

  const VERSION = "11.0.0-rc12";
  const ROUTE_ID = "documentos";
  const ROUTE = {
    id: ROUTE_ID,
    title: "Fuentes y documentos",
    subtitle: "Trazabilidad, vigencia, evidencia y soporte de las decisiones",
    icon: "reports",
    group: "Coordinación y productos"
  };
  const FLOW = [
    { id: "documentos", label: "Gestión documental", detail: "Fuentes y evidencias", route: "documentos" },
    { id: "monitoreo", label: "Monitoreo", detail: "Registro y verificación", route: "monitoreo" },
    { id: "analisis", label: "Análisis", detail: "Escenario y prioridad", route: "inteligencia" },
    { id: "respuesta", label: "Respuesta", detail: "Decisión y coordinación", route: "respuesta-coe" },
    { id: "acciones", label: "Acciones", detail: "Ejecución y seguimiento", route: "acciones" },
    { id: "cierre", label: "Verificación", detail: "Cierre y aprendizaje", route: "reportes" }
  ];
  const TRANSVERSAL_ROUTES = new Set(["documentos", "monitoreo", "inteligencia", "respuesta-coe", "acciones", "reportes", "inicio", "dashboard"]);
  const runtime = { bound: false, observer: null, rendering: false, query: "", status: "" };
  const $ = (selector, root = document) => root.querySelector(selector);
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const state = () => window.SmartRiskV11App?.state || {};
  const records = () => state()?.data?.records || [];
  const valueAt = (record, paths) => {
    for (const path of paths) {
      const value = path.split(".").reduce((item, key) => item == null ? null : item[key], record);
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return "";
  };
  const textOf = record => {
    let payload = "";
    try { payload = JSON.stringify(record?.payload || {}); } catch {}
    return normalize([record?.title, record?.detail, record?.tipo, record?.evento, record?.institucion, record?.provincia, record?.canton, payload].join(" "));
  };
  const dateLabel = value => {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("es-EC", { year: "numeric", month: "short", day: "2-digit" });
  };

  function registerRoute() {
    const router = window.SmartRiskV11Router;
    if (router && !router.routes.some(route => route.id === ROUTE_ID)) {
      const reportsIndex = router.routes.findIndex(route => route.id === "reportes");
      router.routes.splice(reportsIndex >= 0 ? reportsIndex : router.routes.length, 0, ROUTE);
      Object.assign(router.aliases, { documentos: ROUTE_ID, fuentes: ROUTE_ID, evidencia: ROUTE_ID });
    }
    const modules = window.SmartRiskV11Permissions?.UNIVERSAL_MODULES;
    if (Array.isArray(modules) && !modules.includes(ROUTE_ID)) modules.push(ROUTE_ID);
  }

  function canonical(record) {
    const source = valueAt(record, ["payload.fuente", "payload.source", "institucion", "responsable"]);
    const updated = valueAt(record, ["updatedAt", "createdAt", "payload.fecha", "payload.fechaInforme"]);
    const evidence = valueAt(record, ["payload.evidencia", "payload.archivo", "payload.archivos", "payload.url", "payload.adjuntos"]);
    const responsible = valueAt(record, ["responsable", "payload.responsable", "institucion"]);
    const status = valueAt(record, ["estado", "payload.estado", "payload.vigencia"]) || "Por revisar";
    const next = valueAt(record, ["payload.proximoControl", "payload.fechaRevision", "payload.fechaLimite", "payload.plazo"]);
    return {
      id: record.id || record.sourceId || "",
      title: record.title || record.detail || "Documento sin título",
      type: record.tipo || record.entityType || "Documento",
      province: record.provincia || "",
      canton: record.canton || "",
      source: source || "Fuente no registrada",
      updated,
      evidence,
      responsible: responsible || "Sin responsable",
      status,
      next: next || "No definido",
      record
    };
  }

  function documentRecords() {
    const signals = /informe|reporte|acta|plan|protocolo|mapa|cartograf|archivo|document|evidencia|bitacora|resolucion|evaluacion|inspeccion/;
    return records().filter(record => signals.test(textOf(record)) || ["monitoringReports", "reports", "plans", "decisions", "validations"].includes(record.entityType)).map(canonical);
  }

  function quality() {
    const all = records().map(canonical);
    const count = predicate => all.filter(predicate).length;
    return {
      total: all.length,
      source: count(item => item.source !== "Fuente no registrada"),
      responsible: count(item => item.responsible !== "Sin responsable"),
      evidence: count(item => Boolean(item.evidence)),
      next: count(item => item.next !== "No definido")
    };
  }

  function monitorStrip(route = state()?.route) {
    const q = quality();
    const selected = FLOW.find(item => item.route === route) || FLOW[1];
    const latest = records().map(item => valueAt(item, ["updatedAt", "createdAt", "payload.fecha"])).filter(Boolean).sort().at(-1);
    return `<section class="sr12-monitor-strip" data-sr12-strip>
      <div class="sr12-monitor-title"><span></span><div><b>Monitoreo transversal</b><small>${esc(selected.label)} · ${esc(selected.detail)}</small></div></div>
      <dl>
        <div><dt>Estado</dt><dd>Solo lectura</dd></div>
        <div><dt>Responsables</dt><dd>${q.responsible}/${q.total || 0}</dd></div>
        <div><dt>Última actualización</dt><dd>${esc(dateLabel(latest))}</dd></div>
        <div><dt>Fuentes identificadas</dt><dd>${q.source}/${q.total || 0}</dd></div>
        <div><dt>Con evidencia</dt><dd>${q.evidence}/${q.total || 0}</dd></div>
        <div><dt>Próximo control</dt><dd>${q.next}/${q.total || 0} definidos</dd></div>
      </dl>
    </section>`;
  }

  function cycle() {
    return `<section class="sr12-cycle" data-sr12-cycle><header><div><small>Arquitectura operativa</small><h2>Información que se convierte en decisión verificable</h2></div><span>Monitoreo en todo el ciclo</span></header><div class="sr12-cycle-flow">${FLOW.map((item, index) => `<button type="button" data-sr12-route="${item.route}"><i>${index + 1}</i><b>${esc(item.label)}</b><small>${esc(item.detail)}</small></button>`).join("")}</div><footer>Los reportes son productos del ciclo; no sustituyen la fuente documental ni la evidencia de ejecución.</footer></section>`;
  }

  function visibleDocuments() {
    const query = normalize(runtime.query);
    const status = normalize(runtime.status);
    return documentRecords().filter(item => {
      const queryOk = !query || normalize([item.title, item.type, item.source, item.province, item.canton].join(" ")).includes(query);
      const statusOk = !status || normalize(item.status).includes(status);
      return queryOk && statusOk;
    });
  }

  function renderDocuments() {
    const content = $("#content");
    if (!content || state()?.route !== ROUTE_ID || runtime.rendering) return;
    runtime.rendering = true;
    const docs = visibleDocuments();
    const all = documentRecords();
    const withEvidence = all.filter(item => item.evidence).length;
    const withSource = all.filter(item => item.source !== "Fuente no registrada").length;
    const pending = all.filter(item => /pend|revis|borrador|falt/.test(normalize(item.status))).length;
    content.innerHTML = `${monitorStrip(ROUTE_ID)}
      <section class="sr12-doc-hero"><div><span>BASE DOCUMENTAL · RC12</span><h2>Fuentes y documentos</h2><p>Repositorio lógico de documentos ya visibles en SmartRisk. Diferencia fuente, evidencia, producto analítico y decisión; no crea copias ni escribe en Firestore.</p></div><button type="button" data-sr12-route="inteligencia">Abrir análisis territorial</button></section>
      <section class="sr12-doc-kpis"><article><small>Documentos identificados</small><b>${all.length}</b><span>Registros con señal documental</span></article><article><small>Fuente identificada</small><b>${withSource}</b><span>${all.length ? Math.round(withSource / all.length * 100) : 0}% del inventario</span></article><article><small>Con evidencia</small><b>${withEvidence}</b><span>Archivo, URL o adjunto registrado</span></article><article><small>Por revisar</small><b>${pending}</b><span>Estado pendiente o incompleto</span></article></section>
      ${cycle()}
      <section class="sr12-doc-controls"><label>Buscar<input id="sr12DocQuery" type="search" value="${esc(runtime.query)}" placeholder="Título, fuente, cantón o tipo"></label><label>Estado<select id="sr12DocStatus"><option value="">Todos</option><option value="pend" ${runtime.status === "pend" ? "selected" : ""}>Pendientes</option><option value="activ" ${runtime.status === "activ" ? "selected" : ""}>Activos</option><option value="cerr" ${runtime.status === "cerr" ? "selected" : ""}>Cerrados</option></select></label><button type="button" data-sr12-clear>Limpiar filtros</button></section>
      <section class="sr12-doc-table"><header><div><h2>Inventario documental</h2><p>${docs.length} de ${all.length} elementos visibles</p></div><span>Solo lectura</span></header>
        ${docs.length ? `<div class="sr12-doc-rows">${docs.slice(0, 80).map(item => `<article><div class="sr12-doc-kind">${esc(String(item.type).slice(0, 2).toUpperCase())}</div><div class="sr12-doc-name"><b>${esc(item.title)}</b><small>${esc([item.canton, item.province].filter(Boolean).join(" · ") || "Sin territorio")}</small></div><div><small>Fuente</small><b>${esc(item.source)}</b></div><div><small>Responsable</small><b>${esc(item.responsible)}</b></div><div><small>Actualización</small><b>${esc(dateLabel(item.updated))}</b></div><div><small>Evidencia</small><b class="${item.evidence ? "ok" : "gap"}">${item.evidence ? "Registrada" : "Faltante"}</b></div><div><small>Próximo control</small><b>${esc(item.next)}</b></div><span class="sr12-status">${esc(item.status)}</span></article>`).join("")}</div>` : `<div class="sr12-empty"><b>Sin documentos para este filtro</b><p>La ausencia de resultados no significa ausencia institucional; revise clasificación, fuentes y permisos.</p></div>`}
      </section>`;
    runtime.rendering = false;
  }

  function enhance() {
    registerRoute();
    const route = state()?.route;
    const content = $("#content");
    if (!content) return;
    if (route === ROUTE_ID) {
      renderDocuments();
      return;
    }
    if (TRANSVERSAL_ROUTES.has(route) && !content.querySelector("[data-sr12-strip]")) content.insertAdjacentHTML("afterbegin", monitorStrip(route));
    if (["inicio", "dashboard"].includes(route) && !content.querySelector("[data-sr12-cycle]")) {
      const anchor = content.querySelector(".sr-dashboard-hero, .sr-dashboard-summary, section");
      if (anchor) anchor.insertAdjacentHTML("afterend", cycle());
      else content.insertAdjacentHTML("beforeend", cycle());
    }
  }

  function bindEvents() {
    if (runtime.bound) return;
    runtime.bound = true;
    document.addEventListener("click", event => {
      const route = event.target.closest("[data-sr12-route]");
      if (route) location.hash = `#/${route.dataset.sr12Route}`;
      if (event.target.closest("[data-sr12-clear]")) {
        runtime.query = "";
        runtime.status = "";
        renderDocuments();
      }
    });
    document.addEventListener("input", event => {
      if (event.target.id === "sr12DocQuery") {
        runtime.query = event.target.value;
        clearTimeout(runtime.searchTimer);
        runtime.searchTimer = setTimeout(renderDocuments, 180);
      }
    });
    document.addEventListener("change", event => {
      if (event.target.id === "sr12DocStatus") {
        runtime.status = event.target.value;
        renderDocuments();
      }
    });
  }

  function afterAppStart() {
    registerRoute();
    bindEvents();
    runtime.observer = new MutationObserver(() => requestAnimationFrame(enhance));
    runtime.observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      if (normalize(location.hash).includes("documentos")) window.SmartRiskV11App?.render?.(location.hash);
      enhance();
    }, 0);
  }

  registerRoute();
  window.SmartRiskV11GovernanceRC12 = { VERSION, ROUTE, FLOW, afterAppStart, renderDocuments, quality };
})();
