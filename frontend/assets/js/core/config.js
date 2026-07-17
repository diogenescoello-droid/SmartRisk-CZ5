(function () {
  "use strict";

  window.SmartRisk = window.SmartRisk || {};

  window.SmartRisk.Config = Object.freeze({
    environment: "development",
    defaultRoute: "/dashboard",
    organization: "Coordinación Zonal 5",
    currentUser: Object.freeze({
      name: "Daniel Coello",
      role: "Administrador",
      initials: "DC"
    }),
    navigation: Object.freeze([
      { path: "/dashboard", label: "Dashboard", icon: "dashboard" },
      { path: "/territorios", label: "Territorios", icon: "map" },
      { path: "/instituciones", label: "Instituciones", icon: "building" },
      { path: "/sitios", label: "Sitios", icon: "pin" },
      { path: "/acciones", label: "Acciones", icon: "check" }
    ])
  });
})();
