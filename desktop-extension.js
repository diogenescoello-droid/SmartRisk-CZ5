(() => {
  "use strict";

  const VERSION = "2026.08.25.5";
  const STATE_KEY = "smartrisk-desktop-more-collapsed";
  let scheduled = false;

  const PRIMARY = [
    { route: "inicio", label: "Inicio" },
    { route: "dashboard", label: "Territorio" },
    { route: "mapas", label: "Mapa" },
    { route: "acciones", label: "Acciones" },
    { route: "riesgos", label: "Riesgos y sitios" },
    { route: "reportes", label: "Planes y revisión" },
    { route: "coe", label: "COE y actores" },
    { route: "instituciones", label: "Mesas técnicas" },
    { route: "monitoreo", label: "Monitoreo y fuentes" }
  ];

  const ADVANCED = [
    { route: "respuesta-coe", label: "Respuesta operativa" },
    { route: "herramientas", label: "Auditoría y herramientas" },
    { route: "configuracion", label: "Configuración" }
  ];

  const $ = (selector, root = document) => root.querySelector(selector);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const uniq = values => [...new Set(values.filter(Boolean))].sort((a,b)=>String(a).localeCompare(String(b),"es"));

  function isDesktop() {
    if (window.SmartRiskDeviceMode?.isSmart) return window.SmartRiskDeviceMode.isSmart() !== true;
    return document.documentElement.dataset.smartRiskDevice !== "smart";
  }

  function appState() { return window.SmartRiskV11App?.state || {}; }
  function currentRoute() {
    return String(appState().route || location.hash || "inicio").replace(/^#\/?/, "").split(/[?&]/)[0] || "inicio";
  }

  function allRecords() { return appState().data?.records || []; }
  function entity(key) { return appState().data?.entities?.[key] || []; }
  function scoped(list) {
    const f = appState().filters || {};
    return list.filter(item => (!f.provincia || norm(item.provincia) === norm(f.provincia)) && (!f.canton || norm(item.canton) === norm(f.canton)));
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
    try { return new Intl.NumberFormat("es-EC", { style:"currency", currency:"USD", maximumFractionDigits:0 }).format(value); }
    catch { return `$${Math.round(value).toLocaleString("es-EC")}`; }
  }

  function metrics() {
    const sites = scoped(entity("criticalSites"));
    const risks = scoped(entity("risks"));
    const actions = scoped(entity("actions"));
    const breaches = scoped(entity("breaches"));
    const plans = scoped(entity("plans"));
    const reports = scoped(entity("monitoringReports"));
    const budget = actions.reduce((sum, item) => sum + amountOf(item), 0);
    const solved = breaches.filter(item => /solv|cerr|resuelt|complet|valid/.test(norm(`${item.estado} ${item.detail}`))).length;
    const active = Math.max(0, breaches.length - solved);
    return { sites, risks, actions, breaches, plans, reports, budget, solved, active };
  }

  function territoryOptions() {
    const rows = allRecords();
    const provinces = uniq(rows.map(row => row.provincia));
    const province = appState().filters?.provincia || "";
    const cantons = uniq(rows.filter(row => !province || norm(row.provincia) === norm(province)).map(row => row.canton));
    return { provinces, cantons };
  }

  function selectOptions(items, selected, placeholder) {
    return `<option value="">${esc(placeholder)}</option>${items.map(item => `<option value="${esc(item)}" ${norm(item)===norm(selected)?"selected":""}>${esc(item)}</option>`).join("")}`;
  }

  function buildHome() {
    const state = appState();
    const m = metrics();
    const { provinces, cantons } = territoryOptions();
    const f = state.filters || {};
    const scopeLabel = f.canton ? `${f.canton} · ${f.provincia || "Zona 5"}` : f.provincia || "Coordinación Zonal 5";
    const role = state.profileContext?.roleLabel || "Usuario autorizado";
    const loadedAt = state.data?.meta?.loadedAt ? new Date(state.data.meta.loadedAt).toLocaleString("es-EC") : "corte vigente";

    return `<section class="v1-lead">
      <div><span class="v1-eyebrow">Centro de lectura ejecutiva</span><h2>Situación territorial para decisión</h2><p>La misma lógica de Smart móvil, extendida para trabajo de escritorio.</p></div>
      <button type="button" data-v1-route="dashboard">Abrir territorio →</button>
    </section>

    <section class="v1-scope-panel">
      <div class="v1-scope-heading"><div><b>Alcance de los indicadores</b><small>Los datos respetan el perfil y alcance autorizado.</small></div><span>${esc(role)}</span></div>
      <div class="v1-scope-grid">
        <label>Nivel territorial<select id="v1Level"><option value="zona" ${!f.provincia?"selected":""}>Zona</option><option value="provincia" ${f.provincia&&!f.canton?"selected":""}>Provincia</option><option value="canton" ${f.canton?"selected":""}>Cantón</option></select></label>
        <label>Provincia<select id="v1Province">${selectOptions(provinces, f.provincia, "Todas")}</select></label>
        <label>Cantón<select id="v1Canton">${selectOptions(cantons, f.canton, "Todos")}</select></label>
      </div>
      <div class="v1-scope-summary"><b>${esc(scopeLabel)}</b><span>Actualizado: ${esc(loadedAt)}</span></div>
    </section>

    <section class="v1-kpis">
      <button data-v1-route="riesgos"><span>Sitios reportados</span><strong>${m.sites.length}</strong><small>${m.risks.length} registros de riesgo asociados</small></button>
      <button data-v1-route="acciones"><span>Acciones vinculadas</span><strong>${m.actions.length}</strong><small>Responsable, plazo, evidencia y estado</small></button>
      <button data-v1-route="acciones"><span>Presupuesto verificable</span><strong>${m.budget ? currency(m.budget) : "—"}</strong><small>Solo valores estructurados y trazables</small></button>
      <button data-v1-route="dashboard"><span>Brechas de seguimiento</span><strong>${m.active}</strong><small>${m.active} activas · ${m.solved} solventadas</small></button>
    </section>

    <section class="v1-workspace-grid">
      <article class="v1-panel">
        <header><div><span class="v1-eyebrow">Territorio seleccionado</span><h3>${esc(scopeLabel)}</h3></div><button data-v1-route="dashboard">Ficha completa</button></header>
        <div class="v1-quick-grid">
          <button data-v1-route="reportes"><b>▤</b><span>Plan y revisión<small>${m.plans.length} registros visibles</small></span></button>
          <button data-v1-route="dashboard"><b>!</b><span>Brechas<small>${m.active} activas</small></span></button>
          <button data-v1-route="acciones"><b>✓</b><span>Acciones<small>${m.actions.length} vinculadas</small></span></button>
          <button data-v1-route="riesgos"><b>⌖</b><span>Sitios críticos<small>${m.sites.length} reportados</small></span></button>
          <button data-v1-route="mapas"><b>⌁</b><span>Mapa<small>Capas y trabajo territorial</small></span></button>
          <button data-v1-route="monitoreo"><b>↻</b><span>Monitoreo<small>${m.reports.length} reportes visibles</small></span></button>
        </div>
      </article>
      <article class="v1-panel v1-decisions">
        <header><div><span class="v1-eyebrow">Preguntas para decidir</span><h3>Lectura rápida</h3></div></header>
        <ul><li>¿Qué se reportó en este territorio?</li><li>¿Qué acciones ya tienen responsable?</li><li>¿Qué brechas continúan abiertas?</li><li>¿Qué evidencia o presupuesto falta verificar?</li></ul>
        <button class="v1-analyst-inline" data-v1-analyst>Consultar Analista SmartRisk ↗</button>
      </article>
    </section>`;
  }

  function bindHome() {
    const state = appState();
    const level = $("#v1Level");
    const province = $("#v1Province");
    const canton = $("#v1Canton");
    const rerender = () => window.SmartRiskV11App?.render?.("inicio");
    level?.addEventListener("change", () => {
      if (level.value === "zona") { state.filters.provincia = ""; state.filters.canton = ""; }
      if (level.value === "provincia") state.filters.canton = "";
      rerender();
    });
    province?.addEventListener("change", () => { state.filters.provincia = province.value; state.filters.canton = ""; rerender(); });
    canton?.addEventListener("change", () => { state.filters.canton = canton.value; rerender(); });
  }

  function buildAnalystLauncher() {
    let button = $("#v1AnalystLauncher");
    if (!button) {
      button = document.createElement("button");
      button.id = "v1AnalystLauncher";
      button.type = "button";
      button.innerHTML = `<span>IA↗</span><b>Analista SmartRisk</b>`;
      document.body.appendChild(button);
    }
  }

  function openAnalyst() {
    const existing = $("#srAssistantDock [data-assistant='gpt']");
    if (existing) existing.click();
    else location.href = "https://chatgpt.com";
  }

  function setLabel(button, label) {
    if (!button) return;
    const span = button.querySelector("span");
    if (span) span.textContent = label;
    else button.append(document.createTextNode(label));
    button.classList.add("v1-nav-item");
    button.classList.remove("rc13-nav-item");
    button.dataset.desktopLabel = label;
    button.setAttribute("aria-label", label);
  }

  function ensureFlatNavigation() {
    const nav = $("#nav");
    if (!nav) return;
    const sourceButtons = [...nav.querySelectorAll("button[data-route]")];
    if (!sourceButtons.length) return;
    const byRoute = new Map(sourceButtons.map(button => [button.dataset.route, button]));
    const wrap = document.createElement("div");
    wrap.className = "v1-nav-shell";

    const primary = document.createElement("div");
    primary.className = "v1-nav-primary";
    PRIMARY.forEach(item => {
      const button = byRoute.get(item.route);
      if (!button) return;
      setLabel(button, item.label);
      primary.append(button);
      byRoute.delete(item.route);
    });
    wrap.append(primary);

    const advanced = document.createElement("div");
    advanced.className = "v1-nav-advanced";
    const toggle = document.createElement("button");
    toggle.type = "button";
    toggle.className = "v1-nav-more";
    const collapsed = localStorage.getItem(STATE_KEY) !== "false";
    advanced.classList.toggle("collapsed", collapsed);
    toggle.innerHTML = `<span>Más funciones</span><span>⌄</span>`;
    toggle.onclick = () => {
      const now = advanced.classList.toggle("collapsed");
      localStorage.setItem(STATE_KEY, String(now));
    };
    const items = document.createElement("div");
    items.className = "v1-nav-advanced-items";
    ADVANCED.forEach(item => {
      const button = byRoute.get(item.route);
      if (!button) return;
      setLabel(button, item.label);
      items.append(button);
      byRoute.delete(item.route);
    });
    byRoute.forEach((button, route) => { setLabel(button, button.textContent.trim() || route); items.append(button); });
    advanced.append(toggle, items);
    wrap.append(advanced);
    nav.replaceChildren(wrap);
    nav.dataset.desktopNavigation = VERSION;
  }

  function decorateBrand() {
    const title = $(".sr-brand b"); if (title) title.textContent = "SmartRisk CZ5";
    const subtitle = $(".sr-brand span"); if (subtitle) subtitle.textContent = "Gestión de Riesgos · Zona 5";
  }

  function enhanceHome() {
    if (currentRoute() !== "inicio") return;
    const content = $("#content");
    if (!content) return;
    if (content.dataset.v1Operational === VERSION) return;
    content.className = "sr-content v1-operational-home";
    content.innerHTML = buildHome();
    content.dataset.v1Operational = VERSION;
    const heading = $(".sr-page-heading h1"); if (heading) heading.textContent = "Inicio";
    const subtitle = $(".sr-page-heading p"); if (subtitle) subtitle.textContent = "Resumen ejecutivo y operación territorial";
    bindHome();
  }

  function apply() {
    scheduled = false;
    if (!isDesktop()) { $("#v1AnalystLauncher")?.remove(); return; }
    if (!document.body.classList.contains("v11-enabled") || !$("#app.v11-shell")) return;
    document.body.classList.add("v1-desktop-operational");
    decorateBrand();
    ensureFlatNavigation();
    buildAnalystLauncher();
    enhanceHome();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  document.addEventListener("click", event => {
    const routeButton = event.target.closest("[data-v1-route]");
    if (routeButton) {
      location.hash = `#/${routeButton.dataset.v1Route}`;
      return;
    }
    if (event.target.closest("[data-v1-analyst],#v1AnalystLauncher")) openAnalyst();
    if (event.target.closest("#nav [data-route]")) setTimeout(schedule, 20);
  }, true);

  window.addEventListener("hashchange", () => setTimeout(schedule, 20));
  window.addEventListener("load", schedule);
  new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true });
  new MutationObserver(schedule).observe(document.documentElement, { attributes:true, attributeFilter:["data-smart-risk-device"] });
  schedule();

  window.SmartRiskDesktopExtension = {
    VERSION,
    reference: "V1.0.0-piloto-estable + RC16.3-mobile-contract",
    preservesRoutes: true,
    preservesPermissions: true,
    preservesDataContracts: true
  };
})();
