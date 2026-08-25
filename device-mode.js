(() => {
  "use strict";

  const VERSION = "2026.08.25.1";
  const media = window.matchMedia("(max-width: 820px)");
  let scheduled = false;

  const $ = (selector, root = document) => root.querySelector(selector);

  function isV11() {
    return document.body.classList.contains("v11-enabled") || $("#app.v11-shell");
  }

  function mode() {
    return media.matches ? "smart" : "desktop";
  }

  function ensureBadge() {
    const smart = media.matches;
    let badge = $("#smartModeBadge");
    if (!smart) {
      badge?.remove();
      return;
    }
    if (!badge) {
      badge = document.createElement("span");
      badge.id = "smartModeBadge";
      badge.className = "smart-mode-badge";
      badge.textContent = "Modo Smart";
    }
    const v11Target = $("#srHeader .sr-header-meta, #srHeader .sr-heading-actions");
    const legacyTarget = $("#app:not(.v11-shell) main > header .account-menu");
    const target = isV11() ? v11Target : legacyTarget;
    if (target && badge.parentElement !== target) target.prepend(badge);
  }

  function currentLegacyPage() {
    const active = $("#nav .nav-active, #nav [aria-current='page'], #nav .active");
    return active?.dataset?.page || active?.dataset?.scopePage || "dashboard";
  }

  function findLegacyTarget(kind) {
    const selectors = {
      inicio: ["#nav [data-page='dashboard']", "#nav [data-scope-page='dashboard']"],
      territorio: ["#nav [data-page='territorios']", "#nav [data-scope-page='all']", "#nav [data-page='sitios']"],
      acciones: ["#nav [data-page='acciones']", "#nav [data-scope-page*='accion']"]
    };
    return (selectors[kind] || []).map(selector => $(selector)).find(Boolean) || null;
  }

  function ensureLegacyNav() {
    if (!media.matches || isV11()) {
      $("#smartLegacyNav")?.remove();
      return;
    }
    const app = $("#app");
    if (!app || app.classList.contains("hidden")) return;

    let nav = $("#smartLegacyNav");
    if (!nav) {
      nav = document.createElement("nav");
      nav.id = "smartLegacyNav";
      nav.setAttribute("aria-label", "Navegación Smart móvil");
      nav.innerHTML = `
        <button type="button" data-smart-action="inicio"><strong>⌂</strong><span>Inicio</span></button>
        <button type="button" data-smart-action="territorio"><strong>◎</strong><span>Territorio</span></button>
        <button type="button" data-smart-action="acciones"><strong>✓</strong><span>Acciones</span></button>
        <button type="button" data-smart-action="more"><strong>☰</strong><span>Más</span></button>`;
      document.body.append(nav);
    }

    const page = currentLegacyPage();
    [...nav.querySelectorAll("button")].forEach(button => button.classList.remove("active"));
    const activeKind = page === "acciones" ? "acciones" : /territ|sitio|all/i.test(page) ? "territorio" : "inicio";
    nav.querySelector(`[data-smart-action='${activeKind}']`)?.classList.add("active");
  }

  function closeLegacyMenu() {
    $("#app")?.classList.remove("smart-menu-open");
  }

  function applyMode() {
    scheduled = false;
    const smart = media.matches;
    document.documentElement.dataset.smartRiskDevice = smart ? "smart" : "desktop";
    document.body.classList.toggle("smart-mobile", smart);
    document.body.classList.toggle("desktop-workspace", !smart);
    if (!smart) closeLegacyMenu();
    ensureBadge();
    ensureLegacyNav();
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(applyMode);
  }

  document.addEventListener("click", event => {
    const action = event.target.closest("[data-smart-action]")?.dataset.smartAction;
    if (action) {
      if (action === "more") {
        $("#app")?.classList.toggle("smart-menu-open");
        return;
      }
      const target = findLegacyTarget(action);
      if (target) {
        closeLegacyMenu();
        target.click();
        schedule();
      }
      return;
    }
    if (media.matches && !isV11() && $("#app")?.classList.contains("smart-menu-open")) {
      if (!event.target.closest("#app > aside") && !event.target.closest("#smartLegacyNav")) closeLegacyMenu();
    }
  });

  media.addEventListener?.("change", schedule);
  window.addEventListener("hashchange", schedule);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  schedule();

  window.SmartRiskDeviceMode = { VERSION, mode, isSmart: () => media.matches };
})();
