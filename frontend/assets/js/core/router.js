window.SmartRisk=window.SmartRisk||{};
(function(){
  const routes=new Map();
  const aliases=new Map([["/",SmartRisk.Config.defaultRoute]]);
  const norm=p=>{
    let x=String(p||"/").replace(/^#/,"").split("?")[0].trim();
    if(!x.startsWith("/"))x=`/${x}`;
    if(x.length>1)x=x.replace(/\/+$/,"");
    return aliases.get(x)||x;
  };
  const current=()=>norm(location.hash||SmartRisk.Config.defaultRoute);
  const routeLabel=path=>SmartRisk.Config.navigation.find(item=>item.path===path)?.label||"Vista";
  const renderNotFound=(container,path)=>{
    container.innerHTML=`<section class="route-state" role="alert"><div class="route-state-icon">404</div><h1>Ruta no encontrada</h1><p>No existe una vista registrada para <code>${SmartRisk.Utils.escapeHtml(path)}</code>.</p><div class="split-actions"><a class="btn btn-primary" href="#${SmartRisk.Config.defaultRoute}">Volver al Dashboard</a><button id="route-back" class="btn btn-secondary" type="button">Regresar</button></div></section>`;
    document.getElementById("route-back")?.addEventListener("click",()=>history.back());
  };
  const renderError=(container,path,error)=>{
    console.error("SmartRisk route error",path,error);
    container.innerHTML=`<section class="route-state" role="alert"><div class="route-state-icon">!</div><h1>No se pudo cargar ${SmartRisk.Utils.escapeHtml(routeLabel(path))}</h1><p>La vista encontró un error inesperado. Puedes reintentar sin perder los datos almacenados.</p><div class="split-actions"><button id="route-retry" class="btn btn-primary" type="button">Reintentar</button><a class="btn btn-secondary" href="#${SmartRisk.Config.defaultRoute}">Ir al Dashboard</a></div></section>`;
    document.getElementById("route-retry")?.addEventListener("click",resolve);
  };
  async function resolve(){
    const path=current(),route=routes.get(path),container=document.getElementById("app-content");
    if(!container)return;
    SmartRisk.Loader.show("Cargando vista…");
    try{
      if(!route){renderNotFound(container,path);SmartRisk.Sidebar.setActive("");SmartRisk.Navbar.update(path);return;}
      container.innerHTML=await route.render();
      SmartRisk.Utils.setTitle(route.title);
      SmartRisk.Sidebar.setActive(path);
      SmartRisk.Navbar.update(path);
      route.bind?.();
      container.focus({preventScroll:true});
      window.scrollTo({top:0,behavior:"auto"});
    }catch(error){
      renderError(container,path,error);
      SmartRisk.Navbar.update(path);
    }finally{SmartRisk.Loader.hide();}
  }
  SmartRisk.Router={
    register(route){if(route?.path)routes.set(norm(route.path),route);},
    alias(from,to){aliases.set(norm(from),norm(to));},
    navigate(path){location.hash=norm(path);},
    refresh:resolve,
    start(){
      addEventListener("hashchange",resolve);
      if(!location.hash)location.hash=SmartRisk.Config.defaultRoute;else resolve();
    },
    current
  };
})();
