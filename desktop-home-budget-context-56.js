(() => {
  "use strict";

  const VERSION = "2026.08.27.1";
  const TOTAL_EXPEDIENTES = 56;

  // Montos recuperados de la matriz maestra V4 y, cuando se indica, verificados directamente
  // en la fuente rectora. Ningún monto de esta tabla se interpreta automáticamente como ejecutado.
  const VERIFIED_BUDGETS = Object.freeze({
    2: {
      amount: 3555000,
      type: "referencial",
      label: "Referencial",
      note: "11 actividades documentadas por la Prefectura de Bolívar; falta homologar punto–acción–presupuesto–avance–evidencia.",
      basis: "Matriz maestra V4 / Plan legalizado"
    },
    3: {
      amount: 103115,
      type: "referencial",
      label: "Referencial",
      note: "Caluma: suma de cuatro acciones con monto explícito en la matriz de Prevención y Mitigación (USD 32.400 + 44.400 + 11.315 + 15.000). Existen otras acciones con recursos institucionales o monto no cuantificado.",
      basis: "Plan ENOS Caluma · fuente rectora verificada"
    },
    13: {
      amount: 54307566.35,
      type: "proyectado",
      label: "Proyectado",
      note: "Prefectura del Guayas: monto proyectado en anexo del Plan. Debe separarse de asignado, certificado y ejecutado.",
      basis: "Matriz maestra V4 / Plan oficial firmado"
    },
    20: {
      amount: 12900,
      type: "referencial",
      label: "Referencial",
      note: "Balzar: monto referencial; falta conciliarlo con acciones codificadas, certificación y evidencia.",
      basis: "Matriz maestra V4 / Plan consolidado"
    },
    21: {
      amount: 68000,
      type: "referencial",
      label: "Referencial",
      note: "Colimes: presupuesto referencial; no equivale a ejecución ni certificación presupuestaria.",
      basis: "Matriz maestra V4 / Plan firmado"
    },
    24: {
      amount: 125000,
      type: "declarado_agregado",
      label: "Declarado agregado",
      note: "Durán: USD 125.000 agregados sin desglose por acción o sitio. Debe desagregarse por fuente, acción, territorio y estado presupuestario.",
      basis: "Matriz maestra V4 / expediente Durán"
    },
    29: {
      amount: 99642.72,
      type: "referencial_separado",
      label: "Referencial · dos componentes",
      note: "Isidro Ayora: USD 10.400 preventivos + USD 89.242,72 de respuesta. Se conserva la separación conceptual; la suma solo expresa monto documental identificado.",
      basis: "Matriz maestra V4 / Plan de Acción + Contingencia"
    },
    38: {
      amount: 200000,
      type: "referencial",
      label: "Referencial",
      note: "Salitre: USD 200.000 en 15 rubros referenciales. No constituye ejecución; requiere certificación y vínculo por acción/sitio.",
      basis: "Matriz maestra V4 / paquete firmado"
    },
    42: {
      amount: 128000,
      type: "referencial",
      label: "Referencial",
      note: "Simón Bolívar: aproximadamente USD 128.000 referenciales; deben vincularse a las ocho acciones, sitios y verificables.",
      basis: "Matriz maestra V4 / Plan firmado"
    },
    53: {
      amount: 329400,
      type: "referencial",
      label: "Referencial",
      note: "Valencia: ocho rubros por USD 329.400 referenciales; requieren estudios, APU, certificación y contratación antes de considerarlos ejecutables/ejecutados.",
      basis: "Matriz maestra V4 / Plan versión 6-jul"
    }
  });

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

  function moneyLabel(value) {
    if (!(value > 0)) return "Sin monto cuantificado";
    return `USD ${new Intl.NumberFormat("es-EC", { minimumFractionDigits: 0, maximumFractionDigits: 2 }).format(value)}`;
  }

  function hasSiteLink(item) {
    const source = { ...(item || {}), ...(item?.payload || {}) };
    const keys = ["siteReference","siteId","sitioId","criticalSiteId","criticalSiteReference","sectorId","puntoCriticoId","puntoId","ubicacionId","territorialSiteId"];
    return keys.some(key => String(source[key] || "").trim() && !/^(no[_\s-]*encontrad|sin[_\s-]*sitio|ningun|n\/a|null|undefined)/i.test(String(source[key] || "").trim()));
  }

  function actionMoney(item) {
    const source = { ...(item || {}), ...(item?.payload || {}) };
    const preferred = [
      "presupuestoAsignado","presupuesto_asignado","montoAsignado","monto_asignado","presupuestoAccion","presupuesto_accion",
      "presupuesto","monto","costo","costoEstimado","costo_estimado","inversion","inversión","financiamiento","budget","amount"
    ];
    for (const key of preferred) {
      if (source[key] === undefined || source[key] === null || String(source[key]).trim() === "") continue;
      const value = parseMoney(source[key]);
      if (value > 0) return value;
    }
    for (const [key, value] of Object.entries(source)) {
      if (!/(presupuesto|monto|costo|inversion|inversión|financiamiento|budget)/i.test(key)) continue;
      const parsed = parseMoney(value);
      if (parsed > 0) return parsed;
    }
    return 0;
  }

  function inferredBudgetFromDoc(doc) {
    const verified = VERIFIED_BUDGETS[Number(doc?.n)];
    if (verified) return { ...verified, n: Number(doc.n), verified: true };

    const text = [doc?.universe, doc?.trace, doc?.next].filter(Boolean).join(" · ");
    const values = [];
    for (const match of text.matchAll(/(?:USD|US\$|\$)\s*([0-9][0-9.,]*)/gi)) {
      const value = parseMoney(match[1]);
      if (value > 0 && !values.some(existing => Math.abs(existing - value) < 0.005)) values.push(value);
    }
    if (!values.length) {
      return {
        n: Number(doc?.n), amount: null, type: "no_cuantificado", label: "Sin monto cuantificado",
        note: "No se encontró un monto monetario defendible en las fuentes actualmente integradas. Esto no equivale a USD 0.",
        basis: doc?.source || "Fuente rectora del expediente", verified: false
      };
    }

    const amount = values.reduce((sum, value) => sum + value, 0);
    const lower = norm(text);
    let type = "documentado";
    let label = "Documentado";
    if (/referencial|aprox|estimad/.test(lower)) { type = "referencial"; label = "Referencial"; }
    else if (/proyectad/.test(lower)) { type = "proyectado"; label = "Proyectado"; }
    else if (/certificad/.test(lower)) { type = "certificado"; label = "Certificado"; }
    else if (/ejecutad/.test(lower)) { type = "ejecutado_declarado"; label = "Ejecutado declarado"; }
    else if (/asignad/.test(lower)) { type = "asignado"; label = "Asignado"; }
    return {
      n: Number(doc?.n), amount, type, label,
      note: "Monto detectado en el contexto documental integrado; requiere conservar su vínculo con acción, sitio y estado presupuestario.",
      basis: doc?.source || "Fuente rectora del expediente", verified: false
    };
  }

  function docsForScope(province, canton) {
    if (canton) return [master()?.find?.(province, canton)].filter(Boolean);
    return master()?.scope?.(province, "") || [];
  }

  function structuredBudget(province, canton) {
    let total = 0;
    let linked = 0;
    let actionsWithBudget = 0;
    let linkedActionsWithBudget = 0;
    entity("actions").filter(item => matchesScope(item, province, canton)).forEach(action => {
      const value = actionMoney(action);
      if (!(value > 0)) return;
      total += value;
      actionsWithBudget += 1;
      if (hasSiteLink(action)) {
        linked += value;
        linkedActionsWithBudget += 1;
      }
    });
    return { total, linked, unlinked: Math.max(0, total - linked), actionsWithBudget, linkedActionsWithBudget };
  }

  function summarizeDocs(docs) {
    const records = docs.map(inferredBudgetFromDoc);
    const quantified = records.filter(record => record.amount > 0);
    const amount = quantified.reduce((sum, record) => sum + record.amount, 0);
    const byType = quantified.reduce((acc, record) => {
      acc[record.label] = (acc[record.label] || 0) + 1;
      return acc;
    }, {});
    return { records, quantified, amount, byType };
  }

  function typeSummary(summary) {
    return Object.entries(summary.byType).map(([label, count]) => `${count} ${label.toLowerCase()}`).join(" · ");
  }

  function updateCard() {
    scheduled = false;
    if (!isDesktop() || currentRoute() !== "inicio") return;
    const content = document.querySelector("#content.v1-baseline-contract.v1-operational-home");
    const card = content?.querySelector('[data-decision-kpi="budget"]');
    if (!content || !card) return;

    const { province, canton } = currentFilters();
    const docs = docsForScope(province, canton);
    const documentary = summarizeDocs(docs);
    const structured = structuredBudget(province, canton);
    const signature = [VERSION, norm(province), cantonKey(canton), docs.map(doc => doc.n).join(","), documentary.amount, documentary.quantified.length, structured.total, structured.linked].join("|");
    if (card.dataset.budgetContextSignature === signature) return;

    const label = card.querySelector("span");
    const value = card.querySelector("strong");
    const detail = card.querySelector("small");
    const button = card.querySelector("button");
    if (!label || !value || !detail) return;

    if (canton && docs.length === 1) {
      const record = documentary.records[0];
      label.textContent = "Presupuesto documentado";
      if (record?.amount > 0) {
        value.textContent = moneyLabel(record.amount);
        const linkText = structured.linked > 0
          ? `${moneyLabel(structured.linked)} ya aparece en acciones con vínculo territorial.`
          : "Actualmente no existe un monto homologado simultáneamente con acción y sitio.";
        detail.textContent = `${record.label}. ${record.note} ${linkText}`;
      } else if (structured.total > 0) {
        value.textContent = moneyLabel(structured.total);
        detail.textContent = `${structured.actionsWithBudget} acciones tienen monto estructurado; ${structured.linkedActionsWithBudget} cuentan además con vínculo territorial. ${structured.unlinked > 0 ? `${moneyLabel(structured.unlinked)} permanece sin sitio vinculado.` : ""}`;
      } else {
        value.textContent = "Sin monto cuantificado";
        detail.textContent = "No se encontró un monto monetario defendible en las fuentes actualmente integradas para este GAD. No equivale a USD 0 y no impide que existan acciones documentales.";
      }
    } else {
      label.textContent = "Presupuesto documentado en el alcance";
      if (documentary.amount > 0) {
        value.textContent = moneyLabel(documentary.amount);
        const types = typeSummary(documentary);
        detail.textContent = `${documentary.quantified.length} de ${docs.length} expedientes tienen monto cuantificado${types ? ` · ${types}` : ""}. La suma conserva montos con estados distintos y NO representa presupuesto ejecutado consolidado.${structured.linked > 0 ? ` Monto ya vinculado en acciones/sitios estructurados: ${moneyLabel(structured.linked)}.` : ""}`;
      } else if (structured.total > 0) {
        value.textContent = moneyLabel(structured.total);
        detail.textContent = `${structured.actionsWithBudget} acciones con monto estructurado en el alcance; ${structured.linkedActionsWithBudget} tienen vínculo territorial. No se agrega una segunda capa documental para evitar duplicidades.`;
      } else {
        value.textContent = "Sin monto cuantificado";
        detail.textContent = `${docs.length} expedientes en el alcance; ninguno tiene todavía un monto monetario defendible integrado. Esto no debe interpretarse como USD 0.`;
      }
    }

    if (button) {
      button.textContent = "Ver presupuesto →";
      button.dataset.v1Route = "acciones";
    }
    card.classList.toggle("is-textual", !(documentary.amount > 0 || structured.total > 0));
    card.dataset.budgetContextSignature = signature;
    content.dataset.budgetContext56 = VERSION;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(updateCard);
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

  window.SMART_RISK_GAD_BUDGET_CONTEXT = Object.freeze({
    version: VERSION,
    totalExpedientes: TOTAL_EXPEDIENTES,
    quantifiedFromMasterAndVerifiedSources: Object.keys(VERIFIED_BUDGETS).length,
    verifiedBudgets: VERIFIED_BUDGETS,
    forDoc: inferredBudgetFromDoc,
    summarize: summarizeDocs,
    apply: updateCard
  });
})();