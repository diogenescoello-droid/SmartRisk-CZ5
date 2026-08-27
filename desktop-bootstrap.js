(() => {
  "use strict";

  const VERSION = "2026.08.27.4";
  const STYLE_VERSION = "2026.08.27.4";
  const SCRIPT_VERSION = "2026.08.27.4";
  let started = false;
  let attempts = 0;
  const MAX_ATTEMPTS = 160;

  function isDesktop() {
    if (window.SmartRiskDeviceMode?.isSmart) return window.SmartRiskDeviceMode.isSmart() !== true;
    return document.documentElement.dataset.smartRiskDevice !== "smart";
  }

  function ready() {
    return Boolean(
      isDesktop() &&
      document.body.classList.contains("v11-enabled") &&
      document.querySelector("#app.v11-shell #nav")
    );
  }

  function loadStyle(href) {
    return new Promise((resolve, reject) => {
      const old = document.querySelector(`link[data-desktop-late-style='${href}']`);
      if (old) old.remove();
      const link = document.createElement("link");
      link.rel = "stylesheet";
      link.href = `${href}?v=${STYLE_VERSION}`;
      link.dataset.desktopLateStyle = href;
      link.onload = resolve;
      link.onerror = () => reject(new Error(`No fue posible cargar ${href}`));
      document.head.appendChild(link);
    });
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      document.querySelectorAll(`script[data-desktop-late-script='${src}']`).forEach(node => node.remove());
      const script = document.createElement("script");
      script.src = `${src}?v=${SCRIPT_VERSION}`;
      script.async = false;
      script.dataset.desktopLateScript = src;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`No fue posible cargar ${src}`));
      document.body.appendChild(script);
    });
  }

  async function start() {
    if (started || !ready()) return false;
    started = true;
    document.documentElement.dataset.smartRiskDesktopReference = "v1-fusion-approved-754ef8ff";
    try {
      await loadStyle("desktop-extension.css");
      await loadStyle("desktop-green-theme.css");
      await loadStyle("desktop-v1-baseline-lock.css");
      await loadStyle("desktop-home-executive.css");
      await loadStyle("desktop-home-plan-context.css");
      await loadStyle("desktop-home-audit-context.css");
      await loadStyle("desktop-documentary-actions.css");
      await loadScript("desktop-extension.js");
      await loadScript("desktop-v1-home-reconcile.js");
      await loadScript("desktop-v1-baseline-lock.js");
      await loadScript("desktop-home-executive.js");
      await loadScript("desktop-home-plan-context.js");
      await loadScript("desktop-home-audit-context.js");
      await loadScript("desktop-documentary-actions.js");
      document.body.classList.add("sr-v1-desktop-operational");
      window.dispatchEvent(new CustomEvent("smartrisk:desktop-reference-ready", {
        detail: {
          version: VERSION,
          reference: "SmartRisk CZ5 · escritorio operativo con contexto documental territorial"
        }
      }));
      return true;
    } catch (error) {
      started = false;
      console.error("SmartRisk desktop bootstrap", error);
      return false;
    }
  }

  function probe() {
    if (started || !isDesktop()) return;
    if (ready()) {
      start();
      return;
    }
    if (attempts++ >= MAX_ATTEMPTS) return;
    setTimeout(probe, 125);
  }

  window.addEventListener("load", probe);
  window.addEventListener("hashchange", probe);
  new MutationObserver(probe).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  probe();

  window.SmartRiskDesktopBootstrap = {
    VERSION,
    reference: "SmartRisk CZ5 · escritorio operativo con contexto documental territorial",
    start,
    isDesktop
  };
})();