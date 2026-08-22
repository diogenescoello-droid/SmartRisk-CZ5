(() => {
  "use strict";

  const RELEASE = window.SMART_RISK_RELEASE || {
    release: "V1.0.0 PILOTO ESTABLE",
    build: "1.0.0-piloto-estable"
  };
  const BUILD_VERSION = RELEASE.build;
  const SUPPORT_SCRIPTS = [
    "smartrisk-operational-core.js",
    "data.js",
    "enos-data.js",
    "enos-reviews.js",
    "enos-matrix-preliminary.js",
    "enos-matrix-ui.js",
    "plan-sources.js",
    "risk-locations.js",
    "f03-data.js",
    "cases-data.js",
    "pilot-baseline-data.js",
    "f07-current-data.js",
    "pilot-baseline-bridge.js"
  ];
  const FEATURE_SCRIPTS = [
    "access-core.js",
    "access-ui.js",
    "access-form.js",
    "action-r023-core.js",
    "action-r023-page.js",
    "action-r023-form.js",
    "latest-data-update.js",
    "followup-completion-20260730.js",
    "los-rios-plan-correction-20260730.js",
    "scientific-quality-fix-20260731.js",
    "plan-receipt-status-fix-20260731.js",
    "review-performance-fix-20260731.js",
    "risk-reports-5y-data.js",
    "risk-reports-5y-ui.js",
    "risk-reports-map-layer-20260803.js",
    "territorial-scope-guard-20260731.js"
  ];
  const SUPPORTED_ROLES = new Set([
    "Administrador",
    "Técnico territorial",
    "Coordinador COE",
    "Líder MTT/GT",
    "Tomador de decisión/control"
  ]);
  const ROLE_ALIASES = new Map([
    ["usuario territorial", "Técnico territorial"],
    ["tecnico territorial", "Técnico territorial"],
    ["coordinador coe", "Coordinador COE"],
    ["lider mtt/gt", "Líder MTT/GT"],
    ["tomador de decision/control", "Tomador de decisión/control"],
    ["visor provincial ame", "Tomador de decisión/control"],
    ["visor zonal ame", "Tomador de decisión/control"],
    ["consulta provincial ame", "Tomador de decisión/control"],
    ["administrador", "Administrador"]
  ]);

  const $ = selector => document.querySelector(selector);
  const normalizeEmail = value => String(value || "").trim().toLowerCase();
  const normalizeText = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  let loaded = false;
  let loading = false;
  let pendingLoginPassword = "";

  function startInterfaceTransition() {
    document.body.classList.add("interface-loading");
    if (document.querySelector("#interfaceLoading")) return;
    document.body.insertAdjacentHTML("beforeend", `<section id="interfaceLoading" class="interface-loading-screen" role="status" aria-live="polite">
      <div><span class="interface-loading-mark">SR</span><h2>Preparando SmartRisk</h2><p>Cargando su territorio, acciones y cartografía…</p><i></i></div>
    </section>`);
  }

  function finishInterfaceTransition() {
    document.body.classList.remove("interface-loading");
    document.querySelector("#interfaceLoading")?.remove();
  }

  function loginMessage(message = "") {
    if ($("#loginError")) $("#loginError").textContent = message;
  }

  function showLogin(message = "") {
    finishInterfaceTransition();
    $("#app")?.classList.add("hidden");
    $("#login")?.classList.remove("hidden");
    $("#guideHelp")?.classList.add("hidden");
    $("#riskAnalyst")?.classList.add("hidden");
    loginMessage(message);
  }

  function status(text, state = "local") {
    if (!$("#syncStatus")) return;
    $("#syncStatus").textContent = text;
    $("#syncStatus").className = `sync-status ${state}`;
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${src}?v=${BUILD_VERSION}`;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`No fue posible cargar ${src}`));
      document.body.appendChild(script);
    });
  }

  function canonicalRole(profile) {
    const original = profile?.rol || profile?.codigoRol || "";
    return ROLE_ALIASES.get(normalizeText(original)) || original;
  }

  function normalizeProfile(profile) {
    if (!profile || typeof profile !== "object") return null;
    const originalRole = profile.rol || profile.codigoRol || "";
    const role = canonicalRole(profile);
    const readOnly = normalizeText(originalRole).includes("visor")
      || normalizeText(originalRole).includes("consulta")
      || profile.modoAcceso === "Consulta";
    return {
      ...profile,
      rol: role,
      rolInstitucional: originalRole,
      modoAcceso: readOnly ? "Consulta" : (profile.modoAcceso || "Operación")
    };
  }

  function profileProblem(user, profile) {
    if (!profile) return "Tu cuenta existe en Authentication, pero no tiene un perfil vinculado en Firestore.";
    if (profile.estado !== "Activo") return "Tu perfil está inactivo o suspendido.";
    const authEmail = normalizeEmail(user?.email);
    const profileEmail = normalizeEmail(profile.correo);
    if (profileEmail && authEmail !== profileEmail) {
      return "El correo de Authentication no coincide con el correo del perfil. El administrador debe corregir la vinculación por UID.";
    }
    if (!SUPPORTED_ROLES.has(profile.rol)) {
      return `El rol “${profile.rol || "sin definir"}” no está habilitado en esta versión.`;
    }
    const scopeKeys = Array.isArray(profile.scopeKeys) ? profile.scopeKeys.filter(Boolean) : [];
    if (profile.rol !== "Administrador" && !scopeKeys.length && !profile.canton && !profile.provincia) {
      return "El perfil no tiene un alcance territorial o institucional asignado.";
    }
    return "";
  }

  function authErrorMessage(error) {
    const code = String(error?.code || "");
    const messages = {
      "auth/invalid-email": "El formato del correo no es válido.",
      "auth/user-disabled": "La cuenta está deshabilitada en Firebase Authentication.",
      "auth/user-not-found": "No existe una cuenta de Authentication con este correo.",
      "auth/wrong-password": "La contraseña no es correcta.",
      "auth/invalid-credential": "El correo o la contraseña no son correctos.",
      "auth/too-many-requests": "Demasiados intentos. Espere unos minutos antes de volver a probar.",
      "auth/network-request-failed": "No fue posible conectarse con Firebase. Revise la conexión.",
      "auth/operation-not-allowed": "El acceso por correo y contraseña no está habilitado en Firebase Authentication."
    };
    return messages[code] || "No fue posible autenticar la cuenta. Informe el código al administrador.";
  }

  function recoveryErrorMessage(error) {
    const code = String(error?.code || "");
    if (code === "auth/invalid-email") return "El formato del correo no es válido.";
    if (code === "auth/too-many-requests") return "Se realizaron demasiadas solicitudes. Espere unos minutos.";
    if (code === "auth/network-request-failed") return "No fue posible conectarse con el servicio de autenticación.";
    if (code === "auth/operation-not-allowed") return "La recuperación por correo no está habilitada.";
    console.error("Error al solicitar recuperación de contraseña", error);
    return "Firebase no pudo generar el correo de recuperación. Use la credencial temporal entregada por el administrador.";
  }

  async function requestPasswordReset(email) {
    await auth.sendPasswordResetEmail(email);
  }

  async function readProfile(user) {
    const snap = await db.collection("perfiles").doc(user.uid).get();
    return snap.exists ? normalizeProfile(snap.data()) : null;
  }

  function passwordProblem(value) {
    if (String(value).length < 12) return "Use al menos 12 caracteres.";
    if (!/[A-Z]/.test(value)) return "Incluya una letra mayúscula.";
    if (!/[a-z]/.test(value)) return "Incluya una letra minúscula.";
    if (!/\d/.test(value)) return "Incluya un número.";
    if (!/[^\w\s]/.test(value)) return "Incluya un símbolo.";
    return "";
  }

  async function requireFirstPasswordChange(user, profile) {
    if (!profile.requiereCambioClave) return true;
    if (!pendingLoginPassword) {
      await auth.signOut();
      showLogin("Por seguridad, vuelva a ingresar con la contraseña temporal para definir una contraseña personal.");
      return false;
    }

    return new Promise(resolve => {
      const dialog = document.createElement("dialog");
      dialog.innerHTML = `<form class="dialog-body">
        <h3>Definir contraseña personal</h3>
        <p class="muted">Este cambio es obligatorio antes de abrir SmartRisk. La contraseña temporal dejará de funcionar.</p>
        <label>Nueva contraseña</label><input name="newPassword" type="password" autocomplete="new-password" required>
        <label>Confirmar contraseña</label><input name="confirmation" type="password" autocomplete="new-password" required>
        <div class="form-error error" role="alert"></div>
        <div class="dialog-actions"><button type="submit">Actualizar y continuar</button></div>
      </form>`;
      document.body.append(dialog);
      dialog.showModal();
      const form = dialog.querySelector("form");
      form.onsubmit = async event => {
        event.preventDefault();
        const values = Object.fromEntries(new FormData(form));
        const errorBox = dialog.querySelector(".form-error");
        const validation = passwordProblem(values.newPassword);
        if (validation) { errorBox.textContent = validation; return; }
        if (values.newPassword !== values.confirmation) {
          errorBox.textContent = "Las contraseñas no coinciden.";
          return;
        }
        if (values.newPassword === pendingLoginPassword) {
          errorBox.textContent = "La nueva contraseña debe ser diferente de la temporal.";
          return;
        }
        try {
          const credential = firebase.auth.EmailAuthProvider.credential(user.email, pendingLoginPassword);
          await user.reauthenticateWithCredential(credential);
          await user.updatePassword(values.newPassword);
          await db.collection("perfiles").doc(user.uid).set({
            requiereCambioClave: false,
            claveActualizadaEn: firebase.firestore.FieldValue.serverTimestamp()
          }, { merge: true });
          pendingLoginPassword = "";
          dialog.close();
          dialog.remove();
          resolve(true);
        } catch (error) {
          console.error(error);
          errorBox.textContent = authErrorMessage(error);
        }
      };
    });
  }

  async function loadApplication(user, profile) {
    if (loaded || loading) return;
    loading = true;
    try {
      status("Preparando alcance autorizado...", "saving");
      window.SmartRiskScope.init({ user, profile, db, auth });
      for (const src of SUPPORT_SCRIPTS) await loadScript(src);
      await window.SmartRiskScopeRepository.init({ user, profile, db, auth });
      if (window.SmartRiskV11Rollout?.decide) {
        status("Aplicando interfaz territorial RC15...", "saving");
        const v11Enabled = await window.SmartRiskV11Rollout.decide(user, profile);
        if (v11Enabled) {
          loaded = true;
          finishInterfaceTransition();
          return;
        }
      }
      status(`Cargando ${window.SmartRiskScope.scopeLabel()}...`, "saving");
      await loadScript("app.js");
      for (const src of FEATURE_SCRIPTS) await loadScript(`modules/${src}`);
      loaded = true;
      finishInterfaceTransition();
    } finally {
      loading = false;
    }
  }

  async function handle(user) {
    loginMessage("");
    try {
      const profile = await readProfile(user);
      const problem = profileProblem(user, profile);
      if (problem) {
        await auth.signOut();
        showLogin(problem);
        return;
      }
      if (!await requireFirstPasswordChange(user, profile)) return;
      startInterfaceTransition();
      await loadApplication(user, { ...profile, requiereCambioClave: false });
    } catch (error) {
      console.error(error);
      await auth.signOut();
      showLogin("No fue posible leer o validar el perfil autorizado. Revise UID, correo, rol, estado y reglas de Firestore.");
    }
  }

  $("#loginForm").onsubmit = async event => {
    event.preventDefault();
    loginMessage("");
    const email = normalizeEmail($("#email").value);
    pendingLoginPassword = $("#password").value;
    try {
      await auth.signInWithEmailAndPassword(email, pendingLoginPassword);
      $("#password").value = "";
    } catch (error) {
      pendingLoginPassword = "";
      loginMessage(authErrorMessage(error));
    }
  };

  $("#showRecovery").onclick = async () => {
    const email = normalizeEmail($("#email").value);
    if (!email) {
      loginMessage("Escriba primero el correo exacto registrado en Authentication.");
      $("#email").focus();
      return;
    }
    loginMessage("Solicitando correo de recuperación...");
    try {
      await requestPasswordReset(email);
      loginMessage("Solicitud aceptada por Firebase. Revise Recibidos, Spam y Promociones. Si no llega, use la credencial temporal entregada por el administrador.");
    } catch (error) {
      loginMessage(recoveryErrorMessage(error));
    }
  };

  $("#logout").onclick = () => auth.signOut();
  $("#changePassword").onclick = async () => {
    const email = normalizeEmail(auth.currentUser?.email);
    if (!email) return;
    try {
      await requestPasswordReset(email);
      alert("Firebase aceptó la solicitud de recuperación. Revise también Spam y Promociones.");
    } catch (error) {
      alert(recoveryErrorMessage(error));
    }
  };

  auth.onAuthStateChanged(async user => {
    if (user) {
      await handle(user);
      return;
    }
    pendingLoginPassword = "";
    if (loaded) {
      localStorage.removeItem("smartrisk-cz5-data-v1");
      location.reload();
      return;
    }
    showLogin();
  });

  window.SMART_RISK_ACCESS_GATE = {
    version: BUILD_VERSION,
    release: RELEASE.release,
    mode: "uid-profile-scope-canonical-artifact",
    provisioning: "Firebase Console or Admin SDK only",
    support: "diogenes.coello@gestionderiesgos.gob.ec"
  };
})();
