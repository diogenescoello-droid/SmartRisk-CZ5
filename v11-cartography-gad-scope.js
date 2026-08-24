(() => {
  "use strict";

  const VERSION = "1.1.0-gad-cantonal-scope";
  const $ = (selector, root = document) => root.querySelector(selector);
  const norm = value => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, " ").replace(/^\s*canton\s+/i, "")
    .replace(/\s+/g, " ").trim().toLowerCase();
  const clean = value => String(value || "").replace(/_/g, " ").replace(/^\s*cant[oó]n\s+/i, "").replace(/\s+/g, " ").trim();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const runtime = { observer: null, applying: false, options: new Map(), lastPlanner: null };

  function state() { return window.SmartRiskV11App?.state || {}; }

  function addOption(list, province, canton, label = "") {
    province = clean(province);
    canton = clean(canton);
    if (!province || !canton) return;
    const key = `canton|${norm(province)}|${norm(canton)}`;
    if (runtime.options.has(key)) return;
    const item = { key, level: "canton", province, canton, label: label || `GAD Municipal de ${canton}` };
    runtime.options.set(key, item);
    list.push(item);
  }

  function gadCantons() {
    runtime.options.clear();
    const list = [];
    const entities = state().data?.entities || {};
    (entities.territories || []).forEach(item => addOption(list, item.provincia || item.province || item.payload?.provincia, item.canton || item.payload?.canton));
    (window.F03_CARTOGRAPHY || []).forEach(item => addOption(list, item.provincia, item.canton));
    const plans = window.SMART_RISK_PLAN_SOURCES?.plans || [];
    plans.forEach(plan => {
      const territory = String(plan.territory || plan.canton || "").trim();
      if (!territory || /provincial|prefectura/i.test(territory)) return;
      addOption(list, plan.province || plan.provincia, territory);
    });
    return list.sort((a,b) => a.province.localeCompare(b.province,"es") || a.canton.localeCompare(b.canton,"es"));
  }

  function selectedFromGlobal() {
    const level = $("#sr16Level")?.value || "zona";
    const province = clean($("#sr16Province")?.value || state().filters?.provincia || "");
    const canton = clean($("#sr16Canton")?.value || state().filters?.canton || "");
    if (level === "canton" && province && canton) return `canton|${norm(province)}|${norm(canton)}`;
    return "";
  }

  function setGate(enabled) {
    const planner = $("#srCartoPlanner");
    if (!planner) return;
    const protectedBlocks = [...planner.querySelectorAll(":scope > .sr-carto-layout, :scope > .sr-carto-selection, :scope > .sr-carto-docs")];
    protectedBlocks.forEach(node => node.hidden = !enabled);
    let gate = $("#srCartoGadRequired", planner);
    if (!enabled) {
      if (!gate) {
        gate = document.createElement("section");
        gate.id = "srCartoGadRequired";
        gate.className = "sr-carto-gad-required";
        gate.innerHTML = `<b>Selecciona un GAD cantonal para mostrar su cartografía</b><p>El visor no mezcla información entre municipios. Después de elegir el GAD se mostrarán únicamente sus registros F03, puntos, líneas, polígonos, KML/KMZ, sitios, riesgos y acciones georreferenciadas.</p>`;
        const controls = $(".sr-carto-controls", planner);
        controls?.insertAdjacentElement("afterend", gate);
      }
    } else gate?.remove();
  }

  function updateContextLabel(item) {
    const planner = $("#srCartoPlanner");
    if (!planner) return;
    const lead = $(".sr-carto-lead h2", planner);
    const paragraph = $(".sr-carto-lead p", planner);
    if (lead) lead.textContent = item ? `Cartografía del ${item.label}` : "Cartografía para decidir qué priorizar y dónde actuar";
    if (paragraph) paragraph.textContent = item
      ? `Vista exclusiva de ${item.label}, ${item.province}. Los elementos de otros GAD quedan fuera de esta planificación cartográfica.`
      : "Elige un GAD cantonal para activar una vista cartográfica exclusiva y evitar mezclar información territorial.";
  }

  function populateSelector() {
    const planner = $("#srCartoPlanner");
    const controls = $(".sr-carto-controls", planner);
    if (!planner || !controls) return;
    let select = $("#srCartoGad", planner);
    if (!select) {
      const label = document.createElement("label");
      label.className = "sr-carto-gad-filter";
      label.innerHTML = `GAD para planificación cartográfica<select id="srCartoGad"><option value="">Selecciona un GAD cantonal</option></select><small>Solo se mostrarán elementos del municipio elegido.</small>`;
      controls.prepend(label);
      select = $("#srCartoGad", label);
    }
    const current = select.value || selectedFromGlobal();
    const options = gadCantons();
    select.innerHTML = `<option value="">Selecciona un GAD cantonal</option>${options.map(item => `<option value="${esc(item.key)}">${esc(item.label)} · ${esc(item.province)}</option>`).join("")}`;
    if (current && runtime.options.has(current)) select.value = current;
    const item = runtime.options.get(select.value) || null;
    setGate(Boolean(item));
    updateContextLabel(item);
    document.dispatchEvent(new CustomEvent("smartrisk:gad-cartography-change", { detail: item }));
  }

  function clearCrossGadSelection() {
    const clear = $("[data-sr-carto-clear]");
    if (clear) clear.click();
  }

  function applyGad(key) {
    const item = runtime.options.get(key);
    if (!item) {
      setGate(false);
      updateContextLabel(null);
      document.dispatchEvent(new CustomEvent("smartrisk:gad-cartography-change", { detail: null }));
      return;
    }
    runtime.applying = true;
    clearCrossGadSelection();
    const level = $("#sr16Level"), province = $("#sr16Province"), canton = $("#sr16Canton");
    if (level) { level.value = "canton"; level.dispatchEvent(new Event("change", { bubbles: true })); }
    setTimeout(() => {
      if (province) { province.value = item.province; province.dispatchEvent(new Event("change", { bubbles: true })); }
      setTimeout(() => {
        if (canton) { canton.value = item.canton; canton.dispatchEvent(new Event("change", { bubbles: true })); }
        setGate(true);
        updateContextLabel(item);
        window.SmartRiskCartographyPlanning?.paintPlannerMap?.();
        runtime.applying = false;
        document.dispatchEvent(new CustomEvent("smartrisk:gad-cartography-change", { detail: item }));
      }, 140);
    }, 90);
  }

  function syncFromGlobal() {
    if (runtime.applying) return;
    const select = $("#srCartoGad");
    if (!select) return;
    const key = selectedFromGlobal();
    select.value = key && runtime.options.has(key) ? key : "";
    const item = runtime.options.get(select.value) || null;
    setGate(Boolean(item));
    updateContextLabel(item);
    document.dispatchEvent(new CustomEvent("smartrisk:gad-cartography-change", { detail: item }));
  }

  function bind() {
    document.addEventListener("change", event => {
      if (event.target.matches("#srCartoGad")) { applyGad(event.target.value); return; }
      if (event.target.matches("#sr16Level,#sr16Province,#sr16Canton")) setTimeout(syncFromGlobal, 180);
    });
    runtime.observer = new MutationObserver(() => {
      const planner = $("#srCartoPlanner");
      if (planner && planner !== runtime.lastPlanner) {
        runtime.lastPlanner = planner;
        setTimeout(populateSelector, 30);
      } else if (planner && !$("#srCartoGad", planner)) setTimeout(populateSelector, 30);
    });
    runtime.observer.observe(document.body, { childList: true, subtree: true });
  }

  function start() {
    bind();
    setTimeout(populateSelector, 700);
  }

  start();
  window.SmartRiskCartographyGadScope = {
    VERSION, gadCantons, applyGad, populateSelector,
    currentGad: () => runtime.options.get($("#srCartoGad")?.value || "") || null,
    normalizeTerritory: norm
  };
})();
