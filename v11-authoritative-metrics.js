(() => {
  "use strict";

  const OFFICIAL = Object.freeze({
    "guayas|daule": Object.freeze({
      sites: 3,
      siteMentions: 21,
      actions: 11,
      followups: 2,
      homologatedFollowups: 0,
      pendingActions: 9,
      solvedGaps: 0,
      budget: "No cuantificado",
      cut: "Informe técnico conciliado ENOS 2026–2027",
      sitesList: Object.freeze([
        Object.freeze({ name: "Bella Esperanza", type: "Sitio crítico", threat: "Inundación", priority: "Alta", status: "Priorizado", detail: "Unidad Educativa y entorno expuesto identificados en la conciliación técnica del Plan ENOS de Daule." }),
        Object.freeze({ name: "Boca de las Piñas", type: "Sitio crítico", threat: "Inundación", priority: "Crítica", status: "Priorizado", detail: "Unidad Educativa y sector expuesto identificados en la conciliación técnica del Plan ENOS de Daule." }),
        Object.freeze({ name: "Río Pula", type: "Tramo crítico", threat: "Inundación y socavamiento", priority: "Alta", status: "Priorizado", detail: "Tramo fluvial relacionado con acciones de limpieza, desazolve y reducción del riesgo." })
      ]),
      actionsList: Object.freeze([
        "Actualizar puntos críticos, zonas inundables y elementos expuestos.",
        "Ejecutar limpieza de canales, drenajes y sumideros priorizados.",
        "Gestionar la nueva estructura del puente Bella Esperanza–Boca de las Piñas.",
        "Implementar medidas de protección para el Centro de Salud Tipo A Guarumal.",
        "Formalizar, validar y señalizar rutas de evacuación comunitarias.",
        "Verificar alojamientos temporales, capacidades y brechas.",
        "Coordinar capacitaciones comunitarias con Cruz Roja del Guayas.",
        "Aplicar EVIN y activar asistencia humanitaria según necesidad.",
        "Evaluar daños y priorizar la rehabilitación de vías, puentes y servicios.",
        "Fortalecer el monitoreo, los umbrales y el flujo de información oficial.",
        "Implementar comunicación del riesgo y continuidad educativa en sectores priorizados."
      ]),
      planUrl: "https://drive.google.com/file/d/1azf3vR1zhlpXpcgX0ag64xGTZuhWevYy/view"
    })
  });

  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  const selectedRecord = () => {
    const level = document.querySelector("#sr16Level")?.value;
    if (level !== "canton") return null;
    const province = normalize(document.querySelector("#sr16Province")?.value);
    const canton = normalize(document.querySelector("#sr16Canton")?.value);
    return OFFICIAL[`${province}|${canton}`] || null;
  };

  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[character]);

  function showModule() {
    document.querySelectorAll("[data-sr16-view]").forEach(view => view.classList.toggle("active", view.dataset.sr16View === "modulo"));
    document.querySelectorAll(".sr16-bottom button").forEach(button => button.classList.remove("active"));
  }

  function renderSitesList(record) {
    const module = document.querySelector("#sr16Module");
    if (!module) return;
    module.innerHTML = `<div class="sr16-module-head"><button data-daule-sites-back>←</button><div><h1>Sitios y riesgos</h1><p>Amenazas, exposición y puntos críticos · Sitios priorizados</p></div></div><section class="sr16-module-summary"><article><small>Registros filtrados</small><b>${record.sitesList.length}</b></article><article><small>Activos o pendientes</small><b>${record.sitesList.length}</b></article><article><small>Con respaldo documental</small><b>${record.sitesList.length}</b></article></section><div class="sr16-module-list">${record.sitesList.map((site, index) => `<button class="sr16-record" data-daule-site="${index}"><span>!</span><div><b>${escapeHtml(site.name)}</b><small>Daule · Guayas · ${escapeHtml(site.threat)}</small></div><em>${escapeHtml(site.priority)}</em></button>`).join("")}</div>`;
    showModule();
  }

  function renderSiteDetail(record, index) {
    const site = record.sitesList[index];
    const module = document.querySelector("#sr16Module");
    if (!site || !module) return;
    const fields = [["Estado", site.status], ["Territorio", "Daule · Guayas"], ["Tipo", site.type], ["Amenaza", site.threat], ["Prioridad", site.priority], ["Fuente", record.cut], ["Detalle", site.detail]];
    module.innerHTML = `<div class="sr16-module-head"><button data-daule-sites-list>←</button><div><h1>${escapeHtml(site.name)}</h1><p>Ficha individual con trazabilidad</p></div></div><div class="sr16-record-detail">${fields.map(([label, value]) => `<div><small>${label}</small><b>${escapeHtml(value)}</b></div>`).join("")}</div><div class="sr16-module-actions"><button class="secondary" data-daule-sites-list>Volver al listado</button></div>`;
  }

  let returnView = "territorio";

  function authoritativeRecords(record, route, filter) {
    const base = { territory: "Daule · Guayas", source: record.cut };
    if (route === "riesgos" || route === "mapas") return record.sitesList.map((site, index) => ({
      ...base, title: site.name, status: site.status, evidence: "Plan ENOS · páginas 3 y 5", detail: site.detail,
      fields: [["Código", `DAU-SIT-${String(index + 1).padStart(2, "0")}`], ["Tipo", site.type], ["Amenaza", site.threat], ["Prioridad", site.priority], ["Estado", site.status]]
    }));
    if (route === "acciones") return record.actionsList.map((title, index) => ({
      ...base, title, status: index < record.pendingActions ? "Sin seguimiento" : "F07 preliminar", evidence: index < record.pendingActions ? "Plan ENOS" : "F07 preliminar sin homologar", detail: "Acción priorizada del Plan ENOS 2026–2027 del GAD Municipal de Daule.",
      fields: [["Código", `DAU-ACC-${String(index + 1).padStart(2, "0")}`], ["Estado", index < record.pendingActions ? "Pendiente de seguimiento" : "Evidencia preliminar"], ["Presupuesto", record.budget], ["Vinculación", "Pendiente de codificación sitio–acción"]]
    }));
    if (route === "dashboard") return record.actionsList.slice(0, record.pendingActions).map((title, index) => ({
      ...base, title: `Brecha ${index + 1}: acción sin seguimiento`, status: "Activa", evidence: "Plan ENOS", detail: title,
      fields: [["Acción relacionada", title], ["Brecha", "No registra seguimiento homologado"], ["Estado", "Activa"], ["Próximo control", "Solicitar actualización F07 y verificable"]]
    }));
    if (route === "documentos") {
      if (filter === "evidencias") return [1, 2].map(number => ({ ...base, title: `F07 preliminar ${number}`, status: "Sin homologar", evidence: "Registro Kobo conservado", detail: "Evidencia preliminar pendiente de vinculación a código de sitio y acción.", fields: [["Tipo", "Seguimiento F07"], ["Estado", "Pendiente de homologación"], ["Validez para avance", "Aún no computable"]] }));
      return [{ ...base, title: "Plan de Acción ENOS 2026–2027 – Daule", status: "Oficial", evidence: "Documento firmado", detail: "Plan territorial oficial utilizado como fuente primaria de la conciliación.", url: record.planUrl, fields: [["Código", "GADDAULE-ENOS-2026-001"], ["Fecha", "22 de junio de 2026"], ["Responsable técnico", "Stalin Quiñónez Arreaga"], ["Extensión", "17 páginas"], ["Estado", "Oficial"]] }];
    }
    if (route === "reportes") return [{ ...base, title: "Informe técnico conciliado ENOS Daule", status: "Validado para tablero", evidence: "Revisión Plan–formularios–SmartRisk", detail: "Consolida 3 sitios, 11 acciones, presupuesto no cuantificado y 2 F07 preliminares.", fields: [["Sitios priorizados", "3"], ["Acciones", "11"], ["Brechas activas", "9"], ["F07 preliminares", "2"], ["Presupuesto", record.budget]] }];
    if (route === "herramientas") return [
      { ...base, title: "Conciliación de sitios", status: "Aplicada", evidence: "Informe técnico", detail: "Las 21 menciones documentales fueron depuradas a 3 sitios prioritarios." },
      { ...base, title: "Conciliación de acciones", status: "Aplicada", evidence: "Matriz del plan", detail: "Las 33 propuestas automáticas fueron reemplazadas por 11 acciones priorizadas." },
      { ...base, title: "Control de seguimientos", status: "Pendiente", evidence: "2 F07 preliminares", detail: "Los F07 deben homologarse a sitio y acción antes de computar avance." }
    ];
    return [];
  }

  function showView(name) {
    document.querySelectorAll("[data-sr16-view]").forEach(view => view.classList.toggle("active", view.dataset.sr16View === name));
    document.querySelectorAll(".sr16-bottom button").forEach(button => button.classList.toggle("active", button.dataset.sr16Tab === name));
  }

  function renderAuthoritativeList(record, route, filter, sourceButton) {
    const records = authoritativeRecords(record, route, filter);
    const titles = { riesgos: "Sitios y riesgos", acciones: "Acciones", dashboard: "Brechas territoriales", documentos: "Planes y fuentes", reportes: "Reportes", mapas: "Cartografía", herramientas: "Auditoría" };
    const subtitles = { riesgos: "Amenazas, exposición y puntos críticos", acciones: "Ejecución, evidencia y seguimiento", dashboard: "Activas, solventadas y pendientes de validación", documentos: "Documentos originales, revisión y evidencia", reportes: "Productos oficiales y verificables", mapas: "Sitios, capas y trabajo de campo", herramientas: "Calidad, trazabilidad y controles" };
    const current = document.querySelector("[data-sr16-view].active")?.dataset.sr16View;
    if (current && current !== "modulo") returnView = current;
    const module = document.querySelector("#sr16Module");
    if (!module) return;
    const active = records.filter(item => !/oficial|aplicada|validado/i.test(item.status)).length;
    const withEvidence = records.filter(item => item.evidence).length;
    module.innerHTML = `<div class="sr16-module-head"><button data-authoritative-back>←</button><div><h1>${titles[route]}</h1><p>${subtitles[route]} · ${escapeHtml(sourceButton?.textContent?.trim() || filter)}</p></div></div><section class="sr16-module-summary"><article><small>Registros filtrados</small><b>${records.length}</b></article><article><small>Activos o pendientes</small><b>${active}</b></article><article><small>Con respaldo</small><b>${withEvidence}</b></article></section><div class="sr16-module-list">${records.map((item, index) => `<button class="sr16-record" data-authoritative-record="${index}" data-authoritative-route="${route}" data-authoritative-filter="${filter}"><span>!</span><div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.territory)} · ${escapeHtml(item.evidence)}</small></div><em>${escapeHtml(item.status)}</em></button>`).join("")}</div>${route === "mapas" ? `<div class="sr16-module-actions"><a href="https://ee.kobotoolbox.org/x/aEcQSdRP" target="_blank" rel="noopener">Nuevo sitio ↗</a><a class="secondary" href="https://ee.kobotoolbox.org/x/0pXtskTZ" target="_blank" rel="noopener">Actualizar acción ↗</a></div>` : ""}`;
    showModule();
  }

  function renderAuthoritativeDetail(record, route, filter, index) {
    const item = authoritativeRecords(record, route, filter)[index];
    const module = document.querySelector("#sr16Module");
    if (!item || !module) return;
    const fields = [["Estado", item.status], ["Territorio", item.territory], ["Fuente", item.source], ...(item.fields || []), ["Detalle", item.detail]];
    module.innerHTML = `<div class="sr16-module-head"><button data-authoritative-list="${route}|${filter}">←</button><div><h1>${escapeHtml(item.title)}</h1><p>Ficha individual con trazabilidad</p></div></div><div class="sr16-record-detail">${fields.map(([label, value]) => `<div><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b></div>`).join("")}</div>${item.url ? `<div class="sr16-module-actions"><a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Abrir documento original ↗</a><button class="secondary" data-authoritative-list="${route}|${filter}">Volver al listado</button></div>` : `<div class="sr16-module-actions"><button class="secondary" data-authoritative-list="${route}|${filter}">Volver al listado</button></div>`}`;
  }

  function bindSitesDetail() {
    document.addEventListener("click", event => {
      const record = selectedRecord();
      if (!record) return;
      const full = event.target.closest("[data-sr16-full]");
      const supported = new Set(["riesgos", "acciones", "dashboard", "documentos", "reportes", "mapas", "herramientas"]);
      const site = event.target.closest("[data-daule-site]");
      const list = event.target.closest("[data-daule-sites-list]");
      const back = event.target.closest("[data-daule-sites-back]");
      const authoritative = event.target.closest("[data-authoritative-record]");
      const authoritativeList = event.target.closest("[data-authoritative-list]");
      const authoritativeBack = event.target.closest("[data-authoritative-back]");
      if (full && supported.has(full.dataset.sr16Full)) {
        event.preventDefault();
        event.stopImmediatePropagation();
        renderAuthoritativeList(record, full.dataset.sr16Full, full.dataset.sr16Filter || "todos", full);
      } else if (authoritative) {
        event.preventDefault();
        event.stopImmediatePropagation();
        renderAuthoritativeDetail(record, authoritative.dataset.authoritativeRoute, authoritative.dataset.authoritativeFilter, Number(authoritative.dataset.authoritativeRecord));
      } else if (authoritativeList) {
        event.preventDefault();
        event.stopImmediatePropagation();
        const [route, filter] = authoritativeList.dataset.authoritativeList.split("|");
        renderAuthoritativeList(record, route, filter, null);
      } else if (authoritativeBack) {
        event.preventDefault();
        event.stopImmediatePropagation();
        showView(returnView);
      } else if (site) {
        event.preventDefault();
        event.stopImmediatePropagation();
        renderSiteDetail(record, Number(site.dataset.dauleSite));
      } else if (list) {
        event.preventDefault();
        event.stopImmediatePropagation();
        renderSitesList(record);
      } else if (back) {
        event.preventDefault();
        event.stopImmediatePropagation();
        document.querySelector('[data-sr16-tab="inicio"]')?.click();
      }
    }, true);
  }

  function render() {
    const record = selectedRecord();
    if (!record) return;

    setText("#sr16Sites", record.sites);
    setText("#sr16SitesDetail", `${record.sites} sitios priorizados · ${record.siteMentions} menciones documentales depuradas`);
    setText("#sr16Actions", record.actions);
    setText("#sr16ActionsDetail", `${record.actions} acciones del plan · ${record.followups} F07 preliminares · ${record.homologatedFollowups} homologados`);
    setText("#sr16Budget", record.budget);
    setText("#sr16Gaps", "100% / 0%");
    setText("#sr16GapsDetail", `${record.pendingActions} sin seguimiento · ${record.solvedGaps} solventadas`);
    setText("#sr16GapTitle", `${record.pendingActions} brechas activas · ${record.solvedGaps} solventadas`);
    setText("#sr16GapDetail", `${record.followups} F07 conservados como evidencia preliminar; aún no homologados a sitio y acción.`);

    const active = document.querySelector("#sr16GapActive");
    const solved = document.querySelector("#sr16GapSolved");
    if (active) active.style.width = "100%";
    if (solved) solved.style.width = "0%";

    const source = document.querySelector("#sr16Source");
    if (source) source.innerHTML = `<b>Origen:</b> ${record.cut}. ${record.sites} sitios prioritarios · ${record.actions} acciones · presupuesto ${record.budget.toLowerCase()} · ${record.followups} F07 preliminares sin homologar.`;
  }

  function afterAppStart() {
    const scope = document.querySelector("#sr16Scope");
    if (!scope) return;
    render();
    new MutationObserver(render).observe(scope, { childList: true, subtree: true, characterData: true });
    document.querySelector("#sr16Level")?.addEventListener("change", () => queueMicrotask(render));
    document.querySelector("#sr16Province")?.addEventListener("change", () => queueMicrotask(render));
    document.querySelector("#sr16Canton")?.addEventListener("change", () => queueMicrotask(render));
    bindSitesDetail();
  }

  window.SmartRiskAuthoritativeMetrics = { afterAppStart, render, records: OFFICIAL };
})();
