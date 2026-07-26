(() => {
  "use strict";

  const STORE = "smartrisk-cz5-data-v1";
  const CLOUD_DOC = "plataforma/datos";

  const clone = value => {
    if (typeof structuredClone === "function") return structuredClone(value);
    return JSON.parse(JSON.stringify(value));
  };

  function emptyData() {
    return {
      territorios: [],
      instituciones: [],
      usuarios: [],
      sitios: [],
      acciones: [],
      decisiones: [],
      validaciones: [],
      auditoria: [],
      actoresCOE: [],
      equiposCOE: [],
      actividadesCOE: [],
      capasGeograficas: [],
      sesionesCabina: [],
      tareasCabina: [],
      cartografiaOperativa: [],
      fichasTecnicas: [],
      planes: [],
      revisiones: [],
      informes: [],
      recursos: [],
      alertas: [],
      _revision: 0
    };
  }

  function normalizeType(value) {
    const type = String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase()
      .replace(/[\s_-]+/g, "");

    const aliases = {
      territorio: "territorios",
      territorios: "territorios",
      institucion: "instituciones",
      instituciones: "instituciones",
      usuario: "usuarios",
      usuarios: "usuarios",
      sitio: "sitios",
      sitios: "sitios",
      accion: "acciones",
      acciones: "acciones",
      decision: "decisiones",
      decisiones: "decisiones",
      validacion: "validaciones",
      validaciones: "validaciones",
      actorcoe: "actoresCOE",
      actorescoe: "actoresCOE",
      equipocoe: "equiposCOE",
      equiposcoe: "equiposCOE",
      actividadcoe: "actividadesCOE",
      actividadescoe: "actividadesCOE",
      capageografica: "capasGeograficas",
      capasgeograficas: "capasGeograficas",
      sesioncabina: "sesionesCabina",
      sesionescabina: "sesionesCabina",
      tareacabina: "tareasCabina",
      tareascabina: "tareasCabina",
      cartografiaoperativa: "cartografiaOperativa",
      fichatecnica: "fichasTecnicas",
      fichastecnicas: "fichasTecnicas",
      plan: "planes",
      planes: "planes",
      revision: "revisiones",
      revisiones: "revisiones",
      informe: "informes",
      informes: "informes",
      recurso: "recursos",
      recursos: "recursos",
      alerta: "alertas",
      alertas: "alertas"
    };

    return aliases[type] || null;
  }

  function recordsToData(records) {
    const result = emptyData();

    records.forEach(record => {
      const collection = normalizeType(record.tipo);
      if (!collection) return;

      const payload = clone(record.payload || {});
      payload.id =
        payload.id ||
        record.sourceId ||
        record.id;

      result[collection].push(payload);
    });

    return result;
  }

  function mergeArrays(base = [], overlay = []) {
    const records = new Map();

    base.forEach((item, index) => {
      records.set(item?.id || `base-${index}`, clone(item));
    });

    overlay.forEach((item, index) => {
      records.set(item?.id || `overlay-${index}`, clone(item));
    });

    return [...records.values()];
  }

  function mergeData(base, overlay) {
    const result = clone(base || {});

    Object.entries(overlay || {}).forEach(([key, value]) => {
      if (Array.isArray(value)) {
        result[key] = mergeArrays(result[key] || [], value);
      } else if (!key.startsWith("_")) {
        result[key] = clone(value);
      }
    });

    result._revision = Number(
      overlay?._revision ||
      result?._revision ||
      0
    );

    return result;
  }


  function filterGlobalReviewSources() {
    if (window.SmartRiskScope.isAdministrator()) return;

    const territories =
      window.SmartRiskScope.availableTerritories();

    const normalize = value => String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

    const matchesScope = item => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const itemProvince =
        item.province ||
        item.provincia ||
        item.provinciaNombre ||
        "";

      const itemTerritory =
        item.territory ||
        item.territorio ||
        item.canton ||
        item.cantón ||
        item.municipio ||
        "";

      if (!itemTerritory) return false;

      return territories.some(territory => {
        const sameTerritory =
          normalize(itemTerritory) ===
          normalize(territory.canton);

        const sameProvince =
          !itemProvince ||
          normalize(itemProvince) ===
          normalize(territory.provincia);

        return sameTerritory && sameProvince;
      });
    };

    const filterTerritorialArray = value => {
      if (!Array.isArray(value)) return value;

      const containsTerritorialRecords = value.some(item =>
        item &&
        typeof item === "object" &&
        (
          "territory" in item ||
          "territorio" in item ||
          "canton" in item ||
          "cantón" in item ||
          "province" in item ||
          "provincia" in item
        )
      );

      if (!containsTerritorialRecords) {
        return value;
      }

      return value
        .filter(matchesScope)
        .map(clone);
    };

    const source = window.ENOS_REVIEWS;

    if (Array.isArray(source)) {
      window.ENOS_REVIEWS =
        filterTerritorialArray(source);

      return;
    }

    if (!source || typeof source !== "object") {
      return;
    }

    const filtered = clone(source);

    Object.keys(filtered).forEach(key => {
      filtered[key] =
        filterTerritorialArray(filtered[key]);
    });

    if (Array.isArray(filtered.reviews)) {
      filtered.totalReviews =
        filtered.reviews.length;

      filtered.totalChecklist =
        filtered.reviews.reduce(
          (total, review) =>
            total +
            (
              Array.isArray(review.checklist)
                ? review.checklist.length
                : 0
            ),
          0
        );
    }

    if (Array.isArray(filtered.revisiones)) {
      filtered.totalReviews =
        filtered.revisiones.length;
    }

    window.ENOS_REVIEWS = filtered;

    console.info(
      "RC13.2 · revisiones ENOS filtradas:",
      {
        scope:
          window.SmartRiskScope.scopeLabel(),
        reviews:
          filtered.reviews?.length ??
          filtered.revisiones?.length ??
          0,
        checklist:
          filtered.totalChecklist ?? 0
      }
    );
  }


  function filterGlobalTerritorialSources() {
    if (window.SmartRiskScope.isAdministrator()) return;

    const territories =
      window.SmartRiskScope.availableTerritories();

    const normalize = value => String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

    const values = value => {
      if (Array.isArray(value)) return value.filter(Boolean);
      return value ? [value] : [];
    };

    const allowedCantons = new Set(
      territories.map(item => normalize(item.canton))
    );

    const allowedProvinces = new Set(
      territories.map(item => normalize(item.provincia))
    );

    const hasTerritorialIdentity = item => {
      if (!item || typeof item !== "object") return false;

      return [
        "territory",
        "territorio",
        "canton",
        "cantón",
        "municipio",
        "territoryId",
        "territorioId",
        "cantonId",
        "province",
        "provincia",
        "provinceId",
        "provinciaId"
      ].some(field => item[field]);
    };

    const matchesScope = item => {
      if (!item || typeof item !== "object") return false;

      const itemCantons = [
        item.territory,
        item.territorio,
        item.canton,
        item.cantón,
        item.municipio,
        item.territorioNombre,
        item.cantonNombre,
        ...values(item.cantones),
        ...values(item.territorios)
      ]
        .map(normalize)
        .filter(Boolean);

      const itemProvinces = [
        item.province,
        item.provincia,
        item.provinciaNombre,
        ...values(item.provincias)
      ]
        .map(normalize)
        .filter(Boolean);

      const cantonMatch = itemCantons.some(value =>
        allowedCantons.has(value)
      );

      const provinceMatch =
        !itemProvinces.length ||
        itemProvinces.some(value =>
          allowedProvinces.has(value)
        );

      if (cantonMatch && provinceMatch) return true;

      if (
        window.SmartRiskScope.getState()?.scopeType ===
        "provincial"
      ) {
        return itemProvinces.some(value =>
          allowedProvinces.has(value)
        );
      }

      const searchableText = normalize([
        item.institucion,
        item.institution,
        item.entidad,
        item.nombre,
        item.name,
        item.fuente,
        item.descripcion
      ].filter(Boolean).join(" "));

      return [...allowedCantons].some(canton =>
        searchableText.includes(canton)
      ) && provinceMatch;
    };

    const round1 = value =>
      Math.round(Number(value || 0) * 10) / 10;

    /*
     * Recalcular estadísticas documentales a partir
     * de las revisiones ya filtradas.
     */
    if (
      window.ENOS_REVIEWS &&
      typeof window.ENOS_REVIEWS === "object"
    ) {
      const reviews =
        window.ENOS_REVIEWS.reviews || [];

      const expected = reviews.length;

      const received = reviews.filter(review =>
        Boolean(
          review.plan ||
          review.source_plan ||
          review.document ||
          review.score != null
        )
      ).length;

      const evaluated = reviews.filter(review =>
        review.score != null
      ).length;

      const missing = Math.max(0, expected - received);

      const totalChecklist = reviews.reduce(
        (total, review) =>
          total +
          (
            Array.isArray(review.checklist)
              ? review.checklist.length
              : 0
          ),
        0
      );

      const evidence = reviews.flatMap(review =>
        Array.isArray(review.criteria)
          ? review.criteria.flatMap(criterion =>
              Array.isArray(criterion.evidence)
                ? criterion.evidence
                : []
            )
          : []
      );

      const evidenceWithReference = evidence.filter(item =>
        item?.page ||
        item?.source_page ||
        item?.reference
      ).length;

      window.ENOS_REVIEWS.stats = {
        ...(window.ENOS_REVIEWS.stats || {}),

        canonicalEntities: expected,
        canonicalTerritories: expected,
        totalEntities: expected,
        totalTerritories: expected,
        expectedPlans: expected,

        plansReceived: received,
        plansEvaluated: evaluated,
        plansProcessed: evaluated,
        documentsReceived: received,
        documentsProcessed: evaluated,

        plansMissing: missing,
        plansNotReceived: missing,

        territorialCoverage:
          expected
            ? round1(received / expected * 100)
            : 0,

        extractionCoverage:
          received
            ? round1(evaluated / received * 100)
            : 0,

        totalChecklist,
        checklistItems: totalChecklist,

        evidenceFragments: evidence.length,
        evidenceWithReference
      };

      window.ENOS_REVIEWS.totalChecklist =
        totalChecklist;
    }

    /*
     * Filtrar menciones territoriales y reconstruir
     * todos sus indicadores.
     */
    if (
      window.ENOS_RISK_LOCATIONS &&
      typeof window.ENOS_RISK_LOCATIONS === "object"
    ) {
      const locations = (
        window.ENOS_RISK_LOCATIONS.locations || []
      ).filter(matchesScope);

      const countBy = fields => {
        return locations.reduce((result, item) => {
          const value = fields
            .map(field => item?.[field])
            .find(Boolean);

          if (!value) return result;

          result[value] =
            Number(result[value] || 0) + 1;

          return result;
        }, {});
      };

      const territoryKeys = new Set(
        locations.map(item =>
          normalize(
            item.territory ||
            item.territorio ||
            item.canton ||
            item.municipio
          )
        ).filter(Boolean)
      );

      const planKeys = new Set(
        locations.map(item =>
          item.source_plan ||
          item.plan ||
          item.document ||
          item.archivo
        ).filter(Boolean)
      );

      const scopedReviews =
        window.ENOS_REVIEWS?.reviews || [];

      window.ENOS_RISK_LOCATIONS = {
        ...window.ENOS_RISK_LOCATIONS,
        locations,
        stats: {
          plansReviewed:
            scopedReviews.length ||
            planKeys.size,

          mentions: locations.length,

          byType: countBy([
            "type",
            "tipo",
            "geometryType",
            "featureType"
          ]),

          byQuality: countBy([
            "quality",
            "calidad",
            "descriptionQuality",
            "nivelDescripcion"
          ]),

          territoriesWithMentions:
            territoryKeys.size
        }
      };
    }

    /*
     * F03: conservar únicamente aportes de la
     * provincia y cantón autorizados.
     */
    if (Array.isArray(window.F03_CARTOGRAPHY)) {
      window.F03_CARTOGRAPHY =
        window.F03_CARTOGRAPHY.filter(matchesScope);
    }

    if (
      window.F03_DATA &&
      Array.isArray(window.F03_DATA.records)
    ) {
      window.F03_DATA = {
        ...window.F03_DATA,
        records:
          window.F03_DATA.records.filter(matchesScope)
      };
    }

    /*
     * Fuentes heredadas de sitios ENOS.
     */
    if (
      window.ENOS_IMPORT &&
      typeof window.ENOS_IMPORT === "object"
    ) {
      const filteredImport = {
        ...window.ENOS_IMPORT
      };

      Object.keys(filteredImport).forEach(key => {
        if (
          Array.isArray(filteredImport[key]) &&
          filteredImport[key].some(
            hasTerritorialIdentity
          )
        ) {
          filteredImport[key] =
            filteredImport[key].filter(matchesScope);
        }
      });

      window.ENOS_IMPORT = filteredImport;
    }

    /*
     * Los expedientes históricos no territoriales no
     * deben exponer estadísticas zonales a un cantón.
     */
    if (
      window.CZ5_CASES &&
      typeof window.CZ5_CASES === "object"
    ) {
      const filteredCases =
        Array.isArray(window.CZ5_CASES)
          ? window.CZ5_CASES.filter(matchesScope)
          : { ...window.CZ5_CASES };

      if (!Array.isArray(filteredCases)) {
        Object.keys(filteredCases).forEach(key => {
          if (!Array.isArray(filteredCases[key])) return;

          filteredCases[key] =
            filteredCases[key].filter(item =>
              hasTerritorialIdentity(item)
                ? matchesScope(item)
                : false
            );
        });

        if (
          filteredCases.stats &&
          typeof filteredCases.stats === "object"
        ) {
          const zeroNumericStats = value => {
            if (Array.isArray(value)) return [];

            if (
              value &&
              typeof value === "object"
            ) {
              return Object.fromEntries(
                Object.entries(value).map(
                  ([key, item]) => [
                    key,
                    zeroNumericStats(item)
                  ]
                )
              );
            }

            return typeof value === "number"
              ? 0
              : value;
          };

          filteredCases.stats =
            zeroNumericStats(filteredCases.stats);
        }
      }

      window.CZ5_CASES = filteredCases;
    }

    console.info(
      "RC13.2 · fuentes territoriales filtradas:",
      {
        scope:
          window.SmartRiskScope.scopeLabel(),

        reviews:
          window.ENOS_REVIEWS?.reviews?.length || 0,

        checklist:
          window.ENOS_REVIEWS?.stats
            ?.totalChecklist || 0,

        mentions:
          window.ENOS_RISK_LOCATIONS?.stats
            ?.mentions || 0,

        f03:
          window.F03_CARTOGRAPHY?.length || 0
      }
    );
  }

  async function loadScopeRecords(db, scopeKeys) {
    const records = new Map();

    for (const scopeKey of scopeKeys) {
      try {
        const snapshot = await db
          .collection("alcances")
          .doc(scopeKey)
          .collection("registros")
          .get();

        snapshot.forEach(document => {
          records.set(document.id, {
            id: document.id,
            ...document.data()
          });
        });
      } catch (error) {
        console.warn(
          `No fue posible consultar el alcance ${scopeKey}.`,
          error
        );
      }
    }

    return [...records.values()];
  }

  function snapshot(data, reference) {
    return {
      exists: true,
      id: "datos",
      ref: reference,
      metadata: {
        fromCache: false,
        hasPendingWrites: false
      },
      data() {
        return clone(data);
      }
    };
  }

  function installProfileBridge(db, user) {
    if (db.__smartRiskProfileBridge) return;

    const originalCollection = db.collection.bind(db);

    db.collection = function(name) {
      const collection = originalCollection(name);

      if (name !== "perfiles") return collection;

      return new Proxy(collection, {
        get(target, property) {
          if (property !== "doc") {
            const value = target[property];
            return typeof value === "function"
              ? value.bind(target)
              : value;
          }

          return id => {
            const reference = target.doc(id);

            if (id !== user.uid) return reference;

            return new Proxy(reference, {
              get(refTarget, refProperty) {
                if (refProperty !== "get") {
                  const value = refTarget[refProperty];
                  return typeof value === "function"
                    ? value.bind(refTarget)
                    : value;
                }

                return async () => {
                  const originalSnapshot = await refTarget.get();

                  return {
                    exists: originalSnapshot.exists,
                    id: originalSnapshot.id,
                    ref: originalSnapshot.ref,
                    metadata: originalSnapshot.metadata,
                    data() {
                      return window.SmartRiskScope
                        .getApplicationProfile();
                    }
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

  function installTerritorialCloud({
    db,
    user,
    sourceData,
    overlayReference,
    initialData
  }) {
    const originalDoc = db.doc.bind(db);
    let currentData = clone(initialData);

    const virtualReference = {
      __smartRiskVirtual: true,
      path: CLOUD_DOC,

      async get() {
        return snapshot(currentData, virtualReference);
      },

      async set(value) {
        const filtered =
          window.SmartRiskScope.filterData(value);

        const payload = {
          data: filtered,
          scope: {
            type:
              window.SmartRiskScope.getState()?.scopeType,
            label:
              window.SmartRiskScope.scopeLabel(),
            userId: user.uid,
            email: user.email,
            updatedAt: new Date().toISOString()
          }
        };

        await overlayReference.set(payload);
        currentData = clone(filtered);
      },

      onSnapshot(success, failure) {
        success(snapshot(currentData, virtualReference));

        try {
          return overlayReference.onSnapshot(
            change => {
              if (!change.exists) return;

              const stored = change.data();
              const overlay = stored.data || stored;

              currentData =
                window.SmartRiskScope.filterData(
                  mergeData(sourceData, overlay)
                );

              success(snapshot(
                currentData,
                virtualReference
              ));
            },
            failure
          );
        } catch (error) {
          failure?.(error);
          return () => {};
        }
      }
    };

    db.doc = function(path) {
      if (path === CLOUD_DOC) return virtualReference;
      return originalDoc(path);
    };

    db.runTransaction = async function(callback) {
      let pendingWrite = null;

      const virtualTransaction = {
        async get(reference) {
          if (!reference?.__smartRiskVirtual) {
            throw new Error(
              "RC13_2_TRANSACCION_FUERA_DE_ALCANCE"
            );
          }

          return snapshot(
            currentData,
            virtualReference
          );
        },

        set(reference, value) {
          if (!reference?.__smartRiskVirtual) {
            throw new Error(
              "RC13_2_ESCRITURA_FUERA_DE_ALCANCE"
            );
          }

          pendingWrite = value;
        }
      };

      const result = await callback(virtualTransaction);

      if (pendingWrite) {
        await virtualReference.set(pendingWrite);
      }

      return result;
    };
  }

  async function init({ user, profile, db }) {
    if (window.SmartRiskScope.isAdministrator()) {
      localStorage.removeItem(
        "smartrisk-active-territorial-scope"
      );

      return {
        mode: "administracion-zonal"
      };
    }

    const seed = clone(window.SEED_DATA || emptyData());

    window.SmartRiskScope.resolveTerritories(
      seed.territorios || []
    );

    filterGlobalReviewSources();
    filterGlobalTerritorialSources();

    const scopeKeys =
      window.SmartRiskScope.scopeKeys();

    const records = await loadScopeRecords(
      db,
      scopeKeys
    );

    const scopedRecords = recordsToData(records);
    const sourceData = mergeData(seed, scopedRecords);

    const filteredSource =
      window.SmartRiskScope.filterData(sourceData);

    const overlayReference = db
      .collection("territorialStates")
      .doc(user.uid);

    let overlay = {};

    try {
      const stored = await overlayReference.get();

      if (stored.exists) {
        const payload = stored.data();
        overlay = payload.data || payload;
      }
    } catch (error) {
      console.warn(
        "El estado territorial todavía no está disponible.",
        error
      );
    }

    const initialData =
      window.SmartRiskScope.filterData(
        mergeData(filteredSource, overlay)
      );

    localStorage.removeItem(STORE);
    localStorage.setItem(
      STORE,
      JSON.stringify(initialData)
    );

    localStorage.setItem(
      "smartrisk-active-territorial-scope",
      user.uid
    );

    installProfileBridge(db, user);

    installTerritorialCloud({
      db,
      user,
      sourceData: filteredSource,
      overlayReference,
      initialData
    });

    return {
      mode: "interfaz-unificada-territorial",
      scopeLabel:
        window.SmartRiskScope.scopeLabel(),
      records: records.length
    };
  }

  window.SmartRiskScopeRepository = {
    init,
    version: "13.2.0",
    architecture: "unified-ui-territorial-state"
  };
})();