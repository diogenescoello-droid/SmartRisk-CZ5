window.SmartRisk = window.SmartRisk || {};

SmartRisk.Sidebar = {
  init() {
    const sidebar = document.getElementById("app-sidebar");
    if (!sidebar) return;

    const allowedNavigation = SmartRisk.Config.navigation.filter(item => SmartRisk.PermissionService.can(SmartRisk.PermissionService.navigationPermission(item.path)));

    const groups = allowedNavigation.reduce((result, item) => {
      const group = item.group || "General";
      (result[group] ||= []).push(item);
      return result;
    }, {});

    const navigation = Object.entries(groups)
      .map(([group, items]) => `
        <div class="sidebar-group">
          <div class="sidebar-group-label">${group}</div>
          ${items.map(item => `
            <a class="sidebar-link" data-route="${item.path}" href="#${item.path}">
              <span class="sidebar-link-icon">${SmartRisk.Icon.render(item.icon, 20)}</span>
              <span class="sidebar-link-label">${item.label}</span>
            </a>`).join("")}
        </div>`)
      .join("");

    sidebar.innerHTML = `
      <div class="sidebar-brand">
        <div class="sidebar-brand-mark">SR</div>
        <div class="sidebar-brand-copy">
          <h1 class="sidebar-brand-title">SmartRisk CZ5</h1>
          <p class="sidebar-brand-subtitle">Gestión territorial del riesgo</p>
        </div>
      </div>
      <nav class="sidebar-nav" aria-label="Navegación principal">${navigation}</nav>
      <div class="sidebar-footer">
        <div class="sidebar-footer-copy">${SmartRisk.Constants.APP_VERSION}</div>
      </div>`;

    sidebar.querySelectorAll(".sidebar-link").forEach(link => {
      link.addEventListener("click", () => {
        if (innerWidth <= 860) sidebar.classList.remove("is-mobile-open");
      });
    });
  },

  toggle() {
    const sidebar = document.getElementById("app-sidebar");
    if (!sidebar) return;
    if (innerWidth <= 860) sidebar.classList.toggle("is-mobile-open");
    else sidebar.classList.toggle("is-collapsed");
  },

  setActive(path) {
    document.querySelectorAll(".sidebar-link").forEach(link => {
      const active = link.dataset.route === path;
      link.classList.toggle("is-active", active);
      if (active) link.setAttribute("aria-current", "page");
      else link.removeAttribute("aria-current");
    });
  }
};
