(() => {
  "use strict";

  const ADMIN_EMAILS = new Set([
    "geopro.ec2@gmail.com",
    "dcoellom2@unemi.edu.ec",
    "diogenes.coello@gestionderiesgos.gob.ec"
  ]);
  const catalog = window.SmartRiskAccessCatalog;
  const normalize = catalog?.normalize || (value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase());
  const list = value => Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
  const unique = values => [...new Set(values.filter(Boolean))];
  const clone = value => typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));

  let state = null;

  function values(profile, names) {
    return unique(names.flatMap(name => list(profile?.[name])));
  }

  function canonicalRole(profile) {
    const original = profile?.rol || profile?.codigoRol || "Técnico territorial";
    return catalog?.canonicalRole(original) || original;
  }

  function init({ user, profile }) {
    const normalizedProfile = catalog?.normalizeProfile(profile) || { ...profile };
    const originalRole = normalizedProfile.rolInstitucional || normalizedProfile.rol || normalizedProfile.codigoRol || "Técnico territorial";
    const role = canonicalRole(normalizedProfile);
    const territoryIds = values(normalizedProfile, ["territorioIds", "territoryIds", "cantonIds"]);
    const provinceIds = values(normalizedProfile, ["provinciaIds", "provinceIds"]);
    const cantons = values(normalizedProfile, ["canton", "cantones", "cantonNombre"]);
    const provinces = values(normalizedProfile, ["provincia", "provincias", "provinciaNombre"]);
    const administrator = ADMIN_EMAILS.has(normalize(user?.email)) || role === "Administrador";
    const readOnly = !administrator && (catalog?.isReadOnly(originalRole, normalizedProfile) || normalize(normalizedProfile?.modoAcceso) === "consulta");

    let scopeType = administrator ? "zonal" : (catalog?.inferScopeType(normalizedProfile) || "cantonal");
    const existingScopeKeys = values(normalizedProfile, ["scopeKeys"]);
    if (!administrator) {
      if (existingScopeKeys.some(key => String(key).startsWith("ZONA:"))) scopeType = "zonal";
      else if (scopeType !== "zonal" && existingScopeKeys.some(key => String(key).startsWith("PROV:"))) scopeType = "provincial";
      else if (!existingScopeKeys.length && !cantons.length && !territoryIds.length && (provinces.length || provinceIds.length) && scopeType === "cantonal") scopeType = "provincial";
    }

    const scopeKeys = unique([
      ...existingScopeKeys,
      ...(scopeType === "zonal" ? ["ZONA:CZ5"] : []),
      ...provinceIds.map(id => String(id).startsWith("PROV:") ? String(id) : `PROV:${id}`),
      ...territoryIds.map(id => String(id).startsWith("TER:") ? String(id) : `TER:${id}`),
      ...values(normalizedProfile, ["unidadIds"]).map(id => String(id).startsWith("UNI:") ? String(id) : `UNI:${id}`),
      ...values(normalizedProfile, ["institucionIds"]).map(id => String(id).startsWith("INST:") ? String(id) : `INST:${id}`)
    ]);

    const appRole = administrator ? "Coordinador COE" : role;
    state = {
      user,
      profile: { ...normalizedProfile, scopeKeys },
      originalRole,
      role,
      appRole,
      administrator,
      readOnly,
      scopeType,
      territoryIds,
      provinceIds,
      cantons,
      provinces,
      scopeKeys,
      territories: []
    };

    window.SMART_RISK_PROFILE = { ...state.profile };
    document.documentElement.dataset.smartRiskScope = scopeType;
    document.documentElement.dataset.smartRiskMode = readOnly ? "consulta" : "operacion";
    return api;
  }

  function territoryMatches(item) {
    if (!state || state.administrator || state.scopeType === "zonal") return true;
    if (state.territoryIds.length && state.territoryIds.includes(item?.id)) return true;
    if (state.scopeType === "cantonal") {
      if (state.cantons.length) return state.cantons.map(normalize).includes(normalize(item?.canton));
      return state.scopeKeys.some(key => String(key) === `TER:${item?.id}` || String(key) === item?.id);
    }
    const allowed = [...state.provinces, ...state.provinceIds].map(normalize);
    if (allowed.includes(normalize(item?.provincia))) return true;
    return state.scopeKeys.some(key => normalize(String(key).replace(/^PROV:/i, "")) === normalize(item?.provincia));
  }

  function recordMatches(item, territoryIds, siteIds, actionIds, sessionIds = new Set()) {
    if (!state || state.administrator || state.scopeType === "zonal") return true;
    if (!item || typeof item !== "object") return false;
    const territory = item.territorio || item.territorioId || item.territoryId || item.cantonId;
    if (territory && territoryIds.has(territory)) return true;
    if (item.sitioId && siteIds.has(item.sitioId)) return true;
    if (item.accionId && actionIds.has(item.accionId)) return true;
    if (item.sesionId && sessionIds.has(item.sesionId)) return true;
    const canton = item.canton || item.municipio || item.cantonNombre || item.territorioNombre;
    if (canton && state.territories.some(row => normalize(row.canton) === normalize(canton))) return true;
    const province = item.provincia || item.province || item.provinciaNombre;
    return state.scopeType === "provincial" && province && state.territories.some(row => normalize(row.provincia) === normalize(province));
  }

  function filterData(input) {
    if (!state) return clone(input || {});
    const output = clone(input || {});
    if (state.administrator || state.scopeType === "zonal") {
      state.territories = Array.isArray(output.territorios) ? output.territorios : [];
      output._scopeView = {
        type: "zonal",
        role: state.role,
        mode: state.readOnly ? "Consulta" : "Operación",
        territoryIds: state.territories.map(item => item?.id).filter(Boolean),
        generatedAt: new Date().toISOString()
      };
      return output;
    }

    output.territorios = (output.territorios || []).filter(territoryMatches);
    state.territories = output.territorios;
    const territoryIds = new Set(output.territorios.map(item => item.id));
    output.sitios = (output.sitios || []).filter(item => recordMatches(item, territoryIds, new Set(), new Set()));
    const siteIds = new Set(output.sitios.map(item => item.id));
    output.acciones = (output.acciones || []).filter(item => recordMatches(item, territoryIds, siteIds, new Set()));
    const actionIds = new Set(output.acciones.map(item => item.id));

    output.entidadesSeguimiento = (output.entidadesSeguimiento || []).filter(item => recordMatches(item, territoryIds, siteIds, actionIds));
    output.seguimientos = (output.seguimientos || []).filter(item => recordMatches(item, territoryIds, siteIds, actionIds));
    output.sesionesCabina = (output.sesionesCabina || []).filter(item => recordMatches(item, territoryIds, siteIds, actionIds));
    const sessionIds = new Set(output.sesionesCabina.map(item => item.id));

    ["decisiones", "validaciones", "actoresCOE", "equiposCOE", "actividadesCOE", "capasGeograficas", "tareasCabina", "cartografiaOperativa", "planes", "revisiones", "informes", "recursos", "alertas"].forEach(key => {
      if (Array.isArray(output[key])) output[key] = output[key].filter(item => recordMatches(item, territoryIds, siteIds, actionIds, sessionIds));
    });

    output.instituciones = (output.instituciones || []).filter(item => {
      if (recordMatches(item, territoryIds, siteIds, actionIds, sessionIds)) return true;
      const name = normalize(item?.nombre || item?.institucion || item?.razonSocial);
      return state.territories.some(row => name.includes(normalize(row.canton)));
    });
    output.usuarios = (output.usuarios || []).filter(item => normalize(item?.correo) === normalize(state.user?.email) || recordMatches(item, territoryIds, siteIds, actionIds, sessionIds));
    output.fichasTecnicas = (output.fichasTecnicas || []).filter(item => {
      const itemCantons = list(item?.cantones || item?.canton).map(normalize);
      const itemProvinces = list(item?.provincias || item?.provincia).map(normalize);
      return state.territories.some(row => itemCantons.includes(normalize(row.canton)) || (state.scopeType === "provincial" && itemProvinces.includes(normalize(row.provincia))));
    });
    output.auditoria = (output.auditoria || []).filter(item => normalize(item?.by) === normalize(state.user?.email) || recordMatches(item, territoryIds, siteIds, actionIds, sessionIds));
    output._scopeView = {
      type: state.scopeType,
      role: state.role,
      mode: state.readOnly ? "Consulta" : "Operación",
      territoryIds: [...territoryIds],
      generatedAt: new Date().toISOString()
    };
    return output;
  }

  function scopeLabel() {
    if (!state) return "Sin alcance";
    if (state.scopeType === "zonal") return "Coordinación Zonal 5";
    if (state.scopeType === "provincial") return `Provincia ${state.territories[0]?.provincia || state.provinces[0] || "asignada"}`;
    const territory = state.territories[0];
    return territory ? `${territory.canton} · ${territory.provincia}` : (state.cantons[0] || "Cantón sin asignar");
  }

  const api = {
    init,
    filterData,
    scopeLabel,
    isAdministrator: () => Boolean(state?.administrator),
    isReadOnly: () => Boolean(state?.readOnly),
    canAdminUsers: () => Boolean(state?.administrator),
    canRead: () => Boolean(state),
    canWrite: module => Boolean(state && !state.readOnly && (state.administrator || !["usuarios", "perfiles", "configuracion"].includes(module))),
    scopeKeys: () => [...(state?.scopeKeys || [])],
    availableTerritories: () => [...(state?.territories || [])],
    currentTerritory: () => state?.scopeType === "zonal" ? null : state?.territories?.[0] || null,
    getState: () => state ? { ...state, user: undefined } : null,
    getAppProfile: () => state ? {
      ...state.profile,
      rol: state.appRole,
      rolInstitucional: state.originalRole,
      modoAcceso: state.readOnly ? "Consulta" : "Operación",
      _smartRiskOriginalRole: state.role,
      _smartRiskScopeType: state.scopeType
    } : null
  };

  window.SmartRiskScope = api;
})();
