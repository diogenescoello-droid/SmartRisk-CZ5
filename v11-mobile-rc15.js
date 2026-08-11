(() => {
  "use strict";

  const VERSION = "11.0.0-rc15";
  const KOBO_SITE = "https://ee.kobotoolbox.org/x/aEcQSdRP";
  const KOBO_ACTION = "https://ee.kobotoolbox.org/x/0pXtskTZ";
  const NAV = [
    { id: "inicio", label: "Inicio", icon: "dashboard" },
    { id: "dashboard", label: "Territorio", icon: "map" },
    { id: "mapas", label: "Mapa", icon: "risk" },
    { id: "acciones", label: "Acciones", icon: "actions" },
    { id: "more", label: "Más", icon: "tools" }
  ];
  const runtime = { observer: null, scheduled: false, bound: false };
  const $ = (selector, root = document) => root.querySelector(selector);
  const appState = () => window.SmartRiskV11App?.state || {};
  const icon = (name, size = 21) => window.SmartRiskV11App?.icon?.(name, size) || "";

  function activeRoute() {
    return appState().route || window.SmartRiskV11Router?.normalizeRoute?.(location.hash) || "inicio";
  }

  function bottomNavigation() {
    let nav = $("#sr15BottomNav");
    if (!nav) {
      nav = document.createElement("nav");
      nav.id = "sr15BottomNav";
      nav.className = "sr15-bottom-nav";
      nav.setAttribute("aria-label", "Navegación móvil");
      document.body.append(nav);
    }
    const route = activeRoute();
    const directRoutes = new Set(NAV.map(item => item.id));
    const active = directRoutes.has(route) ? route : "more";
    if (nav.dataset.active === active && nav.childElementCount === NAV.length) return;
    nav.dataset.active = active;
    nav.innerHTML = NAV.map(item => `<button type="button" data-sr15-route="${item.id}" class="${item.id === active ? "active" : ""}" aria-label="${item.label}">${icon(item.icon)}<span>${item.label}</span></button>`).join("");
  }

  function hierarchySelector() {
    if (!['inicio', 'dashboard'].includes(activeRoute())) return;
    const content = $("#content");
    if (!content || content.querySelector("[data-sr15-hierarchy]")) return;
    const state = appState();
    const province = state.filters?.provincia || "Todas las provincias";
    const canton = state.filters?.canton || "Todos los cantones";
    const panel = document.createElement("section");
    panel.className = "sr15-hierarchy";
    panel.dataset.sr15Hierarchy = "true";
    panel.innerHTML = `<div><small>Territorio seleccionado</small><b>Zona 5</b><span>${province} · ${canton}</span></div><button type="button" data-sr15-territory>${icon("map", 20)}<span>Elegir zona, provincia o cantón</span></button>`;
    const anchor = content.querySelector(".sr-dashboard-filter, .sr8-dashboard-controls, .sr8-controls, section");
    content.insertBefore(panel, anchor || content.firstChild);
  }

  function mapFieldFlows() {
    if (activeRoute() !== "mapas") return;
    const content = $("#content");
    if (!content || content.querySelector("[data-sr15-field-flows]")) return;
    const panel = document.createElement("section");
    panel.className = "sr15-field-flows";
    panel.dataset.sr15FieldFlows = "true";
    panel.innerHTML = `<header><div><small>Levantamiento y seguimiento territorial</small><h2>Dos registros, dos propósitos</h2><p>El alta de un sitio crítico no reemplaza el seguimiento de una acción asignada.</p></div></header><div><article><span>${icon("map", 25)}</span><div><b>Registrar nuevo sitio</b><p>Reporta una zona, punto o tramo crítico mediante el formulario territorial.</p></div><a href="${KOBO_SITE}" target="_blank" rel="noopener">Abrir Kobo ↗</a></article><article><span>${icon("actions", 25)}</span><div><b>Actualizar una acción</b><p>Registra avance, foto, documento verificable o estado de una acción existente.</p></div><a href="${KOBO_ACTION}" target="_blank" rel="noopener">Actualizar F07 ↗</a></article></div>`;
    content.prepend(panel);
  }

  function territoryLanguage() {
    if (activeRoute() !== "dashboard") return;
    const heading = $("#srHeader h1");
    const subtitle = $("#srHeader .sr-heading-copy > p");
    if (heading) heading.textContent = "Territorio";
    if (subtitle) subtitle.textContent = "Planes, sitios críticos, acciones, presupuesto y brechas";
  }

  function updateBrand() {
    document.documentElement.dataset.smartRiskUi = "rc15";
    document.body.classList.add("sr15-enabled");
    const subtitle = $(".sr-brand span");
    if (subtitle) subtitle.textContent = "SNGR · Gestión de Riesgos";
  }

  function closeMenu() {
    $("#app")?.classList.remove("sr15-menu-open");
  }

  function bind() {
    if (runtime.bound) return;
    runtime.bound = true;
    document.addEventListener("click", event => {
      const nav = event.target.closest("[data-sr15-route]");
      if (nav) {
        if (nav.dataset.sr15Route === "more") $("#app")?.classList.toggle("sr15-menu-open");
        else { closeMenu(); location.hash = `#/${nav.dataset.sr15Route}`; }
        return;
      }
      if (event.target.closest("[data-sr15-territory]")) {
        if (activeRoute() !== "dashboard") location.hash = "#/dashboard";
        else $(".sr8-dashboard-controls, .sr8-controls, .sr-dashboard-filter, #srProvince")?.scrollIntoView?.({ behavior: "smooth", block: "center" });
        return;
      }
      if (event.target.closest("#nav [data-route]")) closeMenu();
      if ($("#app")?.classList.contains("sr15-menu-open") && !event.target.closest(".sr-sidebar") && !event.target.closest("#sr15BottomNav")) closeMenu();
    });
    window.addEventListener("hashchange", () => schedule());
  }

  function enhance() {
    runtime.scheduled = false;
    updateBrand();
    bottomNavigation();
    hierarchySelector();
    mapFieldFlows();
    territoryLanguage();
  }

  function schedule() {
    if (runtime.scheduled) return;
    runtime.scheduled = true;
    requestAnimationFrame(enhance);
  }

  function afterAppStart() {
    bind();
    runtime.observer = new MutationObserver(schedule);
    runtime.observer.observe(document.body, { childList: true, subtree: true });
    schedule();
  }

  window.SmartRiskV11MobileRC15 = { VERSION, KOBO_SITE, KOBO_ACTION, afterAppStart };
})();
