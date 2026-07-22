(() => {
  "use strict";

  const ENTITY_KEYS = [
    "monitoringReports", "validations", "coeSessions", "decisions", "risks",
    "criticalSites", "actions", "institutions", "reports", "mapLayers",
    "conversations", "territories", "users", "plans", "breaches", "audit", "other"
  ];

  const unique = values => [...new Set((values || []).filter(Boolean))];
  const normalizeText = value => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .trim().toLowerCase();

  // RC9_PLAN_NORMALIZER: integra campos planos y estructuras anidadas sin escribir en Firestore.
  const isPlainObject = value => Boolean(value) && typeof value === "object"
    && !Array.isArray(value) && typeof value.toDate !== "function";

  function structuredPayload(record) {
    const topLevel = {};
    Object.entries(record || {}).forEach(([key, value]) => {
      if (!["id", "sourceId", "payload", "data", "tipo"].includes(key)) topLevel[key] = value;
    });
    const nestedData = isPlainObject(record?.data) ? record.data : {};
    const nestedPayload = isPlainObject(record?.payload) ? record.payload : {};
    return { ...topLevel, ...nestedData, ...nestedPayload };
  }

  function numericValue(value) {
    if (Number.isFinite(Number(value))) return Number(value);
    const match = String(value ?? "").replace(",", ".").match(/-?\d+(?:\.\d+)?/);
    return match ? Number(match[0]) : 0;
  }

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
    if (/\bplan\b|revision/.test(type)) return "plans";
    if (/institucion|actor coe|equipo coe|mesa|mtt|grupo de trabajo/.test(haystack)) return "institutions";
    if (/brecha|debilidad|limitacion|hallazgo|necesidad|nudo critico/.test(haystack)) return "breaches";
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
    const payload = structuredPayload(record);
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
      "nombre", "titulo", "acción", "accion", "actividad", "tarea", "compromiso", "medida", "brecha", "hallazgo", "descripcion", "canton", "institucion",
      "unidad", "numero", "codigo", "evento", "amenaza"
    ]) || sourceId || rawType || "Sin título";
    const detail = firstValue(payload, [
      "estado", "status", "resumen", "descripcion", "observacion", "responsable", "dependencia", "provincia", "canton",
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
      avance: Math.max(0, Math.min(100, numericValue(firstValue(payload, ["avance", "progreso", "porcentaje", "porcentajeAvance", "cumplimiento"])))),
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


  const PLAN_ACTION_PATH = /accion|actividad|tarea|compromiso|cronograma|medida|intervencion|producto|linea de accion|meta operativa/;
  const PLAN_BREACH_PATH = /brecha|debilidad|limitacion|problema|hallazgo|necesidad|nudo critico|aspecto por mejorar/;
  const PLAN_RISK_PATH = /riesgo|amenaza|sitio critico|escenario|afectacion|vulnerabilidad/;
  const PLAN_CONTACT_PATH = /contacto|directorio|actor|institucion|equipo|participante|responsables/;
  const PLAN_ALERT_PATH = /alerta|advertencia|vigilancia|monitoreo/;

  function parseStructuredValue(value) {
    if (typeof value !== "string") return value;
    const trimmed = value.trim();
    if (!trimmed || !/^[\[{]/.test(trimmed)) return value;
    try { return JSON.parse(trimmed); } catch (_) { return value; }
  }

  function directAlias(source, aliases) {
    if (!isPlainObject(source)) return null;
    const aliasSet = new Set(aliases.map(normalizeText));
    for (const [key, value] of Object.entries(source)) {
      if (aliasSet.has(normalizeText(key)) && value !== undefined && value !== null && String(value).trim() !== "") return value;
    }
    return null;
  }

  function setCanonical(target, key, aliases) {
    if (target[key] !== undefined && target[key] !== null && String(target[key]).trim() !== "") return;
    const value = directAlias(target, aliases);
    if (value !== null) target[key] = value;
  }

  function looksLikePlanRow(value) {
    if (!isPlainObject(value)) return typeof value === "string" || typeof value === "number";
    const entries = Object.entries(value);
    if (!entries.length) return false;
    const primitiveCount = entries.filter(([, item]) => item === null || ["string", "number", "boolean"].includes(typeof item)).length;
    const descriptor = entries.some(([key]) => /nombre|titulo|descripcion|accion|actividad|tarea|brecha|amenaza|responsable|institucion|estado|prioridad|avance|correo|telefono|cargo|fecha/.test(normalizeText(key)));
    return descriptor || primitiveCount >= Math.max(1, Math.ceil(entries.length / 3));
  }

  function classifyPlanNode(path, value) {
    if (!looksLikePlanRow(value)) return [];
    const pathText = normalizeText(path.join(" "));
    const keys = isPlainObject(value) ? Object.keys(value).map(normalizeText) : [];
    const hasField = pattern => keys.some(key => pattern.test(key));
    const types = [];
    if (PLAN_ACTION_PATH.test(pathText) || hasField(/^(accion|actividad|tarea|compromiso|medida|intervencion|producto|meta)$/)) types.push("actions");
    if (PLAN_BREACH_PATH.test(pathText) || hasField(/^(brecha|debilidad|limitacion|hallazgo|necesidad|problema)$/)) types.push("breaches");
    if (PLAN_RISK_PATH.test(pathText) || hasField(/^(riesgo|amenaza|vulnerabilidad|sitio critico|afectacion)$/)) types.push("risks");
    if (PLAN_ALERT_PATH.test(pathText) || hasField(/^(alerta|advertencia|vigilancia)$/)) types.push("monitoringReports");
    if (PLAN_CONTACT_PATH.test(pathText) || hasField(/^(correo|email|telefono|celular|cargo)$/)) types.push("institutions");
    return [...new Set(types)];
  }

  function hashText(value) {
    let hash = 2166136261;
    for (const char of String(value || "")) {
      hash ^= char.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function canonicalPlanPayload(raw, entityType, plan, path) {
    const payload = isPlainObject(raw) ? { ...raw } : { descripcion: String(raw ?? "") };
    if (entityType === "actions") {
      setCanonical(payload, "accion", ["acción", "accion", "actividad", "tarea", "compromiso", "medida", "intervencion", "producto", "meta", "descripcion", "detalle", "nombre", "titulo"]);
      setCanonical(payload, "responsable", ["responsable", "responsables", "tecnico", "técnico", "asignado a", "encargado"]);
      setCanonical(payload, "institucion", ["institucion", "institución", "entidad", "dependencia", "unidad responsable"]);
      setCanonical(payload, "estado", ["estado", "status", "situacion", "situación"]);
      setCanonical(payload, "prioridad", ["prioridad", "criticidad", "nivel"]);
      setCanonical(payload, "avance", ["avance", "progreso", "porcentaje", "porcentaje avance", "cumplimiento"]);
      setCanonical(payload, "fechaLimite", ["fecha limite", "fecha límite", "fecha fin", "fecha de cumplimiento", "plazo", "fecha"]);
      setCanonical(payload, "codigo", ["codigo", "código", "id accion", "nro", "numero"]);
      setCanonical(payload, "etapa", ["etapa", "fase", "linea", "línea", "componente"]);
    }
    if (entityType === "breaches") {
      setCanonical(payload, "brecha", ["brecha", "debilidad", "limitacion", "limitación", "problema", "hallazgo", "necesidad", "descripcion", "detalle"]);
      setCanonical(payload, "prioridad", ["prioridad", "criticidad", "nivel"]);
      setCanonical(payload, "estado", ["estado", "status", "situacion"]);
      setCanonical(payload, "responsable", ["responsable", "encargado", "unidad responsable"]);
    }
    if (entityType === "risks") {
      setCanonical(payload, "amenaza", ["amenaza", "riesgo", "evento", "escenario", "afectacion", "afectación", "descripcion"]);
      setCanonical(payload, "nivelRiesgo", ["nivel riesgo", "nivel de riesgo", "criticidad", "prioridad", "nivel"]);
      setCanonical(payload, "ubicacion", ["ubicacion", "ubicación", "sitio", "sector", "parroquia", "direccion"]);
    }
    if (entityType === "monitoringReports") {
      setCanonical(payload, "titulo", ["alerta", "advertencia", "vigilancia", "evento", "descripcion", "detalle"]);
      setCanonical(payload, "estado", ["estado", "nivel", "prioridad"]);
    }
    if (entityType === "institutions") {
      setCanonical(payload, "nombre", ["nombre", "contacto", "responsable", "funcionario", "institucion", "institución", "entidad"]);
      setCanonical(payload, "institucion", ["institucion", "institución", "entidad", "dependencia"]);
      setCanonical(payload, "unidad", ["cargo", "rol", "unidad", "mesa", "mtt", "grupo"]);
      setCanonical(payload, "correo", ["correo", "email", "e-mail"]);
      setCanonical(payload, "telefono", ["telefono", "teléfono", "celular", "movil", "móvil"]);
    }
    payload.provincia ||= plan.provincia || plan.payload?.provincia || null;
    payload.canton ||= plan.canton || plan.payload?.canton || null;
    payload.territorioId ||= plan.territorioId || plan.payload?.territorioId || null;
    payload.evento ||= plan.evento || plan.payload?.evento || null;
    payload.sourcePlanId = plan.sourceId || plan.id;
    payload.sourcePlanTitle = plan.title;
    payload.sourcePath = path.join(".");
    payload.normalizedFromPlan = true;
    payload.normalizationVersion = "RC9";
    return payload;
  }

  function virtualTypeLabel(entityType) {
    return ({
      actions: "Acción derivada de plan",
      breaches: "Brecha derivada de plan",
      risks: "Riesgo derivado de plan",
      monitoringReports: "Alerta derivada de plan",
      institutions: "Contacto institucional derivado de plan"
    })[entityType] || "Registro derivado de plan";
  }

  function virtualRecordFromPlan(plan, raw, entityType, path, ordinal) {
    const payload = canonicalPlanPayload(raw, entityType, plan, path);
    const signatureSeed = [plan.id, entityType, path.join("."), JSON.stringify(payload).slice(0, 2000), ordinal].join("|");
    const id = `RC9:${plan.id}:${entityType}:${hashText(signatureSeed)}`;
    const record = normalizeRecord({ id, sourceId: id, tipo: virtualTypeLabel(entityType), payload }, plan.scopeKey);
    record.entityType = entityType;
    record.normalizedFromPlan = true;
    record.sourcePlanId = plan.sourceId || plan.id;
    record.sourcePlanTitle = plan.title;
    record.sourcePath = path.join(".");
    record.virtual = true;
    return record;
  }

  function recordSignature(record) {
    return [
      record.entityType,
      normalizeText(record.provincia),
      normalizeText(record.canton),
      normalizeText(record.title),
      normalizeText(record.responsable),
      normalizeText(record.payload?.codigo),
      normalizeText(record.payload?.fechaLimite || record.payload?.plazo)
    ].join("|");
  }

  function expandPlanRecords(inputRecords) {
    const records = [...(inputRecords || [])];
    const plans = records.filter(record => record.entityType === "plans");
    const generated = [];
    const existing = new Set(records.map(recordSignature));
    const summary = {
      version: "RC9",
      plans: plans.length,
      structuredPlans: 0,
      unstructuredPlans: 0,
      plansWithoutOperationalSections: 0,
      generated: 0,
      actions: 0,
      breaches: 0,
      risks: 0,
      alerts: 0,
      contacts: 0
    };

    plans.forEach(plan => {
      const counts = { actions: 0, breaches: 0, risks: 0, monitoringReports: 0, institutions: 0 };
      let nodesVisited = 0;
      let operationalSignal = false;
      const payloadText = normalizeText(JSON.stringify(plan.payload || {}).slice(0, 250000));
      operationalSignal = /accion|actividad|tarea|compromiso|cronograma|brecha|debilidad|riesgo|amenaza|contacto|responsable|alerta/.test(payloadText);

      const walk = (rawValue, path = [], depth = 0) => {
        if (depth > 10 || nodesVisited > 1800) return;
        nodesVisited += 1;
        const value = parseStructuredValue(rawValue);
        if (Array.isArray(value)) {
          value.forEach((item, index) => walk(item, [...path, String(index)], depth + 1));
          return;
        }

        const types = classifyPlanNode(path, value);
        if (types.length) {
          types.forEach(entityType => {
            const virtual = virtualRecordFromPlan(plan, value, entityType, path, generated.length);
            const signature = recordSignature(virtual);
            if (!virtual.title || normalizeText(virtual.title) === "registro autorizado" || existing.has(signature)) return;
            existing.add(signature);
            generated.push(virtual);
            counts[entityType] += 1;
          });
          return;
        }

        if (isPlainObject(value)) {
          Object.entries(value).forEach(([key, child]) => {
            if (/^(_|sourceplan|normalization)/i.test(key)) return;
            walk(child, [...path, key], depth + 1);
          });
        }
      };

      Object.entries(plan.payload || {}).forEach(([key, value]) => walk(value, [key], 0));
      const extracted = Object.values(counts).reduce((sum, value) => sum + value, 0);
      const actionSignals = /accion|actividad|tarea|compromiso|cronograma|medida|intervencion/.test(payloadText);
      const status = extracted
        ? "structured"
        : operationalSignal ? "unstructured" : "no-operational-sections";

      plan.normalization = {
        version: "RC9",
        status,
        counts: { ...counts },
        nodesVisited,
        actionSignals,
        message: extracted
          ? `Se derivaron ${extracted} registros operativos del plan.`
          : operationalSignal
            ? "El plan contiene señales operativas, pero sus filas no están estructuradas o usan campos no reconocidos."
            : "El plan está visible, pero no declara secciones operativas estructuradas."
      };
      plan.payload.normalization = plan.normalization;

      if (status === "structured") summary.structuredPlans += 1;
      if (status === "unstructured") summary.unstructuredPlans += 1;
      if (status === "no-operational-sections") summary.plansWithoutOperationalSections += 1;
      summary.actions += counts.actions;
      summary.breaches += counts.breaches;
      summary.risks += counts.risks;
      summary.alerts += counts.monitoringReports;
      summary.contacts += counts.institutions;
    });

    summary.generated = generated.length;
    return {
      records: [...records, ...generated].sort((a, b) => a.title.localeCompare(b.title, "es")),
      generated,
      summary
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
    const expansion = expandPlanRecords(records);
    records = expansion.records;
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
      normalization: expansion.summary,
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
    expandPlanRecords,
    structuredPayload,
    semanticType,
    humanScopeLabel,
    loadScopedRecords
  };
})();
