(() => {
  "use strict";

  const VERSION = "11.0.0-rc8";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const icon = (name, size = 20) => window.SmartRiskV11App?.icon?.(name, size) || "";
  const appState = () => window.SmartRiskV11App?.state;
  const ZONE5 = ["Guayas", "Los Ríos", "Santa Elena", "Bolívar", "Galápagos"];

  const runtime = {
    map: null,
    geo: null,
    selected: null,
    bound: false,
    rendering: false
  };

  function ensureRoute() {
    const router = window.SmartRiskV11Router;
    if (!router) return;
    if (!router.routes.some(route => route.id === "dashboard")) {
      const index = Math.max(0, router.routes.findIndex(route => route.id === "inicio") + 1);
      router.routes.splice(index, 0, {
        id: "dashboard",
        title: "Dashboard",
        subtitle: "Lectura zonal, provincial y cantonal",
        icon: "dashboard",
        group: "Resumen"
      });
    }
    router.aliases.dashboard = "dashboard";
    router.aliases.panel = "dashboard";
  }

  function isDashboard() {
    return appState()?.route === "dashboard" || normalize(location.hash.replace(/^#\/?/, "")) === "dashboard";
  }

  function allRecords() {
    return Array.isArray(appState()?.data?.records) ? appState().data.records : [];
  }

  function entity(record, type) {
    return record?.entityType === type;
  }

  function recordText(record) {
    return normalize([
      record?.title,
      record?.detail,
      record?.tipo,
      record?.estado,
      record?.prioridad,
      record?.evento,
      record?.institucion,
      record?.unidad,
      JSON.stringify(record?.payload || {})
    ].filter(Boolean).join(" "));
  }

  function isBreach(record) {
    return /brecha|deficien|faltante|debilidad|limitacion|gap/.test(recordText(record));
  }

  function isAlert(record) {
    return /alerta|advertencia|vigilancia|emergencia|critico|critica/.test(recordText(record));
  }

  function sameTerritory(record, province, canton) {
    const same = (left, right) => !right || normalize(left) === normalize(right);
    return same(record?.provincia, province) && same(record?.canton, canton);
  }

  function recordsFor(province, canton, includeProvinceContacts = true) {
    const direct = allRecords().filter(record => sameTerritory(record, province, canton));
    if (!includeProvinceContacts || !canton) return direct;
    const provincialContacts = allRecords().filter(record => {
      const contact = entity(record, "institutions") || entity(record, "users");
      return contact && normalize(record?.provincia) === normalize(province) && !record?.canton;
    });
    const map = new Map();
    [...direct, ...provincialContacts].forEach(record => map.set(String(record.id), record));
    return [...map.values()];
  }

  function group(records) {
    const plans = records.filter(record => entity(record, "plans"));
    const actions = records.filter(record => entity(record, "actions"));
    const breaches = records.filter(isBreach);
    const risks = records.filter(record => entity(record, "risks") || entity(record, "criticalSites"));
    const alerts = records.filter(record => entity(record, "monitoringReports") && isAlert(record));
    const reports = records.filter(record => entity(record, "reports") || entity(record, "monitoringReports"));
    const contacts = records.filter(record => entity(record, "institutions") || entity(record, "users"));
    const completed = actions.filter(record => /complet|cerrad|finaliz/.test(recordText(record))).length;
    const overdue = actions.filter(record => /venc/.test(recordText(record))).length;
    const active = Math.max(actions.length - completed, 0);
    const progressValues = actions.map(record => Number(record.avance) || 0);
    const progress = progressValues.length ? Math.round(progressValues.reduce((sum, value) => sum + value, 0) / progressValues.length) : 0;
    const georeferenced = records.filter(record => Number.isFinite(record.lat) && Number.isFinite(record.lng));
    const coverageParts = [plans.length, actions.length, breaches.length, risks.length || alerts.length || reports.length, contacts.length, georeferenced.length];
    const coverage = Math.round((coverageParts.filter(Boolean).length / coverageParts.length) * 100);
    return { plans, actions, breaches, risks, alerts, reports, contacts, completed, overdue, active, progress, coverage };
  }

  function planStatus(plans) {
    if (!plans.length) return "Sin plan visible";
    const texts = plans.map(recordText).join(" ");
    if (/ejec|activo|vigente/.test(texts)) return "En ejecución";
    if (/revision|actualiza/.test(texts)) return "En revisión";
    if (/complet|aprob|final/.test(texts)) return "Aprobado / completo";
    return plans[0].estado || "Plan registrado";
  }

  function territoryDescription(records, province, canton) {
    const preferred = records.find(record => entity(record, "risks") || entity(record, "criticalSites") || entity(record, "monitoringReports") || entity(record, "plans"));
    if (preferred?.detail && preferred.detail !== "Registro autorizado") return preferred.detail;
    const label = [canton, province].filter(Boolean).join(", ") || "el alcance seleccionado";
    return `${label} cuenta con ${records.length} registros autorizados para análisis, planificación, coordinación y seguimiento.`;
  }

  function featureTerritory(feature) {
    const props = feature?.properties || {};
    return {
      canton: props.DPA_DESCAN || props.CANTON || props.canton || props.NOM_CANTON || props.nombre || "Cantón",
      province: props.DPA_DESPRO || props.PROVINCIA || props.provincia || props.NOM_PROV || ""
    };
  }

  async function loadGeo() {
    if (runtime.geo) return runtime.geo;
    const response = await fetch("geo/cantones-zonal5.geojson");
    if (!response.ok) throw new Error("No fue posible cargar el mapa cantonal de la Zona 5");
    runtime.geo = await response.json();
    return runtime.geo;
  }

  function territoryInventory(geo) {
    const map = new Map();
    (geo?.features || []).forEach(feature => {
      const { province, canton } = featureTerritory(feature);
      if (!canton) return;
      map.set(`${normalize(province)}|${normalize(canton)}`, { province, canton, feature });
    });
    allRecords().forEach(record => {
      if (!record.canton) return;
      const key = `${normalize(record.provincia)}|${normalize(record.canton)}`;
      if (!map.has(key)) map.set(key, { province: record.provincia || "", canton: record.canton, feature: null });
    });
    return [...map.values()].map(item => {
      const summary = group(recordsFor(item.province, item.canton));
      return { ...item, ...summary };
    }).sort((a, b) => a.province.localeCompare(b.province, "es") || a.canton.localeCompare(b.canton, "es"));
  }

  function filteredRecords() {
    const state = appState();
    const province = state?.filters?.provincia || "";
    const canton = state?.filters?.canton || "";
    return allRecords().filter(record => sameTerritory(record, province, canton));
  }

  function optionList(values, selected, allLabel) {
    return `<option value="">${esc(allLabel)}</option>${values.map(value => `<option value="${esc(value)}" ${normalize(value) === normalize(selected) ? "selected" : ""}>${esc(value)}</option>`).join("")}`;
  }

  function metric(label, value, detail, tone, iconName) {
    return `<article class="sr8-kpi ${tone}"><span>${icon(iconName, 22)}</span><div><small>${esc(label)}</small><strong>${esc(value)}</strong><em>${esc(detail)}</em></div></article>`;
  }

  function territoryPanel(province, canton) {
    if (!canton) {
      return `<div class="sr8-territory-empty">${icon("map", 36)}<h3>Selecciona un cantón</h3><p>Haz clic en el mapa o utiliza el selector para consultar plan, brechas, acciones, contactos e indicadores.</p><b>Pregunta sugerente</b><span>¿En qué territorio falta información y qué acción requiere prioridad?</span></div>`;
    }
    const records = recordsFor(province, canton);
    const summary = group(records);
    const contacts = summary.contacts.slice(0, 3);
    const important = [...summary.breaches, ...summary.alerts, ...summary.risks].slice(0, 3);
    return `<div class="sr8-territory-card">
      <header><div><small>Detalle territorial</small><h2>${esc(canton)}</h2><p>${esc(province)}</p></div><span class="sr8-coverage">${summary.coverage}%<small>información</small></span></header>
      <p class="sr8-description">${esc(territoryDescription(records, province, canton))}</p>
      <div class="sr8-question"><b>Pregunta sugerente</b><span>¿Qué información falta y qué acción requiere prioridad en este cantón?</span></div>
      <dl class="sr8-territory-stats">
        <div><dt>Estado del plan</dt><dd>${esc(planStatus(summary.plans))}</dd></div>
        <div><dt>Avance de acciones</dt><dd>${summary.progress}%</dd></div>
        <div><dt>Brechas / alertas</dt><dd>${summary.breaches.length} / ${summary.alerts.length}</dd></div>
        <div><dt>Riesgos críticos</dt><dd>${summary.risks.length}</dd></div>
      </dl>
      <section><h3>Prioridades visibles</h3>${important.length ? important.map(item => `<button data-rc8-record="${esc(item.id)}"><b>${esc(item.title)}</b><small>${esc(item.estado || item.prioridad || item.detail)}</small></button>`).join("") : `<p class="sr8-muted">No se identificaron alertas o brechas clasificadas.</p>`}</section>
      <section><h3>Contactos relevantes</h3>${contacts.length ? contacts.map(item => `<div class="sr8-contact"><b>${esc(item.title)}</b><small>${esc(item.unidad || item.institucion || item.estado || "Contacto institucional")}</small></div>`).join("") : `<p class="sr8-muted">Sin contactos vinculados al cantón; se muestran los provinciales cuando están disponibles.</p>`}</section>
      <div class="sr8-quick-actions">
        <button data-rc8-route="acciones">Acciones</button>
        <button data-rc8-panel="planes">Planes</button>
        <button data-rc8-route="instituciones">Contactos</button>
        <button data-rc8-scroll="indicadores">Indicadores</button>
        <button data-rc8-panel="detalle">Detalle territorial</button>
      </div>
    </div>`;
  }

  function compactList(title, items, empty, type) {
    return `<article class="sr-card sr8-compact-card"><header><h2>${esc(title)}</h2><span>${items.length}</span></header><div>${items.length ? items.slice(0, 5).map(item => `<button data-rc8-record="${esc(item.id)}"><b>${esc(item.title)}</b><small>${esc(item.estado || item.prioridad || item.detail || item.tipo)}</small></button>`).join("") : `<p class="sr8-muted">${esc(empty)}</p>`}</div>${items.length > 5 ? `<button class="sr8-more" data-rc8-panel="${type}">Ver ${items.length} registros</button>` : ""}</article>`;
  }

  async function renderDashboard() {
    if (!isDashboard() || runtime.rendering) return;
    runtime.rendering = true;
    const content = $("#content");
    if (!content) { runtime.rendering = false; return; }
    content.innerHTML = `<div class="sr8-loading">${icon("refresh", 24)} Cargando lectura territorial de la Zona 5…</div>`;
    try {
      const geo = await loadGeo();
      if (!isDashboard()) return;
      const territories = territoryInventory(geo);
      const state = appState();
      const province = state.filters.provincia || "";
      const canton = state.filters.canton || "";
      const scoped = filteredRecords();
      const summary = group(scoped);
      const visibleTerritories = territories.filter(item => (!province || normalize(item.province) === normalize(province)));
      const provinces = [...new Set(territories.map(item => item.province).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
      const cantons = visibleTerritories.map(item => item.canton);
      const cantonsWithData = visibleTerritories.filter(item => recordsFor(item.province, item.canton, false).length).length;
      const avgCoverage = visibleTerritories.length ? Math.round(visibleTerritories.reduce((sum, item) => sum + item.coverage, 0) / visibleTerritories.length) : 0;
      const averageZonalProgress = territories.length ? Math.round(territories.reduce((sum, item) => sum + item.progress, 0) / territories.length) : 0;
      const selectedRecords = canton ? recordsFor(province, canton) : scoped;
      const selectedSummary = group(selectedRecords);

      content.innerHTML = `<section class="sr8-scope-bar">
        <div><b>Dashboard territorial CZ5</b><span>Disponibilidad, planes, brechas, acciones y comparación territorial.</span></div>
        <label>Nivel<select id="sr8Level"><option value="zonal" ${!province ? "selected" : ""}>Zonal</option><option value="provincial" ${province && !canton ? "selected" : ""}>Provincial</option><option value="cantonal" ${canton ? "selected" : ""}>Cantonal</option></select></label>
        <label>Provincia<select id="sr8Province">${optionList(provinces, province, "Toda la Zona 5")}</select></label>
        <label>Cantón<select id="sr8Canton">${optionList(cantons, canton, "Todos los cantones")}</select></label>
      </section>
      <section class="sr8-kpis">
        ${metric("Cantones con información", cantonsWithData, `${visibleTerritories.length} cantones en el mapa`, "blue", "map")}
        ${metric("Planes visibles", summary.plans.length, planStatus(summary.plans), "green", "reports")}
        ${metric("Brechas identificadas", summary.breaches.length, `${summary.alerts.length} alertas`, "red", "risk")}
        ${metric("Acciones activas", summary.active, `${summary.overdue} vencidas · ${summary.completed} cerradas`, "orange", "actions")}
        ${metric("Avance promedio", `${summary.progress}%`, `Promedio zonal ${averageZonalProgress}%`, "purple", "check")}
        ${metric("Cobertura informativa", `${avgCoverage}%`, `${summary.contacts.length} contactos visibles`, "cyan", "institution")}
      </section>
      <section class="sr8-main-grid">
        <article class="sr-card sr8-map-card"><header><div><h2>Mapa cantonal de la Coordinación Zonal 5</h2><p>Selecciona un cantón para desplegar información ampliada.</p></div><span>${ZONE5.join(" · ")}</span></header><div id="sr8Map" class="sr8-map"></div></article>
        <aside id="sr8TerritoryPanel" class="sr-card sr8-territory-panel">${territoryPanel(province, canton)}</aside>
      </section>
      <section id="sr8Indicators" class="sr8-review-grid">
        ${compactList("Planes", selectedSummary.plans, "No existen planes visibles para el alcance seleccionado.", "planes")}
        ${compactList("Brechas y alertas", [...selectedSummary.breaches, ...selectedSummary.alerts], "No existen brechas o alertas clasificadas.", "brechas")}
        ${compactList("Acciones", selectedSummary.actions, "No existen acciones registradas.", "acciones")}
        <article class="sr-card sr8-comparison"><header><h2>Comparación del avance</h2><span>Cantón / Zona 5</span></header><div><b>${selectedSummary.progress}%</b><i>frente a</i><strong>${averageZonalProgress}%</strong></div><p>${selectedSummary.progress >= averageZonalProgress ? "El alcance seleccionado está sobre el promedio zonal." : "El alcance seleccionado requiere refuerzo para alcanzar el promedio zonal."}</p></article>
      </section>
      <section class="sr-card sr8-inventory"><header><div><h2>¿Con qué información cuento?</h2><p>Comparación rápida de cobertura por cantón.</p></div><span>${visibleTerritories.length} territorios</span></header><div class="sr8-table-wrap"><table><thead><tr><th>Provincia</th><th>Cantón</th><th>Plan</th><th>Brechas</th><th>Acciones</th><th>Contactos</th><th>Cobertura</th><th></th></tr></thead><tbody>${visibleTerritories.map(item => `<tr><td>${esc(item.province)}</td><td><b>${esc(item.canton)}</b></td><td>${item.plans.length}</td><td>${item.breaches.length}</td><td>${item.actions.length}</td><td>${item.contacts.length}</td><td><span class="sr8-bar"><i style="width:${item.coverage}%"></i></span><b>${item.coverage}%</b></td><td><button data-rc8-select="${esc(item.canton)}" data-rc8-province="${esc(item.province)}">Abrir</button></td></tr>`).join("")}</tbody></table></div></section>`;

      bindDashboardControls(territories);
      mountMap(geo, territories);
    } catch (error) {
      console.error(error);
      content.innerHTML = `<div class="sr-empty"><strong>No fue posible cargar el Dashboard territorial</strong><p>${esc(error.message)}</p><button type="button" data-rc8-retry>Reintentar</button></div>`;
    } finally {
      runtime.rendering = false;
    }
  }

  function bindDashboardControls(territories) {
    $("#sr8Province")?.addEventListener("change", event => {
      const state = appState();
      state.filters.provincia = event.target.value;
      state.filters.canton = "";
      renderDashboard();
    });
    $("#sr8Canton")?.addEventListener("change", event => {
      const state = appState();
      state.filters.canton = event.target.value;
      if (state.filters.canton && !state.filters.provincia) {
        const found = territories.find(item => normalize(item.canton) === normalize(state.filters.canton));
        if (found) state.filters.provincia = found.province;
      }
      renderDashboard();
    });
    $("#sr8Level")?.addEventListener("change", event => {
      const state = appState();
      if (event.target.value === "zonal") { state.filters.provincia = ""; state.filters.canton = ""; }
      if (event.target.value === "provincial") state.filters.canton = "";
      renderDashboard();
    });
  }

  function coverageColor(value) {
    if (value >= 80) return "#168a4a";
    if (value >= 60) return "#65a94c";
    if (value >= 40) return "#f1b51c";
    if (value >= 20) return "#ef8a19";
    return "#d94848";
  }

  function mountMap(geo, territories) {
    if (!window.L || !$("#sr8Map")) return;
    runtime.map?.remove();
    const map = L.map("sr8Map", { zoomControl: true, attributionControl: true }).setView([-1.65, -79.55], 7);
    runtime.map = map;
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18, attribution: "© OpenStreetMap" }).addTo(map);
    const byKey = new Map(territories.map(item => [`${normalize(item.province)}|${normalize(item.canton)}`, item]));
    const layer = L.geoJSON(geo, {
      style: feature => {
        const territory = featureTerritory(feature);
        const summary = byKey.get(`${normalize(territory.province)}|${normalize(territory.canton)}`);
        return { color: "#ffffff", weight: 1.5, fillColor: coverageColor(summary?.coverage || 0), fillOpacity: 0.78 };
      },
      onEachFeature: (feature, featureLayer) => {
        const territory = featureTerritory(feature);
        const summary = byKey.get(`${normalize(territory.province)}|${normalize(territory.canton)}`) || group([]);
        featureLayer.bindTooltip(`${esc(territory.canton)} · ${summary.coverage}%`, { sticky: true });
        featureLayer.on("click", () => {
          const state = appState();
          state.filters.provincia = territory.province;
          state.filters.canton = territory.canton;
          const popup = `<div class="sr8-popup"><b>${esc(territory.canton)}</b><small>${esc(territory.province)}</small><p>¿Qué información falta y qué acción requiere prioridad?</p><div><button data-rc8-route="acciones">Acciones</button><button data-rc8-panel="planes">Planes</button><button data-rc8-route="instituciones">Contactos</button><button data-rc8-scroll="indicadores">Indicadores</button><button data-rc8-panel="detalle">Detalle</button></div></div>`;
          featureLayer.bindPopup(popup, { maxWidth: 330 }).openPopup();
          $("#sr8TerritoryPanel").innerHTML = territoryPanel(territory.province, territory.canton);
          $("#sr8Province").value = territory.province;
          $("#sr8Canton").innerHTML = optionList(territories.filter(item => normalize(item.province) === normalize(territory.province)).map(item => item.canton), territory.canton, "Todos los cantones");
          $("#sr8Level").value = "cantonal";
        });
      }
    }).addTo(map);
    if (layer.getBounds().isValid()) map.fitBounds(layer.getBounds(), { padding: [20, 20] });
    const state = appState();
    if (state.filters.provincia || state.filters.canton) {
      const targetLayers = [];
      layer.eachLayer(item => {
        const territory = featureTerritory(item.feature);
        if ((!state.filters.provincia || normalize(territory.province) === normalize(state.filters.provincia)) && (!state.filters.canton || normalize(territory.canton) === normalize(state.filters.canton))) targetLayers.push(item);
      });
      if (targetLayers.length) {
        const groupLayer = L.featureGroup(targetLayers);
        if (groupLayer.getBounds().isValid()) map.fitBounds(groupLayer.getBounds(), { padding: [28, 28], maxZoom: state.filters.canton ? 11 : 9 });
      }
    }
    setTimeout(() => map.invalidateSize(), 80);
  }

  function drawer(title, records, summaryText = "") {
    $("#sr8Drawer")?.remove();
    const aside = document.createElement("aside");
    aside.id = "sr8Drawer";
    aside.className = "sr8-drawer";
    aside.innerHTML = `<header><div><small>Dashboard territorial</small><h2>${esc(title)}</h2></div><button data-rc8-close>${icon("close", 20)}</button></header>${summaryText ? `<p class="sr8-description">${esc(summaryText)}</p>` : ""}<div>${records.length ? records.slice(0, 30).map(item => `<article><b>${esc(item.title)}</b><p>${esc(item.detail || item.estado || item.prioridad || "Registro autorizado")}</p><small>${esc([item.canton, item.provincia, item.institucion].filter(Boolean).join(" · ") || item.tipo)}</small></article>`).join("") : `<p class="sr8-muted">No existen registros para este componente.</p>`}</div>`;
    document.body.appendChild(aside);
    requestAnimationFrame(() => aside.classList.add("open"));
  }

  function currentTerritory() {
    const state = appState();
    return { province: state?.filters?.provincia || "", canton: state?.filters?.canton || "" };
  }

  function openPanel(kind) {
    const { province, canton } = currentTerritory();
    const records = recordsFor(province, canton);
    const summary = group(records);
    if (kind === "planes") drawer(`Planes · ${canton || province || "Zona 5"}`, summary.plans);
    if (kind === "brechas") drawer(`Brechas y alertas · ${canton || province || "Zona 5"}`, [...summary.breaches, ...summary.alerts]);
    if (kind === "acciones") drawer(`Acciones · ${canton || province || "Zona 5"}`, summary.actions);
    if (kind === "detalle") drawer(`Detalle territorial · ${canton || province || "Zona 5"}`, records, territoryDescription(records, province, canton));
  }

  function bindGlobalEvents() {
    if (runtime.bound) return;
    runtime.bound = true;
    document.addEventListener("click", event => {
      const select = event.target.closest("[data-rc8-select]");
      if (select) {
        const state = appState();
        state.filters.provincia = select.dataset.rc8Province || "";
        state.filters.canton = select.dataset.rc8Select || "";
        renderDashboard();
        return;
      }
      const route = event.target.closest("[data-rc8-route]");
      if (route) {
        location.hash = `#/${route.dataset.rc8Route}`;
        return;
      }
      const panel = event.target.closest("[data-rc8-panel]");
      if (panel) { openPanel(panel.dataset.rc8Panel); return; }
      if (event.target.closest("[data-rc8-scroll='indicadores']")) {
        $("#sr8Indicators")?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
      }
      const recordButton = event.target.closest("[data-rc8-record]");
      if (recordButton) {
        const record = allRecords().find(item => String(item.id) === String(recordButton.dataset.rc8Record));
        if (record) drawer(record.title, [record]);
        return;
      }
      if (event.target.closest("[data-rc8-close]")) { $("#sr8Drawer")?.remove(); return; }
      if (event.target.closest("[data-rc8-retry]")) renderDashboard();
    });
    window.addEventListener("hashchange", () => {
      if (isDashboard()) setTimeout(renderDashboard, 0);
      else { runtime.map?.remove(); runtime.map = null; }
    });
  }

  function afterAppStart() {
    ensureRoute();
    bindGlobalEvents();
    if (isDashboard()) setTimeout(renderDashboard, 0);
  }

  ensureRoute();
  window.SmartRiskV11DashboardRC8 = { VERSION, afterAppStart, render: renderDashboard, ensureRoute };
})();
