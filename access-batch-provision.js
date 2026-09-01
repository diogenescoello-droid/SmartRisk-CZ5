(() => {
  "use strict";

  const VERSION = "2026.08.31.2-reconcile-auth-profile";
  const catalog = window.SmartRiskAccessCatalog;
  const normalizeEmail = value => String(value || "").trim().toLowerCase();
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[char]);
  const state = { users: [], results: [] };

  function expectedScopeType(role, level = "") {
    const definition = catalog?.resolve(role);
    if (definition?.scopeType && definition.scopeType !== "assigned") return definition.scopeType;
    const normalized = catalog?.normalize(level) || String(level).toLowerCase();
    if (normalized.includes("zonal")) return "zonal";
    if (normalized.includes("provinc")) return "provincial";
    return "cantonal";
  }

  function requiredScopePrefix(scopeType) {
    return scopeType === "zonal" ? "ZONA:" : scopeType === "provincial" ? "PROV:" : "TER:";
  }

  function makeTemporaryPassword() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    const bytes = new Uint32Array(12);
    crypto.getRandomValues(bytes);
    return `SR5-${[...bytes].map(value => alphabet[value % alphabet.length]).join("")}`;
  }

  function validateUser(raw, index) {
    const correo = normalizeEmail(raw?.correo);
    const nombre = String(raw?.nombre || "").trim();
    const rol = catalog?.canonicalRole(raw?.rol) || String(raw?.rol || "").trim();
    const provincia = String(raw?.provincia || "").trim();
    const canton = String(raw?.canton || "").trim();
    const nivelAcceso = String(raw?.nivelAcceso || "").trim();
    const scopeKeys = [...new Set((Array.isArray(raw?.scopeKeys) ? raw.scopeKeys : []).map(value => String(value).trim()).filter(Boolean))];
    const password = String(raw?.password || raw?.claveInicial || "").trim() || makeTemporaryPassword();
    const issues = [];
    if (!nombre) issues.push("nombre faltante");
    if (!correo || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) issues.push("correo inválido");
    if (!catalog?.isSupported(rol)) issues.push(`rol no soportado: ${rol || "vacío"}`);
    if (password.length < 12) issues.push("clave inicial demasiado corta");
    const scopeType = expectedScopeType(rol, nivelAcceso);
    const prefix = requiredScopePrefix(scopeType);
    if (!scopeKeys.some(key => key.startsWith(prefix))) issues.push(`falta scope ${prefix}`);
    if (scopeType === "provincial" && !provincia) issues.push("provincia faltante");
    if (scopeType === "cantonal" && !canton) issues.push("cantón faltante");
    return { index, raw, correo, nombre, rol, provincia, canton, nivelAcceso, scopeKeys, scopeType, password, issues };
  }

  function payloadFor(user) {
    const definition = catalog?.resolve(user.rol);
    return {
      correo: user.correo,
      nombre: user.nombre,
      rol: user.rol,
      codigoRol: user.rol,
      provincia: user.provincia,
      canton: user.canton,
      nivelAcceso: definition?.level === "Según alcance" ? user.nivelAcceso : (definition?.level || user.nivelAcceso),
      scopeKeys: user.scopeKeys,
      estado: "Activo",
      modoAcceso: definition?.mode === "Consulta" ? "Consulta" : "Operación",
      invitacionEstado: "PilotoActivo",
      requiereCambioClave: false,
      metodoActivacion: "Credencial inicial administrada",
      actualizadoEn: firebase.firestore.FieldValue.serverTimestamp(),
      actualizadoPor: normalizeEmail(auth.currentUser?.email)
    };
  }

  async function findProfilesByEmail(email) {
    const snapshot = await db.collection("perfiles").where("correo", "==", email).limit(10).get();
    return snapshot.docs;
  }

  function secondaryAuth() {
    let app;
    try { app = firebase.app("SmartRiskProvisioning"); }
    catch (_) { app = firebase.initializeApp(firebaseConfig, "SmartRiskProvisioning"); }
    return app.auth();
  }

  function isCredentialMismatch(error) {
    return [
      "auth/invalid-credential",
      "auth/invalid-login-credentials",
      "auth/wrong-password",
      "auth/user-not-found"
    ].includes(String(error?.code || ""));
  }

  async function canonicalizeProfile(user, uid, legacyProfiles) {
    const canonicalRef = db.collection("perfiles").doc(uid);
    await canonicalRef.set(payloadFor(user), { merge: true });
    const legacy = legacyProfiles.filter(doc => doc.id !== uid);
    for (const doc of legacy) await doc.ref.delete();
    return legacy.length;
  }

  async function resolveAuthentication(user) {
    const auxAuth = secondaryAuth();
    await auxAuth.setPersistence(firebase.auth.Auth.Persistence.NONE);
    try {
      try {
        const credential = await auxAuth.createUserWithEmailAndPassword(user.correo, user.password);
        return { uid: credential?.user?.uid, authState: "created" };
      } catch (error) {
        if (error?.code !== "auth/email-already-in-use") throw error;
      }

      try {
        const credential = await auxAuth.signInWithEmailAndPassword(user.correo, user.password);
        return { uid: credential?.user?.uid, authState: "matched" };
      } catch (error) {
        if (isCredentialMismatch(error)) {
          return { authState: "different-password", authError: error?.code || "auth/invalid-credential" };
        }
        throw error;
      }
    } finally {
      try { await auxAuth.signOut(); } catch (_) {}
    }
  }

  async function provisionOne(user) {
    const legacyProfiles = await findProfilesByEmail(user.correo);
    const authResult = await resolveAuthentication(user);

    if (authResult.authState === "different-password") {
      return {
        correo: user.correo,
        nombre: user.nombre,
        status: "manual",
        detail: `Authentication ya contiene este correo con una clave distinta (${authResult.authError}). No se alteró la contraseña. Use recuperación de contraseña o Admin SDK y luego vuelva a auditar.`
      };
    }

    const uid = authResult.uid;
    if (!uid) throw new Error("No se obtuvo UID de Firebase Authentication.");
    const migrated = await canonicalizeProfile(user, uid, legacyProfiles);

    if (authResult.authState === "created") {
      return {
        correo: user.correo,
        nombre: user.nombre,
        uid,
        password: user.password,
        status: "created",
        detail: migrated
          ? `Cuenta Authentication creada y perfil migrado a perfiles/{UID}. Se retiraron ${migrated} perfil(es) heredado(s).`
          : "Cuenta Authentication y perfil canónico creados. Puede ingresar inmediatamente con la credencial inicial."
      };
    }

    return {
      correo: user.correo,
      nombre: user.nombre,
      uid,
      password: user.password,
      status: "reconciled",
      detail: migrated
        ? `Authentication ya existía y la clave preparada fue validada. Perfil reconciliado por UID; se retiraron ${migrated} perfil(es) heredado(s).`
        : "Authentication ya existía y la clave preparada fue validada. Perfil canónico confirmado por UID."
    };
  }

  function renderPreview(validated) {
    const table = document.querySelector("#batchPreview");
    const summary = document.querySelector("#batchSummary");
    const valid = validated.filter(item => !item.issues.length);
    const invalid = validated.filter(item => item.issues.length);
    state.users = valid;
    state.results = [];
    summary.innerHTML = `<span class="badge">${validated.length} registros</span><span class="badge ok">${valid.length} válidos</span><span class="badge ${invalid.length ? "bad" : "ok"}">${invalid.length} con observaciones</span>`;
    table.innerHTML = validated.length ? `<table><thead><tr><th>Usuario</th><th>Rol / alcance</th><th>Credencial</th><th>Validación</th></tr></thead><tbody>${validated.map(item => `<tr><td><b>${escapeHtml(item.nombre || "Sin nombre")}</b><br>${escapeHtml(item.correo || "Sin correo")}</td><td>${escapeHtml(item.rol || "Sin rol")}<br><span class="small">${escapeHtml(item.scopeKeys.join(" · "))}</span></td><td><span class="badge">Clave preparada</span></td><td>${item.issues.length ? `<span class="badge bad">${escapeHtml(item.issues.join("; "))}</span>` : '<span class="badge ok">Listo</span>'}</td></tr>`).join("")}</tbody></table>` : "<p>No hay registros cargados.</p>";
    document.querySelector("#runBatchProvision").disabled = !valid.length || invalid.length > 0;
    document.querySelector("#exportBatchResult").disabled = true;
  }

  function renderResults(results) {
    const box = document.querySelector("#batchResult");
    const created = results.filter(item => item.status === "created").length;
    const reconciled = results.filter(item => item.status === "reconciled").length;
    const warnings = results.filter(item => item.status === "manual").length;
    const errors = results.filter(item => item.status === "error").length;
    box.innerHTML = `<div class="status-row"><span class="badge ok">${created} creados</span><span class="badge ok">${reconciled} reconciliados</span><span class="badge ${warnings ? "warn" : "ok"}">${warnings} requieren tratamiento</span><span class="badge ${errors ? "bad" : "ok"}">${errors} errores</span></div><div class="table-wrap"><table><thead><tr><th>Usuario</th><th>Resultado</th><th>UID</th></tr></thead><tbody>${results.map(item => `<tr><td><b>${escapeHtml(item.nombre)}</b><br>${escapeHtml(item.correo)}</td><td><span class="badge ${["created","reconciled"].includes(item.status) ? "ok" : item.status === "error" ? "bad" : "warn"}">${escapeHtml(item.detail)}</span></td><td><span class="small">${escapeHtml(item.uid || "—")}</span></td></tr>`).join("")}</tbody></table></div>`;
  }

  async function readBatchFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const parsed = JSON.parse(await file.text());
      const users = Array.isArray(parsed) ? parsed : parsed?.users;
      if (!Array.isArray(users)) throw new Error("El JSON debe contener un arreglo users.");
      const duplicates = new Set();
      const seen = new Set();
      users.forEach(user => {
        const email = normalizeEmail(user?.correo);
        if (seen.has(email)) duplicates.add(email);
        seen.add(email);
      });
      const validated = users.map((user, index) => {
        const item = validateUser(user, index);
        if (duplicates.has(item.correo)) item.issues.push("correo duplicado dentro del lote");
        return item;
      });
      renderPreview(validated);
      document.querySelector("#batchResult").innerHTML = "";
    } catch (error) {
      console.error(error);
      state.users = [];
      document.querySelector("#batchSummary").innerHTML = `<span class="badge bad">Archivo inválido: ${escapeHtml(error.message)}</span>`;
      document.querySelector("#batchPreview").innerHTML = "";
      document.querySelector("#runBatchProvision").disabled = true;
    }
  }

  async function runBatch() {
    const button = document.querySelector("#runBatchProvision");
    const resultBox = document.querySelector("#batchResult");
    if (!auth.currentUser) {
      resultBox.innerHTML = '<p class="bad">Debe iniciar sesión con una cuenta administradora.</p>';
      return;
    }
    button.disabled = true;
    state.results = [];
    resultBox.innerHTML = "<p>Reconciliando Authentication y perfiles por UID…</p>";
    for (const user of state.users) {
      try {
        state.results.push(await provisionOne(user));
      } catch (error) {
        console.error("Provisioning failed", user.correo, error);
        state.results.push({ correo: user.correo, nombre: user.nombre, status: "error", detail: error?.code || error?.message || "Error no identificado" });
      }
      renderResults(state.results);
    }
    document.querySelector("#exportBatchResult").disabled = !state.results.length;
    button.disabled = false;
  }

  function exportResults() {
    if (!state.results.length) return;
    const exportData = {
      version: VERSION,
      generatedAt: new Date().toISOString(),
      generatedBy: normalizeEmail(auth.currentUser?.email),
      warning: "El campo password solo aparece cuando la credencial preparada fue creada o validada. Custodie este archivo y no lo suba a repositorios.",
      totals: {
        processed: state.results.length,
        created: state.results.filter(item => item.status === "created").length,
        reconciled: state.results.filter(item => item.status === "reconciled").length,
        pending: state.results.filter(item => item.status === "manual").length,
        errors: state.results.filter(item => item.status === "error").length
      },
      results: state.results
    };
    const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: "application/json" });
    const link = document.createElement("a");
    link.href = URL.createObjectURL(blob);
    link.download = `smartrisk-reconciliacion-${new Date().toISOString().slice(0, 10)}.json`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function hydrate() {
    const adminArea = document.querySelector("#adminArea");
    if (!adminArea || document.querySelector("#batchProvisionPanel")) return;
    const auditPanel = document.querySelector("#auditProfiles")?.closest("section.panel");
    const section = document.createElement("section");
    section.id = "batchProvisionPanel";
    section.className = "panel";
    section.innerHTML = `
      <h2>Provisionamiento y reconciliación por lote</h2>
      <p class="muted">Carga un JSON local con correo, rol, alcance y clave inicial. SmartRisk verifica Authentication, obtiene el UID real y deja el perfil en <b>perfiles/{UID}</b>.</p>
      <p class="risk-note"><b>Seguridad:</b> las claves no se guardan en Firestore ni en GitHub. Si Authentication ya contiene el correo con una clave distinta, la cuenta se marca para recuperación o tratamiento con Admin SDK; no se altera su contraseña desde el navegador.</p>
      <div class="grid"><label class="full">Archivo de provisionamiento JSON<input id="batchProvisionFile" type="file" accept="application/json,.json"></label></div>
      <div id="batchSummary" class="status-row"></div>
      <div id="batchPreview" class="table-wrap"></div>
      <div class="actions"><button id="runBatchProvision" type="button" disabled>Reconciliar cuentas y perfiles</button><button id="exportBatchResult" type="button" class="secondary" disabled>Exportar resultado</button></div>
      <div id="batchResult" class="table-wrap"></div>`;
    adminArea.insertBefore(section, auditPanel || null);
    document.querySelector("#batchProvisionFile").addEventListener("change", readBatchFile);
    document.querySelector("#runBatchProvision").addEventListener("click", runBatch);
    document.querySelector("#exportBatchResult").addEventListener("click", exportResults);
  }

  hydrate();
  window.SMART_RISK_BATCH_PROVISION = { version: VERSION, mode: "auth-first-uid-canonical-reconciliation" };
})();
