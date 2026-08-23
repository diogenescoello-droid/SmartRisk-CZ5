(() => {
  "use strict";

  const UNIVERSAL_MODULES = [
    "inicio", "dashboard", "respuesta-coe", "monitoreo", "coe", "riesgos", "acciones",
    "instituciones", "reportes", "mapas", "herramientas", "configuracion"
  ];
  const ADMIN_ONLY = new Set(["usuarios", "perfiles", "configuracion"]);
  const WRITER_ROLES = new Set(["admin", "zonal", "provincial", "unidad", "institucion", "tecnico"]);
  const ASSIGN_ROLES = new Set(["admin", "zonal", "provincial", "unidad"]);
  const VALIDATE_ROLES = new Set(["admin", "zonal"]);
  const ESCALATE_ROLES = new Set(["admin", "zonal", "provincial", "unidad", "institucion", "decision"]);

  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  function profileText(profile) {
    return normalize(`${profile?.rol || ""} ${profile?.codigoRol || ""} ${profile?.rolInstitucional || ""}`);
  }

  function normalizeRole(profile) {
    const raw = profileText(profile);
    if (raw.includes("admin")) return "admin";
    if (raw.includes("visor") || raw.includes("consulta")) return "decision";
    if (raw.includes("zonal")) return "zonal";
    if (raw.includes("provinc") || raw.includes("prefect")) return "provincial";
    if (raw.includes("mtt") || raw.includes("gt") || raw.includes("unidad") || raw.includes("coe")) return "unidad";
    if (raw.includes("instit")) return "institucion";
    if (raw.includes("tecn") || raw.includes("territorial") || raw.includes("municipal") || raw.includes("cantonal")) return "tecnico";
    if (raw.includes("decisi") || raw.includes("control")) return "decision";
    return "usuario";
  }

  function isReadOnly(profile) {
    const mode = normalize(profile?.modoAcceso);
    const raw = profileText(profile);
    return mode === "consulta" || raw.includes("visor") || raw.includes("consulta");
  }

  function canOperateEntity(entity) {
    return !ADMIN_ONLY.has(normalize(entity));
  }

  function getPermissions(profile) {
    const role = normalizeRole(profile);
    const readOnly = isReadOnly(profile);
    const isAdmin = role === "admin";
    const writer = !readOnly && WRITER_ROLES.has(role);
    const assigner = !readOnly && ASSIGN_ROLES.has(role);
    const validator = !readOnly && VALIDATE_ROLES.has(role);

    return {
      role,
      modules: [...UNIVERSAL_MODULES],
      pilotReadOnly: readOnly,
      operationalMode: readOnly ? "consulta" : "operacion",
      canView: () => true,
      canViewModule: moduleId => UNIVERSAL_MODULES.includes(moduleId),
      canCreate: entity => writer && (isAdmin || canOperateEntity(entity)),
      canEdit: entity => writer && (isAdmin || canOperateEntity(entity)),
      canAssign: entity => assigner && (isAdmin || canOperateEntity(entity)),
      canValidate: entity => validator && (isAdmin || canOperateEntity(entity)),
      canClose: entity => validator && (isAdmin || canOperateEntity(entity)),
      canEscalate: () => !readOnly && ESCALATE_ROLES.has(role),
      canManageUsers: () => isAdmin,
      canViewAdministration: () => isAdmin
    };
  }

  window.SmartRiskV11Permissions = {
    UNIVERSAL_MODULES,
    normalizeRole,
    isReadOnly,
    getPermissions
  };
})();
