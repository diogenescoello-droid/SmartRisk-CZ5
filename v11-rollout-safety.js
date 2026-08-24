(() => {
  "use strict";

  const rollout = window.SmartRiskV11Rollout;
  if (!rollout || rollout.__safeZonalStartup) return;

  const originalDecide = rollout.decide.bind(rollout);
  const normalize = value => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().toLowerCase();
  const unique = values => [...new Set((values || []).filter(Boolean))];

  function isZonal(profile) {
    const text = normalize(`${profile?.rol || ""} ${profile?.codigoRol || ""} ${profile?.rolInstitucional || ""}`);
    return text.includes("zonal") && !text.includes("admin");
  }

  function sourceType(key) {
    return ({
      territorios: "territorio",
      instituciones: "institucion",
      usuarios: "usuario",
      sitios: "sitio",
      infraestructura: "infraestructura",
      acciones: "accion",
      alojamientos: "alojamiento",
      capacidades: "capacidad",
      recursos: "recurso",
      seguimientos: "seguimiento",
      evidencias: "evidencia",
      entidadesSeguimiento: "seguimiento",
      decisiones: "decision",
      validaciones: "validacion",
      auditoria: "auditoria",
      actoresCOE: "actor coe",
      equiposCOE: "equipo coe",
      actividadesCOE: "actividad coe",
      capasGeograficas: "capa geografica",
      sesionesCabina: "sesion coe",
      tareasCabina: "tarea",
      cartografiaOperativa: "cartografia",
      fichasTecnicas: "ficha tecnica",
      planes: "plan",
      revisiones: "revision",
      informes: "informe",
      alertas: "alerta"
    })[key] || key;
  }

  function zonalDataFromRuntime(user, profile) {
    const adapter = window.SmartRiskV11DataAdapter;
    if (!adapter?.normalizeRecord) return null;
    let data = null;
    try { data = JSON.parse(localStorage.getItem("smartrisk-cz5-data-v1") || "null"); } catch (_) {}
    if (!data || typeof data !== "object") return null;

    const records = [];
    Object.entries(data).forEach(([key, rows]) => {
      if (!Array.isArray(rows)) return;
      rows.forEach((row, index) => {
        if (!row || typeof row !== "object") return;
        const id = row.id || row.codigo || row.code || `zonal-${key}-${index + 1}`;
        records.push(adapter.normalizeRecord({ id, tipo: sourceType(key), payload: row }, "ZONA:CZ5"));
      });
    });

    const entities = Object.fromEntries((adapter.ENTITY_KEYS || []).map(key => [key, []]));
    records.forEach(record => {
      if (!entities[record.entityType]) entities[record.entityType] = [];
      entities[record.entityType].push(record);
    });
    records.sort((a, b) => String(a.title || "").localeCompare(String(b.title || ""), "es"));
    const provincias = unique(records.map(item => item.provincia)).sort((a,b)=>a.localeCompare(b,"es"));
    const cantones = unique(records.map(item => item.canton)).sort((a,b)=>a.localeCompare(b,"es"));
    const instituciones = unique(records.map(item => item.institucion)).sort((a,b)=>a.localeCompare(b,"es"));
    const unidades = unique(records.map(item => item.unidad)).sort((a,b)=>a.localeCompare(b,"es"));
    const eventos = unique(records.map(item => item.evento)).sort((a,b)=>a.localeCompare(b,"es"));
    const dates = records.map(item => item.updatedAt || item.createdAt).filter(Boolean).sort();

    return {
      user,
      profile,
      scopeKeys: ["ZONA:CZ5"],
      scopeLabels: ["Coordinación Zonal 5"],
      records,
      entities,
      grouped: entities,
      normalization: { derived: 0, sourcePlans: entities.plans?.length || 0, mode: "zonal-runtime" },
      filters: { provincias, cantones, instituciones, unidades, eventos },
      errors: [],
      blocked: false,
      source: "zonal-runtime-scope",
      updatedAtSource: dates.at(-1) || null,
      query(filters = {}) {
        const same = (a,b) => !b || normalize(a) === normalize(b);
        return records.filter(record => same(record.provincia, filters.provincia) && same(record.canton, filters.canton));
      },
      entity(key) { return entities[key] || []; }
    };
  }

  function repairZonalRuntime(user, profile) {
    if (!isZonal(profile)) return false;
    const app = window.SmartRiskV11App;
    if (!app?.state) return false;
    const zonalData = zonalDataFromRuntime(user, profile);
    if (!zonalData) return false;
    app.state.data = zonalData;
    app.state.filters.provincia = "";
    app.state.filters.canton = "";
    app.state.filters.evento = "";
    try { app.render(location.hash); } catch (error) { console.warn("No fue posible repintar la vista zonal", error); }
    return true;
  }

  rollout.decide = async (user, profile) => {
    try {
      const enabled = await originalDecide(user, profile);
      if (enabled) repairZonalRuntime(user, profile);
      return enabled;
    } catch (error) {
      console.error("Fallo durante el arranque V11", error);
      // Si la aplicación alcanzó a iniciar, conservar la sesión y reparar la vista.
      if (window.SmartRiskV11App?.state?.user) {
        repairZonalRuntime(user, profile);
        return true;
      }
      // Si falló antes de iniciar V11, permitir que access-gate continúe con la interfaz compatible.
      return false;
    }
  };

  rollout.__safeZonalStartup = {
    version: "1.0.0",
    behavior: "authenticated-session-never-dropped-by-v11-render-error"
  };
})();
