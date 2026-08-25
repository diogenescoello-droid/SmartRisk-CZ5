(() => {
  "use strict";

  const VERSION = "2026.08.25.1";
  const STATE_KEY = "smartrisk-desktop-more-collapsed";
  let scheduled = false;

  const PRIMARY = [
    { route: "inicio", label: "Inicio" },
    { route: "dashboard", label: "Territorio" },
    { route: "riesgos", label: "Riesgos" },
    { route: "acciones", label: "Acciones" },
    { route: "monitoreo", label: "Monitoreo" },
    { route: "coe", label: "COE" },
    { route: "reportes", label: "Documentos e informes" },
    { route: "mapas", label: "Mapas" }
  ];

  const ADVANCED = [
    { route: "respuesta-coe", label: "Respuesta operativa" },
    { route: "instituciones", label: "Mesas e instituciones" },
    { route: "herramientas", label: "Herramientas y auditoría" },
    { route: "configuracion", label: "Configuración" }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);

  function isDesktop() {
    return window.SmartRiskDeviceMode?.isSmart?.() !== true;
  }

  function currentRoute() {
    const stateRoute = window.SmartRiskV11App?.state?.route;
    if (stateRoute) return String(stateRoute);
    const hash = String(location.hash || "").replace(/^#\/?/, "").split(/[?&]/)[0];
    return hash || "inicio";
  }

  function setLabel(button, label) {
    if (!button) return;
    const span = button.querySelector("span");
    if (span) span.textContent = label;
    else {
      const textNodes = [...button.childNodes].filter(node => node.nodeType === Node.TEXT_NODE);
      if (textNodes.length) textNodes.at(-1).textContent = ` ${label}`;
      else button.append(document.createTextNode(label));
    }
    button.classList.add("sr-desktop-nav-item");
    button.dataset.desktopLabel = label;
    button.removeAttribute("data-rc13-hint");
    button.setAttribute("aria-label", label);
  }

  function takeButtons(shell) {
    const buttons = [...shell.querySelectorAll("button[data-route]")];
    return new Map(buttons.map(button => [button.dataset.route, button]));
  }

  function readCollapsed() {
    try {
      const stored = localStorage.getItem(STATE_KEY);
      return stored === null ? true : stored !== "false";
    } catch {
      return true;
    }
  }

  function writeCollapsed(value) {
    try { localStorage.setItem(STATE_KEY, String(Boolean(value))); } catch (_) {}
  }

  function buildPrimary(buttons) {
    const primary = document.createElement("div");
    primary.className = "sr-desktop-nav-primary";
    PRIMARY.forEach(item => {
      const button = buttons.get(item.route);
      if (!button) return;
      setLabel(button, item.label);
      primary.append(button);
      buttons.delete(item.route);
    });
    return primary;
  }

  function buildAdvanced(buttons) {
    const section = document.createElement("section");
    section.className = "sr-desktop-nav-advanced";

    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "sr-desktop-nav-more";
    toggle.dataset.desktopMore = "1";
    toggle.innerHTML = `<span>Más gestión</span><span class="sr-desktop-chevron">⌄</span>`;

    const items = document.createElement("div");
    items.className = "sr-desktop-nav-advanced-items";

    ADVANCED.forEach(item => {
      const button = buttons.get(item.route);
      if (!button) return;
      setLabel(button, item.label);
      items.append(button);
      buttons.delete(item.route);
    });

    // Conserva cualquier ruta autorizada que aparezca en futuras extensiones.
    buttons.forEach((button, route) => {
      const current = button.querySelector("span")?.textContent?.trim() || button.textContent.trim() || route;
      setLabel(button, current);
      items.append(button);
    });

    const collapsed = readCollapsed();
    section.classList.toggle("is-collapsed", collapsed);
    toggle.setAttribute("aria-expanded", String(!collapsed));
    section.append(toggle, items);
    return section;
  }

  function decorateBrand() {
    const subtitle = $(".sr-brand span");
    if (subtitle) subtitle.textContent = "Gestión territorial · Zona 5";
    const legacySubtitle = $(".brand span");
    if (legacySubtitle) legacySubtitle.textContent = "CZ5 · Gestión territorial";
  }

  function updateContext() {
    const route = currentRoute();
    document.body.classList.toggle("sr-desktop-home", route === "inicio" || route === "dashboard");
    document.body.dataset.desktopRoute = route;
  }

  function apply() {
    scheduled = false;
    updateContext();
    if (!isDesktop()) {
      document.body.classList.remove("sr-desktop-extension", "sr-desktop-home");
      return;
    }

    const app = $("#app.v11-shell");
    const nav = $("#nav");
    const shell = nav?.querySelector(":scope > .rc13-nav-shell");
    if (!app || !nav || !shell) return;

    document.body.classList.add("sr-desktop-extension");
    decorateBrand();

    if (shell.dataset.desktopExtension === VERSION) return;

    const buttons = takeButtons(shell);
    if (!buttons.size) return;

    const primary = buildPrimary(buttons);
    const divider = document.createElement("div");
    divider.className = "sr-desktop-nav-divider";
    const advanced = buildAdvanced(buttons);

    shell.replaceChildren(primary, divider, advanced);
    shell.classList.add("sr-desktop-nav-shell");
    shell.dataset.desktopExtension = VERSION;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  document.addEventListener("click", event => {
    const toggle = event.target.closest("[data-desktop-more]");
    if (!toggle || !isDesktop()) return;
    const section = toggle.closest(".sr-desktop-nav-advanced");
    if (!section) return;
    const collapsed = section.classList.toggle("is-collapsed");
    toggle.setAttribute("aria-expanded", String(!collapsed));
    writeCollapsed(collapsed);
  });

  window.addEventListener("hashchange", schedule);
  window.addEventListener("resize", schedule);
  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class", "data-smart-risk-device"]
  });

  schedule();

  window.SmartRiskDesktopExtension = {
    VERSION,
    primaryRoutes: PRIMARY.map(item => item.route),
    advancedRoutes: ADVANCED.map(item => item.route),
    strategy: "same-architecture-deeper-interaction",
    preservesRoutes: true,
    preservesPermissions: true
  };
})();
