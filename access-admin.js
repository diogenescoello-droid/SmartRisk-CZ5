(() => {
  "use strict";

  const ADMIN_EMAILS = new Set([
    "geopro.ec2@gmail.com",
    "dcoellom2@unemi.edu.ec",
    "diogenes.coello@gestionderiesgos.gob.ec"
  ]);
  const catalog = window.SmartRiskAccessCatalog;
  const $ = selector => document.querySelector(selector);
  const normalizeEmail = value => String(value || "").trim().toLowerCase();
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const validUid = value => /^[A-Za-z0-9_-]{16,128}$/.test(String(value || "").trim());
  let auditResult = null;

  function message(target, text, type = "") {
    target.textContent = text;
    target.className = `full message ${type}`.trim();
    target.classList.remove("hidden");
  }
  function hideMessage(target) { target.classList.add("hidden"); }
  function parseScopeKeys(value) {
    return [...new Set(String(value || "").split(/[\n,;]+/).map(item => item.trim()).filter(Boolean))];
  }
  function canonicalRole(role) { return catalog?.canonicalRole(role) || role; }
  function roleDefinition(role) { return catalog?.resolve(role) || null; }
  function isReadOnlyRole(role) { return roleDefinition(role)?.mode === "Consulta"; }
  function expectedScopeType(role, level = "") {
    const definition = roleDefinition(role);
    if (definition?.scopeType && definition.scopeType !== "assigned") return definition.scopeType;
    const normalized = catalog?.normalize(level) || String(level).toLowerCase();
    if (normalized.includes("zonal")) return "zonal";
    if (normalized.includes("provinc")) return "provincial";
    return "cantonal";
  }
  function requiredScopePrefix(scopeType) {
    return scopeType === "zonal" ? "ZONA:" : scopeType === "provincial" ? "PROV:" : "TER:";
  }

  function hydrateRoleSelect() {
    const select = $("#roleSelect");
    if (!select) return;
    const definitions = catalog?.definitions || [];
    select.innerHTML = definitions.map(item => `<option value="${escapeHtml(item.role)}">${escapeHtml(item.role)}</option>`).join("");
    select.value = "Técnico territorial";
    syncRoleDefaults();
  }

  function syncRoleDefaults() {
    const role = canonicalRole($("#roleSelect")?.value);
    const definition = roleDefinition(role);
    if (definition?.level && definition.level !== "Según alcance") $("#levelSelect").value = definition.level;
  }

  async function signIn(event) {
    event.preventDefault();
    const email = normalizeEmail($("#adminEmail").value);
    const password = $("#adminPassword").value;
    const box = $("#loginMessage");
    hideMessage(box);
    if (!ADMIN_EMAILS.has(email)) { message(box, "Este correo no está autorizado para administrar accesos.", "bad"); return; }
    try {
      await auth.signInWithEmailAndPassword(email, password);
      $("#adminPassword").value = "";
    } catch (error) {
      console.error(error);
      message(box, `No fue posible ingresar: ${error.code || "credencial no válida"}.`, "bad");
    }
  }

  async function saveProfile(event) {
    event.preventDefault();
    const values = Object.fromEntries(new FormData(event.currentTarget));
    const uid = String(values.uid || "").trim();
    const email = normalizeEmail(values.correo);
    const role = canonicalRole(values.rol);
    let scopeKeys = parseScopeKeys(values.scopeKeys);
    const scopeType = expectedScopeType(role, values.nivelAcceso);
    const box = $("#profileMessage");
    hideMessage(box);

    if (!validUid(uid)) { message(box, "El UID no tiene un formato válido. Cópielo completo desde Authentication.", "bad"); return; }
    if (!catalog?.isSupported(role)) { message(box, "El rol seleccionado no está permitido por el catálogo canónico.", "bad"); return; }
    if (role === "Administrador") scopeKeys = [...new Set(["ZONA:CZ5", ...scopeKeys])];
    if (scopeType === "zonal" && role !== "Administrador") scopeKeys = [...new Set(["ZONA:CZ5", ...scopeKeys])];

    const prefix = requiredScopePrefix(scopeType);
    if (role !== "Administrador" && !scopeKeys.some(key => String(key).startsWith(prefix))) {
      const hint = scopeType === "provincial" ? "PROV:..." : scopeType === "cantonal" ? "TER:..." : "ZONA:CZ5";
      message(box, `El perfil ${role} requiere un alcance ${scopeType}. Agregue un scope key ${hint}.`, "bad");
      return;
    }
    if (scopeType === "provincial" && !String(values.provincia || "").trim()) { message(box, "Un perfil provincial debe indicar la provincia.", "bad"); return; }
    if (scopeType === "cantonal" && !String(values.canton || "").trim()) { message(box, "Un perfil cantonal debe indicar el cantón.", "bad"); return; }

    const requireTemporaryChange = Boolean(values.requiereCambioClave);
    const definition = roleDefinition(role);
    const payload = {
      correo: email,
      nombre: String(values.nombre || "").trim(),
      rol: role,
      codigoRol: role,
      provincia: String(values.provincia || "").trim(),
      canton: String(values.canton || "").trim(),
      nivelAcceso: definition?.level === "Según alcance" ? values.nivelAcceso : (definition?.level || values.nivelAcceso),
      scopeKeys,
      estado: values.estado,
      modoAcceso: isReadOnlyRole(role) ? "Consulta" : "Operación",
      invitacionEstado: "PilotoActivo",
      requiereCambioClave: requireTemporaryChange,
      metodoActivacion: requireTemporaryChange ? "Credencial temporal" : "Recuperación por correo",
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp(),
      actualizadoPor: normalizeEmail(auth.currentUser?.email)
    };

    try {
      await db.collection("perfiles").doc(uid).set(payload, { merge: true });
      const verification = await db.collection("perfiles").doc(uid).get();
      const saved = verification.data();
      if (!verification.exists || normalizeEmail(saved?.correo) !== email || saved?.rol !== role) throw new Error("PROFILE_VERIFICATION_FAILED");
      message(box, `Perfil verificado: ${role} · ${scopeType} · ${scopeKeys.join(" · ")}.`, "ok");
    } catch (error) {
      console.error(error);
      message(box, `No fue posible guardar o verificar el perfil: ${error.code || error.message}.`, "bad");
    }
  }

  function profileFindings(id, profile, duplicateEmails) {
    const issues = [];
    const email = normalizeEmail(profile.correo);
    const role = canonicalRole(profile.rol || profile.codigoRol);
    const scopeType = expectedScopeType(role, profile.nivelAcceso);
    const scopes = Array.isArray(profile.scopeKeys) ? profile.scopeKeys : [];
    if (!validUid(id)) issues.push("ID no parece UID");
    if (!email || !email.includes("@")) issues.push("Correo faltante o inválido");
    if (profile.correo !== email) issues.push("Correo no normalizado");
    if (duplicateEmails.has(email)) issues.push("Correo duplicado");
    if (profile.estado !== "Activo") issues.push("Perfil no activo");
    if (!catalog?.isSupported(role)) issues.push(`Rol incompatible: ${profile.rol || "vacío"}`);
    if (role !== "Administrador" && !scopes.some(key => String(key).startsWith(requiredScopePrefix(scopeType)))) issues.push(`Sin scope ${scopeType}`);
    if (isReadOnlyRole(role) && profile.modoAcceso !== "Consulta") issues.push("Rol de consulta sin modo Consulta");
    if (typeof profile.requiereCambioClave !== "boolean") issues.push("Sin indicador de activación de clave");
    return issues;
  }

  async function auditProfiles() {
    const table = $("#auditTable");
    const summary = $("#auditSummary");
    table.innerHTML = "<p>Consultando perfiles…</p>";
    summary.innerHTML = "";
    try {
      const snapshot = await db.collection("perfiles").get();
      const rows = snapshot.docs.map(document => ({ id: document.id, ...document.data() }));
      const emailCounts = new Map();
      rows.forEach(row => { const email = normalizeEmail(row.correo); if (email) emailCounts.set(email, (emailCounts.get(email) || 0) + 1); });
      const duplicates = new Set([...emailCounts.entries()].filter(([, count]) => count > 1).map(([email]) => email));
      const audited = rows.map(row => ({ ...row, issues: profileFindings(row.id, row, duplicates) }));
      const problems = audited.filter(row => row.issues.length);
      const active = audited.filter(row => row.estado === "Activo").length;
      auditResult = {
        generatedAt: new Date().toISOString(), generatedBy: normalizeEmail(auth.currentUser?.email),
        totals: { profiles: audited.length, active, withProblems: problems.length },
        profiles: audited.map(row => ({ uid: row.id, correo: row.correo || "", nombre: row.nombre || "", rol: row.rol || "", nivelAcceso: row.nivelAcceso || "", estado: row.estado || "", scopeKeys: row.scopeKeys || [], issues: row.issues }))
      };
      summary.innerHTML = `<span class="badge">${audited.length} perfiles</span><span class="badge ok">${active} activos</span><span class="badge ${problems.length ? "bad" : "ok"}">${problems.length} con observaciones</span>`;
      table.innerHTML = audited.length ? `<table><thead><tr><th>Usuario</th><th>Rol y alcance</th><th>Estado</th><th>Resultado</th></tr></thead><tbody>${audited.map(row => `<tr><td><b>${escapeHtml(row.nombre || "Sin nombre")}</b><br>${escapeHtml(row.correo || "Sin correo")}<br><span class="small">${escapeHtml(row.id)}</span></td><td>${escapeHtml(row.rol || "Sin rol")}<br><span class="small">${escapeHtml((row.scopeKeys || []).join(" · ") || "Sin alcance")}</span></td><td>${escapeHtml(row.estado || "Sin estado")}</td><td>${row.issues.length ? `<span class="badge bad">${escapeHtml(row.issues.join("; "))}</span>` : '<span class="badge ok">Listo para ingreso</span>'}</td></tr>`).join("")}</tbody></table>` : "<p>No existen perfiles.</p>";
      $("#exportAudit").disabled = false;
    } catch (error) {
      console.error(error);
      table.innerHTML = `<p class="bad">No fue posible listar perfiles: ${escapeHtml(error.code || error.message)}</p>`;
    }
  }

  function exportAudit() {
    if (!auditResult) return;
    const blob = new Blob([JSON.stringify(auditResult, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `smartrisk-auditoria-perfiles-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function clearForm() {
    $("#profileForm").reset();
    $("#roleSelect").value = "Técnico territorial";
    $("#levelSelect").value = "Cantonal";
    hideMessage($("#profileMessage"));
  }

  auth.onAuthStateChanged(user => {
    const authorized = Boolean(user && ADMIN_EMAILS.has(normalizeEmail(user.email)));
    $("#loginPanel").classList.toggle("hidden", authorized);
    $("#adminArea").classList.toggle("hidden", !authorized);
    $("#logout").classList.toggle("hidden", !authorized);
    if (user && !authorized) {
      auth.signOut();
      message($("#loginMessage"), "La cuenta autenticada no está autorizada como administradora.", "bad");
    }
  });

  hydrateRoleSelect();
  $("#roleSelect")?.addEventListener("change", syncRoleDefaults);
  $("#loginForm").addEventListener("submit", signIn);
  $("#profileForm").addEventListener("submit", saveProfile);
  $("#clearForm").addEventListener("click", clearForm);
  $("#auditProfiles").addEventListener("click", auditProfiles);
  $("#exportAudit").addEventListener("click", exportAudit);
  $("#logout").addEventListener("click", () => auth.signOut());
})();
