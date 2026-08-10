(() => {
  "use strict";

  const text = value => String(value || "").trim();
  const normalized = value => text(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const number = value => {
    const parsed = Number(value);
    return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
  };
  const unique = values => [...new Set((values || []).filter(Boolean))];
  const closedAction = action => ["completada", "cumplida", "cerrada"].includes(normalized(action?.estado));
  const actionableSite = site => {
    const state = normalized(site?.estado);
    return Boolean(site?.id) && !["pendiente de validacion territorial", "cerrado", "descartado"].includes(state);
  };
  const solvedGap = site => {
    if (["solventada", "cerrada", "sin brecha"].includes(normalized(site?.estadoBrecha))) return true;
    return normalized(site?.brechaPrincipal) === "sin brecha";
  };

  function territoryIndex(territories = []) {
    return Object.fromEntries(territories.map(item => [item.id, item]));
  }

  function scopeLabel(site, territoriesById) {
    const territory = territoriesById[site?.territorio] || {};
    return {
      territoryId: site?.territorio || territory.id || "SIN-TERRITORIO",
      province: territory.provincia || site?.provincia || "Sin provincia",
      canton: territory.canton || site?.canton || "Sin cantón"
    };
  }

  function aggregate(dataset = {}) {
    const sites = dataset.sitios || [];
    const actions = dataset.acciones || [];
    const territoriesById = territoryIndex(dataset.territorios || []);
    const actionable = sites.filter(actionableSite);
    const actionableIds = new Set(actionable.map(site => site.id));
    const linkedActions = actions.filter(action => actionableIds.has(action.sitioId));
    const activeGaps = actionable.filter(site => !solvedGap(site));
    const solvedGaps = actionable.filter(solvedGap);
    const assignedBudget = linkedActions.reduce((sum, action) => sum + number(action.presupuestoAsignado ?? action.costoEstimado), 0);
    const executedBudget = linkedActions.reduce((sum, action) => sum + number(action.presupuestoEjecutado), 0);
    const withBudget = linkedActions.filter(action => number(action.presupuestoAsignado ?? action.costoEstimado) > 0).length;
    const byTerritory = new Map();

    actionable.forEach(site => {
      const scope = scopeLabel(site, territoriesById);
      if (!byTerritory.has(scope.territoryId)) byTerritory.set(scope.territoryId, {
        ...scope, sites: 0, actions: 0, assignedBudget: 0, executedBudget: 0, activeGaps: 0, solvedGaps: 0
      });
      const row = byTerritory.get(scope.territoryId);
      row.sites += 1;
      if (solvedGap(site)) row.solvedGaps += 1;
      else row.activeGaps += 1;
    });
    linkedActions.forEach(action => {
      const site = actionable.find(item => item.id === action.sitioId);
      if (!site) return;
      const row = byTerritory.get(scopeLabel(site, territoriesById).territoryId);
      row.actions += 1;
      row.assignedBudget += number(action.presupuestoAsignado ?? action.costoEstimado);
      row.executedBudget += number(action.presupuestoEjecutado);
    });

    const gapTotal = activeGaps.length + solvedGaps.length;
    return {
      cutAt: new Date().toISOString(),
      sites: actionable.length,
      actions: linkedActions.length,
      sitesWithActions: unique(linkedActions.map(action => action.sitioId)).length,
      assignedBudget,
      executedBudget,
      actionsWithBudget: withBudget,
      activeGaps: activeGaps.length,
      solvedGaps: solvedGaps.length,
      activeGapPct: gapTotal ? Math.round(activeGaps.length / gapTotal * 100) : 0,
      solvedGapPct: gapTotal ? Math.round(solvedGaps.length / gapTotal * 100) : 0,
      completedActions: linkedActions.filter(closedAction).length,
      rows: [...byTerritory.values()].sort((a, b) => b.activeGaps - a.activeGaps || b.sites - a.sites || a.canton.localeCompare(b.canton, "es"))
    };
  }

  function validateActionBudget(values = {}) {
    const assigned = number(values.presupuestoAsignado);
    const executed = number(values.presupuestoEjecutado);
    if (executed > assigned) return "El presupuesto ejecutado no puede superar el presupuesto asignado.";
    return "";
  }

  window.SmartRiskOperational = { aggregate, actionableSite, solvedGap, validateActionBudget };
})();
