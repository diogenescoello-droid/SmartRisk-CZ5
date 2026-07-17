(function () {
  "use strict";

  window.SmartRisk = window.SmartRisk || {};

  function render(path) {
    const current = window.SmartRisk.Config.navigation.find(item => item.path === path);
    const user = window.SmartRisk.Config.currentUser;

    return `
      <div class="navbar-left">
        <button id="navbar-menu" class="icon-btn" type="button" aria-label="Alternar menú">
          ${window.SmartRisk.Icon.render("menu", 20)}
        </button>

        <div>
          <h2 class="navbar-title">${current?.label || "SmartRisk CZ5"}</h2>
          <div class="navbar-context">${window.SmartRisk.Utils.formatDate()}</div>
        </div>
      </div>

      <div class="navbar-right">
        <button id="theme-toggle" class="icon-btn" type="button" title="Cambiar tema">
          ${window.SmartRisk.Icon.render("moon", 19)}
        </button>

        <button id="notifications-button" class="icon-btn" type="button" title="Notificaciones">
          ${window.SmartRisk.Icon.render("bell", 19)}
        </button>

        <div class="user-chip">
          <span class="avatar">${user.initials}</span>
          <span class="user-copy">
            <strong>${user.name}</strong>
            <small>${user.role}</small>
          </span>
        </div>
      </div>`;
  }

  function bind() {
    document.getElementById("navbar-menu")
      ?.addEventListener("click", window.SmartRisk.Sidebar.toggle);

    document.getElementById("theme-toggle")
      ?.addEventListener("click", window.SmartRisk.Theme.toggle);

    document.getElementById("notifications-button")
      ?.addEventListener("click", () => {
        window.SmartRisk.Toast.show("No existen nuevas notificaciones críticas.", "info");
      });
  }

  window.SmartRisk.Navbar = {
    init() {
      this.update(window.SmartRisk.Router.current());
    },

    update(path) {
      document.getElementById("app-navbar").innerHTML = render(path);
      bind();
    }
  };
})();
