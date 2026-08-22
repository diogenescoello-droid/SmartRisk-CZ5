(() => {
  "use strict";
  function afterAppStart() {
    const state = window.SmartRiskV11App?.state;
    const matrix = window.ENOS_MATRIX_PRELIMINARY;
    if (!state?.data?.entities || !matrix || state.data.__matrix56Loaded) return;
    const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
    const reviews = window.ENOS_REVIEWS?.reviews || [];
    const strip = value => normalize(value).replace(/^(gad municipal de|consejo de gobierno de|gobierno provincial de(?:l)?|prefectura de(?:l)?|gad provincial de|municipio de)\s+/, "").replace(/\s*\(cgreg\)\s*$/, "").trim();
    const records = [];
    matrix.gads.forEach(gad => {
      const key = strip(gad.gad);
      const review = reviews.find(item => strip(item.territory) === key || key.includes(strip(item.territory)) || strip(item.territory).includes(key) || (key === "galapagos" && normalize(item.province) === "galapagos" && normalize(item.territory).includes("provincial")));
      const provincia = review?.province || "";
      const canton = review?.territory || gad.gad.replace(/^(GAD Municipal de|Prefectura de|GAD Provincial de)\s+/i, "");
      const context = window.SmartRiskMatrix.contextFor(gad);
      Object.entries(gad.statuses).forEach(([form, status]) => records.push({ id: `MATRIX-FORM-${gad.number}-${form}`, entityType: "validations", tipo: "Validación F01-F07", title: `${form} · ${matrix.forms[form]}`, detail: status, provincia, canton, estado: "Preliminar documental", prioridad: gad.priority, payload: { formulario: form, nombreFormulario: matrix.forms[form], estadoDocumental: status, fuente: context.source, url: context.planUrl, publishable: false, corte: matrix.cutDate, conclusion: context.conclusion } }));
      window.SmartRiskMatrix.areasFor(gad).forEach(area => records.push({ id: `MATRIX-GAP-${gad.number}-${normalize(area.area).replace(/\W+/g, "-")}`, entityType: "breaches", tipo: "Brecha de matriz preliminar", title: `${area.area} · brecha por validar`, detail: area.gap, provincia, canton, estado: area.reviewStatus, prioridad: area.priority, responsable: area.reviewer, payload: { area: area.area, formularios: area.forms, brecha: area.gap, estadoIdeal: area.ideal, proximoPaso: area.proposedSolution, responsable: area.reviewer, validacion: "Preliminar documental", coordinacion: area.coordinationStatus, publishable: false, fuente: context.source, url: context.planUrl } }));
    });
    for (const record of records) { (state.data.entities[record.entityType] ||= []).push(record); state.data.records?.push(record); }
    state.data.__matrix56Loaded = true;
  }
  window.SmartRiskMatrixV11 = { afterAppStart };
})();
