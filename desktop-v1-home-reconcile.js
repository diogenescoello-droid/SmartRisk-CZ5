(() => {
  "use strict";

  const VERSION = "2026.08.25.8";
  let pending = false;
  let observer = null;

  function isDesktop() {
    if (window.SmartRiskDeviceMode?.isSmart) return window.SmartRiskDeviceMode.isSmart() !== true;
    return document.documentElement.dataset.smartRiskDevice !== "smart";
  }

  function currentRoute() {
    const hash = String(location.hash || "").replace(/^#\/?/, "").split(/[?&]/)[0];
    if (hash) return hash;
    const stateRoute = window.SmartRiskV11App?.state?.route;
    return stateRoute ? String(stateRoute) : "inicio";
  }

  function v1ViewIsPresent(content, route = currentRoute()) {
    if (!content) return false;
    if (route === "inicio") {
      return Boolean(
        content.classList.contains("v1-operational-home") &&
        content.querySelector(".v1-lead") &&
        content.querySelector(".v1-kpis") &&
        content.querySelector(".v1-workspace-grid")
      );
    }
    if (route === "dashboard") {
      return Boolean(
        content.classList.contains("v1-operational-territory") &&
        content.querySelector(".v1-territory-intro") &&
        content.querySelector(".v1-territory-grid") &&
        content.querySelector(".v1-territory-summary")
      );
    }
    return true;
  }

  function requestV1Reapply() {
    const route = currentRoute();
    if (pending || !isDesktop() || !["inicio", "dashboard"].includes(route)) return;
    const content = document.querySelector("#content");
    if (!content || v1ViewIsPresent(content, route)) return;

    pending = true;
    delete content.dataset.v1Operational;

    const marker = document.createComment(`v1-view-reconcile-${route}-${VERSION}`);
    content.appendChild(marker);
    requestAnimationFrame(() => {
      marker.remove();
      pending = false;
    });
  }

  function start() {
    if (observer) return;
    observer = new MutationObserver(requestV1Reapply);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("hashchange", () => setTimeout(requestV1Reapply, 20));
    window.addEventListener("smartrisk:desktop-reference-ready", requestV1Reapply);
    setTimeout(requestV1Reapply, 0);
    setTimeout(requestV1Reapply, 150);
    setTimeout(requestV1Reapply, 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.SmartRiskV1HomeReconcile = { VERSION, requestV1Reapply, v1ViewIsPresent };
})();