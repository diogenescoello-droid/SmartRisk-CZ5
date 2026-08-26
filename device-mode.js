(() => {
  "use strict";

  const VERSION = "2026.08.25.3";
  const compactMedia = window.matchMedia("(max-width: 900px)");
  const coarsePointerMedia = window.matchMedia("(pointer: coarse)");
  let scheduled = false;

  const $ = (selector, root = document) => root.querySelector(selector);
  const ua = String(navigator.userAgent || "");
  const explicitMode = new URLSearchParams(location.search).get("ui");

  function mobileBrowserSignal() {
    if (navigator.userAgentData?.mobile === true) return true;
    if (/Android|iPhone|iPod|IEMobile|Opera Mini|Mobile/i.test(ua)) return true;
    if (/iPad/i.test(ua)) return true;
    if (/Macintosh/i.test(ua) && navigator.maxTouchPoints > 1) return true;
    return false;
  }

  function compactTouchSignal() {
    if (!compactMedia.matches) return false;
    if (coarsePointerMedia.matches) return true;
    if (Number(navigator.maxTouchPoints || 0) > 0) return true;
    return false;
  }

  function isActualSmartDevice() {
    if (explicitMode === "desktop") return false;
    if (explicitMode === "smart") return true;
    if (!compactMedia.matches) return false;
    return mobileBrowserSignal() || compactTouchSignal();
  }

  function isV11() {
    return document.body.classList.contains("v11-enabled") || $("#app.v11-shell");
  }

  function mode() {
    return isActualSmartDevice() ? "smart" : "desktop";
  }

  function wrapSmartOnlyModule(name) {
    const marker = Symbol.for(`SmartRisk.${name}.smartOnly`);

    function wrap(value) {
      if (!value || typeof value !== "object" || value[marker]) return value;
      const original = value.afterAppStart;
      if (typeof original === "function") {
        value.afterAppStart = function (...args) {
          if (!isActualSmartDevice()) return false;
          return original.apply(this, args);
        };
      }
      try { Object.defineProperty(value, marker, { value: true }); } catch (_) {}
      return value;
    }

    let current = wrap(window[name]);
    try {
      Object.defineProperty(window, name, {
        configurable: true,
        enumerable: true,
        get() { return current; },
        set(value) { current = wrap(value); }
      });
    } catch (_) {
      if (window[name]) wrap(window[name]);
    }
  }

  function restoreDesktopV11() {
    if (isActualSmartDevice()) return;
    document.body.classList.remove("sr16-enabled", "sr16-full-module", "sr15-enabled", "sr15-menu-open");
    $("#sr16Shell")?.remove();
    document.querySelectorAll(".sr16-bottom,#sr15BottomNav").forEach(node => node.remove());
    const app = $("#app.v11-shell");
    if (app) app.classList.remove("hidden");
  }

  wrapSmartOnlyModule("SmartRiskV11MobileRC15");
  wrapSmartOnlyModule("SmartRiskV11ApprovedRC16");

  function ensureBadge() {
    const smart = isActualSmartDevice();
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
    if (!isActualSmartDevice() || isV11()) {
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
    const smart = isActualSmartDevice();
    document.documentElement.dataset.smartRiskDevice = smart ? "smart" : "desktop";
    document.body.classList.toggle("smart-mobile", smart);
    document.body.classList.toggle("desktop-workspace", !smart);
    if (!smart) {
      closeLegacyMenu();
      restoreDesktopV11();
    }
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
    if (isActualSmartDevice() && !isV11() && $("#app")?.classList.contains("smart-menu-open")) {
      if (!event.target.closest("#app > aside") && !event.target.closest("#smartLegacyNav")) closeLegacyMenu();
    }
  });

  compactMedia.addEventListener?.("change", schedule);
  coarsePointerMedia.addEventListener?.("change", schedule);
  window.addEventListener("resize", schedule);
  window.addEventListener("orientationchange", schedule);
  window.addEventListener("hashchange", schedule);
  new MutationObserver(schedule).observe(document.body, { childList: true, subtree: true, attributes: true, attributeFilter: ["class"] });
  schedule();

  window.SmartRiskDeviceMode = {
    VERSION,
    mode,
    isSmart: isActualSmartDevice,
    mobileBrowserSignal,
    compactTouchSignal,
    explicitMode
  };
})();
