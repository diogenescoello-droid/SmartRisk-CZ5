(function () {
  "use strict";

  window.SmartRisk = window.SmartRisk || {};

  const SR = window.SmartRisk;

  function renderProgress() {
    return SR.MockData.progress.map(item => `
      <div>
        <div class="progress-head">
          <span>${item.label}</span>
          <strong>${item.value}%</strong>
        </div>
        <div class="progress-track">
          <div class="progress-value" style="width:${item.value}%"></div>
        </div>
      </div>`).join("");
  }

  function renderActivities() {
    return SR.MockData.activities.map(item => `
      <div class="activity-item">
        <span class="activity-dot"></span>
        <div>
          <p>${item.text}</p>
          <span class="activity-time">${item.time}</span>
        </div>
      </div>`).join("");
  }

  function renderDonut() {
    return `
      <div class="donut-layout">
        <div class="donut"></div>
        <div class="legend">
          <div class="legend-item">
            <span class="legend-key"><span class="legend-dot" style="background:var(--success)"></span>En seguimiento</span>
            <strong>52%</strong>
          </div>
          <div class="legend-item">
            <span class="legend-key"><span class="legend-dot" style="background:var(--warning)"></span>Con ajustes</span>
            <strong>26%</strong>
          </div>
          <div class="legend-item">
            <span class="legend-key"><span class="legend-dot" style="background:var(--danger)"></span>Prioritarios</span>
            <strong>22%</strong>
          </div>
        </div>
      </div>`;
  }

  function render() {
    const metrics = SR.MockData.metrics
      .map(metric => SR.Card.metric(metric))
      .join("");

    return `
      <section class="hero-card">
        <div class="hero-grid">
          <div>
            <span class="kicker" style="color:#ffd795">Sprint 1.2A</span>
            <h1 class="hero-title">Gestión territorial del riesgo, integrada y visible.</h1>
            <p class="hero-copy">
              SmartRisk CZ5 consolida seguimiento documental, territorial y operativo
              en una interfaz institucional preparada para conectarse con fuentes oficiales.
            </p>
          </div>

          <div class="hero-stat">
            <strong>76%</strong>
            <span>Avance general demostrativo del sistema zonal</span>
          </div>
        </div>
      </section>

      <section class="page-header">
        <div>
          <span class="kicker">Panel ejecutivo</span>
          <h2 class="page-title">Dashboard institucional</h2>
          <p class="page-subtitle">Indicadores, tendencias y seguimiento territorial en una sola vista.</p>
        </div>

        <div class="split-actions">
          ${SR.Button.render({ id: "dashboard-modal", label: "Resumen", variant: "secondary", icon: "document" })}
          ${SR.Button.render({ id: "dashboard-toast", label: "Validar interfaz", icon: "check" })}
        </div>
      </section>

      <section class="metric-grid">${metrics}</section>

      <section class="content-grid">
        <div class="stack">
          ${SR.Card.panel({
            title: "Tendencia mensual de avance",
            badge: "Enero–julio",
            body: SR.Chart.line(SR.MockData.trend)
          })}

          ${SR.Card.panel({
            title: "Seguimiento territorial",
            body: '<div id="territory-table"></div>'
          })}
        </div>

        <div class="stack">
          ${SR.Card.panel({
            title: "Estado de los planes",
            body: renderDonut()
          })}

          ${SR.Card.panel({
            title: "Avance por línea de gestión",
            body: `<div class="progress-list">${renderProgress()}</div>`
          })}

          ${SR.Card.panel({
            title: "Actividad reciente",
            body: `<div class="activity-list">${renderActivities()}</div>`
          })}
        </div>
      </section>`;
  }

  function bind() {
    SR.Table.create({
      containerId: "territory-table",
      columns: [
        { key: "provincia", label: "Provincia" },
        { key: "cantones", label: "Cantones" },
        { key: "planes", label: "Planes" },
        { key: "avance", label: "Avance", type: "percent" },
        { key: "estado", label: "Estado", type: "status" }
      ],
      rows: SR.MockData.territories
    });

    document.getElementById("dashboard-toast")
      ?.addEventListener("click", () => {
        SR.Toast.show("La interfaz institucional está funcionando correctamente.", "success");
      });

    document.getElementById("dashboard-modal")
      ?.addEventListener("click", () => {
        SR.Modal.open({
          title: "Resumen del Sprint 1.2A",
          body: `
            <p>Esta versión incorpora el rediseño institucional del dashboard.</p>
            <p>Incluye tema claro/oscuro, gráficos SVG, tabla con búsqueda y ordenamiento, iconografía propia y diseño responsive.</p>`,
          confirmLabel: "Entendido",
          onConfirm: () => SR.Toast.show("Resumen revisado.", "success")
        });
      });
  }

  SR.DashboardModule = {
    route: {
      path: "/dashboard",
      title: "Dashboard",
      render,
      bind
    }
  };
})();
