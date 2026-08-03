(() => {
  "use strict";

  const COMPATIBLE_READ_ROLES = new Map([
    ["visor provincial ame", "Tomador de decisión/control"],
    ["visor zonal ame", "Tomador de decisión/control"],
    ["consulta provincial ame", "Tomador de decisión/control"]
  ]);

  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  const DocumentReference = firebase?.firestore?.DocumentReference;
  const prototype = DocumentReference?.prototype;
  if (!prototype?.get || prototype.__smartRiskRoleCompatibilityInstalled) return;

  const originalGet = prototype.get;

  prototype.get = async function (...args) {
    const snapshot = await originalGet.apply(this, args);
    const path = String(this?.path || "");
    if (!path.startsWith("perfiles/")) return snapshot;

    return new Proxy(snapshot, {
      get(target, property) {
        if (property === "data") {
          return (...dataArgs) => {
            const profile = target.data(...dataArgs);
            if (!profile || typeof profile !== "object") return profile;

            const originalRole = profile.rol || profile.codigoRol || "";
            const compatibleRole = COMPATIBLE_READ_ROLES.get(normalize(originalRole));
            if (!compatibleRole) return profile;

            return {
              ...profile,
              rol: compatibleRole,
              rolInstitucional: originalRole,
              modoAcceso: "Consulta"
            };
          };
        }

        const value = Reflect.get(target, property, target);
        return typeof value === "function" ? value.bind(target) : value;
      }
    });
  };

  prototype.__smartRiskRoleCompatibilityInstalled = true;
})();
