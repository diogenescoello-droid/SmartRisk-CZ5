(() => {
  "use strict";

  const VERSION = "1.0.0-gad-scope";
  const $ = (selector, root = document) => root.querySelector(selector);
  const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const runtime = { observer: null, applying: false, options: new Map(), lastPlanner: null };

  function state() { return window.SmartRiskV11App?.state || {}; }

  function addOption(list, province, canton, level = "canton", label = "") {
    province = String(province || "").trim();
    canton = String(canton || "").trim();
    if (!province) return;
    if (level === "canton" && !canton) return;
    const key = level === "provincia" ? `provincia|${norm(province)}` : `canton|${norm(province)}|${norm(canton)}`;
    if (runtime.options.has(key)) return;
    const item = {
      key, level, province, canton,
      label: label || (level === "provincia" ? `GAD Provincial de ${province}` : `GAD Municipal de ${canton}`)
    };
    runtime.options.set(key, item);
    list.push(item);
  }

  function gadCantons() {
    runtime.options.clear();
    const list = [];
    const entities = state().data?.entities || {};
    (entities.territories || []).forEach(item => addOption(list, item.provincia || item.province || item.payload?.provincia, item.canton || item.payload?.canton, "canton"));
    (window.F03_CARTOGRAPHY || []).forEach(item => addOption(list, item.provincia, item.canton, "canton"));
    const plans = window.SMART_RISK_PLAN_SOURCES?.plans || [];
    plans.forEach(plan => {
      const province = plan.province || plan.provincia || "";
      const territory = String(plan.territory || plan.canton || "").trim();
      if (/provincial|prefectura/i.test(territory)) addOption(list, province, "", "provincia", territory);
      else addOption(list, province, territory, "canton");
    });
    return list.sort((a,b) => a.province.localeCompare(b.province,"es") || (a.level === b.level ? a.label.localeCompare(b.label,"es") : a.level === "provincia" ? -1 : 1));
  }

  function selectedFromGlobal() {
    const level = $("#sr16Level")?.value || "zona";
    const province = $("#sr16Province")?.value || state().filters?.provincia || "";
    const canton = $("#sr16Canton")?.value || state().filters?.canton || "";
    if (level === "canton" && province && canton) return `canton|${norm(province)}|${norm(canton)}`;
    if (level === "provincia" && province) return `provincia|${norm(province)}`;
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
        gate.innerHTML = `<b>Selecciona un GAD para mostrar su cartografía</b><p>El visor de planificación no mezcla información entre administraciones. Primero elige el GAD; después se mostrarán únicamente sus puntos, líneas, polígonos, KML/KMZ, sitios, riesgos y acciones georreferenciadas.</p>`;
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
      ? `Vista exclusiva de ${item.label}. Los elementos de otros GAD quedan fuera de esta planificación cartográfica.`
      : "Elige un GAD para activar una vista cartográfica exclusiva y evitar mezclar información territorial.";
  }

  function populateSelector() {
    const planner = $("#srCartoPlanner");
    const controls = $(".sr-carto-controls", planner);
    if (!planner || !controls) return;
    let select = $("#srCartoGad", planner);
    if (!select) {
      const label = document.createElement("label");
      label.className = "sr-carto-gad-filter";
      label.innerHTML = `GAD para planificación cartográfica<select id="srCartoGad"><option value="">Selecciona un GAD</option></select><small>Solo se mostrarán elementos del GAD elegido.</small>`;
      controls.prepend(label);
      select = $("#srCartoGad", label);
    }
    const current = select.value || selectedFromGlobal();
    const options = gadCantons();
    select.innerHTML = `<option value="">Selecciona un GAD</option>${options.map(item => `<option value="${esc(item.key)}">${esc(item.label)} · ${esc(item.province)}</option>`).join("")}`;
    if (current && runtime.options.has(current)) select.value = current;
    const item = runtime.options.get(select.value) || null;
    setGate(Boolean(item));
    updateContextLabel(item);
  }

  function clearCrossGadSelection() {
    const clear = $("[data-sr-carto-clear]");
    if (clear) clear.click();
  }

  function applyGad(key) {
    const item = runtime.options.get(key);
    if (!item) { setGate(false); updateContextLabel(null); return; }
    runtime.applying = true;
    clearCrossGadSelection();
    const level = $("#sr16Level"), province = $("#sr16Province"), canton = $("#sr16Canton");
    if (level) { level.value = item.level; level.dispatchEvent(new Event("change", { bubbles: true })); }
    setTimeout(() => {
      if (province) { province.value = item.province; province.dispatchEvent(new Event("change", { bubbles: true })); }
      setTimeout(() => {
        if (item.level === "canton" && canton) { canton.value = item.canton; canton.dispatchEvent(new Event("change", { bubbles: true })); }
        setGate(true);
        updateContextLabel(item);
        window.SmartRiskCartographyPlanning?.paintPlannerMap?.();
        runtime.applying = false;
      }, 120);
    }, 80);
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
  }

  function bind() {
    document.addEventListener("change", event => {
      if (event.target.matches("#srCartoGad")) { applyGad(event.target.value); return; }
      if (event.target.matches("#sr16Level,#sr16Province,#sr16Canton")) setTimeout(syncFromGlobal, 160);
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
  window.SmartRiskCartographyGadScope = { VERSION, gadCantons, applyGad, populateSelector, currentGad: () => runtime.options.get($("#srCartoGad")?.value || "") || null };
})();
