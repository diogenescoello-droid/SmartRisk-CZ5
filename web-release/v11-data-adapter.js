(() => {
  "use strict";

  const ENTITY_KEYS = [
    "monitoringReports", "validations", "coeSessions", "decisions", "risks",
    "criticalSites", "actions", "institutions", "reports", "mapLayers",
    "conversations", "territories", "users", "plans", "audit", "other"
  ];

  const unique = values => [...new Set((values || []).filter(Boolean))];
  const normalizeText = value => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().toLowerCase();

  function normalizeScopeKeys(profile) {
    return unique([
      ...(Array.isArray(profile?.scopeKeys) ? profile.scopeKeys : []),
      ...(profile?.provinciaIds || []).map(id => `PROV:${id}`),
      ...(profile?.territorioIds || []).map(id => `TER:${id}`),
      ...(profile?.unidadIds || []).map(id => `UNI:${id}`),
      ...(profile?.institucionIds || []).map(id => `INST:${id}`)
    ]);
  }


  const ZONE5_PROVINCES = [
    { slug: "SANTA-ELENA", label: "Santa Elena" },
    { slug: "LOS-RIOS", label: "Los Ríos" },
    { slug: "GALAPAGOS", label: "Galápagos" },
    { slug: "BOLIVAR", label: "Bolívar" },
    { slug: "GUAYAS", label: "Guayas" }
  ];

  function canonicalProvince(value) {
    const normalized = normalizeText(String(value || "").replace(/^PROV:/i, "").replace(/^PROV-/i, "").replace(/_/g, " "));
    if (!normalized) return null;
    const found = ZONE5_PROVINCES.find(item => normalizeText(item.slug.replace(/-/g, " ")) === normalized || normalizeText(item.label) === normalized);
    if (found) return found.label;
    // Corrige fragmentos originados por IDs compuestos TER-LOS-RIOS y TER-SANTA-ELENA.
    if (normalized === "los" || normalized === "rios" || normalized === "los rios") return "Los Ríos";
    if (normalized === "santa" || normalized === "elena" || normalized === "santa elena") return "Santa Elena";
    return titleCaseSlug(value);
  }

  function timestampValue(value) {
    if (!value) return null;
    if (typeof value.toDate === "function") return value.toDate().toISOString();
    if (value.seconds) return new Date(value.seconds * 1000).toISOString();
    const date = new Date(value);
    return Number.isNaN(date.getTime()) ? null : date.toISOString();
  }

  function firstValue(payload, keys) {
    for (const key of keys) {
      const value = payload?.[key];
      if (value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return null;
  }

  function titleCaseSlug(value) {
    return String(value || "")
      .replace(/^(TER|PROV|INST|UNI):/i, "")
      .replace(/^(TER|PROV)-/i, "")
      .split("-")
      .filter(Boolean)
      .map(part => part.charAt(0).toUpperCase() + part.slice(1).toLowerCase())
      .join(" ")
      .replace(/\bDe\b/g, "de")
      .replace(/\bDel\b/g, "del")
      .replace(/\bLa\b/g, "La")
      .replace(/\bLos\b/g, "Los");
  }

  function territoryFromId(value) {
    const raw = String(value || "").replace(/^TER:/i, "").replace(/^TER-/i, "");
    if (!raw) return null;
    const upper = raw.toUpperCase();
    const province = ZONE5_PROVINCES.find(item => upper === item.slug || upper.startsWith(`${item.slug}-`));
    if (!province) return null;
    const cantonSlug = upper.slice(province.slug.length).replace(/^-/, "");
    return { provincia: province.label, canton: cantonSlug ? titleCaseSlug(cantonSlug) : null, id: `TER-${raw}` };
  }

  function provinceFromId(value) {
    return canonicalProvince(value);
  }

  function semanticType(rawType, payload = {}) {
    const type = normalizeText(rawType);
    const haystack = normalizeText([
      rawType, payload.tipo, payload.categoria, payload.modulo, payload.origen,
      payload.nombre, payload.titulo, payload.accion, payload.amenaza
    ].filter(Boolean).join(" "));

    if (/territorio|canton|provincia/.test(type) && (payload.canton || payload.provincia)) return "territories";
    if (/usuario|perfil|contacto/.test(type)) return "users";
    if (/institucion|actor coe|equipo coe|mesa|mtt|grupo de trabajo/.test(haystack)) return "institutions";
    if (/accion|actividad coe|tarea|compromiso/.test(type) || payload.accion || payload.fechaLimite || payload.avance !== undefined) return "actions";
    if (/sitio|punto critico|ubicacion|afectacion/.test(type) || payload.poblacionExpuesta || payload.elementosExpuestos) return "criticalSites";
    if (/riesgo|amenaza|vulnerabilidad/.test(type) || payload.nivelRiesgo || payload.amenaza) return "risks";
    if (/decision|resolucion/.test(type) || payload.pregunta || payload.opciones) return "decisions";
    if (/validacion/.test(type) || payload.validacion || payload.estadoValidacion) return "validations";
    if (/sesion|cabina|coe/.test(type) && !/actor|equipo|actividad/.test(type)) return "coeSessions";
    if (/monitoreo|ficha tecnica|pronostico|advertencia|alerta|reporte de monitoreo/.test(haystack)) return "monitoringReports";
    if (/capa|cartografia|geojson|kml|kmz|mapa/.test(haystack) || payload.features || payload.geometria || payload.geometry) return "mapLayers";
    if (/informe|reporte|caso/.test(type)) return "reports";
    if (/conversacion|mensaje|chat/.test(type)) return "conversations";
    if (/plan|revision/.test(type)) return "plans";
    if (/auditoria|bitacora/.test(type)) return "audit";
    return "other";
  }

  function normalizeRecord(record, sourceScopeKey) {
    const payload = record?.payload || record?.data || {};
    const sourceId = record?.sourceId || record?.id || null;
    const territoryId = firstValue(payload, ["territorioId", "territorio", "cantonId"]);
    const inferredTerritory = territoryFromId(territoryId || sourceScopeKey);
    const provinceId = firstValue(payload, ["provinciaId"]);
    const provinceFromScope = String(sourceScopeKey || "").startsWith("PROV:") ? provinceFromId(sourceScopeKey) : null;
    const provincia = canonicalProvince(firstValue(payload, ["provincia", "province"])) || inferredTerritory?.provincia || provinceFromId(provinceId) || provinceFromScope;
    const canton = firstValue(payload, ["canton", "cantón", "territory", "territorioNombre"]) || inferredTerritory?.canton;
    const rawType = record?.tipo || payload.tipo || payload.categoria || "Registro";
    const entityType = semanticType(rawType, payload);
    const title = firstValue(payload, [
      "nombre", "titulo", "acción", "accion", "descripcion", "canton", "institucion",
      "unidad", "numero", "codigo", "evento", "amenaza"
    ]) || sourceId || rawType || "Sin título";
    const detail = firstValue(payload, [
      "estado", "status", "resumen", "responsable", "dependencia", "provincia", "canton",
      "unidad", "institucion", "nivel", "nivelRiesgo", "prioridad"
    ]) || "Registro autorizado";
    const lat = Number(firstValue(payload, ["latitud", "latitude", "lat"]));
    const lng = Number(firstValue(payload, ["longitud", "longitude", "lng", "lon"]));

    return {
      id: sourceId || `${sourceScopeKey}:${Math.random().toString(36).slice(2)}`,
      sourceId,
      tipo: rawType,
      entityType,
      title: String(title),
      detail: String(detail),
      scopeKey: sourceScopeKey,
      payload,
      createdAt: timestampValue(record?.creadoEn || record?.createdAt || payload.creadoEn),
      updatedAt: timestampValue(record?.actualizadoEn || record?.updatedAt || payload.actualizadoEn),
      estado: firstValue(payload, ["estado", "status"]),
      prioridad: firstValue(payload, ["prioridad", "nivel", "nivelRiesgo", "criticidad"]),
      avance: Number(firstValue(payload, ["avance", "progreso", "porcentaje"])) || 0,
      responsable: firstValue(payload, ["responsable", "tecnico", "técnico", "asignadoA"]),
      institucion: firstValue(payload, ["institucion", "institución", "dependencia", "entidad"]),
      unidad: firstValue(payload, ["unidad", "mesa", "mtt", "grupoTrabajo"]),
      territorioId: territoryId || inferredTerritory?.id || null,
      provinciaId: provinceId || null,
      provincia,
      canton,
      coeId: firstValue(payload, ["coeId", "sesionId", "cabinaId"]),
      eventoId: firstValue(payload, ["eventoId"]),
      evento: firstValue(payload, ["evento", "tema", "problema", "amenaza"]),
      lat: Number.isFinite(lat) && Math.abs(lat) <= 90 ? lat : null,
      lng: Number.isFinite(lng) && Math.abs(lng) <= 180 ? lng : null
    };
  }

  function matchesFilters(record, filters = {}) {
    const same = (left, right) => !right || normalizeText(left) === normalizeText(right);
    return same(record.provincia, filters.provincia)
      && same(record.canton, filters.canton)
      && same(record.institucion, filters.institucion)
      && same(record.unidad, filters.unidad);
  }

  function humanScopeLabel(scopeKey) {
    const raw = String(scopeKey || "");
    if (raw.startsWith("TER:")) {
      const territory = territoryFromId(raw);
      return territory ? `${territory.canton} · ${territory.provincia}` : titleCaseSlug(raw);
    }
    if (raw.startsWith("PROV:")) return provinceFromId(raw);
    if (raw.startsWith("INST:")) return `Institución: ${titleCaseSlug(raw)}`;
    if (raw.startsWith("UNI:")) return `Unidad: ${titleCaseSlug(raw)}`;
    return titleCaseSlug(raw);
  }

  function buildState(records, profile, scopeKeys, errors, user) {
    const entities = Object.fromEntries(ENTITY_KEYS.map(key => [key, []]));
    records.forEach(record => entities[record.entityType]?.push(record));

    const territoryMap = new Map();
    entities.territories.forEach(record => {
      const id = record.payload?.id || record.territorioId || record.sourceId;
      if (id) territoryMap.set(id, { provincia: record.provincia, canton: record.canton });
    });
    records.forEach(record => {
      const territory = territoryMap.get(record.territorioId);
      if (territory) {
        record.provincia ||= territory.provincia;
        record.canton ||= territory.canton;
      }
    });

    const provincias = unique(records.map(item => canonicalProvince(item.provincia))).sort((a, b) => a.localeCompare(b, "es"));
    records.forEach(item => { if (item.provincia) item.provincia = canonicalProvince(item.provincia); });
    const cantones = unique(records.map(item => item.canton)).sort((a, b) => a.localeCompare(b, "es"));
    const instituciones = unique(records.map(item => item.institucion)).sort((a, b) => a.localeCompare(b, "es"));
    const unidades = unique(records.map(item => item.unidad)).sort((a, b) => a.localeCompare(b, "es"));
    const eventos = unique(records.map(item => item.evento)).sort((a, b) => a.localeCompare(b, "es"));
    const updated = records.map(item => item.updatedAt || item.createdAt).filter(Boolean).sort().at(-1) || null;

    return {
      user,
      profile,
      scopeKeys,
      scopeLabels: scopeKeys.map(humanScopeLabel),
      records,
      entities,
      grouped: entities,
      filters: { provincias, cantones, instituciones, unidades, eventos },
      errors,
      blocked: !scopeKeys.length,
      source: "scope-keys",
      updatedAtSource: updated,
      query(filters) { return records.filter(record => matchesFilters(record, filters)); },
      entity(key, filters) { return (entities[key] || []).filter(record => matchesFilters(record, filters)); }
    };
  }

  async function loadScopedRecords({ user, profile, db }) {
    const scopeKeys = normalizeScopeKeys(profile);
    const recordsMap = new Map();
    const errors = [];
    const roleText = normalizeText(`${profile?.rol || ""} ${profile?.codigoRol || ""}`);
    const email = normalizeText(user?.email);
    const isAdmin = roleText.includes("admin") || ["geopro.ec2@gmail.com", "dcoellom2@unemi.edu.ec"].includes(email);
    if (!scopeKeys.length && !isAdmin) return buildState([], profile, [], errors, user);

    if (isAdmin) {
      try {
        const canonical = await db.collection("registros").get();
        canonical.forEach(document => {
          const normalized = normalizeRecord({ id: document.id, ...document.data() }, "ZONAL:CZ5");
          recordsMap.set(normalized.sourceId || normalized.id, normalized);
        });
      } catch (error) {
        errors.push({ scopeKey: "ZONAL:CZ5", message: error?.message || "No fue posible consultar registros canónicos" });
      }
    }

    await Promise.all(scopeKeys.map(async scopeKey => {
      try {
        const snapshot = await db.collection("alcances").doc(scopeKey).collection("registros").get();
        snapshot.forEach(document => {
          const normalized = normalizeRecord({ id: document.id, ...document.data() }, scopeKey);
          const canonicalKey = normalized.sourceId || normalized.id;
          if (!recordsMap.has(canonicalKey)) recordsMap.set(canonicalKey, normalized);
        });
      } catch (error) {
        errors.push({ scopeKey, message: error?.message || "Error al consultar alcance" });
      }
    }));

    const records = [...recordsMap.values()].sort((a, b) => a.title.localeCompare(b.title, "es"));
    return buildState(records, profile, scopeKeys, errors, user);
  }

  window.SmartRiskV11DataAdapter = {
    ENTITY_KEYS,
    normalizeScopeKeys,
    normalizeRecord,
    semanticType,
    humanScopeLabel,
    loadScopedRecords
  };
})();
