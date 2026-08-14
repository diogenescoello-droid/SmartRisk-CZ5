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
      ])
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

  function bindSitesDetail() {
    document.addEventListener("click", event => {
      const record = selectedRecord();
      if (!record) return;
      const open = event.target.closest('[data-sr16-full="riesgos"][data-sr16-filter="sitios"]');
      const site = event.target.closest("[data-daule-site]");
      const list = event.target.closest("[data-daule-sites-list]");
      const back = event.target.closest("[data-daule-sites-back]");
      if (open) {
        event.preventDefault();
        event.stopImmediatePropagation();
        renderSitesList(record);
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
