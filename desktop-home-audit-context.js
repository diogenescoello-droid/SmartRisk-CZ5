(() => {
  "use strict";

  const VERSION = "2026.08.27.1";
  const CHECKS = Object.freeze({ monitoreo: 5, validacion: 5, coordinacion: 5, decision: 5, escalamiento: 7, mitigacion: 5 });
  let scheduled = false;
  let observer = null;

  const norm = value => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().toLowerCase();

  function isDesktop() {
    if (window.SmartRiskDeviceMode?.isSmart) return window.SmartRiskDeviceMode.isSmart() !== true;
    return document.documentElement.dataset.smartRiskDevice !== "smart";
  }

  function route() {
    return String(location.hash || "").replace(/^#\/?/, "").split(/[?&]/)[0] || String(window.SmartRiskV11App?.state?.route || "inicio");
  }

  function scopeLabel() {
    const filters = window.SmartRiskV11App?.state?.filters || {};
    if (filters.canton) return `${filters.canton} · ${filters.provincia || "Zona 5"}`;
    if (filters.provincia) return `${filters.provincia} · Zona 5`;
    return "Zona 5";
  }

  function numberFrom(text, pattern) {
    const match = String(text || "").match(pattern);
    return match ? Number(match[1]) : 0;
  }

  function refineStage(button) {
    const id = String(button.dataset.sr10Stage || "");
    const small = button.querySelector("small");
    const strong = button.querySelector(":scope > strong");
    const bar = button.querySelector(":scope > i");
    const text = small?.textContent || "";
    const records = numberFrom(text, /(\d+)\s+registros?/i);
    const missing = numberFrom(text, /(\d+)\s+campos?\s+faltantes?/i);
    const checks = CHECKS[id] || 0;

    button.classList.toggle("v1-stage-no-data", records === 0);
    button.classList.toggle("v1-stage-has-data", records > 0);

    if (!records || !checks) {
      if (small) small.textContent = "Sin registros clasificados en esta etapa";
      if (strong) strong.textContent = "Sin datos";
      if (bar) bar.style.setProperty("--score", "0%");
      return { records: 0, required: 0, present: 0 };
    }

    const required = records * checks;
    const present = Math.max(0, required - missing);
    const pct = required ? Math.round((present / required) * 100) : 0;
    if (small) small.textContent = `${records} registro${records === 1 ? "" : "s"} · ${present}/${required} campos mínimos presentes`;
    if (strong) strong.textContent = `${pct}% campos`;
    if (bar) bar.style.setProperty("--score", `${pct}%`);
    return { records, required, present };
  }

  function addLegend(audit) {
    let legend = audit.querySelector(".v1-audit-legend");
    if (!legend) {
      legend = document.createElement("p");
      legend.className = "v1-audit-legend";
      audit.querySelector(".sr10-stage-strip")?.before(legend);
    }
    legend.innerHTML = `<b>Escalera de trazabilidad 1→6:</b> indica qué tipos de registros existen y qué tan completos están sus campos mínimos. <strong>No representa avance del Plan ni cumplimiento del GAD.</strong>`;
  }

  function replaceKpis(audit, stageStats) {
    const kpis = audit.querySelector(".sr10-audit-kpis");
    if (!kpis) return;
    const visibleCard = [...kpis.querySelectorAll("article")].find(card => /visibles en esta vista/i.test(card.textContent || ""));
    const visible = Number(visibleCard?.querySelector("b")?.textContent || 0);
    const withData = stageStats.filter(item => item.records > 0).length;
    const required = stageStats.reduce((sum, item) => sum + item.required, 0);
    const present = stageStats.reduce((sum, item) => sum + item.present, 0);
    const pct = required ? Math.round((present / required) * 100) : 0;
    const scope = scopeLabel();

    kpis.innerHTML = `
      <article><small>Registros visibles</small><b>${visible}</b><span>${scope}</span></article>
      <article><small>Etapas con información</small><b>${withData}/6</b><span>Sin datos no equivale a incumplimiento</span></article>
      <article><small>Campos mínimos presentes</small><b>${present}/${required || 0}</b><span>${required ? `${pct}% de completitud en etapas con registros` : "Sin registros para evaluar"}</span></article>`;
  }

  function moveAnalystInline() {
    const decisions = document.querySelector("#content .v1-decisions");
    if (!decisions) return;
    let button = decisions.querySelector(".v1-home-analyst-inline");
    if (!button) {
      button = document.createElement("button");
      button.type = "button";
      button.className = "v1-home-analyst-inline";
      button.setAttribute("data-v1-analyst", "");
      button.textContent = "Analista SmartRisk ↗";
      decisions.appendChild(button);
    }
  }

  function apply() {
    scheduled = false;
    const home = isDesktop() && route() === "inicio";
    document.body.classList.toggle("v1-home-audit-refined", home);
    if (!home) return;

    const audit = document.querySelector("#sr10AuditSummary");
    if (!audit) return;
    const scope = scopeLabel();
    const signature = `${VERSION}|${norm(scope)}|${audit.textContent}`;
    if (audit.dataset.v1AuditSignature === signature) {
      moveAnalystInline();
      return;
    }

    const title = audit.querySelector("header h2");
    const subtitle = audit.querySelector("header p");
    if (title) title.textContent = `Calidad y trazabilidad del dato · ${scope}`;
    if (subtitle) subtitle.textContent = "Evalúa la completitud de los registros visibles en este alcance. No mide avance del Plan ni cumplimiento institucional.";

    const stageButtons = [...audit.querySelectorAll(".sr10-stage-strip [data-sr10-stage]")];
    const stageStats = stageButtons.map(refineStage);
    replaceKpis(audit, stageStats);
    addLegend(audit);
    moveAnalystInline();

    audit.dataset.v1AuditContext = VERSION;
    audit.dataset.v1AuditSignature = `${VERSION}|${norm(scope)}|done`;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  function start() {
    if (observer) return;
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("hashchange", () => setTimeout(schedule, 20));
    document.addEventListener("change", event => {
      if (["v1Level", "v1Province", "v1Canton", "sr10Context"].includes(event.target?.id)) setTimeout(schedule, 40);
    });
    setTimeout(schedule, 0);
    setTimeout(schedule, 200);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.SmartRiskDesktopHomeAuditContext = { VERSION, apply };
})();
