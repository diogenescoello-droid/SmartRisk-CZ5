(() => {
  "use strict";

  const STORE = "smartrisk-cz5-data-v1";
  const CLOUD_DOC = "plataforma/datos";
  const clone = value => typeof structuredClone === "function"
    ? structuredClone(value)
    : JSON.parse(JSON.stringify(value));
  let repositoryState = null;

  function emptyData() {
    return {
      territorios: [], instituciones: [], usuarios: [], sitios: [], acciones: [],
      seguimientos: [], entidadesSeguimiento: [], decisiones: [], validaciones: [],
      auditoria: [], actoresCOE: [], equiposCOE: [], actividadesCOE: [],
      capasGeograficas: [], sesionesCabina: [], tareasCabina: [],
      cartografiaOperativa: [], fichasTecnicas: [], _revision: 0
    };
  }

  function normalizeType(value) {
    const key = String(value || "").trim().toLowerCase();
    return ({
      territorio: "territorios", institucion: "instituciones", usuario: "usuarios",
      sitio: "sitios", accion: "acciones", decision: "decisiones",
      validacion: "validaciones", actorcoe: "actoresCOE", equipocoe: "equiposCOE",
      actividadcoe: "actividadesCOE", capageografica: "capasGeograficas",
      sesioncabina: "sesionesCabina", tareacabina: "tareasCabina",
      cartografiaoperativa: "cartografiaOperativa", fichatecnica: "fichasTecnicas"
    })[key] || key;
  }

  function recordsToData(records) {
    const data = emptyData();
    records.forEach(record => {
      const key = normalizeType(record.tipo);
      if (!Array.isArray(data[key])) data[key] = [];
      const payload = clone(record.payload || {});
      payload.id = payload.id || record.sourceId || record.id;
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
        snapshot.forEach(document => records.set(document.id, { id: document.id, ...document.data() }));
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
        currentData = clone(filtered);
      },
      onSnapshot: (success, failure) => {
        success(snapshot(currentData, virtualRef));
        try {
          return overlayRef.onSnapshot(snap => {
            if (!snap.exists) return;
            currentData = window.SmartRiskScope.filterData(
              mergeData(repositoryState.sourceData, snap.data())
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

    if (window.SmartRiskScope.isAdministrator()) {
      localStorage.removeItem("smartrisk-active-territorial-scope");
      return { mode: "zonal-global" };
    }

    const scopeKeys = window.SmartRiskScope.scopeKeys();
    const records = await loadRecords(db, scopeKeys);
    const seed = clone(window.SEED_DATA || {});
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
    repositoryState = { user, profile, db, sourceData, overlayRef, parentKey };
    installVirtualCloud(db, overlayRef, initialData);
    return {
      mode: window.SmartRiskScope.isReadOnly() ? "territorial-read-only" : "territorial-overlay",
      scopeKey: parentKey,
      scopeLabel: window.SmartRiskScope.scopeLabel()
    };
  }

  window.SmartRiskScopeRepository = {
    init,
    version: window.SMART_RISK_RELEASE?.build || "1.0.0-piloto-estable",
    architecture: "unified-ui-secured-scope-overlay"
  };
})();
