(() => {
  "use strict";

  const VERSION = "2026.08.27.1";
  let scheduled = false;
  let observer = null;

  const norm = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  function appState() {
    return window.SmartRiskV11App?.state || {};
  }

  function currentScopeLabel() {
    const state = appState();
    const filters = state.filters || {};
    if (filters.canton) return `${filters.provincia || ""} · ${filters.canton}`.replace(/^\s*·\s*/, "");
    if (filters.provincia) return filters.provincia;
    return state.profileContext?.scopeLabel || "Coordinación Zonal 5";
  }

  function scopedRecords() {
    const state = appState();
    const filters = state.filters || {};
    return (state.data?.records || []).filter(record => {
      if (filters.provincia && norm(record?.provincia) !== norm(filters.provincia)) return false;
      if (filters.canton && norm(record?.canton) !== norm(filters.canton)) return false;
      if (filters.evento) {
        const eventText = norm(`${record?.evento || ""} ${record?.payload?.tema || ""} ${record?.payload?.problema || ""}`);
        if (eventText && !eventText.includes(norm(filters.evento))) return false;
      }
      return true;
    });
  }

  function stageRecordCount(stage) {
    const small = stage.querySelector("header small");
    const match = String(small?.textContent || "").match(/(\d+)\s+registros?/i);
    return match ? Number(match[1]) : 0;
  }

  function setCard(card, value, label) {
    if (!card) return;
    const strong = card.querySelector("b, strong");
    const span = card.querySelector("span");
    if (strong && strong.textContent !== String(value)) strong.textContent = String(value);
    if (span && span.textContent !== label) span.textContent = label;
  }

  function contextualizeAuditDrawer() {
    const drawer = document.querySelector("#sr10AuditDrawer");
    if (!drawer) return;

    const state = appState();
    const records = scopedRecords();
    const structured = records.filter(record => !record?.virtual && !record?.normalizedFromPlan);
    const derived = records.filter(record => record?.virtual || record?.normalizedFromPlan);
    const unclassified = records.filter(record => record?.entityType === "other");
    const stages = [...drawer.querySelectorAll(".sr10-stage-list > article")];
    const stagesWithData = stages.filter(stage => stageRecordCount(stage) > 0).length;

    const headSmall = drawer.querySelector(":scope > header small");
    const headTitle = drawer.querySelector(":scope > header h2");
    const headScope = drawer.querySelector(":scope > header p");
    const role = state.profileContext?.roleLabel || "Usuario autorizado";
    if (headSmall && headSmall.textContent !== role) headSmall.textContent = role;
    if (headTitle && headTitle.textContent !== "Auditoría de calidad y trazabilidad") headTitle.textContent = "Auditoría de calidad y trazabilidad";
    const scope = currentScopeLabel();
    if (headScope && headScope.textContent !== scope) headScope.textContent = scope;

    const reconciliation = drawer.querySelector(".sr10-reconciliation");
    if (reconciliation) {
      const title = reconciliation.querySelector("h3");
      if (title && title.textContent !== "Resumen del alcance seleccionado") title.textContent = "Resumen del alcance seleccionado";
      const cards = [...reconciliation.querySelectorAll(":scope > div > article")];
      setCard(cards[0], structured.length, "registros estructurados del alcance");
      setCard(cards[1], derived.length, "registros derivados del Plan en este alcance");
      setCard(cards[2], records.length, "registros totales visibles en este territorio");
      setCard(cards[3], `${stagesWithData}/6`, "etapas con información disponible");
      setCard(cards[4], unclassified.length, "registros del territorio sin clasificación operativa");
      const note = reconciliation.querySelector(":scope > p");
      const text = "Todos los valores corresponden al alcance seleccionado. Esta auditoría evalúa calidad y trazabilidad de la información; no mide cumplimiento del GAD ni avance del Plan.";
      if (note && note.textContent !== text) note.textContent = text;
    }

    stages.forEach(stage => {
      const count = stageRecordCount(stage);
      const score = stage.querySelector(":scope > header strong");
      const progress = stage.querySelector(".sr10-progress i");
      const empty = stage.querySelector(".sr10-no-records");
      if (!count) {
        if (score && score.textContent !== "Sin datos") score.textContent = "Sin datos";
        if (progress) progress.style.width = "0%";
        if (empty) empty.textContent = "No hay datos clasificados para esta etapa dentro del alcance seleccionado.";
      } else if (score) {
        score.title = "Completitud de campos mínimos en los registros disponibles";
      }
    });

    drawer.dataset.userFacingCleanup = VERSION;
  }

  function replaceVisibleText(text) {
    let next = String(text || "");
    next = next.replace(/derivados\s+por\s+RC\s*9/gi, "derivados de planes normalizados");
    next = next.replace(/RC\s*10\s+no\s+escribe\s+en\s+Firestore\.?/gi, "La auditoría es de consulta y no modifica los registros.");
    next = next.replace(/\bRC\s*\d+(?:\.\d+)*\b/gi, "");
    next = next.replace(/\bV1\.0\.0\s+PILOTO\s+ESTABLE\b/gi, "Gestión territorial");
    next = next.replace(/\bESCRITORIO\s+V1\s*\+\s*SMART\s+M[ÓO]VIL\b/gi, "Gestión territorial");
    next = next.replace(/\bV1\s*\+\s*SMART\s+M[ÓO]VIL\b/gi, "Gestión territorial");
    next = next.replace(/\bPILOTO\s+ESTABLE\b/gi, "Gestión territorial");
    next = next.replace(/\s+·\s+(?=$)/g, "");
    next = next.replace(/\s{2,}/g, " ");
    return next;
  }

  function scrubConstructionLabels(root = document.body) {
    if (!root) return;
    document.title = "SmartRisk CZ5 · Gestión territorial";

    const brandSubtitle = document.querySelector("#app aside .brand span");
    if (brandSubtitle && brandSubtitle.textContent !== "Gestión territorial de riesgos · Zona 5") {
      brandSubtitle.textContent = "Gestión territorial de riesgos · Zona 5";
    }

    const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
    const nodes = [];
    while (walker.nextNode()) nodes.push(walker.currentNode);
    nodes.forEach(node => {
      const parent = node.parentElement;
      if (!parent || /^(SCRIPT|STYLE|NOSCRIPT|TEXTAREA)$/i.test(parent.tagName)) return;
      const next = replaceVisibleText(node.nodeValue);
      if (next !== node.nodeValue) node.nodeValue = next;
    });
  }

  function apply() {
    scheduled = false;
    scrubConstructionLabels();
    contextualizeAuditDrawer();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  function start() {
    if (observer) return;
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true, characterData: true });
    window.addEventListener("hashchange", () => setTimeout(schedule, 30));
    window.addEventListener("smartrisk:desktop-reference-ready", schedule);
    setTimeout(schedule, 0);
    setTimeout(schedule, 150);
    setTimeout(schedule, 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.SmartRiskUserFacingCleanup = { VERSION, apply, contextualizeAuditDrawer };
})();
