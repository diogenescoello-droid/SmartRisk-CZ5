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

  const uniqueBy = (items, key) => [...new Map(items.map(item => [normalize(key(item)), item])).values()];
  const isClosed = value => /cumpl|cerrad|finaliz|complet/.test(normalize(value));
  const isUsefulSite = value => value && !/no encuentro|pendiente|sin sitio|no aplica/.test(normalize(value));

  const selectedRecord = () => {
    const baseline = window.SMART_RISK_PILOT_BASELINE;
    if (!baseline) return null;
    const level = document.querySelector("#sr16Level")?.value || "canton";
    const provinceValue = document.querySelector("#sr16Province")?.value || "";
    const cantonValue = document.querySelector("#sr16Canton")?.value || "";
    const province = normalize(provinceValue);
    const canton = normalize(cantonValue);
    const official = level === "canton" ? OFFICIAL[`${province}|${canton}`] : null;
    const reviews = (window.ENOS_REVIEWS?.reviews || []).filter(item => level === "zona" || (normalize(item.province) === province && (level === "provincia" || normalize(item.territory) === canton)));
    const inScope = item => level === "zona" || (normalize(item.province) === province && (level === "provincia" || normalize(item.canton || item.shortName) === canton));
    const entities = baseline.entities.filter(entity => level === "zona" || (normalize(entity.province) === province && (level === "provincia" || normalize(entity.shortName) === canton)));
    const entityIds = new Set(entities.map(entity => entity.entityId));
    const scoped = item => entityIds.has(item.entityId) || inScope(item);
    const followups = baseline.followups.filter(scoped);
    const forms = baseline.forms.filter(scoped);
    const emails = baseline.emailRecords.filter(scoped);
    const sites = uniqueBy(followups.filter(item => isUsefulSite(item.siteReference)), item => item.siteReference);
    const actions = uniqueBy(followups.filter(item => item.actionTitle), item => `${item.actionTitle}|${item.entityId}`);
    const territory = level === "zona" ? "Zona 5" : level === "provincia" ? `Provincia ${provinceValue}` : `${cantonValue} · ${provinceValue}`;
    return {
      level, province: provinceValue, canton: cantonValue, territory, entities, followups, forms, emails, reviews,
      sites, actions, official,
      cut: `Línea base F07 · corte ${baseline.config.cutDate}`,
      active: followups.filter(item => !isClosed(item.status)).length,
      solved: followups.filter(item => isClosed(item.status)).length,
      evidence: followups.filter(item => item.evidenceUrl || item.evidenceFile).length
    };
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
    const base = { territory: record.territory, source: record.cut };
    if (route === "dashboard" && filter === "revision") return record.reviews.flatMap(review => (review.criteria || []).map(criterion => ({
      ...base,
      title: criterion.name,
      status: criterion.status,
      evidence: `${criterion.evidence?.length || 0} respaldo(s) del plan`,
      detail: criterion.newAction || `Resultado de la revisión técnica: ${criterion.status}.`,
      fields: [
        ["Territorio revisado", `${review.territory} · ${review.province}`],
        ["Calificación del criterio", `${criterion.score}%`],
        ["Resultado", criterion.status],
        ["Páginas de respaldo", (criterion.evidence || []).map(item => item.page).join(", ") || "No identificadas"],
        ["Hallazgo / acción recomendada", criterion.newAction || "No genera acción correctiva"],
        ["Estado de la revisión", review.status]
      ]
    })));
    if (record.official) {
      const official = record.official;
      if (route === "riesgos" || route === "mapas") return official.sitesList.map((site, index) => ({
        ...base, title: site.name, status: site.status, evidence: "Plan ENOS · páginas 3 y 5", detail: site.detail,
        fields: [["Código", `DAU-SIT-${String(index + 1).padStart(2, "0")}`], ["Tipo", site.type], ["Amenaza", site.threat], ["Prioridad", site.priority]]
      }));
      if (route === "acciones") return official.actionsList.map((title, index) => ({
        ...base, title, status: index < official.pendingActions ? "Sin seguimiento" : "F07 preliminar", evidence: index < official.pendingActions ? "Plan ENOS" : "F07 preliminar sin homologar", detail: "Acción priorizada del Plan ENOS 2026–2027 del GAD Municipal de Daule.",
        fields: [["Código", `DAU-ACC-${String(index + 1).padStart(2, "0")}`], ["Presupuesto", official.budget], ["Vinculación", "Pendiente de codificación sitio–acción"]]
      }));
      if (route === "dashboard") return official.actionsList.slice(0, official.pendingActions).map((title, index) => ({
        ...base, title: `Brecha ${index + 1}: acción sin seguimiento`, status: "Activa", evidence: "Plan ENOS", detail: title,
        fields: [["Acción relacionada", title], ["Brecha", "No registra seguimiento homologado"], ["Próximo control", "Solicitar actualización F07 y verificable"]]
      }));
    }
    if (route === "riesgos" || route === "mapas") return record.sites.map((item, index) => ({
      ...base, title: item.siteReference, status: item.siteLinkState || "Reportado", evidence: item.evidenceState || item.sourceType, detail: item.progressDescription || item.criticalGap || "Sitio mencionado en seguimiento territorial.", url: item.evidenceUrl,
      fields: [["Código de acción", item.actionCode || "Pendiente de homologación"], ["Acción relacionada", item.actionTitle], ["Responsable", item.responsible], ["Periodo", item.period]]
    }));
    if (route === "acciones") return record.actions.filter(item => {
      const status = normalize(item.status);
      if (filter === "pendientes") return !status || /pend|sin iniciar|program/.test(status);
      if (filter === "ejecucion" || filter === "avance") return /proceso|ejec|curso|activo/.test(status);
      if (filter === "completadas") return isClosed(status);
      if (filter === "vinculadas") return !/pendiente/.test(normalize(item.actionLinkState));
      return true;
    }).map(item => ({
      ...base, title: item.actionTitle, status: item.status || "Sin estado", evidence: item.evidenceState || "Sin evidencia", detail: item.progressDescription || item.nextStep || "Seguimiento F07 territorial.", url: item.evidenceUrl,
      fields: [["Código", item.actionCode || "Pendiente de homologación"], ["Avance declarado", item.declaredProgress === null ? "No informado" : `${item.declaredProgress}%`], ["Responsable", item.responsible], ["Brecha crítica", item.criticalGap], ["Próximo paso", item.nextStep], ["Próximo reporte", item.nextReportDate], ["Vinculación con sitio", item.siteLinkState]]
    }));
    if (route === "dashboard") return record.followups.filter(item => !isClosed(item.status)).map((item, index) => ({
      ...base, title: item.criticalGap || `Brecha ${index + 1}: seguimiento pendiente`, status: "Activa", evidence: item.evidenceState || "Sin evidencia", detail: item.actionTitle || item.progressDescription || "Seguimiento pendiente de cierre.", url: item.evidenceUrl,
      fields: [["Acción relacionada", item.actionTitle], ["Estado reportado", item.status], ["Responsable", item.responsible], ["Próximo paso", item.nextStep], ["Próximo reporte", item.nextReportDate]]
    }));
    if (route === "documentos") {
      if (record.official && filter !== "evidencias") return [{ ...base, title: "Plan de Acción ENOS 2026–2027 – Daule", status: "Oficial", evidence: "Documento firmado", detail: "Plan territorial oficial utilizado como fuente primaria de la conciliación.", url: record.official.planUrl, fields: [["Código", "GADDAULE-ENOS-2026-001"], ["Fecha", "22 de junio de 2026"], ["Responsable técnico", "Stalin Quiñónez Arreaga"], ["Extensión", "17 páginas"]] }];
      if (filter === "evidencias") return record.followups.filter(item => item.evidenceUrl || item.evidenceFile).map(item => ({ ...base, title: item.evidenceFile || item.evidenceDescription || `Evidencia ${item.formId}`, status: item.evidenceState, evidence: item.sourceType, detail: item.actionTitle || item.progressDescription, url: item.evidenceUrl, fields: [["Formulario", item.formId], ["Periodo", item.period], ["Responsable", item.responsible], ["Acción", item.actionTitle]] }));
      return [...record.forms.map(item => ({ ...base, title: `Formulario territorial ${item.formId}`, status: item.status || "Recibido", evidence: item.sourceType, detail: `Remisión de ${item.institution || record.territory}.`, fields: [["Fecha de envío", item.submissionTime], ["Periodo", item.period], ["Institución", item.institution]] })), ...record.emails.map(item => ({ ...base, title: item.recordType, status: item.status, evidence: item.sourceType, detail: item.notes }))];
    }
    if (route === "reportes") return record.entities.map(entity => ({ ...base, title: `Estado territorial – ${entity.shortName}`, status: entity.baselineStatus, evidence: `${entity.formCount} formulario(s) · ${entity.evidenceAttachedCount} evidencia(s)`, detail: `${entity.followupCount} seguimientos F07; último periodo ${entity.latestPeriod || "no informado"}.`, fields: [["Nivel", entity.level], ["Seguimientos", entity.followupCount], ["Avance declarado", entity.declaredProgressLatestPeriod === null ? "No informado" : `${entity.declaredProgressLatestPeriod}%`], ["Requiere atención", entity.requiresAttention ? "Sí" : "No"]] }));
    if (route === "herramientas") return record.entities.map(entity => ({ ...base, title: `Control de calidad – ${entity.shortName}`, status: entity.requiresAttention ? "Requiere atención" : "Conforme", evidence: `${entity.formCount + entity.emailRecordCount} remisión(es)`, detail: entity.baselineStatus, fields: [["Entidad", entity.name], ["Nivel", entity.level], ["Acciones vinculadas", entity.linkedActionCount], ["Sitios vinculados", entity.linkedSiteCount], ["Evidencias adjuntas", entity.evidenceAttachedCount]] }));
    if (route === "coe" || route === "instituciones") return record.entities.map(entity => ({ ...base, title: entity.name, status: entity.baselineStatus, evidence: `${entity.formCount + entity.emailRecordCount} remisión(es)`, detail: `${entity.entityType} dentro del alcance seleccionado.`, fields: [["Nivel", entity.level], ["Provincia", entity.province], ["Seguimientos", entity.followupCount], ["Último periodo", entity.latestPeriod || "No informado"]] }));
    return [];
  }

  function showView(name) {
    document.querySelectorAll("[data-sr16-view]").forEach(view => view.classList.toggle("active", view.dataset.sr16View === name));
    document.querySelectorAll(".sr16-bottom button").forEach(button => button.classList.toggle("active", button.dataset.sr16Tab === name));
  }

  function renderAuthoritativeList(record, route, filter, sourceButton) {
    const records = authoritativeRecords(record, route, filter);
    const titles = { riesgos: "Sitios y riesgos", acciones: "Acciones", dashboard: "Brechas territoriales", documentos: "Planes y fuentes", reportes: "Reportes", mapas: "Cartografía", herramientas: "Auditoría", coe: "COE y actores", instituciones: "Entidades territoriales" };
    const subtitles = { riesgos: "Amenazas, exposición y puntos críticos", acciones: "Ejecución, evidencia y seguimiento", dashboard: "Activas, solventadas y pendientes de validación", documentos: "Documentos originales, revisión y evidencia", reportes: "Productos oficiales y verificables", mapas: "Sitios, capas y trabajo de campo", herramientas: "Calidad, trazabilidad y controles", coe: "Actores dentro del alcance", instituciones: "Competencias y responsables" };
    const current = document.querySelector("[data-sr16-view].active")?.dataset.sr16View;
    if (current && current !== "modulo") returnView = current;
    const module = document.querySelector("#sr16Module");
    if (!module) return;
    const active = records.filter(item => !/oficial|aplicada|validado/i.test(item.status)).length;
    const withEvidence = records.filter(item => item.evidence).length;
    module.innerHTML = `<div class="sr16-module-head"><button data-authoritative-back>←</button><div><h1>${titles[route]}</h1><p>${subtitles[route]} · ${escapeHtml(sourceButton?.textContent?.trim() || filter)}</p></div></div><section class="sr16-module-summary"><article><small>Registros filtrados</small><b>${records.length}</b></article><article><small>Activos o pendientes</small><b>${active}</b></article><article><small>Con respaldo</small><b>${withEvidence}</b></article></section>${records.length ? `<label class="sr16-record-search"><span>Buscar en este listado</span><input type="search" data-authoritative-search placeholder="Acción, sitio, entidad o estado"></label>` : ""}<div class="sr16-module-list">${records.map((item, index) => `<button class="sr16-record" data-authoritative-record="${index}" data-authoritative-route="${route}" data-authoritative-filter="${filter}" data-authoritative-text="${escapeHtml(normalize(`${item.title} ${item.status} ${item.evidence} ${item.detail}`))}"><span>!</span><div><b>${escapeHtml(item.title)}</b><small>${escapeHtml(item.territory)} · ${escapeHtml(item.evidence)}</small></div><em>${escapeHtml(item.status)}</em></button>`).join("") || '<div class="sr16-empty">No existen registros para este filtro y territorio.</div>'}</div>${route === "mapas" ? `<div class="sr16-module-actions"><a href="https://ee.kobotoolbox.org/x/aEcQSdRP" target="_blank" rel="noopener">Nuevo sitio ↗</a><a class="secondary" href="https://ee.kobotoolbox.org/x/0pXtskTZ" target="_blank" rel="noopener">Actualizar acción ↗</a></div>` : ""}`;
    showModule();
  }

  function renderAuthoritativeDetail(record, route, filter, index) {
    const item = authoritativeRecords(record, route, filter)[index];
    const module = document.querySelector("#sr16Module");
    if (!item || !module) return;
    const fields = [["Estado", item.status], ["Territorio", item.territory], ["Fuente", item.source], ...(item.fields || []), ["Detalle", item.detail]];
    const workflowAction = route === "dashboard" && filter !== "revision" ? '<button data-sr16-full="acciones" data-sr16-filter="pendientes">Gestionar acción correctiva →</button>' : route === "dashboard" ? '<button data-sr16-full="dashboard" data-sr16-filter="brechas">Ver brechas derivadas →</button>' : "";
    module.innerHTML = `<div class="sr16-module-head"><button data-authoritative-list="${route}|${filter}">←</button><div><h1>${escapeHtml(item.title)}</h1><p>Ficha individual con trazabilidad</p></div></div><div class="sr16-record-detail">${fields.map(([label, value]) => `<div><small>${escapeHtml(label)}</small><b>${escapeHtml(value)}</b></div>`).join("")}</div><div class="sr16-module-actions">${item.url ? `<a href="${escapeHtml(item.url)}" target="_blank" rel="noopener">Abrir documento original ↗</a>` : workflowAction}${item.url && workflowAction ? workflowAction : ""}<button class="secondary" data-authoritative-list="${route}|${filter}">Volver al listado</button></div>`;
  }

  function bindSitesDetail() {
    document.addEventListener("input", event => {
      const search = event.target.closest("[data-authoritative-search]");
      if (!search) return;
      const query = normalize(search.value);
      document.querySelectorAll("#sr16Module [data-authoritative-text]").forEach(row => { row.hidden = !row.dataset.authoritativeText.includes(query); });
    });
    document.addEventListener("click", event => {
      const record = selectedRecord();
      if (!record) return;
      const full = event.target.closest("[data-sr16-full]");
      const supported = new Set(["riesgos", "acciones", "dashboard", "documentos", "reportes", "mapas", "herramientas", "coe", "instituciones"]);
      const search = event.target.closest("[data-authoritative-search]");
      if (search) {
        const query = normalize(search.value);
        document.querySelectorAll("#sr16Module [data-authoritative-text]").forEach(row => { row.hidden = !row.dataset.authoritativeText.includes(query); });
        return;
      }
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
    const official = record.official;
    const sites = official?.sites ?? record.sites.length;
    const actions = official?.actions ?? record.actions.length;
    const activeCount = official?.pendingActions ?? record.active;
    const solvedCount = official?.solvedGaps ?? record.solved;
    const total = activeCount + solvedCount;
    const activePct = total ? Math.round(activeCount * 100 / total) : 0;
    const solvedPct = total ? 100 - activePct : 0;

    setText("#sr16Sites", sites);
    setText("#sr16SitesDetail", official ? `${sites} sitios priorizados · ${official.siteMentions} menciones depuradas` : `${record.sites.length} sitios referenciados en F07`);
    setText("#sr16Actions", actions);
    setText("#sr16ActionsDetail", official ? `${actions} acciones del plan · ${official.followups} F07 preliminares` : `${record.actions.length} acciones reportadas · ${record.followups.length} seguimientos F07`);
    setText("#sr16Budget", official?.budget || "Sin consolidar");
    setText("#sr16Gaps", total ? `${activePct}% / ${solvedPct}%` : "Sin seguimiento");
    setText("#sr16GapsDetail", `${activeCount} activas · ${solvedCount} solventadas`);
    setText("#sr16GapTitle", `${activeCount} brechas activas · ${solvedCount} solventadas`);
    setText("#sr16GapDetail", `${record.followups.length} seguimientos · ${record.evidence} con evidencia · ${record.entities.length} entidades en el alcance.`);

    const active = document.querySelector("#sr16GapActive");
    const solved = document.querySelector("#sr16GapSolved");
    if (active) active.style.width = `${activePct}%`;
    if (solved) solved.style.width = `${solvedPct}%`;

    const source = document.querySelector("#sr16Source");
    if (source) source.innerHTML = `<b>Origen:</b> ${escapeHtml(record.cut)}. ${sites} sitios · ${actions} acciones · ${record.followups.length} seguimientos · ${record.evidence} evidencias. Los registros pendientes de homologación se conservan visibles y no se presentan como validados.`;
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
