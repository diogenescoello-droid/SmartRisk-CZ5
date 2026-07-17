(function () {
  "use strict";

  const SR = window.SmartRisk;

  function init() {
    SR.Theme.init();
    SR.Sidebar.init();
    SR.Navbar.init();

    [
      SR.DashboardModule,
      SR.TerritoriosModule,
      SR.InstitucionesModule,
      SR.SitiosModule,
      SR.AccionesModule
    ].forEach(module => SR.Router.register(module.route));

    SR.Router.start();
  }

  document.addEventListener("DOMContentLoaded", init);
})();
