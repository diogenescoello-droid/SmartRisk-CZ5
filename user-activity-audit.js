(() => {
  "use strict";

  const VERSION = "2026.09.02.2-user-activity-audit";
  const EVENT_COLLECTION = "auditoria_actividad";
  const ACCESS_COLLECTION = "accesos";
  const SESSION_KEY = "smartrisk.audit.session.v1";
  const LOGIN_MARKER_PREFIX = "smartrisk.audit.login-recorded.";
  const MAX_TEXT = 160;
  const GENERIC_CONTAINER_IDS = new Set(["app", "content", "main", "nav"]);
  let currentUser = null;
  let currentProfile = null;

  const normalizeEmail = value => String(value || "").trim().toLowerCase();
  const cleanText = (value, max = MAX_TEXT) => String(value ?? "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, max);

  function randomId() {
    if (crypto?.randomUUID) return crypto.randomUUID();
    return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 12)}`;
  }

  function getSessionId() {
    try {
      let id = sessionStorage.getItem(SESSION_KEY);
      if (!id) {
        id = randomId();
        sessionStorage.setItem(SESSION_KEY, id);
      }
      return id;
    } catch (_) {
      return randomId();
    }
  }

  function resetSession() {
    try {
      const uid = currentUser?.uid;
      if (uid) sessionStorage.removeItem(`${LOGIN_MARKER_PREFIX}${uid}`);
      sessionStorage.removeItem(SESSION_KEY);
    } catch (_) {}
  }

  function routeName() {
    return cleanText(`${location.pathname}${location.hash || ""}`, 180);
  }

  function pageTitle() {
    return cleanText(document.querySelector("#pageTitle")?.textContent || document.title, 120);
  }

  function moduleName(element, explicit = "") {
    if (explicit) return cleanText(explicit, 100);
    const scoped = element?.closest?.("[data-module],[data-view],[data-section],section[id],nav[id]");
    const declared = scoped?.dataset?.module || scoped?.dataset?.view || scoped?.dataset?.section || "";
    if (declared) return cleanText(declared, 100);
    const scopedId = cleanText(scoped?.id || "", 100);
    if (scopedId && !GENERIC_CONTAINER_IDS.has(scopedId.toLowerCase())) return scopedId;
    return pageTitle();
  }

  function safeMetadata(input = {}) {
    const output = {};
    for (const [rawKey, value] of Object.entries(input).slice(0, 12)) {
      const key = String(rawKey || "").replace(/[^A-Za-z0-9_-]/g, "").slice(0, 40);
      if (!key) continue;
      if (typeof value === "boolean" || typeof value === "number") output[key] = value;
      else if (typeof value === "string") output[key] = cleanText(value, 160);
    }
    return output;
  }

  function describeElement(element) {
    if (!element) return { elementId: "", elementLabel: "", metadata: {} };
    const tag = cleanText(element.tagName || "", 20).toLowerCase();
    const id = cleanText(element.id || element.dataset?.auditId || element.name || "", 100);
    let label = cleanText(
      element.dataset?.auditLabel
      || element.getAttribute?.("aria-label")
      || element.getAttribute?.("title")
      || element.textContent
      || "",
      120
    );
    if (!label && element.labels?.[0]) label = cleanText(element.labels[0].textContent, 120);

    const metadata = { controlType: cleanText(element.type || tag, 40) };
    if (tag === "a") {
      try {
        const url = new URL(element.href, location.href);
        metadata.destination = cleanText(`${url.pathname}${url.hash}`, 150);
      } catch (_) {}
    }
    if (tag === "select") metadata.selection = cleanText(element.selectedOptions?.[0]?.textContent || "", 100);
    if (element.type === "checkbox" || element.type === "radio") metadata.checked = Boolean(element.checked);
    return { elementId: id, elementLabel: label, metadata };
  }

  async function readProfile(user) {
    try {
      const snap = await db.collection("perfiles").doc(user.uid).get();
      return snap.exists ? (snap.data() || {}) : null;
    } catch (error) {
      console.warn("SmartRisk audit: no fue posible leer el perfil", error?.code || error?.message);
      return null;
    }
  }

  async function writeEvent(action, details = {}) {
    if (!currentUser || !currentProfile || currentProfile.estado !== "Activo") return false;
    const sessionId = getSessionId();
    const timestamp = firebase.firestore.FieldValue.serverTimestamp();
    const element = details.element || null;
    const described = describeElement(element);
    const metadata = safeMetadata({ ...described.metadata, ...(details.metadata || {}) });
    const eventRef = db.collection(EVENT_COLLECTION).doc();
    const accessRef = db.collection(ACCESS_COLLECTION).doc(currentUser.uid);
    const payload = {
      schemaVersion: "1",
      timestamp,
      uid: currentUser.uid,
      correo: normalizeEmail(currentUser.email),
      nombre: cleanText(currentProfile.nombre || "", 120),
      rol: cleanText(currentProfile.rol || currentProfile.codigoRol || "", 100),
      provincia: cleanText(currentProfile.provincia || "", 80),
      canton: cleanText(currentProfile.canton || "", 80),
      sessionId: cleanText(sessionId, 100),
      action: cleanText(action, 64),
      category: cleanText(details.category || "interaction", 50),
      module: moduleName(element, details.module),
      route: routeName(),
      pageTitle: pageTitle(),
      elementId: cleanText(details.elementId || described.elementId, 100),
      elementLabel: cleanText(details.elementLabel || described.elementLabel, 120),
      result: cleanText(details.result || "ok", 40),
      metadata,
      clientVersion: VERSION,
      source: "web-client"
    };

    const accessPayload = {
      uid: currentUser.uid,
      correo: normalizeEmail(currentUser.email),
      nombre: cleanText(currentProfile.nombre || "", 120),
      rol: cleanText(currentProfile.rol || currentProfile.codigoRol || "", 100),
      provincia: cleanText(currentProfile.provincia || "", 80),
      canton: cleanText(currentProfile.canton || "", 80),
      ultimaActividadEn: timestamp,
      ultimaAccion: payload.action,
      ultimoModulo: payload.module,
      accionesRegistradas: firebase.firestore.FieldValue.increment(1),
      auditoriaVersion: VERSION
    };
    if (payload.action === "LOGIN_SUCCESS") {
      accessPayload.ultimoAccesoEn = timestamp;
      accessPayload.sesiones = firebase.firestore.FieldValue.increment(1);
    }

    try {
      if (payload.action === "LOGIN_SUCCESS") {
        const accessSnap = await accessRef.get();
        if (!accessSnap.exists || !accessSnap.data()?.primerAccesoEn) accessPayload.primerAccesoEn = timestamp;
      }
      const batch = db.batch();
      batch.set(eventRef, payload);
      batch.set(accessRef, accessPayload, { merge: true });
      await batch.commit();
      return true;
    } catch (error) {
      console.warn("SmartRisk audit: no fue posible registrar actividad", error?.code || error?.message);
      return false;
    }
  }

  async function recordLoginOnce() {
    if (!currentUser) return;
    const sessionId = getSessionId();
    const markerKey = `${LOGIN_MARKER_PREFIX}${currentUser.uid}`;
    try {
      if (sessionStorage.getItem(markerKey) === sessionId) return;
    } catch (_) {}
    const recorded = await writeEvent("LOGIN_SUCCESS", { category: "authentication", result: "validated" });
    if (recorded) {
      try { sessionStorage.setItem(markerKey, sessionId); } catch (_) {}
    }
  }

  function clickAction(element) {
    if (element?.id === "logout") return "LOGOUT";
    if (element?.hasAttribute?.("download")) return "DOWNLOAD";
    if (element?.tagName === "A" || element?.closest?.("nav")) return "NAVIGATE";
    return "BUTTON_CLICK";
  }

  document.addEventListener("click", event => {
    if (!currentUser || !currentProfile) return;
    const element = event.target?.closest?.("button,a,[role='button'],input[type='button'],input[type='submit'],summary,[data-audit-action]");
    if (!element) return;
    const action = cleanText(element.dataset?.auditAction || clickAction(element), 64);
    void writeEvent(action, { category: action === "LOGOUT" ? "authentication" : "interaction", element });
    if (action === "LOGOUT") setTimeout(resetSession, 250);
  }, true);

  document.addEventListener("submit", event => {
    if (!currentUser || !currentProfile) return;
    const form = event.target;
    if (!form || form.id === "loginForm") return;
    void writeEvent("FORM_SUBMIT", {
      category: "data-entry",
      elementId: form.id || form.getAttribute?.("name") || "form",
      elementLabel: form.getAttribute?.("aria-label") || form.getAttribute?.("title") || form.id || "Formulario",
      module: moduleName(form)
    });
  }, true);

  document.addEventListener("change", event => {
    if (!currentUser || !currentProfile) return;
    const element = event.target;
    if (!element?.matches?.("select,input[type='checkbox'],input[type='radio']")) return;
    void writeEvent("CONTROL_CHANGE", { category: "interaction", element });
  }, true);

  window.addEventListener("hashchange", () => {
    if (currentUser && currentProfile) void writeEvent("PAGE_VIEW", { category: "navigation" });
  });

  auth.onAuthStateChanged(async user => {
    currentUser = user || null;
    currentProfile = null;
    if (!user) return;
    currentProfile = await readProfile(user);
    if (!currentProfile || currentProfile.estado !== "Activo") return;
    await recordLoginOnce();
    void writeEvent("PAGE_VIEW", { category: "navigation", result: "loaded" });
  });

  window.SmartRiskActivityAudit = {
    version: VERSION,
    track: (action, details = {}) => writeEvent(action, details),
    currentSessionId: () => getSessionId(),
    resetSession
  };
})();
