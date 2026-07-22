(() => {
  "use strict";

  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const fmtDate = value => {
    if (!value) return "Sin fecha";
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? esc(value) : date.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
  };

  const ICONS = {
    dashboard: '<rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/>',
    response: '<path d="M12 3a9 9 0 1 0 9 9"/><path d="M12 7v5l3 2"/><path d="m16 4 3-1-1 3"/>',
    monitor: '<rect x="3" y="4" width="18" height="13" rx="2"/><path d="m7 13 3-3 3 2 4-5"/><path d="M8 21h8"/><path d="M12 17v4"/>',
    people: '<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>',
    risk: '<path d="M10.3 2.9 1.8 17a2 2 0 0 0 1.7 3h17a2 2 0 0 0 1.7-3L13.7 2.9a2 2 0 0 0-3.4 0Z"/><path d="M12 9v4"/><path d="M12 17h.01"/>',
    actions: '<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M8 2v4M16 2v4M3 10h18"/><path d="m8 15 2 2 5-5"/>',
    institution: '<path d="m3 21 18 0"/><path d="M6 18V8M10 18V8M14 18V8M18 18V8"/><path d="m4 8 8-5 8 5Z"/>',
    reports: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8Z"/><path d="M14 2v6h6M8 13h8M8 17h8M8 9h2"/>',
    map: '<polygon points="3 6 9 3 15 6 21 3 21 18 15 21 9 18 3 21 3 6"/><path d="M9 3v15M15 6v15"/>',
    tools: '<path d="M14.7 6.3a4 4 0 0 0-5-5l2.1 2.1-2.8 2.8-2.1-2.1a4 4 0 0 0 5 5l6.5 6.5a2.1 2.1 0 0 0 3-3Z"/><path d="m4 20 5-5"/>',
    settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1-2.8 2.8-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6v.2h-4V21a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1L4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9A1.7 1.7 0 0 0 3 14H2.8v-4H3a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.2 7 7 4.2l.1.1A1.7 1.7 0 0 0 9 4.6a1.7 1.7 0 0 0 1-1.6v-.2h4V3a1.7 1.7 0 0 0 1 1.6 1.7 1.7 0 0 0 1.9-.3l.1-.1L19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9 1.7 1.7 0 0 0 1.6 1h.2v4H21a1.7 1.7 0 0 0-1.6 1Z"/>',
    check: '<path d="m9 12 2 2 4-4"/><circle cx="12" cy="12" r="9"/>',
    decision: '<path d="m14 13 5-5"/><path d="m16 6 2 2"/><path d="m4 20 7-7"/><path d="m8 8 8 8"/><path d="M3 3h6v6H3zM15 15h6v6h-6z"/>',
    escalation: '<path d="M3 20h18"/><path d="M6 16v-3M11 16V9M16 16V5"/><path d="m14 7 2-2 2 2"/>',
    shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10Z"/><path d="m9 12 2 2 4-4"/>',
    chat: '<path d="M21 15a4 4 0 0 1-4 4H8l-5 3V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4Z"/><path d="M8 10h.01M12 10h.01M16 10h.01"/>',
    spark: '<path d="m12 3-1.4 4.1L6.5 8.5l4.1 1.4L12 14l1.4-4.1 4.1-1.4-4.1-1.4Z"/><path d="m5 14-.8 2.2L2 17l2.2.8L5 20l.8-2.2L8 17l-2.2-.8Z"/><path d="m19 14-.8 2.2L16 17l2.2.8L19 20l.8-2.2L22 17l-2.2-.8Z"/>',
    guide: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20V4H6.5A2.5 2.5 0 0 0 4 6.5Z"/><path d="M4 6.5v13M8 7h8M8 11h6"/>',
    bell: '<path d="M18 8a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9"/><path d="M10 21h4"/>',
    user: '<circle cx="12" cy="8" r="4"/><path d="M4 22a8 8 0 0 1 16 0"/>',
    refresh: '<path d="M20 12a8 8 0 1 1-2.3-5.7L20 8"/><path d="M20 3v5h-5"/>',
    arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
    close: '<path d="m6 6 12 12M18 6 6 18"/>'
  };

  function icon(name, size = 20, className = "") {
    return `<svg class="sr-icon ${className}" width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${ICONS[name] || ICONS.response}</svg>`;
  }

  const state = {
    user: null,
    profile: null,
    db: null,
    auth: null,
    profileContext: null,
    data: null,
    permissions: null,
    route: "respuesta-coe",
    filters: { provincia: "", canton: "", evento: "", coeMode: "Activo" },
    programmingOpen: false,
    assistant: null,
    detail: null,
    map: null
  };

  function humanizeId(value) {
    return String(value || "").replace(/^(TER|PROV|INST|UNI):/i, "").replace(/^(TER|PROV)-/i, "")
      .split("-").filter(Boolean).map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase()).join(" ")
      .replace(/\bDe\b/g, "de").replace(/\bDel\b/g, "del");
  }

  function getProfileContext(profile, user) {
    const roleRaw = profile?.rol || profile?.codigoRol || "Usuario autorizado";
    const roleKey = window.SmartRiskV11Permissions?.normalizeRole(profile) || "usuario";
    let roleLabel = roleRaw;
    let scopeLabel = "Alcance autorizado";
    if (roleKey === "admin" || roleKey === "zonal") {
      roleLabel = roleKey === "admin" ? "Administrador zonal" : "Coordinación zonal";
      scopeLabel = "Coordinación Zonal 5";
    } else if (profile?.territorioIds?.length) {
      scopeLabel = profile.territorioIds.map(humanizeId).join(" · ");
    } else if (profile?.provinciaIds?.length) {
      scopeLabel = profile.provinciaIds.map(humanizeId).join(" · ");
    } else if (profile?.unidadIds?.length) {
      scopeLabel = profile.unidadIds.map(humanizeId).join(" · ");
    } else if (profile?.institucionIds?.length) {
      scopeLabel = profile.institucionIds.map(humanizeId).join(" · ");
    }
    return {
      roleKey,
      roleLabel,
      scopeLabel,
      userLabel: user?.displayName || profile?.nombre || user?.email || "Usuario",
      email: user?.email || profile?.correo || ""
    };
  }

  function routeInfo(routeId) {
    return window.SmartRiskV11Router.getRoute(routeId);
  }

  function records(key) {
    if (!state.data) return [];
    const list = state.data.entities?.[key] || [];
    const f = state.filters;
    return list.filter(record => {
      const same = (a, b) => !b || normalize(a) === normalize(b);
      const recordEvent = `${record.evento || ""} ${record.payload?.tema || ""} ${record.payload?.problema || ""}`.trim();
      // Los registros territoriales sin evento explícito siguen visibles dentro del
      // territorio seleccionado. Solo se excluyen cuando declaran otro evento.
      const eventMatches = !f.evento || !recordEvent || normalize(recordEvent).includes(normalize(f.evento));
      return same(record.provincia, f.provincia) && same(record.canton, f.canton) && eventMatches;
    });
  }

  function allSelectedRecords() {
    return Object.keys(state.data?.entities || {}).flatMap(records);
  }

  function statusTone(value) {
    const text = normalize(value);
    if (/critic|venc|bloque|rechaz|descart/.test(text)) return "danger";
    if (/ejec|activo|valid|complet|cerrad|mitig/.test(text)) return "success";
    if (/program|pend|revision|evaluacion/.test(text)) return "warning";
    return "info";
  }

  function priorityTone(value) {
    const text = normalize(value);
    if (/critic|muy alto|alta|alto/.test(text)) return "danger";
    if (/medio|media/.test(text)) return "warning";
    if (/bajo|baja/.test(text)) return "success";
    return "neutral";
  }

  function emptyState(title, message, iconName = "reports") {
    return `<div class="sr-empty">${icon(iconName, 36)}<strong>${esc(title)}</strong><p>${esc(message)}</p><div class="sr-empty-actions"><button type="button" data-clear-filters>Mostrar todo mi alcance</button><button type="button" data-assistant="guide">Ver guía</button></div></div>`;
  }

  function badge(text, tone = "neutral") {
    return `<span class="sr-badge ${tone}">${esc(text || "Sin dato")}</span>`;
  }

  function metric(label, value, tone = "blue", detail = "", iconName = "reports") {
    return `<article class="sr-metric ${tone}"><span class="sr-metric-icon">${icon(iconName, 20)}</span><div><small>${esc(label)}</small><strong>${esc(value)}</strong>${detail ? `<span>${esc(detail)}</span>` : ""}</div></article>`;
  }

  function recordTitle(record) { return record?.title || "Registro sin título"; }
  function recordDetail(record) { return record?.detail || record?.estado || "Pendiente de detalle"; }

  function selectOptions(values, selected, emptyLabel = "Todos") {
    const uniqueValues = [...new Set((values || []).filter(Boolean))];
    return `<option value="">${esc(emptyLabel)}</option>${uniqueValues.map(value => `<option value="${esc(value)}" ${normalize(value) === normalize(selected) ? "selected" : ""}>${esc(value)}</option>`).join("")}`;
  }

  function getCantonOptions() {
    const all = state.data?.records || [];
    return [...new Set(all.filter(record => !state.filters.provincia || normalize(record.provincia) === normalize(state.filters.provincia)).map(record => record.canton).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  }

  function getEventOptions() {
    return [...new Set(allSelectedRecords().map(record => record.evento || (record.entityType === "risks" ? record.title : null)).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  }

  function filterBar() {
    const provinces = state.data?.filters?.provincias || [];
    const cantons = getCantonOptions();
    const events = getEventOptions();
    return `<section class="sr-filter-bar">
      <label><span>Provincia</span><select id="srProvince">${selectOptions(provinces, state.filters.provincia, provinces.length ? "Todas" : "Sin datos")}</select></label>
      <label><span>Cantón</span><select id="srCanton">${selectOptions(cantons, state.filters.canton, cantons.length ? "Todos" : "Sin datos")}</select></label>
      <div class="sr-coe-toggle"><span>COE</span><div role="group" aria-label="Estado del COE"><button type="button" data-coe-mode="Programado" class="${state.filters.coeMode === "Programado" ? "active" : ""}">Programado</button><button type="button" data-coe-mode="Activo" class="${state.filters.coeMode === "Activo" ? "active" : ""}">Activo</button></div></div>
      <label class="sr-event-filter"><span>Tema a resolver (evento / problema)</span><select id="srEvent">${selectOptions(events, state.filters.evento, events.length ? "Todos los eventos" : "Sin eventos registrados")}</select></label>
    </section>`;
  }

  function scopeHeader() {
    const route = routeInfo(state.route);
    const ctx = state.profileContext;
    const updated = state.data?.updatedAtSource ? fmtDate(state.data.updatedAtSource) : new Date().toLocaleTimeString("es-EC", { hour: "2-digit", minute: "2-digit" });
    const guideLabel = state.route === "respuesta-coe" ? "Guía del flujo" : "Guía del módulo";
    return `<div class="sr-page-heading"><div class="sr-heading-copy"><h1>${esc(route.title)}</h1><p>${esc(route.subtitle)}</p><div class="sr-header-meta"><span><b>Vista:</b> ${esc(ctx.roleLabel)}</span><span><b>Alcance:</b> ${esc(ctx.scopeLabel)}</span><span class="sync"><i></i> Solo lectura</span><span>Actualizado: ${esc(updated)}</span></div></div><div class="sr-heading-actions"><button id="srGuideTop" class="sr-icon-button labeled">${icon("guide", 19)}<span>${guideLabel}</span></button><button class="sr-icon-button sr-notifications" aria-label="Notificaciones">${icon("bell", 19)}<i>3</i></button><button class="sr-icon-button" aria-label="Perfil">${icon("user", 19)}</button></div></div>`;
  }

  function logoMark() {
    return `<span class="sr-logo-mark" aria-hidden="true"><svg viewBox="0 0 48 48"><path class="petal blue" d="M22 5C13 5 7 12 7 20c0 5 3 9 8 11l9-8c-3-2-4-4-4-7 0-4 1-8 2-11Z"/><path class="petal orange" d="M27 6c8 2 13 9 11 17-1 5-5 8-10 9l-6-10c3-1 5-3 6-6 1-4 0-7-1-10Z"/><path class="petal green" d="M17 33c3 2 6 2 9 0l9-4c0 9-6 15-14 15-8 0-14-5-15-13l11 2Z"/><circle cx="23" cy="24" r="4.2" fill="#fff"/></svg></span>`;
  }

  function renderShell() {
    const app = $("#app");
    const aside = app.querySelector("aside");
    const main = app.querySelector("main");
    app.className = "app v11-shell";
    document.body.classList.add("v11-enabled");
    aside.className = "sr-sidebar";
    main.className = "sr-main";

    const routes = window.SmartRiskV11Router.routes;
    const navGroups = routes.reduce((groups, route) => {
      const group = route.group || "Plataforma";
      if (!groups[group]) groups[group] = [];
      groups[group].push(route);
      return groups;
    }, {});
    const navigation = Object.entries(navGroups).map(([group, items]) => `<section class="sr-nav-group"><small>${esc(group)}</small>${items.map(route => `<button type="button" data-route="${route.id}" class="${state.route === route.id ? "active" : ""}">${icon(route.icon, 20)}<span>${esc(route.title)}</span></button>`).join("")}</section>`).join("");
    aside.innerHTML = `<div class="sr-brand">${logoMark()}<div><b>SmartRisk CZ5</b><span>Gestión de Riesgos</span></div></div>
      <nav id="nav" aria-label="Navegación principal">${navigation}</nav>
      <div class="sr-sidebar-footer"><button type="button" id="srCollapse">‹ <span>Contraer</span></button><div class="sr-user-card"><span>${esc((state.profileContext.userLabel || "U").split(/\s|@/)[0].slice(0, 2).toUpperCase())}</span><div><b>${esc(state.profileContext.userLabel)}</b><small>${esc(state.profileContext.roleLabel)}</small></div></div><button type="button" id="logout" class="sr-logout">Cerrar sesión</button></div>`;

    main.innerHTML = `<header id="srHeader">${scopeHeader()}</header><section id="content" class="sr-content"></section>`;
    $("#logout").onclick = () => state.auth?.signOut();
    $("#srCollapse").onclick = () => app.classList.toggle("sidebar-collapsed");
    $("#nav").onclick = event => {
      const button = event.target.closest("[data-route]");
      if (!button) return;
      location.hash = `#/${button.dataset.route}`;
    };
    mountAssistants();
  }

  function renderHeader() {
    $("#srHeader").innerHTML = scopeHeader();
    $("#srGuideTop")?.addEventListener("click", () => openAssistant("guide"));
  }

  function getSeverityCount(list, matcher) {
    return list.filter(record => matcher.test(normalize(`${record.prioridad} ${record.estado} ${record.detail}`))).length;
  }

  function renderDashboard() {
    const monitoring = records("monitoringReports");
    const validations = records("validations");
    const institutions = records("institutions");
    const decisions = records("decisions");
    const actions = records("actions");
    const reports = records("reports");
    const risks = [...records("risks"), ...records("criticalSites")];
    const coes = records("coeSessions");
    const activeCoe = coes.filter(item => /activ|abiert|curso/.test(normalize(item.estado))).length;
    const criticalRisks = getSeverityCount(risks, /critic|alto|alta/);
    const verified = validations.filter(item => /valid|verific|complet/.test(normalize(item.estado))).length;
    const activeActions = actions.filter(item => !/complet|cerrad|finaliz|descart/.test(normalize(item.estado))).length;
    const overdue = actions.filter(item => /venc/.test(normalize(item.estado))).length;
    const actionProgress = actions.map(item => item.avance).filter(value => value > 0);
    const averageProgress = actionProgress.length ? Math.round(actionProgress.reduce((a, b) => a + b, 0) / actionProgress.length) : 0;
    const provinces = new Set((state.data?.records || []).map(item => item.provincia).filter(Boolean));
    const cantons = new Set((state.data?.records || []).map(item => item.canton).filter(Boolean));
    const highPriority = risks
      .filter(item => /critic|alto|alta/.test(normalize(`${item.prioridad} ${item.estado} ${item.detail}`)))
      .slice(0, 5);
    const urgentActions = actions
      .filter(item => !/complet|cerrad|finaliz/.test(normalize(item.estado)))
      .sort((a, b) => number(b.avance) - number(a.avance))
      .slice(0, 5);
    const selected = allSelectedRecords();
    const quality = {
      territorio: selected.filter(item => item.provincia || item.canton).length,
      responsable: selected.filter(item => item.responsable || item.institucion).length,
      estado: selected.filter(item => item.estado).length
    };
    const totalSelected = Math.max(selected.length, 1);
    const qualityScore = Math.round(((quality.territorio + quality.responsable + quality.estado) / (totalSelected * 3)) * 100);

    const operationalCards = [
      { route: "respuesta-coe", icon: "response", tone: "blue", title: "Respuesta COE", value: activeCoe, detail: "COE activos", action: "Abrir flujo neuronal" },
      { route: "monitoreo", icon: "monitor", tone: "green", title: "Monitoreo", value: monitoring.length, detail: `${verified} verificados`, action: "Revisar reportes" },
      { route: "riesgos", icon: "risk", tone: "red", title: "Riesgos", value: criticalRisks, detail: "críticos o altos", action: "Ver prioridades" },
      { route: "acciones", icon: "actions", tone: "orange", title: "Acciones", value: activeActions, detail: `${overdue} vencidas`, action: "Gestionar acciones" },
      { route: "instituciones", icon: "institution", tone: "purple", title: "Instituciones", value: institutions.length, detail: "vinculadas", action: "Revisar coordinación" },
      { route: "reportes", icon: "reports", tone: "cyan", title: "Reportes", value: reports.length, detail: "disponibles", action: "Abrir biblioteca" }
    ];

    return `<section class="sr-dashboard-intro">
      <div><span>${icon("dashboard", 24)}</span><div><b>Resumen ejecutivo territorial</b><p>Datos clave del alcance seleccionado. Los módulos conservan su contenido y contrato visual.</p></div></div>
      <button type="button" data-route-link="respuesta-coe">${icon("response", 19)} Abrir Respuesta COE ${icon("arrow", 18)}</button>
    </section>
    <section class="sr-dashboard-filter">${filterBar()}</section>
    <section class="sr-dashboard-kpis">
      ${metric("COE activos", activeCoe, "green", `${coes.length} sesiones visibles`, "check")}
      ${metric("Riesgos críticos", criticalRisks, "red", `${risks.length} riesgos y sitios`, "risk")}
      ${metric("Reportes recibidos", monitoring.length, "blue", `${verified} validados`, "monitor")}
      ${metric("Acciones activas", activeActions, "orange", `${averageProgress}% avance medio`, "actions")}
      ${metric("Cobertura territorial", `${provinces.size}/${cantons.size}`, "purple", "provincias / cantones", "map")}
      ${metric("Calidad de datos", `${qualityScore}%`, "cyan", "campos operativos mínimos", "reports")}
    </section>
    <section class="sr-dashboard-grid">
      <article class="sr-card sr-dashboard-operational">
        <header><div><h2>Accesos operativos</h2><p>Ordenados por el ciclo de gestión, sin cambiar los módulos existentes.</p></div><button data-route-link="respuesta-coe">Ver flujo completo</button></header>
        <div class="sr-dashboard-module-grid">${operationalCards.map(card => `<button class="sr-dashboard-module ${card.tone}" data-route-link="${card.route}"><span>${icon(card.icon, 25)}</span><div><b>${esc(card.title)}</b><strong>${esc(card.value)}</strong><small>${esc(card.detail)}</small></div><em>${esc(card.action)} →</em></button>`).join("")}</div>
      </article>
      <article class="sr-card sr-dashboard-priorities">
        <header><div><h2>Prioridades del territorio</h2><p>Riesgos críticos y acciones que requieren lectura inmediata.</p></div><button data-route-link="riesgos">Ver riesgos</button></header>
        <div class="sr-dashboard-priority-columns">
          <section><h3>${icon("risk", 18)} Riesgos críticos</h3>${highPriority.length ? highPriority.map(item => `<button data-detail-record="${esc(item.id)}"><span class="sr-risk-symbol danger">${icon("risk", 18)}</span><div><b>${esc(item.title)}</b><small>${esc([item.canton, item.provincia].filter(Boolean).join(" · ") || recordDetail(item))}</small></div>${badge(item.prioridad || "Crítico", "danger")}</button>`).join("") : emptyState("Sin riesgos críticos", "No se identificaron riesgos críticos en el alcance actual.", "risk")}</section>
          <section><h3>${icon("actions", 18)} Acciones en seguimiento</h3>${urgentActions.length ? urgentActions.map(item => `<button data-detail-record="${esc(item.id)}"><span class="sr-risk-symbol warning">${icon("actions", 18)}</span><div><b>${esc(item.title)}</b><small>${esc(item.responsable || item.institucion || "Por asignar")}</small></div>${badge(item.estado || "Pendiente", statusTone(item.estado))}</button>`).join("") : emptyState("Sin acciones activas", "No existen acciones activas para el alcance actual.", "actions")}</section>
        </div>
      </article>
    </section>
    <section class="sr-dashboard-bottom">
      <article class="sr-card sr-dashboard-cycle"><header><div><h2>Ciclo integrado de gestión</h2><p>Acceso rápido a los bloques agrupados de la plataforma.</p></div></header><div>
        <button data-route-link="respuesta-coe"><span>1</span><b>Operación COE</b><small>Respuesta, sesiones y acciones</small></button>
        <i>${icon("arrow", 18)}</i>
        <button data-route-link="monitoreo"><span>2</span><b>Análisis y territorio</b><small>Monitoreo, riesgos y mapas</small></button>
        <i>${icon("arrow", 18)}</i>
        <button data-route-link="instituciones"><span>3</span><b>Coordinación y productos</b><small>Instituciones y reportes</small></button>
        <i>${icon("arrow", 18)}</i>
        <button data-route-link="herramientas"><span>4</span><b>Administración</b><small>Herramientas y configuración</small></button>
      </div></article>
      <article class="sr-card sr-dashboard-status"><header><h2>Estado de información</h2></header><dl>
        <div><dt>Registros visibles</dt><dd>${selected.length}</dd></div>
        <div><dt>Decisiones COE</dt><dd>${decisions.length}</dd></div>
        <div><dt>Instituciones</dt><dd>${institutions.length}</dd></div>
        <div><dt>Actualización</dt><dd>${fmtDate(state.data?.meta?.loadedAt || new Date())}</dd></div>
      </dl><button id="srRefresh">${icon("refresh", 18)} Actualizar datos</button></article>
    </section>`;
  }

  function renderResponseCOE() {
    const monitoring = records("monitoringReports");
    const validations = records("validations");
    const institutions = records("institutions");
    const decisions = records("decisions");
    const actions = records("actions");
    const risks = [...records("risks"), ...records("criticalSites")];
    const coes = records("coeSessions");
    const activeCoe = coes.filter(item => /activ|abiert|curso/.test(normalize(item.estado))).length;
    const programmedCoe = coes.filter(item => /program|pend/.test(normalize(item.estado))).length;
    const criticalRisks = getSeverityCount(risks, /critic|alto|alta/);
    const earlyAlerts = getSeverityCount(monitoring, /alert|advert|vigil/);
    const verified = validations.filter(item => /valid|verific|complet/.test(normalize(item.estado))).length;
    const pendingValidation = Math.max(validations.length - verified, 0);
    const inExecution = actions.filter(item => /ejec|curso|activo/.test(normalize(item.estado))).length;
    const escalated = actions.filter(item => /escal/.test(normalize(`${item.estado} ${item.payload?.tipo}`))).length;
    const progressValues = actions.map(item => item.avance).filter(value => value > 0);
    const progress = progressValues.length ? Math.round(progressValues.reduce((a, b) => a + b, 0) / progressValues.length) : 0;
    const flowAvailable = monitoring.length || risks.length || actions.length;

    const activeUnits = new Set(institutions.map(i => i.unidad).filter(Boolean)).size;
    const stages = [
      { n: 1, key: "monitoringReports", title: "Reporte de monitoreo", tone: "blue", icon: "monitor", badge: earlyAlerts || monitoring.length, badgeTone: earlyAlerts ? "danger" : "info", lines: [["Reportes hoy", monitoring.length], ["Alertas tempranas", earlyAlerts]] },
      { n: 2, key: "validations", title: "Validación técnica", tone: "green", icon: "user", badge: verified ? "✓" : pendingValidation, badgeTone: verified ? "success" : "warning", lines: [["Verificados", verified], ["Pendientes", pendingValidation]] },
      { n: 3, key: "institutions", title: "Coordinación institucional", tone: "purple", icon: "people", badge: activeUnits || "—", badgeTone: activeUnits ? "success" : "neutral", lines: [["Mesas activas", activeUnits], ["Instituciones", institutions.length]] },
      { n: 4, key: "decisions", title: "Decisión COE", tone: "orange", icon: "decision", badge: decisions.length || "—", badgeTone: decisions.length ? "warning" : "neutral", lines: [["Decisiones", decisions.length], ["En evaluación", decisions.filter(i => /evalu|pend|revision/.test(normalize(i.estado))).length]] },
      { n: 5, key: "actions", title: "Escalamiento", tone: "cyan", icon: "escalation", badge: escalated || inExecution || "—", badgeTone: escalated ? "warning" : (inExecution ? "success" : "neutral"), lines: [["Acciones en ejecución", inExecution], ["Escaladas", escalated]] },
      { n: 6, key: "actions", title: "Mitigación", tone: "green", icon: "shield", badge: progress ? "✓" : "—", badgeTone: progress ? "success" : "neutral", lines: [["Progreso", `${progress}%`], ["Impacto reducido", progress >= 60 ? "Alto" : progress ? "En seguimiento" : "Pendiente"]] }
    ];

    const stageCards = stages.map((stage, index) => `<div class="sr-stage-wrap"><article class="sr-stage ${stage.tone}" data-stage-index="${index}" tabindex="0" aria-label="Etapa ${stage.n}: ${esc(stage.title)}"><header><span>${stage.n}</span><h3>${esc(stage.title)}</h3></header><div class="sr-stage-icon">${icon(stage.icon, 48)}<i class="sr-stage-badge ${stage.badgeTone}">${esc(stage.badge)}</i></div><dl>${stage.lines.map(line => `<div><dt>${esc(line[0])}</dt><dd>${esc(line[1])}</dd></div>`).join("")}</dl><button type="button" data-detail-key="${stage.key}" data-detail-title="${esc(stage.title)}">Ver detalles</button></article></div>`).join("");

    const support = institutions.slice(0, 5);
    const topRisks = risks.slice(0, 5);
    const actionsSummary = actions.slice(0, 10);
    const completed = actions.filter(item => /complet|cerrad|finaliz/.test(normalize(item.estado))).length;
    const activeActions = actions.filter(item => !/complet|cerrad|finaliz|descart/.test(normalize(item.estado))).length;

    return `<section class="sr-guide-question"><span>${icon("reports", 20)}</span><div><b>Pregunta guía:</b> ¿Cómo identifico la etapa del evento en mi territorio, el responsable institucional, los riesgos críticos y la acción que debo programar para mitigación?</div></section>
      <section class="sr-top-control">${filterBar()}<div class="sr-summary-metrics">${metric("COE activo", activeCoe, "green", "", "check")}${metric("COE programado", programmedCoe, "blue", "", "actions")}${metric("Temas críticos", criticalRisks, "red", "", "risk")}${metric("Flujo sugerido", flowAvailable ? "✓" : "—", "orange", flowAvailable ? "Ruta disponible" : "Pendiente", "response")}</div></section>
      <section class="sr-neural-area"><div class="sr-stage-grid">${stageCards}</div><svg class="sr-neural-connectors" aria-hidden="true"><defs><marker id="srArrowGreen" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#139b43"/></marker><marker id="srArrowOrange" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#ef8600"/></marker><marker id="srArrowBlue" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#0f63e9"/></marker><marker id="srArrowRed" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto"><path d="M0,0 L8,4 L0,8 Z" fill="#ef3131"/></marker></defs><g class="sr-main-link-layer"><path class="sr-connector-path" data-stage-link="0"/><path class="sr-connector-path" data-stage-link="1"/><path class="sr-connector-path" data-stage-link="2"/><path class="sr-connector-path" data-stage-link="3"/><path class="sr-connector-path" data-stage-link="4"/><path class="sr-connector-path sr-terminal-link" data-terminal-link/><g class="sr-transition-node" data-transition-node="1"><circle r="13"/><path d="M-3 -5 L2 0 L-3 5"/></g><g class="sr-transition-node" data-transition-node="4"><circle r="13"/><path d="M-3 -5 L2 0 L-3 5"/></g><g class="sr-terminal-node" data-terminal-node><circle r="13"/><path d="M-5 0 L-1 4 L6 -5"/></g></g><g class="sr-curved-link-layer"><path class="sr-connector-path support-orange" data-curve="support-orange" marker-end="url(#srArrowOrange)"/><path class="sr-connector-path support-blue" data-curve="support-blue" marker-end="url(#srArrowBlue)"/><path class="sr-connector-path risk-red" data-curve="risk-red" marker-end="url(#srArrowRed)"/></g></svg><div class="sr-subflow"><article class="sr-support-card"><span>${icon("institution", 35)}</span><div><b>Instituciones de apoyo</b><p>Activas: ${institutions.length} instituciones</p><small>${support.length ? support.map(i => esc(i.title)).join(" · ") : "Sin instituciones registradas"}</small></div><button data-route-link="instituciones">Ver detalles</button></article><div class="sr-subflow-lines"><span class="orange"></span><span class="blue"></span></div><article class="sr-risk-card"><span>${icon("risk", 35)}</span><div><b>Riesgos detectados</b><p>${criticalRisks} críticos · ${Math.max(risks.length - criticalRisks, 0)} otros</p><small>${topRisks.length ? topRisks.map(i => esc(i.title)).join(" · ") : "Sin riesgos registrados"}</small></div><button data-route-link="riesgos">Ver detalles</button></article></div></section>
      <section class="sr-primary-actions"><button id="srGoProgramming" class="primary">${icon("actions", 20)} Ir a programación ${icon("arrow", 20)}</button><button data-route-link="acciones">${icon("reports", 20)} Ver acciones</button><button id="srRefresh">${icon("refresh", 20)} Actualizar datos</button></section>
      <section id="srProgramming" class="sr-programming ${state.programmingOpen ? "open" : ""}"><button type="button" id="srProgrammingToggle" class="sr-programming-head"><span>${icon("actions", 20)}<b>Programación y gestión de acciones del COE</b></span><span>${state.programmingOpen ? "Ocultar" : "Desplegar"}⌄</span></button><div class="sr-program-summary">${metric("Etapas habilitadas", "6/6", "green", "Flujo operativo disponible", "check")}${metric("Acciones activas", activeActions, "red", actions.length ? "En seguimiento" : "Sin registros", "actions")}${metric("Estructuras sugeridas", new Set(actions.map(i => i.unidad).filter(Boolean)).size, "green", "MTT / GT vinculadas", "people")}${metric("Riesgos detectados", risks.length, "red", `${criticalRisks} críticos`, "risk")}</div><div class="sr-program-detail">${actionsSummary.length ? renderActionTable(actionsSummary) : emptyState("Sin acciones programadas", "No existen acciones registradas para el territorio seleccionado.", "actions")}</div></section>`;
  }


  function layoutNeuralConnectors() {
    const area = $(".sr-neural-area");
    const svg = $(".sr-neural-connectors", area || document);
    if (!area || !svg) return;

    const cards = $$(".sr-stage", area);
    if (cards.length !== 6) return;

    const areaRect = area.getBoundingClientRect();
    const width = Math.max(1, areaRect.width);
    const height = Math.max(1, areaRect.height);
    svg.setAttribute("viewBox", `0 0 ${width} ${height}`);
    svg.setAttribute("preserveAspectRatio", "none");

    const relative = rect => ({
      left: rect.left - areaRect.left,
      right: rect.right - areaRect.left,
      top: rect.top - areaRect.top,
      bottom: rect.bottom - areaRect.top,
      width: rect.width,
      height: rect.height
    });
    const boxes = cards.map(card => relative(card.getBoundingClientRect()));

    const setPath = (selector, d, className = "") => {
      const path = $(selector, svg);
      if (!path) return;
      path.setAttribute("d", d);
      if (className) path.setAttribute("class", `sr-connector-path ${className}`);
    };
    const setGroup = (selector, x, y) => {
      const group = $(selector, svg);
      if (group) group.setAttribute("transform", `translate(${x} ${y})`);
    };

    for (let index = 0; index < boxes.length - 1; index += 1) {
      const from = boxes[index];
      const to = boxes[index + 1];
      const x1 = from.right + 3;
      const x2 = to.left - 5;
      const y = Math.round((from.top + from.height * 0.52 + to.top + to.height * 0.52) / 2);
      const mid = (x1 + x2) / 2;
      const isNodeTransition = index === 1 || index === 4;
      const tone = isNodeTransition ? "neutral" : "green";
      setPath(`[data-stage-link="${index}"]`, `M ${x1} ${y} L ${x2} ${y}`, `sr-main-link ${tone}`);
      const path = $(`[data-stage-link="${index}"]`, svg);
      if (path) {
        if (isNodeTransition) path.removeAttribute("marker-end");
        else path.setAttribute("marker-end", "url(#srArrowGreen)");
      }
      if (isNodeTransition) setGroup(`[data-transition-node="${index}"]`, mid, y);
    }

    const last = boxes[5];
    const terminalX = Math.min(width - 18, last.right + 37);
    const terminalY = last.top + last.height * 0.52;
    setPath("[data-terminal-link]", `M ${last.right + 3} ${terminalY} L ${terminalX - 13} ${terminalY}`, "sr-terminal-link");
    setGroup("[data-terminal-node]", terminalX, terminalY);

    const support = $(".sr-support-card", area);
    const risk = $(".sr-risk-card", area);
    if (support && risk) {
      const supportBox = relative(support.getBoundingClientRect());
      const riskBox = relative(risk.getBoundingClientRect());
      const decision = boxes[3];

      const sx = supportBox.right + 5;
      const sy1 = supportBox.top + supportBox.height * 0.35;
      const sy2 = supportBox.top + supportBox.height * 0.67;
      const orangeX = decision.left + decision.width * 0.18;
      const orangeY = decision.bottom - 18;
      const blueX = decision.left + decision.width * 0.50;
      const blueY = decision.bottom + 2;

      setPath('[data-curve="support-orange"]',
        `M ${sx} ${sy1} C ${sx + 86} ${sy1}, ${orangeX - 72} ${orangeY + 36}, ${orangeX} ${orangeY}`,
        "support-orange");
      setPath('[data-curve="support-blue"]',
        `M ${sx} ${sy2} C ${sx + 112} ${sy2 + 18}, ${blueX - 72} ${blueY + 44}, ${blueX} ${blueY}`,
        "support-blue");

      const redX1 = decision.right - 4;
      const redY1 = decision.top + decision.height * 0.68;
      const redX2 = riskBox.left + riskBox.width * 0.50;
      const redY2 = riskBox.top - 4;
      setPath('[data-curve="risk-red"]',
        `M ${redX1} ${redY1} C ${redX1 + 68} ${redY1 + 10}, ${redX2 - 50} ${redY2 - 32}, ${redX2} ${redY2}`,
        "risk-red");
    }
  }

  function scheduleNeuralConnectorLayout() {
    if (state.route !== "respuesta-coe") return;
    cancelAnimationFrame(state.connectorFrame || 0);
    state.connectorFrame = requestAnimationFrame(() => {
      layoutNeuralConnectors();
      setTimeout(layoutNeuralConnectors, 80);
    });
  }

  function renderActionTable(items) {
    return `<div class="sr-table-wrap"><table class="sr-table"><thead><tr><th>Código</th><th>Acción</th><th>Tipo / etapa</th><th>Responsable</th><th>Prioridad</th><th>Estado</th><th>Fecha límite</th><th>Progreso</th></tr></thead><tbody>${items.map(item => `<tr><td>${esc(item.payload?.codigo || item.sourceId || "—")}</td><td><b>${esc(recordTitle(item))}</b></td><td>${esc(item.payload?.etapa || item.tipo || "—")}</td><td>${esc(item.responsable || item.institucion || "Por asignar")}</td><td>${badge(item.prioridad || "Sin definir", priorityTone(item.prioridad))}</td><td>${badge(item.estado || "Pendiente", statusTone(item.estado))}</td><td>${fmtDate(item.payload?.fechaLimite || item.payload?.plazo)}</td><td><div class="sr-progress"><span style="width:${Math.min(item.avance, 100)}%"></span></div><small>${item.avance}%</small></td></tr>`).join("")}</tbody></table></div>`;
  }

  function renderModuleFilters() {
    return `<div class="sr-module-filter">${filterBar()}</div>`;
  }

  function renderMonitoring() {
    const reports = records("monitoringReports");
    const validations = records("validations");
    const sources = [...new Set(reports.map(item => item.institucion).filter(Boolean))];
    const verified = validations.filter(item => /valid|verific|complet/.test(normalize(item.estado))).length;
    const discarded = validations.filter(item => /descart|rechaz/.test(normalize(item.estado))).length;
    return `${renderModuleFilters()}<section class="sr-metrics-row">${metric("Reportes recibidos", reports.length, "blue", "En el alcance seleccionado", "reports")}${metric("Fuentes institucionales", sources.length, "purple", "Instituciones reportantes", "institution")}${metric("Alertas tempranas", getSeverityCount(reports, /alert|advert|vigil/), "red", "Requieren lectura", "risk")}${metric("En verificación", Math.max(validations.length - verified - discarded, 0), "orange", "Pendientes", "refresh")}${metric("Verificados", verified, "green", "Validados", "check")}</section><section class="sr-three-column"><article class="sr-card sr-timeline"><header><h2>Línea de tiempo de reportes</h2><button>Filtros</button></header>${reports.length ? reports.slice(0, 8).map((item, index) => `<button class="sr-timeline-item ${index === 0 ? "active" : ""}" data-record-id="${esc(item.id)}"><i></i><span><small>${fmtDate(item.updatedAt || item.createdAt)}</small><b>${esc(item.title)}</b><em>${esc(item.institucion || item.provincia || "Fuente institucional")}</em></span>${badge(item.estado || item.prioridad || "Recibido", statusTone(item.estado || item.prioridad))}</button>`).join("") : emptyState("Sin reportes", "No existen reportes de monitoreo para este territorio.", "monitor")}</article><article class="sr-card"><header><h2>Fuentes institucionales</h2><span>${sources.length}</span></header><div class="sr-source-grid">${sources.length ? sources.slice(0, 8).map(source => `<div>${icon("institution", 25)}<b>${esc(source)}</b><small>${reports.filter(r => r.institucion === source).length} reportes</small></div>`).join("") : emptyState("Sin fuentes", "No se identificaron instituciones reportantes.", "institution")}</div><div class="sr-evidence-strip"><h3>Evidencia disponible</h3><p>Los archivos y fotografías vinculados aparecerán cuando el registro los contenga.</p></div></article><article class="sr-card sr-detail-card"><header><h2>Detalle del reporte</h2></header>${reports[0] ? `<div class="sr-detail-title">${icon("reports", 28)}<div><b>${esc(reports[0].title)}</b><span>${esc(reports[0].institucion || "Fuente no indicada")}</span></div></div><dl class="sr-definition"><div><dt>Estado</dt><dd>${badge(reports[0].estado || "Recibido", statusTone(reports[0].estado))}</dd></div><div><dt>Ubicación</dt><dd>${esc([reports[0].canton, reports[0].provincia].filter(Boolean).join(" · ") || "Sin ubicación")}</dd></div><div><dt>Descripción</dt><dd>${esc(recordDetail(reports[0]))}</dd></div><div><dt>Fecha</dt><dd>${fmtDate(reports[0].updatedAt || reports[0].createdAt)}</dd></div></dl><button class="sr-wide-button" disabled>Validación habilitada en fase operativa</button>` : emptyState("Selecciona un reporte", "No hay un reporte disponible para mostrar.", "reports")}</article></section>`;
  }

  function renderCOE() {
    const coes = records("coeSessions");
    const decisions = records("decisions");
    const institutions = records("institutions");
    const actions = records("actions");
    return `${renderModuleFilters()}<section class="sr-metrics-row">${metric("COE activos", coes.filter(i => /activ|curso/.test(normalize(i.estado))).length, "green", "Sesiones abiertas", "check")}${metric("COE programados", coes.filter(i => /program|pend/.test(normalize(i.estado))).length, "blue", "Próximas sesiones", "actions")}${metric("Decisiones", decisions.length, "orange", "Registradas", "decision")}${metric("Instituciones", institutions.length, "purple", "Vinculadas", "people")}${metric("Compromisos", actions.length, "cyan", "Acciones relacionadas", "actions")}</section><section class="sr-two-column wide-left"><article class="sr-card"><header><h2>Sesiones del COE</h2><button data-route-link="respuesta-coe">Abrir flujo completo</button></header>${coes.length ? `<div class="sr-session-list">${coes.slice(0, 8).map(item => `<button data-detail-record="${esc(item.id)}"><span>${icon("people", 24)}</span><div><b>${esc(item.title)}</b><small>${esc([item.canton, item.provincia].filter(Boolean).join(" · ") || recordDetail(item))}</small></div>${badge(item.estado || "Registrado", statusTone(item.estado))}</button>`).join("")}</div>` : emptyState("Sin sesiones", "No existen sesiones del COE para el territorio seleccionado.", "people")}</article><article class="sr-card"><header><h2>Agenda y compromisos</h2></header>${actions.length ? actions.slice(0, 6).map(item => `<div class="sr-compact-row"><span>${icon("actions", 20)}</span><div><b>${esc(item.title)}</b><small>${esc(item.responsable || "Por asignar")}</small></div>${badge(item.estado || "Pendiente", statusTone(item.estado))}</div>`).join("") : emptyState("Sin compromisos", "No existen acciones vinculadas a una sesión.", "actions")}</article></section>`;
  }

  function renderRisks() {
    const risks = [...records("risks"), ...records("criticalSites")];
    const critical = getSeverityCount(risks, /critic|alto|alta/);
    const medium = getSeverityCount(risks, /medio|media/);
    const threats = [...new Set(risks.map(item => item.payload?.amenaza || item.evento || item.tipo).filter(Boolean))];
    return `${renderModuleFilters()}<section class="sr-metrics-row">${metric("Riesgos registrados", risks.length, "blue", "Alcance actual", "risk")}${metric("Críticos / altos", critical, "red", "Atención prioritaria", "risk")}${metric("Medios", medium, "orange", "Seguimiento", "risk")}${metric("Amenazas", threats.length, "purple", "Tipos identificados", "monitor")}</section><section class="sr-two-column"><article class="sr-card"><header><h2>Riesgos y sitios críticos</h2><button data-route-link="mapas">Ver en mapa</button></header>${risks.length ? `<div class="sr-risk-list">${risks.slice(0, 10).map(item => `<button data-detail-record="${esc(item.id)}"><span class="sr-risk-symbol ${priorityTone(item.prioridad)}">${icon("risk", 22)}</span><div><b>${esc(item.title)}</b><small>${esc([item.canton, item.provincia].filter(Boolean).join(" · ") || recordDetail(item))}</small></div>${badge(item.prioridad || item.estado || "Por valorar", priorityTone(item.prioridad))}</button>`).join("")}</div>` : emptyState("Sin riesgos registrados", "No existen riesgos o sitios críticos para el territorio seleccionado.", "risk")}</article><article class="sr-card"><header><h2>Matriz de criticidad</h2></header><div class="sr-risk-matrix"><div><b>${critical}</b><span>Alta</span></div><div><b>${medium}</b><span>Media</span></div><div><b>${Math.max(risks.length - critical - medium, 0)}</b><span>Baja / sin valorar</span></div></div><h3>Amenazas identificadas</h3><div class="sr-chip-list">${threats.length ? threats.map(value => badge(value, "info")).join("") : '<span class="sr-muted">Sin amenazas clasificadas.</span>'}</div></article></section>`;
  }

  function renderActions() {
    const actions = records("actions");
    const completed = actions.filter(i => /complet|cerrad|finaliz/.test(normalize(i.estado))).length;
    const executing = actions.filter(i => /ejec|curso|activo/.test(normalize(i.estado))).length;
    const overdue = actions.filter(i => /venc/.test(normalize(i.estado))).length;
    return `${renderModuleFilters()}<section class="sr-toolbar"><div class="sr-metrics-row">${metric("Total acciones", actions.length, "blue", "Registros visibles", "actions")}${metric("Por ejecutar", Math.max(actions.length - completed - executing, 0), "orange", "Pendientes", "refresh")}${metric("En ejecución", executing, "blue", "En curso", "escalation")}${metric("Completadas", completed, "green", "Cerradas", "check")}${metric("Vencidas", overdue, "red", "Requieren atención", "risk")}</div><button class="sr-primary-disabled" disabled>Nueva acción · habilitación posterior</button></section><section class="sr-card">${actions.length ? renderActionTable(actions.slice(0, 30)) : emptyState("Sin acciones", "No existen acciones registradas para el territorio seleccionado.", "actions")}</section>`;
  }

  function renderInstitutions() {
    const institutions = records("institutions");
    const active = institutions.filter(i => /activ|dispon/.test(normalize(i.estado))).length;
    const units = [...new Set(institutions.map(i => i.unidad).filter(Boolean))];
    return `${renderModuleFilters()}<section class="sr-context-banner"><b>Contexto institucional</b><span>${esc([state.filters.evento, state.filters.provincia, state.filters.canton].filter(Boolean).join(" · ") || "Todo el alcance autorizado")}</span></section><section class="sr-institution-layout"><article class="sr-card"><header><h2>Instituciones y roles</h2><span>${institutions.length} registradas</span></header>${institutions.length ? `<div class="sr-institution-grid">${institutions.slice(0, 12).map((item, index) => `<button data-detail-record="${esc(item.id)}" class="${index === 0 ? "selected" : ""}"><span>${icon(index === 0 ? "institution" : "people", 25)}</span><b>${esc(item.title)}</b><small>${esc(item.unidad || item.estado || "Rol institucional")}</small>${badge(item.estado || "Registrada", statusTone(item.estado))}</button>`).join("")}</div>` : emptyState("Sin instituciones", "No existen instituciones vinculadas al alcance seleccionado.", "institution")}</article><article class="sr-card"><header><h2>Contactos institucionales</h2></header>${institutions.length ? institutions.slice(0, 9).map(item => `<div class="sr-contact-row">${icon("institution", 21)}<div><b>${esc(item.title)}</b><small>${esc(item.unidad || item.institucion || "Contacto institucional")}</small></div>${badge(item.estado || "Registrado", statusTone(item.estado))}</div>`).join("") : emptyState("Sin contactos", "Los contactos aparecerán cuando estén vinculados a instituciones autorizadas.", "user")}</article><article class="sr-card sr-chat-preview"><header><h2>Chat interinstitucional</h2><span>Vista previa</span></header><p>Dirige comunicaciones por institución, cargo, MTT/GT o grupo del COE.</p><button type="button" data-assistant="chat">Abrir chat</button></article></section><section class="sr-metrics-row compact">${metric("Instituciones involucradas", institutions.length, "blue", "", "institution")}${metric("Instituciones activas", active, "green", "", "check")}${metric("MTT / GT", units.length, "purple", "", "people")}${metric("Solicitudes", 0, "orange", "Sin datos", "reports")}</section>`;
  }

  function renderReports() {
    const reports = records("reports");
    const monitoring = records("monitoringReports");
    const allReports = [...reports, ...monitoring];
    return `${renderModuleFilters()}<section class="sr-metrics-row">${metric("Reportes disponibles", allReports.length, "blue", "En el alcance", "reports")}${metric("Borradores", getSeverityCount(allReports, /borrador/), "orange", "", "reports")}${metric("En revisión", getSeverityCount(allReports, /revision|verificacion/), "purple", "", "refresh")}${metric("Aprobados", getSeverityCount(allReports, /aprob|valid|final/), "green", "", "check")}</section><section class="sr-two-column wide-left"><article class="sr-card"><header><h2>Biblioteca de reportes</h2><button disabled>Generar reporte · fase posterior</button></header>${allReports.length ? `<div class="sr-report-list">${allReports.slice(0, 15).map(item => `<button data-detail-record="${esc(item.id)}">${icon("reports", 22)}<div><b>${esc(item.title)}</b><small>${fmtDate(item.updatedAt || item.createdAt)} · ${esc(item.institucion || item.provincia || "Fuente")}</small></div>${badge(item.estado || "Disponible", statusTone(item.estado))}</button>`).join("")}</div>` : emptyState("Sin reportes", "No existen reportes para el territorio seleccionado.", "reports")}</article><article class="sr-card"><header><h2>Vista previa</h2></header>${allReports[0] ? `<div class="sr-report-preview"><span>${icon("reports", 40)}</span><h3>${esc(allReports[0].title)}</h3><p>${esc(recordDetail(allReports[0]))}</p><dl class="sr-definition"><div><dt>Fuente</dt><dd>${esc(allReports[0].institucion || "No indicada")}</dd></div><div><dt>Territorio</dt><dd>${esc([allReports[0].canton, allReports[0].provincia].filter(Boolean).join(" · ") || "Sin territorio")}</dd></div></dl><button disabled>Exportación habilitada en fase posterior</button></div>` : emptyState("Selecciona un reporte", "No hay una vista previa disponible.", "reports")}</article></section>`;
  }

  function renderMaps() {
    const layers = records("mapLayers");
    const points = [...records("risks"), ...records("criticalSites"), ...records("monitoringReports")].filter(item => item.lat !== null && item.lng !== null);
    return `${renderModuleFilters()}<section class="sr-map-layout"><article class="sr-card sr-map-card"><div id="srMap" class="sr-map"></div><div class="sr-map-actions"><button data-route-link="respuesta-coe">Volver al flujo</button><button data-route-link="acciones">Ver acciones asociadas</button><button disabled>Exportar mapa · fase posterior</button></div></article><aside class="sr-card sr-layer-panel"><header><h2>Capas</h2><span>${layers.length}</span></header><label><span>Límite provincial y cantonal</span><input type="checkbox" checked></label><label><span>Riesgos y sitios críticos</span><input type="checkbox" checked></label><label><span>Reportes georreferenciados</span><input type="checkbox" checked></label>${layers.slice(0, 10).map(layer => `<label><span>${esc(layer.title)}</span><input type="checkbox" checked></label>`).join("")}<div class="sr-map-legend"><h3>Leyenda</h3><span><i class="danger"></i> Riesgo alto</span><span><i class="warning"></i> Riesgo medio</span><span><i class="success"></i> Riesgo bajo</span><p>${points.length} elementos georreferenciados disponibles.</p></div></aside></section>`;
  }

  function renderTools() {
    const canManage = state.permissions.canManageUsers();
    const audit = records("audit");
    const users = records("users");
    const layers = records("mapLayers");
    return `<section class="sr-tool-tabs"><button class="active">Utilidades</button><button>Importaciones</button><button>Auditoría</button>${canManage ? "<button>Usuarios y roles</button>" : ""}</section><section class="sr-tool-grid"><article class="sr-card"><span>${icon("map", 32)}</span><h2>Utilidades cartográficas</h2><p>Revisa capas, metadatos y archivos asociados al alcance territorial.</p><strong>${layers.length}</strong><small>capas visibles</small></article><article class="sr-card"><span>${icon("refresh", 32)}</span><h2>Importaciones</h2><p>Las importaciones permanecen deshabilitadas durante el piloto de solo lectura.</p><strong>Solo lectura</strong></article><article class="sr-card"><span>${icon("reports", 32)}</span><h2>Auditoría</h2><p>Consulta la trazabilidad disponible para tu perfil.</p><strong>${audit.length}</strong><small>registros visibles</small></article>${canManage ? `<article class="sr-card"><span>${icon("user", 32)}</span><h2>Usuarios, roles y alcances</h2><p>Sección administrativa visible únicamente para administradores.</p><strong>${users.length}</strong><small>usuarios visibles</small></article>` : `<article class="sr-card"><span>${icon("shield", 32)}</span><h2>Administración restringida</h2><p>Los usuarios operativos conservan acceso a herramientas, sin funciones administrativas.</p></article>`}</section>`;
  }

  function renderConfig() {
    const ctx = state.profileContext;
    return `<section class="sr-config-grid"><article class="sr-card"><header><h2>Perfil</h2></header><div class="sr-profile-summary"><span>${esc(ctx.userLabel.slice(0, 2).toUpperCase())}</span><div><b>${esc(ctx.userLabel)}</b><small>${esc(ctx.email)}</small></div></div><dl class="sr-definition"><div><dt>Rol</dt><dd>${esc(ctx.roleLabel)}</dd></div><div><dt>Alcance</dt><dd>${esc(ctx.scopeLabel)}</dd></div><div><dt>Modo</dt><dd>${badge("Piloto · solo lectura", "info")}</dd></div></dl><button id="srChangePassword">Solicitar cambio de contraseña</button></article><article class="sr-card"><header><h2>Preferencias</h2></header><label class="sr-setting"><span>Notificaciones operativas</span><input type="checkbox" checked></label><label class="sr-setting"><span>Guía dinámica</span><input type="checkbox" checked></label><label class="sr-setting"><span>Vista compacta</span><input type="checkbox"></label><p class="sr-muted">Las preferencias visuales no modifican el alcance de los datos.</p></article><article class="sr-card"><header><h2>Seguridad de la sesión</h2></header><p>Los datos visibles están restringidos mediante los alcances asignados al perfil. La arquitectura visual y los módulos son iguales para todos los usuarios.</p><button id="srConfigLogout">Cerrar sesión</button></article></section>`;
  }

  function renderContent() {
    const renderers = {
      inicio: renderDashboard,
      "respuesta-coe": renderResponseCOE,
      monitoreo: renderMonitoring,
      coe: renderCOE,
      riesgos: renderRisks,
      acciones: renderActions,
      instituciones: renderInstitutions,
      reportes: renderReports,
      mapas: renderMaps,
      herramientas: renderTools,
      configuracion: renderConfig
    };
    const content = $("#content");
    content.innerHTML = (renderers[state.route] || renderDashboard)();
    bindContentEvents();
    if (state.route === "respuesta-coe") scheduleNeuralConnectorLayout();
    if (state.route === "mapas") setTimeout(mountMap, 20);
  }

  function bindContentEvents() {
    $("#srProvince")?.addEventListener("change", event => {
      state.filters.provincia = event.target.value;
      state.filters.canton = "";
      state.filters.evento = "";
      renderContent();
    });
    $("#srCanton")?.addEventListener("change", event => { state.filters.canton = event.target.value; state.filters.evento = ""; renderContent(); });
    $("#srEvent")?.addEventListener("change", event => { state.filters.evento = event.target.value; renderContent(); });
    $$('[data-coe-mode]').forEach(button => button.onclick = () => { state.filters.coeMode = button.dataset.coeMode; renderContent(); });
    $$('#content [data-route-link]').forEach(button => button.onclick = () => { location.hash = `#/${button.dataset.routeLink}`; });
    $$('#content [data-assistant]').forEach(button => button.onclick = () => openAssistant(button.dataset.assistant));
    $$('#content [data-clear-filters]').forEach(button => button.onclick = () => { state.filters.provincia = ""; state.filters.canton = ""; state.filters.evento = ""; renderContent(); });
    $$('#content [data-detail-key]').forEach(button => button.onclick = () => openDetail(button.dataset.detailTitle, records(button.dataset.detailKey)));
    $$('#content [data-detail-record]').forEach(button => button.onclick = () => {
      const record = state.data.records.find(item => String(item.id) === String(button.dataset.detailRecord));
      if (record) openDetail(record.title, [record]);
    });
    $("#srGoProgramming")?.addEventListener("click", () => { state.programmingOpen = true; renderContent(); setTimeout(() => $("#srProgramming")?.scrollIntoView({ behavior: "smooth", block: "start" }), 10); });
    $("#srProgrammingToggle")?.addEventListener("click", () => { state.programmingOpen = !state.programmingOpen; renderContent(); });
    $("#srRefresh")?.addEventListener("click", reloadData);
    $("#srChangePassword")?.addEventListener("click", requestPasswordReset);
    $("#srConfigLogout")?.addEventListener("click", () => state.auth?.signOut());
  }

  function openDetail(title, items) {
    state.detail = { title, items };
    let drawer = $("#srDetailDrawer");
    if (!drawer) {
      drawer = document.createElement("aside");
      drawer.id = "srDetailDrawer";
      drawer.className = "sr-detail-drawer";
      document.body.appendChild(drawer);
    }
    drawer.innerHTML = `<header><div><small>Detalle operativo</small><h2>${esc(title)}</h2></div><button id="srCloseDetail">${icon("close", 20)}</button></header><div class="sr-detail-list">${items.length ? items.slice(0, 20).map(item => `<article><div><b>${esc(item.title)}</b><p>${esc(recordDetail(item))}</p><small>${esc([item.canton, item.provincia, item.institucion].filter(Boolean).join(" · ") || item.tipo)}</small></div>${badge(item.estado || item.prioridad || "Registrado", statusTone(item.estado || item.prioridad))}</article>`).join("") : emptyState("Sin registros", "No hay información disponible para este componente.")}</div>`;
    drawer.classList.add("open");
    $("#srCloseDetail").onclick = () => drawer.classList.remove("open");
  }

  function mountAssistants() {
    $("#srAssistantDock")?.remove();
    const dock = document.createElement("div");
    dock.id = "srAssistantDock";
    dock.className = "sr-assistant-dock";
    dock.innerHTML = `<button data-assistant="chat" class="chat"><span>Chat interinstitucional</span>${icon("chat", 25)}</button><button data-assistant="gpt" class="gpt"><span>Especialista GPT</span>${icon("spark", 25)}</button><button data-assistant="guide" class="guide"><span>Guía dinámica</span>${icon("guide", 25)}</button>`;
    dock.onclick = event => {
      const button = event.target.closest("[data-assistant]");
      if (button) openAssistant(button.dataset.assistant);
    };
    document.body.appendChild(dock);
  }

  function openAssistant(kind) {
    state.assistant = state.assistant === kind ? null : kind;
    let panel = $("#srAssistantPanel");
    if (!state.assistant) { panel?.remove(); return; }
    if (!panel) { panel = document.createElement("aside"); panel.id = "srAssistantPanel"; panel.className = "sr-assistant-panel"; document.body.appendChild(panel); }
    const institutions = records("institutions");
    const content = {
      chat: `<div class="sr-assistant-form"><label>Tipo de conversación<select><option>Directa a un cargo</option><option>Institucional</option><option>Grupal del COE</option><option>Grupal de MTT/GT</option><option>Vinculada a una acción</option></select></label><label>Institución<select>${selectOptions(institutions.map(item => item.title), "", institutions.length ? "Seleccionar institución" : "Sin instituciones")}</select></label><label>Cargo o función<select><option>Gestión de Riesgos</option><option>Coordinación COE</option><option>Técnico asignado</option><option>Líder MTT/GT</option></select></label><div class="sr-chat-empty">${icon("chat", 30)}<b>Chat institucional</b><p>La interfaz está lista. El envío permanece deshabilitado durante el piloto de solo lectura.</p></div><textarea placeholder="Escribe un mensaje…" disabled></textarea><button disabled>Enviar mensaje</button></div>`,
      gpt: `<div class="sr-gpt-options"><p>El Especialista GPT preparará contexto anonimizado de la pantalla <b>${esc(routeInfo(state.route).title)}</b>.</p><button>Analizar datos clave y brechas</button><button>Identificar la siguiente acción</button><button>Revisar coherencia de un reporte</button><button id="srOpenExternalGPT">Preparar contexto y abrir ChatGPT ↗</button></div>`,
      guide: `<div class="sr-guide-panel"><b>Guía de ${esc(routeInfo(state.route).title)}</b><ol><li>Selecciona el territorio autorizado.</li><li>Revisa los indicadores y registros.</li><li>Abre el detalle del elemento relevante.</li><li>Relaciona la información con riesgos y acciones.</li></ol><p>La guía no modifica datos.</p></div>`
    }[kind];
    panel.innerHTML = `<header><div>${icon(kind === "chat" ? "chat" : kind === "gpt" ? "spark" : "guide", 23)}<b>${kind === "chat" ? "Chat interinstitucional" : kind === "gpt" ? "Especialista GPT" : "Guía dinámica"}</b></div><button id="srCloseAssistant">${icon("close", 19)}</button></header>${content}`;
    $("#srCloseAssistant").onclick = () => { state.assistant = null; panel.remove(); };
    $("#srOpenExternalGPT")?.addEventListener("click", () => window.open("https://chatgpt.com", "_blank", "noopener"));
  }

  async function reloadData() {
    const button = $("#srRefresh");
    if (button) { button.disabled = true; button.textContent = "Actualizando…"; }
    state.data = await window.SmartRiskV11DataAdapter.loadScopedRecords({ user: state.user, profile: state.profile, db: state.db, auth: state.auth });
    renderHeader();
    renderContent();
  }

  async function requestPasswordReset() {
    try { await state.auth?.sendPasswordResetEmail(state.profileContext.email, { url: location.origin + location.pathname }); } catch {}
    alert("Si el correo está registrado, recibirá un enlace para definir una nueva contraseña.");
  }

  async function mountMap() {
    if (!window.L || !$("#srMap")) return;
    if (state.map) { state.map.remove(); state.map = null; }
    const map = L.map("srMap", { zoomControl: true }).setView([-1.6, -79.6], 7);
    state.map = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }).addTo(map);
    try {
      const useCantons = Boolean(state.filters.canton);
      const response = await fetch(useCantons ? "geo/cantones-zonal5.geojson" : "geo/provincias-zonal5.geojson");
      if (response.ok) {
        const source = await response.json();
        const target = normalize(useCantons ? state.filters.canton : state.filters.provincia);
        const features = target ? source.features.filter(feature => {
          const props = feature.properties || {};
          const label = useCantons ? props.DPA_DESCAN : props.DPA_DESPRO;
          return normalize(label) === target;
        }) : source.features;
        const geojson = { ...source, features: features.length ? features : source.features };
        const layer = L.geoJSON(geojson, { style: { color: "#1769e0", weight: 2.4, fillColor: "#75aef6", fillOpacity: 0.14 } }).addTo(map);
        if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds(), { padding: [28, 28], maxZoom: useCantons ? 11 : 9 });
      }
    } catch {}
    const points = [...records("risks"), ...records("criticalSites"), ...records("monitoringReports")].filter(item => item.lat !== null && item.lng !== null);
    points.forEach(item => L.circleMarker([item.lat, item.lng], { radius: 7, color: priorityTone(item.prioridad) === "danger" ? "#ef4444" : "#f59e0b", fillOpacity: 0.85 }).addTo(map).bindPopup(`<b>${esc(item.title)}</b><br>${esc(recordDetail(item))}`));
    setTimeout(() => map.invalidateSize(), 100);
  }

  function renderRoute(routeValue) {
    state.route = window.SmartRiskV11Router.normalizeRoute(routeValue);
    if (!window.SmartRiskV11Router.routes.some(route => route.id === state.route)) state.route = "inicio";
    $$("#nav [data-route]").forEach(button => button.classList.toggle("active", button.dataset.route === state.route));
    renderHeader();
    renderContent();
    window.scrollTo({ top: 0, behavior: "instant" });
  }

  async function start({ user, profile, db: suppliedDb, auth: suppliedAuth }) {
    state.user = user;
    state.profile = profile;
    state.db = suppliedDb;
    state.auth = suppliedAuth;
    state.profileContext = getProfileContext(profile, user);
    state.permissions = window.SmartRiskV11Permissions.getPermissions(profile);
    // Firebase se conserva en el estado interno; no se exponen credenciales ni referencias nuevas.
    $("#login")?.classList.add("hidden");
    $("#guideHelp")?.classList.add("hidden");
    $("#riskAnalyst")?.classList.add("hidden");
    state.route = window.SmartRiskV11Router.normalizeRoute(location.hash);
    renderShell();

    try {
      state.data = await window.SmartRiskV11DataAdapter.loadScopedRecords({ user, profile, db: suppliedDb, auth: suppliedAuth });
    } catch (error) {
      console.error(error);
      state.data = { records: [], entities: {}, filters: {}, errors: [{ message: error.message }], blocked: true };
    }
    if (!state.filters.provincia && state.data.filters?.provincias?.length === 1) state.filters.provincia = state.data.filters.provincias[0];
    if (!state.filters.canton && getCantonOptions().length === 1) state.filters.canton = getCantonOptions()[0];
    renderRoute(state.route);
    window.addEventListener("hashchange", () => renderRoute(location.hash));
    window.addEventListener("resize", scheduleNeuralConnectorLayout);
  }

  window.SmartRiskV11App = { start, render: renderRoute, state, icon };
})();
