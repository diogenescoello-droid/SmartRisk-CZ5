window.SmartRisk = window.SmartRisk || {};

SmartRisk.Navbar = {
  update(path) {
    const currentPath = String(path || SmartRisk.Config.defaultRoute).toLowerCase();
    const item = SmartRisk.Config.navigation.find(entry => entry.path === currentPath);
    const user = SmartRisk.Config.currentUser;
    const navbar = document.getElementById("app-navbar");
    if (!navbar) return;

    const options = SmartRisk.Config.navigation
      .map(entry => `<option value="${entry.path}" ${entry.path === currentPath ? "selected" : ""}>${entry.label}</option>`)
      .join("");

    const title = item?.label || "SmartRisk";
    const group = item?.group || "Navegación";

    navbar.innerHTML = `
      <div class="navbar-left">
        <button id="navbar-menu" class="icon-btn" type="button" aria-label="Abrir o cerrar menú principal" title="Menú">
          ${SmartRisk.Icon.render("menu", 20)}
        </button>
        <div class="navbar-heading">
          <nav class="breadcrumb" aria-label="Ruta de navegación">
            <a href="#${SmartRisk.Config.defaultRoute}">Inicio</a>
            <span aria-hidden="true">›</span>
            <span>${group}</span>
            <span aria-hidden="true">›</span>
            <strong aria-current="page">${title}</strong>
          </nav>
          <h2 class="navbar-title">${title}</h2>
          <div class="navbar-context">${SmartRisk.Utils.formatDate()}</div>
        </div>
      </div>
      <div class="navbar-right">
        <label class="quick-nav-label" for="quick-nav">Ir a</label>
        <select id="quick-nav" class="quick-nav" aria-label="Cambiar rápidamente de módulo">
          ${options}
        </select>
        <button id="theme-toggle" class="icon-btn" type="button" aria-label="Cambiar tema" title="Cambiar tema">
          ${SmartRisk.Icon.render("moon", 19)}
        </button>
        <button id="notification-button" class="icon-btn" type="button" aria-label="Ver alertas" title="Alertas">
          ${SmartRisk.Icon.render("bell", 19)}
        </button>
        <div class="navbar-user" aria-label="Usuario actual: ${user.name}">
          <strong>${user.initials}</strong>
        </div>
      </div>`;

    document.getElementById("navbar-menu")?.addEventListener("click", SmartRisk.Sidebar.toggle);
    document.getElementById("theme-toggle")?.addEventListener("click", SmartRisk.Theme.toggle);
    document.getElementById("quick-nav")?.addEventListener("change", event => {
      const target = event.target.value;
      if (target && target !== SmartRisk.Router.current()) location.hash = target;
    });
    document.getElementById("notification-button")?.addEventListener("click", () => {
      SmartRisk.Toast?.show("No existen alertas nuevas en esta sesión.", "success");
    });
  }
};
