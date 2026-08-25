(() => {
  "use strict";

  const VERSION = "2026.08.25.3";
  const STATE_KEY = "smartrisk-desktop-more-collapsed";
  const BOOTSTRAP_MAX = 40;
  let scheduled = false;
  let delayedTimer = null;
  let bootstrapCount = 0;

  // Los cuatro primeros conceptos coinciden con la navegación Smart.
  // Escritorio los extiende con análisis y gestión, sin crear rutas paralelas.
  const PRIMARY = [
    { route: "inicio", label: "Inicio" },
    { route: "dashboard", label: "Territorio" },
    { route: "mapas", label: "Mapa" },
    { route: "acciones", label: "Acciones" },
    { route: "riesgos", label: "Riesgos" },
    { route: "monitoreo", label: "Monitoreo" },
    { route: "coe", label: "COE" },
    { route: "reportes", label: "Documentos e informes" }
  ];

  const ADVANCED = [
    { route: "respuesta-coe", label: "Respuesta operativa" },
    { route: "instituciones", label: "Mesas e instituciones" },
    { route: "herramientas", label: "Herramientas y auditoría" },
    { route: "configuracion", label: "Configuración" }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);

  function isDesktop() {
    if (window.SmartRiskDeviceMode?.isSmart) return window.SmartRiskDeviceMode.isSmart() !== true;
    return document.documentElement.dataset.smartRiskDevice !== "smart";
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
    button.classList.remove("rc13-nav-item");
    button.dataset.desktopLabel = label;
    button.removeAttribute("data-rc13-hint");
    button.setAttribute("aria-label", label);
  }

  function takeButtons(root) {
    return new Map(
      [...root.querySelectorAll("button[data-route]")]
        .map(button => [button.dataset.route, button])
    );
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

    // Cualquier ruta futura autorizada se conserva; no se modifica el contrato de permisos.
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
    const title = $(".sr-brand b");
    if (title) title.textContent = "SmartRisk CZ5";
    const subtitle = $(".sr-brand span");
    if (subtitle) subtitle.textContent = "Gestión de riesgos · Zona 5";
    const legacyTitle = $(".brand b");
    if (legacyTitle) legacyTitle.textContent = "SmartRisk CZ5";
    const legacySubtitle = $(".brand span");
    if (legacySubtitle) legacySubtitle.textContent = "Gestión de riesgos · Zona 5";
  }

  function decoratePageHeading(route) {
    const title = $(".sr-page-heading h1");
    const subtitle = $(".sr-page-heading p");
    if (route === "inicio") {
      if (title) title.textContent = "Inicio";
      if (subtitle) subtitle.textContent = "Situación, prioridades y accesos del alcance autorizado";
    } else if (route === "dashboard") {
      if (title) title.textContent = "Territorio";
      if (subtitle) subtitle.textContent = "Lectura zonal, provincial y cantonal para análisis y gestión";
    }
  }

  function enhanceExecutiveHome(route) {
    const content = $("#content");
    if (!content) return;
    content.classList.toggle("sr-desktop-executive-home", route === "inicio");
    content.classList.toggle("sr-desktop-territory-workspace", route === "dashboard");

    if (route !== "inicio") return;

    // RC12 sigue disponible en Documentos y demás módulos, pero no compite con
    // la lectura ejecutiva en Inicio de escritorio.
    content.querySelectorAll(".sr12-cycle,.sr12-monitor-strip").forEach(node => {
      node.dataset.desktopSecondary = "true";
    });

    const intro = $(".sr-dashboard-intro", content);
    if (intro) {
      intro.classList.add("sr-desktop-executive-hero");
      const heading = $("b", intro);
      const copy = $("p", intro);
      if (heading) heading.textContent = "Centro de operaciones territorial";
      if (copy) copy.textContent = "Situación actual, prioridades y accesos para decidir y continuar el trabajo.";
    }

    const filter = $(".sr-dashboard-filter", content);
    if (filter) filter.dataset.desktopSection = "scope";

    const kpis = $(".sr-dashboard-kpis", content);
    if (kpis) kpis.dataset.desktopSection = "kpis";

    const operationalTitle = $(".sr-dashboard-operational header h2", content);
    const operationalCopy = $(".sr-dashboard-operational header p", content);
    if (operationalTitle) operationalTitle.textContent = "Operación inmediata";
    if (operationalCopy) operationalCopy.textContent = "Entradas directas a los módulos del mismo ciclo SmartRisk.";
  }

  function updateContext() {
    const route = currentRoute();
    document.body.classList.toggle("sr-desktop-home", route === "inicio");
    document.body.classList.toggle("sr-desktop-territory", route === "dashboard");
    document.body.dataset.desktopRoute = route;
    decoratePageHeading(route);
    enhanceExecutiveHome(route);
    return route;
  }

  // Acepta tanto navegación V11 directa como navegación ya envuelta por RC13.
  // Así se evita la carrera observada al iniciar sesión o cambiar de ruta.
  function ensureShell(nav) {
    let shell = nav.querySelector(":scope > .rc13-nav-shell");
    if (shell) return shell;

    const buttons = [...nav.querySelectorAll("button[data-route]")];
    if (!buttons.length) return null;

    shell = document.createElement("div");
    shell.className = "rc13-nav-shell";
    buttons.forEach(button => shell.append(button));
    nav.replaceChildren(shell);
    return shell;
  }

  function desktopApplied(nav) {
    const shell = nav?.querySelector(":scope > .rc13-nav-shell.sr-desktop-nav-shell");
    return Boolean(shell && shell.dataset.desktopExtension === VERSION);
  }

  function apply() {
    scheduled = false;
    const route = updateContext();

    if (!isDesktop()) {
      document.body.classList.remove("sr-desktop-extension", "sr-desktop-home", "sr-desktop-territory");
      $("#content")?.classList.remove("sr-desktop-executive-home", "sr-desktop-territory-workspace");
      return;
    }

    const nav = $("#nav");
    const app = $("#app.v11-shell") || (document.body.classList.contains("v11-enabled") ? $("#app") : null);
    if (!app || !nav) {
      scheduleDelayed();
      return;
    }

    const shell = ensureShell(nav);
    if (!shell) {
      scheduleDelayed();
      return;
    }

    document.body.classList.add("sr-desktop-extension");
    decorateBrand();
    decoratePageHeading(route);
    enhanceExecutiveHome(route);

    if (shell.dataset.desktopExtension === VERSION && shell.classList.contains("sr-desktop-nav-shell")) return;

    const buttons = takeButtons(shell);
    if (!buttons.size) {
      scheduleDelayed();
      return;
    }

    const primary = buildPrimary(buttons);
    const divider = document.createElement("div");
    divider.className = "sr-desktop-nav-divider";
    const advanced = buildAdvanced(buttons);

    shell.replaceChildren(primary, divider, advanced);
    shell.classList.add("sr-desktop-nav-shell");
    shell.dataset.desktopExtension = VERSION;
    nav.dataset.desktopNavigation = VERSION;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  function scheduleDelayed() {
    if (delayedTimer || bootstrapCount >= BOOTSTRAP_MAX) return;
    delayedTimer = setTimeout(() => {
      delayedTimer = null;
      bootstrapCount += 1;
      schedule();
    }, 125);
  }

  function bootstrap() {
    schedule();
    const nav = $("#nav");
    if (!desktopApplied(nav) && bootstrapCount < BOOTSTRAP_MAX) scheduleDelayed();
  }

  document.addEventListener("click", event => {
    const toggle = event.target.closest("[data-desktop-more]");
    if (toggle && isDesktop()) {
      const section = toggle.closest(".sr-desktop-nav-advanced");
      if (!section) return;
      const collapsed = section.classList.toggle("is-collapsed");
      toggle.setAttribute("aria-expanded", String(!collapsed));
      writeCollapsed(collapsed);
      return;
    }

    if (event.target.closest("#nav [data-route]")) {
      setTimeout(schedule, 0);
      setTimeout(schedule, 80);
    }
  }, true);

  window.addEventListener("hashchange", () => {
    bootstrapCount = 0;
    schedule();
    scheduleDelayed();
  });
  window.addEventListener("resize", schedule);
  window.addEventListener("load", bootstrap);
  document.addEventListener("DOMContentLoaded", bootstrap);

  new MutationObserver(schedule).observe(document.body, {
    childList: true,
    subtree: true,
    attributes: true,
    attributeFilter: ["class"]
  });

  new MutationObserver(() => {
    bootstrapCount = 0;
    schedule();
  }).observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-smart-risk-device"]
  });

  bootstrap();

  window.SmartRiskDesktopExtension = {
    VERSION,
    primaryRoutes: PRIMARY.map(item => item.route),
    advancedRoutes: ADVANCED.map(item => item.route),
    strategy: "executive-desktop-reconciles-rc13-v11",
    preservesRoutes: true,
    preservesPermissions: true,
    preservesDataContracts: true
  };
})();
