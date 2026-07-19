window.SmartRisk = window.SmartRisk || {};

(function () {
  const routes = new Map();
  const aliases = new Map([["/", "/dashboard"]]);

  function normalize(path) {
    let value = String(path || "/")
      .trim()
      .replace(/^#/, "")
      .split("?")[0]
      .split("&")[0];

    if (!value.startsWith("/")) value = `/${value}`;
    value = value.replace(/\/{2,}/g, "/");
    if (value.length > 1) value = value.replace(/\/+$/, "");
    return value.toLowerCase();
  }

  function current() {
    return normalize(location.hash || SmartRisk.Config.defaultRoute);
  }

  function routeFor(path) {
    const normalized = normalize(path);
    return routes.get(normalized) || routes.get(aliases.get(normalized));
  }

  function recoveryView(path) {
    const safePath = String(path).replace(/[<>&"']/g, "");
    return `
      <section class="empty-state" role="alert">
        <h1>Ruta no encontrada</h1>
        <p>No existe una vista registrada para <strong>${safePath}</strong>.</p>
        <div class="split-actions">
          <a class="btn btn-primary" href="#${SmartRisk.Config.defaultRoute}">Ir al Dashboard</a>
          <button id="router-retry" class="btn btn-secondary" type="button">Reintentar</button>
        </div>
      </section>`;
  }

  function errorView() {
    return `
      <section class="empty-state" role="alert">
        <h1>No fue posible cargar la vista</h1>
        <p>La aplicación encontró un error al ejecutar este módulo.</p>
        <div class="split-actions">
          <button id="router-retry" class="btn btn-primary" type="button">Reintentar</button>
          <a class="btn btn-secondary" href="#${SmartRisk.Config.defaultRoute}">Volver al Dashboard</a>
        </div>
      </section>`;
  }

  function bindRecovery() {
    document.getElementById("router-retry")?.addEventListener("click", resolve);
  }

  async function resolve() {
    const path = current();
    const route = routeFor(path);
    const container = document.getElementById("app-content");

    if (!container) return;
    SmartRisk.Loader.show("Cargando vista…");

    try {
      if (!route) {
        container.innerHTML = recoveryView(path);
        SmartRisk.Utils.setTitle("Ruta no encontrada");
        SmartRisk.Sidebar.setActive("");
        SmartRisk.Navbar.update(path);
        bindRecovery();
        container.focus();
        return;
      }

      container.innerHTML = await route.render();
      SmartRisk.Utils.setTitle(route.title);
      SmartRisk.Sidebar.setActive(normalize(route.path));
      SmartRisk.Navbar.update(normalize(route.path));
      route.bind?.();
      container.focus();
    } catch (error) {
      console.error(`[SmartRisk] Error al resolver ${path}:`, error);
      container.innerHTML = errorView();
      SmartRisk.Utils.setTitle("Error de módulo");
      bindRecovery();
      SmartRisk.Toast?.show("No fue posible cargar el módulo.", "error");
      container.focus();
    } finally {
      SmartRisk.Loader.hide();
    }
  }

  SmartRisk.Router = {
    register(route) {
      if (!route?.path || typeof route.render !== "function") {
        console.warn("[SmartRisk] Ruta omitida por configuración inválida:", route);
        return false;
      }
      routes.set(normalize(route.path), route);
      return true;
    },
    start() {
      addEventListener("hashchange", resolve);
      if (!location.hash) location.hash = SmartRisk.Config.defaultRoute;
      else resolve();
    },
    current,
    resolve,
    has(path) {
      return Boolean(routeFor(path));
    },
    list() {
      return [...routes.keys()];
    }
  };
})();
