(() => {
  "use strict";

  const VERSION = "2026.08.25.8";
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
    { route: "monitoreo", label: "Reportes y fuentes" }
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
    const hash = String(location.hash || "").replace(/^#\/?/, "").split(/[?&]/)[0];
    return hash || String(appState().route || "inicio");
  }

  function allRecords() { return appState().data?.records || []; }
  function entity(key) { return appState().data?.entities?.[key] || []; }
  function scoped(list) {
    const f = appState().filters || {};
    return (list || []).filter(item => (!f.provincia || norm(item.provincia) === norm(f.provincia)) && (!f.canton || norm(item.canton) === norm(f.canton)));
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
    const documents = scoped(entity("reports"));
    const budget = actions.reduce((sum, item) => sum + amountOf(item), 0);
    const solved = breaches.filter(item => /solv|cerr|resuelt|complet|valid/.test(norm(`${item.estado} ${item.detail}`))).length;
    const active = Math.max(0, breaches.length - solved);
    const f07 = scoped(allRecords()).filter(item => /\bf07\b|seguimiento de acciones/.test(norm(`${item.tipo} ${item.title} ${item.detail}`))).length;
    const evidence = scoped(allRecords()).filter(item => {
      const payload = item?.payload || {};
      return Boolean(payload.evidencia || payload.evidence || payload.adjunto || payload.archivo || payload.url || payload.enlace || payload.link);
    }).length;
    return { sites, risks, actions, breaches, plans, reports, documents, budget, solved, active, f07, evidence };
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

  function scopeContext() {
    const state = appState();
    const f = state.filters || {};
    const { provinces, cantons } = territoryOptions();
    const scopeLabel = f.canton ? `${f.canton} · ${f.provincia || "Zona 5"}` : f.provincia || "Coordinación Zonal 5";
    const role = state.profileContext?.roleLabel || "Usuario autorizado";
    const loadedAt = state.data?.meta?.loadedAt ? new Date(state.data.meta.loadedAt).toLocaleString("es-EC") : "corte vigente";
    return { state, f, provinces, cantons, scopeLabel, role, loadedAt };
  }

  function buildScopePanel() {
    const { f, provinces, cantons, scopeLabel, role, loadedAt } = scopeContext();
    return `<section class="v1-scope-panel">
      <div class="v1-scope-heading"><div><b>Alcance de los indicadores</b><small>Los datos respetan el perfil y alcance autorizado.</small></div><span>${esc(role)}</span></div>
      <div class="v1-scope-grid">
        <label>Nivel territorial<select id="v1Level"><option value="zona" ${!f.provincia?"selected":""}>Zona</option><option value="provincia" ${f.provincia&&!f.canton?"selected":""}>Provincia</option><option value="canton" ${f.canton?"selected":""}>Cantón</option></select></label>
        <label>Provincia<select id="v1Province">${selectOptions(provinces, f.provincia, "Todas")}</select></label>
        <label>Cantón<select id="v1Canton">${selectOptions(cantons, f.canton, "Todos")}</select></label>
      </div>
      <div class="v1-scope-summary"><b>${esc(scopeLabel)}</b><span>Actualizado: ${esc(loadedAt)}</span></div>
    </section>`;
  }

  function buildHome() {
    const m = metrics();
    const { scopeLabel } = scopeContext();
    return `<section class="v1-lead">
      <div><span class="v1-eyebrow">Centro de lectura ejecutiva</span><h2>Situación territorial para decisión</h2><p>La misma lógica de Smart móvil, extendida para trabajo de escritorio.</p></div>
      <button type="button" data-v1-route="dashboard">Abrir territorio →</button>
    </section>

    ${buildScopePanel()}

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
          <button data-v1-route="monitoreo"><b>▣</b><span>Reportes y fuentes<small>${m.reports.length + m.documents.length} registros visibles</small></span></button>
        </div>
      </article>
      <article class="v1-panel v1-decisions">
        <header><div><span class="v1-eyebrow">Preguntas para decidir</span><h3>Lectura rápida</h3></div></header>
        <ul><li>¿Qué se reportó en este territorio?</li><li>¿Qué acciones ya tienen responsable?</li><li>¿Qué brechas continúan abiertas?</li><li>¿Qué evidencia o presupuesto falta verificar?</li></ul>
        <button class="v1-analyst-inline" data-v1-analyst>Consultar Analista SmartRisk ↗</button>
      </article>
    </section>`;
  }

  function buildTerritory() {
    const m = metrics();
    const { scopeLabel } = scopeContext();
    const planState = m.plans.length ? `${m.plans.length} registro${m.plans.length === 1 ? "" : "s"} visible${m.plans.length === 1 ? "" : "s"}` : "Sin registro visible";
    const f07State = m.f07 ? `${m.f07} registro${m.f07 === 1 ? "" : "s"}` : "Sin registro identificado";

    return `${buildScopePanel()}
      <section class="v1-territory-intro">
        <div><span class="v1-eyebrow">Ficha territorial integrada</span><h2>${esc(scopeLabel)}</h2><p>Plan, revisión, seguimiento, sitios, acciones, presupuesto y evidencias en un único expediente operativo.</p></div>
        <span class="v1-territory-badge">Plan ENOS 2026–2027</span>
      </section>

      <article class="v1-panel v1-territory-panel">
        <header><div><span class="v1-eyebrow">Plan y revisión técnica</span><h3>Estado documental y seguimiento</h3></div><span class="v1-panel-status">${esc(planState)}</span></header>
        <div class="v1-territory-grid">
          <button data-v1-route="reportes"><b>↗</b><span>PDF<small>${m.plans.length ? "Plan oficial disponible en el expediente" : "Verificar documento del plan"}</small></span></button>
          <button data-v1-route="reportes"><b>✓</b><span>Criterios<small>${m.plans.length ? "Revisión técnica disponible" : "Pendiente de asociar al plan"}</small></span></button>
          <button data-v1-route="reportes"><b>!</b><span>Brechas<small>${m.active} activas · ${m.solved} solventadas</small></span></button>
          <button data-v1-route="acciones"><b>↻</b><span>Seguimiento<small>F07 · ${esc(f07State)}</small></span></button>
        </div>
      </article>

      <article class="v1-panel v1-territory-panel">
        <header><div><span class="v1-eyebrow">Gestión del territorio</span><h3>Operación y evidencia</h3></div><span class="v1-panel-status">Mismo contrato Smart móvil</span></header>
        <div class="v1-territory-grid management">
          <button data-v1-route="riesgos"><b>⌖</b><span>Sitios críticos<small>${m.sites.length} sitios · ${m.risks.length} riesgos</small></span></button>
          <button data-v1-route="acciones"><b>✓</b><span>Acciones<small>${m.actions.length} vinculadas</small></span></button>
          <button data-v1-route="acciones"><b>$</b><span>Presupuesto<small>${m.budget ? currency(m.budget) : "Sin valor estructurado"}</small></span></button>
          <button data-v1-route="monitoreo"><b>▣</b><span>Evidencias<small>${m.evidence || (m.reports.length + m.documents.length)} referencias visibles</small></span></button>
          <button data-v1-route="mapas"><b>✎</b><span>Trabajo de campo<small>Mapa, F03 y flujos Kobo</small></span></button>
        </div>
      </article>

      <section class="v1-territory-summary">
        <div><span>Plan / revisión</span><strong>${m.plans.length}</strong></div>
        <div><span>Brechas activas</span><strong>${m.active}</strong></div>
        <div><span>Acciones</span><strong>${m.actions.length}</strong></div>
        <div><span>Reportes / fuentes</span><strong>${m.reports.length + m.documents.length}</strong></div>
      </section>`;
  }

  function bindScope(route) {
    const state = appState();
    const level = $("#v1Level");
    const province = $("#v1Province");
    const canton = $("#v1Canton");
    const rerender = () => window.SmartRiskV11App?.render?.(route);
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
    else window.open("https://chatgpt.com", "_blank", "noopener");
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
    if (nav.dataset.desktopNavigation === VERSION && nav.querySelector(":scope > .v1-nav-shell")) return;
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
    let collapsed = true;
    try { collapsed = localStorage.getItem(STATE_KEY) !== "false"; } catch (_) {}
    advanced.classList.toggle("collapsed", collapsed);
    toggle.innerHTML = `<span>Más funciones</span><span>⌄</span>`;
    toggle.onclick = () => {
      const now = advanced.classList.toggle("collapsed");
      try { localStorage.setItem(STATE_KEY, String(now)); } catch (_) {}
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
    if (currentRoute() !== "inicio") return false;
    const content = $("#content");
    if (!content) return false;
    if (content.dataset.v1Operational === VERSION && content.querySelector(".v1-lead") && content.querySelector(".v1-kpis")) return true;
    content.className = "sr-content v1-operational-home";
    content.innerHTML = buildHome();
    content.dataset.v1Operational = VERSION;
    const heading = $(".sr-page-heading h1"); if (heading) heading.textContent = "Inicio";
    const subtitle = $(".sr-page-heading p"); if (subtitle) subtitle.textContent = "Supervisión y resumen para decisión";
    bindScope("inicio");
    return true;
  }

  function enhanceTerritory() {
    if (currentRoute() !== "dashboard") return false;
    const content = $("#content");
    if (!content) return false;
    if (content.dataset.v1Operational === VERSION && content.querySelector(".v1-territory-intro") && content.querySelector(".v1-territory-grid")) return true;
    content.className = "sr-content v1-operational-territory";
    content.innerHTML = buildTerritory();
    content.dataset.v1Operational = VERSION;
    const heading = $(".sr-page-heading h1"); if (heading) heading.textContent = "Territorio";
    const subtitle = $(".sr-page-heading p"); if (subtitle) subtitle.textContent = "Ficha territorial integrada y expediente técnico";
    bindScope("dashboard");
    return true;
  }

  function enhanceCurrentView() {
    return enhanceHome() || enhanceTerritory();
  }

  function apply() {
    scheduled = false;
    if (!isDesktop()) { $("#v1AnalystLauncher")?.remove(); return; }
    if (!document.body.classList.contains("v11-enabled") || !$("#app.v11-shell")) return;
    document.body.classList.add("v1-desktop-operational");
    decorateBrand();
    ensureFlatNavigation();
    buildAnalystLauncher();
    enhanceCurrentView();
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
    reference: "V1-fusion-approved-20260825 + RC16.3-mobile-contract",
    approvedBaseline: "754ef8ffea70812ea493c9f75dc48608e2953af9",
    preservesRoutes: true,
    preservesPermissions: true,
    preservesDataContracts: true
  };
})();