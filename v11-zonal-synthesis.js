(() => {
  "use strict";

  const VERSION = "1.0.0-zonal-synthesis";
  const FORM_PURPOSE = Object.freeze({
    F01: ["Sitios críticos y elementos expuestos", "Consolidar y priorizar los sitios reportados, su exposición y los elementos que podrían verse afectados en las cinco provincias."],
    F02: ["Infraestructura expuesta", "Identificar infraestructura y servicios esenciales cuya afectación requiera seguimiento, coordinación o apoyo entre territorios."],
    F03: ["Mapas e información cartográfica", "Homologar capas, fuentes y escalas; detectar vacíos cartográficos que limiten la lectura zonal."],
    F04: ["Acciones preventivas y de mitigación", "Dar seguimiento a las acciones territoriales y priorizar las que requieren asistencia técnica, articulación o escalamiento zonal."],
    F05: ["Alojamientos, rutas y puntos seguros", "Consolidar capacidades de evacuación y alojamiento para anticipar necesidades de apoyo y coordinación interterritorial."],
    F06: ["Capacidades y recursos", "Construir una lectura de capacidades disponibles, brechas y posibilidades de apoyo subsidiario o cooperación entre instituciones."],
    F07: ["Seguimiento de acciones", "Vigilar avance, evidencia, vinculación con F04 y sitios, nudos críticos y decisiones que requieran gestión zonal."]
  });

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  let observer = null;

  function inventory() {
    const currentF07 = window.SMART_RISK_F07_CURRENT || {};
    const baseline = window.SMART_RISK_PILOT_BASELINE || {};
    return {
      matrix: window.ENOS_MATRIX_PRELIMINARY || {},
      reviews: window.ENOS_REVIEWS?.reviews || [],
      locations: window.ENOS_RISK_LOCATIONS?.locations || [],
      followups: currentF07.followups?.length ? currentF07.followups : (baseline.followups || []),
      plans: window.SMART_RISK_PLAN_SOURCES?.plans || []
    };
  }

  function isZone() {
    return $("#sr16Level")?.value === "zona";
  }

  function provinceOf(record) {
    return record?.province || record?.provincia || record?.payload?.province || record?.payload?.provincia || "Sin provincia";
  }

  function countByProvince(records) {
    const result = new Map();
    records.forEach(record => {
      const key = String(provinceOf(record) || "Sin provincia").trim() || "Sin provincia";
      result.set(key, (result.get(key) || 0) + 1);
    });
    return result;
  }

  function institutionalSummary(gads) {
    const audited = gads.filter(gad => gad?.institutionalStatus);
    const count = status => audited.filter(gad => norm(gad.institutionalStatus) === norm(status)).length;
    return {
      audited: audited.length,
      validated: count("VALIDADO"),
      gaps: count("CON BRECHAS"),
      returned: count("DEVUELTO")
    };
  }

  function formSummary(gads, code) {
    const statuses = gads.map(gad => String(gad?.statuses?.[code] || "Sin registro").trim());
    const attributable = statuses.filter(status => norm(status) === "atribuible").length;
    const missing = statuses.filter(status => norm(status) === "sin registro").length;
    const needsReview = statuses.length - attributable - missing;
    return { attributable, needsReview, missing, total: statuses.length };
  }

  function buildStats() {
    const { matrix, reviews, locations, followups } = inventory();
    const gads = matrix.gads || [];
    const proposals = reviews.reduce((sum, review) => sum + (Number(review.proposalCount) || 0), 0);
    const linkedActions = followups.filter(item => !String(item.actionLinkState || "").includes("Pendiente") && Boolean(item.actionCode && item.actionCode !== "SIN-CODIGO")).length;
    const linkedSites = followups.filter(item => !String(item.siteLinkState || "").includes("Pendiente") && Boolean(item.siteReference || item.siteId)).length;
    const withEvidence = followups.filter(item => Boolean(item.evidenceUrl || item.evidenceFile)).length;
    const solved = followups.filter(item => /cumpl|cerrad|finaliz/.test(norm(item.status))).length;
    const active = Math.max(0, followups.length - solved);
    const planCoverage = reviews.filter(review => review.plan).length;
    const sitesByProvince = countByProvince(locations);
    const followupsByProvince = countByProvince(followups);
    const provinces = [...new Set([...sitesByProvince.keys(), ...followupsByProvince.keys()])]
      .filter(name => norm(name) !== "sin provincia")
      .sort((a, b) => a.localeCompare(b, "es"));

    return {
      matrix,
      gads,
      reviews,
      locations,
      followups,
      proposals,
      linkedActions,
      linkedSites,
      withEvidence,
      solved,
      active,
      planCoverage,
      sitesByProvince,
      followupsByProvince,
      provinces,
      institutional: institutionalSummary(gads)
    };
  }

  function ensurePanel() {
    const view = $('[data-sr16-view="territorio"]');
    if (!view) return null;
    let panel = $("#sr16ZonalSynthesis", view);
    if (panel) return panel;
    panel = document.createElement("section");
    panel.id = "sr16ZonalSynthesis";
    panel.setAttribute("aria-label", "Síntesis zonal operativa derivada");
    const firstSectionTitle = $(".sr16-section-title", view);
    if (firstSectionTitle) view.insertBefore(panel, firstSectionTitle);
    else view.appendChild(panel);
    return panel;
  }

  function renderPanel() {
    const panel = ensurePanel();
    if (!panel) return;
    if (!isZone()) {
      panel.hidden = true;
      return;
    }

    const stats = buildStats();
    const cut = stats.matrix.cutDate || window.SMART_RISK_F07_CURRENT?.config?.latestSubmissionAt || "corte vigente";
    const forms = Object.entries(FORM_PURPOSE).map(([code, [name, purpose]]) => {
      const summary = formSummary(stats.gads, code);
      return `<article class="sr16-record-detail"><div><small>${code}</small><b>${esc(name)}</b></div><div><small>Lectura de la matriz</small><b>${summary.attributable} atribuibles · ${summary.needsReview} por conciliar/completar · ${summary.missing} sin registro</b></div><div><small>¿Qué debe hacer la Zona?</small><b>${esc(purpose)}</b></div></article>`;
    }).join("");

    const provinces = stats.provinces.map(province => `<div><small>${esc(province)}</small><b>${stats.sitesByProvince.get(province) || 0} menciones de sitio/riesgo · ${stats.followupsByProvince.get(province) || 0} seguimientos F07</b></div>`).join("");
    const institutional = stats.institutional.audited
      ? `${stats.institutional.validated} validados · ${stats.institutional.gaps} con brechas · ${stats.institutional.returned} devueltos (${stats.institutional.audited} GAD con estado institucional auditado)`
      : "Sin distribución institucional auditada disponible";

    panel.hidden = false;
    panel.innerHTML = `
      <div class="sr16-section-title"><h3>Síntesis zonal ENOS 2026–2027</h3></div>
      <article class="sr16-alert"><span>◎</span><div><b>Lectura operativa derivada de Zona 5</b><small>Consolidación analítica de planes territoriales, matriz ENOS y seguimiento F07 al ${esc(cut)}.</small></div></article>
      <article class="sr16-record-detail"><div><small>Alcance institucional</small><b>Esta síntesis orienta la supervisión, asistencia técnica, articulación, priorización y seguimiento de la Coordinación Zonal 5.</b></div><div><small>Límite de interpretación</small><b>No constituye un plan oficial independiente de la Coordinación Zonal y no sustituye las competencias ni la ejecución territorial de los GAD y demás entidades responsables.</b></div></article>
      <section class="sr16-module-summary">
        <article><small>Territorios en matriz</small><b>${stats.gads.length || stats.reviews.length}</b></article>
        <article><small>Planes con lectura disponible</small><b>${stats.planCoverage}</b></article>
        <article><small>Menciones documentales de sitio/riesgo</small><b>${stats.locations.length}</b></article>
        <article><small>Sitios vinculados en F07</small><b>${stats.linkedSites}</b></article>
        <article><small>Propuestas territoriales</small><b>${stats.proposals}</b></article>
        <article><small>Seguimientos F07</small><b>${stats.followups.length}</b></article>
        <article><small>Acciones F07 vinculadas</small><b>${stats.linkedActions}</b></article>
        <article><small>F07 con evidencia</small><b>${stats.withEvidence}</b></article>
      </section>
      <article class="sr16-record-detail"><div><small>Estado institucional disponible</small><b>${esc(institutional)}</b></div><div><small>Seguimiento zonal</small><b>${stats.active} registros activos o no cerrados · ${stats.solved} cerrados/finalizados según el F07 disponible</b></div></article>
      <div class="sr16-section-title"><h3>¿Qué debe reportar y gestionar la Zona?</h3></div>
      <article class="sr16-record-detail"><div><small>Sentido del reporte zonal</small><b>La Zona no debe duplicar los planes cantonales o provinciales. Debe consolidar el panorama común, identificar concentraciones de exposición y brechas, comparar avances, priorizar asistencia técnica, articular instituciones y escalar los nudos que exceden la capacidad de un territorio.</b></div><div><small>Resultado esperado</small><b>Una lectura de dónde están los problemas, qué infraestructura y población pueden verse comprometidas, qué medidas se ejecutan, con qué capacidades se cuenta, qué falta, quién debe actuar y qué requiere decisión o coordinación zonal.</b></div></article>
      ${forms}
      <div class="sr16-section-title"><h3>Distribución territorial disponible</h3></div>
      <article class="sr16-record-detail">${provinces || '<div><small>Provincias</small><b>La fuente actual no permite desagregar esta sección.</b></div>'}</article>
      <p class="sr16-source"><b>Trazabilidad:</b> síntesis calculada en tiempo de consulta a partir de las fuentes cargadas en SmartRisk. Los valores zonales son agregados; no se crean registros territoriales nuevos ni se alteran los datos fuente.</p>`;
  }

  function updateTerritoryChrome() {
    const territoryView = $('[data-sr16-view="territorio"]');
    if (!territoryView) return;
    const status = $(".sr16-heading .sr16-status", territoryView);
    const cardTitle = $(".sr16-territory .sr16-territory-head div > b", territoryView);
    const cardDetail = $(".sr16-territory .sr16-territory-head div > small", territoryView);
    const openPlan = $("#sr16OpenPlan");

    if (isZone()) {
      if (status) status.textContent = "Síntesis derivada";
      if (cardTitle) cardTitle.textContent = "Síntesis zonal y lectura técnica";
      if (cardDetail) cardDetail.textContent = "Consolidación de resultados territoriales, brechas, capacidades y seguimiento";
      const stats = buildStats();
      const planStatus = $("#sr16PlanStatus");
      if (planStatus) planStatus.textContent = `Síntesis zonal derivada · ${stats.gads.length || stats.reviews.length} territorios consolidados`;
      if (openPlan) {
        openPlan.disabled = false;
        openPlan.innerHTML = "<b>≡</b>Síntesis";
        openPlan.onclick = () => {
          window.SmartRiskV11ApprovedRC16?.show?.("territorio");
          setTimeout(() => $("#sr16ZonalSynthesis")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
        };
      }
    } else {
      if (status) status.textContent = "Plan oficial";
      if (cardTitle) cardTitle.textContent = "Plan y revisión técnica";
      if (cardDetail) cardDetail.textContent = "Documento, criterios, brechas y verificables";
      if (openPlan) openPlan.innerHTML = "<b>↗</b>PDF";
    }
  }

  function enhanceEmptyState() {
    if (!isZone()) return;
    const empty = $("#sr16Module .sr16-empty");
    if (!empty || empty.dataset.zonalEnhanced === "1") return;
    empty.dataset.zonalEnhanced = "1";
    empty.innerHTML = `No existe un registro zonal independiente para este filtro. La vista <b>Zona 5</b> se construye por consolidación de las fuentes territoriales.<div class="sr16-module-actions"><button data-sr-zonal-open>Síntesis zonal</button></div>`;
  }

  function refresh() {
    updateTerritoryChrome();
    renderPanel();
    enhanceEmptyState();
  }

  function bind() {
    ["#sr16Level", "#sr16Province", "#sr16Canton"].forEach(selector => {
      $(selector)?.addEventListener("change", () => setTimeout(refresh, 0));
    });
    document.addEventListener("click", event => {
      if (!event.target.closest("[data-sr-zonal-open]")) return;
      window.SmartRiskV11ApprovedRC16?.show?.("territorio");
      setTimeout(() => $("#sr16ZonalSynthesis")?.scrollIntoView({ behavior: "smooth", block: "start" }), 20);
    });
    if (!observer) {
      observer = new MutationObserver(() => enhanceEmptyState());
      const module = $("#sr16Module");
      if (module) observer.observe(module, { childList: true, subtree: true });
    }
  }

  function afterAppStart() {
    bind();
    refresh();
  }

  window.SmartRiskZonalSynthesis = { VERSION, FORM_PURPOSE, afterAppStart, refresh, buildStats };
})();
