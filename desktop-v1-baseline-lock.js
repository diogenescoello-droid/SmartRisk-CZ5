(() => {
  "use strict";

  const VERSION = "2026.08.26.1";
  const BASELINE = "754ef8ffea70812ea493c9f75dc48608e2953af9";
  const FALLBACK_F07 = new Date("2026-08-24T12:00:00-05:00");
  let scheduled = false;
  let allowedRoutes = new Set();

  const ROUTES = {
    inicio: { title: "Inicio", subtitle: "Supervisión y resumen para decisión" },
    dashboard: { title: "Territorio", subtitle: "Ficha territorial integrada y expediente técnico" },
    mapas: { title: "Mapa", subtitle: "Lectura territorial, capas y trabajo de campo" },
    acciones: { title: "Acciones", subtitle: "Seguimiento multinivel, responsables y evidencia" },
    riesgos: { title: "Riesgos y sitios", subtitle: "Amenazas, exposición, vulnerabilidad y sitios reportados" },
    reportes: { title: "Planes y revisión", subtitle: "Plan oficial, criterios, brechas y verificables" },
    coe: { title: "COE y actores", subtitle: "Sesiones, decisiones y coordinación institucional" },
    instituciones: { title: "Mesas técnicas", subtitle: "Instituciones, competencias y responsables" },
    monitoreo: { title: "Reportes y fuentes", subtitle: "Productos oficiales, formularios, fuentes y evidencias" },
    herramientas: { title: "Auditoría y configuración", subtitle: "Calidad, trazabilidad, perfil y alcance autorizado" },
    configuracion: { title: "Auditoría y configuración", subtitle: "Calidad, trazabilidad, perfil y alcance autorizado" }
  };

  const MENU = [
    ["inicio", "Inicio"],
    ["dashboard", "Territorio"],
    ["mapas", "Mapa"],
    ["acciones", "Acciones"],
    ["riesgos", "Riesgos y sitios"],
    ["reportes", "Planes y revisión"],
    ["coe", "COE y actores"],
    ["instituciones", "Mesas técnicas"],
    ["monitoreo", "Reportes y fuentes"],
    ["audit", "Auditoría y configuración"]
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
  const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const uniq = values => [...new Set((values || []).filter(Boolean))].sort((a, b) => String(a).localeCompare(String(b), "es"));

  function isDesktop() {
    if (window.SmartRiskDeviceMode?.isSmart) return window.SmartRiskDeviceMode.isSmart() !== true;
    return document.documentElement.dataset.smartRiskDevice !== "smart";
  }

  function appState() { return window.SmartRiskV11App?.state || {}; }
  function allRecords() { return appState().data?.records || []; }
  function entity(key) { return appState().data?.entities?.[key] || []; }
  function extensionVersion() { return window.SmartRiskDesktopExtension?.VERSION || "2026.08.25.8"; }

  function currentRoute() {
    const hash = String(location.hash || "").replace(/^#\/?/, "").split(/[?&]/)[0];
    return hash || String(appState().route || "inicio");
  }

  function captureAllowedRoutes() {
    const nav = $("#nav");
    if (!nav) return;
    [...nav.querySelectorAll("button[data-route]")].forEach(button => {
      if (button.dataset.route) allowedRoutes.add(button.dataset.route);
    });
  }

  function auditRoute() {
    if (allowedRoutes.has("herramientas")) return "herramientas";
    if (allowedRoutes.has("configuracion")) return "configuracion";
    return "herramientas";
  }

  function menuRoute(key) { return key === "audit" ? auditRoute() : key; }
  function routeIsVisible(route) {
    if (!allowedRoutes.size) return true;
    if (route === "herramientas" || route === "configuracion") return allowedRoutes.has(route) || allowedRoutes.has("herramientas") || allowedRoutes.has("configuracion");
    return allowedRoutes.has(route);
  }

  function scoped(list) {
    const f = appState().filters || {};
    return (list || []).filter(item =>
      (!f.provincia || norm(item.provincia) === norm(f.provincia)) &&
      (!f.canton || norm(item.canton) === norm(f.canton))
    );
  }

  function amountOf(record) {
    const source = record?.payload || {};
    const raw = record?.presupuesto ?? record?.monto ?? source.presupuesto ?? source.monto ?? source.presupuestoReferencial ?? source.presupuesto_referencial;
    if (raw === null || raw === undefined || raw === "") return 0;
    const cleaned = String(raw).replace(/[^0-9,.-]/g, "").replace(/,/g, ".");
    const value = Number(cleaned);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function currency(value) {
    try { return new Intl.NumberFormat("es-EC", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value); }
    catch { return `$${Math.round(value).toLocaleString("es-EC")}`; }
  }

  function metrics() {
    const sites = scoped(entity("criticalSites"));
    const risks = scoped(entity("risks"));
    const actions = scoped(entity("actions"));
    const breaches = scoped(entity("breaches"));
    const plans = scoped(entity("plans"));
    const reports = scoped(entity("monitoringReports"));
    const documents = scoped(entity("reports"));
    const solved = breaches.filter(item => /solv|cerr|resuelt|complet|valid/.test(norm(`${item.estado} ${item.detail}`))).length;
    const active = Math.max(0, breaches.length - solved);
    const budget = actions.reduce((sum, item) => sum + amountOf(item), 0);
    return { sites, risks, actions, breaches, plans, reports, documents, solved, active, budget };
  }

  function territoryOptions() {
    const rows = allRecords();
    const provinces = uniq(rows.map(row => row.provincia));
    const selectedProvince = appState().filters?.provincia || provinces[0] || "";
    const cantons = uniq(rows.filter(row => !selectedProvince || norm(row.provincia) === norm(selectedProvince)).map(row => row.canton));
    return { provinces, cantons, selectedProvince };
  }

  function levelOfScope() {
    const f = appState().filters || {};
    if (f.canton) return "canton";
    if (f.provincia) return "provincia";
    return "zona";
  }

  function scopeText() {
    const f = appState().filters || {};
    if (!f.provincia) return "Zona 5";
    if (!f.canton) return `${f.provincia} · Zona 5`;
    return `${f.canton} · ${f.provincia} · Zona 5`;
  }

  function selectOptions(items, selected) {
    return (items || []).map(item => `<option value="${esc(item)}" ${norm(item) === norm(selected) ? "selected" : ""}>${esc(item)}</option>`).join("");
  }

  function latestF07Date() {
    const dates = allRecords()
      .filter(item => /\bf07\b|seguimiento de acciones/.test(norm(`${item.tipo} ${item.title} ${item.detail} ${JSON.stringify(item.payload || {})}`)))
      .map(item => item.updatedAt || item.createdAt || item.payload?.fecha || item.payload?.fechaActualizacion || item.payload?.fecha_actualizacion)
      .map(value => value ? new Date(value) : null)
      .filter(date => date && !Number.isNaN(date.getTime()));
    if (!dates.length) return FALLBACK_F07;
    return new Date(Math.max(...dates.map(date => date.getTime())));
  }

  function formatDateEs(date) {
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  function f07Label() { return `Corte F07 · ${formatDateEs(latestF07Date())}`; }

  function roleLabel() {
    const state = appState();
    return state.profileContext?.roleLabel || state.profile?.roleLabel || state.profile?.rol || "Usuario autorizado";
  }

  function buildScopePanel() {
    const state = appState();
    const f = state.filters || {};
    const level = levelOfScope();
    const { provinces, cantons, selectedProvince } = territoryOptions();
    const selectedCanton = f.canton || cantons[0] || "";
    return `<section class="v1-scope-panel v1-ref-scope">
      <div class="v1-scope-heading v1-ref-scope-head">
        <div><span class="v1-eyebrow">Alcance de los indicadores</span><h3>${esc(scopeText())}</h3></div>
        <span class="v1-ref-badge">Selección jerárquica</span>
      </div>
      <div class="v1-scope-grid v1-ref-scope-grid">
        <label>Nivel territorial<select id="v1Level"><option value="zona" ${level === "zona" ? "selected" : ""}>Zona</option><option value="provincia" ${level === "provincia" ? "selected" : ""}>Provincia</option><option value="canton" ${level === "canton" ? "selected" : ""}>Cantón</option></select></label>
        <label>Provincia<select id="v1Province" ${level === "zona" ? "disabled" : ""}>${selectOptions(provinces, selectedProvince)}</select></label>
        <label>Cantón<select id="v1Canton" ${level !== "canton" ? "disabled" : ""}>${selectOptions(cantons, selectedCanton)}</select></label>
      </div>
    </section>`;
  }

  function buildHome() {
    const m = metrics();
    return `${buildScopePanel()}
      <section class="v1-lead v1-ref-risk-lead">
        <div><span class="v1-eyebrow">Pregunta rectora</span><h3>¿Qué se reportó, qué se asignó y qué falta solventar?</h3><p>La información técnica permanece disponible en el detalle, igual que en Smart móvil, con mayor profundidad de análisis en escritorio.</p></div>
        <button type="button" data-v1-route="dashboard">Abrir territorio</button>
      </section>
      <section class="v1-kpis v1-ref-cards">
        <article class="v1-ref-card"><span>Sitios reportados</span><strong>${m.sites.length}</strong><small>${m.risks.length} registros de riesgo asociados</small><button data-v1-route="riesgos">Abrir detalle →</button></article>
        <article class="v1-ref-card"><span>Acciones vinculadas</span><strong>${m.actions.length}</strong><small>Acciones vinculadas y trazables</small><button data-v1-route="acciones">Abrir detalle →</button></article>
        <article class="v1-ref-card"><span>Presupuesto verificable</span><strong>${m.budget ? currency(m.budget) : "—"}</strong><small>Solo valores estructurados y verificables</small><button data-v1-route="acciones">Abrir presupuesto →</button></article>
        <article class="v1-ref-card"><span>Brechas de seguimiento</span><strong>${m.active}</strong><div class="v1-ref-gapbar"><i></i><i></i></div><small>${m.active} activas · ${m.solved} solventadas</small><button data-v1-route="reportes">Abrir brechas →</button></article>
      </section>
      <p class="v1-ref-source-note"><b>Corte vigente:</b> ${esc(f07Label())}. Los datos respetan el perfil y alcance autorizado.</p>
      <section class="v1-workspace-grid v1-ref-dashboard-grid">
        <article class="v1-panel v1-ref-panel">
          <header><h3>Territorio seleccionado</h3><span class="v1-ref-badge">Plan ENOS 2026–2027</span></header>
          <div class="v1-ref-territory-body"><div><span class="v1-ref-territory-pin">⌖</span><div><b>${esc(scopeText())}</b><small>Plan, revisión, sitios, acciones, presupuesto y evidencias en un solo expediente.</small></div></div><button data-v1-route="dashboard">Abrir ficha territorial</button></div>
        </article>
        <article class="v1-panel v1-ref-panel v1-decisions">
          <header><h3>Preguntas para decidir</h3></header>
          <ul><li>¿Qué sitios requieren atención?</li><li>¿Qué acciones están pendientes o en ejecución?</li><li>¿Qué brechas siguen activas?</li><li>¿Qué evidencia falta verificar?</li></ul>
        </article>
      </section>`;
  }

  function buildTerritory() {
    return `${buildScopePanel()}
      <section class="v1-territory-intro v1-ref-module-intro">
        <div><span class="v1-eyebrow">Ficha territorial integrada</span><h3>${esc(scopeText())}</h3><p>La versión de escritorio conserva las mismas puertas de entrada del celular, pero permite abrir el expediente, comparar fuentes y trabajar con mayor detalle.</p></div>
        <span class="v1-ref-badge">Plan ENOS 2026–2027</span>
      </section>
      <article class="v1-panel v1-territory-panel v1-ref-panel">
        <header><h3>Plan y revisión técnica</h3><span class="v1-panel-status v1-ref-badge">${esc(f07Label())}</span></header>
        <div class="v1-territory-grid v1-ref-quick-actions">
          <button data-v1-route="reportes"><b>↗</b><span>PDF</span><small>Plan oficial</small></button>
          <button data-v1-route="reportes"><b>✓</b><span>Criterios</span><small>Revisión técnica</small></button>
          <button data-v1-route="reportes"><b>!</b><span>Brechas</span><small>Activas / solventadas</small></button>
          <button data-v1-route="acciones"><b>↻</b><span>Seguimiento</span><small>Avance y control</small></button>
        </div>
      </article>
      <article class="v1-panel v1-territory-panel v1-ref-panel v1-ref-section-gap">
        <header><h3>Gestión del territorio</h3><span class="v1-panel-status v1-ref-badge">Extensión de Smart móvil</span></header>
        <div class="v1-territory-grid management v1-ref-quick-actions v1-ref-management-actions">
          <button data-v1-route="riesgos"><b>⌖</b><span>Sitios críticos</span><small>Amenaza y exposición</small></button>
          <button data-v1-route="acciones"><b>✓</b><span>Acciones</span><small>Responsable y estado</small></button>
          <button data-v1-route="acciones"><b>$</b><span>Presupuesto</span><small>Valor verificable</small></button>
          <button data-v1-route="monitoreo"><b>▣</b><span>Evidencias</span><small>Fuentes y adjuntos</small></button>
          <button data-v1-route="mapas"><b>✎</b><span>Trabajo de campo</span><small>Flujos Kobo</small></button>
        </div>
      </article>`;
  }

  function bindScope(route) {
    const state = appState();
    const level = $("#v1Level");
    const province = $("#v1Province");
    const canton = $("#v1Canton");
    const rerender = () => {
      window.SmartRiskV11App?.render?.(route);
      setTimeout(schedule, 0);
      setTimeout(schedule, 80);
    };

    level?.addEventListener("change", () => {
      const { provinces } = territoryOptions();
      if (level.value === "zona") {
        state.filters.provincia = "";
        state.filters.canton = "";
      } else if (level.value === "provincia") {
        state.filters.provincia = province?.value || state.filters.provincia || provinces[0] || "";
        state.filters.canton = "";
      } else {
        state.filters.provincia = province?.value || state.filters.provincia || provinces[0] || "";
        const { cantons } = territoryOptions();
        state.filters.canton = canton?.value || state.filters.canton || cantons[0] || "";
      }
      rerender();
    });

    province?.addEventListener("change", () => {
      state.filters.provincia = province.value;
      if (level?.value === "canton") {
        const { cantons } = territoryOptions();
        state.filters.canton = cantons[0] || "";
      } else state.filters.canton = "";
      rerender();
    });

    canton?.addEventListener("change", () => {
      state.filters.canton = canton.value;
      rerender();
    });
  }

  function ensureNavigation() {
    const nav = $("#nav");
    if (!nav) return;
    captureAllowedRoutes();
    const route = currentRoute();
    const existing = nav.querySelector(":scope > .v1-nav-shell[data-v1-baseline]");
    if (existing && nav.dataset.desktopNavigation === extensionVersion()) {
      existing.querySelectorAll("button[data-route]").forEach(button => {
        const active = button.dataset.route === route || (button.dataset.v1Audit === "true" && (route === "herramientas" || route === "configuracion"));
        button.classList.toggle("active", active);
        button.classList.toggle("nav-active", active);
      });
      return;
    }

    const shell = document.createElement("div");
    shell.className = "v1-nav-shell";
    shell.dataset.v1Baseline = VERSION;
    MENU.forEach(([key, label]) => {
      const target = menuRoute(key);
      if (!routeIsVisible(target)) return;
      const button = document.createElement("button");
      button.type = "button";
      button.dataset.route = target;
      button.dataset.v1LockRoute = target;
      if (key === "audit") button.dataset.v1Audit = "true";
      button.textContent = label;
      const active = target === route || (key === "audit" && (route === "herramientas" || route === "configuracion"));
      button.classList.toggle("active", active);
      button.classList.toggle("nav-active", active);
      shell.appendChild(button);
    });
    nav.replaceChildren(shell);
    nav.dataset.desktopNavigation = extensionVersion();
  }

  function ensureAsideNote() {
    const sidebar = $(".sr-sidebar");
    if (!sidebar) return;
    let note = sidebar.querySelector(".v1-aside-note");
    if (!note) {
      note = document.createElement("div");
      note.className = "v1-aside-note";
      sidebar.appendChild(note);
    }
    note.textContent = "Misma arquitectura conceptual y mismos datos entre dispositivos; el escritorio extiende el análisis y la gestión.";
  }

  function decorateHeader() {
    const header = $(".sr-main > header");
    if (!header) return;
    const route = currentRoute();
    const def = ROUTES[route] || ROUTES.inicio;
    const heading = $(".sr-page-heading h1", header);
    const subtitle = $(".sr-page-heading p", header);
    if (heading) heading.textContent = def.title;
    if (subtitle) subtitle.textContent = def.subtitle;

    let meta = header.querySelector(".v1-header-meta");
    if (!meta) {
      meta = document.createElement("div");
      meta.className = "v1-header-meta";
      header.appendChild(meta);
    }
    meta.innerHTML = `<span class="v1-meta-badge">${esc(f07Label())}</span><button type="button" class="v1-meta-badge v1-role-badge" data-v1-lock-route="configuracion">${esc(roleLabel())}</button>`;
  }

  function ensureAnalyst() {
    const button = $("#v1AnalystLauncher");
    if (button) button.innerHTML = `<span>IA↗</span><b>Analista SmartRisk</b>`;
  }

  function applyContent() {
    const route = currentRoute();
    if (route !== "inicio" && route !== "dashboard") return;
    const content = $("#content");
    if (!content) return;
    if (content.dataset.v1Baseline === VERSION && ((route === "inicio" && content.querySelector(".v1-ref-risk-lead")) || (route === "dashboard" && content.querySelector(".v1-ref-module-intro")))) return;

    content.className = `sr-content v1-baseline-contract ${route === "inicio" ? "v1-operational-home" : "v1-operational-territory"}`;
    content.innerHTML = route === "inicio" ? buildHome() : buildTerritory();
    content.dataset.v1Operational = extensionVersion();
    content.dataset.v1Baseline = VERSION;
    bindScope(route);
  }

  function apply() {
    scheduled = false;
    if (!isDesktop()) return;
    if (!document.body.classList.contains("v11-enabled") || !$("#app.v11-shell")) return;
    document.documentElement.dataset.smartRiskDesktopBaseline = BASELINE;
    document.body.classList.add("v1-baseline-locked");
    ensureNavigation();
    ensureAsideNote();
    decorateHeader();
    ensureAnalyst();
    applyContent();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  document.addEventListener("click", event => {
    const lockRoute = event.target.closest("[data-v1-lock-route]");
    if (lockRoute) {
      const route = lockRoute.dataset.v1LockRoute;
      if (route) location.hash = `#/${route}`;
      setTimeout(schedule, 0);
      return;
    }
    const routeButton = event.target.closest("[data-v1-route]");
    if (routeButton) setTimeout(schedule, 0);
  }, true);

  window.addEventListener("hashchange", () => setTimeout(schedule, 20));
  window.addEventListener("load", schedule);
  window.addEventListener("smartrisk:desktop-reference-ready", schedule);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true });
  new MutationObserver(schedule).observe(document.documentElement, { attributes: true, attributeFilter: ["data-smart-risk-device"] });
  schedule();

  window.SmartRiskV1BaselineLock = {
    VERSION,
    BASELINE,
    visualContract: "V1 + Smart móvil · 17:46 · 2026-08-25",
    preservesMobile: true,
    preservesRoutes: true,
    preservesPermissions: true,
    preservesDataContracts: true
  };
})();
