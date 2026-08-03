(() => {
  "use strict";

  function installGuard() {
    if (!window.firebase?.auth) return;
    const instance = firebase.auth();
    const prototype = Object.getPrototypeOf(instance);
    if (!prototype || prototype.__smartRiskProvisioningGuard) return;
    const original = prototype.createUserWithEmailAndPassword;
    if (typeof original !== "function") return;

    prototype.createUserWithEmailAndPassword = async function () {
      const error = new Error(
        "Por seguridad, SmartRisk ya no crea cuentas de Authentication desde el navegador. "
        + "Cree el usuario en Firebase Console o con Firebase Admin SDK y vincule su UID en access-admin.html."
      );
      error.code = "auth/admin-provisioning-required";
      throw error;
    };
    prototype.__smartRiskProvisioningGuard = true;
  }

  installGuard();
})();
