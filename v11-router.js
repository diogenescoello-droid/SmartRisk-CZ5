(() => {
  "use strict";

  const routes = [
    { id: "inicio", title: "Inicio", subtitle: "Resumen ejecutivo e indicadores clave", icon: "dashboard", group: "Resumen" },
    { id: "dashboard", title: "Dashboard", subtitle: "Lectura zonal, provincial y cantonal", icon: "dashboard", group: "Resumen" },
    { id: "respuesta-coe", title: "Respuesta COE", subtitle: "Gestión de riesgos durante la respuesta", icon: "response", group: "Operación COE" },
    { id: "coe", title: "COE", subtitle: "Programación, sesiones y coordinación", icon: "people", group: "Operación COE" },
    { id: "acciones", title: "Acciones", subtitle: "Gestión y seguimiento de acciones del COE", icon: "actions", group: "Operación COE" },
    { id: "monitoreo", title: "Monitoreo", subtitle: "Seguimiento de reportes y verificación de información", icon: "monitor", group: "Análisis y territorio" },
    { id: "riesgos", title: "Riesgos", subtitle: "Amenazas, exposición y sitios críticos", icon: "risk", group: "Análisis y territorio" },
    { id: "mapas", title: "Mapas", subtitle: "Visualización territorial y capas operativas", icon: "map", group: "Análisis y territorio" },
    { id: "instituciones", title: "Instituciones", subtitle: "Relaciones, competencias y capacidades", icon: "institution", group: "Coordinación y productos" },
    { id: "reportes", title: "Reportes", subtitle: "Generación, revisión y exportación", icon: "reports", group: "Coordinación y productos" },
    { id: "herramientas", title: "Herramientas", subtitle: "Utilidades, auditoría y administración", icon: "tools", group: "Administración" },
    { id: "configuracion", title: "Configuración", subtitle: "Perfil, preferencias y notificaciones", icon: "settings", group: "Administración" }
  ];

  const aliases = {
    "": "inicio",
    home: "inicio",
    inicio: "inicio",
    dashboard: "dashboard",
    panel: "dashboard",
    resumen: "inicio",
    config: "configuracion",
    settings: "configuracion",
    tools: "herramientas"
  };

  function normalizeRoute(value) {
    const raw = String(value || "")
      .trim()
      .replace(/^#\/?/, "")
      .replace(/^\//, "")
      .split("?")[0]
      .toLowerCase();
    return aliases[raw] || raw || "inicio";
  }

  function getRoute(routeId) {
    const normalized = normalizeRoute(routeId);
    return routes.find(route => route.id === normalized) || routes[0];
  }

  function getRouteFromHash(hash) {
    return getRoute(hash || window.location.hash);
  }

  window.SmartRiskV11Router = { routes, aliases, normalizeRoute, getRoute, getRouteFromHash };
})();
