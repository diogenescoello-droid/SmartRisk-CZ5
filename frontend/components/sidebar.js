(function () {
  "use strict";

  window.SmartRisk = window.SmartRisk || {};

  function render() {
    return `
      <div class="sidebar-brand">
        <div class="sidebar-brand-mark">SR</div>
        <div class="sidebar-brand-copy">
          <h1 class="sidebar-brand-title">SmartRisk CZ5</h1>
          <p class="sidebar-brand-subtitle">Gestión territorial del riesgo</p>
        </div>
      </div>

      <nav class="sidebar-nav">
        ${window.SmartRisk.Config.navigation.map(item => `
          <a class="sidebar-link" data-route="${item.path}" href="#${item.path}">
            <span class="sidebar-link-icon">${window.SmartRisk.Icon.render(item.icon, 20)}</span>
            <span class="sidebar-link-label">${item.label}</span>
          </a>`).join("")}
      </nav>

      <div class="sidebar-footer">
        <div class="sidebar-footer-copy">
          <strong>${window.SmartRisk.Constants.APP_VERSION}</strong><br>
          Núcleo visual institucional
        </div>
      </div>`;
  }

  window.SmartRisk.Sidebar = {
    init() {
      const element = document.getElementById("app-sidebar");
      element.innerHTML = render();

      if (innerWidth > 860 && window.SmartRisk.Storage.get("sidebar.collapsed", false)) {
        element.classList.add("is-collapsed");
      }
    },

    toggle() {
      const element = document.getElementById("app-sidebar");

      if (innerWidth <= 860) {
        element.classList.toggle("is-mobile-open");
        return;
      }

      element.classList.toggle("is-collapsed");
      window.SmartRisk.Storage.set(
        "sidebar.collapsed",
        element.classList.contains("is-collapsed")
      );
    },

    setActive(path) {
      document.querySelectorAll(".sidebar-link").forEach(link => {
        link.classList.toggle("is-active", link.dataset.route === path);
      });

      document.getElementById("app-sidebar").classList.remove("is-mobile-open");
    }
  };
})();
