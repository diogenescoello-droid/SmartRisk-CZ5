window.SmartRisk = window.SmartRisk || {};

SmartRisk.Config = Object.freeze({
  defaultRoute: "/dashboard",
  currentUser: {
    name: "Daniel Coello",
    role: "Administrador",
    initials: "DC"
  },
  navigation: [
    { path: "/dashboard", label: "Dashboard", icon: "dashboard", group: "Operación" },
    { path: "/territorios", label: "Territorios", icon: "map", group: "Operación" },
    { path: "/instituciones", label: "Instituciones", icon: "building", group: "Operación" },
    { path: "/sitios", label: "Sitios", icon: "pin", group: "Operación" },
    { path: "/acciones", label: "Acciones", icon: "check", group: "Operación" },
    { path: "/indicadores", label: "Indicadores", icon: "bar-chart-2", group: "Análisis" },
    { path: "/reportes", label: "Reportes", icon: "file-text", group: "Análisis" },
    { path: "/sincronizacion", label: "Sincronización", icon: "refresh-cw", group: "Datos" },
    { path: "/kobo", label: "KoboToolbox", icon: "download", group: "Datos" },
    { path: "/arcgis", label: "ArcGIS Online", icon: "map", group: "Datos" }
  ]
});
