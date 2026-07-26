(() => {
  "use strict";

  const SUPPORT_SCRIPTS = [
    "data.js",
    "enos-data.js",
    "enos-reviews.js",
    "risk-locations.js",
    "f03-data.js",
    "cases-data.js"
  ];

  const $ = selector => document.querySelector(selector);

  const normalizeEmail = value =>
    String(value || "").trim().toLowerCase();

  let applicationLoaded = false;
  let applicationLoading = false;

  function setLoginMessage(message = "") {
    if ($("#loginError")) {
      $("#loginError").textContent = message;
    }
  }

  function showLogin(message = "") {
    $("#app")?.classList.add("hidden");
    $("#login")?.classList.remove("hidden");
    $("#guideHelp")?.classList.add("hidden");
    $("#riskAnalyst")?.classList.add("hidden");

    setLoginMessage(message);
  }

  function setStatus(text, state = "local") {
    const status = $("#syncStatus");
    if (!status) return;

    status.textContent = text;
    status.className = `sync-status ${state}`;
  }

  function loadScript(source) {
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");

      script.src = source;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(
        new Error(`No fue posible cargar ${source}`)
      );

      document.body.appendChild(script);
    });
  }

  async function readProfile(user) {
    const result = await db
      .collection("perfiles")
      .doc(user.uid)
      .get();

    return result.exists ? result.data() : null;
  }

  async function loadUnifiedApplication(user, profile) {
    if (applicationLoaded || applicationLoading) return;

    applicationLoading = true;

    try {
      setStatus(
        "Preparando alcance territorial...",
        "saving"
      );

      window.SmartRiskScope.init({
        user,
        profile,
        db,
        auth
      });

      for (const source of SUPPORT_SCRIPTS) {
        await loadScript(source);
      }

      const repository =
        await window.SmartRiskScopeRepository.init({
          user,
          profile,
          db,
          auth
        });

      setStatus(
        `Cargando ${
          repository.scopeLabel ||
          "Coordinación Zonal 5"
        }...`,
        "saving"
      );

      await loadScript("app.js");

      applicationLoaded = true;
    } finally {
      applicationLoading = false;
    }
  }

  async function handleAuthenticatedUser(user) {
    setLoginMessage("");

    try {
      const profile = await readProfile(user);

      if (!profile || profile.estado !== "Activo") {
        showLogin(
          "Tu cuenta no tiene un perfil activo autorizado."
        );

        await auth.signOut();
        return;
      }

      await loadUnifiedApplication(user, profile);
    } catch (error) {
      console.error(error);

      showLogin(
        error?.message ||
        "No fue posible cargar la información autorizada."
      );

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
      setLoginMessage(
        "Correo o contraseña incorrectos."
      );
    }
  };

  $("#showRecovery").onclick = async () => {
    const email =
      normalizeEmail($("#email").value);

    if (!email) {
      setLoginMessage(
        "Escribe tu correo para recibir el enlace."
      );

      $("#email").focus();
      return;
    }

    try {
      auth.languageCode = "es";
      await auth.sendPasswordResetEmail(email);
    } catch (error) {
      console.error(
        "Error al solicitar restablecimiento:",
        error.code,
        error.message
      );
    }

    setLoginMessage(
      "Si el correo está registrado, recibirás " +
      "un enlace para definir una nueva contraseña."
    );
  };

  $("#logout").onclick = () => auth.signOut();

  $("#changePassword").onclick = async () => {
    const email =
      normalizeEmail(auth.currentUser?.email);

    if (!email) return;

    try {
      auth.languageCode = "es";
      await auth.sendPasswordResetEmail(email);
    } catch (error) {
      console.error(
        "Error al cambiar contraseña:",
        error.code,
        error.message
      );

      alert(
        "No fue posible enviar el enlace. Código: " +
        (error.code || "desconocido")
      );

      return;
    }

    alert(
      "Se solicitó un enlace para definir " +
      "una nueva contraseña."
    );
  };

  auth.onAuthStateChanged(async user => {
    if (user) {
      await handleAuthenticatedUser(user);
      return;
    }

    if (applicationLoaded) {
      localStorage.removeItem(
        "smartrisk-cz5-data-v1"
      );

      localStorage.removeItem(
        "smartrisk-active-territorial-scope"
      );

      location.reload();
      return;
    }

    showLogin();
  });

  window.SMART_RISK_ACCESS_GATE = {
    version: "13.2.0",
    mode: "unified-application-by-scope",
    support:
      "diogenes.coello@gestionderiesgos.gob.ec"
  };
})();