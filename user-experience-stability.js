(() => {
  "use strict";

  const VERSION = "2026.08.31.1-navigation-map-stability";
  const SCENARIO_ROUTE = "escenario-cuenca-media";
  const SCENARIO_IDLE_HASH = "#escenario-zonal-activo";
  const LEGACY_ROUTE_MAP = Object.freeze({
    mapas: "herramientas",
    riesgos: "sitios",
    acciones: "acciones",
    reportes: "revision"
  });

  let scheduled = false;

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];

  function routeFromHash() {
    return String(location.hash || "")
      .replace(/^#\/?/, "")
      .split(/[?&]/)[0]
      .toLowerCase();
  }

  function hasLegacyNavigation() {
    return Boolean($("#nav [data-page], #nav [data-scope-page]"));
  }

  function scenarioContentVisible() {
    const content = $("#content");
    return Boolean(content?.classList.contains("sr-scenario-shell") || $("#content .sr-scenario-hero"));
  }

  function replaceHashWithoutEvent(hash = "") {
    const next = `${location.pathname}${location.search}${hash}`;
    try {
      history.replaceState(history.state, "", next);
    } catch (_) {
      // Si replaceState no está disponible, no forzar una navegación que pueda perder estado.
    }
  }

  function markScenarioNavigation(active) {
    $$("#nav [data-scenario-nav], #nav [data-route='escenario-cuenca-media']").forEach(button => {
      button.classList.toggle("active", Boolean(active));
      button.setAttribute("aria-current", active ? "page" : "false");
    });
  }

  function stabilizeScenarioRender() {
    if (routeFromHash() !== SCENARIO_ROUTE || !scenarioContentVisible()) return false;

    // scenario-operational-cuenca.js necesita observar la creación del menú, pero su
    // observador también detecta el propio render. Neutralizar el hash sin disparar
    // hashchange corta el ciclo render -> mutation -> render sin tocar el contenido.
    replaceHashWithoutEvent(SCENARIO_IDLE_HASH);
    markScenarioNavigation(true);
    document.documentElement.dataset.smartRiskScenarioStable = VERSION;
    return true;
  }

  function leaveScenarioBeforeLegacyRender() {
    if (!scenarioContentVisible() && routeFromHash() !== SCENARIO_ROUTE && location.hash !== SCENARIO_IDLE_HASH) return;
    replaceHashWithoutEvent("");
    markScenarioNavigation(false);
    const content = $("#content");
    content?.classList.remove("sr-scenario-shell");
  }

  function legacyTargetButton(page) {
    return $(`#nav [data-page='${page}']`) || $(`#nav [data-scope-page='${page}']`);
  }

  function openLegacyPage(page) {
    const target = legacyTargetButton(page);
    if (!target) return false;
    leaveScenarioBeforeLegacyRender();
    target.click();
    return true;
  }

  function openSites() {
    if (openLegacyPage("sitios")) return;
    const v11 = $("#nav [data-route='riesgos']");
    if (v11) v11.click();
    else location.hash = "#/riesgos";
  }

  function boundaryGuidance() {
    const box = document.createElement("div");
    box.className = "sr-map-context-guidance";
    box.dataset.srMapContextGuidance = VERSION;
    box.innerHTML = `
      <strong>¿Qué estás viendo?</strong>
      <p>Este elemento es un <b>límite administrativo de referencia</b>; no representa por sí solo un sitio crítico ni un nivel de riesgo.</p>
      <p>Para conocer amenaza, exposición, vulnerabilidad o capacidad, revise las capas de sitios/F03/ENOS. Si todavía no existe una ficha, complete el registro territorial antes de interpretar el punto.</p>
      <button type="button" data-sr-open-critical-sites>Ir a Sitios críticos</button>`;
    return box;
  }

  function incompletePointGuidance() {
    const box = document.createElement("div");
    box.className = "sr-map-context-guidance";
    box.dataset.srMapContextGuidance = VERSION;
    box.innerHTML = `
      <strong>Información todavía incompleta</strong>
      <p>La geometría está disponible, pero esta ventana no contiene una lectura completa del riesgo.</p>
      <p>Próximo paso: vincule o complete la ficha del sitio con amenaza, exposición, vulnerabilidad, capacidad, fuente y fecha de validación.</p>
      <button type="button" data-sr-open-critical-sites>Completar en Sitios críticos</button>`;
    return box;
  }

  function decorateMapPopup(popup) {
    if (!popup || popup.dataset.srMapGuidanceChecked === VERSION) return;
    popup.dataset.srMapGuidanceChecked = VERSION;

    const text = String(popup.textContent || "").replace(/\s+/g, " ").trim();
    const isAdministrativeBoundary = /l[ií]mite\s+(provincial|administrativo)/i.test(text) || (/\bDPA\b/i.test(text) && !/\bRiesgo\s*:/i.test(text));
    const isCartographicPopup = Boolean(popup.closest(".leaflet-popup")) && /cartograf|sitio|georrefer|elemento|F03|DPA|l[ií]mite/i.test(text);
    const hasRiskDetail = /Amenaza\s*:|Riesgo\s*:|Vulnerabilidad\s*:|Capacidad\s*:|Inundaci[oó]n\s*:|Sequ[ií]a\s*:|Incendio\s*:/i.test(text);

    if (isAdministrativeBoundary) popup.appendChild(boundaryGuidance());
    else if (isCartographicPopup && !hasRiskDetail && !popup.querySelector("[data-sr-map-context-guidance]")) popup.appendChild(incompletePointGuidance());
  }

  function decorateMapPopups() {
    $$(".leaflet-popup-content").forEach(decorateMapPopup);
  }

  function installStyle() {
    if ($("#srUxStabilityStyle")) return;
    const style = document.createElement("style");
    style.id = "srUxStabilityStyle";
    style.textContent = `
      .sr-map-context-guidance{margin-top:.65rem;padding:.7rem .75rem;border-radius:.65rem;background:#f8fafc;border:1px solid #cbd5e1;color:#334155;line-height:1.35}
      .sr-map-context-guidance strong{display:block;color:#0f3b5d;margin-bottom:.25rem}
      .sr-map-context-guidance p{margin:.25rem 0;font-size:.82rem}
      .sr-map-context-guidance button{margin-top:.45rem;width:100%;padding:.45rem .6rem;border-radius:.45rem;border:1px solid #0f766e;background:#0f766e;color:#fff;font-weight:700;cursor:pointer}
    `;
    document.head.appendChild(style);
  }

  function apply() {
    scheduled = false;
    stabilizeScenarioRender();
    decorateMapPopups();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(apply);
  }

  document.addEventListener("click", event => {
    const legacyNav = event.target.closest("#nav [data-page], #nav [data-scope-page]");
    if (legacyNav && scenarioContentVisible()) {
      // Captura antes de que app.js ejecute render(): evita que el observador del
      // escenario vuelva a pintar encima de la pantalla territorial elegida.
      leaveScenarioBeforeLegacyRender();
      return;
    }

    const scenarioAction = event.target.closest("[data-scenario-route]");
    if (scenarioAction && hasLegacyNavigation()) {
      const page = LEGACY_ROUTE_MAP[scenarioAction.dataset.scenarioRoute];
      if (!page) return;
      event.preventDefault();
      event.stopImmediatePropagation();
      openLegacyPage(page);
      return;
    }

    if (event.target.closest("[data-sr-open-critical-sites]")) {
      event.preventDefault();
      openSites();
    }
  }, true);

  window.addEventListener("hashchange", schedule);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });

  installStyle();
  schedule();

  window.SmartRiskUserExperienceStability = {
    VERSION,
    scenarioRoute: SCENARIO_ROUTE,
    scenarioIdleHash: SCENARIO_IDLE_HASH,
    stabilizeScenarioRender,
    decorateMapPopups,
    openSites
  };
})();
