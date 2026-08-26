(() => {
  "use strict";

  const VERSION = "2026.08.25.7";
  const STYLE_VERSION = "2026.08.25.5";
  const SCRIPT_VERSION = "2026.08.25.7";
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
    document.documentElement.dataset.smartRiskDesktopReference = "v1-operational";
    try {
      await loadStyle("desktop-extension.css");
      await loadStyle("desktop-green-theme.css");
      await loadScript("desktop-extension.js");
      await loadScript("desktop-v1-home-reconcile.js");
      document.body.classList.add("sr-v1-desktop-operational");
      window.dispatchEvent(new CustomEvent("smartrisk:desktop-reference-ready", {
        detail: { version: VERSION, reference: "V1 + Smart móvil" }
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
    reference: "V1 + Smart móvil",
    start,
    isDesktop
  };
})();
