SmartRisk.Sidebar={
  init(){
    const root=document.getElementById("app-sidebar");
    const groups=SmartRisk.Config.navigation.reduce((acc,item)=>{(acc[item.group]||(acc[item.group]=[])).push(item);return acc;},{});
    const nav=Object.entries(groups).map(([group,items])=>`<div class="sidebar-group"><div class="sidebar-group-title">${group}</div>${items.map(item=>`<a class="sidebar-link" data-route="${item.path}" href="#${item.path}" aria-label="Abrir ${item.label}"><span class="sidebar-link-icon">${SmartRisk.Icon.render(item.icon,20)}</span><span class="sidebar-link-label">${item.label}</span></a>`).join("")}</div>`).join("");
    root.innerHTML=`<div class="sidebar-brand"><div class="sidebar-brand-mark">SR</div><div class="sidebar-brand-copy"><h1 class="sidebar-brand-title">SmartRisk CZ5</h1><p class="sidebar-brand-subtitle">Gestión territorial del riesgo</p></div></div><nav class="sidebar-nav" aria-label="Navegación principal">${nav}</nav><div class="sidebar-footer"><div class="sidebar-footer-copy">${SmartRisk.Constants.APP_VERSION}</div></div>`;
    root.addEventListener("click",event=>{if(event.target.closest(".sidebar-link")&&innerWidth<=860)root.classList.remove("is-mobile-open");});
  },
  toggle(){const root=document.getElementById("app-sidebar");if(innerWidth<=860)root.classList.toggle("is-mobile-open");else root.classList.toggle("is-collapsed");},
  closeMobile(){document.getElementById("app-sidebar")?.classList.remove("is-mobile-open");},
  setActive(path){document.querySelectorAll(".sidebar-link").forEach(link=>{const active=link.dataset.route===path;link.classList.toggle("is-active",active);if(active)link.setAttribute("aria-current","page");else link.removeAttribute("aria-current");});}
};
