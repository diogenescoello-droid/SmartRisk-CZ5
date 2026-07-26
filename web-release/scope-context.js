(() => {
  "use strict";

  const ROLE_CODES = Object.freeze({
    ADMIN_ZONAL: "ADMIN_ZONAL",
    TECNICO_PROVINCIAL: "TECNICO_PROVINCIAL",
    TECNICO_CANTONAL: "TECNICO_CANTONAL"
  });

  const VALID_ROLE_CODES = new Set(
    Object.values(ROLE_CODES)
  );

  const normalize = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();

  const asList = value => {
    if (Array.isArray(value)) return value.filter(Boolean);
    return value ? [value] : [];
  };

  const unique = values => [...new Set(values.filter(Boolean))];

  const clone = value => {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };

  let state = null;

  function profileValues(profile, fields) {
    return unique(
      fields.flatMap(field => asList(profile?.[field]))
    );
  }

  function scopeKeysFromProfile(profile) {
    return unique([
      ...profileValues(profile, ["scopeKeys"]),
      ...profileValues(profile, [
        "territorioIds",
        "territoryIds",
        "cantonIds"
      ]).map(id => `TER:${id}`),
      ...profileValues(profile, [
        "provinciaIds",
        "provinceIds"
      ]).map(id => `PROV:${id}`)
    ]);
  }

  function buildState(user, profile) {
    const role = String(profile?.rol || "").trim();
    const roleKey = normalize(role);

    let roleCode = String(
      profile?.codigoRol || ""
    ).trim().toUpperCase();

    if (!VALID_ROLE_CODES.has(roleCode)) {
      if (roleKey.includes("administrador")) {
        roleCode = ROLE_CODES.ADMIN_ZONAL;
      } else if (roleKey.includes("provincial")) {
        roleCode = ROLE_CODES.TECNICO_PROVINCIAL;
      } else if (
        roleKey.includes("territorial") ||
        roleKey.includes("municipal") ||
        roleKey.includes("cantonal")
      ) {
        roleCode = ROLE_CODES.TECNICO_CANTONAL;
      } else {
        throw new Error(
          "Perfil con rol no autorizado. " +
          "Asigna codigoRol ADMIN_ZONAL, " +
          "TECNICO_PROVINCIAL o TECNICO_CANTONAL."
        );
      }
    }

    const administrator =
      roleCode === ROLE_CODES.ADMIN_ZONAL;

    const scopeType =
      roleCode === ROLE_CODES.ADMIN_ZONAL
        ? "zonal"
        : roleCode === ROLE_CODES.TECNICO_PROVINCIAL
          ? "provincial"
          : "cantonal";

    const territoryIds = profileValues(profile, [
      "territorioIds",
      "territoryIds",
      "cantonIds",
      "territorioId",
      "territoryId",
      "cantonId"
    ]);

    const cantonNames = profileValues(profile, [
      "canton",
      "cantones",
      "cantonNombre",
      "municipio",
      "territorio"
    ]);

    const provinceIds = profileValues(profile, [
      "provinciaIds",
      "provinceIds",
      "provinciaId",
      "provinceId"
    ]);

    const provinceNames = profileValues(profile, [
      "provincia",
      "provincias",
      "provinciaNombre"
    ]);

    const scopeKeys = scopeKeysFromProfile(profile);

    scopeKeys.forEach(key => {
      if (key.startsWith("TER:")) {
        territoryIds.push(key.slice(4));
      }

      if (key.startsWith("PROV:")) {
        provinceIds.push(key.slice(5));
      }
    });

    return {
      user,
      profile: { ...profile },
      role,
      roleCode,
      appRole: administrator ? "Administrador" : "Coordinador COE",
      administrator,
      scopeType,
      territoryIds: unique(territoryIds),
      cantonNames: unique(cantonNames),
      provinceIds: unique(provinceIds),
      provinceNames: unique(provinceNames),
      scopeKeys,
      territories: []
    };
  }

  function matchesToken(value, allowedValues) {
    const current = normalize(value);

    return allowedValues.some(allowed => {
      const expected = normalize(allowed);

      return current === expected ||
        current.includes(expected) ||
        expected.includes(current);
    });
  }

  function resolveTerritories(catalog = []) {
    if (!state) throw new Error("SmartRiskScope no está inicializado.");

    if (state.administrator) {
      state.territories = clone(catalog);
      return state.territories;
    }

    let territories = [];

    if (state.scopeType === "cantonal") {
      territories = catalog.filter(item =>
        state.territoryIds.some(id =>
          normalize(item.id) === normalize(id) ||
          normalize(item.id) === normalize(`TER:${id}`)
        ) ||
        matchesToken(item.canton, state.cantonNames)
      );

      if (!territories.length) {
        throw new Error(
          "El perfil cantonal no tiene un cantón válido asignado. " +
          "Registra canton, territorioIds o un scopeKey TER."
        );
      }
    }

    if (state.scopeType === "provincial") {
      territories = catalog.filter(item =>
        matchesToken(item.provincia, [
          ...state.provinceNames,
          ...state.provinceIds
        ])
      );

      if (!territories.length) {
        throw new Error(
          "El perfil provincial no tiene una provincia válida asignada."
        );
      }
    }

    state.territories = territories;

    state.scopeKeys = unique([
      ...state.scopeKeys,
      ...territories.map(item => `TER:${item.id}`)
    ]);

    return clone(territories);
  }

  function allowedTerritoryIds() {
    return new Set(
      (state?.territories || []).map(item => normalize(item.id))
    );
  }

  function allowedCantonNames() {
    return new Set(
      (state?.territories || []).map(item => normalize(item.canton))
    );
  }

  function allowedProvinceNames() {
    return new Set(
      (state?.territories || []).map(item => normalize(item.provincia))
    );
  }

  function arrayContainsAllowed(values, allowed) {
    return asList(values).some(value => allowed.has(normalize(value)));
  }

  function directlyMatches(item) {
    if (!state || state.administrator) return true;
    if (!item || typeof item !== "object") return false;

    const territoryIds = allowedTerritoryIds();
    const cantons = allowedCantonNames();
    const provinces = allowedProvinceNames();

    const directTerritories = [
      item.territorioId,
      item.territoryId,
      item.cantonId,
      item.territorio,
      item.territory
    ];

    if (directTerritories.some(value =>
      territoryIds.has(normalize(value))
    )) {
      return true;
    }

    if (
      arrayContainsAllowed(item.territorioIds, territoryIds) ||
      arrayContainsAllowed(item.territorios, territoryIds) ||
      arrayContainsAllowed(item.vinculos?.territorios, territoryIds)
    ) {
      return true;
    }

    const directCantons = [
      item.canton,
      item.cantón,
      item.municipio,
      item.cantonNombre,
      item.territorioNombre
    ];

    if (directCantons.some(value => cantons.has(normalize(value)))) {
      return true;
    }

    if (arrayContainsAllowed(item.cantones, cantons)) {
      return true;
    }

    if (state.scopeType === "provincial") {
      const directProvinces = [
        item.provincia,
        item.province,
        item.provinciaNombre
      ];

      if (directProvinces.some(value =>
        provinces.has(normalize(value))
      )) {
        return true;
      }

      if (arrayContainsAllowed(item.provincias, provinces)) {
        return true;
      }
    }

    return false;
  }

  function filterData(source) {
    if (!state) throw new Error("SmartRiskScope no está inicializado.");

    const output = clone(source || {});

    if (state.administrator) return output;

    const catalog = Array.isArray(output.territorios)
      ? output.territorios
      : [];

    output.territorios = resolveTerritories(catalog);

    const territoryIds = new Set(
      output.territorios.map(item => item.id)
    );

    output.sitios = (output.sitios || []).filter(item =>
      directlyMatches(item)
    );

    const siteIds = new Set(
      output.sitios.map(item => item.id)
    );

    output.acciones = (output.acciones || []).filter(item =>
      directlyMatches(item) ||
      siteIds.has(item.sitioId)
    );

    const actionIds = new Set(
      output.acciones.map(item => item.id)
    );

    output.sesionesCabina = (output.sesionesCabina || []).filter(item =>
      directlyMatches(item) ||
      territoryIds.has(item.territorioId)
    );

    const sessionIds = new Set(
      output.sesionesCabina.map(item => item.id)
    );

    const scopedCollections = [
      "decisiones",
      "validaciones",
      "actoresCOE",
      "equiposCOE",
      "actividadesCOE",
      "capasGeograficas",
      "tareasCabina",
      "cartografiaOperativa",
      "planes",
      "revisiones",
      "informes",
      "recursos",
      "alertas"
    ];

    scopedCollections.forEach(key => {
      if (!Array.isArray(output[key])) return;

      output[key] = output[key].filter(item =>
        directlyMatches(item) ||
        siteIds.has(item.sitioId) ||
        actionIds.has(item.accionId) ||
        sessionIds.has(item.sesionId)
      );
    });

    output.instituciones = (output.instituciones || []).filter(item => {
      if (directlyMatches(item)) return true;

      const name = normalize(
        item.nombre ||
        item.institucion ||
        item.razonSocial
      );

      return state.territories.some(territory =>
        name.includes(normalize(territory.canton))
      );
    });

    output.usuarios = (output.usuarios || []).filter(item =>
      normalize(item.correo || item.email) ===
      normalize(state.user?.email)
    );

    output.fichasTecnicas = (output.fichasTecnicas || []).filter(item =>
      directlyMatches(item)
    );

    output.auditoria = (output.auditoria || []).filter(item =>
      normalize(item.by || item.correo || item.email) ===
      normalize(state.user?.email) ||
      directlyMatches(item)
    );

    output._smartRiskScope = {
      type: state.scopeType,
      role: state.role,
      territoryIds: output.territorios.map(item => item.id),
      generatedAt: new Date().toISOString()
    };

    return output;
  }

  function scopeLabel() {
    if (!state) return "Sin alcance";

    if (state.administrator) {
      return "Coordinación Zonal 5";
    }

    if (state.scopeType === "provincial") {
      const province =
        state.territories[0]?.provincia ||
        state.provinceNames[0] ||
        state.provinceIds[0];

      return `Provincia ${province || "asignada"}`;
    }

    const territory = state.territories[0];

    if (territory) {
      return `${territory.canton} · ${territory.provincia}`;
    }

    return state.cantonNames[0] || "Cantón sin asignar";
  }

  function init({ user, profile }) {
    state = buildState(user, profile || {});

    document.documentElement.dataset.smartRiskScope =
      state.scopeType;

    return api;
  }

  const api = {
    init,
    resolveTerritories,
    filterData,
    scopeLabel,

    isAdministrator() {
      return Boolean(state?.administrator);
    },

    canAdminUsers() {
      return Boolean(state?.administrator);
    },

    canRead() {
      return Boolean(state);
    },

    canWrite(module) {
      if (!state) return false;
      if (state.administrator) return true;

      return ![
        "usuarios",
        "perfiles",
        "configuracion"
      ].includes(module);
    },

    scopeKeys() {
      return [...(state?.scopeKeys || [])];
    },

    availableTerritories() {
      return clone(state?.territories || []);
    },

    currentTerritory() {
      return clone(state?.territories?.[0] || null);
    },

    getState() {
      if (!state) return null;

      return {
        role: state.role,
        roleCode: state.roleCode,
        scopeType: state.scopeType,
        administrator: state.administrator,
        territoryIds: [...state.territoryIds],
        cantonNames: [...state.cantonNames],
        provinceIds: [...state.provinceIds],
        provinceNames: [...state.provinceNames],
        scopeKeys: [...state.scopeKeys],
        territories: clone(state.territories)
      };
    },

    getApplicationProfile() {
      if (!state) return null;

      return {
        ...state.profile,
        rol: state.appRole,
        codigoRol: state.roleCode,
        _smartRiskOriginalRole: state.role,
        _smartRiskScopeType: state.scopeType
      };
    }
  };

  window.SmartRiskScope = api;
})();