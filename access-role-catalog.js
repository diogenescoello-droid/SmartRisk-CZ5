(() => {
  "use strict";

  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  const definitions = [
    { role: "Administrador", scopeType: "zonal", level: "Administración zonal", mode: "Operación", aliases: ["administrador", "admin"] },
    { role: "Técnico zonal", scopeType: "zonal", level: "Zonal", mode: "Operación", aliases: ["tecnico zonal", "técnico zonal"] },
    { role: "Técnico provincial", scopeType: "provincial", level: "Provincial", mode: "Operación", aliases: ["tecnico provincial", "técnico provincial", "tecnico prefectura", "técnico prefectura"] },
    { role: "Técnico territorial", scopeType: "cantonal", level: "Cantonal", mode: "Operación", aliases: ["usuario territorial", "tecnico territorial", "técnico territorial", "tecnico cantonal", "técnico cantonal", "tecnico municipal", "técnico municipal"] },
    { role: "Coordinador COE", scopeType: "zonal", level: "Zonal", mode: "Operación", aliases: ["coordinador coe", "coordinador del coe"] },
    { role: "Líder MTT/GT", scopeType: "assigned", level: "Según alcance", mode: "Operación", aliases: ["lider mtt/gt", "líder mtt/gt", "lider mtt", "líder mtt", "lider gt", "líder gt"] },
    { role: "Tomador de decisión/control", scopeType: "assigned", level: "Según alcance", mode: "Operación", aliases: ["tomador de decision/control", "tomador de decisión/control", "tomador de decision", "tomador de decisión"] },
    { role: "Visor provincial AME", scopeType: "provincial", level: "Provincial", mode: "Consulta", aliases: ["visor provincial ame"] },
    { role: "Visor zonal AME", scopeType: "zonal", level: "Consulta zonal", mode: "Consulta", aliases: ["visor zonal ame"] },
    { role: "Consulta provincial AME", scopeType: "provincial", level: "Provincial", mode: "Consulta", aliases: ["consulta provincial ame"] }
  ];

  const byAlias = new Map();
  definitions.forEach(definition => {
    byAlias.set(normalize(definition.role), definition);
    definition.aliases.forEach(alias => byAlias.set(normalize(alias), definition));
  });

  function resolve(value) {
    return byAlias.get(normalize(value)) || null;
  }

  function canonicalRole(value) {
    return resolve(value)?.role || String(value || "").trim();
  }

  function isSupported(value) {
    return Boolean(resolve(value));
  }

  function isReadOnly(value, profile = {}) {
    const definition = resolve(value);
    return definition?.mode === "Consulta" || normalize(profile?.modoAcceso) === "consulta";
  }

  function inferScopeType(profile = {}) {
    const definition = resolve(profile.rol || profile.codigoRol || profile.rolInstitucional);
    const keys = Array.isArray(profile.scopeKeys) ? profile.scopeKeys : [];
    if (definition?.scopeType && definition.scopeType !== "assigned") return definition.scopeType;
    if (keys.some(key => String(key).startsWith("ZONA:"))) return "zonal";
    if (keys.some(key => String(key).startsWith("PROV:"))) return "provincial";
    if (keys.some(key => String(key).startsWith("TER:"))) return "cantonal";
    const level = normalize(profile.nivelAcceso);
    if (level.includes("zonal")) return "zonal";
    if (level.includes("provinc")) return "provincial";
    return "cantonal";
  }

  function normalizeProfile(profile = {}) {
    const originalRole = profile.rolInstitucional || profile.rol || profile.codigoRol || "";
    const definition = resolve(originalRole);
    const role = definition?.role || String(originalRole || "").trim();
    const scopeType = inferScopeType({ ...profile, rol: role });
    const mode = isReadOnly(originalRole, profile) ? "Consulta" : (profile.modoAcceso || definition?.mode || "Operación");
    const level = profile.nivelAcceso || (scopeType === "zonal" ? "Zonal" : scopeType === "provincial" ? "Provincial" : "Cantonal");
    return {
      ...profile,
      rol: role,
      rolInstitucional: originalRole,
      modoAcceso: mode,
      nivelAcceso: level,
      _smartRiskScopeType: scopeType
    };
  }

  window.SmartRiskAccessCatalog = Object.freeze({
    version: "2026.08.24.1",
    definitions: definitions.map(item => ({ ...item, aliases: [...item.aliases] })),
    roles: definitions.map(item => item.role),
    normalize,
    resolve,
    canonicalRole,
    isSupported,
    isReadOnly,
    inferScopeType,
    normalizeProfile
  });
})();
