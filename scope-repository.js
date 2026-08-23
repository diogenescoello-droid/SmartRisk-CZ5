(() => {
  "use strict";

  const STORE = "smartrisk-cz5-data-v1";
  const CLOUD_DOC = "plataforma/datos";
  const SCHEMA_VERSION = "2.0";
  const OPERATIONAL_TYPES = new Set([
    "sitios", "infraestructura", "cartografiaOperativa", "acciones", "alojamientos",
    "capacidades", "recursos", "seguimientos", "evidencias", "decisiones",
    "validaciones", "actividadesCOE", "fichasTecnicas", "planes"
  ]);
  const clone = value => typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
  let repositoryState = null;

  function emptyData() {
    return {
      territorios: [], instituciones: [], usuarios: [], sitios: [], infraestructura: [],
      acciones: [], alojamientos: [], capacidades: [], recursos: [], seguimientos: [],
      evidencias: [], entidadesSeguimiento: [], decisiones: [], validaciones: [],
      auditoria: [], actoresCOE: [], equiposCOE: [], actividadesCOE: [],
      capasGeograficas: [], sesionesCabina: [], tareasCabina: [],
      cartografiaOperativa: [], fichasTecnicas: [], planes: [], _revision: 0
    };
  }

  function normalizeType(value) {
    const key = String(value || "").trim().toLowerCase();
    return ({
      territorio: "territorios", territorios: "territorios",
      institucion: "instituciones", instituciones: "instituciones",
      usuario: "usuarios", usuarios: "usuarios",
      sitio: "sitios", sitios: "sitios",
      infraestructura: "infraestructura",
      accion: "acciones", acciones: "acciones",
      alojamiento: "alojamientos", alojamientos: "alojamientos",
      capacidad: "capacidades", capacidades: "capacidades",
      recurso: "recursos", recursos: "recursos",
      seguimiento: "seguimientos", seguimientos: "seguimientos",
      evidencia: "evidencias", evidencias: "evidencias",
      decision: "decisiones", decisiones: "decisiones",
      validacion: "validaciones", validaciones: "validaciones",
      plan: "planes", planes: "planes",
      actorcoe: "actoresCOE", equipocoe: "equiposCOE",
      actividadcoe: "actividadesCOE", capageografica: "capasGeograficas",
      sesioncabina: "sesionesCabina", tareacabina: "tareasCabina",
      cartografia: "cartografiaOperativa", cartografiaoperativa: "cartografiaOperativa",
      fichatecnica: "fichasTecnicas"
    })[key] || key;
  }

  function singularType(collectionKey) {
    return ({
      sitios: "sitio", infraestructura: "infraestructura", cartografiaOperativa: "cartografia",
      acciones: "accion", alojamientos: "alojamiento", capacidades: "capacidad",
      recursos: "recurso", seguimientos: "seguimiento", evidencias: "evidencia",
      decisiones: "decision", validaciones: "validacion", actividadesCOE: "actividadcoe",
      fichasTecnicas: "fichatecnica", planes: "plan"
    })[collectionKey] || collectionKey;
  }

  function recordsToData(records) {
    const data = emptyData();
    records.forEach(record => {
      const key = normalizeType(record.tipo);
      if (!Array.isArray(data[key])) data[key] = [];
      const payload = clone(record.payload || {});
      payload.id = payload.id || record.sourceId || record.id;
      payload._recordId = record.id;
      payload._scopeKey = record.scopeKey || record._scopeKey || null;
      payload._revision = Number(record.revision || 0);
      payload._createdAt = record.createdAt || null;
      payload._createdBy = record.createdBy || null;
      payload._updatedAt = record.updatedAt || null;
      payload._updatedBy = record.updatedBy || null;
      data[key].push(payload);
    });
    return data;
  }

  function mergeArrays(base = [], overlay = []) {
    const map = new Map();
    base.forEach((item, index) => map.set(item?.id || `base-${index}`, clone(item)));
    overlay.forEach((item, index) => map.set(item?.id || `overlay-${index}`, clone(item)));
    return [...map.values()];
  }

  function mergeData(base, overlay) {
    const result = clone(base || {});
    Object.entries(overlay || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) result[key] = mergeArrays(result[key], value);
      else if (!key.startsWith("_")) result[key] = clone(value);
    });
    result._revision = Number(overlay?._revision || 0);
    return result;
  }

  async function loadRecords(db, keys) {
    const records = new Map();
    for (const key of keys) {
      try {
        const snapshot = await db.collection("alcances").doc(key).collection("registros").get();
        snapshot.forEach(document => records.set(`${key}/${document.id}`, {
          id: document.id,
          _scopeKey: key,
          ...document.data()
        }));
      } catch (error) {
        console.warn(`No fue posible consultar el alcance ${key}`, error);
      }
    }
    return [...records.values()];
  }

  function snapshot(data, reference) {
    return {
      exists: true,
      id: "datos",
      ref: reference,
      metadata: { fromCache: false, hasPendingWrites: false },
      data: () => clone(data)
    };
  }

  function randomId(prefix = "rec") {
    const token = globalThis.crypto?.randomUUID?.()
      || `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
    return `${prefix}-${token}`;
  }

  function hashText(value) {
    let hash = 2166136261;
    for (const character of String(value || "")) {
      hash ^= character.charCodeAt(0);
      hash = Math.imul(hash, 16777619);
    }
    return (hash >>> 0).toString(36);
  }

  function stableRecordId(type, canonicalId) {
    const safe = String(canonicalId || "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 54)
      .replace(/^-|-$/g, "") || "registro";
    return `${safe}-${hashText(`${type}|${canonicalId}`)}`;
  }

  function cleanPayload(payload) {
    const result = clone(payload || {});
    [
      "_recordId", "_scopeKey", "_revision", "_createdAt", "_createdBy",
      "_updatedAt", "_updatedBy"
    ].forEach(key => delete result[key]);
    return result;
  }

  function requestedScopeKey(payload, options = {}) {
    const context = window.SmartRiskScope.getState?.() || {};
    const available = window.SmartRiskScope.scopeKeys?.() || [];
    const requested = options.scopeKey || payload?._scopeKey || null;
    if (requested && (window.SmartRiskScope.isAdministrator() || available.includes(requested))) return requested;

    const territoryId = payload?.territorioId || payload?.territorio || payload?.territoryId || null;
    if (territoryId) {
      const candidates = [String(territoryId), `TER:${territoryId}`];
      const matched = available.find(key => candidates.includes(key));
      if (matched) return matched;
    }

    if (window.SmartRiskScope.isAdministrator()) return options.scopeKey || "ZONA:CZ5";
    return repositoryState?.parentKey || available[0] || `USR:${repositoryState?.user?.uid || context.scopeType || "sin-alcance"}`;
  }

  function refreshRuntimeData() {
    if (!repositoryState) return;
    const merged = mergeData(repositoryState.sourceData || {}, repositoryState.overlay || {});
    const filtered = window.SmartRiskScope.filterData(merged);
    repositoryState.currentData = filtered;
    repositoryState.syncCurrentData?.(filtered);
    localStorage.setItem(STORE, JSON.stringify(filtered));
  }

  function applyRecordToSourceData(record) {
    if (!repositoryState) return;
    const key = normalizeType(record.tipo);
    if (!Array.isArray(repositoryState.sourceData[key])) repositoryState.sourceData[key] = [];
    const payload = recordsToData([{ id: record.id, ...record }])[key][0];
    const rows = repositoryState.sourceData[key];
    const index = rows.findIndex(item => item?._recordId === record.id || item?.id === payload.id);
    if (index >= 0) rows[index] = payload;
    else rows.push(payload);
    refreshRuntimeData();
  }

  async function saveRecord(type, payload, options = {}) {
    if (!repositoryState?.db || !repositoryState?.user) throw new Error("SMART_RISK_REPOSITORY_NOT_READY");
    const collectionKey = normalizeType(type);
    if (!OPERATIONAL_TYPES.has(collectionKey)) throw new Error(`SMART_RISK_UNSUPPORTED_RECORD_TYPE:${collectionKey}`);
    if (!window.SmartRiskScope.canWrite(collectionKey)) throw new Error("SMART_RISK_READ_ONLY_PROFILE");

    const clean = cleanPayload(payload);
    const canonicalId = String(clean.id || options.canonicalId || randomId(singularType(collectionKey))).trim();
    clean.id = canonicalId;
    const scopeKey = requestedScopeKey(payload, options);
    const recordId = options.recordId || payload?._recordId || stableRecordId(collectionKey, canonicalId);
    const recordRef = repositoryState.db.collection("alcances").doc(scopeKey).collection("registros").doc(recordId);
    const existing = await recordRef.get();
    const previous = existing.exists ? existing.data() : null;
    const now = new Date().toISOString();
    const email = repositoryState.user.email || "sin-correo";
    const revision = Number(previous?.revision || 0) + 1;
    const record = {
      schemaVersion: SCHEMA_VERSION,
      scopeKey,
      sourceId: previous?.sourceId || canonicalId,
      tipo: singularType(collectionKey),
      payload: clean,
      createdAt: previous?.createdAt || now,
      createdBy: previous?.createdBy || email,
      updatedAt: now,
      updatedBy: email,
      revision
    };
    const changeId = randomId("chg");
    const changeRef = repositoryState.db.collection("alcances").doc(scopeKey).collection("cambios").doc(changeId);
    const change = {
      schemaVersion: SCHEMA_VERSION,
      scopeKey,
      recordId,
      sourceId: record.sourceId,
      tipo: record.tipo,
      operation: existing.exists ? "update" : "create",
      revision,
      changedAt: now,
      changedBy: email,
      updatedBy: email
    };

    if (typeof repositoryState.db.batch === "function") {
      const batch = repositoryState.db.batch();
      batch.set(recordRef, record);
      batch.set(changeRef, change);
      await batch.commit();
    } else {
      await recordRef.set(record);
      await changeRef.set(change);
    }

    applyRecordToSourceData({ id: recordId, ...record });
    return clone({ recordId, ...record });
  }

  async function getRecord(scopeKey, recordId) {
    if (!repositoryState?.db) throw new Error("SMART_RISK_REPOSITORY_NOT_READY");
    const ref = repositoryState.db.collection("alcances").doc(scopeKey).collection("registros").doc(recordId);
    const snap = await ref.get();
    return snap.exists ? { recordId: snap.id, ...snap.data() } : null;
  }

  function installProfileBridge(db, user) {
    if (db.__smartRiskProfileBridge) return;
    const originalCollection = db.collection.bind(db);
    db.collection = function (name) {
      const collection = originalCollection(name);
      if (name !== "perfiles") return collection;
      return new Proxy(collection, {
        get(target, property) {
          if (property !== "doc") {
            const value = target[property];
            return typeof value === "function" ? value.bind(target) : value;
          }
          return id => {
            const reference = target.doc(id);
            if (id !== user.uid) return reference;
            return new Proxy(reference, {
              get(refTarget, refProperty) {
                if (refProperty !== "get") {
                  const value = refTarget[refProperty];
                  return typeof value === "function" ? value.bind(refTarget) : value;
                }
                return async () => {
                  const snap = await refTarget.get();
                  return {
                    exists: snap.exists,
                    id: snap.id,
                    ref: snap.ref,
                    metadata: snap.metadata,
                    data: () => window.SmartRiskScope.getAppProfile()
                  };
                };
              }
            });
          };
        }
      });
    };
    db.__smartRiskProfileBridge = true;
  }

  function installVirtualCloud(db, overlayRef, initialData) {
    const originalDoc = db.doc.bind(db);
    let currentData = clone(initialData);
    repositoryState.syncCurrentData = value => { currentData = clone(value); };
    const virtualRef = {
      __smartRiskVirtual: true,
      path: CLOUD_DOC,
      get: async () => snapshot(currentData, virtualRef),
      set: async value => {
        if (!window.SmartRiskScope.canWrite("plataforma")) {
          throw new Error("SMART_RISK_READ_ONLY_PROFILE");
        }
        const filtered = window.SmartRiskScope.filterData(value);
        filtered._scope = {
          type: window.SmartRiskScope.getState()?.scopeType,
          label: window.SmartRiskScope.scopeLabel(),
          updatedBy: repositoryState.user.email,
          updatedAt: new Date().toISOString()
        };
        await overlayRef.set(filtered);
        repositoryState.overlay = clone(filtered);
        currentData = clone(filtered);
      },
      onSnapshot: (success, failure) => {
        success(snapshot(currentData, virtualRef));
        try {
          return overlayRef.onSnapshot(snap => {
            if (!snap.exists) return;
            repositoryState.overlay = clone(snap.data());
            currentData = window.SmartRiskScope.filterData(
              mergeData(repositoryState.sourceData, repositoryState.overlay)
            );
            success(snapshot(currentData, virtualRef));
          }, failure);
        } catch (error) {
          failure?.(error);
          return () => {};
        }
      }
    };

    db.doc = path => path === CLOUD_DOC ? virtualRef : originalDoc(path);
    db.runTransaction = async callback => {
      let pending = null;
      const tx = {
        get: async reference => {
          if (reference?.__smartRiskVirtual) return snapshot(currentData, virtualRef);
          throw new Error("RC13_2_UNSUPPORTED_TRANSACTION_REFERENCE");
        },
        set: (reference, value) => {
          if (!reference?.__smartRiskVirtual) throw new Error("RC13_2_WRITE_OUTSIDE_SCOPE");
          pending = value;
        }
      };
      const result = await callback(tx);
      if (pending) await virtualRef.set(pending);
      return result;
    };
  }

  async function init({ user, profile, db }) {
    installProfileBridge(db, user);
    const seed = clone(window.SEED_DATA || {});

    if (window.SmartRiskScope.isAdministrator()) {
      localStorage.removeItem("smartrisk-active-territorial-scope");
      repositoryState = {
        user, profile, db, sourceData: seed, overlay: {}, currentData: seed, parentKey: "ZONA:CZ5"
      };
      return { mode: "zonal-global", recordWrites: "granular" };
    }

    const scopeKeys = window.SmartRiskScope.scopeKeys();
    const records = await loadRecords(db, scopeKeys);
    const sourceData = window.SmartRiskScope.filterData(mergeData(seed, recordsToData(records)));
    const context = window.SmartRiskScope.getState();
    const parentKey = scopeKeys[0] || `USR:${user.uid}`;
    const token = window.SmartRiskScope.currentTerritory()?.id || context?.scopeType || user.uid;
    const safeToken = String(token).replace(/[^a-zA-Z0-9_-]/g, "-");
    const overlayRef = db.collection("alcances")
      .doc(parentKey)
      .collection("estado")
      .doc(`plataforma-${safeToken}`);

    let overlay = {};
    try {
      const snap = await overlayRef.get();
      if (snap.exists) overlay = snap.data();
    } catch (error) {
      console.warn("Estado territorial sin escritura habilitada", error);
    }

    const initialData = window.SmartRiskScope.filterData(mergeData(sourceData, overlay));
    localStorage.removeItem(STORE);
    localStorage.setItem(STORE, JSON.stringify(initialData));
    localStorage.setItem("smartrisk-active-territorial-scope", parentKey);
    repositoryState = { user, profile, db, sourceData, overlay, currentData: initialData, overlayRef, parentKey };
    installVirtualCloud(db, overlayRef, initialData);
    return {
      mode: window.SmartRiskScope.isReadOnly() ? "territorial-read-only" : "territorial-granular",
      scopeKey: parentKey,
      scopeLabel: window.SmartRiskScope.scopeLabel(),
      recordWrites: "granular"
    };
  }

  window.SmartRiskScopeRepository = {
    init,
    saveRecord,
    getRecord,
    normalizeType,
    version: window.SMART_RISK_RELEASE?.build || "1.0.0-piloto-estable",
    architecture: "unified-ui-secured-scope-records-v2"
  };
})();
