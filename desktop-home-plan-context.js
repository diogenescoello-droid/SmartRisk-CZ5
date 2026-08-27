(() => {
  "use strict";

  const VERSION = "2026.08.27.1";
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

  function reviewList() {
    return Array.isArray(window.ENOS_REVIEWS?.reviews) ? window.ENOS_REVIEWS.reviews : [];
  }

  function fallbackReview(province, canton) {
    return VERIFIED_FALLBACKS[`${norm(province)}|${norm(canton)}`] || null;
  }

  function classifyModel(review) {
    if (!review) return { label: "Por determinar", detail: "No hay evidencia suficiente para clasificar el formato del plan." };
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

    if (canton) {
      const review = reviews[0] || fallbackReview(province, canton);
      const planReceived = Boolean(review || plans.length);
      const model = classifyModel(review);
      return {
        level: "canton",
        planReceived,
        planCount: planReceived ? 1 : 0,
        model,
        score: Number.isFinite(Number(review?.score)) ? Number(review.score) : null,
        pages: Number.isFinite(Number(review?.pages)) ? Number(review.pages) : null,
        reviewStatus: review?.status || (planReceived ? "Plan visible · revisión detallada pendiente de consolidación" : "Sin plan visible en la base estructurada"),
        f07Count: followups.length,
        province,
        canton
      };
    }

    const scores = reviews.map(item => Number(item.score)).filter(Number.isFinite);
    return {
      level: province ? "province" : "zone",
      planReceived: Boolean(reviews.length || plans.length),
      planCount: reviews.length || plans.length,
      model: null,
      score: scores.length ? Math.round(scores.reduce((sum, value) => sum + value, 0) / scores.length) : null,
      pages: null,
      reviewStatus: reviews.length ? `${reviews.length} planes con valoración documental` : `${plans.length} planes visibles en el alcance`,
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
      const planValue = ctx.planReceived ? "Recibido" : "No visible";
      const planDetail = ctx.planReceived
        ? `${ctx.pages ? `${ctx.pages} páginas · ` : ""}${ctx.reviewStatus}`
        : "No se localizó un plan estructurado para este cantón en la vista actual.";
      const reviewValue = ctx.score !== null ? `${ctx.score}/100` : "Pendiente";
      const reviewDetail = ctx.score !== null ? "Valoración documental disponible" : "Sin valoración consolidada en esta vista";
      const f07Value = ctx.f07Count ? `${ctx.f07Count} registros` : "Sin reporte";
      const f07Detail = ctx.f07Count ? "Seguimientos del corte vigente" : "No se identificó seguimiento F07 del cantón en el corte vigente";
      return `<section class="v1-plan-context" data-plan-context-version="${VERSION}">
        <div class="v1-plan-context-head"><div><span>Contexto documental</span><h3>${esc(ctx.canton)} · ${esc(ctx.province)}</h3></div><em>Antes de interpretar los indicadores</em></div>
        <div class="v1-plan-facts">
          ${fact("Plan ENOS", planValue, planDetail, ctx.planReceived ? "ok" : "warn")}
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
        ${fact("Planes visibles", String(ctx.planCount), ctx.reviewStatus, ctx.planCount ? "ok" : "warn")}
        ${fact("Revisión promedio", ctx.score !== null ? `${ctx.score}/100` : "Pendiente", ctx.score !== null ? "Promedio de las valoraciones disponibles" : "Sin valoraciones consolidadas para este alcance", "neutral")}
        ${fact("Seguimientos F07", String(ctx.f07Count), "Registros dentro del alcance territorial seleccionado", ctx.f07Count ? "ok" : "warn")}
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
    const sites = content.querySelector('[data-exec-kpi="sites"]');
    const linked = content.querySelector('[data-exec-kpi="linked"]');
    const followups = content.querySelector('[data-exec-kpi="followups"]');
    const evidence = content.querySelector('[data-exec-kpi="evidence"]');

    if (ctx.level !== "canton") return;

    if (sites?.querySelector("strong")?.textContent.trim() === "0") {
      setCardState(
        sites,
        ctx.planReceived ? "Pendiente" : "Sin dato",
        ctx.planReceived
          ? "El Plan ENOS existe, pero el inventario de sitios aún no está estructurado/homologado en SmartRisk."
          : "No hay inventario estructurado de sitios para este territorio.",
        ctx.planReceived ? "pending" : "missing"
      );
    }

    if (!ctx.f07Count) {
      setCardState(linked, "Sin F07", "No existe seguimiento F07 del cantón para vincular sitio y acción en el corte vigente.", "missing");
      setCardState(followups, "Sin reporte", "No se identificó envío F07 del cantón en el corte vigente.", "missing");
      setCardState(evidence, "Sin reporte", "Sin seguimiento F07 no corresponde interpretar la ausencia de evidencias como cero.", "missing");

      const source = content.querySelector(".v1-ref-source-note");
      if (source) source.innerHTML = `<b>Interpretación:</b> ${esc(ctx.canton)} tiene ${ctx.planReceived ? "Plan ENOS recibido" : "plan pendiente de confirmar"}, pero no registra seguimiento F07 en el corte vigente. Los estados anteriores indican ausencia de dato operativo estructurado, no ausencia de riesgo o de acciones en territorio.`;
    }
  }

  function apply() {
    scheduled = false;
    if (!isDesktop() || currentRoute() !== "inicio") return;
    const content = document.querySelector("#content.v1-baseline-contract.v1-operational-home");
    if (!content || !content.querySelector(".v1-ref-cards")) return;
    const ctx = planContext();
    const signature = [VERSION, ctx.level, norm(ctx.province), norm(ctx.canton), ctx.planCount, ctx.score, ctx.f07Count, ctx.model?.label || ""].join("|");
    if (content.dataset.planContextSignature === signature && content.querySelector('.v1-plan-context[data-plan-context-version="2026.08.27.1"]')) return;
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
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("hashchange", () => setTimeout(schedule, 30));
    window.addEventListener("smartrisk:desktop-reference-ready", schedule);
    setTimeout(schedule, 0);
    setTimeout(schedule, 160);
    setTimeout(schedule, 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.SmartRiskDesktopPlanContext = { VERSION, apply, planContext };
})();