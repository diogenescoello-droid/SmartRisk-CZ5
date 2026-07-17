document.addEventListener("DOMContentLoaded",()=>{SmartRisk.Theme.init();SmartRisk.Sidebar.init();[SmartRisk.DashboardModule,SmartRisk.TerritoriosModule,SmartRisk.InstitucionesModule,SmartRisk.SitiosModule,SmartRisk.AccionesModule].forEach(m=>SmartRisk.Router.register(m.route));SmartRisk.Router.start()});
// Sprint 1.5B route registration
if(window.SmartRisk?.Router&&SmartRisk.IndicadoresModule){SmartRisk.Router.register?.(SmartRisk.IndicadoresModule.route,
SmartRisk.ReportesModule.route);}
