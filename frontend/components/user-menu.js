window.SmartRisk=window.SmartRisk||{};
SmartRisk.UserMenu={
  render(){
    const user=SmartRisk.UserContext.current();
    if(!user)return "";
    return `<div class="user-menu-wrap"><button id="user-menu-toggle" class="user-menu-toggle" type="button" aria-expanded="false"><span class="user-badge">${SmartRisk.Utils.escapeHtml(user.initials)}</span><span class="user-menu-copy"><strong>${SmartRisk.Utils.escapeHtml(user.name)}</strong><small>${SmartRisk.Utils.escapeHtml(user.role)}</small></span></button><div id="user-menu-panel" class="user-menu-panel" hidden><div class="user-menu-meta"><strong>${SmartRisk.Utils.escapeHtml(user.institution)}</strong><span>${SmartRisk.Utils.escapeHtml(SmartRisk.UserContext.territoryLabel(user))}</span><small>${SmartRisk.Utils.escapeHtml(user.email)}</small></div><a class="user-menu-action" href="change-password.html">Cambiar contraseña</a><button id="user-menu-logout" class="user-menu-action" type="button">Cerrar sesión</button></div></div>`;
  },
  bind(){
    const toggle=document.getElementById("user-menu-toggle"),panel=document.getElementById("user-menu-panel");
    if(!toggle||!panel)return;
    toggle.onclick=()=>{const open=panel.hidden;panel.hidden=!open;toggle.setAttribute("aria-expanded",String(open));};
    document.getElementById("user-menu-logout").onclick=()=>SmartRisk.AuthService.logout();
    document.addEventListener("click",event=>{if(!event.target.closest(".user-menu-wrap")){panel.hidden=true;toggle.setAttribute("aria-expanded","false");}});
  }
};
