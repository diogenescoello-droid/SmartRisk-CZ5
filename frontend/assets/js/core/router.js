(function () {
  "use strict";

  window.SmartRisk = window.SmartRisk || {};

  const routes = new Map();

  function normalize(path) {
    const clean = String(path || "/").replace(/^#/, "").trim();
    return clean.startsWith("/") ? clean : `/${clean}`;
  }

  function current() {
    return normalize(location.hash || window.SmartRisk.Config.defaultRoute);
  }

  async function resolve() {
    const path = current();
    const route = routes.get(path);
    const content = document.getElementById("app-content");

    window.SmartRisk.Loader.show("Cargando vista…");

    try {
      if (!route) {
        content.innerHTML = `
          <section class="panel module-placeholder">
            <div>
              <span class="badge badge-danger">404</span>
              <h2>Ruta no encontrada</h2>
              <p class="muted">La vista solicitada no está registrada.</p>
              <a class="btn btn-primary" href="#/dashboard">Volver al dashboard</a>
            </div>
          </section>`;
        return;
      }

      content.innerHTML = await route.render();
      content.focus({ preventScroll: true });

      window.SmartRisk.Utils.setTitle(route.title);
      window.SmartRisk.Sidebar.setActive(path);
      window.SmartRisk.Navbar.update(path);
      route.bind?.();
    } finally {
      window.SmartRisk.Loader.hide();
    }
  }

  window.SmartRisk.Router = {
    register(route) {
      routes.set(normalize(route.path), route);
    },

    start() {
      addEventListener("hashchange", resolve);

      if (!location.hash) {
        location.hash = window.SmartRisk.Config.defaultRoute;
      } else {
        resolve();
      }
    },

    current
  };
})();
