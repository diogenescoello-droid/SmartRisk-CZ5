(() => {
  "use strict";

  const VERSION = "1.0.0-p1";
  const ACTION_TYPES = ["Prevención / mitigación", "Preparación", "Respuesta", "Recuperación", "Fortalecimiento"];
  const PRIORITIES = ["Crítica", "Alta", "Media", "Baja"];
  const ACTION_STATES = ["Planificada", "En ejecución", "Detenida", "Completada"];
  const FINANCING = ["Presupuesto institucional", "Convenio / transferencia", "Crédito o préstamo", "En gestión o solicitado", "Otra fuente"];
  const REVIEW_STATES = ["Borrador", "Enviado a revisión", "Observado", "Corregido", "Validado"];
  const runtime = { observer: null, scheduled: false, bound: false, view: "lista", busy: false };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const app = () => window.SmartRiskV11App;
  const state = () => app()?.state || {};
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const slug = value => norm(value).replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").toUpperCase() || "GENERAL";
  const today = () => new Date().toISOString().slice(0, 10);
  const nowIso = () => new Date().toISOString();
  const formatDate = value => {
    if (!value) return "Sin fecha";
    const date = new Date(`${String(value).slice(0, 10)}T12:00:00`);
    return Number.isNaN(date.getTime()) ? String(value) : date.toLocaleDateString("es-EC", { day: "2-digit", month: "short", year: "numeric" });
  };
  const number = value => Number.isFinite(Number(value)) ? Number(value) : 0;
  const checked = value => value ? "checked" : "";
  const selected = (value, current) => String(value) === String(current || "") ? "selected" : "";

  function visible(record) {
    const filters = state().filters || {};
    if (filters.provincia && norm(record.provincia) !== norm(filters.provincia)) return false;
    if (filters.canton && norm(record.canton) !== norm(filters.canton)) return false;
    if (filters.evento && !norm([record.evento, record.payload?.evento, record.payload?.amenaza].filter(Boolean).join(" ")).includes(norm(filters.evento))) return false;
    return true;
  }

  function entityRecords(type) {
    const entities = state().data?.entities || {};
    if (Array.isArray(entities[type])) return entities[type].filter(visible);
    return (state().data?.records || []).filter(record => record.entityType === type && visible(record));
  }

  function actions() { return entityRecords("actions"); }
  function followups() {
    const direct = entityRecords("followups");
    if (direct.length) return direct;
    return (state().data?.records || []).filter(record => /seguimiento|f07/.test(norm(record.tipo)) && visible(record));
  }

  function sites() {
    const rows = [...entityRecords("criticalSites"), ...entityRecords("risks")];
    const seen = new Set();
    return rows.filter(item => {
      const id = canonicalId(item);
      if (!id || seen.has(id)) return false;
      seen.add(id);
      return true;
    });
  }

  function institutions() {
    return [...new Set(entityRecords("institutions").map(item => item.title || item.institucion).filter(Boolean))].sort((a, b) => a.localeCompare(b, "es"));
  }

  function canonicalId(record) {
    return String(record?.payload?.id || record?.sourceId || record?.id || "").trim();
  }

  function reviewState(record) {
    return record?.payload?.revisionEstado || record?.revisionEstado || "Borrador";
  }

  function actionPayload(record) {
    return record?.payload ? { ...record.payload } : {};
  }

  function actionTitle(record) {
    return record?.title || record?.payload?.accion || record?.payload?.actividad || record?.sourceId || "Acción sin título";
  }

  function scopeKey(record) {
    if (record?.scopeKey) return record.scopeKey;
    const keys = window.SmartRiskScope?.scopeKeys?.() || [];
    if (!window.SmartRiskScope?.isAdministrator?.()) return keys[0] || null;
    const canton = state().filters?.canton;
    const province = state().filters?.provincia;
    if (canton && province) {
      const candidate = keys.find(key => norm(key).includes(norm(canton).replace(/\s+/g, "-").toLowerCase()));
      if (candidate) return candidate;
      return `TER:${slug(province)}-${slug(canton)}`;
    }
    return keys[0] || "ZONA:CZ5";
  }

  function generalScopeId() {
    return `SCOPE:${scopeKey() || slug(state().profileContext?.scopeLabel || "CZ5")}`;
  }

  function newId(prefix) {
    const territory = slug(state().filters?.canton || state().profileContext?.scopeLabel || "CZ5").slice(0, 20);
    const token = globalThis.crypto?.randomUUID?.().split("-")[0].toUpperCase() || Math.random().toString(36).slice(2, 10).toUpperCase();
    return `${prefix}-${territory}-${today().replaceAll("-", "")}-${token}`;
  }

  function latestFollowup(actionId) {
    return followups()
      .filter(item => String(item.payload?.actionId || item.payload?.accionId || "") === String(actionId))
      .sort((a, b) => String(b.payload?.fechaReporte || b.updatedAt || b.createdAt || "").localeCompare(String(a.payload?.fechaReporte || a.updatedAt || a.createdAt || "")))[0] || null;
  }

  function effectiveProgress(record) {
    const followup = latestFollowup(canonicalId(record));
    return followup ? number(followup.payload?.avance) : number(record.avance ?? record.payload?.avance);
  }

  function effectiveState(record) {
    const followup = latestFollowup(canonicalId(record));
    return followup?.payload?.estadoAccion || record.estado || record.payload?.estado || "Planificada";
  }

  function isOverdue(record) {
    const deadline = record.payload?.fechaLimite || record.payload?.plazo;
    if (!deadline || /complet|cerrad|finaliz/.test(norm(effectiveState(record)))) return false;
    return String(deadline).slice(0, 10) < today();
  }

  function tone(value) {
    const text = norm(value);
    if (/critic|venc|observ|deten/.test(text)) return "danger";
    if (/alta|ejec|enviado|correg/.test(text)) return "warn";
    if (/complet|valid|cerrad/.test(text)) return "success";
    return "neutral";
  }

  function badge(value) { return `<span class="srp1-badge ${tone(value)}">${esc(value || "Sin definir")}</span>`; }

  function permission(name, entity = "acciones") {
    const fn = state().permissions?.[name];
    return typeof fn === "function" ? Boolean(fn(entity)) : false;
  }

  function optionList(values, current) {
    return values.map(value => `<option value="${esc(value)}" ${selected(value, current)}>${esc(value)}</option>`).join("");
  }

  function siteOptions(current) {
    const rows = sites();
    const general = generalScopeId();
    const options = [`<option value="${esc(general)}" ${selected(general, current)}>Ámbito general del territorio</option>`];
    rows.forEach(item => options.push(`<option value="${esc(canonicalId(item))}" ${selected(canonicalId(item), current)}>${esc(item.title)} · ${esc([item.canton, item.provincia].filter(Boolean).join(" · ") || "sitio registrado")}</option>`));
    return options.join("");
  }

  function institutionOptions(current) {
    const rows = institutions();
    if (current && !rows.includes(current)) rows.unshift(current);
    return [`<option value="">Selecciona institución</option>`, ...rows.map(value => `<option value="${esc(value)}" ${selected(value, current)}>${esc(value)}</option>`)].join("");
  }

  function formData(form) {
    return Object.fromEntries(new FormData(form).entries());
  }

  function closeDialog(dialog) {
    try { dialog.close(); } catch (_) {}
    dialog.remove();
  }

  function setDialogError(dialog, message) {
    const node = $("[data-srp1-error]", dialog);
    if (node) node.textContent = message || "";
  }

  function renderStep(dialog, step) {
    const panels = $$('[data-srp1-step]', dialog);
    panels.forEach(panel => panel.hidden = Number(panel.dataset.srp1Step) !== step);
    const progress = $("[data-srp1-progress]", dialog);
    if (progress) progress.style.width = `${step * 20}%`;
    const label = $("[data-srp1-step-label]", dialog);
    if (label) label.textContent = `Paso ${step} de 5`;
    const previous = $("[data-srp1-prev]", dialog);
    const next = $("[data-srp1-next]", dialog);
    if (previous) previous.hidden = step === 1;
    if (next) next.hidden = step === 5;
    dialog.dataset.step = String(step);
  }

  function openActionDialog(record = null) {
    if (!permission(record ? "canEdit" : "canCreate")) return;
    const derived = Boolean(record?.normalizedFromPlan || record?.payload?.normalizedFromPlan);
    const editing = Boolean(record && !derived);
    const payload = derived ? {
      accion: actionTitle(record),
      responsable: record.responsable || "",
      institucion: record.institucion || "",
      estado: record.estado || "Planificada",
      avance: record.avance || 0,
      fechaLimite: record.payload?.fechaLimite || record.payload?.plazo || "",
      observaciones: `Formalizada desde ${record.sourcePlanTitle || record.payload?.sourcePlanTitle || "plan territorial"}.`,
      sourcePlanId: record.sourcePlanId || record.payload?.sourcePlanId || ""
    } : actionPayload(record);
    const dialog = document.createElement("dialog");
    dialog.className = "srp1-dialog";
    dialog.innerHTML = `<form method="dialog" data-srp1-form>
      <header class="srp1-dialog-head"><div><small>SmartRisk Operativo · ${derived ? "Formalizar" : editing ? "Editar" : "Nueva"} acción</small><h2>${derived ? "Convertir acción del plan en registro operativo" : editing ? "Actualizar acción" : "Programar una acción"}</h2></div><button type="button" data-srp1-close aria-label="Cerrar">×</button></header>
      <div class="srp1-stepbar"><span data-srp1-step-label>Paso 1 de 5</span><i><b data-srp1-progress style="width:20%"></b></i></div>
      <section data-srp1-step="1">
        <div class="srp1-section-title"><b>1. ¿Qué se va a hacer?</b><span>Describe la intervención y clasifícala.</span></div>
        <label class="wide">Acción concreta<textarea name="accion" required placeholder="Ej.: Limpieza y desazolve del canal principal">${esc(payload.accion || "")}</textarea></label>
        <label>Tipo de acción<select name="tipoAccion">${optionList(ACTION_TYPES, payload.tipoAccion || "Prevención / mitigación")}</select></label>
        <label>Prioridad<select name="prioridad">${optionList(PRIORITIES, payload.prioridad || record?.prioridad || "Alta")}</select></label>
        <label class="wide">Objetivo verificable<textarea name="objetivo" placeholder="Resultado que se espera alcanzar">${esc(payload.objetivo || "")}</textarea></label>
      </section>
      <section data-srp1-step="2" hidden>
        <div class="srp1-section-title"><b>2. ¿Dónde se ejecuta?</b><span>Selecciona un sitio existente o el ámbito general del territorio.</span></div>
        <label class="wide">Sitio / ámbito<select name="sitioId" required>${siteOptions(payload.sitioId || payload.ambitoId || "")}</select></label>
        <label class="wide">Detalle de ubicación<input name="ubicacionDetalle" value="${esc(payload.ubicacionDetalle || "")}" placeholder="Recinto, tramo, sector o referencia"></label>
      </section>
      <section data-srp1-step="3" hidden>
        <div class="srp1-section-title"><b>3. ¿Quién y cuándo?</b><span>Define responsabilidad, estado y plazo.</span></div>
        <label>Responsable<input name="responsable" required value="${esc(payload.responsable || "")}" placeholder="Nombre o cargo"></label>
        <label>Institución<select name="institucion">${institutionOptions(payload.institucion || record?.institucion || "")}</select></label>
        <label>Fecha de inicio<input type="date" name="fechaInicio" value="${esc(payload.fechaInicio || "")}"></label>
        <label>Fecha límite<input type="date" name="fechaLimite" required value="${esc(payload.fechaLimite || "")}"></label>
        <label>Estado<select name="estado">${optionList(ACTION_STATES, payload.estado || record?.estado || "Planificada")}</select></label>
        <label>Próxima actualización<input type="date" name="fechaProximaActualizacion" value="${esc(payload.fechaProximaActualizacion || "")}"></label>
      </section>
      <section data-srp1-step="4" hidden>
        <div class="srp1-section-title"><b>4. ¿Con qué recursos?</b><span>Registra capacidad y costo sin confundir estimación con ejecución.</span></div>
        <label class="wide">Recursos, personal o equipos<textarea name="recursos">${esc(payload.recursos || "")}</textarea></label>
        <label>Costo estimado / referencial USD<input type="number" min="0" step="0.01" name="costoEstimado" value="${esc(payload.costoEstimado ?? "")}"></label>
        <label>Fuente prevista<select name="fuenteFinanciamiento">${optionList(FINANCING, payload.fuenteFinanciamiento || "Presupuesto institucional")}</select></label>
        <p class="srp1-help wide">Este monto se conserva como estimado/referencial. P3 separará programado, certificado/asignado y ejecutado.</p>
      </section>
      <section data-srp1-step="5" hidden>
        <div class="srp1-section-title"><b>5. ¿Cómo se demostrará el cumplimiento?</b><span>Define producto, indicador, evidencia y próximo compromiso.</span></div>
        <label class="wide">Producto esperado<textarea name="producto">${esc(payload.producto || "")}</textarea></label>
        <label class="wide">Indicador verificable<textarea name="indicador">${esc(payload.indicador || "")}</textarea></label>
        <label class="wide">Verificables requeridos<textarea name="verificables">${esc(payload.verificables || "")}</textarea></label>
        <label class="wide">Compromiso próximo<textarea name="compromisoProximo">${esc(payload.compromisoProximo || "")}</textarea></label>
        <details class="srp1-advanced wide"><summary>Campos avanzados</summary><div>
          <label>Articulación institucional<textarea name="articulacion">${esc(payload.articulacion || "")}</textarea></label>
          <label>Criterio de cierre<textarea name="criterioCierre">${esc(payload.criterioCierre || "")}</textarea></label>
          <label>Observaciones<textarea name="observaciones">${esc(payload.observaciones || "")}</textarea></label>
        </div></details>
      </section>
      <div class="srp1-error" data-srp1-error></div>
      <footer class="srp1-dialog-actions"><button type="button" class="secondary" data-srp1-prev hidden>Anterior</button><button type="button" class="secondary" data-srp1-next>Siguiente</button><span></span><button type="submit" name="intent" value="draft" class="secondary">Guardar borrador</button><button type="submit" name="intent" value="review">${reviewState(record) === "Observado" ? "Guardar corrección y reenviar" : "Guardar y enviar a revisión"}</button></footer>
    </form>`;
    document.body.appendChild(dialog);
    dialog.showModal();
    renderStep(dialog, 1);
    $("[data-srp1-close]", dialog).onclick = () => closeDialog(dialog);
    $("[data-srp1-prev]", dialog).onclick = () => renderStep(dialog, Math.max(1, Number(dialog.dataset.step || 1) - 1));
    $("[data-srp1-next]", dialog).onclick = () => {
      const step = Number(dialog.dataset.step || 1);
      if (!validateStep(dialog, step)) return;
      renderStep(dialog, Math.min(5, step + 1));
    };
    $("[data-srp1-form]", dialog).onsubmit = event => saveAction(event, dialog, record, editing);
  }

  function validateStep(dialog, step) {
    const panel = $(`[data-srp1-step="${step}"]`, dialog);
    const invalid = $$("[required]", panel).find(input => !String(input.value || "").trim());
    if (invalid) {
      setDialogError(dialog, `Completa ${invalid.closest("label")?.childNodes?.[0]?.textContent?.trim() || "los campos obligatorios"}.`);
      invalid.focus();
      return false;
    }
    setDialogError(dialog, "");
    return true;
  }

  async function saveAction(event, dialog, record, editing) {
    event.preventDefault();
    if (runtime.busy) return;
    for (let step = 1; step <= 5; step += 1) if (!validateStep(dialog, step)) { renderStep(dialog, step); return; }
    const values = formData(event.currentTarget);
    const intent = event.submitter?.value || "draft";
    const previous = actionPayload(record);
    const id = editing ? canonicalId(record) : newId("ACC");
    const history = Array.isArray(previous.revisionHistorial) ? [...previous.revisionHistorial] : [];
    let revisionEstado = previous.revisionEstado || "Borrador";
    if (intent === "review") revisionEstado = revisionEstado === "Observado" ? "Corregido" : "Enviado a revisión";
    if (intent === "review") history.push({ estado: revisionEstado, fecha: nowIso(), usuario: state().user?.email || "", observacion: revisionEstado === "Corregido" ? "Acción corregida y reenviada." : "Acción enviada a revisión institucional." });
    const payload = {
      ...previous,
      id,
      codigo: id,
      accion: values.accion.trim(),
      tipoAccion: values.tipoAccion,
      prioridad: values.prioridad,
      objetivo: values.objetivo.trim(),
      sitioId: values.sitioId,
      ambitoId: values.sitioId.startsWith("SCOPE:") ? values.sitioId : "",
      ubicacionDetalle: values.ubicacionDetalle.trim(),
      responsable: values.responsable.trim(),
      institucion: values.institucion,
      fechaInicio: values.fechaInicio,
      fechaLimite: values.fechaLimite,
      estado: values.estado,
      fechaProximaActualizacion: values.fechaProximaActualizacion,
      recursos: values.recursos.trim(),
      costoEstimado: values.costoEstimado === "" ? "" : number(values.costoEstimado),
      presupuestoNaturaleza: "referencial",
      fuenteFinanciamiento: values.fuenteFinanciamiento,
      producto: values.producto.trim(),
      indicador: values.indicador.trim(),
      verificables: values.verificables.trim(),
      compromisoProximo: values.compromisoProximo.trim(),
      articulacion: values.articulacion.trim(),
      criterioCierre: values.criterioCierre.trim(),
      observaciones: values.observaciones.trim(),
      revisionEstado,
      revisionHistorial: history,
      actualizadoEn: nowIso(),
      actualizadoPor: state().user?.email || ""
    };
    if (!editing && record?.sourcePlanId) payload.sourcePlanId = record.sourcePlanId;
    if (!editing && record?.payload?.sourcePlanId) payload.sourcePlanId = record.payload.sourcePlanId;
    runtime.busy = true;
    setDialogError(dialog, "Guardando…");
    try {
      await window.SmartRiskScopeRepository.saveRecord("accion", payload, editing ? { scopeKey: record.scopeKey, recordId: record.id, canonicalId: id } : { scopeKey: scopeKey(record), canonicalId: id });
      closeDialog(dialog);
      await refreshData();
    } catch (error) {
      console.error(error);
      setDialogError(dialog, friendlyWriteError(error));
    } finally {
      runtime.busy = false;
    }
  }

  function friendlyWriteError(error) {
    const message = String(error?.message || error || "");
    if (/permission|denied|read.only|SMART_RISK_READ_ONLY/i.test(message)) return "Tu perfil no tiene escritura activa en el backend. Verifica rol, alcance y despliegue de reglas Firestore.";
    if (/network|offline|unavailable/i.test(message)) return "No fue posible guardar por conectividad. P5 incorporará cola offline; por ahora conserva los datos antes de cerrar.";
    return `No fue posible guardar: ${message}`;
  }

  async function refreshData() {
    const current = state();
    current.data = await window.SmartRiskV11DataAdapter.loadScopedRecords({ user: current.user, profile: current.profile, db: current.db, auth: current.auth });
    app().render("acciones");
    schedule();
  }

  function openFollowupDialog(record) {
    if (!permission("canEdit")) return;
    const actionId = canonicalId(record);
    if (!actionId) return;
    const last = latestFollowup(actionId);
    const dialog = document.createElement("dialog");
    dialog.className = "srp1-dialog srp1-followup-dialog";
    dialog.innerHTML = `<form method="dialog" data-srp1-followup-form>
      <header class="srp1-dialog-head"><div><small>Seguimiento ligado a acción · equivalente F07</small><h2>${esc(actionTitle(record))}</h2></div><button type="button" data-srp1-close aria-label="Cerrar">×</button></header>
      <div class="srp1-linked-id"><span>actionId</span><code>${esc(actionId)}</code><b>Vinculación obligatoria</b></div>
      <section class="srp1-followup-grid">
        <label>Avance %<input type="number" min="0" max="100" name="avance" required value="${esc(last?.payload?.avance ?? effectiveProgress(record))}"></label>
        <label>Estado<select name="estadoAccion">${optionList(ACTION_STATES, last?.payload?.estadoAccion || effectiveState(record))}</select></label>
        <label>Fecha del reporte<input type="date" name="fechaReporte" required value="${today()}"></label>
        <label>Próximo corte<input type="date" name="proximaFecha" required value="${esc(record.payload?.fechaProximaActualizacion || last?.payload?.proximaFecha || "")}"></label>
        <label class="wide">Avance / producto alcanzado<textarea name="avanceDescripcion" required placeholder="Qué se ejecutó y cuánto">${esc(last?.payload?.avanceDescripcion || "")}</textarea></label>
        <label class="wide">Evidencia disponible<textarea name="evidenciaDescripcion" placeholder="Foto, acta, informe, enlace o documento">${esc(last?.payload?.evidenciaDescripcion || "")}</textarea></label>
        <label class="wide">Enlace de evidencia<input type="url" name="evidenciaUrl" value="${esc(last?.payload?.evidenciaUrl || "")}" placeholder="https://..."></label>
        <label class="wide">Dificultad / nudo crítico<textarea name="dificultad">${esc(last?.payload?.dificultad || "")}</textarea></label>
        <label class="wide">Decisión / medida correctiva<textarea name="decision">${esc(last?.payload?.decision || "")}</textarea></label>
      </section>
      <p class="srp1-help">Este seguimiento no admite <code>SIN-CODIGO</code>: siempre queda enlazado al actionId mostrado arriba.</p>
      <div class="srp1-error" data-srp1-error></div>
      <footer class="srp1-dialog-actions"><span></span><button type="button" class="secondary" data-srp1-close2>Cancelar</button><button type="submit">Guardar seguimiento</button></footer>
    </form>`;
    document.body.appendChild(dialog);
    dialog.showModal();
    $$('[data-srp1-close],[data-srp1-close2]', dialog).forEach(button => button.onclick = () => closeDialog(dialog));
    $("[data-srp1-followup-form]", dialog).onsubmit = event => saveFollowup(event, dialog, record);
  }

  async function saveFollowup(event, dialog, record) {
    event.preventDefault();
    if (runtime.busy) return;
    const values = formData(event.currentTarget);
    if (!values.proximaFecha || values.avance === "" || !values.avanceDescripcion.trim()) {
      setDialogError(dialog, "Completa avance, descripción y próximo corte.");
      return;
    }
    const actionId = canonicalId(record);
    if (!actionId) { setDialogError(dialog, "La acción no posee identificador canónico."); return; }
    const id = newId("FUP");
    const payload = {
      id,
      codigo: id,
      actionId,
      accionId: actionId,
      tipoSeguimiento: "accion",
      fechaReporte: values.fechaReporte,
      periodo: String(values.fechaReporte).slice(0, 7),
      avance: number(values.avance),
      estadoAccion: values.estadoAccion,
      avanceDescripcion: values.avanceDescripcion.trim(),
      evidenciaDescripcion: values.evidenciaDescripcion.trim(),
      evidenciaUrl: values.evidenciaUrl.trim(),
      dificultad: values.dificultad.trim(),
      decision: values.decision.trim(),
      proximaFecha: values.proximaFecha,
      responsable: record.responsable || record.payload?.responsable || "",
      institucion: record.institucion || record.payload?.institucion || "",
      sitioId: record.payload?.sitioId || "",
      creadoEn: nowIso(),
      creadoPor: state().user?.email || ""
    };
    runtime.busy = true;
    setDialogError(dialog, "Guardando seguimiento…");
    try {
      await window.SmartRiskScopeRepository.saveRecord("seguimiento", payload, { scopeKey: record.scopeKey || scopeKey(record), canonicalId: id });
      closeDialog(dialog);
      await refreshData();
    } catch (error) {
      console.error(error);
      setDialogError(dialog, friendlyWriteError(error));
    } finally {
      runtime.busy = false;
    }
  }

  function openReviewDialog(record) {
    if (!permission("canValidate")) return;
    const current = reviewState(record);
    if (!["Enviado a revisión", "Corregido"].includes(current)) return;
    const dialog = document.createElement("dialog");
    dialog.className = "srp1-dialog srp1-review-dialog";
    dialog.innerHTML = `<form method="dialog"><header class="srp1-dialog-head"><div><small>Revisión institucional</small><h2>${esc(actionTitle(record))}</h2></div><button type="button" data-srp1-close>×</button></header><div class="srp1-review-summary">${badge(current)}<p>Revisa descripción, sitio, responsable, plazo, producto, indicador y verificables antes de decidir.</p></div><label class="wide">Observación<textarea name="observacion" placeholder="Obligatoria si se devuelve para corrección"></textarea></label><div class="srp1-error" data-srp1-error></div><footer class="srp1-dialog-actions"><span></span><button type="button" class="secondary" data-srp1-observe>Observar</button><button type="button" data-srp1-validate>Validar</button></footer></form>`;
    document.body.appendChild(dialog);
    dialog.showModal();
    $("[data-srp1-close]", dialog).onclick = () => closeDialog(dialog);
    $("[data-srp1-observe]", dialog).onclick = () => applyReview(dialog, record, "Observado");
    $("[data-srp1-validate]", dialog).onclick = () => applyReview(dialog, record, "Validado");
  }

  async function applyReview(dialog, record, target) {
    if (runtime.busy) return;
    const observation = $("textarea[name=observacion]", dialog).value.trim();
    if (target === "Observado" && !observation) { setDialogError(dialog, "La observación es obligatoria para devolver una acción."); return; }
    const payload = actionPayload(record);
    const history = Array.isArray(payload.revisionHistorial) ? [...payload.revisionHistorial] : [];
    history.push({ estado: target, fecha: nowIso(), usuario: state().user?.email || "", observacion: observation || "Acción validada por Coordinación." });
    payload.revisionEstado = target;
    payload.revisionHistorial = history;
    payload.observacionCoordinacion = target === "Observado" ? observation : "";
    payload.actualizadoEn = nowIso();
    payload.actualizadoPor = state().user?.email || "";
    runtime.busy = true;
    setDialogError(dialog, "Guardando decisión…");
    try {
      await window.SmartRiskScopeRepository.saveRecord("accion", payload, { scopeKey: record.scopeKey, recordId: record.id, canonicalId: canonicalId(record) });
      closeDialog(dialog);
      await refreshData();
    } catch (error) {
      console.error(error);
      setDialogError(dialog, friendlyWriteError(error));
    } finally { runtime.busy = false; }
  }

  function renderActionCard(record) {
    const id = canonicalId(record);
    const progress = effectiveProgress(record);
    const status = effectiveState(record);
    const review = reviewState(record);
    const derived = Boolean(record.normalizedFromPlan || record.payload?.normalizedFromPlan);
    const canEdit = permission("canEdit") && review !== "Validado";
    const canFollow = permission("canEdit") && !derived;
    const canReview = permission("canValidate") && ["Enviado a revisión", "Corregido"].includes(review);
    const deadline = record.payload?.fechaLimite || record.payload?.plazo;
    return `<article class="srp1-action-card ${isOverdue(record) ? "overdue" : ""}" data-action-id="${esc(id)}">
      <header><div><small>${esc(id || "Acción derivada")}</small><h3>${esc(actionTitle(record))}</h3></div>${badge(record.prioridad || record.payload?.prioridad || "Sin prioridad")}</header>
      <div class="srp1-meta"><span><b>${esc(record.responsable || record.payload?.responsable || "Por asignar")}</b><small>Responsable</small></span><span><b>${formatDate(deadline)}</b><small>Fecha límite</small></span><span><b>${esc(status)}</b><small>Estado</small></span><span><b>${esc(review)}</b><small>Revisión</small></span></div>
      <div class="srp1-progress"><i style="width:${Math.max(0, Math.min(100, progress))}%"></i><span>${progress}%</span></div>
      ${isOverdue(record) ? '<p class="srp1-alert">Acción vencida: requiere actualización o reprogramación.</p>' : ""}
      ${record.payload?.observacionCoordinacion ? `<p class="srp1-observation"><b>Observación:</b> ${esc(record.payload.observacionCoordinacion)}</p>` : ""}
      <footer>
        ${derived ? `<button type="button" data-srp1-formalize="${esc(record.id)}" ${permission("canCreate") ? "" : "disabled"}>Formalizar</button>` : ""}
        ${canEdit ? `<button type="button" class="secondary" data-srp1-edit="${esc(record.id)}">Editar</button>` : ""}
        ${canFollow ? `<button type="button" class="secondary" data-srp1-followup="${esc(record.id)}">Actualizar seguimiento</button>` : ""}
        ${canReview ? `<button type="button" data-srp1-review="${esc(record.id)}">Revisar</button>` : ""}
      </footer>
    </article>`;
  }

  function renderList(rows) {
    return `<div class="srp1-action-list">${rows.length ? rows.map(renderActionCard).join("") : '<div class="srp1-empty"><b>Sin acciones operativas</b><p>Crea la primera acción o formaliza una recuperada desde el plan.</p></div>'}</div>`;
  }

  function renderKanban(rows) {
    return `<div class="srp1-kanban">${ACTION_STATES.map(status => {
      const bucket = rows.filter(item => norm(effectiveState(item)) === norm(status));
      return `<section><header><b>${status}</b><span>${bucket.length}</span></header>${bucket.length ? bucket.map(item => `<button type="button" data-srp1-open="${esc(item.id)}"><b>${esc(actionTitle(item))}</b><small>${effectiveProgress(item)}% · ${formatDate(item.payload?.fechaLimite || item.payload?.plazo)}</small></button>`).join("") : '<p>Sin acciones</p>'}</section>`;
    }).join("")}</div>`;
  }

  function renderCalendar(rows) {
    const dated = rows.filter(item => item.payload?.fechaLimite || item.payload?.plazo).sort((a, b) => String(a.payload?.fechaLimite || a.payload?.plazo).localeCompare(String(b.payload?.fechaLimite || b.payload?.plazo)));
    return `<div class="srp1-calendar">${dated.length ? dated.map(item => `<article class="${isOverdue(item) ? "overdue" : ""}"><time>${formatDate(item.payload?.fechaLimite || item.payload?.plazo)}</time><div><b>${esc(actionTitle(item))}</b><small>${esc(item.responsable || item.payload?.responsable || "Por asignar")} · ${effectiveProgress(item)}%</small></div>${badge(effectiveState(item))}</article>`).join("") : '<div class="srp1-empty"><b>Sin fechas programadas</b><p>Las acciones con fecha límite aparecerán aquí.</p></div>'}</div>`;
  }

  function renderWorkspace(container) {
    const rows = actions();
    const overdue = rows.filter(isOverdue).length;
    const missingLink = rows.filter(item => !item.payload?.sitioId && !(item.normalizedFromPlan || item.payload?.normalizedFromPlan)).length;
    container.innerHTML = `<section class="srp1-head"><div><small>Workspace operativo</small><h2>Programación y seguimiento de acciones</h2><p>Cada actualización queda vinculada a un actionId y conserva trazabilidad de revisión.</p></div><div class="srp1-head-metrics"><span><b>${rows.length}</b><small>acciones</small></span><span class="${overdue ? "danger" : ""}"><b>${overdue}</b><small>vencidas</small></span><span class="${missingLink ? "warn" : ""}"><b>${missingLink}</b><small>sin sitio/ámbito</small></span></div></section>
      <div class="srp1-view-tabs"><button type="button" data-srp1-view="lista" class="${runtime.view === "lista" ? "active" : ""}">Lista</button><button type="button" data-srp1-view="kanban" class="${runtime.view === "kanban" ? "active" : ""}">Kanban</button><button type="button" data-srp1-view="calendario" class="${runtime.view === "calendario" ? "active" : ""}">Calendario</button></div>
      <div data-srp1-view-content>${runtime.view === "kanban" ? renderKanban(rows) : runtime.view === "calendario" ? renderCalendar(rows) : renderList(rows)}</div>`;
  }

  function recordByDomId(id) {
    return actions().find(item => String(item.id) === String(id)) || null;
  }

  function bindWorkspace(container) {
    $$('[data-srp1-view]', container).forEach(button => button.onclick = () => { runtime.view = button.dataset.srp1View; renderWorkspace(container); bindWorkspace(container); });
    $$('[data-srp1-edit]', container).forEach(button => button.onclick = () => openActionDialog(recordByDomId(button.dataset.srp1Edit)));
    $$('[data-srp1-formalize]', container).forEach(button => button.onclick = () => openActionDialog(recordByDomId(button.dataset.srp1Formalize)));
    $$('[data-srp1-followup]', container).forEach(button => button.onclick = () => openFollowupDialog(recordByDomId(button.dataset.srp1Followup)));
    $$('[data-srp1-review]', container).forEach(button => button.onclick = () => openReviewDialog(recordByDomId(button.dataset.srp1Review)));
    $$('[data-srp1-open]', container).forEach(button => button.onclick = () => {
      const record = recordByDomId(button.dataset.srp1Open);
      if (record && permission("canEdit") && reviewState(record) !== "Validado") openActionDialog(record);
    });
  }

  function enhanceActions() {
    if (state().route !== "acciones" || !state().data) return;
    const content = $("#content");
    if (!content) return;
    content.classList.add("srp1-enabled");
    const toolbar = $(".sr-toolbar", content);
    if (!toolbar) return;
    const old = $(".sr-primary-disabled", toolbar);
    if (old && !$("#srp1NewAction", toolbar)) {
      const button = document.createElement("button");
      button.id = "srp1NewAction";
      button.type = "button";
      button.className = permission("canCreate") ? "srp1-primary" : "srp1-primary disabled";
      button.disabled = !permission("canCreate");
      button.textContent = permission("canCreate") ? "Nueva acción" : "Solo consulta";
      old.replaceWith(button);
      button.onclick = () => openActionDialog();
    }
    let workspace = $("#srp1Workspace", content);
    if (!workspace) {
      workspace = document.createElement("section");
      workspace.id = "srp1Workspace";
      workspace.className = "srp1-workspace";
      const legacyCard = toolbar.nextElementSibling;
      if (legacyCard) legacyCard.before(workspace);
      else content.append(workspace);
    }
    renderWorkspace(workspace);
    bindWorkspace(workspace);
  }

  function schedule() {
    if (runtime.scheduled) return;
    runtime.scheduled = true;
    requestAnimationFrame(() => {
      runtime.scheduled = false;
      enhanceActions();
    });
  }

  function init() {
    if (runtime.bound) return;
    runtime.bound = true;
    runtime.observer = new MutationObserver(schedule);
    runtime.observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("hashchange", schedule);
    schedule();
  }

  window.SmartRiskOperationalActionsP1 = { VERSION, init, enhanceActions, openActionDialog, openFollowupDialog };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init, { once: true });
  else init();
})();
