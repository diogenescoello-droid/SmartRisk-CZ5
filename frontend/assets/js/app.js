document.addEventListener("DOMContentLoaded", () => {
  SmartRisk.Theme.init();
  SmartRisk.Sidebar.init();

  const modules = [
    ["Dashboard", SmartRisk.DashboardModule],
    ["Territorios", SmartRisk.TerritoriosModule],
    ["Instituciones", SmartRisk.InstitucionesModule],
    ["Sitios", SmartRisk.SitiosModule],
    ["Acciones", SmartRisk.AccionesModule],
    ["Indicadores", SmartRisk.IndicadoresModule],
    ["Reportes", SmartRisk.ReportesModule],
    ["Sincronización", SmartRisk.SincronizacionModule],
    ["KoboToolbox", SmartRisk.KoboModule],
    ["ArcGIS Online", SmartRisk.ArcGISModule]
  ];

  const missing = [];
  modules.forEach(([name, module]) => {
    if (!module?.route || !SmartRisk.Router.register(module.route)) missing.push(name);
  });

  if (missing.length) {
    console.warn(`[SmartRisk] Módulos no registrados: ${missing.join(", ")}`);
    SmartRisk.Toast?.show(`Módulos no disponibles: ${missing.join(", ")}`, "error");
  }

  console.info("[SmartRisk] Rutas registradas:", SmartRisk.Router.list());
  SmartRisk.Router.start();
});
