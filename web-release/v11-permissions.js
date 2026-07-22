(() => {
  "use strict";

  const UNIVERSAL_MODULES = [
    "inicio", "respuesta-coe", "monitoreo", "coe", "riesgos", "acciones",
    "instituciones", "reportes", "mapas", "herramientas", "configuracion"
  ];

  function normalizeRole(profile) {
    const raw = `${profile?.rol || ""} ${profile?.codigoRol || ""}`.toLowerCase();
    if (raw.includes("admin")) return "admin";
    if (raw.includes("zonal")) return "zonal";
    if (raw.includes("provinc") || raw.includes("prefect")) return "provincial";
    if (raw.includes("mtt") || raw.includes("gt") || raw.includes("unidad")) return "unidad";
    if (raw.includes("instit")) return "institucion";
    if (raw.includes("tecn") || raw.includes("territorial")) return "tecnico";
    if (raw.includes("decisi") || raw.includes("control")) return "decision";
    return "usuario";
  }

  function getPermissions(profile) {
    const role = normalizeRole(profile);
    const isAdmin = role === "admin";
    const canEscalate = ["admin", "zonal", "provincial", "unidad", "institucion", "decision"].includes(role);
    return {
      role,
      modules: [...UNIVERSAL_MODULES],
      pilotReadOnly: true,
      canView: () => true,
      canViewModule: moduleId => UNIVERSAL_MODULES.includes(moduleId),
      canCreate: () => false,
      canEdit: () => false,
      canAssign: () => false,
      canValidate: () => false,
      canClose: () => false,
      canEscalate: () => canEscalate,
      canManageUsers: () => isAdmin,
      canViewAdministration: () => isAdmin
    };
  }

  window.SmartRiskV11Permissions = { UNIVERSAL_MODULES, normalizeRole, getPermissions };
})();
