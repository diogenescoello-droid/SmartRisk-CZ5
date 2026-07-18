SmartRisk.Navbar={
  update(path){
    const item=SmartRisk.Config.navigation.find(entry=>entry.path===path),user=SmartRisk.Config.currentUser,root=document.getElementById("app-navbar");
    const options=SmartRisk.Config.navigation.map(entry=>`<option value="${entry.path}" ${entry.path===path?"selected":""}>${entry.label}</option>`).join("");
    root.innerHTML=`<div class="navbar-left"><button id="navbar-menu" class="icon-btn" type="button" aria-label="Abrir o cerrar menú">${SmartRisk.Icon.render("menu",20)}</button><div><nav class="breadcrumb" aria-label="Miga de pan"><a href="#${SmartRisk.Config.defaultRoute}">Inicio</a><span aria-hidden="true">/</span><span aria-current="page">${item?.label||"Ruta no encontrada"}</span></nav><h2 class="navbar-title">${item?.label||"SmartRisk"}</h2></div></div><div class="navbar-right"><label class="quick-nav-label" for="quick-nav">Ir a</label><select id="quick-nav" class="quick-nav" aria-label="Ir rápidamente a un módulo">${options}</select><button id="theme-toggle" class="icon-btn" type="button" aria-label="Cambiar tema">${SmartRisk.Icon.render("moon",19)}</button><button id="notification-button" class="icon-btn" type="button" aria-label="Ver alertas">${SmartRisk.Icon.render("bell",19)}</button><div class="user-badge" title="${user.name} · ${user.role}" aria-label="Usuario ${user.name}">${user.initials}</div></div>`;
    document.getElementById("navbar-menu").onclick=SmartRisk.Sidebar.toggle;
    document.getElementById("theme-toggle").onclick=SmartRisk.Theme.toggle;
    document.getElementById("quick-nav").onchange=event=>SmartRisk.Router.navigate(event.target.value);
    document.getElementById("notification-button").onclick=()=>SmartRisk.Toast.show("Las alertas operativas están disponibles en el Dashboard Ejecutivo.","info");
  }
};
