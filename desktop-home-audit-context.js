(() => {
  "use strict";

  const VERSION = "2026.08.28.1";
  const STAGES = Object.freeze({
    monitoreo: {
      entities: ["monitoringReports"],
      noun: "reportes de monitoreo",
      singular: "reporte de monitoreo",
      accept: () => true
    },
    validacion: {
      entities: ["validations"],
      noun: "validaciones técnicas",
      singular: "validación técnica",
      accept: () => true
    },
    coordinacion: {
      entities: ["coeSessions", "institutions", "decisions"],
      noun: "registros de coordinación institucional",
      singular: "registro de coordinación institucional",
      accept: (row, key) => key === "coeSessions" || /coordinaci|articulaci|mesa tecnica|mesa técnica|reunion|reunión|convocatoria|sesion de trabajo|sesión de trabajo/.test(recordText(row))
    },
    decision: {
      entities: ["decisions", "coeSessions"],
      noun: "decisiones del COE",
      singular: "decisión del COE",
      accept: (row, key) => key === "decisions" || /decision|decisión|resolucion|resolución|disposicion|disposición|acuerdo|acta/.test(recordText(row))
    },
    escalamiento: {
      entities: ["breaches", "monitoringReports", "decisions"],
      noun: "registros de escalamiento operativo",
      singular: "registro de escalamiento operativo",
      accept: row => /escalam|derivaci|derivación|activar|activacion|activación|elevar a|remitir a|alerta operativa/.test(recordText(row))
    },
    mitigacion: {
      entities: ["actions", "breaches"],
      noun: "registros de mitigación y cierre",
      singular: "registro de mitigación y cierre",
      accept: row => /mitig|cierre|cerrad|complet|solvent|finaliz|resuelt/.test(recordText(row))
    }
  });

  let scheduled = false;
  let observer = null;

  const norm = value => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
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
    const rows = window.SmartRiskV11App?.state?.data?.entities?.[key];
    return Array.isArray(rows) ? rows : [];
  }

  function recordSource(record) {
    return { ...(record || {}), ...(record?.payload || {}) };
  }

  function recordScope(record) {
    const source = recordSource(record);
    return {
      province: record?.provincia ?? record?.province ?? source.provincia ?? source.province ?? "",
      canton: record?.canton ?? record?.territory ?? source.canton ?? source.territory ?? "",
      level: record?.level ?? record?.nivel ?? source.level ?? source.nivel ?? ""
    };
  }

  function recordText(record) {
    const source = recordSource(record);
    return norm([
      record?.title,
      record?.detail,
      record?.tipo,
      record?.estado,
      record?.status,
      record?.institucion,
      record?.unidad,
      source.accion,
      source.actividad,
      source.gad,
      source.institucion,
      source.organizacion,
      source.entidad,
      source.observacion,
      source.observaciones,
      source.estado
    ].filter(Boolean).join(" "));
  }

  function provincialDoc(province) {
    return (master()?.scope?.(province, "") || []).find(doc => !String(doc?.canton || "").trim()) || null;
  }

  function explicitProvincial(record, doc) {
    if (!doc) return false;
    const source = recordSource(record);
    const scope = recordScope(record);
    const text = norm([
      scope.level,
      record?.title,
      record?.detail,
      record?.tipo,
      record?.institucion,
      record?.unidad,
      source.gad,
      source.institucion,
      source.organizacion,
      source.entidad,
      source.nivel,
      source.level
    ].filter(Boolean).join(" "));
    const gad = norm(doc.gad || "");
    return /provincial|prefectur|gobierno provincial|consejo de gobierno|cgreg/.test(text) || Boolean(gad && text.includes(gad));
  }

  function resolveDoc(record) {
    const context = master();
    if (!context) return null;
    const scope = recordScope(record);
    if (!scope.province) return null;
    if (scope.canton) return context.find?.(scope.province, scope.canton) || null;
    const doc = provincialDoc(scope.province);
    return explicitProvincial(record, doc) ? doc : null;
  }

  function rawRecordInScope(record, docs) {
    const { province, canton } = filters();
    const scope = recordScope(record);
    const allowedProvinces = new Set(docs.map(doc => norm(doc.province)).filter(Boolean));
    if (!scope.province || !allowedProvinces.has(norm(scope.province))) return false;
    if (province && norm(scope.province) !== norm(province)) return false;
    if (!canton) return true;
    if (!scope.canton) return false;
    const target = master()?.find?.(province, canton);
    const candidate = master()?.find?.(scope.province, scope.canton);
    return Boolean(target && candidate && Number(target.n) === Number(candidate.n));
  }

  function uniqueCandidates(id) {
    const config = STAGES[id] || { entities: [], accept: () => false };
    const seen = new Set();
    const result = [];
    config.entities.forEach(key => {
      entity(key).forEach(row => {
        if (!config.accept(row, key)) return;
        const scope = recordScope(row);
        const fingerprint = String(
          row?.id || row?.sourceId || row?._id ||
          `${key}|${norm(scope.province)}|${norm(scope.canton)}|${recordText(row)}|${JSON.stringify(row?.payload || {})}`
        );
        if (seen.has(fingerprint)) return;
        seen.add(fingerprint);
        result.push(row);
      });
    });
    return result;
  }

  function stageData(id, docs) {
    const allowed = new Set(docs.map(doc => Number(doc.n)));
    const candidates = uniqueCandidates(id).filter(row => rawRecordInScope(row, docs));
    const mapped = [];
    const unassigned = [];
    const gadIds = new Set();

    candidates.forEach(row => {
      const doc = resolveDoc(row);
      if (doc && allowed.has(Number(doc.n))) {
        mapped.push(row);
        gadIds.add(Number(doc.n));
      } else {
        unassigned.push(row);
      }
    });

    return {
      id,
      records: candidates.length,
      mappedRecords: mapped.length,
      unassigned: unassigned.length,
      gadIds
    };
  }

  function statusFor(stat, total, canton) {
    if (!stat.records) return { text: "Sin información", cls: "v1-stage-no-data" };
    if (!stat.gadIds.size) return { text: "Sin atribución GAD", cls: "v1-stage-limited" };
    if (canton) return { text: "Hay información", cls: "v1-stage-has-data" };
    if (total && stat.gadIds.size / total <= 0.2) return { text: "Información limitada", cls: "v1-stage-limited" };
    return { text: "Hay información", cls: "v1-stage-has-data" };
  }

  function stageDetail(id, stat, total, canton) {
    const config = STAGES[id] || { noun: "registros", singular: "registro" };
    if (!stat.records) {
      return canton
        ? "No se encontró información atribuible de este tipo para el cantón."
        : `Ningún GAD del universo rector tiene ${config.noun} atribuibles en el alcance actual.`;
    }

    if (!stat.gadIds.size) {
      return `${stat.records} registro${stat.records === 1 ? "" : "s"} encontrado${stat.records === 1 ? "" : "s"}, sin atribución inequívoca a un GAD del universo rector.`;
    }

    if (canton) {
      const pending = stat.unassigned ? ` · ${stat.unassigned} sin atribución` : "";
      return `${stat.mappedRecords} ${stat.mappedRecords === 1 ? config.singular : config.noun} atribuible${stat.mappedRecords === 1 ? "" : "s"} al cantón${pending}.`;
    }

    const extra = stat.mappedRecords > stat.gadIds.size ? ` En esos GAD constan ${stat.mappedRecords} registros atribuibles.` : "";
    const pending = stat.unassigned ? ` ${stat.unassigned} registro${stat.unassigned === 1 ? "" : "s"} adicional${stat.unassigned === 1 ? "" : "es"} no incrementa${stat.unassigned === 1 ? "" : "n"} la cobertura porque no tiene${stat.unassigned === 1 ? "" : "n"} GAD inequívoco.` : "";
    return `${stat.gadIds.size} de ${total} GAD presentan ${config.noun}.${extra}${pending}`;
  }

  function refineStage(button, stat, total) {
    const id = String(button.dataset.sr10Stage || "");
    const small = button.querySelector("small");
    const strong = button.querySelector(":scope > strong");
    const bar = button.querySelector(":scope > i");
    const { canton } = filters();
    const status = statusFor(stat, total, canton);

    button.classList.remove("v1-stage-no-data", "v1-stage-has-data", "v1-stage-limited");
    button.classList.add(status.cls);
    if (small) small.textContent = stageDetail(id, stat, total, canton);
    if (strong) strong.textContent = status.text;
    if (bar) bar.style.removeProperty("--score");
  }

  function addLegend(audit, stageStats) {
    let legend = audit.querySelector(".v1-audit-legend");
    if (!legend) {
      legend = document.createElement("p");
      legend.className = "v1-audit-legend";
      audit.querySelector(".sr10-stage-strip")?.before(legend);
    }
    const unassigned = stageStats.reduce((sum, item) => sum + item.unassigned, 0);
    const quality = unassigned
      ? ` <strong>${unassigned} registro${unassigned === 1 ? "" : "s"} sin atribución GAD no se incluye${unassigned === 1 ? "" : "n"} en la cobertura.</strong>`
      : "";
    legend.innerHTML = `<b>Lectura territorial:</b> el denominador proviene exclusivamente de la matriz maestra de 56 GAD y el numerador usa sus identificadores canónicos. No representa avance del Plan ni cumplimiento del GAD.${quality}`;
  }

  function unionCoverage(stageStats) {
    const all = new Set();
    stageStats.forEach(stage => stage.gadIds.forEach(id => all.add(id)));
    return all;
  }

  function replaceKpis(audit, stageStats, total) {
    const kpis = audit.querySelector(".sr10-audit-kpis");
    if (!kpis) return;
    const { canton } = filters();
    const withData = stageStats.filter(item => item.records > 0).length;
    const covered = unionCoverage(stageStats);
    const unassigned = stageStats.reduce((sum, item) => sum + item.unassigned, 0);
    const state = withData === 0 ? "Sin información" : withData === 6 ? "Todos los tipos presentes" : "Información parcial";

    if (canton) {
      kpis.innerHTML = `
        <article><small>Tipos con información</small><b>${withData} de 6</b><span>Información encontrada en el alcance cantonal</span></article>
        <article><small>Situación documental</small><b>${state}</b><span>${withData === 6 ? "Existen registros en todos los tipos documentales." : "Hay tipos documentales sin información registrada."}</span></article>
        <article><small>Atribución territorial</small><b>${covered.size ? "Verificada" : "Sin cobertura verificada"}</b><span>${unassigned ? `${unassigned} registro${unassigned === 1 ? "" : "s"} requiere${unassigned === 1 ? "" : "n"} atribución GAD.` : "Los registros contabilizados se vinculan al GAD rector."}</span></article>`;
      return;
    }

    kpis.innerHTML = `
      <article><small>Cobertura documental</small><b>${covered.size} de ${total} GAD</b><span>Un GAD cuenta una sola vez, mediante su identificador canónico de la matriz maestra</span></article>
      <article><small>Tipos con información</small><b>${withData} de 6</b><span>Tipos documentales presentes en el alcance seleccionado</span></article>
      <article><small>Situación documental</small><b>${state}</b><span>${unassigned ? `${unassigned} registro${unassigned === 1 ? "" : "s"} sin GAD inequívoco queda${unassigned === 1 ? "" : "n"} fuera de cobertura.` : withData === 6 ? "Hay información en todos los tipos documentales." : "Existen tipos de información aún no registrados."}</span></article>`;
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

  function sourceSignature(scope, docs, stageStats) {
    const stages = stageStats.map(stat => `${stat.id}:${stat.records}:${stat.mappedRecords}:${stat.unassigned}:${[...stat.gadIds].sort((a,b) => a-b).join(",")}`).join("|");
    return `${VERSION}|${norm(scope)}|${docs.map(doc => Number(doc.n)).join(",")}|${stages}`;
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
    const stageButtons = [...audit.querySelectorAll(".sr10-stage-strip [data-sr10-stage]")];
    const stageStats = stageButtons.map(button => stageData(String(button.dataset.sr10Stage || ""), docs));
    const signature = sourceSignature(scope, docs, stageStats);
    if (audit.dataset.v1AuditSignature === signature) {
      moveAnalystInline();
      return;
    }

    const title = audit.querySelector("header h2");
    const subtitle = audit.querySelector("header p");
    if (title) title.textContent = `Estado documental · ${scope}`;
    if (subtitle) subtitle.textContent = "Muestra información atribuible a los GAD del universo rector. Los registros ambiguos se conservan, pero no incrementan la cobertura.";

    renameAuditAction(audit);
    stageButtons.forEach((button, index) => refineStage(button, stageStats[index], total));
    replaceKpis(audit, stageStats, total);
    addLegend(audit, stageStats);
    moveAnalystInline();

    audit.dataset.v1AuditContext = VERSION;
    audit.dataset.v1AuditSignature = signature;
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
    window.addEventListener("smartrisk:desktop-reference-ready", () => setTimeout(schedule, 20));
    document.addEventListener("change", event => {
      if (["v1Level", "v1Province", "v1Canton", "sr10Context"].includes(event.target?.id)) setTimeout(schedule, 40);
    });
    setTimeout(schedule, 0);
    setTimeout(schedule, 200);
    setTimeout(schedule, 700);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.SmartRiskDesktopHomeAuditContext = { VERSION, STAGES, apply, stageData };
})();