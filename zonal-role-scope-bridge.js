(() => {
  "use strict";

  const api = window.SmartRiskScope;
  if (!api || api.__zonalRoleScopeBridge) return;

  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
  const clone = value => typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));

  const original = {
    init: api.init.bind(api),
    filterData: api.filterData.bind(api),
    scopeLabel: api.scopeLabel.bind(api),
    canWrite: api.canWrite.bind(api),
    scopeKeys: api.scopeKeys.bind(api),
    availableTerritories: api.availableTerritories.bind(api),
    currentTerritory: api.currentTerritory.bind(api),
    getState: api.getState.bind(api),
    getAppProfile: api.getAppProfile.bind(api)
  };

  let zonalRole = false;
  let readOnly = false;
  let profileSnapshot = null;
  let territories = [];

  function isZonalProfile(profile) {
    const text = normalize(`${profile?.rol || ""} ${profile?.codigoRol || ""} ${profile?.rolInstitucional || ""}`);
    return text.includes("zonal") && !text.includes("admin");
  }

  api.init = args => {
    const result = original.init(args);
    profileSnapshot = { ...(args?.profile || {}) };
    zonalRole = isZonalProfile(args?.profile);
    readOnly = normalize(args?.profile?.modoAcceso) === "consulta"
      || normalize(args?.profile?.rol).includes("visor")
      || normalize(args?.profile?.rol).includes("consulta");
    if (zonalRole) {
      document.documentElement.dataset.smartRiskScope = "zonal";
      document.documentElement.dataset.smartRiskMode = readOnly ? "consulta" : "operacion";
    }
    return result;
  };

  api.filterData = input => {
    if (!zonalRole) return original.filterData(input);
    const output = clone(input || {});
    territories = Array.isArray(output.territorios) ? output.territorios : [];
    output._scopeView = {
      type: "zonal",
      role: profileSnapshot?.rol || profileSnapshot?.codigoRol || "Técnico zonal",
      mode: readOnly ? "Consulta" : "Operación",
      territoryIds: territories.map(item => item?.id).filter(Boolean),
      generatedAt: new Date().toISOString()
    };
    return output;
  };

  api.scopeLabel = () => zonalRole ? "Coordinación Zonal 5" : original.scopeLabel();
  api.canWrite = module => zonalRole
    ? Boolean(!readOnly && !["usuarios", "perfiles", "configuracion"].includes(module))
    : original.canWrite(module);
  api.availableTerritories = () => zonalRole ? [...territories] : original.availableTerritories();
  api.currentTerritory = () => zonalRole ? null : original.currentTerritory();
  api.getState = () => {
    const state = original.getState() || {};
    if (!zonalRole) return state;
    return {
      ...state,
      role: profileSnapshot?.rol || profileSnapshot?.codigoRol || "Técnico zonal",
      originalRole: profileSnapshot?.rolInstitucional || profileSnapshot?.rol || profileSnapshot?.codigoRol || "Técnico zonal",
      administrator: false,
      readOnly,
      scopeType: "zonal",
      territories: [...territories]
    };
  };
  api.getAppProfile = () => {
    const appProfile = original.getAppProfile() || { ...(profileSnapshot || {}) };
    if (!zonalRole) return appProfile;
    return {
      ...appProfile,
      rol: profileSnapshot?.rol || profileSnapshot?.codigoRol || "Técnico zonal",
      rolInstitucional: profileSnapshot?.rolInstitucional || profileSnapshot?.rol || profileSnapshot?.codigoRol || "Técnico zonal",
      modoAcceso: readOnly ? "Consulta" : "Operación",
      _smartRiskOriginalRole: "Técnico zonal",
      _smartRiskScopeType: "zonal"
    };
  };

  api.__zonalRoleScopeBridge = {
    version: "1.0.0",
    isActive: () => zonalRole,
    description: "Técnico zonal conserva alcance Zona 5 sin privilegios administrativos"
  };
})();
