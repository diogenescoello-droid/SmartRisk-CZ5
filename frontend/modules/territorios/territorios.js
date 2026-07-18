window.SmartRisk = window.SmartRisk || {};

(function () {
  const SR = SmartRisk;
  let context = SR.Workspace.read();

  const data = () => ({
    territories: SR.Storage.get("territories", SR.MockData.territories) || [],
    sites: SR.Storage.get("sites", SR.MockData.sites) || [],
    actions: SR.Storage.get("actions", SR.MockData.actions) || [],
    institutions: SR.Storage.get("institutions", SR.MockData.institutions) || []
  });

  const esc = value => SR.Utils.escapeHtml(value ?? "");
  const norm = value => SR.Utils.normalizeText(value ?? "");
  const same = (a, b) => norm(a) === norm(b);
  const unique = values => [...new Set(values.filter(Boolean).map(String))].sort((a, b) => a.localeCompare(b, "es"));

  function territoryCatalog(source) {
    const rows = [];
    const add = (provincia, canton) => {
      provincia = String(provincia || "").trim();
      canton = String(canton || "").trim();
      if (!provincia) return;
      rows.push({ provincia, canton });
    };

    source.territories.forEach(x => add(x.provincia, x.canton || x.capital));
    source.sites.forEach(x => add(x.provincia, x.canton));
    source.actions.forEach(x => add(x.provincia, x.canton));
    source.institutions.forEach(x => add(x.provincia, x.canton));

    const seen = new Set();
    return rows.filter(x => {
      const key = `${norm(x.provincia)}|${norm(x.canton)}`;
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function provinces(source) {
    return unique(territoryCatalog(source).map(x => x.provincia));
  }

  function cantons(source, province) {
    return unique(territoryCatalog(source)
      .filter(x => same(x.provincia, province) && x.canton)
      .map(x => x.canton));
  }

  function ensureContext(source) {
    const availableProvinces = provinces(source);
    if (!context.provincia || !availableProvinces.some(x => same(x, context.provincia))) {
      context = SR.Workspace.set({ provincia: availableProvinces[0] || "", canton: "" });
    }
    const availableCantons = cantons(source, context.provincia);
    if (context.canton && !availableCantons.some(x => same(x, context.canton))) {
      context = SR.Workspace.set({ provincia: context.provincia, canton: availableCantons[0] || "" });
    }
    if (!context.canton && availableCantons.length) {
      context = SR.Workspace.set({ provincia: context.provincia, canton: availableCantons[0] });
    }
  }

  function scoped(source) {
    const matches = row => {
      const provinceOk = !context.provincia || same(row.provincia, context.provincia);
      const cantonValue = row.canton || row.capital || "";
      const cantonOk = !context.canton || same(cantonValue, context.canton);
      return provinceOk && cantonOk;
    };
    return {
      territories: source.territories.filter(matches),
      sites: source.sites.filter(matches),
      actions: source.actions.filter(matches),
      institutions: source.institutions.filter(matches)
    };
  }

  function planRecord(source) {
    return source.territories.find(x => same(x.provincia, context.provincia) && same(x.canton || x.capital, context.canton))
      || source.territories.find(x => same(x.provincia, context.provincia))
      || {};
  }

  function completion(source) {
    const record = planRecord(source);
    const raw = Number(record.valoracion ?? record.avance ?? 0);
    return Math.max(0, Math.min(100, Math.round(raw)));
  }

  function actionStatus(rows) {
    const complete = rows.filter(x => norm(x.estado) === "completada").length;
    const blocked = rows.filter(x => norm(x.estado) === "bloqueada").length;
    const progress = rows.length
      ? Math.round(rows.reduce((sum, x) => sum + Number(x.avance || 0), 0) / rows.length)
      : 0;
    return { complete, blocked, progress };
  }

  function riskPriority(rows) {
    const high = rows.filter(x => ["alto", "muy alto"].includes(norm(x.nivelRiesgo))).length;
    const veryHigh = rows.filter(x => norm(x.nivelRiesgo) === "muy alto").length;
    return { high, veryHigh };
  }


  function qualitySummary(actions) {
    const rows = actions.map(action => ({ action, quality: SR.ActionQuality.evaluate(action) }));
    const average = Math.round(rows.reduce((sum, row) => sum + row.quality.score, 0) / Math.max(rows.length, 1));
    return {
      rows,
      average,
      critical: rows.filter(row => row.quality.score < 40).length,
      important: rows.filter(row => row.quality.score >= 40 && row.quality.score < 60).length,
      adjustments: rows.filter(row => row.quality.score >= 60 && row.quality.score < 80).length,
      viable: rows.filter(row => row.quality.score >= 80).length,
      commitments: rows.filter(row => text(row.action.compromisoProximaActualizacion)).length,
      ready: rows.filter(row => SR.ActionQuality.isReadyForReview(row.action)).length,
      pendingReview: rows.filter(row => ["Enviado a revisión", "Corregido"].includes(SR.ActionQuality.reviewState(row.action))).length
    };
  }

  function text(value) { return String(value ?? "").trim(); }

  function gapPanel(scope) {
    const summary = qualitySummary(scope.actions);
    const deadline = SR.ActionQuality.deadlineInfo();
    const sorted = summary.rows.slice().sort((a, b) => a.quality.score - b.quality.score);
    return `<section class="territory-gap-section" aria-labelledby="territory-gap-title">
      <header class="territory-gap-header">
        <div><span class="kicker">Control de calidad operativa</span><h2 id="territory-gap-title">Brechas y próxima actualización</h2><p>Prioriza los ajustes que deben ejecutar las UGR antes del ${deadline.label}.</p></div>
        <div class="territory-deadline"><span>${deadline.label}</span><strong>${deadline.message}</strong></div>
      </header>
      <div class="territory-gap-kpis">
        <article><span>Calidad promedio</span><strong>${summary.average}%</strong><small>Sobre ${scope.actions.length} acciones</small></article>
        <article><span>Brechas críticas</span><strong>${summary.critical + summary.important}</strong><small>Menos de 60% de calidad</small></article>
        <article><span>Compromisos registrados</span><strong>${summary.commitments}</strong><small>Agenda al 23 de julio</small></article>
        <article><span>Listas para revisión</span><strong>${summary.ready}</strong><small>${summary.pendingReview} enviadas a Coordinación</small></article>
      </div>
      <div class="territory-gap-layout">
        <article class="panel"><header class="panel-header"><div><h3 class="section-title">Brechas de calidad</h3><p class="muted">Acciones ordenadas desde la menor calidad operativa.</p></div><button class="btn btn-secondary btn-sm" data-open-route="/acciones" type="button">Abrir matriz</button></header>
          <div class="panel-body territory-gap-list">${sorted.length ? sorted.slice(0, 7).map(({ action, quality }) => `<button type="button" class="territory-gap-item quality-${quality.className}" data-action-id="${esc(action.id)}"><span class="territory-quality-score">${quality.score}%</span><span><strong>${esc(action.titulo)}</strong><small>${esc(action.linea)} · ${quality.gaps.length} brechas · ${esc(SR.ActionQuality.reviewState(action))}</small></span><b>${esc(quality.level)}</b></button>`).join("") : '<div class="empty-state compact"><strong>Sin acciones</strong><p>No existen acciones vinculadas al territorio.</p></div>'}</div>
        </article>
        <article class="panel"><header class="panel-header"><div><h3 class="section-title">Agenda al 23 de julio</h3><p class="muted">Compromisos reportados por los técnicos UGR.</p></div><span class="badge">${summary.commitments}</span></header>
          <div class="panel-body territory-agenda-list">${summary.rows.length ? summary.rows.slice(0, 7).map(({ action }) => `<div class="territory-agenda-item"><span class="agenda-state ${text(action.compromisoProximaActualizacion) ? "has" : "missing"}"></span><section><strong>${esc(action.titulo)}</strong><p>${esc(action.compromisoProximaActualizacion || "Pendiente de definir el siguiente paso operativo.")}</p><small>${esc(action.responsable || "Sin responsable")} · ${esc(action.fechaCompromiso || SR.ActionQuality.TARGET_DATE)} · ${esc(action.estadoRevision || "Borrador")}</small></section></div>`).join("") : '<div class="empty-state compact"><strong>Sin compromisos</strong><p>No existen acciones vinculadas al territorio.</p></div>'}</div>
        </article>
      </div>
    </section>`;
  }

  function coordinationPanel(scope) {
    const items = scope.actions.filter(action => ["Enviado a revisión", "Corregido", "Observado"].includes(SR.ActionQuality.reviewState(action)) || action.solicitudAsistencia);
    return `<article class="panel territory-coordination-panel"><header class="panel-header"><div><span class="kicker">Vista de Coordinación</span><h2 class="section-title">Bandeja de seguimiento</h2></div><span class="badge">${items.length}</span></header><div class="panel-body">${items.length ? `<div class="territory-review-list">${items.slice(0,6).map(action => `<div><span class="badge">${esc(SR.ActionQuality.reviewState(action))}</span><section><strong>${esc(action.titulo)}</strong><small>${esc(action.actualizadoPor || action.responsable || "Sin usuario")} · ${action.ultimaActualizacion ? new Date(action.ultimaActualizacion).toLocaleString("es-EC") : "Sin actualización reciente"}</small>${action.solicitudAsistencia ? `<p><b>Asistencia:</b> ${esc(action.solicitudAsistencia)}</p>` : ""}</section></div>`).join("")}</div>` : '<div class="empty-state compact"><strong>Sin novedades de revisión</strong><p>Las acciones enviadas, observadas o con solicitudes de asistencia aparecerán aquí.</p></div>'}</div></article>`;
  }

  function contextBar(source) {
    const provinceOptions = provinces(source).map(x => `<option value="${esc(x)}" ${same(x, context.provincia) ? "selected" : ""}>${esc(x)}</option>`).join("");
    const cantonOptions = cantons(source, context.provincia).map(x => `<option value="${esc(x)}" ${same(x, context.canton) ? "selected" : ""}>${esc(x)}</option>`).join("");
    return `
      <section class="territory-context" aria-labelledby="territory-context-title">
        <div>
          <span class="kicker">Contexto territorial activo</span>
          <h2 id="territory-context-title">${esc(context.canton || context.provincia || "Zona 5")}</h2>
          <p>${esc(context.provincia || "Seleccione una provincia")} · El contexto se conservará al abrir otros módulos.</p>
        </div>
        <div class="territory-context-controls">
          <label><span>Provincia</span><select id="workspace-province" class="select-input">${provinceOptions}</select></label>
          <label><span>Cantón</span><select id="workspace-canton" class="select-input">${cantonOptions || '<option value="">Sin cantones disponibles</option>'}</select></label>
          <button id="workspace-clear" class="btn btn-secondary" type="button">Restablecer</button>
        </div>
      </section>`;
  }

  function kpis(scope, source) {
    const actions = actionStatus(scope.actions);
    const risks = riskPriority(scope.sites);
    const plan = completion(source);
    return `
      <section class="territory-kpis" aria-label="Indicadores del territorio">
        <article><span>Valoración del plan</span><strong>${plan}%</strong><small>Avance documental registrado</small></article>
        <article><span>Sitios inventariados</span><strong>${scope.sites.length}</strong><small>${risks.high} con riesgo alto o muy alto</small></article>
        <article><span>Acciones</span><strong>${scope.actions.length}</strong><small>${actions.progress}% de avance promedio</small></article>
        <article><span>Instituciones</span><strong>${scope.institutions.length}</strong><small>Actores vinculados al contexto</small></article>
      </section>`;
  }

  function priorityPanel(scope) {
    const blocked = scope.actions.filter(x => norm(x.estado) === "bloqueada");
    const critical = scope.sites.filter(x => ["alto", "muy alto"].includes(norm(x.nivelRiesgo)));
    const items = [
      ...critical.slice(0, 3).map(x => ({ type: "Sitio prioritario", title: x.nombre, detail: `${x.nivelRiesgo} · ${x.evento || x.amenaza || "Amenaza sin definir"}`, route: "/sitios" })),
      ...blocked.slice(0, 3).map(x => ({ type: "Acción bloqueada", title: x.titulo, detail: x.responsable || "Responsable no asignado", route: "/acciones" }))
    ].slice(0, 5);

    return `<article class="panel territory-priority-panel">
      <header class="panel-header"><div><span class="kicker">Priorización</span><h2 class="section-title">Atención requerida</h2></div><span class="badge">${items.length}</span></header>
      <div class="panel-body">
        ${items.length ? `<div class="territory-priority-list">${items.map(item => `<button class="territory-priority-item" data-open-route="${item.route}" type="button"><span>${esc(item.type)}</span><strong>${esc(item.title)}</strong><small>${esc(item.detail)}</small></button>`).join("")}</div>` : '<div class="empty-state compact"><strong>Sin alertas críticas</strong><p>No se identifican sitios prioritarios ni acciones bloqueadas en este contexto.</p></div>'}
      </div>
    </article>`;
  }

  function planPanel(source, scope) {
    const record = planRecord(source);
    const value = completion(source);
    const validation = record.planValidado || (norm(record.estadoRevision) === "validado" ? "SI" : "NO");
    const actions = actionStatus(scope.actions);
    return `<article class="panel territory-plan-panel">
      <header class="panel-header"><div><span class="kicker">Plan cantonal</span><h2 class="section-title">Estado de preparación</h2></div><span class="badge ${validation === "SI" ? "badge-success" : "badge-warning"}">${validation === "SI" ? "Validado" : "En seguimiento"}</span></header>
      <div class="panel-body">
        <div class="territory-plan-progress"><div><strong>${value}%</strong><span>Valoración documental</span></div><div class="territory-progress-track" aria-label="Avance ${value}%"><span style="width:${value}%"></span></div></div>
        <dl class="territory-definition-list">
          <div><dt>Estado de revisión</dt><dd>${esc(record.estadoRevision || record.estado || "Sin registro")}</dd></div>
          <div><dt>Responsable</dt><dd>${esc(record.responsable || "Sin asignar")}</dd></div>
          <div><dt>Acciones completadas</dt><dd>${actions.complete} de ${scope.actions.length}</dd></div>
          <div><dt>Acciones bloqueadas</dt><dd>${actions.blocked}</dd></div>
        </dl>
        ${record.enlacePlan ? `<a class="btn btn-secondary btn-block" href="${esc(record.enlacePlan)}" target="_blank" rel="noopener">Abrir plan registrado</a>` : ""}
      </div>
    </article>`;
  }

  function moduleLinks(scope) {
    const links = [
      ["Sitios", scope.sites.length, "pin", "/sitios", "Inventario, geometrías y riesgo"],
      ["Acciones", scope.actions.length, "check", "/acciones", "Seguimiento operativo"],
      ["Instituciones", scope.institutions.length, "building", "/instituciones", "Actores y responsables"],
      ["Indicadores", "Abrir", "bar-chart-2", "/indicadores", "Lectura comparativa"],
      ["Reportes", "Generar", "file-text", "/reportes", "Salidas ejecutivas"],
      ["ArcGIS", "Mapa", "map", "/arcgis", "Visualización espacial"]
    ];
    return `<section class="territory-module-grid" aria-label="Módulos del territorio">${links.map(([label, value, icon, route, detail]) => `
      <button class="territory-module-card" type="button" data-open-route="${route}">
        <span class="territory-module-icon">${SR.Icon.render(icon, 20)}</span>
        <span><strong>${label}</strong><small>${detail}</small></span>
        <b>${value}</b>
      </button>`).join("")}</section>`;
  }

  function activity(scope) {
    const rows = scope.actions.slice().sort((a, b) => String(b.fechaFin || "").localeCompare(String(a.fechaFin || ""))).slice(0, 5);
    return `<article class="panel territory-activity-panel">
      <header class="panel-header"><div><span class="kicker">Seguimiento</span><h2 class="section-title">Actividad operativa</h2></div><button class="btn btn-secondary btn-sm" type="button" data-open-route="/acciones">Ver acciones</button></header>
      <div class="panel-body">${rows.length ? `<div class="territory-activity-list">${rows.map(x => `<div><span class="badge">${esc(x.estado || "Sin estado")}</span><section><strong>${esc(x.titulo)}</strong><small>${esc(x.responsable || "Sin responsable")} · ${Number(x.avance || 0)}%</small></section></div>`).join("")}</div>` : '<div class="empty-state compact"><strong>Sin actividad registrada</strong><p>Este territorio aún no tiene acciones vinculadas.</p></div>'}</div>
    </article>`;
  }

  function render() {
    const source = data();
    ensureContext(source);
    const scope = scoped(source);
    return `
      <section class="page-header territory-page-header">
        <div><span class="kicker">Workspace territorial</span><h1 class="page-title">Gestión territorial</h1><p class="page-subtitle">Concentra la lectura del cantón y mantiene el contexto operativo entre módulos.</p></div>
        <div class="split-actions"><button id="territory-export" class="btn btn-secondary" type="button">${SR.Icon.render("download", 17)}Exportar resumen</button><button class="btn btn-primary" type="button" data-open-route="/sincronizacion">${SR.Icon.render("refresh-cw", 17)}Actualizar datos</button></div>
      </section>
      ${contextBar(source)}
      ${kpis(scope, source)}
      <section class="territory-workspace-layout">
        ${planPanel(source, scope)}
        ${priorityPanel(scope)}
      </section>
      ${gapPanel(scope)}
      ${coordinationPanel(scope)}
      ${moduleLinks(scope)}
      ${activity(scope)}`;
  }

  function exportSummary() {
    const source = data();
    const scope = scoped(source);
    const actionInfo = actionStatus(scope.actions);
    SR.Utils.downloadCsv(`resumen-${norm(context.canton || context.provincia).replaceAll(" ", "-") || "territorio"}.csv`, [{
      provincia: context.provincia,
      canton: context.canton,
      valoracion_plan: completion(source),
      sitios: scope.sites.length,
      sitios_alto_muy_alto: riskPriority(scope.sites).high,
      acciones: scope.actions.length,
      avance_promedio_acciones: actionInfo.progress,
      acciones_bloqueadas: actionInfo.blocked,
      calidad_promedio_acciones: qualitySummary(scope.actions).average,
      acciones_brecha_critica: qualitySummary(scope.actions).critical + qualitySummary(scope.actions).important,
      compromisos_23_julio: qualitySummary(scope.actions).commitments,
      listas_para_revision: qualitySummary(scope.actions).ready,
      instituciones: scope.institutions.length
    }]);
    SR.Toast.show("Resumen territorial exportado.", "success");
  }

  function refreshView(next) {
    context = SR.Workspace.set(next);
    SR.Router.resolve();
  }

  function bind() {
    const source = data();
    document.getElementById("workspace-province")?.addEventListener("change", event => {
      const provincia = event.target.value;
      refreshView({ provincia, canton: cantons(source, provincia)[0] || "" });
    });
    document.getElementById("workspace-canton")?.addEventListener("change", event => refreshView({ provincia: context.provincia, canton: event.target.value }));
    document.getElementById("workspace-clear")?.addEventListener("click", () => {
      SR.Workspace.clear();
      context = SR.Workspace.read();
      SR.Router.resolve();
    });
    document.getElementById("territory-export")?.addEventListener("click", exportSummary);
    document.querySelectorAll("[data-action-id]").forEach(button => button.addEventListener("click", () => {
      SR.Storage.set("actions.focusId", button.dataset.actionId);
      SR.Workspace.set(context);
      location.hash = "/acciones";
    }));
    document.querySelectorAll("[data-open-route]").forEach(button => button.addEventListener("click", () => {
      SR.Workspace.set(context);
      location.hash = button.dataset.openRoute;
    }));
  }

  SR.TerritoriosModule = { route: { path: "/territorios", title: "Territorios", render, bind } };
})();
