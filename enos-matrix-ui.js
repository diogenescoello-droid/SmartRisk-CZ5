(() => {
  "use strict";

  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, character => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[character]);
  const stateClass = value => ({ Atribuible: "success", Conciliar: "warn", Referencia: "neutral", "Sin detalle": "warn", "Sin registro": "danger", "No revisado": "neutral" })[value] || "neutral";
  const gapText = (form, status) => ({ Atribuible: `${form}: existe información atribuible; verificar completitud, vigencia y vínculos.`, Conciliar: `${form}: existen datos incompatibles; depurar duplicados y congelar el registro válido.`, Referencia: `${form}: existe una mención, pero faltan campos para confirmar identificación, alcance o vínculo.`, "Sin detalle": `${form}: el tema está mencionado, pero faltan campos técnicos mínimos.`, "Sin registro": `${form}: no se encontró respuesta atribuible; registrar en Kobo o justificar formalmente que no aplica.`, "No revisado": `${form}: falta revisar la fuente primaria y documentar el resultado.` })[status] || `${form}: revisar fuente primaria.`;
  function areasFor(gad) { const data = window.ENOS_MATRIX_PRELIMINARY; return Object.entries(data.areaTemplates).map(([area, template]) => ({ area, reviewer: data.reviewers[area], forms: template.forms, ideal: template.ideal, gap: template.forms.map(form => gapText(form, gad.statuses[form])).join(" "), proposedSolution: template.proposedSolution, priority: gad.priority, reviewStatus: area === "Análisis de riesgos" ? "Prellenado por Análisis" : "Pendiente de revisión", coordinationStatus: "Pendiente de coordinación" })); }
  function contextFor(gad) { const key = normalize(gad.gad.replace(/^(GAD Municipal de|Prefectura de|GAD Provincial de)\s+/i, "")); const review = (window.ENOS_REVIEWS?.reviews || []).find(item => normalize(item.territory) === key || normalize(gad.gad).includes(normalize(item.territory))); const plan = (window.SMART_RISK_PLAN_SOURCES?.plans || []).find(item => normalize(item.territory) === normalize(review?.territory || key)); const sites = (window.ENOS_RISK_LOCATIONS?.locations || []).filter(item => normalize(item.territory) === normalize(review?.territory || key)).map(item => item.name).filter(Boolean); return { source: review?.plan || "Plan legalizado y formularios F01–F07", planUrl: plan?.url || "", conclusion: "Pendiente de validación técnica territorial", namedSites: [...new Set(sites)].slice(0, 100) }; }

  function scopedGads() {
    const all = window.ENOS_MATRIX_PRELIMINARY?.gads || [];
    const scope = window.SmartRiskScope?.getState?.();
    if (!scope || scope.administrator) return all;
    const cantons = (scope.cantons || []).map(normalize);
    const provinces = (scope.provinces || []).map(normalize);
    return all.filter(item => cantons.some(name => normalize(item.gad).includes(name)) || provinces.some(name => normalize(item.gad).includes(name)));
  }

  function formCells(item) {
    return Object.entries(item.statuses).map(([form, status]) => `<td><span class="badge ${stateClass(status)}" title="${esc(window.ENOS_MATRIX_PRELIMINARY.forms[form])}">${esc(status)}</span></td>`).join("");
  }

  function areaCards(item) {
    return areasFor(item).map(area => `<article class="matrix-area-card">
      <header><div><span>${esc(area.area)}</span><b>${esc(area.reviewer)}</b></div><span class="badge ${area.priority === "CRÍTICO" ? "danger" : "warn"}">${esc(area.priority)}</span></header>
      <small>${esc(area.forms.join(" · "))} · ${esc(area.reviewStatus)}</small>
      <h5>Brecha preliminar</h5><p>${esc(area.gap)}</p>
      <h5>Cómo solventarla</h5><p>${esc(area.proposedSolution)}</p>
    </article>`).join("");
  }

  function openDetail(item) {
    const context = contextFor(item);
    const dialog = document.createElement("dialog");
    dialog.className = "matrix-dialog";
    const sites = context.namedSites.length ? `<ul>${context.namedSites.map(site => `<li>${esc(site)}</li>`).join("")}</ul>` : "<p>No se extrajeron nombres nominales; deben confirmarse directamente en el plan y formularios.</p>";
    const update = item.preliminaryUpdate ? `<section class="matrix-source-update"><h4>Actualización documental adicional</h4><p>${esc(item.preliminaryUpdate.finding)}</p><ul>${item.preliminaryUpdate.actions.map(action => `<li>${esc(action)}</li>`).join("")}</ul><p><b>Presupuesto reportado:</b> USD ${Number(item.preliminaryUpdate.reportedBudgetUsd).toLocaleString("es-EC")}</p><p><b>Campos por completar:</b> ${esc(item.preliminaryUpdate.pendingFields.join(", "))}.</p></section>` : "";
    dialog.innerHTML = `<div class="dialog-body matrix-detail"><div class="detail-heading"><div><span class="eyebrow">GAD ${String(item.number).padStart(3, "0")} · ${esc(item.validationState)}</span><h3>${esc(item.gad)}</h3><p>${esc(item.source)}</p></div><button class="icon-button close-matrix" type="button">×</button></div>
      <div class="review-notice"><b>Datos preliminares, no publicados como validados</b><span>${esc(window.ENOS_MATRIX_PRELIMINARY.validationRule)}</span></div>
      <section><h4>Sitios y coberturas identificados</h4>${sites}</section>${update}
      <div class="matrix-area-grid">${areaCards(item)}</div>
      <div class="dialog-actions">${context.planUrl ? `<a class="secondary button-link" href="${esc(context.planUrl)}" target="_blank" rel="noopener noreferrer">Abrir plan o fuente ↗</a>` : ""}<button class="secondary close-matrix" type="button">Cerrar</button></div></div>`;
    document.body.append(dialog);
    dialog.querySelectorAll(".close-matrix").forEach(button => button.addEventListener("click", () => { dialog.close(); dialog.remove(); }));
    dialog.addEventListener("cancel", () => dialog.remove());
    dialog.showModal();
  }

  function mount(container) {
    const data = window.ENOS_MATRIX_PRELIMINARY;
    if (!container || !data) return;
    const gads = scopedGads();
    container.insertAdjacentHTML("afterbegin", `<section class="panel matrix-control">
      <div class="matrix-heading"><div><span class="eyebrow">Matriz integral F01–F07 · corte ${esc(data.cutDate)}</span><h3>Control preliminar de ${gads.length} GAD</h3><p>Consolida el universo documental y prepara la validación por Análisis de riesgos, Fortalecimiento, Respuesta y Monitoreo.</p></div><span class="badge warn">No validado</span></div>
      <div class="matrix-kpis"><span><b>${gads.length}</b> GAD visibles</span><span><b>${gads.length * 7}</b> controles F01–F07</span><span><b>${gads.length * 4}</b> revisiones por área</span><span><b>0</b> aprobados para publicación</span></div>
      <div class="toolbar site-toolbar"><input id="matrixSearch" placeholder="Buscar GAD, fuente, sitio o conclusión…"><select id="matrixPriority"><option value="">Todas las prioridades</option><option>CRÍTICO</option><option>ALTO</option><option>MEDIO</option><option>BAJO</option></select><select id="matrixForm"><option value="">Cualquier formulario</option>${Object.entries(data.forms).map(([key, label]) => `<option value="${key}">${key} · ${esc(label)}</option>`).join("")}</select></div>
      <div id="matrixTable"></div><div id="matrixPager" class="decision-pager"></div>
      <details class="matrix-legend"><summary>Cómo leer los estados</summary><div>${[["Atribuible","Existe información identificable; falta confirmar completitud y vínculos."],["Referencia","Hay una mención útil, pero no basta para cerrar el formulario."],["Conciliar","Hay datos incompatibles o duplicados que deben depurarse."],["Sin detalle","El tema aparece, pero carece de los campos técnicos mínimos."],["Sin registro","No se localizó respuesta atribuible; registrar o justificar no aplica."],["No revisado","La fuente primaria aún debe revisarse."]].map(([status, description]) => `<p><span class="badge ${stateClass(status)}">${status}</span>${description}</p>`).join("")}</div></details>
    </section>`);
    let page = 1;
    const perPage = 10;
    const paint = () => {
      const query = normalize(document.querySelector("#matrixSearch")?.value);
      const priority = document.querySelector("#matrixPriority")?.value || "";
      const form = document.querySelector("#matrixForm")?.value || "";
      const filtered = gads.filter(item => (!query || normalize(`${item.gad} ${contextFor(item).source}`).includes(query)) && (!priority || item.priority === priority) && (!form || item.statuses[form]));
      const pages = Math.max(1, Math.ceil(filtered.length / perPage)); page = Math.min(page, pages);
      const visible = filtered.slice((page - 1) * perPage, page * perPage);
      document.querySelector("#matrixTable").innerHTML = `<div class="decision-list-summary"><b>${filtered.length} GAD en esta consulta</b><span>${filtered.length ? `Mostrando ${(page - 1) * perPage + 1}–${Math.min(page * perPage, filtered.length)}` : ""}</span></div><div class="table-scroll compact-table"><table class="matrix-table"><thead><tr><th>N.º / GAD</th>${Object.keys(data.forms).map(formKey => `<th title="${esc(data.forms[formKey])}">${formKey}</th>`).join("")}<th>AME</th><th>Prioridad</th><th></th></tr></thead><tbody>${visible.map(item => `<tr><td><b>${String(item.number).padStart(3, "0")} · ${esc(item.gad)}</b><small class="table-note">${esc(item.validationState)}</small></td>${formCells(item)}<td>${esc(item.ame)}</td><td><span class="badge ${item.priority === "CRÍTICO" ? "danger" : "warn"}">${esc(item.priority)}</span></td><td><button class="secondary matrix-detail-button" data-number="${item.number}">Ver brechas y solución</button></td></tr>`).join("")}</tbody></table></div>`;
      document.querySelector("#matrixPager").innerHTML = filtered.length > perPage ? `<button class="secondary" data-matrix-page="${page - 1}" ${page === 1 ? "disabled" : ""}>← Anterior</button><span>Página ${page} de ${pages}</span><button class="secondary" data-matrix-page="${page + 1}" ${page === pages ? "disabled" : ""}>Siguiente →</button>` : "";
    };
    ["matrixSearch", "matrixPriority", "matrixForm"].forEach(id => document.querySelector(`#${id}`)?.addEventListener("input", () => { page = 1; paint(); }));
    container.addEventListener("click", event => {
      const number = Number(event.target.closest(".matrix-detail-button")?.dataset.number);
      if (number) openDetail(gads.find(item => item.number === number));
      const next = Number(event.target.closest("[data-matrix-page]")?.dataset.matrixPage);
      if (next > 0) { page = next; paint(); document.querySelector(".matrix-control")?.scrollIntoView({ block: "start" }); }
    });
    paint();
  }

  function autoMount() { const content = document.querySelector("#content"); if (content && document.querySelector("#reviewTable") && !document.querySelector(".matrix-control")) mount(content); }
  new MutationObserver(autoMount).observe(document.documentElement, { childList: true, subtree: true });
  window.SmartRiskMatrix = { mount, scopedGads, areasFor, contextFor };
})();
