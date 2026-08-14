(() => {
  "use strict";

  const OFFICIAL = Object.freeze({
    "guayas|daule": Object.freeze({
      sites: 3,
      siteMentions: 21,
      actions: 11,
      followups: 2,
      homologatedFollowups: 0,
      pendingActions: 9,
      solvedGaps: 0,
      budget: "No cuantificado",
      cut: "Informe técnico conciliado ENOS 2026–2027"
    })
  });

  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  const selectedRecord = () => {
    const level = document.querySelector("#sr16Level")?.value;
    if (level !== "canton") return null;
    const province = normalize(document.querySelector("#sr16Province")?.value);
    const canton = normalize(document.querySelector("#sr16Canton")?.value);
    return OFFICIAL[`${province}|${canton}`] || null;
  };

  const setText = (selector, value) => {
    const element = document.querySelector(selector);
    if (element) element.textContent = value;
  };

  function render() {
    const record = selectedRecord();
    if (!record) return;

    setText("#sr16Sites", record.sites);
    setText("#sr16SitesDetail", `${record.sites} sitios priorizados · ${record.siteMentions} menciones documentales depuradas`);
    setText("#sr16Actions", record.actions);
    setText("#sr16ActionsDetail", `${record.actions} acciones del plan · ${record.followups} F07 preliminares · ${record.homologatedFollowups} homologados`);
    setText("#sr16Budget", record.budget);
    setText("#sr16Gaps", "100% / 0%");
    setText("#sr16GapsDetail", `${record.pendingActions} sin seguimiento · ${record.solvedGaps} solventadas`);
    setText("#sr16GapTitle", `${record.pendingActions} brechas activas · ${record.solvedGaps} solventadas`);
    setText("#sr16GapDetail", `${record.followups} F07 conservados como evidencia preliminar; aún no homologados a sitio y acción.`);

    const active = document.querySelector("#sr16GapActive");
    const solved = document.querySelector("#sr16GapSolved");
    if (active) active.style.width = "100%";
    if (solved) solved.style.width = "0%";

    const source = document.querySelector("#sr16Source");
    if (source) source.innerHTML = `<b>Origen:</b> ${record.cut}. ${record.sites} sitios prioritarios · ${record.actions} acciones · presupuesto ${record.budget.toLowerCase()} · ${record.followups} F07 preliminares sin homologar.`;
  }

  function afterAppStart() {
    const scope = document.querySelector("#sr16Scope");
    if (!scope) return;
    render();
    new MutationObserver(render).observe(scope, { childList: true, subtree: true, characterData: true });
    document.querySelector("#sr16Level")?.addEventListener("change", () => queueMicrotask(render));
    document.querySelector("#sr16Province")?.addEventListener("change", () => queueMicrotask(render));
    document.querySelector("#sr16Canton")?.addEventListener("change", () => queueMicrotask(render));
  }

  window.SmartRiskAuthoritativeMetrics = { afterAppStart, render, records: OFFICIAL };
})();
