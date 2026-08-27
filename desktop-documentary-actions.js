(() => {
  "use strict";

  const VERSION = "2026.08.27.1";
  const ACTIONS = Object.freeze([
    {
      id: "DOC-CALUMA-F04-001",
      entityId: "TER-BOLIVAR-CALUMA",
      province: "Bolívar",
      canton: "Caluma",
      title: "Mantenimiento y verificación de maquinaria, equipos y recursos para atención de emergencias",
      sector: "Cantón Caluma",
      responsible: "Obras Públicas, Administrativa, UGR",
      deadline: "Antes y durante época lluviosa",
      declaredState: "Por ejecutar",
      budgetLabel: "Recursos institucionales",
      budgetUsd: null,
      verification: "Inventarios, informes técnicos",
      source: "Plan ENOS 2026–2027 GAD Municipal de Caluma · Fase 6.3 Prevención y Mitigación",
      sourcePage: 13,
      homologationState: "Pendiente de homologación",
      f07LinkState: "Sin vínculo F07"
    },
    {
      id: "DOC-CALUMA-F04-002",
      entityId: "TER-BOLIVAR-CALUMA",
      province: "Bolívar",
      canton: "Caluma",
      title: "Limpieza, dragado y protección de ríos, quebradas y drenajes priorizados",
      sector: "Guamayacu, San Vicente, Charquiyacu, Hemisferio y otros sectores críticos",
      responsible: "Obras Públicas / Gobierno Provincial",
      deadline: "Jun 2026 – May 2027",
      declaredState: "Por ejecutar",
      budgetLabel: "USD 32.400 aprox.",
      budgetUsd: 32400,
      verification: "Informes técnicos, registros fotográficos",
      source: "Plan ENOS 2026–2027 GAD Municipal de Caluma · Fase 6.3 Prevención y Mitigación",
      sourcePage: 13,
      homologationState: "Pendiente de homologación",
      f07LinkState: "Sin vínculo F07"
    },
    {
      id: "DOC-CALUMA-F04-003",
      entityId: "TER-BOLIVAR-CALUMA",
      province: "Bolívar",
      canton: "Caluma",
      title: "Mantenimiento de drenajes urbanos y rurales (cunetas, alcantarillas, sumideros)",
      sector: "Sectores urbanos y rurales priorizados",
      responsible: "Obras Públicas / Gobierno Provincial",
      deadline: "Jun 2026 – May 2027",
      declaredState: "Por ejecutar",
      budgetLabel: "Según presupuesto",
      budgetUsd: null,
      verification: "Informes y evidencias fotográficas",
      source: "Plan ENOS 2026–2027 GAD Municipal de Caluma · Fase 6.3 Prevención y Mitigación",
      sourcePage: 13,
      homologationState: "Pendiente de homologación",
      f07LinkState: "Sin vínculo F07"
    },
    {
      id: "DOC-CALUMA-F04-004",
      entityId: "TER-BOLIVAR-CALUMA",
      province: "Bolívar",
      canton: "Caluma",
      title: "Obras de drenaje y reducción de escorrentía (alcantarillas y obras menores)",
      sector: "Sectores críticos del cantón",
      responsible: "Obras Públicas / Gobierno Provincial",
      deadline: "Jul – Dic 2026",
      declaredState: "Por ejecutar",
      budgetLabel: "USD 44.400 aprox.",
      budgetUsd: 44400,
      verification: "Planillas, actas e informes",
      source: "Plan ENOS 2026–2027 GAD Municipal de Caluma · Fase 6.3 Prevención y Mitigación",
      sourcePage: 13,
      homologationState: "Pendiente de homologación",
      f07LinkState: "Sin vínculo F07"
    },
    {
      id: "DOC-CALUMA-F04-005",
      entityId: "TER-BOLIVAR-CALUMA",
      province: "Bolívar",
      canton: "Caluma",
      title: "Protección y continuidad del sistema de agua potable y saneamiento",
      sector: "Estero El Pescado, Pasagua, Pita, Charquiyacu, Yatuví",
      responsible: "Unidad de Agua Potable",
      deadline: "Jun 2026 – May 2027",
      declaredState: "Por ejecutar",
      budgetLabel: "USD 11.315 aprox.",
      budgetUsd: 11315,
      verification: "Órdenes de compra, informes técnicos",
      source: "Plan ENOS 2026–2027 GAD Municipal de Caluma · Fase 6.3 Prevención y Mitigación",
      sourcePage: 13,
      homologationState: "Pendiente de homologación",
      f07LinkState: "Sin vínculo F07"
    },
    {
      id: "DOC-CALUMA-F04-006",
      entityId: "TER-BOLIVAR-CALUMA",
      province: "Bolívar",
      canton: "Caluma",
      title: "Hidrocleaner y mantenimiento de sistemas de saneamiento",
      sector: "El Corazón, Santa Rosa, Los Rosales, Nuevo Caluma Alto y otros",
      responsible: "Agua Potable / UGR",
      deadline: "Segundo semestre 2026",
      declaredState: "Por ejecutar",
      budgetLabel: "USD 15.000 aprox.",
      budgetUsd: 15000,
      verification: "Contrato, informes",
      source: "Plan ENOS 2026–2027 GAD Municipal de Caluma · Fase 6.3 Prevención y Mitigación",
      sourcePage: 13,
      homologationState: "Pendiente de homologación",
      f07LinkState: "Sin vínculo F07"
    },
    {
      id: "DOC-CALUMA-F04-007",
      entityId: "TER-BOLIVAR-CALUMA",
      province: "Bolívar",
      canton: "Caluma",
      title: "Gestión comunitaria del riesgo (alerta temprana, capacitación, mingas)",
      sector: "Comunidades del cantón",
      responsible: "UGR, Bomberos, líderes comunitarios",
      deadline: "Permanente",
      declaredState: "Permanente",
      budgetLabel: "Institucional",
      budgetUsd: null,
      verification: "Actas, registros fotográficos",
      source: "Plan ENOS 2026–2027 GAD Municipal de Caluma · Fase 6.3 Prevención y Mitigación",
      sourcePage: 14,
      homologationState: "Pendiente de homologación",
      f07LinkState: "Sin vínculo F07"
    }
  ]);

  const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);

  function state() { return window.SmartRiskV11App?.state || {}; }
  function isDesktop() {
    if (window.SmartRiskDeviceMode?.isSmart) return window.SmartRiskDeviceMode.isSmart() !== true;
    return document.documentElement.dataset.smartRiskDevice !== "smart";
  }
  function route() { return String(location.hash || "").replace(/^#\/?/, "").split(/[?&]/)[0] || String(state().route || "inicio"); }
  function currentActions() {
    const f = state().filters || {};
    if (norm(f.provincia) !== "bolivar" || norm(f.canton) !== "caluma") return [];
    return ACTIONS.slice();
  }

  function patchHome() {
    const actions = currentActions();
    if (!actions.length) return;
    const content = document.querySelector("#content.v1-baseline-contract.v1-operational-home");
    const card = content?.querySelector('[data-exec-kpi="linked"]');
    if (!card) return;
    const linkedF07 = Array.isArray(window.SMART_RISK_F07_CURRENT?.followups)
      ? window.SMART_RISK_F07_CURRENT.followups.filter(item => norm(item.province) === "bolivar" && norm(item.canton) === "caluma" && item.actionLinkState === "Vinculada").length
      : 0;
    card.innerHTML = `<span>Acciones documentadas</span><strong>${actions.length}</strong><small>${linkedF07} homologadas/vinculadas en F07 · ${actions.length} pendientes de homologación</small><button data-v1-route="acciones">Ver acciones →</button>`;
    card.dataset.documentaryActions = VERSION;
  }

  function actionCard(action) {
    return `<article class="v1-doc-action-card">
      <header><div><span>${esc(action.id)}</span><h4>${esc(action.title)}</h4></div><b>${esc(action.homologationState)}</b></header>
      <dl>
        <div><dt>Sector / punto</dt><dd>${esc(action.sector)}</dd></div>
        <div><dt>Responsable</dt><dd>${esc(action.responsible)}</dd></div>
        <div><dt>Plazo</dt><dd>${esc(action.deadline)}</dd></div>
        <div><dt>Estado declarado</dt><dd>${esc(action.declaredState)}</dd></div>
        <div><dt>Presupuesto del plan</dt><dd>${esc(action.budgetLabel)}</dd></div>
        <div><dt>Verificación prevista</dt><dd>${esc(action.verification)}</dd></div>
      </dl>
      <footer><span>${esc(action.f07LinkState)}</span><small>${esc(action.source)} · pág. ${action.sourcePage}</small></footer>
    </article>`;
  }

  function patchActionsRoute() {
    const actions = currentActions();
    if (!actions.length || route() !== "acciones") return;
    const content = document.querySelector("#content");
    if (!content || content.querySelector('[data-documentary-actions="caluma"]')) return;
    const quantifiedBudget = actions.reduce((sum, item) => sum + (Number(item.budgetUsd) || 0), 0);
    const section = document.createElement("section");
    section.className = "v1-documentary-actions";
    section.dataset.documentaryActions = "caluma";
    section.innerHTML = `
      <header class="v1-doc-actions-head">
        <div><span>Plan ENOS · Caluma</span><h3>7 acciones documentales pendientes de homologación</h3><p>Estas acciones están expresamente consignadas en la fase 6.3 del Plan. No equivalen todavía a acciones operativas validadas ni tienen seguimiento F07 vinculado.</p></div>
        <div class="v1-doc-actions-summary"><b>USD ${quantifiedBudget.toLocaleString("es-EC")}</b><small>presupuesto referencial cuantificado en 4 acciones; existen además rubros institucionales o “según presupuesto”.</small></div>
      </header>
      <div class="v1-doc-actions-grid">${actions.map(actionCard).join("")}</div>`;
    content.prepend(section);
  }

  let scheduled = false;
  function apply() {
    scheduled = false;
    if (!isDesktop()) return;
    if (route() === "inicio") patchHome();
    if (route() === "acciones") patchActionsRoute();
  }
  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }
  function start() {
    new MutationObserver(schedule).observe(document.body, { childList:true, subtree:true });
    window.addEventListener("hashchange", () => setTimeout(schedule, 40));
    window.addEventListener("smartrisk:desktop-reference-ready", schedule);
    setTimeout(schedule, 0);
    setTimeout(schedule, 150);
    setTimeout(schedule, 500);
  }

  window.SMART_RISK_DOCUMENTARY_ACTIONS = ACTIONS;
  window.SmartRiskDocumentaryActions = { VERSION, actions: ACTIONS, currentActions, apply };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once:true });
  else start();
})();
