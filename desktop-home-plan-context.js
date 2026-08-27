(() => {
  "use strict";

  const VERSION = "2026.08.27.2";
  const VERIFIED_FALLBACKS = {
    "bolivar|caluma": {
      province: "Bolívar",
      territory: "Caluma",
      score: 88,
      pages: 26,
      status: "Revisión automática inicial · requiere validación técnica",
      plan: "Estructura del plan de accion cantonal provincial (1)-signed-signed-signed (1).pdf",
      model: "Modelo CZ5 adaptado",
      modelBasis: "El archivo corresponde a la estructura cantonal/provincial entregada y fue adaptado por el GAD."
    }
  };

  const CANTON_ALIASES = Object.freeze({
    "jujan": "alfredo baquerizo moreno",
    "general antonio elizalde": "general antonio elizalde bucay",
    "coronel marcelino mariduena": "marcelino mariduena",
    "san jacinto de yaguachi": "yaguachi",
    "san miguel": "san miguel de bolivar"
  });

  let scheduled = false;
  let observer = null;

  const norm = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);

  function isDesktop() {
    if (window.SmartRiskDeviceMode?.isSmart) return window.SmartRiskDeviceMode.isSmart() !== true;
    return document.documentElement.dataset.smartRiskDevice !== "smart";
  }

  function currentRoute() {
    const hash = String(location.hash || "").replace(/^#\/?/, "").split(/[?&]/)[0];
    return hash || String(window.SmartRiskV11App?.state?.route || "inicio");
  }

  function appState() { return window.SmartRiskV11App?.state || {}; }
  function entity(name) { return appState().data?.entities?.[name] || []; }
  function matrixRows() { return Array.isArray(window.ENOS_MATRIX_PRELIMINARY?.gads) ? window.ENOS_MATRIX_PRELIMINARY.gads : []; }

  function currentFilters() {
    const filters = appState().filters || {};
    return { province: filters.provincia || "", canton: filters.canton || "" };
  }

  function matchesScope(item, province, canton) {
    const itemProvince = item?.province ?? item?.provincia ?? item?.payload?.province ?? item?.payload?.provincia ?? "";
    const itemCanton = item?.territory ?? item?.canton ?? item?.payload?.territory ?? item?.payload?.canton ?? "";
    if (province && norm(itemProvince) !== norm(province)) return false;
    if (canton && norm(itemCanton) !== norm(canton)) return false;
    return true;
  }

  function provinceForRow(row) {
    const n = Number(row?.number);
    if (n === 1 || n === 4 || n === 5 || n === 56) return "Santa Elena";
    if (n === 2 || n === 3 || (n >= 6 && n <= 11)) return "Bolívar";
    if (n === 12 || (n >= 15 && n <= 17)) return "Galápagos";
    if (n === 13 || (n >= 18 && n <= 42)) return "Guayas";
    if (n === 14 || (n >= 43 && n <= 55)) return "Los Ríos";
    return "";
  }

  function cantonForRow(row) {
    const name = String(row?.gad || "");
    if (!/^GAD Municipal de /i.test(name)) return "";
    const raw = name.replace(/^GAD Municipal de /i, "").trim();
    const key = norm(raw);
    return CANTON_ALIASES[key] || key;
  }

  function matrixRowsForScope(province, canton) {
    const p = norm(province);
    const c = norm(canton);
    return matrixRows().filter(row => {
      if (p && norm(provinceForRow(row)) !== p) return false;
      if (c && cantonForRow(row) !== (CANTON_ALIASES[c] || c)) return false;
      return true;
    });
  }

  function matrixRowForCanton(province, canton) {
    return matrixRowsForScope(province, canton).find(row => Boolean(cantonForRow(row))) || null;
  }

  function statusOf(row, form) {
    return String(row?.statuses?.[form] || "Sin registro").trim();
  }

  function hasDocumentarySignal(status) {
    return Boolean(status) && norm(status) !== "sin registro";
  }

  function documentaryCoverage(row) {
    if (!row) return { count: 0, forms: [], actionStatus: "Sin registro", siteStatus: "Sin registro", f07Status: "Sin registro" };
    const forms = ["F01","F02","F03","F04","F05","F06"].filter(form => hasDocumentarySignal(statusOf(row, form)));
    return {
      count: forms.length,
      forms,
      actionStatus: statusOf(row, "F04"),
      siteStatus: statusOf(row, "F01"),
      f07Status: statusOf(row, "F07")
    };
  }

  function reviewList() {
    return Array.isArray(window.ENOS_REVIEWS?.reviews) ? window.ENOS_REVIEWS.reviews : [];
  }

  function fallbackReview(province, canton) {
    return VERIFIED_FALLBACKS[`${norm(province)}|${norm(canton)}`] || null;
  }

  function classifyModel(review) {
    if (!review) return { label: "Por determinar", detail: "El formato del Plan debe verificarse documentalmente antes de clasificarlo como modelo CZ5 o formato propio." };
    if (review.model) return { label: review.model, detail: review.modelBasis || "Clasificación documental verificada." };
    const name = norm(review.plan || review.source_plan || review.title || "");
    if (/estructura del plan de accion cantonal provincial|modelo.*plan|plantilla.*plan/.test(name)) {
      return { label: "Modelo CZ5 adaptado", detail: "El documento conserva la estructura del modelo entregado y fue adaptado por el territorio." };
    }
    return { label: "Por determinar", detail: "El plan fue recibido, pero su formato debe clasificarse documentalmente antes de etiquetarlo como propio o modelo CZ5." };
  }

  function planContext() {
    const { province, canton } = currentFilters();
    const reviews = reviewList().filter(item => matchesScope(item, province, canton));
    const plans = entity("plans").filter(item => matchesScope(item, province, canton));
    const followups = (Array.isArray(window.SMART_RISK_F07_CURRENT?.followups) ? window.SMART_RISK_F07_CURRENT.followups : [])
      .filter(item => matchesScope(item, province, canton));
    const scopedRows = matrixRowsForScope(province, canton);

    if (canton) {
      const row = matrixRowForCanton(province, canton);
      const coverage = documentaryCoverage(row);
      const review = reviews[0] || fallbackReview(province, canton);
      const planReceived = Boolean(review || plans.length);
      const model = classifyModel(review);
      return {
        level: "canton",
        planReceived,
        documentaryReference: !planReceived && coverage.count > 0,
        planCount: planReceived ? 1 : 0,
        model,
        score: Number.isFinite(Number(review?.score)) ? Number(review.score) : null,
        pages: Number.isFinite(Number(review?.pages)) ? Number(review.pages) : null,
        reviewStatus: review?.status || (row?.institutionalStatus ? `Estado documental: ${row.institutionalStatus}` : row?.validationState || "Revisión documental pendiente de consolidación"),
        f07Count: followups.length,
        f07MatrixStatus: coverage.f07Status,
        actionMatrixStatus: coverage.actionStatus,
        siteMatrixStatus: coverage.siteStatus,
        coverageForms: coverage.forms,
        matrixRow: row,
        province,
        canton
      };
    }

    const scores = reviews.map(item => Number(item.score)).filter(Number.isFinite);
    const rowsWithDocs = scopedRows.filter(row => documentaryCoverage(row).count > 0).length;
    const rowsWithF07Reference = scopedRows.filter(row => hasDocumentarySignal(statusOf(row, "F07"))).length;
    return {
      level: province ? "province" : "zone",
      planReceived: Boolean(reviews.length || plans.length),
      planCount: reviews.length || plans.length,
      gadCount: scopedRows.length,
      documentaryGadCount: rowsWithDocs,
      matrixF07GadCount: rowsWithF07Reference,
      model: null,
      score: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null,
      pages: null,
      reviewStatus: reviews.length ? `${reviews.length} planes con valoración documental` : `${rowsWithDocs} GAD con señales documentales en la matriz`,
      f07Count: followups.length,
      province,
      canton: ""
    };
  }

  function fact(label, value, detail, tone = "neutral") {
    return `<div class="v1-plan-fact ${tone}"><span>${esc(label)}</span><b>${esc(value)}</b><small>${esc(detail)}</small></div>`;
  }

  function buildContextPanel(ctx) {
    if (ctx.level === "canton") {
      const planValue = ctx.planReceived ? "Recibido" : (ctx.documentaryReference ? "Referencia documental" : "No estructurado");
      const planDetail = ctx.planReceived
        ? `${ctx.pages ? `${ctx.pages} páginas · ` : ""}${ctx.reviewStatus}`
        : ctx.documentaryReference
          ? `La matriz registra ${ctx.coverageForms.join(", ")} para este GAD. Esto demuestra contenido documental, pero no sustituye la verificación de la versión oficial del Plan.`
          : "No se localizó un Plan estructurado ni señales documentales suficientes en la base integrada.";
      const reviewValue = ctx.score !== null ? `${ctx.score}/100` : (ctx.matrixRow?.institutionalStatus || "Pendiente");
      const reviewDetail = ctx.score !== null ? "Valoración documental disponible" : "Sin puntuación consolidada para este expediente en la vista actual";
      const f07Value = ctx.f07Count ? `${ctx.f07Count} registros` : (hasDocumentarySignal(ctx.f07MatrixStatus) ? ctx.f07MatrixStatus : "Sin reporte");
      const f07Detail = ctx.f07Count
        ? "Seguimientos homologados/visibles del corte vigente"
        : hasDocumentarySignal(ctx.f07MatrixStatus)
          ? `La matriz registra F07 como “${ctx.f07MatrixStatus}”, pero no existe un seguimiento homologado visible en el corte actual.`
          : "No se identificó seguimiento F07 del cantón en el corte vigente";
      return `<section class="v1-plan-context" data-plan-context-version="${VERSION}">
        <div class="v1-plan-context-head"><div><span>Contexto documental</span><h3>${esc(ctx.canton)} · ${esc(ctx.province)}</h3></div><em>Antes de interpretar los indicadores</em></div>
        <div class="v1-plan-facts">
          ${fact("Plan ENOS", planValue, planDetail, ctx.planReceived ? "ok" : (ctx.documentaryReference ? "neutral" : "warn"))}
          ${fact("Formato del plan", ctx.model.label, ctx.model.detail, ctx.model.label.includes("CZ5") ? "ok" : "neutral")}
          ${fact("Revisión técnica", reviewValue, reviewDetail, ctx.score !== null ? "ok" : "neutral")}
          ${fact("Seguimiento F07", f07Value, f07Detail, ctx.f07Count ? "ok" : "warn")}
        </div>
      </section>`;
    }

    const scope = ctx.level === "province" ? ctx.province : "Zona 5";
    return `<section class="v1-plan-context compact" data-plan-context-version="${VERSION}">
      <div class="v1-plan-context-head"><div><span>Contexto documental</span><h3>${esc(scope)}</h3></div><em>Lectura agregada</em></div>
      <div class="v1-plan-facts aggregate">
        ${fact("GAD en el alcance", String(ctx.gadCount), "Universo institucional considerado en esta selección", "neutral")}
        ${fact("Con señales documentales", String(ctx.documentaryGadCount), "GAD con al menos un componente F01–F06 atribuible, referencial o por conciliar", ctx.documentaryGadCount ? "ok" : "warn")}
        ${fact("Seguimientos F07", String(ctx.f07Count), `${ctx.matrixF07GadCount} GAD tienen además alguna referencia F07 en la matriz`, ctx.f07Count ? "ok" : "warn")}
        ${fact("Revisión promedio", ctx.score !== null ? `${ctx.score}/100` : "Por consolidar", ctx.score !== null ? "Promedio de las valoraciones disponibles" : "Solo se calcula cuando existen valoraciones comparables", "neutral")}
      </div>
    </section>`;
  }

  function ensureContextPanel(content, ctx) {
    let panel = content.querySelector(".v1-plan-context");
    const scopePanel = content.querySelector(".v1-scope-panel");
    if (!scopePanel) return;
    const html = buildContextPanel(ctx);
    if (panel) {
      const holder = document.createElement("div");
      holder.innerHTML = html;
      panel.replaceWith(holder.firstElementChild);
      return;
    }
    scopePanel.insertAdjacentHTML("afterend", html);
  }

  function setCardState(card, value, detail, state) {
    if (!card) return;
    const strong = card.querySelector("strong");
    const small = card.querySelector("small");
    if (strong) strong.textContent = value;
    if (small) small.textContent = detail;
    card.dataset.dataState = state;
  }

  function explainNoData(content, ctx) {
    if (ctx.level !== "canton") return;
    const sites = content.querySelector('[data-exec-kpi="sites"]');
    const linked = content.querySelector('[data-exec-kpi="linked"]');
    const followups = content.querySelector('[data-exec-kpi="followups"]');
    const evidence = content.querySelector('[data-exec-kpi="evidence"]');
    const sitesValue = sites?.querySelector("strong")?.textContent.trim();
    const linkedValue = linked?.querySelector("strong")?.textContent.trim();
    const followupsValue = followups?.querySelector("strong")?.textContent.trim();
    const evidenceValue = evidence?.querySelector("strong")?.textContent.trim();

    if (sitesValue === "0") {
      if (hasDocumentarySignal(ctx.siteMatrixStatus)) {
        setCardState(sites, "Por homologar", `F01 figura como “${ctx.siteMatrixStatus}”. Existe referencia documental, pero no un sitio consolidado y homologado en SmartRisk.`, "pending");
      } else if (ctx.planReceived || ctx.documentaryReference) {
        setCardState(sites, "Pendiente", "Existe expediente documental, pero el inventario de sitios aún no está estructurado/homologado en SmartRisk.", "pending");
      } else {
        setCardState(sites, "Sin registro", "No existe un sitio estructurado ni una referencia F01 atribuible en la información integrada.", "missing");
      }
    }

    if (linkedValue === "0" && hasDocumentarySignal(ctx.actionMatrixStatus)) {
      setCardState(linked, "Por homologar", `F04 figura como “${ctx.actionMatrixStatus}”. Hay señal de acciones documentales, pero no acciones operativas homologadas/vinculadas.`, "pending");
    } else if (linkedValue === "0" && !ctx.f07Count) {
      setCardState(linked, "Sin vínculo", "No existen acciones operativas homologadas y enlazadas a F07 en el corte vigente.", "missing");
    }

    if (followupsValue === "0" || followupsValue === "Sin reporte") {
      if (!ctx.f07Count && hasDocumentarySignal(ctx.f07MatrixStatus)) {
        setCardState(followups, "Por conciliar", `La matriz identifica F07 como “${ctx.f07MatrixStatus}”, pero el corte vigente no contiene un seguimiento homologado para este GAD.`, "pending");
      } else if (!ctx.f07Count) {
        setCardState(followups, "Sin reporte", "No se identificó envío F07 del cantón en el corte vigente.", "missing");
      }
    }

    if ((evidenceValue === "0" || evidenceValue === "Sin reporte") && !ctx.f07Count) {
      setCardState(evidence, hasDocumentarySignal(ctx.f07MatrixStatus) ? "Por verificar" : "Sin reporte", hasDocumentarySignal(ctx.f07MatrixStatus)
        ? "Existe referencia documental de seguimiento, pero no evidencia F07 homologada y accesible en el corte vigente."
        : "Sin seguimiento F07 no corresponde interpretar la ausencia de evidencias como cero.", hasDocumentarySignal(ctx.f07MatrixStatus) ? "pending" : "missing");
    }

    const source = content.querySelector(".v1-ref-source-note");
    if (source) {
      const fragments = [];
      if (ctx.planReceived) fragments.push("Plan ENOS recibido/visible");
      else if (ctx.documentaryReference) fragments.push("contenido documental identificado en matriz");
      else fragments.push("sin Plan estructurado confirmado");
      fragments.push(ctx.f07Count ? `${ctx.f07Count} seguimientos F07 visibles` : (hasDocumentarySignal(ctx.f07MatrixStatus) ? `F07 ${ctx.f07MatrixStatus.toLowerCase()} pendiente de homologación` : "sin F07 en el corte vigente"));
      source.innerHTML = `<b>Interpretación:</b> ${esc(ctx.canton)} presenta ${esc(fragments.join(" · "))}. Los estados “pendiente”, “por homologar” o “sin reporte” describen la cobertura de información; no significan ausencia de riesgo, acciones o gestión territorial.`;
    }
  }

  function mappingAudit() {
    return matrixRows().map(row => ({
      number: Number(row.number),
      gad: row.gad,
      province: provinceForRow(row),
      canton: cantonForRow(row),
      mapped: Boolean(provinceForRow(row) && (cantonForRow(row) || /Prefectura|Consejo de Gobierno/i.test(row.gad || "")))
    }));
  }

  function apply() {
    scheduled = false;
    if (!isDesktop() || currentRoute() !== "inicio") return;
    const content = document.querySelector("#content.v1-baseline-contract.v1-operational-home");
    if (!content || !content.querySelector(".v1-ref-cards")) return;
    const ctx = planContext();
    const signature = [VERSION, ctx.level, norm(ctx.province), norm(ctx.canton), ctx.planCount, ctx.score, ctx.f07Count, ctx.model?.label || "", ctx.siteMatrixStatus || "", ctx.actionMatrixStatus || "", ctx.f07MatrixStatus || ""].join("|");
    if (content.dataset.planContextSignature === signature && content.querySelector(`.v1-plan-context[data-plan-context-version="${VERSION}"]`)) return;
    ensureContextPanel(content, ctx);
    explainNoData(content, ctx);
    content.dataset.planContextSignature = signature;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  function start() {
    if (observer) return;
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree:true });
    window.addEventListener("hashchange", () => setTimeout(schedule, 30));
    window.addEventListener("smartrisk:desktop-reference-ready", schedule);
    setTimeout(schedule, 0);
    setTimeout(schedule, 160);
    setTimeout(schedule, 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();

  window.SmartRiskDesktopPlanContext = { VERSION, apply, planContext, mappingAudit, matrixRowsForScope };
})();