(() => {
  "use strict";

  const VERSION = "2026.08.27.1";
  const CANTON_ALIASES = Object.freeze({
    "jujan":"alfredo baquerizo moreno","alfredo baquerizo moreno jujan":"alfredo baquerizo moreno",
    "general antonio elizalde":"general antonio elizalde bucay","general antonio elizalde bucay":"general antonio elizalde bucay","bucay":"general antonio elizalde bucay",
    "coronel marcelino mariduena":"marcelino mariduena","marcelino mariduena":"marcelino mariduena",
    "san jacinto de yaguachi":"yaguachi","yaguachi":"yaguachi","san miguel":"san miguel de bolivar","san miguel de bolivar":"san miguel de bolivar"
  });
  let scheduled = false;
  let observer = null;

  const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
  const cantonKey = value => CANTON_ALIASES[norm(value)] || norm(value);
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const appState = () => window.SmartRiskV11App?.state || {};
  const entity = name => appState().data?.entities?.[name] || [];
  const master = () => window.SMART_RISK_GAD_REVIEW_CONTEXT || null;

  function isDesktop() {
    return window.SmartRiskDeviceMode?.isSmart ? window.SmartRiskDeviceMode.isSmart() !== true : document.documentElement.dataset.smartRiskDevice !== "smart";
  }

  function currentRoute() {
    const hash = String(location.hash || "").replace(/^#\/?/, "").split(/[?&]/)[0];
    return hash || String(appState().route || "inicio");
  }

  function currentFilters() {
    const filters = appState().filters || {};
    return { province: filters.provincia || "", canton: filters.canton || "" };
  }

  function scopeOf(item) {
    return {
      province: item?.province ?? item?.provincia ?? item?.payload?.province ?? item?.payload?.provincia ?? "",
      canton: item?.canton ?? item?.territory ?? item?.payload?.canton ?? item?.payload?.territory ?? "",
      level: item?.level ?? item?.nivel ?? item?.payload?.level ?? item?.payload?.nivel ?? ""
    };
  }

  function matchesScope(item, province, canton) {
    const scope = scopeOf(item);
    const level = norm(scope.level);
    if (/zonal|nacional|institucional/.test(level)) return false;
    if (province && norm(scope.province) !== norm(province)) return false;
    if (canton && cantonKey(scope.canton) !== cantonKey(canton)) return false;
    return Boolean(scope.province);
  }

  function masterRows(province, canton) {
    return master()?.scope?.(province, canton) || [];
  }

  function masterRow(province, canton) {
    return canton ? master()?.find?.(province, canton) || null : null;
  }

  function parseInteger(value) {
    const number = Number(String(value || "").replace(/[^0-9]/g, ""));
    return Number.isFinite(number) ? number : null;
  }

  function territoryInfo(doc) {
    const text = String(doc?.universe || "").trim();
    const normalized = norm(text);
    const result = { total: null, totalPrefix: "", priority: null, priorityPrefix: "", detail: text, explicitPriority: false };
    if (!text || /sin total unico|no determinable|sin catalogo|coberturas territoriales sin universo|amenazas sectores identificados|zona urbana recintos|sectores recintos y poligonos/i.test(normalized)) return result;

    let match = text.match(/([>≥])?\s*(\d+)\s+de\s+(\d+)\s+(?:sectores?|sitios?|puntos?|referencias?)/i);
    if (match) {
      result.priority = Number(match[2]);
      result.priorityPrefix = match[1] || "";
      result.total = Number(match[3]);
      result.explicitPriority = true;
      return result;
    }

    match = text.match(/(\d+)\s+puntos?\s+Muy\s+Alto\s*\+\s*(\d+)\s+Alto/i);
    if (match) {
      result.total = Number(match[1]) + Number(match[2]);
      result.priority = result.total;
      result.explicitPriority = true;
      return result;
    }

    match = text.match(/(\d+)\s+recintos?\s+alta\s*\+\s*([≥>])?\s*(\d+)\s+media/i);
    if (match) {
      result.total = Number(match[1]) + Number(match[3]);
      result.totalPrefix = match[2] || "";
      result.priority = result.total;
      result.priorityPrefix = result.totalPrefix;
      result.explicitPriority = true;
      return result;
    }

    match = text.match(/^\s*([>≥~≈])?\s*(\d+)\s+(?:registros? territoriales?|puntos? críticos?|sectores?|sitios?|filas? territoriales?|zonas?|puntos?|referencias?|recintos?|ciudadelas?|ámbitos? territoriales?|ambitos? territoriales?|comunidades?)/i);
    if (match) {
      result.total = Number(match[2]);
      result.totalPrefix = match[1] || "";
      if (/prioritari|critico|crítico|muy alto|riesgo alto|alta\b/i.test(text.slice(0, 120))) {
        result.priority = result.total;
        result.priorityPrefix = result.totalPrefix;
        result.explicitPriority = true;
      }
      return result;
    }

    match = text.match(/^(?:Boquer[oó]n|Chipe\s+y\s+San\s+Sim[oó]n)\b/i);
    if (match) {
      result.total = /^Boquer/i.test(match[0]) ? 1 : 2;
      return result;
    }

    match = text.match(/(\d+)\s+F01\s+PUNTO-?1[^;]*PUNTO-?(\d+)/i);
    if (match) {
      result.total = Math.max(Number(match[1]), Number(match[2]));
      return result;
    }

    match = text.match(/([>≥~≈])?\s*(\d+)\s+(?:comunidades?|referencias?)\b/i);
    if (match) {
      result.total = Number(match[2]);
      result.totalPrefix = match[1] || "";
    }
    return result;
  }

  function actionCountFromDoc(doc) {
    const text = [doc?.universe, doc?.trace, doc?.next].filter(Boolean).join(" · ");
    const matches = [...text.matchAll(/([>≥~≈])?\s*(\d+)\s+(acciones?|actividades?|medidas?|intervenciones?|rubros|ejes|estrategias)\b/gi)];
    if (!matches.length) return null;
    const direct = matches.filter(match => /acciones?|actividades?|medidas?|intervenciones?/i.test(match[3]));
    const pool = direct.length ? direct : matches;
    return Math.max(...pool.map(match => Number(match[2])).filter(Number.isFinite));
  }

  function actionTitle(item) {
    return String(item?.title || item?.actionTitle || item?.payload?.accion || item?.payload?.acción || item?.payload?.actividad || item?.sourceId || item?.id || "").trim();
  }

  function distinctBy(items, selector) {
    const seen = new Set();
    return items.filter(item => {
      const key = norm(selector(item));
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  function hasSiteLink(item) {
    const source = { ...(item || {}), ...(item?.payload || {}) };
    const keys = ["siteReference","siteId","sitioId","criticalSiteId","criticalSiteReference","sectorId","puntoCriticoId","puntoId","ubicacionId","territorialSiteId"];
    return keys.some(key => String(source[key] || "").trim() && !/^(no[_\s-]*encontrad|sin[_\s-]*sitio|ningun|n\/a|null|undefined)/i.test(String(source[key] || "").trim()));
  }

  function parseMoney(raw) {
    if (typeof raw === "number" && Number.isFinite(raw)) return Math.max(0, raw);
    let text = String(raw ?? "").trim().replace(/\s/g, "").replace(/[^0-9,.-]/g, "");
    if (!text) return 0;
    const comma = text.lastIndexOf(",");
    const dot = text.lastIndexOf(".");
    if (comma >= 0 && dot >= 0) {
      if (comma > dot) text = text.replace(/\./g, "").replace(",", ".");
      else text = text.replace(/,/g, "");
    } else if (comma >= 0) {
      const decimals = text.length - comma - 1;
      text = decimals === 2 ? text.replace(",", ".") : text.replace(/,/g, "");
    } else if (dot >= 0) {
      const parts = text.split(".");
      if (parts.length > 2 || (parts.length === 2 && parts[1].length === 3)) text = parts.join("");
    }
    const value = Number(text);
    return Number.isFinite(value) && value > 0 ? value : 0;
  }

  function actionMoney(item) {
    const source = { ...(item || {}), ...(item?.payload || {}) };
    const preferred = [
      "presupuestoAsignado","presupuesto_asignado","montoAsignado","monto_asignado","presupuestoAccion","presupuesto_accion",
      "presupuesto","monto","costo","costoEstimado","costo_estimado","inversion","inversión","financiamiento","budget","amount"
    ];
    for (const key of preferred) {
      if (source[key] !== undefined && source[key] !== null && String(source[key]).trim() !== "") {
        const value = parseMoney(source[key]);
        if (value > 0) return value;
      }
    }
    for (const [key, value] of Object.entries(source)) {
      if (!/(presupuesto|monto|costo|inversion|inversión|financiamiento|budget)/i.test(key)) continue;
      const parsed = parseMoney(value);
      if (parsed > 0) return parsed;
    }
    return 0;
  }

  function documentAmounts(doc) {
    const text = [doc?.universe, doc?.trace, doc?.next].filter(Boolean).join(" · ");
    const values = [];
    const regex = /(?:USD|US\$|\$)\s*([0-9][0-9.,]*)/gi;
    for (const match of text.matchAll(regex)) {
      const value = parseMoney(match[1]);
      if (value > 0 && !values.some(existing => Math.abs(existing - value) < 0.005)) values.push(value);
    }
    return values;
  }

  function moneyLabel(value) {
    if (!(value > 0)) return "USD 0";
    return `USD ${new Intl.NumberFormat("es-EC", { maximumFractionDigits: 2 }).format(value)}`;
  }

  function scopedFollowups(province, canton) {
    const source = Array.isArray(window.SMART_RISK_F07_CURRENT?.followups) ? window.SMART_RISK_F07_CURRENT.followups : [];
    return source.filter(item => matchesScope(item, province, canton));
  }

  function actionMetrics(province, canton, docs) {
    const actions = distinctBy(entity("actions").filter(item => matchesScope(item, province, canton)), actionTitle);
    const followups = scopedFollowups(province, canton);
    const f07Actions = distinctBy(followups.filter(item => actionTitle(item) && !/accion sin descripcion homologada|ningun|sin novedad/i.test(norm(actionTitle(item)))), actionTitle);
    const docCount = docs.length === 1 ? actionCountFromDoc(docs[0]) : docs.map(actionCountFromDoc).filter(Number.isFinite).reduce((sum, value) => sum + value, 0);
    const total = Math.max(Number(docCount || 0), actions.length, f07Actions.length);
    const structuredLinked = distinctBy(actions.filter(hasSiteLink), actionTitle).length;
    const f07Linked = distinctBy(followups.filter(item => norm(item.actionLinkState) === "vinculada" && norm(item.siteLinkState) === "vinculado"), item => item.actionReference || item.actionCode || actionTitle(item)).length;
    const linked = Math.min(total || Math.max(structuredLinked, f07Linked), Math.max(structuredLinked, f07Linked));
    const pending = total ? Math.max(0, total - linked) : f07Actions.filter(item => !(norm(item.actionLinkState) === "vinculada" && norm(item.siteLinkState) === "vinculado")).length;
    return { actions, followups, f07Actions, total, linked, pending };
  }

  function budgetMetrics(actions, docs) {
    let total = 0;
    let linked = 0;
    let actionsWithBudget = 0;
    let linkedActionsWithBudget = 0;
    actions.forEach(action => {
      const value = actionMoney(action);
      if (!(value > 0)) return;
      total += value;
      actionsWithBudget += 1;
      if (hasSiteLink(action)) {
        linked += value;
        linkedActionsWithBudget += 1;
      }
    });
    const docsWithAmounts = docs.map(doc => ({ doc, amounts: documentAmounts(doc) })).filter(item => item.amounts.length);
    return { total, linked, unlinked: Math.max(0, total - linked), actionsWithBudget, linkedActionsWithBudget, docsWithAmounts };
  }

  function structuredPriorityCount(province, canton) {
    const priorityPattern = /critico|crítico|muy alto|alto|prioritari|prioridad alta|emergente/;
    const records = [...entity("criticalSites"), ...entity("risks")].filter(item => matchesScope(item, province, canton));
    return distinctBy(records.filter(item => priorityPattern.test(norm(`${item?.prioridad || ""} ${item?.nivelRiesgo || ""} ${item?.payload?.prioridad || ""} ${item?.payload?.nivelRiesgo || ""} ${item?.detail || ""}`))), item => `${scopeOf(item).province}|${scopeOf(item).canton}|${item?.title || item?.sourceId || item?.id}`).length;
  }

  function consolidatedSitesCount() {
    try { return Number(window.SmartRiskDesktopExecutiveHome?.consolidatedSiteMetrics?.().consolidated || 0); }
    catch (_) { return 0; }
  }

  function card(label, value, detail, route, button, key, textual = false) {
    return `<article class="v1-ref-card v1-exec-card v1-decision-card${textual ? " is-textual" : ""}" data-decision-kpi="${key}"><span>${esc(label)}</span><strong>${esc(value)}</strong><small>${esc(detail)}</small><button data-v1-route="${route}">${esc(button)} →</button></article>`;
  }

  function cantonCards(province, canton, doc, actions, budget, followups) {
    const territory = territoryInfo(doc);
    const structuredSites = consolidatedSitesCount();
    const totalSites = territory.total ?? (structuredSites || null);
    const totalLabel = totalSites !== null ? `${territory.totalPrefix || ""}${totalSites}` : "Sin total único";
    const sitesDetail = territory.total !== null
      ? `${territory.totalPrefix || ""}${territory.total} identificados en el expediente${structuredSites ? ` · ${structuredSites} ya consolidados en SmartRisk` : " · homologación estructurada pendiente"}.`
      : structuredSites ? `${structuredSites} sitios consolidados en SmartRisk; el expediente no declara un total territorial único comparable.` : `${doc?.universe || "Inventario territorial por consolidar"}.`;

    const structuredPriority = structuredPriorityCount(province, canton);
    const priorityValue = territory.priority !== null ? `${territory.priorityPrefix || ""}${territory.priority}` : structuredPriority ? String(structuredPriority) : "Por homologar";
    const priorityDetail = territory.priority !== null
      ? `${territory.priorityPrefix || ""}${territory.priority} de ${totalSites ?? "los"} identificados tienen prioridad explícita en la fuente.`
      : structuredPriority ? `${structuredPriority} sitios tienen prioridad estructurada en SmartRisk.` : "El expediente identifica territorio, pero la prioridad por sitio todavía no está homologada de forma comparable.";

    const actionValue = actions.total ? `${actions.linked} / ${actions.total}` : (actions.linked ? String(actions.linked) : "Por homologar");
    const actionDetail = actions.total
      ? `${actions.linked} vinculadas a sitio · ${actions.pending} sin vínculo territorial.`
      : `${actions.followups.length} seguimientos F07 en el corte; falta consolidar el universo de acciones del Plan y su vínculo con sitios.`;

    let budgetValue = "No cuantificado";
    let budgetDetail = "No existe todavía un monto estructurado por acción dentro del alcance seleccionado.";
    if (budget.linked > 0) {
      budgetValue = moneyLabel(budget.linked);
      budgetDetail = `${budget.linkedActionsWithBudget} acciones tienen monto y vínculo territorial${budget.unlinked > 0 ? ` · ${moneyLabel(budget.unlinked)} permanece en acciones sin sitio vinculado` : ""}.`;
    } else if (budget.total > 0) {
      budgetValue = "Sin vínculo";
      budgetDetail = `${moneyLabel(budget.total)} está registrado en acciones, pero aún no está asociado a un sitio priorizado.`;
    } else if (budget.docsWithAmounts.length) {
      budgetValue = "Referencial";
      const amounts = budget.docsWithAmounts[0].amounts.slice(0, 2).map(moneyLabel).join(" y ");
      budgetDetail = `${amounts} consta en el expediente como referencia/general; falta asignarlo por acción y sitio antes de tratarlo como presupuesto vinculado.`;
    }

    return [
      card("Sitios / territorios identificados", totalLabel, sitesDetail, "riesgos", "Ver sitios", "territories", totalSites === null),
      card("Territorios priorizados", priorityValue, priorityDetail, "riesgos", "Ver prioridades", "priorities", territory.priority === null && !structuredPriority),
      card("Acciones vinculadas a sitios", actionValue, actionDetail, "acciones", "Ver acciones", "actions", !actions.total),
      card("Presupuesto asignado a acciones", budgetValue, budgetDetail, "acciones", "Ver presupuesto", "budget", !(budget.linked > 0))
    ].join("");
  }

  function aggregateCards(province, docs, actions, budget) {
    const parsed = docs.map(doc => ({ doc, territory: territoryInfo(doc) }));
    const identified = parsed.filter(item => item.territory.total !== null).length;
    const prioritized = parsed.filter(item => item.territory.priority !== null).length;
    const actionValue = actions.total ? `${actions.linked} / ${actions.total}` : (actions.linked ? String(actions.linked) : "Por consolidar");
    const actionDetail = actions.total ? `${actions.linked} acciones con vínculo sitio–acción · ${actions.pending} pendientes de vínculo en el alcance.` : "El total de acciones no es comparable todavía en todos los expedientes del alcance.";
    let budgetValue = "No cuantificado";
    let budgetDetail = "No hay presupuesto por acción homologado para agregar de forma defendible.";
    if (budget.linked > 0) {
      budgetValue = moneyLabel(budget.linked);
      budgetDetail = `Suma de montos estructurados en acciones con vínculo territorial. ${budget.unlinked > 0 ? `${moneyLabel(budget.unlinked)} permanece sin vínculo a sitio.` : ""}`;
    } else if (budget.total > 0) {
      budgetValue = "Sin vínculo";
      budgetDetail = `${moneyLabel(budget.total)} está estructurado en acciones, pero todavía no está asociado a sitios.`;
    } else if (budget.docsWithAmounts.length) {
      budgetValue = "Por vincular";
      budgetDetail = `${budget.docsWithAmounts.length} expedientes mencionan montos referenciales/generales. No se suman entre sí hasta homologar acción, sitio y estado presupuestario.`;
    }
    return [
      card("Territorios con inventario identificado", String(identified), `${identified} de ${docs.length} expedientes tienen un universo territorial cuantificable sin sumar escalas incompatibles.`, "riesgos", "Ver territorios", "territories"),
      card("Con priorización territorial explícita", prioritized ? String(prioritized) : "Por homologar", prioritized ? `${prioritized} expedientes contienen una priorización territorial cuantificable; el detalle se conserva por GAD.` : "La prioridad debe mantenerse por sitio/GAD; no se fuerza una suma zonal o provincial sin homologación.", "riesgos", "Ver prioridades", "priorities", !prioritized),
      card("Acciones vinculadas a sitios", actionValue, actionDetail, "acciones", "Ver acciones", "actions", !actions.total),
      card("Presupuesto asignado a acciones", budgetValue, budgetDetail, "acciones", "Ver presupuesto", "budget", !(budget.linked > 0))
    ].join("");
  }

  function updateQuestion(content) {
    const lead = content.querySelector(".v1-ref-risk-lead");
    if (!lead) return;
    const eyebrow = lead.querySelector(".v1-eyebrow");
    const title = lead.querySelector("h3");
    const detail = lead.querySelector("p");
    if (eyebrow) eyebrow.textContent = "Lectura para decisión";
    if (title) title.textContent = "¿Qué territorios están priorizados, qué acciones los atienden y con qué presupuesto?";
    if (detail) detail.textContent = "Territorio → prioridad → acción → presupuesto → seguimiento.";
  }

  function apply() {
    scheduled = false;
    if (!isDesktop() || currentRoute() !== "inicio") return;
    const content = document.querySelector("#content.v1-baseline-contract.v1-operational-home");
    const cards = content?.querySelector(".v1-ref-cards");
    if (!content || !cards) return;

    const { province, canton } = currentFilters();
    const docs = canton ? [masterRow(province, canton)].filter(Boolean) : masterRows(province, "");
    const actionState = actionMetrics(province, canton, docs);
    const budgetState = budgetMetrics(actionState.actions, docs);
    const f07 = actionState.followups;
    const evidence = f07.filter(item => Boolean(item.evidenceUrl)).length;
    const signature = [VERSION, norm(province), cantonKey(canton), docs.map(doc => doc.n).join(","), actionState.total, actionState.linked, actionState.pending, budgetState.total, budgetState.linked, f07.length, evidence].join("|");
    if (content.dataset.decisionKpiSignature === signature && cards.querySelector('[data-decision-kpi="budget"]')) return;

    cards.innerHTML = canton
      ? cantonCards(province, canton, docs[0] || null, actionState, budgetState, f07)
      : aggregateCards(province, docs, actionState, budgetState);
    updateQuestion(content);

    const source = content.querySelector(".v1-ref-source-note");
    if (source) {
      source.innerHTML = `<b>Seguimiento secundario:</b> ${f07.length} registros F07 · ${evidence} evidencias accesibles · ${f07.filter(item => norm(item.actionLinkState) === "vinculada").length} acciones F07 homologadas. Los indicadores principales separan territorio, prioridad, acción y presupuesto para evitar que un cero técnico se interprete como ausencia de información.`;
    }

    content.dataset.decisionKpis = VERSION;
    content.dataset.decisionKpiSignature = signature;
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
    window.addEventListener("hashchange", () => setTimeout(schedule, 30));
    window.addEventListener("smartrisk:desktop-reference-ready", schedule);
    setTimeout(schedule, 0);
    setTimeout(schedule, 120);
    setTimeout(schedule, 450);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.SmartRiskDesktopDecisionKpis = { VERSION, apply, territoryInfo, actionCountFromDoc, documentAmounts, parseMoney };
})();