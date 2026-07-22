(() => {
  "use strict";

  const VERSION = "11.0.0-rc11";
  const ROUTE_ID = "inteligencia";
  const ROUTE = {
    id: ROUTE_ID,
    title: "Inteligencia territorial",
    subtitle: "Pronóstico, vigilancia, antecedentes y recomendaciones por cantón",
    icon: "spark",
    group: "Análisis y territorio"
  };

  const $ = (selector, root = document) => root.querySelector(selector);
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const unique = values => [...new Set(values.filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "es"));

  const runtime = { bound: false, observer: null, canton: "", threat: "Lluvias intensas", rendering: false };

  const PILOT_CATALOG = {
    generatedAt: "2026-07-22T12:00:00-05:00",
    sourceMode: "piloto_sanitizado",
    umevaReports: [{
      id: "BT-GUAYAS-0281-21072026-HT-22H30-07H00",
      title: "Bitácora de Turno de Monitoreo No. 0281",
      reportType: "Bitácora de turno UMEVA",
      source: "Unidad de Monitoreo de Eventos Adversos - Guayas",
      province: "Guayas",
      issuedAt: "2026-07-22T06:25:00-05:00",
      period: "21 de julio, 22:30 – 22 de julio, 07:00",
      observations: ["01:51 · Sin lluvia reportada en Zona 5-8 Guayas", "06:03 · Sin lluvia reportada en Zona 5-8 Guayas"],
      forecast: { territory: "Guayaquil", conditions: "Parcialmente nublado con claros", rainProbability: "Baja", temperature: "24 °C a 32,5 °C", uv: "Muy alto" },
      tideNotice: "Mantener atención en sectores cercanos a esteros y ríos.",
      followUps: [
        ["Guayaquil", 12], ["Daule", 6], ["Pedro Carbo", 3], ["Naranjito", 2],
        ["Balzar", 1], ["Colimes", 1], ["Playas", 1], ["San Jacinto de Yaguachi", 1], ["Santa Lucía", 1]
      ],
      listedItems: 28,
      closedItems: 1,
      pendingFollowUp: 27
    }],
    historicalInventory: {
      startYear: 2021,
      endYear: 2026,
      status: "inventario_y_deduplicacion_en_proceso",
      method: "Identificar documento, versión, territorio, amenaza, coordenadas, conclusiones, recomendaciones y relación con casos actuales."
    }
  };

  function state() { return window.SmartRiskV11App?.state || {}; }
  function records() { return state()?.data?.records || []; }
  function recordText(record) {
    let payload = "";
    try { payload = JSON.stringify(record?.payload || {}); } catch {}
    return normalize([record?.title, record?.detail, record?.tipo, record?.evento, record?.institucion, record?.provincia, record?.canton, record?.responsable, payload].join(" "));
  }
  function recordYear(record) {
    for (const value of [record?.updatedAt, record?.createdAt, record?.payload?.fecha, record?.payload?.fechaInforme, record?.title, record?.sourceId]) {
      const match = String(value || "").match(/\b(202[1-6])\b/);
      if (match) return Number(match[1]);
      const date = new Date(value);
      if (!Number.isNaN(date.getTime()) && date.getFullYear() >= 2021 && date.getFullYear() <= 2026) return date.getFullYear();
    }
    return null;
  }
  function isHistorical(record) {
    return Boolean(recordYear(record)) && /informe|inspeccion|evaluacion|analisis|riesgo|amenaza|susceptibilidad/.test(recordText(record));
  }
  function registerRoute() {
    const router = window.SmartRiskV11Router;
    if (router && !router.routes.some(route => route.id === ROUTE_ID)) {
      const index = router.routes.findIndex(route => route.id === "monitoreo");
      router.routes.splice(index >= 0 ? index + 1 : router.routes.length, 0, ROUTE);
      Object.assign(router.aliases, { inteligencia: ROUTE_ID, intelligence: ROUTE_ID, umeva: ROUTE_ID });
    }
    const modules = window.SmartRiskV11Permissions?.UNIVERSAL_MODULES;
    if (Array.isArray(modules) && !modules.includes(ROUTE_ID)) modules.push(ROUTE_ID);
  }
  function currentCanton() { return runtime.canton || state()?.filters?.canton || ""; }
  function followUpCount(canton) {
    return PILOT_CATALOG.umevaReports[0].followUps.find(([name]) => normalize(name) === normalize(canton))?.[1] || 0;
  }
  function cantonOptions() {
    return unique([...PILOT_CATALOG.umevaReports[0].followUps.map(([name]) => name), ...records().map(record => record.canton)]);
  }
  function threatOptions() {
    return unique(["Lluvias intensas", "Inundación", "Movimientos en masa", "Incendio forestal", "Socavación y erosión",
      ...records().flatMap(record => [record.evento, record.payload?.amenaza, record.payload?.tipoAmenaza, record.tipo])]);
  }
  function visibleRecords() {
    const canton = currentCanton();
    const province = state()?.filters?.provincia || "";
    const threat = normalize(runtime.threat);
    return records().filter(record => {
      const provinceOk = !province || !record.provincia || normalize(record.provincia) === normalize(province);
      const cantonOk = !canton || normalize(record.canton) === normalize(canton) || recordText(record).includes(normalize(canton));
      const text = recordText(record);
      const threatOk = !threat || text.includes(threat) || (threat === "lluvias intensas" && /lluv|inund|hidrometeor|precipit/.test(text));
      return provinceOk && cantonOk && threatOk;
    });
  }
  function summary(items) {
    const count = type => items.filter(record => record.entityType === type).length;
    return {
      reports: count("monitoringReports"),
      risks: count("risks") + count("criticalSites"),
      actions: count("actions"),
      validations: count("validations"),
      institutions: count("institutions"),
      decisions: count("decisions"),
      historical: items.filter(isHistorical)
    };
  }
  function assessment(canton, data) {
    const followUps = followUpCount(canton);
    const evidence = data.reports + data.risks + data.actions;
    if (!canton) return ["medium", "Panorama zonal en revisión", "27 referencias pendientes distribuidas en nueve cantones del reporte piloto."];
    if (followUps && evidence) return ["high", "Revisión territorial prioritaria", `${followUps} antecedentes de seguimiento y ${evidence} registros operativos relacionados.`];
    if (followUps) return ["medium", "Seguimiento preparatorio", `${followUps} referencias de seguimiento; falta consolidar evidencia operativa en SmartRisk.`];
    if (normalize(canton) === "guayaquil") return ["low", "Vigilancia meteorológica", "La probabilidad de lluvia reportada es baja; no corresponde escalar sin observación o afectación."];
    return ["neutral", "Sin señal cantonal directa", "No se identificó pronóstico explícito para este cantón. No debe extrapolarse el dato de Guayaquil."];
  }
  function historicalRows() {
    const historical = records().filter(isHistorical);
    const rows = [];
    for (let year = 2021; year <= 2026; year += 1) {
      const loaded = historical.filter(record => recordYear(record) === year).length;
      rows.push({ year, loaded, status: loaded ? "Con insumos visibles" : "Pendiente de indexación" });
    }
    return rows;
  }
  function options(values, selected, empty) {
    return `<option value="">${esc(empty)}</option>${values.map(value => `<option value="${esc(value)}" ${normalize(value) === normalize(selected) ? "selected" : ""}>${esc(value)}</option>`).join("")}`;
  }
  function render() {
    const content = $("#content");
    if (!content || state()?.route !== ROUTE_ID || runtime.rendering) return;
    runtime.rendering = true;
    const report = PILOT_CATALOG.umevaReports[0];
    const canton = currentCanton();
    const data = summary(visibleRecords());
    const [tone, label, reason] = assessment(canton, data);
    const years = historicalRows();
    content.innerHTML = `
      <section class="sr11-hero">
        <div class="sr11-hero-copy"><span class="sr11-kicker">Inteligencia territorial · RC11</span><h2>De la señal meteorológica a la decisión territorial sustentada</h2><p>Integra bitácoras UMEVA, registros operativos e informes históricos. Diferencia pronóstico, observación e impacto para evitar conclusiones que la fuente no permite.</p><div class="sr11-source-line"><b>Reporte piloto:</b> ${esc(report.id)} · ${esc(report.title)}</div></div>
        <div class="sr11-attention ${tone}"><small>Lectura para ${esc(canton || "todo el alcance")}</small><strong>${esc(label)}</strong><p>${esc(reason)}</p></div>
      </section>
      <section class="sr11-filters">
        <label>Cantón<select id="sr11Canton">${options(cantonOptions(), canton, "Todo el alcance")}</select></label>
        <label>Amenaza<select id="sr11Threat">${options(threatOptions(), runtime.threat, "Todas")}</select></label>
        <button type="button" data-sr11-refresh>Actualizar lectura</button>
      </section>
      <section class="sr11-kpis">
        <article><small>Reportes UMEVA</small><b>1</b><span>Piloto sanitizado</span></article>
        <article><small>Pendientes del turno</small><b>${report.pendingFollowUp}</b><span>${report.closedItems} cerrado de ${report.listedItems}</span></article>
        <article><small>Registros relacionados</small><b>${visibleRecords().length}</b><span>Solo lectura</span></article>
        <article><small>Informes históricos</small><b>${data.historical.length}</b><span>Inventario 2021–2026</span></article>
      </section>
      <section class="sr11-grid">
        <article class="sr-card sr11-forecast"><header><div><small>Pronóstico y vigilancia</small><h2>${esc(report.title)}</h2></div><span>UMEVA</span></header>
          <div class="sr11-report-meta"><b>Fuente:</b> ${esc(report.source)} · <b>Turno:</b> ${esc(report.period)}</div>
          <div class="sr11-observations"><h3>Observación registrada</h3>${report.observations.map(item => `<p>✓ ${esc(item)}</p>`).join("")}</div>
          <div class="sr11-weather"><div><small>Territorio pronosticado</small><b>${esc(report.forecast.territory)}</b></div><div><small>Condición</small><b>${esc(report.forecast.conditions)}</b></div><div><small>Probabilidad de lluvia</small><b>${esc(report.forecast.rainProbability)}</b></div><div><small>Temperatura / UV</small><b>${esc(report.forecast.temperature)} · ${esc(report.forecast.uv)}</b></div></div>
          <p class="sr11-caution"><b>Criterio de uso:</b> No activar ni escalar únicamente por este pronóstico. Confirmar lluvia observada, incremento de amenaza, afectación o validación territorial.</p>
        </article>
        <article class="sr-card sr11-cantons"><header><div><small>Seguimiento territorial</small><h2>Cantones bajo atención</h2></div><b>${report.pendingFollowUp}</b></header>
          <div>${report.followUps.map(([name, count]) => `<button type="button" data-sr11-canton="${esc(name)}"><span>${esc(name)}</span><b>${count}</b></button>`).join("")}</div>
          <p>Las cantidades son referencias de seguimiento del turno; no equivalen automáticamente a emergencias activas.</p>
        </article>
      </section>
      <section class="sr11-pipeline">
        <header><div><small>Uso diferenciado</small><h2>De la fuente a la acción</h2></div></header>
        <div>
          <article><span>1</span><h3>Preparación</h3><p>Verificar territorio, fuente, directorio, recursos y sitios críticos antes de tomar decisiones.</p><button data-sr11-route="monitoreo">Abrir monitoreo</button></article>
          <article><span>2</span><h3>Análisis</h3><p>Contrastar bitácora, cartografía, exposición, antecedentes y evidencia territorial vigente.</p><button data-sr11-route="riesgos">Abrir riesgos</button></article>
          <article><span>3</span><h3>Respuesta</h3><p>Escalar solo con evidencia observada, responsable, acción, plazo y criterio institucional.</p><button data-sr11-route="respuesta-coe">Abrir Respuesta COE</button></article>
        </div>
      </section>
      <section class="sr-card sr11-history">
        <header><div><small>Memoria institucional</small><h2>Inventario histórico 2021–2026</h2><p>Clasificación preliminar; evita contar duplicados como documentos independientes.</p></div><span>${PILOT_CATALOG.historicalInventory.status.replaceAll("_", " ")}</span></header>
        <div class="sr11-history-grid">${years.map(row => `<article><b>${row.year}</b><strong>${row.loaded}</strong><span class="${row.loaded ? "ready" : "pending"}">${esc(row.status)}</span></article>`).join("")}</div>
        <footer><b>Método:</b> ${esc(PILOT_CATALOG.historicalInventory.method)}</footer>
      </section>
      <section class="sr11-limit"><b>Límite del conector:</b> Los mensajes históricos de Gmail no se leen desde GitHub Pages. La incorporación requiere extracción autorizada, trazabilidad de origen y sanitización antes de publicarse.</section>`;
    runtime.rendering = false;
  }
  function bindEvents() {
    if (runtime.bound) return;
    runtime.bound = true;
    document.addEventListener("change", event => {
      if (event.target.id === "sr11Canton") { runtime.canton = event.target.value; render(); }
      if (event.target.id === "sr11Threat") { runtime.threat = event.target.value; render(); }
    });
    document.addEventListener("click", event => {
      const canton = event.target.closest("[data-sr11-canton]");
      if (canton) { runtime.canton = canton.dataset.sr11Canton; render(); }
      const route = event.target.closest("[data-sr11-route]");
      if (route) location.hash = `#/${route.dataset.sr11Route}`;
      if (event.target.closest("[data-sr11-refresh]")) render();
    });
  }
  function enhance() {
    registerRoute();
    if (state()?.route === ROUTE_ID) render();
  }
  function afterAppStart() {
    registerRoute();
    bindEvents();
    runtime.observer = new MutationObserver(() => requestAnimationFrame(enhance));
    runtime.observer.observe(document.body, { childList: true, subtree: true });
    setTimeout(() => {
      if (window.SmartRiskV11App?.render && normalize(location.hash).includes("inteligencia")) window.SmartRiskV11App.render(location.hash);
      enhance();
    }, 0);
  }

  registerRoute();
  window.SmartRiskV11IntelligenceRC11 = { VERSION, ROUTE, PILOT_CATALOG, afterAppStart, render, refresh: render };
})();
