(() => {
  "use strict";

  const VERSION = "2026.08.27.2";
  const STAGES = Object.freeze({
    monitoreo: { entities: ["monitoringReports"], noun: "reportes de monitoreo", singular: "reporte de monitoreo" },
    validacion: { entities: ["validations"], noun: "validaciones técnicas", singular: "validación técnica" },
    coordinacion: { entities: ["institutions"], noun: "coordinaciones institucionales", singular: "coordinación institucional" },
    decision: { entities: ["decisions", "coeSessions"], noun: "decisiones del COE", singular: "decisión del COE" },
    escalamiento: { entities: ["breaches"], noun: "escalamientos operativos", singular: "escalamiento operativo" },
    mitigacion: { entities: [], noun: "registros de mitigación y cierre", singular: "registro de mitigación y cierre" }
  });

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

  function filters() {
    const value = window.SmartRiskV11App?.state?.filters || {};
    return { province: value.provincia || "", canton: value.canton || "" };
  }

  function scopeLabel() {
    const { province, canton } = filters();
    if (canton) return `${canton} · ${province || "Zona 5"}`;
    if (province) return `${province} · Zona 5`;
    return "Zona 5";
  }

  function master() {
    return window.SMART_RISK_GAD_REVIEW_CONTEXT || null;
  }

  function scopeDocs() {
    const { province, canton } = filters();
    if (canton) return [master()?.find?.(province, canton)].filter(Boolean);
    return master()?.scope?.(province, "") || [];
  }

  function entity(key) {
    return window.SmartRiskV11App?.state?.data?.entities?.[key] || [];
  }

  function sameScope(record) {
    const { province, canton } = filters();
    if (province && norm(record?.provincia ?? record?.province ?? record?.payload?.provincia ?? record?.payload?.province) !== norm(province)) return false;
    if (canton && norm(record?.canton ?? record?.territory ?? record?.payload?.canton ?? record?.payload?.territory) !== norm(canton)) return false;
    return true;
  }

  function recordTerritory(record) {
    const province = record?.provincia ?? record?.province ?? record?.payload?.provincia ?? record?.payload?.province ?? "";
    const canton = record?.canton ?? record?.territory ?? record?.payload?.canton ?? record?.payload?.territory ?? "";
    if (!canton) return "";
    return `${norm(province)}|${norm(canton)}`;
  }

  function stageRows(id) {
    const config = STAGES[id] || { entities: [] };
    const seen = new Set();
    return config.entities.flatMap(key => entity(key)).filter(row => {
      if (!sameScope(row)) return false;
      const key = String(row?.id || row?.sourceId || `${recordTerritory(row)}|${row?.title || row?.tipo || JSON.stringify(row?.payload || {})}`);
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function numberFrom(text, pattern) {
    const match = String(text || "").match(pattern);
    return match ? Number(match[1]) : 0;
  }

  function rawStageCount(button) {
    return numberFrom(button.querySelector("small")?.textContent || "", /(\d+)\s+registros?/i);
  }

  function stageCoverage(id) {
    const territories = new Set(stageRows(id).map(recordTerritory).filter(Boolean));
    return territories.size;
  }

  function statusFor(records, coverage, total, canton) {
    if (!records) return { text: "Sin información", cls: "v1-stage-no-data" };
    if (canton) return { text: "Hay información", cls: "v1-stage-has-data" };
    if (total && coverage && coverage / total <= 0.2) return { text: "Información limitada", cls: "v1-stage-limited" };
    return { text: "Hay información", cls: "v1-stage-has-data" };
  }

  function stageDetail(id, records, coverage, total, canton) {
    const config = STAGES[id] || { noun: "registros", singular: "registro" };
    if (!records) {
      return canton
        ? "No se encontró información de este tipo para el cantón."
        : `0 de ${total || 0} GAD presentan ${config.noun} en el alcance actual.`;
    }
    if (canton) {
      return `${records} ${records === 1 ? config.singular : config.noun} disponible${records === 1 ? "" : "s"} en este cantón.`;
    }
    if (coverage > 0) {
      const extra = records > coverage ? ` En esos GAD constan ${records} registros.` : "";
      return `${coverage} de ${total || coverage} GAD presentan ${config.noun}.${extra}`;
    }
    return `Hay ${records} registro${records === 1 ? "" : "s"}, pero todavía no está${records === 1 ? "" : "n"} atribuido${records === 1 ? "" : "s"} a un GAD del alcance.`;
  }

  function refineStage(button, total) {
    const id = String(button.dataset.sr10Stage || "");
    const small = button.querySelector("small");
    const strong = button.querySelector(":scope > strong");
    const bar = button.querySelector(":scope > i");
    const { canton } = filters();
    const raw = rawStageCount(button);
    const rows = stageRows(id);
    const records = raw || rows.length;
    const coverage = stageCoverage(id);
    const status = statusFor(records, coverage, total, canton);

    button.classList.remove("v1-stage-no-data", "v1-stage-has-data", "v1-stage-limited");
    button.classList.add(status.cls);
    if (small) small.textContent = stageDetail(id, records, coverage, total, canton);
    if (strong) strong.textContent = status.text;
    if (bar) bar.style.removeProperty("--score");
    return { id, records, coverage, territories: new Set(rows.map(recordTerritory).filter(Boolean)) };
  }

  function addLegend(audit) {
    let legend = audit.querySelector(".v1-audit-legend");
    if (!legend) {
      legend = document.createElement("p");
      legend.className = "v1-audit-legend";
      audit.querySelector(".sr10-stage-strip")?.before(legend);
    }
    legend.innerHTML = `<b>Lectura territorial:</b> muestra dónde existe información documental en el alcance seleccionado. <strong>No representa avance del Plan ni cumplimiento del GAD.</strong>`;
  }

  function unionCoverage(stageStats) {
    const all = new Set();
    stageStats.forEach(stage => stage.territories.forEach(key => all.add(key)));
    return all.size;
  }

  function replaceKpis(audit, stageStats, total) {
    const kpis = audit.querySelector(".sr10-audit-kpis");
    if (!kpis) return;
    const { canton } = filters();
    const withData = stageStats.filter(item => item.records > 0).length;
    const covered = unionCoverage(stageStats);
    const state = withData === 0 ? "Sin información" : withData === 6 ? "Todos los tipos presentes" : "Información parcial";

    if (canton) {
      kpis.innerHTML = `
        <article><small>Tipos con información</small><b>${withData} de 6</b><span>Información encontrada para este cantón</span></article>
        <article><small>Situación documental</small><b>${state}</b><span>${withData === 6 ? "Existen registros en todos los tipos documentales." : "Hay tipos documentales sin información registrada."}</span></article>
        <article><small>Detalle técnico</small><b>Disponible</b><span>Abra Control documental para revisar registros, campos y fuentes.</span></article>`;
      return;
    }

    kpis.innerHTML = `
      <article><small>Cobertura documental</small><b>${covered} de ${total || 0} GAD</b><span>Tienen al menos uno de estos tipos de información atribuida territorialmente</span></article>
      <article><small>Tipos con información</small><b>${withData} de 6</b><span>Tipos documentales presentes en el alcance</span></article>
      <article><small>Situación documental</small><b>${state}</b><span>${withData === 6 ? "Hay información en todos los tipos documentales." : "Existen tipos de información aún no registrados."}</span></article>`;
  }

  function renameAuditAction(audit) {
    const headerButton = audit.querySelector("header button");
    if (headerButton && /auditor|control/i.test(headerButton.textContent || "")) headerButton.textContent = "Ver control documental";
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
    const docs = scopeDocs();
    const total = docs.length;
    const signature = `${VERSION}|${norm(scope)}|${total}|${audit.textContent}`;
    if (audit.dataset.v1AuditSignature === signature) {
      moveAnalystInline();
      return;
    }

    const title = audit.querySelector("header h2");
    const subtitle = audit.querySelector("header p");
    if (title) title.textContent = `Estado documental · ${scope}`;
    if (subtitle) subtitle.textContent = "Muestra qué información existe en el territorio seleccionado y dónde hace falta registrar información. No mide cumplimiento ni avance del Plan.";

    renameAuditAction(audit);
    const stageButtons = [...audit.querySelectorAll(".sr10-stage-strip [data-sr10-stage]")];
    const stageStats = stageButtons.map(button => refineStage(button, total));
    replaceKpis(audit, stageStats, total);
    addLegend(audit);
    moveAnalystInline();

    audit.dataset.v1AuditContext = VERSION;
    audit.dataset.v1AuditSignature = `${VERSION}|${norm(scope)}|${total}|done`;
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

  window.SmartRiskDesktopHomeAuditContext = { VERSION, STAGES, apply };
})();