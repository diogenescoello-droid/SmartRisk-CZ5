(() => {
  "use strict";

  const nav = document.querySelector("#nav");
  if (!nav) return;

  const stateKey = "smartrisk-rc13-menu-state";
  let scheduled = false;

  const legacyGroups = [
    {
      id: "transversal",
      title: "Funciones transversales",
      items: [
        { page: "dashboard", label: "Panorama e indicadores", hint: "Visión zonal y métricas clave" },
        { page: "decisiones", label: "Centro de decisiones", hint: "Alertas, brechas y control" }
      ]
    },
    {
      id: "planificacion",
      title: "1 · Planificación documental",
      items: [
        { page: "revision", label: "Planes, checklist y brechas", hint: "Revisión, cumplimiento y ajustes" },
        { page: "acciones", label: "Seguimiento e informes", hint: "Acciones, evidencia e indicadores" }
      ]
    },
    {
      id: "analisis",
      title: "2 · Análisis y monitoreo",
      items: [
        { page: "territorios", label: "Estado de GAD", hint: "Cobertura y capacidad territorial" },
        { page: "sitios", label: "Sitios y polígonos", hint: "Condiciones y zonas de riesgo" },
        { page: "herramientas", label: "Mapa, capas y tableros", hint: "Cartografía y monitoreo" }
      ]
    },
    {
      id: "respuesta",
      title: "3 · Respuesta operativa",
      items: [
        { page: "usuarios", label: "COE y actores", hint: "Responsables y flujo de información" },
        { page: "instituciones", label: "Mesas técnicas", hint: "Coordinación, productos y tareas" },
        { page: "cabina", label: "Monitoreo operativo", hint: "Conducción territorial del COE", synthetic: true },
        { page: "recursos", label: "Recursos operativos", hint: "Inventario y disponibilidad · pendiente", disabled: true }
      ]
    }
  ];

  function normalize(value) {
    return String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  }

  function readState() {
    try {
      return JSON.parse(localStorage.getItem(stateKey) || "{}");
    } catch {
      return {};
    }
  }

  function writeState(value) {
    localStorage.setItem(stateKey, JSON.stringify(value));
  }

  function makeToggle(groupId, title) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = "rc13-module-toggle";
    button.dataset.rc13Toggle = groupId;
    button.textContent = title;
    return button;
  }

  function makeSection(group, buttons) {
    const section = document.createElement("section");
    section.className = "rc13-nav-module";
    section.dataset.rc13Module = group.id;

    const state = readState();
    const collapsed = Boolean(state[group.id]);
    if (collapsed) section.classList.add("is-collapsed");

    const toggle = makeToggle(group.id, group.title);
    toggle.setAttribute("aria-expanded", String(!collapsed));

    const items = document.createElement("div");
    items.className = "rc13-module-items";
    buttons.forEach(button => items.append(button));

    section.append(toggle, items);
    return section;
  }

  function preparePageButton(button, item) {
    button.type = "button";
    button.classList.add("rc13-nav-item");
    button.textContent = item.label;
    button.dataset.rc13Hint = item.hint;
    button.setAttribute("aria-label", `${item.label}. ${item.hint}`);
    return button;
  }

  function legacyNavigation() {
    const directButtons = [...nav.querySelectorAll(":scope > button[data-page]")];
    if (!directButtons.length) return false;

    const pageButtons = new Map(directButtons.map(button => [button.dataset.page, button]));
    const fullAdministrativeMenu = ["usuarios", "instituciones", "revision", "herramientas"]
      .every(page => pageButtons.has(page));

    const shell = document.createElement("div");
    shell.className = "rc13-nav-shell";

    legacyGroups.forEach(group => {
      const buttons = [];

      group.items.forEach(item => {
        let button = pageButtons.get(item.page);

        if (!button && item.synthetic && fullAdministrativeMenu) {
          button = document.createElement("button");
          button.dataset.page = item.page;
        }

        if (item.disabled && fullAdministrativeMenu) {
          button = document.createElement("button");
          button.disabled = true;
          button.className = "rc13-nav-item rc13-nav-placeholder";
        }

        if (!button) return;
        buttons.push(preparePageButton(button, item));
      });

      if (buttons.length) shell.append(makeSection(group, buttons));
    });

    nav.replaceChildren(shell);
    nav.dataset.rc13Mode = "legacy";
    return true;
  }

  function scopedCategory(label) {
    const value = normalize(label);
    if (/plan|revision|cumpl|brecha|accion|informe|document/.test(value)) return "planificacion";
    if (/territ|sitio|riesgo|mapa|capa|alert|indicador|monitor|cartograf/.test(value)) return "analisis";
    if (/coe|mesa|actor|institu|recurso|operativ|respuesta|coordin/.test(value)) return "respuesta";
    return "otros";
  }

  function scopedNavigation() {
    const directButtons = [...nav.querySelectorAll(":scope > button[data-scope-page]")];
    if (!directButtons.length) return false;

    const groups = {
      transversal: { id: "transversal", title: "Funciones transversales", buttons: [] },
      planificacion: { id: "planificacion", title: "1 · Planificación documental", buttons: [] },
      analisis: { id: "analisis", title: "2 · Análisis y monitoreo", buttons: [] },
      respuesta: { id: "respuesta", title: "3 · Respuesta operativa", buttons: [] },
      otros: { id: "otros", title: "Otros registros autorizados", buttons: [] }
    };

    directButtons.forEach(button => {
      const original = button.textContent.trim();
      const page = button.dataset.scopePage;
      const category = page === "dashboard" || page === "all"
        ? "transversal"
        : scopedCategory(original);

      const label = page === "dashboard"
        ? "Panorama territorial"
        : page === "all"
          ? "Todos los registros"
          : original;

      preparePageButton(button, {
        label,
        hint: page === "dashboard"
          ? "Indicadores del alcance autorizado"
          : page === "all"
            ? "Consulta consolidada de solo lectura"
            : "Información limitada al alcance autorizado"
      });
      groups[category].buttons.push(button);
    });

    const shell = document.createElement("div");
    shell.className = "rc13-nav-shell";
    Object.values(groups).forEach(group => {
      if (group.buttons.length) shell.append(makeSection(group, group.buttons));
    });

    nav.replaceChildren(shell);
    nav.dataset.rc13Mode = "scoped";
    return true;
  }

  function decorateBrand() {
    const subtitle = document.querySelector(".brand span");
    if (subtitle) subtitle.textContent = "CZ5 · Arquitectura funcional RC13";
    document.documentElement.dataset.smartRiskMenu = "rc13";
  }

  function apply() {
    scheduled = false;
    if (nav.querySelector(":scope > .rc13-nav-shell")) return;
    if (legacyNavigation() || scopedNavigation()) decorateBrand();
  }

  function scheduleApply() {
    if (scheduled) return;
    scheduled = true;
    queueMicrotask(apply);
  }

  nav.addEventListener("click", event => {
    const toggle = event.target.closest("[data-rc13-toggle]");
    if (!toggle) return;

    const section = toggle.closest(".rc13-nav-module");
    if (!section) return;

    const collapsed = section.classList.toggle("is-collapsed");
    toggle.setAttribute("aria-expanded", String(!collapsed));

    const state = readState();
    state[toggle.dataset.rc13Toggle] = collapsed;
    writeState(state);
  });

  new MutationObserver(scheduleApply).observe(nav, { childList: true });
  scheduleApply();

  window.SMART_RISK_MENU_RC13 = {
    version: "13.0.0",
    strategy: "presentation-layer",
    preservesRoutes: true,
    preservesPermissions: true
  };
})();
