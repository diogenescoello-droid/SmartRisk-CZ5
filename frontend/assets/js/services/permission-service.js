window.SmartRisk=window.SmartRisk||{};
(function(){
  const MATRIX={
    "Administrador":["app.access","territory.view","institution.view","site.view","site.create","site.edit","site.delete","action.view","action.create","action.edit","action.delete","indicator.view","report.view","sync.manage","kobo.manage","arcgis.manage","user.manage","validate"],
    "Coordinador zonal":["app.access","user.manage","territory.view","institution.view","site.view","site.create","site.edit","action.view","action.create","action.edit","indicator.view","report.view","sync.manage","kobo.manage","arcgis.manage","validate"],
    "Analista":["app.access","territory.view","institution.view","site.view","site.create","site.edit","action.view","action.create","action.edit","indicator.view","report.view","arcgis.manage"],
    "Técnico UGR":["app.access","territory.view","institution.view","site.view","site.create","site.edit","action.view","action.create","action.edit","report.view"],
    "Consulta":["app.access","territory.view","institution.view","site.view","action.view","indicator.view","report.view"]
  };
  SmartRisk.PermissionService={
    permissionsFor(role){return [...(MATRIX[role]||[])];},
    can(permission,user=SmartRisk.UserContext?.current()){return Boolean(user&&this.permissionsFor(user.role).includes(permission));},
    any(permissions,user=SmartRisk.UserContext?.current()){return permissions.some(p=>this.can(p,user));},
    navigationPermission(path){return ({"/dashboard":"app.access","/territorios":"territory.view","/instituciones":"institution.view","/sitios":"site.view","/acciones":"action.view","/indicadores":"indicator.view","/reportes":"report.view","/sincronizacion":"sync.manage","/kobo":"kobo.manage","/arcgis":"arcgis.manage","/usuarios":"user.manage"})[path]||"app.access";}
  };
})();
