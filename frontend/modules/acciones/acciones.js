window.SmartRisk = window.SmartRisk || {};

(function () {
  const SR = SmartRisk;
  let actions = SR.Storage.get("actions", SR.MockData.actions);
  let filtered = [...actions];
  let selectedId = "";

  function persist() {
    SR.Storage.set("actions", actions);
  }

  function statusClass(value) {
    if (value === "Completada") return "action-status-completed";
    if (value === "En ejecución") return "action-status-progress";
    if (value === "Bloqueada") return "action-status-blocked";
    return "action-status-pending";
  }

  function lineClass(value) {
    if (value === "Análisis") return "action-line-analysis";
    if (value === "Fortalecimiento") return "action-line-strength";
    return "action-line-response";
  }

  function summary() {
    const total = filtered.length;
    const avg = Math.round(filtered.reduce((sum, item) => sum + Number(item.avance || 0), 0) / Math.max(total, 1));
    const completed = filtered.filter((item) => item.estado === "Completada").length;
    const blocked = filtered.filter((item) => item.estado === "Bloqueada").length;

    return `<section class="action-summary">
      <article class="action-summary-card"><span>Acciones visibles</span><strong>${total}</strong><small class="muted">Registros filtrados</small></article>
      <article class="action-summary-card"><span>Avance promedio</span><strong>${avg}%</strong><small class="muted">Progreso consolidado</small></article>
      <article class="action-summary-card"><span>Completadas</span><strong>${completed}</strong><small class="muted">Cierre verificado</small></article>
      <article class="action-summary-card"><span>Bloqueadas</span><strong>${blocked}</strong><small class="muted">Requieren gestión</small></article>
    </section>`;
  }

  function detail(item) {
    if (!item) return '<div class="empty-state">No se encontró la acción seleccionada.</div>';

    return `<div class="action-detail ${lineClass(item.linea)}">
      <div class="action-detail-lead">
        <span class="kicker">${item.linea}</span>
        <h2 class="action-detail-title">${item.titulo}</h2>
        <p class="muted">${item.provincia} · ${item.canton}</p>
      </div>
      <div class="action-detail-row"><span>Estado</span><span class="badge ${statusClass(item.estado)}">${item.estado}</span></div>
      <div class="action-detail-row"><span>Prioridad</span><strong>${item.prioridad}</strong></div>
      <div class="action-detail-row"><span>Institución</span><strong>${item.institucion}</strong></div>
      <div class="action-detail-row"><span>Responsable</span><strong>${item.responsable}</strong></div>
      <div class="action-detail-row"><span>Sitio relacionado</span><strong>${item.sitio}</strong></div>
      <div class="action-detail-row"><span>Plazo</span><strong>${item.fechaInicio} → ${item.fechaFin}</strong></div>
      <div class="action-progress">
        <div class="action-progress-label"><span>Avance</span><strong>${item.avance}%</strong></div>
        <div class="action-progress-track" role="progressbar" aria-label="Avance de la acción" aria-valuemin="0" aria-valuemax="100" aria-valuenow="${item.avance}">
          <div class="action-progress-value" style="width:${item.avance}%"></div>
        </div>
      </div>
      <div class="action-description">${item.descripcion || "Sin descripción."}</div>
      <div><strong>Evidencias</strong><div class="tag-list action-evidence-list">${(item.evidencias || []).length ? item.evidencias.map((evidence) => `<span class="tag">${evidence}</span>`).join("") : '<span class="muted">Sin evidencias registradas.</span>'}</div></div>
      <div><strong>Observaciones</strong><p class="muted action-observations">${item.observaciones || "Sin observaciones."}</p></div>
      <div class="split-actions action-detail-actions">
        <button id="edit-action" class="btn btn-secondary">${SR.Icon.render("edit", 17)}Editar</button>
        <button id="delete-action" class="btn btn-secondary">${SR.Icon.render("trash", 17)}Eliminar</button>
      </div>
    </div>`;
  }

  function timeline() {
    return `<div class="timeline">${filtered.slice(0, 5).map((item) => `<div class="timeline-item"><span class="timeline-dot"></span><div><p><strong>${item.titulo}</strong></p><small>${item.fechaFin} · ${item.estado}</small></div></div>`).join("") || '<p class="muted">Sin acciones visibles.</p>'}</div>`;
  }

  function render() {
    return `<section class="page-header">
      <div><span class="kicker">Seguimiento operativo</span><h1 class="page-title">Acciones</h1><p class="page-subtitle">Gestiona acciones de análisis, fortalecimiento y respuesta vinculadas con territorios, instituciones y sitios.</p></div>
      <div class="split-actions">${SR.Button.render({ id: "export-actions", label: "Exportar CSV", variant: "secondary", icon: "download" })}${SR.Button.render({ id: "new-action", label: "Nueva acción", icon: "plus" })}</div>
    </section>
    <div id="action-summary-root">${summary()}</div>
    <section class="panel" style="margin-bottom:20px"><div class="panel-body"><div class="action-filter-grid">
      <div class="search-wrap"><span class="search-icon">${SR.Icon.render("search", 18)}</span><input id="action-search" class="search-input" placeholder="Buscar acción, cantón o responsable…"></div>
      <select id="action-line" class="select-input"><option value="">Todas las líneas</option><option>Análisis</option><option>Fortalecimiento</option><option>Respuesta</option></select>
      <select id="action-status" class="select-input"><option value="">Todos los estados</option><option>Pendiente</option><option>En ejecución</option><option>Completada</option><option>Bloqueada</option></select>
      <select id="action-priority" class="select-input"><option value="">Todas las prioridades</option><option>Alta</option><option>Media</option><option>Baja</option></select>
      <button id="action-reset" class="btn btn-secondary">Limpiar</button>
    </div></div></section>
    <section class="action-layout">
      <article class="panel"><header class="panel-header"><div><h2 class="section-title">Matriz de acciones</h2><p class="muted action-table-help">Selecciona “Ver” para abrir la ficha sin perder la tabla.</p></div><span id="action-count" class="badge">${filtered.length} registros</span></header><div class="panel-body"><div id="action-table"></div></div></article>
      ${SR.Card.panel({ title: "Próximos hitos", body: `<div id="action-timeline">${timeline()}</div>` })}
    </section>`;
  }

  function drawTable() {
    SR.Table.create({
      containerId: "action-table",
      columns: [
        { key: "titulo", label: "Acción" },
        { key: "linea", label: "Línea" },
        { key: "canton", label: "Cantón" },
        { key: "responsable", label: "Responsable" },
        { key: "avance", label: "Avance" },
        { key: "estado", label: "Estado" },
        { key: "id", label: "Detalle", type: "action" }
      ],
      rows: filtered,
      onAction: (id) => openDetail(id)
    });
    document.getElementById("action-count").textContent = `${filtered.length} registros`;
  }

  function openDetail(id) {
    selectedId = id;
    const item = actions.find((action) => action.id === id);
    if (!item) return;

    SR.Drawer.open({
      title: "Detalle de la acción",
      subtitle: `${item.canton} · ${item.estado}`,
      ariaLabel: `Detalle de la acción ${item.titulo}`,
      width: "500px",
      body: detail(item)
    });
    bindDetail();
  }

  function applyFilters() {
    const query = SR.Utils.normalizeText(document.getElementById("action-search").value);
    const line = document.getElementById("action-line").value;
    const status = document.getElementById("action-status").value;
    const priority = document.getElementById("action-priority").value;

    filtered = actions.filter((item) => SR.Utils.normalizeText(`${item.titulo} ${item.canton} ${item.provincia} ${item.responsable} ${item.institucion}`).includes(query)
      && (!line || item.linea === line)
      && (!status || item.estado === status)
      && (!priority || item.prioridad === priority));

    document.getElementById("action-summary-root").innerHTML = summary();
    drawTable();
    document.getElementById("action-timeline").innerHTML = timeline();
    SR.Drawer?.close();
  }

  function form(item = {}) {
    return `<div class="action-form-grid"><label class="form-field action-form-full"><span class="form-label">Título *</span><input id="a-titulo" class="form-input" value="${SR.Utils.escapeHtml(item.titulo || "")}"></label><label class="form-field"><span class="form-label">Línea</span><select id="a-linea" class="select-input">${["Análisis", "Fortalecimiento", "Respuesta"].map((value) => `<option ${item.linea === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label class="form-field"><span class="form-label">Estado</span><select id="a-estado" class="select-input">${["Pendiente", "En ejecución", "Completada", "Bloqueada"].map((value) => `<option ${item.estado === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label class="form-field"><span class="form-label">Prioridad</span><select id="a-prioridad" class="select-input">${["Alta", "Media", "Baja"].map((value) => `<option ${item.prioridad === value ? "selected" : ""}>${value}</option>`).join("")}</select></label><label class="form-field"><span class="form-label">Avance (%)</span><input id="a-avance" class="form-input" type="number" min="0" max="100" value="${item.avance ?? 0}"></label><label class="form-field"><span class="form-label">Provincia</span><input id="a-provincia" class="form-input" value="${SR.Utils.escapeHtml(item.provincia || "")}"></label><label class="form-field"><span class="form-label">Cantón</span><input id="a-canton" class="form-input" value="${SR.Utils.escapeHtml(item.canton || "")}"></label><label class="form-field"><span class="form-label">Institución</span><input id="a-institucion" class="form-input" value="${SR.Utils.escapeHtml(item.institucion || "")}"></label><label class="form-field"><span class="form-label">Responsable</span><input id="a-responsable" class="form-input" value="${SR.Utils.escapeHtml(item.responsable || "")}"></label><label class="form-field"><span class="form-label">Fecha de inicio</span><input id="a-inicio" class="form-input" type="date" value="${item.fechaInicio || ""}"></label><label class="form-field"><span class="form-label">Fecha de fin</span><input id="a-fin" class="form-input" type="date" value="${item.fechaFin || ""}"></label><label class="form-field action-form-full"><span class="form-label">Sitio relacionado</span><input id="a-sitio" class="form-input" value="${SR.Utils.escapeHtml(item.sitio || "")}"></label><label class="form-field action-form-full"><span class="form-label">Descripción</span><textarea id="a-descripcion" class="form-textarea">${SR.Utils.escapeHtml(item.descripcion || "")}</textarea></label><label class="form-field action-form-full"><span class="form-label">Evidencias separadas por coma</span><input id="a-evidencias" class="form-input" value="${SR.Utils.escapeHtml((item.evidencias || []).join(", "))}"></label><label class="form-field action-form-full"><span class="form-label">Observaciones</span><textarea id="a-observaciones" class="form-textarea">${SR.Utils.escapeHtml(item.observaciones || "")}</textarea></label></div>`;
  }

  function readForm(existing = {}) {
    const get = (id) => document.getElementById(id).value.trim();
    const titulo = get("a-titulo");
    if (!titulo) {
      SR.Toast.show("El título es obligatorio.", "danger");
      return null;
    }

    const avance = Math.min(100, Math.max(0, Number(get("a-avance") || 0)));
    return {
      ...existing,
      id: existing.id || SR.Utils.uid("ACC"),
      titulo,
      linea: get("a-linea"),
      estado: get("a-estado"),
      prioridad: get("a-prioridad"),
      avance,
      provincia: get("a-provincia") || "Sin definir",
      canton: get("a-canton") || "Sin definir",
      institucion: get("a-institucion") || "Sin institución",
      responsable: get("a-responsable") || "Sin responsable",
      fechaInicio: get("a-inicio"),
      fechaFin: get("a-fin"),
      sitio: get("a-sitio") || "Sin relación",
      descripcion: get("a-descripcion"),
      evidencias: get("a-evidencias").split(",").map((value) => value.trim()).filter(Boolean),
      observaciones: get("a-observaciones")
    };
  }

  function openForm(existing = null) {
    SR.Drawer?.close();
    SR.Modal.open({
      title: existing ? "Editar acción" : "Nueva acción",
      body: form(existing || {}),
      confirmLabel: existing ? "Guardar cambios" : "Crear acción",
      onConfirm: () => {
        const value = readForm(existing || {});
        if (!value) return false;
        actions = existing ? actions.map((item) => item.id === existing.id ? value : item) : [value, ...actions];
        persist();
        selectedId = value.id;
        SR.Toast.show(existing ? "Acción actualizada." : "Acción creada.", "success");
        location.reload();
      }
    });
  }

  function bindDetail() {
    document.getElementById("edit-action")?.addEventListener("click", () => openForm(actions.find((item) => item.id === selectedId)));
    document.getElementById("delete-action")?.addEventListener("click", () => {
      const item = actions.find((action) => action.id === selectedId);
      SR.Drawer.close();
      SR.Modal.open({
        title: "Eliminar acción",
        body: `<p>¿Confirma la eliminación de <strong>${item.titulo}</strong>?</p>`,
        confirmLabel: "Eliminar",
        onConfirm: () => {
          actions = actions.filter((action) => action.id !== selectedId);
          persist();
          SR.Toast.show("Acción eliminada.", "success");
          location.reload();
        }
      });
    });
  }

  function bind() {
    drawTable();
    document.getElementById("action-search").oninput = applyFilters;
    document.getElementById("action-line").onchange = applyFilters;
    document.getElementById("action-status").onchange = applyFilters;
    document.getElementById("action-priority").onchange = applyFilters;
    document.getElementById("action-reset").onclick = () => {
      ["action-search", "action-line", "action-status", "action-priority"].forEach((id) => { document.getElementById(id).value = ""; });
      applyFilters();
    };
    document.getElementById("new-action").onclick = () => openForm();
    document.getElementById("export-actions").onclick = () => {
      SR.Utils.downloadCsv("acciones-smartrisk.csv", filtered.map((item) => ({ ...item, evidencias: item.evidencias.join("; ") })));
      SR.Toast.show("CSV generado.", "success");
    };
  }

  SR.AccionesModule = { route: { path: "/acciones", title: "Acciones", render, bind } };
})();
