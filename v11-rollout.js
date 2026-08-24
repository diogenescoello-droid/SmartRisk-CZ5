(() => {
  "use strict";

  const PILOT_EMAILS = new Set([
    "geopro.ec2@gmail.com",
    "dcoellom2@unemi.edu.ec",
    "geopro.ec3@gmail.com",
    "geopro.ec4@gmail.com",
    "geopro.ec5@gmail.com"
  ]);

  const BUILD_VERSION = "11.0.0-rc17-operativo-p0";
  const loadedResources = new Set();
  const normalizeEmail = value => String(value || "").trim().toLowerCase();
  const FORM_GUIDE = Object.freeze({
    F01: {
      name: "Sitios críticos y elementos expuestos",
      question: "¿Dónde está el riesgo y qué podría verse afectado?"
    },
    F02: {
      name: "Infraestructura expuesta",
      question: "¿Qué infraestructura importante podría verse afectada?"
    },
    F03: {
      name: "Mapas e información cartográfica",
      question: "¿Qué mapas o capas respaldan este sitio?"
    },
    F04: {
      name: "Acciones preventivas y de mitigación",
      question: "¿Qué se hará para reducir o evitar impactos?"
    },
    F05: {
      name: "Alojamientos, rutas y puntos seguros",
      question: "¿Dónde puede evacuar o resguardarse la población?"
    },
    F06: {
      name: "Capacidades y recursos",
      question: "¿Con qué personal, equipos y recursos se cuenta?"
    },
    F07: {
      name: "Seguimiento de acciones",
      question: "¿Qué se ha hecho, qué falta y cuál es el avance?"
    }
  });
  let plainLanguageObserver = null;

  function isPilotUser(user, profile) {
    const email = normalizeEmail(user?.email);
    return PILOT_EMAILS.has(email) || profile?.v11Pilot === true || profile?.rolloutV11 === true;
  }

  function loadScript(src) {
    if (loadedResources.has(src)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const script = document.createElement("script");
      script.src = `${src}?v=${BUILD_VERSION}`;
      script.async = false;
      script.onload = () => { loadedResources.add(src); resolve(); };
      script.onerror = () => reject(new Error(`No fue posible cargar ${src}`));
      document.body.appendChild(script);
    });
  }

  function loadStyles(href) {
    if (loadedResources.has(href) || document.querySelector(`link[href^="${href}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `${href}?v=${BUILD_VERSION}`;
      link.onload = () => { loadedResources.add(href); resolve(); };
      link.onerror = () => reject(new Error(`No fue posible cargar ${href}`));
      document.head.appendChild(link);
    });
  }

  function annotateFormCodes(element) {
    if (!element || element.dataset.formLanguageEnhanced === "1") return;
    const original = String(element.textContent || "");
    const matcher = /\b(F0[1-7])\b/g;
    if (!matcher.test(original)) return;
    matcher.lastIndex = 0;
    const fragment = document.createDocumentFragment();
    let cursor = 0;
    let match;
    while ((match = matcher.exec(original))) {
      fragment.appendChild(document.createTextNode(original.slice(cursor, match.index)));
      const code = match[1];
      const guide = FORM_GUIDE[code];
      const span = document.createElement("span");
      span.className = "sr-form-friendly-name";
      span.textContent = `${code} · ${guide.name}`;
      span.title = guide.question;
      span.setAttribute("aria-label", `${code}. ${guide.name}. ${guide.question}`);
      fragment.appendChild(span);
      cursor = match.index + code.length;
    }
    fragment.appendChild(document.createTextNode(original.slice(cursor)));
    element.replaceChildren(fragment);
    element.dataset.formLanguageEnhanced = "1";
  }

  function makeEvidenceLink(element) {
    if (!element || element.dataset.evidenceFriendly === "1") return;
    const value = String(element.textContent || "").trim();
    if (!/^https?:\/\/\S+$/i.test(value)) return;
    const link = document.createElement("a");
    link.href = value;
    link.target = "_blank";
    link.rel = "noopener noreferrer";
    link.textContent = "Abrir documento";
    link.setAttribute("aria-label", "Abrir documento de respaldo en una nueva pestaña");
    element.replaceChildren(link);
    element.dataset.evidenceFriendly = "1";
  }

  function enhanceApprovedLanguage(root = document) {
    root.querySelectorAll?.(".sr16-field").forEach(field => {
      const label = field.querySelector(":scope > span");
      const value = field.querySelector(":scope > strong");
      if (!label || !value) return;
      const currentLabel = String(label.textContent || "").trim();

      if (currentLabel === "Próximo paso") label.textContent = "¿Qué debe hacer ahora?";
      if (currentLabel === "Evidencia") {
        label.textContent = "Documento de respaldo";
        makeEvidenceLink(value);
      }
      if (currentLabel === "Detalle") label.textContent = "¿Qué encontramos?";
      if (currentLabel === "Periodo F07") label.textContent = "Periodo · F07 · Seguimiento de acciones";
      if (currentLabel === "Fecha de envío F07") label.textContent = "Fecha de envío · F07 · Seguimiento de acciones";

      if (currentLabel !== "Evidencia") annotateFormCodes(value);
    });
  }

  function installPlainLanguageLayer() {
    enhanceApprovedLanguage(document);
    if (plainLanguageObserver) return;
    plainLanguageObserver = new MutationObserver(mutations => {
      for (const mutation of mutations) {
        for (const node of mutation.addedNodes) {
          if (node.nodeType !== 1) continue;
          if (node.matches?.(".sr16-field")) enhanceApprovedLanguage(node.parentElement || document);
          else if (node.querySelector?.(".sr16-field")) enhanceApprovedLanguage(node);
        }
      }
    });
    plainLanguageObserver.observe(document.body, { childList: true, subtree: true });
  }

  async function decide(user, profile) {
    const enabled = isPilotUser(user, profile);
    Object.assign(window.SmartRiskV11Rollout, {
      enabled,
      mode: enabled ? "v11" : "legacy",
      userEmail: normalizeEmail(user?.email),
      decidedAt: new Date().toISOString()
    });
    document.body.classList.toggle("v11-enabled", enabled);
    if (!enabled) return false;

    await loadStyles("v11.css");
    await loadStyles("v11-ux-rc7.css");
    await loadStyles("v11-dashboard-rc8.css");
    await loadStyles("v11-normalizer-rc9.css");
    await loadStyles("v11-admin-rc10.css");
    await loadStyles("v11-intelligence-rc11.css");
    await loadStyles("v11-governance-rc12.css");
    await loadStyles("v11-mobile-rc15.css");
    await loadStyles("v11-layout-rc15-1.css");
    await loadStyles("v11-approved-rc16.css");
    await loadStyles("enos-operational-v11.css");
    await loadStyles("v11-cartography-planning.css");
    await loadScript("v11-router.js");
    await loadScript("v11-permissions.js");
    await loadScript("v11-data-adapter.js");
    await loadScript("v11-app.js");
    await loadScript("v11-ux-rc7.js");
    await loadScript("v11-dashboard-rc8.js");
    await loadScript("v11-admin-rc10.js");
    await loadScript("v11-intelligence-rc11.js");
    await loadScript("v11-governance-rc12.js");
    await loadScript("v11-mobile-rc15.js");
    await loadScript("v11-approved-rc16.js");
    await loadScript("v11-authoritative-metrics.js");
    await loadScript("enos-matrix-audit-20260822.js");
    await loadScript("enos-matrix-audit-ui-20260822.js");
    await loadScript("enos-matrix-v11.js");
    await loadScript("enos-operational-v11.js");
    await loadScript("v11-zonal-synthesis.js");
    await loadScript("v11-cartography-planning.js");
    await window.SmartRiskV11App.start({ user, profile, db, auth });
    window.SmartRiskV11UX?.afterAppStart?.();
    window.SmartRiskV11DashboardRC8?.afterAppStart?.();
    window.SmartRiskV11AdminRC10?.afterAppStart?.();
    window.SmartRiskV11IntelligenceRC11?.afterAppStart?.();
    window.SmartRiskV11GovernanceRC12?.afterAppStart?.();
    window.SmartRiskV11MobileRC15?.afterAppStart?.();
    window.SmartRiskV11ApprovedRC16?.afterAppStart?.();
    window.SmartRiskAuthoritativeMetrics?.afterAppStart?.();
    window.SmartRiskMatrixV11?.afterAppStart?.();
    window.SmartRiskOperationalV11?.afterAppStart?.();
    window.SmartRiskZonalSynthesis?.afterAppStart?.();
    window.SmartRiskCartographyPlanning?.afterAppStart?.();
    installPlainLanguageLayer();
    return true;
  }

  window.SmartRiskV11Rollout = { decide, isPilotUser, PILOT_EMAILS, BUILD_VERSION, FORM_GUIDE, enabled: false, mode: "pending" };
})();
