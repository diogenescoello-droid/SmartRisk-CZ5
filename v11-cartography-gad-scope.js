(() => {
  "use strict";

  const VERSION = "1.2.0-hierarchical-scope";
  const $ = (selector, root = document) => root.querySelector(selector);
  const norm = value => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/_/g, " ")
    .replace(/^\s*cant[oó]n\s+/i, "")
    .replace(/\s+/g, " ").trim().toLowerCase();
  const clean = value => String(value || "")
    .replace(/_/g, " ")
    .replace(/^\s*cant[oó]n\s+/i, "")
    .replace(/\s+/g, " ").trim();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);

  const PROVINCES = Object.freeze({
    bolivar: "Bolívar",
    guayas: "Guayas",
    "los rios": "Los Ríos",
    "santa elena": "Santa Elena",
    galapagos: "Galápagos"
  });

  const CANTON_FIXES = Object.freeze({
    guaranda: "Bolívar"
  });

  const runtime = {
    observer: null,
    lastPlanner: null,
    lastScopeKey: "",
    normalisedSignature: ""
  };

  function state() { return window.SmartRiskV11App?.state || {}; }

  function canonicalProvince(value, item = null) {
    const code = norm(item?.codigoCaso || item?.id || "");
    for (const [key,label] of Object.entries(PROVINCES)) {
      if (code.includes(`gad cantonal ${key}`) || code.includes(`gad provincial ${key}`)) return label;
    }
    const cantonProvince = CANTON_FIXES[norm(item?.canton)];
    if (cantonProvince) return cantonProvince;
    return PROVINCES[norm(value)] || clean(value);
  }

  function normalizeF03() {
    const rows = Array.isArray(window.F03_CARTOGRAPHY) ? window.F03_CARTOGRAPHY : [];
    if (!rows.length) return false;
    const signature = `${rows.length}|${rows[0]?.id || ""}|${rows.at(-1)?.id || ""}`;
    if (runtime.normalisedSignature === signature) return true;
    rows.forEach(item => {
      item.canton = clean(item.canton);
      item.provincia = canonicalProvince(item.provincia, item);
      if (item.poligono && String(item.poligono).includes(";")) {
        item.poligono = String(item.poligono).split(";").map(part => {
          const nums = part.match(/-?\d+(?:[.,]\d+)?/g)?.slice(0,2) || [];
          return nums.length === 2 ? `${nums[0]} ${nums[1]}` : "";
        }).filter(Boolean).join(";");
      }
    });
    runtime.normalisedSignature = signature;
    return true;
  }

  function currentScope() {
    const filters = state().filters || {};
    const level = $("#sr16Level")?.value || (filters.canton ? "canton" : filters.provincia ? "provincia" : "zona");
    const province = level === "zona" ? "" : clean($("#sr16Province")?.value || filters.provincia || "");
    const canton = level === "canton" ? clean($("#sr16Canton")?.value || filters.canton || "") : "";
    const resolvedLevel = level === "canton" && !canton ? (province ? "provincia" : "zona") : level === "provincia" && !province ? "zona" : level;
    return {
      level: resolvedLevel,
      province: resolvedLevel === "zona" ? "" : province,
      canton: resolvedLevel === "canton" ? canton : "",
      key: `${resolvedLevel}|${norm(province)}|${norm(canton)}`
    };
  }

  function matchesScope(item, scope = currentScope()) {
    if (!item) return false;
    if (scope.level === "zona") return true;
    const province = canonicalProvince(item.provincia || item.province || item.payload?.provincia || item.payload?.province || "", item);
    if (norm(province) !== norm(scope.province)) return false;
    if (scope.level === "provincia") return true;
    const canton = clean(item.canton || item.cantón || item.territory || item.payload?.canton || item.payload?.territorioNombre || "");
    return norm(canton) === norm(scope.canton);
  }

  function scopeCopy(scope = currentScope()) {
    if (scope.level === "zona") return {
      eyebrow: "Alcance cartográfico",
      title: "Zona 5 · Todos los GAD",
      description: "Se muestran los elementos cartográficos disponibles de todos los GAD de la Zona 5."
    };
    if (scope.level === "provincia") return {
      eyebrow: "Alcance cartográfico",
      title: `Provincia de ${scope.province} · Todos los GAD`,
      description: `Se muestran todos los elementos cartográficos disponibles de los GAD de ${scope.province}.`
    };
    return {
      eyebrow: "Alcance cartográfico",
      title: `Cantón ${scope.canton} · Solo el GAD seleccionado`,
      description: `Se muestran únicamente los elementos cartográficos del GAD de ${scope.canton}, ${scope.province}.`
    };
  }

  function renderScopeContext() {
    normalizeF03();
    const planner = $("#srCartoPlanner");
    if (!planner) return;

    $(".sr-carto-gad-filter", planner)?.remove();
    $("#srCartoGadRequired", planner)?.remove();
    [...planner.querySelectorAll(":scope > .sr-carto-layout, :scope > .sr-carto-selection, :scope > .sr-carto-docs")].forEach(node => node.hidden = false);

    const scope = currentScope();
    const copy = scopeCopy(scope);
    let card = $("#srCartoScopeContext", planner);
    if (!card) {
      card = document.createElement("section");
      card.id = "srCartoScopeContext";
      card.className = "sr-carto-scope-context";
      $(".sr-carto-controls", planner)?.insertAdjacentElement("afterend", card);
    }
    card.innerHTML = `<small>${esc(copy.eyebrow)}</small><b>${esc(copy.title)}</b><span>${esc(copy.description)}</span>`;

    const lead = $(".sr-carto-lead h2", planner);
    const paragraph = $(".sr-carto-lead p", planner);
    if (lead) lead.textContent = scope.level === "zona"
      ? "Cartografía de la Zona 5 para planificación"
      : scope.level === "provincia"
        ? `Cartografía de ${scope.province} para planificación`
        : `Cartografía del GAD de ${scope.canton} para planificación`;
    if (paragraph) paragraph.textContent = copy.description + " Activa capas, selecciona geometrías y contrasta sus fuentes antes de incorporarlas a la planificación.";

    document.dispatchEvent(new CustomEvent("smartrisk:cartography-scope-change", { detail: scope }));
  }

  function clearSelectionOnScopeChange() {
    const scope = currentScope();
    if (!runtime.lastScopeKey) { runtime.lastScopeKey = scope.key; return; }
    if (runtime.lastScopeKey === scope.key) return;
    runtime.lastScopeKey = scope.key;
    $("[data-sr-carto-clear]")?.click();
  }

  function refresh() {
    normalizeF03();
    clearSelectionOnScopeChange();
    renderScopeContext();
    window.SmartRiskCartographyPlanning?.paintPlannerMap?.();
  }

  function bind() {
    document.addEventListener("change", event => {
      if (event.target.matches("#sr16Level,#sr16Province,#sr16Canton")) setTimeout(refresh, 180);
    });
    runtime.observer = new MutationObserver(() => {
      const planner = $("#srCartoPlanner");
      if (planner && planner !== runtime.lastPlanner) {
        runtime.lastPlanner = planner;
        setTimeout(refresh, 40);
      } else if (planner && !$("#srCartoScopeContext", planner)) setTimeout(renderScopeContext, 40);
      if (!runtime.normalisedSignature) normalizeF03();
    });
    runtime.observer.observe(document.body, { childList: true, subtree: true });
  }

  function start() {
    normalizeF03();
    bind();
    setTimeout(refresh, 700);
    setTimeout(normalizeF03, 1400);
  }

  start();
  window.SmartRiskCartographyScope = { VERSION, currentScope, matchesScope, normalizeF03, canonicalProvince, normalizeTerritory: norm, refresh };
  window.SmartRiskCartographyGadScope = {
    VERSION,
    currentScope,
    currentGad: () => {
      const scope = currentScope();
      return scope.level === "canton" ? { level: "canton", province: scope.province, canton: scope.canton, label: `GAD Municipal de ${scope.canton}` } : null;
    },
    normalizeTerritory: norm,
    refresh
  };
})();
