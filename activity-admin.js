(() => {
  "use strict";

  const VERSION = "2026.09.02.1-activity-admin";
  const LIMIT = 1000;
  const $ = selector => document.querySelector(selector);
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
  const clean = value => String(value ?? "").trim();
  let rows = [];
  let profileCount = 0;

  function timestampDate(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate();
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  function formatDate(value) {
    const date = timestampDate(value);
    if (!date) return "Pendiente";
    return new Intl.DateTimeFormat("es-EC", {
      dateStyle: "short", timeStyle: "medium", timeZone: "America/Guayaquil"
    }).format(date);
  }

  function csvCell(value) {
    return `"${String(value ?? "").replace(/"/g, '""')}"`;
  }

  function hydrate() {
    const adminArea = $("#adminArea");
    if (!adminArea || $("#activityAuditPanel")) return;
    const section = document.createElement("section");
    section.id = "activityAuditPanel";
    section.className = "panel";
    section.innerHTML = `
      <div class="top">
        <div>
          <h2>Actividad real de usuarios</h2>
          <p class="muted">Distingue cuentas creadas de ingresos efectivamente validados y reconstruye las acciones realizadas dentro de SmartRisk.</p>
        </div>
        <div class="actions"><button id="refreshActivity" type="button">Actualizar actividad</button><button id="exportActivity" type="button" class="secondary" disabled>Exportar CSV</button></div>
      </div>
      <p class="risk-note"><b>Criterio:</b> un usuario solo cuenta como acceso validado cuando existe un evento <code>LOGIN_SUCCESS</code>. La bitácora no almacena contraseñas ni el contenido escrito en campos de texto.</p>
      <div id="activitySummary" class="status-row"></div>
      <div class="grid" style="margin-top:14px">
        <label>Buscar usuario, módulo o control<input id="activitySearch" type="search" placeholder="Correo, nombre, módulo, botón…"></label>
        <label>Tipo de acción<select id="activityAction"><option value="">Todas las acciones</option></select></label>
      </div>
      <p id="activityMessage" class="muted">La consulta mostrará hasta los últimos ${LIMIT} eventos.</p>
      <div id="activityTable" class="table-wrap"></div>`;
    adminArea.append(section);

    $("#refreshActivity")?.addEventListener("click", refresh);
    $("#exportActivity")?.addEventListener("click", exportCsv);
    $("#activitySearch")?.addEventListener("input", render);
    $("#activityAction")?.addEventListener("change", render);
  }

  function setSummary() {
    const loginRows = rows.filter(row => row.action === "LOGIN_SUCCESS");
    const validatedUsers = new Set(loginRows.map(row => row.uid).filter(Boolean));
    const sessions = new Set(rows.map(row => row.sessionId).filter(Boolean));
    const activeUsers = new Set(rows.map(row => row.uid).filter(Boolean));
    const notYetValidated = Math.max(profileCount - validatedUsers.size, 0);
    $("#activitySummary").innerHTML = [
      `<span class="badge">${profileCount} perfiles</span>`,
      `<span class="badge ok">${validatedUsers.size} ingresos validados</span>`,
      `<span class="badge ${notYetValidated ? "warn" : "ok"}">${notYetValidated} sin ingreso validado en esta bitácora</span>`,
      `<span class="badge">${activeUsers.size} usuarios con actividad</span>`,
      `<span class="badge">${sessions.size} sesiones</span>`,
      `<span class="badge">${rows.length} eventos consultados</span>`
    ].join("");
  }

  function hydrateActions() {
    const select = $("#activityAction");
    const current = select.value;
    const actions = [...new Set(rows.map(row => row.action).filter(Boolean))].sort();
    select.innerHTML = '<option value="">Todas las acciones</option>' + actions.map(action => `<option value="${escapeHtml(action)}">${escapeHtml(action)}</option>`).join("");
    if (actions.includes(current)) select.value = current;
  }

  function filteredRows() {
    const query = clean($("#activitySearch")?.value).toLowerCase();
    const action = clean($("#activityAction")?.value);
    return rows.filter(row => {
      if (action && row.action !== action) return false;
      if (!query) return true;
      return [row.correo, row.nombre, row.rol, row.provincia, row.canton, row.module, row.pageTitle, row.elementId, row.elementLabel, row.action, row.route]
        .some(value => String(value || "").toLowerCase().includes(query));
    });
  }

  function render() {
    const table = $("#activityTable");
    if (!table) return;
    const filtered = filteredRows();
    $("#activityMessage").textContent = `${filtered.length} eventos visibles de ${rows.length} consultados · límite de consulta: ${LIMIT}.`;
    if (!filtered.length) {
      table.innerHTML = "<p>No hay eventos que coincidan con el filtro.</p>";
      return;
    }
    table.innerHTML = `<table><thead><tr><th>Fecha y hora</th><th>Usuario</th><th>Módulo</th><th>Acción</th><th>Control / contexto</th><th>Resultado</th></tr></thead><tbody>${filtered.map(row => {
      const context = [row.elementLabel, row.elementId ? `#${row.elementId}` : "", row.route].filter(Boolean).join(" · ");
      return `<tr>
        <td>${escapeHtml(formatDate(row.timestamp))}</td>
        <td><b>${escapeHtml(row.nombre || "Sin nombre")}</b><br>${escapeHtml(row.correo || "")}<br><span class="small">${escapeHtml(row.rol || "")} ${row.canton ? `· ${escapeHtml(row.canton)}` : ""}</span></td>
        <td>${escapeHtml(row.module || row.pageTitle || "")}</td>
        <td><span class="badge">${escapeHtml(row.action || "")}</span><br><span class="small">${escapeHtml(row.category || "")}</span></td>
        <td>${escapeHtml(context || "Sin control específico")}</td>
        <td>${escapeHtml(row.result || "")}</td>
      </tr>`;
    }).join("")}</tbody></table>`;
  }

  async function refresh() {
    const button = $("#refreshActivity");
    const message = $("#activityMessage");
    if (!auth.currentUser) return;
    button.disabled = true;
    message.textContent = "Consultando bitácora de actividad…";
    try {
      const [activitySnap, profileSnap] = await Promise.all([
        db.collection("auditoria_actividad").orderBy("timestamp", "desc").limit(LIMIT).get(),
        db.collection("perfiles").get()
      ]);
      profileCount = profileSnap.size;
      rows = activitySnap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSummary();
      hydrateActions();
      render();
      $("#exportActivity").disabled = !rows.length;
    } catch (error) {
      console.error("SmartRisk activity audit refresh failed", error);
      message.textContent = `No fue posible consultar la bitácora: ${error.code || error.message}.`;
      rows = [];
      render();
    } finally {
      button.disabled = false;
    }
  }

  function exportCsv() {
    if (!rows.length) return;
    const headers = ["fecha_hora","uid","correo","nombre","rol","provincia","canton","sesion","modulo","accion","categoria","control_id","control_etiqueta","ruta","resultado"];
    const lines = [headers.map(csvCell).join(",")];
    for (const row of filteredRows()) {
      lines.push([
        formatDate(row.timestamp), row.uid, row.correo, row.nombre, row.rol, row.provincia, row.canton,
        row.sessionId, row.module, row.action, row.category, row.elementId, row.elementLabel, row.route, row.result
      ].map(csvCell).join(","));
    }
    const blob = new Blob(["\ufeff" + lines.join("\n")], { type: "text/csv;charset=utf-8" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `smartrisk-actividad-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  hydrate();
  auth.onAuthStateChanged(user => {
    if (user) setTimeout(refresh, 0);
  });

  window.SmartRiskActivityAdmin = { version: VERSION, refresh };
})();
