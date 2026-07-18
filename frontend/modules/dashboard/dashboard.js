window.SmartRisk = window.SmartRisk || {};

(function () {
  const SR = SmartRisk;

  function safeStore(key, fallback) {
    return SR.Storage.get(key, fallback) || fallback;
  }

  function normalizeState(value) {
    return String(value || "").toLowerCase();
  }

  function escapeHtml(value) {
    return String(value ?? "").replace(/[&<>'"]/g, character => ({
      "&": "&amp;",
      "<": "&lt;",
      ">": "&gt;",
      "'": "&#39;",
      '"': "&quot;"
    })[character]);
  }

  function data() {
    return {
      territories: safeStore("territories", SR.MockData.territories || []),
      institutions: safeStore("institutions", SR.MockData.institutions || []),
      sites: safeStore("sites", SR.MockData.sites || []),
      actions: safeStore("actions", SR.MockData.actions || [])
    };
  }

  function metrics(dataset) {
    const actions = dataset.actions || [];
    const sites = dataset.sites || [];
    const institutions = dataset.institutions || [];
    const territories = dataset.territories || [];
    const today = new Date();
    const completed = actions.filter(item => normalizeState(item.estado) === "completada").length;
    const average = Math.round(
      actions.reduce((sum, item) => sum + Number(item.avance || 0), 0) / Math.max(actions.length, 1)
    );
    const critical = sites.filter(item =>
      ["alto", "muy alto", "crítico", "critico"].includes(normalizeState(item.nivelRiesgo || item.riesgo))
    ).length;
    const overdue = actions.filter(item =>
      item.fechaFin && new Date(`${item.fechaFin}T23:59:59`) < today && normalizeState(item.estado) !== "completada"
    ).length;
    const blocked = actions.filter(item => normalizeState(item.estado) === "bloqueada").length;
    const highPriority = actions.filter(item => normalizeState(item.prioridad) === "alta").length;
    const withoutEvidence = actions.filter(item => !Array.isArray(item.evidencias) || item.evidencias.length === 0).length;

    return {
      territories: territories.length,
      institutions: institutions.length,
      sites: sites.length,
      actions: actions.length,
      average,
      critical,
      overdue,
      blocked,
      completed,
      highPriority,
      withoutEvidence,
      alerts: blocked + overdue + critical
    };
  }

  function provinceStats(dataset) {
    const map = {};
    (dataset.actions || []).forEach(item => {
      const province = item.provincia || "Sin provincia";
      if (!map[province]) map[province] = { name: province, actions: 0, total: 0, blocked: 0 };
      map[province].actions += 1;
      map[province].total += Number(item.avance || 0);
      if (normalizeState(item.estado) === "bloqueada") map[province].blocked += 1;
    });

    return Object.values(map)
      .map(item => ({ ...item, average: Math.round(item.total / Math.max(item.actions, 1)) }))
      .sort((a, b) => b.average - a.average);
  }

  function cantonStats(dataset) {
    const map = {};
    (dataset.actions || []).forEach(item => {
      const canton = item.canton || "Sin cantón";
      if (!map[canton]) map[canton] = { name: canton, actions: 0, total: 0, high: 0, blocked: 0 };
      map[canton].actions += 1;
      map[canton].total += Number(item.avance || 0);
      if (normalizeState(item.prioridad) === "alta") map[canton].high += 1;
      if (normalizeState(item.estado) === "bloqueada") map[canton].blocked += 1;
    });

    return Object.values(map)
      .map(item => ({ ...item, average: Math.round(item.total / Math.max(item.actions, 1)) }))
      .sort((a, b) => a.average - b.average || b.high - a.high)
      .slice(0, 8);
  }

  function actionStates(dataset) {
    const states = { Pendiente: 0, "En ejecución": 0, Completada: 0, Bloqueada: 0 };
    (dataset.actions || []).forEach(item => {
      states[item.estado] = (states[item.estado] || 0) + 1;
    });
    return states;
  }

  function alertItems(dataset) {
    const items = [];

    (dataset.actions || [])
      .filter(item => normalizeState(item.estado) === "bloqueada")
      .slice(0, 3)
      .forEach(item => items.push({
        icon: "alert",
        title: "Acción bloqueada",
        text: `${item.titulo} · ${item.canton}`,
        value: `${item.avance}%`,
        route: "/acciones",
        severity: "danger"
      }));

    (dataset.actions || [])
      .filter(item => item.fechaFin && new Date(`${item.fechaFin}T23:59:59`) < new Date() && normalizeState(item.estado) !== "completada")
      .slice(0, 3)
      .forEach(item => items.push({
        icon: "alert",
        title: "Plazo vencido",
        text: `${item.titulo} · ${item.responsable}`,
        value: item.fechaFin,
        route: "/acciones",
        severity: "warning"
      }));

    (dataset.sites || [])
      .filter(item => ["alto", "muy alto", "crítico", "critico"].includes(normalizeState(item.nivelRiesgo || item.riesgo)))
      .slice(0, 2)
      .forEach(item => items.push({
        icon: "pin",
        title: "Sitio prioritario",
        text: `${item.nombre || item.sitio || "Sitio"} · ${item.canton || ""}`,
        value: item.nivelRiesgo || item.riesgo || "Alto",
        route: "/sitios",
        severity: "danger"
      }));

    if (!items.length) {
      items.push({
        icon: "check",
        title: "Sin alertas críticas",
        text: "No se detectan bloqueos, vencimientos ni sitios prioritarios con los datos actuales.",
        value: "OK",
        route: "/dashboard",
        severity: "success"
      });
    }

    return items.slice(0, 6);
  }

  function lastSyncLabel() {
    const lastSync = SR.Storage.get("sheets.lastSync", null);
    if (!lastSync) return "Sin sincronización registrada";
    const date = new Date(lastSync);
    if (Number.isNaN(date.getTime())) return String(lastSync);
    return new Intl.DateTimeFormat("es-EC", {
      dateStyle: "medium",
      timeStyle: "short"
    }).format(date);
  }

  function statusStrip(metricsValue) {
    const coverage = metricsValue.actions && metricsValue.sites ? "Datos operativos disponibles" : "Información incompleta";
    return `
      <section class="executive-status" aria-label="Estado general de la plataforma">
        <div class="executive-status-item">
          <span class="executive-status-dot ${metricsValue.alerts ? "is-warning" : "is-ok"}" aria-hidden="true"></span>
          <div><small>Estado operativo</small><strong>${metricsValue.alerts ? "Requiere atención" : "Sin novedades críticas"}</strong></div>
        </div>
        <div class="executive-status-item">
          ${SR.Icon.render("download", 18)}
          <div><small>Última sincronización</small><strong>${escapeHtml(lastSyncLabel())}</strong></div>
        </div>
        <div class="executive-status-item">
          ${SR.Icon.render("dashboard", 18)}
          <div><small>Cobertura</small><strong>${coverage}</strong></div>
        </div>
      </section>`;
  }

  function kpis(metricsValue) {
    const cards = [
      { label: "Avance operativo", value: `${metricsValue.average}%`, note: "Promedio de acciones", route: "/acciones", tone: "primary" },
      { label: "Sitios registrados", value: metricsValue.sites, note: `${metricsValue.critical} de atención prioritaria`, route: "/sitios", tone: metricsValue.critical ? "danger" : "success" },
      { label: "Instituciones", value: metricsValue.institutions, note: "Actores vinculados", route: "/instituciones", tone: "neutral" },
      { label: "Alertas operativas", value: metricsValue.blocked + metricsValue.overdue, note: `${metricsValue.blocked} bloqueadas · ${metricsValue.overdue} vencidas`, route: "/acciones", tone: metricsValue.blocked + metricsValue.overdue ? "warning" : "success" }
    ];

    return `<section class="executive-grid" aria-label="Indicadores principales">${cards.map(card => `
      <a class="executive-kpi executive-kpi-${card.tone}" href="#${card.route}" aria-label="${escapeHtml(card.label)}: ${escapeHtml(card.value)}. Abrir módulo relacionado">
        <span>${escapeHtml(card.label)}</span>
        <strong>${escapeHtml(card.value)}</strong>
        <small>${escapeHtml(card.note)}</small>
        <em>Ver detalle →</em>
      </a>`).join("")}</section>`;
  }

  function bars(items) {
    return `<div class="executive-chart">${items.map(item => `
      <div class="executive-bar-row">
        <span class="executive-bar-label" title="${escapeHtml(item.name)}">${escapeHtml(item.name)}</span>
        <div class="executive-bar-track" role="progressbar" aria-label="Avance de ${escapeHtml(item.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${item.average}">
          <div class="executive-bar-value" style="width:${Math.max(2, item.average)}%"></div>
        </div>
        <strong>${item.average}%</strong>
      </div>`).join("") || '<p class="muted">Sin datos disponibles.</p>'}</div>`;
  }

  function ranking(items) {
    return `<div class="executive-table-wrap"><table class="executive-table">
      <caption class="sr-only">Cantones ordenados por menor avance de acciones</caption>
      <thead><tr><th scope="col">Cantón</th><th scope="col">Acciones</th><th scope="col">Prioridad alta</th><th scope="col">Bloqueadas</th><th scope="col">Avance</th></tr></thead>
      <tbody>${items.map(item => `<tr>
        <td><strong>${escapeHtml(item.name)}</strong></td>
        <td>${item.actions}</td>
        <td>${item.high}</td>
        <td>${item.blocked}</td>
        <td><div class="executive-progress"><div class="executive-progress-track" role="progressbar" aria-label="Avance de ${escapeHtml(item.name)}" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${item.average}"><div class="executive-progress-value" style="width:${item.average}%"></div></div><strong>${item.average}%</strong></div></td>
      </tr>`).join("") || '<tr><td colspan="5">Sin datos.</td></tr>'}</tbody>
    </table></div>`;
  }

  function alertList(items) {
    return `<div class="executive-alerts">${items.map(item => `
      <a class="executive-alert executive-alert-${item.severity}" href="#${item.route}">
        <span class="executive-alert-icon">${SR.Icon.render(item.icon, 18)}</span>
        <div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.text)}</p></div>
        <strong>${escapeHtml(item.value)}</strong>
      </a>`).join("")}</div>`;
  }

  function activity(dataset) {
    const rows = [
      ...(dataset.actions || []).slice(-4).reverse().map(item => ({
        title: `Acción: ${item.titulo}`,
        detail: `${item.canton} · ${item.estado}`,
        route: "/acciones"
      })),
      ...(dataset.sites || []).slice(-2).reverse().map(item => ({
        title: `Sitio: ${item.nombre || item.sitio || "Registro territorial"}`,
        detail: `${item.canton || ""} · ${item.nivelRiesgo || item.riesgo || ""}`,
        route: "/sitios"
      }))
    ].slice(0, 6);

    return `<div class="executive-activity">${rows.map(item => `
      <a class="executive-activity-item" href="#${item.route}">
        <span class="executive-activity-dot" aria-hidden="true"></span>
        <div><p><strong>${escapeHtml(item.title)}</strong></p><small>${escapeHtml(item.detail)}</small></div>
      </a>`).join("") || '<p class="muted">Sin actividad disponible.</p>'}</div>`;
  }

  function priorities(metricsValue) {
    const items = [
      { value: metricsValue.blocked, label: "acciones bloqueadas", route: "/acciones", level: metricsValue.blocked ? "danger" : "ok" },
      { value: metricsValue.overdue, label: "acciones vencidas", route: "/acciones", level: metricsValue.overdue ? "warning" : "ok" },
      { value: metricsValue.withoutEvidence, label: "acciones sin evidencias", route: "/acciones", level: metricsValue.withoutEvidence ? "warning" : "ok" },
      { value: metricsValue.critical, label: "sitios prioritarios", route: "/sitios", level: metricsValue.critical ? "danger" : "ok" }
    ];

    return `<div class="executive-priorities">${items.map(item => `
      <a href="#${item.route}" class="executive-priority executive-priority-${item.level}">
        <strong>${item.value}</strong><span>${item.label}</span>
      </a>`).join("")}</div>`;
  }

  function quickActions() {
    const actions = [
      ["refresh-cw", "Sincronizar Google Sheets", "/sincronizacion"],
      ["file-text", "Generar reporte", "/reportes"],
      ["bar-chart-2", "Consultar indicadores", "/indicadores"],
      ["check", "Actualizar acciones", "/acciones"],
      ["pin", "Revisar sitios", "/sitios"],
      ["map", "Explorar territorios", "/territorios"]
    ];

    return `<div class="executive-quick-grid">${actions.map(([icon, label, route]) => `
      <a class="executive-quick-action" href="#${route}">${SR.Icon.render(icon, 18)}<span>${label}</span></a>`).join("")}</div>`;
  }

  function render() {
    const dataset = data();
    const metricsValue = metrics(dataset);
    const provinces = provinceStats(dataset);
    const cantons = cantonStats(dataset);
    const states = actionStates(dataset);
    const alerts = alertItems(dataset);

    return `
      <section class="page-header">
        <div>
          <span class="kicker">Centro de monitoreo zonal</span>
          <h1 class="page-title">Dashboard Ejecutivo</h1>
          <p class="page-subtitle">Lectura consolidada de territorios, instituciones, sitios y acciones para apoyar la priorización y el seguimiento.</p>
        </div>
        <div class="split-actions">
          <button id="refresh-dashboard" class="btn btn-secondary" type="button">${SR.Icon.render("refresh-cw", 17)}Actualizar</button>
          <button id="export-dashboard" class="btn btn-primary" type="button">${SR.Icon.render("download", 17)}Exportar resumen</button>
        </div>
      </section>
      ${statusStrip(metricsValue)}
      ${kpis(metricsValue)}
      <section class="executive-layout">
        <div class="executive-stack">
          ${SR.Card.panel({ title: "Avance por provincia", badge: `${provinces.length} provincias`, body: bars(provinces) })}
          ${SR.Card.panel({ title: "Cantones que requieren mayor seguimiento", badge: "Menor avance primero", body: ranking(cantons) })}
          ${SR.Card.panel({ title: "Distribución operativa", body: `<div class="executive-semaphore"><article class="semaphore-card semaphore-low"><strong>${states.Completada || 0}</strong><span>Completadas</span></article><article class="semaphore-card semaphore-medium"><strong>${(states.Pendiente || 0) + (states["En ejecución"] || 0)}</strong><span>En gestión</span></article><article class="semaphore-card semaphore-high"><strong>${states.Bloqueada || 0}</strong><span>Bloqueadas</span></article></div>` })}
          ${SR.Card.panel({ title: "Prioridades de gestión", body: priorities(metricsValue) })}
        </div>
        <div class="executive-stack">
          ${SR.Card.panel({ title: "Alertas ejecutivas", badge: `${alerts.length} visibles`, body: alertList(alerts) })}
          ${SR.Card.panel({ title: "Actividad reciente", body: activity(dataset) })}
          ${SR.Card.panel({ title: "Accesos rápidos", body: quickActions() })}
        </div>
      </section>`;
  }

  function bind() {
    document.getElementById("refresh-dashboard")?.addEventListener("click", async event => {
      const button = event.currentTarget;
      button.disabled = true;
      button.setAttribute("aria-busy", "true");
      await SR.Router.resolve();
      SR.Toast.show("Dashboard actualizado con los datos locales.", "success");
    });

    document.getElementById("export-dashboard")?.addEventListener("click", () => {
      const dataset = data();
      const metricsValue = metrics(dataset);
      SR.Utils.downloadCsv("resumen-ejecutivo-smartrisk.csv", [
        { Indicador: "Territorios", Valor: metricsValue.territories },
        { Indicador: "Instituciones", Valor: metricsValue.institutions },
        { Indicador: "Sitios", Valor: metricsValue.sites },
        { Indicador: "Acciones", Valor: metricsValue.actions },
        { Indicador: "Avance promedio", Valor: `${metricsValue.average}%` },
        { Indicador: "Sitios prioritarios", Valor: metricsValue.critical },
        { Indicador: "Acciones bloqueadas", Valor: metricsValue.blocked },
        { Indicador: "Acciones vencidas", Valor: metricsValue.overdue },
        { Indicador: "Acciones sin evidencias", Valor: metricsValue.withoutEvidence },
        { Indicador: "Última sincronización", Valor: lastSyncLabel() }
      ]);
      SR.Toast.show("Resumen ejecutivo exportado.", "success");
    });
  }

  SR.DashboardModule = {
    route: {
      path: "/dashboard",
      title: "Dashboard Ejecutivo",
      render,
      bind
    }
  };
})();
