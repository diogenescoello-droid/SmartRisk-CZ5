(() => {
  "use strict";

  const VERSION = "2026.08.25.7";
  let pending = false;
  let observer = null;

  function isDesktop() {
    if (window.SmartRiskDeviceMode?.isSmart) return window.SmartRiskDeviceMode.isSmart() !== true;
    return document.documentElement.dataset.smartRiskDevice !== "smart";
  }

  function currentRoute() {
    const stateRoute = window.SmartRiskV11App?.state?.route;
    if (stateRoute) return String(stateRoute);
    return String(location.hash || "inicio").replace(/^#\/?/, "").split(/[?&]/)[0] || "inicio";
  }

  function v1HomeIsPresent(content) {
    return Boolean(
      content &&
      content.classList.contains("v1-operational-home") &&
      content.querySelector(".v1-lead") &&
      content.querySelector(".v1-kpis") &&
      content.querySelector(".v1-workspace-grid")
    );
  }

  function requestV1Reapply() {
    if (pending || !isDesktop() || currentRoute() !== "inicio") return;
    const content = document.querySelector("#content");
    if (!content || v1HomeIsPresent(content)) return;

    pending = true;
    delete content.dataset.v1Operational;

    // desktop-extension.js escucha mutaciones childList. Este marcador provoca
    // una nueva pasada después de que V11 haya terminado de redibujar Inicio.
    const marker = document.createComment(`v1-home-reconcile-${VERSION}`);
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

  window.SmartRiskV1HomeReconcile = { VERSION, requestV1Reapply, v1HomeIsPresent };
})();