(() => {
  "use strict";

  const PILOT_EMAILS = new Set([
    "geopro.ec2@gmail.com",
    "dcoellom2@unemi.edu.ec",
    "geopro.ec3@gmail.com",
    "geopro.ec4@gmail.com",
    "geopro.ec5@gmail.com"
  ]);

  const BUILD_VERSION = "11.0.0-rc6";
  const loadedResources = new Set();
  const normalizeEmail = value => String(value || "").trim().toLowerCase();

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
    if (loadedResources.has(href) || document.querySelector(`link[href="${href}"]`)) return Promise.resolve();
    return new Promise((resolve, reject) => {
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `${href}?v=${BUILD_VERSION}`;
      link.onload = () => { loadedResources.add(href); resolve(); };
      link.onerror = () => reject(new Error(`No fue posible cargar ${href}`));
      document.head.appendChild(link);
    });
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
    await loadScript("v11-router.js");
    await loadScript("v11-permissions.js");
    await loadScript("v11-data-adapter.js");
    await loadScript("v11-app.js");
    await window.SmartRiskV11App.start({ user, profile, db, auth });
    return true;
  }

  window.SmartRiskV11Rollout = { decide, isPilotUser, PILOT_EMAILS, BUILD_VERSION, enabled: false, mode: "pending" };
})();
