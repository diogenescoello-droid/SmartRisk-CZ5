(() => {
  "use strict";

  const ADMIN_ALLOWLIST = new Set([
    "geopro.ec2@gmail.com",
    "dcoellom2@unemi.edu.ec"
  ]);

  const LEGACY_SCRIPTS = [
    "data.js", "enos-data.js", "enos-reviews.js",
    "risk-locations.js", "f03-data.js", "cases-data.js", "app.js"
  ];

  const $ = selector => document.querySelector(selector);
  const normalizeEmail = value => String(value || "").trim().toLowerCase();
  let legacyLoaded = false;
  let legacyLoading = false;
  let scopedLoaded = false;

  function setLoginMessage(message = "") {
    if ($("#loginError")) $("#loginError").textContent = message;
  }

  function showLogin(message = "") {
    $("#app")?.classList.add("hidden");
    $("#login")?.classList.remove("hidden");
    $("#guideHelp")?.classList.add("hidden");
    $("#riskAnalyst")?.classList.add("hidden");
    setLoginMessage(message);
  }

  function setStatus(text, state = "local") {
    if (!$("#syncStatus")) return;
    $("#syncStatus").textContent = text;
    $("#syncStatus").className = `sync-status ${state}`;
  }

  function isAdministrator(user) {
    return ADMIN_ALLOWLIST.has(normalizeEmail(user?.email));
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = src;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`No fue posible cargar ${src}`));
      document.body.appendChild(script);
    });
  }

  async function loadAdministratorApplication() {
    if (legacyLoaded || legacyLoading) return;
    legacyLoading = true;
    setStatus("Cargando administración zonal...", "saving");
    try {
      for (const src of LEGACY_SCRIPTS) await loadScript(src);
      legacyLoaded = true;
    } finally {
      legacyLoading = false;
    }
  }

  async function loadScopedApplication(user, profile) {
    if (!scopedLoaded) {
      await loadScript("scoped-app.js");
      scopedLoaded = true;
    }
    await window.SmartRiskScoped.start({ user, profile, db, auth });
  }

  async function readProfile(user) {
    const snapshot = await db.collection("perfiles").doc(user.uid).get();
    return snapshot.exists ? snapshot.data() : null;
  }

  async function handleAuthenticatedUser(user) {
    setLoginMessage("");
    let profile;
    try {
      profile = await readProfile(user);
    } catch (error) {
      console.error(error);
      showLogin("No fue posible verificar tu perfil.");
      await auth.signOut();
      return;
    }

    if (!profile || profile.estado !== "Activo") {
      showLogin("Tu cuenta no tiene un perfil activo autorizado.");
      await auth.signOut();
      return;
    }

    try {
      // Fase 1: V11 Rollout - decidir qué aplicación cargar
      if (window.SmartRiskV11Rollout && window.SmartRiskV11Rollout.decide) {
        setStatus("Determinando versión de aplicación...", "saving");
        const handledByV11 = await window.SmartRiskV11Rollout.decide(user, profile, db, auth);
        if (!handledByV11) {
          if (isAdministrator(user)) await loadAdministratorApplication();
          else await loadScopedApplication(user, profile);
        }
      } else {
        if (isAdministrator(user)) await loadAdministratorApplication();
        else await loadScopedApplication(user, profile);
      }
    } catch (error) {
      console.error(error);
      showLogin("No fue posible cargar la información autorizada.");
      await auth.signOut();
    }
  }

  $("#loginForm").onsubmit = async event => {
    event.preventDefault();
    setLoginMessage("");
    try {
      await auth.signInWithEmailAndPassword(
        normalizeEmail($("#email").value),
        $("#password").value
      );
      $("#password").value = "";
    } catch {
      setLoginMessage("Correo o contraseña incorrectos.");
    }
  };

  $("#showRecovery").onclick = async () => {
    const email = normalizeEmail($("#email").value);
    if (!email) {
      setLoginMessage("Escribe tu correo para recibir el enlace.");
      $("#email").focus();
      return;
    }
    try {
      await auth.sendPasswordResetEmail(email, {
        url: location.origin + location.pathname
      });
    } catch {}
    setLoginMessage("Si el correo está registrado, recibirás un enlace para definir una nueva contraseña.");
  };

  $("#logout").onclick = () => auth.signOut();

  $("#changePassword").onclick = async () => {
    const email = normalizeEmail(auth.currentUser?.email);
    if (!email) return;
    try {
      await auth.sendPasswordResetEmail(email, {
        url: location.origin + location.pathname
      });
    } catch {}
    alert("Se solicitó un enlace para definir una nueva contraseña.");
  };

  auth.onAuthStateChanged(async user => {
    if (user) {
      await handleAuthenticatedUser(user);
      return;
    }
    if (legacyLoaded || scopedLoaded) {
      location.reload();
      return;
    }
    showLogin();
  });

  window.SMART_RISK_ACCESS_GATE = {
    version: "10.3.3",
    mode: "scope-paths-read-only",
    support: "diogenes.coello@gestionderiesgos.gob.ec"
  };
})();
