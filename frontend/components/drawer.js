window.SmartRisk = window.SmartRisk || {};

(function () {
  const SR = window.SmartRisk;
  let active = null;

  function getRoot() {
    return document.getElementById("app-drawer-root");
  }

  function getFocusable(container) {
    if (!container) return [];
    return [...container.querySelectorAll(
      'a[href], button:not([disabled]), input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
    )].filter((element) => !element.hasAttribute("hidden"));
  }

  function close() {
    const root = getRoot();
    if (!root || !active) return;

    const { returnFocus, onClose } = active;
    root.innerHTML = "";
    document.body.classList.remove("drawer-open");
    document.removeEventListener("keydown", handleKeydown);
    active = null;

    if (typeof onClose === "function") onClose();
    if (returnFocus && document.contains(returnFocus)) returnFocus.focus();
  }

  function handleKeydown(event) {
    if (!active) return;

    if (event.key === "Escape") {
      event.preventDefault();
      close();
      return;
    }

    if (event.key !== "Tab") return;
    const panel = document.querySelector(".smart-drawer");
    const focusable = getFocusable(panel);
    if (!focusable.length) return;

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    if (event.shiftKey && document.activeElement === first) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && document.activeElement === last) {
      event.preventDefault();
      first.focus();
    }
  }

  function open({
    title = "Detalle",
    subtitle = "",
    body = "",
    width = "480px",
    ariaLabel = "Panel de detalle",
    onClose = null
  } = {}) {
    const root = getRoot();
    if (!root) {
      console.error("SmartRisk.Drawer: no existe #app-drawer-root.");
      return;
    }

    if (active) close();

    active = {
      returnFocus: document.activeElement,
      onClose
    };

    root.innerHTML = `
      <div class="smart-drawer-backdrop" data-drawer-dismiss="true">
        <aside class="smart-drawer" role="dialog" aria-modal="true" aria-label="${ariaLabel}" style="--drawer-width:${width}">
          <header class="smart-drawer-header">
            <div class="smart-drawer-heading">
              <h2 class="smart-drawer-title">${title}</h2>
              ${subtitle ? `<p class="smart-drawer-subtitle">${subtitle}</p>` : ""}
            </div>
            <button type="button" class="icon-btn smart-drawer-close" aria-label="Cerrar panel" title="Cerrar (Esc)">×</button>
          </header>
          <div class="smart-drawer-body">${body}</div>
          <footer class="smart-drawer-footer">
            <span class="smart-drawer-hint">Presiona Esc o haz clic fuera para cerrar</span>
            <button type="button" class="btn btn-secondary smart-drawer-close-button">Cerrar</button>
          </footer>
        </aside>
      </div>`;

    document.body.classList.add("drawer-open");
    document.addEventListener("keydown", handleKeydown);

    root.querySelector(".smart-drawer-close")?.addEventListener("click", close);
    root.querySelector(".smart-drawer-close-button")?.addEventListener("click", close);
    root.querySelector(".smart-drawer-backdrop")?.addEventListener("click", (event) => {
      if (event.target?.dataset?.drawerDismiss === "true") close();
    });

    requestAnimationFrame(() => {
      root.querySelector(".smart-drawer-close")?.focus();
    });
  }

  function setBody(body) {
    const target = document.querySelector(".smart-drawer-body");
    if (target) target.innerHTML = body;
  }

  SR.Drawer = { open, close, setBody };
})();
