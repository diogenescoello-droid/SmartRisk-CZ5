(() => {
  "use strict";

  const ADMIN_EMAILS = new Set([
    "geopro.ec2@gmail.com",
    "dcoellom2@unemi.edu.ec",
    "diogenes.coello@gestionderiesgos.gob.ec"
  ]);

  function normalizeEmail(value) {
    return String(value || "").trim().toLowerCase();
  }

  function installTemporaryAccessFallback() {
    if (!window.firebase?.auth) return;

    const primaryAuth = firebase.auth();
    const authPrototype = Object.getPrototypeOf(primaryAuth);
    if (!authPrototype || authPrototype.__smartRiskTemporaryAccessFallback) return;

    const originalCreateUser = authPrototype.createUserWithEmailAndPassword;
    if (typeof originalCreateUser !== "function") return;

    authPrototype.createUserWithEmailAndPassword = async function (email, password) {
      const credential = await originalCreateUser.call(this, email, password);
      const administratorEmail = normalizeEmail(primaryAuth.currentUser?.email);

      if (ADMIN_EMAILS.has(administratorEmail)) {
        const access = {
          email: normalizeEmail(email),
          temporaryPassword: String(password),
          createdAt: new Date().toISOString()
        };

        window.SMART_RISK_LAST_TEMPORARY_ACCESS = access;

        const text = [
          "SmartRisk CZ5 — acceso temporal creado",
          "",
          `Usuario: ${access.email}`,
          `Contraseña temporal: ${access.temporaryPassword}`,
          "",
          "Entregue estos datos únicamente al usuario correspondiente.",
          "Al ingresar, deberá cambiar inmediatamente la contraseña."
        ].join("\n");

        try {
          await navigator.clipboard.writeText(
            `Usuario: ${access.email}\nContraseña temporal: ${access.temporaryPassword}`
          );
        } catch (_) {
          // El navegador puede bloquear el portapapeles; el acceso igualmente se muestra.
        }

        alert(`${text}\n\nLos datos también se intentaron copiar al portapapeles.`);
      }

      return credential;
    };

    authPrototype.__smartRiskTemporaryAccessFallback = true;
  }

  installTemporaryAccessFallback();
})();
