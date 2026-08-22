(() => {
  "use strict";
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);

  function installCockpit() {
    const scope = document.querySelector("#sr16ScopeCard");
    if (!scope || document.querySelector("#srMatrixCockpit")) return;
    scope.insertAdjacentHTML("afterend", `<section id="srMatrixCockpit" class="sr-matrix-cockpit" aria-live="polite"></section>`);
    const level = document.querySelector("#sr16Level"), province = document.querySelector("#sr16Province"), canton = document.querySelector("#sr16Canton");
    const render = () => {
      const matrix = window.ENOS_MATRIX_PRELIMINARY;
      const selected = level?.value === "zona" ? matrix.gads : matrix.gads.filter(gad => {
        const context = window.SmartRiskMatrix.contextFor(gad);
        const review = (window.ENOS_REVIEWS?.reviews || []).find(item => normalize(item.plan) === normalize(context.source));
        return level?.value === "provincia" ? normalize(review?.province).includes(normalize(province?.value)) : normalize(gad.gad).includes(normalize(canton?.value));
      });
      const gad = selected[0], cockpit = document.querySelector("#srMatrixCockpit");
      if (!gad) { cockpit.innerHTML = `<div class="sr-matrix-empty"><b>Seleccione un GAD con matriz disponible</b><span>No existe una coincidencia preliminar para el alcance seleccionado.</span></div>`; return; }
      const context = window.SmartRiskMatrix.contextFor(gad), areas = window.SmartRiskMatrix.areasFor(gad);
      const statuses = Object.values(gad.statuses), attributable = statuses.filter(status => status === "Atribuible").length, gaps = statuses.length - attributable;
      const review = (window.ENOS_REVIEWS?.reviews || []).find(item => normalize(item.plan) === normalize(context.source));
      const actions = Number(review?.proposalCount || 0), scopeLabel = selected.length === 1 ? gad.gad : `${selected.length} GAD del alcance`;
      const statusTone = status => status === "Atribuible" ? "ok" : status === "Sin registro" ? "critical" : "pending";
      cockpit.innerHTML = `<div class="sr-matrix-title"><div><small>LECTURA EJECUTIVA · INFORMACIÓN PRELIMINAR</small><h2>${escapeHtml(scopeLabel)}</h2><p>¿Qué tiene este GAD, qué le falta y cuál es el siguiente paso para validarlo?</p></div><span>NO PUBLICABLE</span></div>
        <div class="sr-matrix-indicators"><article><small>Sitios o lugares identificados</small><b>${context.namedSites.length}</b><span>${context.namedSites.length ? "Revisar identidad y coordenadas" : "Confirmar directamente en el plan"}</span></article><article><small>Acciones propuestas</small><b>${actions}</b><span>${gad.statuses.F04 === "Atribuible" ? "Existen registros atribuibles" : `F04: ${escapeHtml(gad.statuses.F04)}`}</span></article><article><small>Formularios con brecha</small><b>${gaps}/7</b><span>${attributable} atribuibles; aún requieren validación</span></article><article><small>Listos para publicar</small><b>0</b><span>Requieren validación técnica y coordinación</span></article></div>
        <div class="sr-matrix-forms"><h3>Estado F01–F07</h3><div>${Object.entries(gad.statuses).map(([form,status]) => `<button class="${statusTone(status)}" data-matrix-open="dashboard" data-matrix-filter="revision"><b>${form}</b><span>${escapeHtml(matrix.forms[form])}</span><em>${escapeHtml(status)}</em></button>`).join("")}</div></div>
        <div class="sr-matrix-areas"><h3>Brechas y ruta de solución</h3><div>${areas.map(area => `<article><header><b>${escapeHtml(area.area)}</b><span>${escapeHtml(area.reviewer)}</span></header><p><strong>Brecha:</strong> ${escapeHtml(area.gap)}</p><p><strong>Siguiente paso:</strong> ${escapeHtml(area.proposedSolution)}</p></article>`).join("")}</div></div>
        <div class="sr-matrix-actions"><button data-matrix-open="riesgos" data-matrix-filter="sitios">Ver sitios y coordenadas</button><button data-matrix-open="acciones" data-matrix-filter="todas">Revisar acciones</button><button data-matrix-open="dashboard" data-matrix-filter="brechas">Solventar brechas</button>${context.planUrl ? `<a href="${escapeHtml(context.planUrl)}" target="_blank" rel="noopener">Abrir plan original ↗</a>` : ""}</div>`;
    };
    document.querySelector("#srMatrixCockpit").addEventListener("click", event => { const button = event.target.closest("[data-matrix-open]"); if (button) window.SmartRiskV11ApprovedRC16?.openFull(button.dataset.matrixOpen, button.dataset.matrixFilter); });
    [level, province, canton].forEach(select => select?.addEventListener("change", () => setTimeout(render, 0)));
    render();
  }

  function afterAppStart() {
    const state = window.SmartRiskV11App?.state;
    const matrix = window.ENOS_MATRIX_PRELIMINARY;
    if (!state?.data?.entities || !matrix || state.data.__matrix56Loaded) return;
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
    installCockpit();
  }
  window.SmartRiskMatrixV11 = { afterAppStart };
})();
