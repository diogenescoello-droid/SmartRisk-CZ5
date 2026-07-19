window.SmartRisk=window.SmartRisk||{};(function(){
const routes=new Map();
const norm=p=>{const x=String(p||"/").replace(/^#/,"").split("?")[0];return x.startsWith("/")?x:`/${x}`};
const current=()=>norm(location.hash||SmartRisk.Config.defaultRoute);
async function resolve(){
  let p=current();
  if(p==="/"){location.replace(`#${SmartRisk.Config.defaultRoute}`);return}
  const r=routes.get(p),c=document.getElementById("app-content");
  SmartRisk.Loader.show("Cargando vista…");
  try{
    if(!r){
      c.innerHTML=`<section class="empty-state"><h2>Ruta no encontrada</h2><p>La vista solicitada no está registrada.</p><a class="btn" href="#${SmartRisk.Config.defaultRoute}">Volver al Dashboard</a></section>`;
      SmartRisk.Utils.setTitle("Ruta no encontrada");
      SmartRisk.Sidebar.setActive("");
      return
    }
    c.innerHTML=await r.render();
    SmartRisk.Utils.setTitle(r.title);
    SmartRisk.Sidebar.setActive(p);
    SmartRisk.Navbar.update(p);
    r.bind?.()
  }catch(error){
    console.error(error);
    c.innerHTML=`<section class="empty-state"><h2>No fue posible cargar la vista</h2><p>${SmartRisk.Utils.escapeHtml(error.message||"Error inesperado")}</p><button class="btn" onclick="location.reload()">Reintentar</button></section>`
  }finally{SmartRisk.Loader.hide()}
}
SmartRisk.Router={
  register(r){if(r?.path)routes.set(norm(r.path),r)},
  start(){addEventListener("hashchange",resolve);if(!location.hash)location.hash=SmartRisk.Config.defaultRoute;else resolve()},
  current,
  go(path){location.hash=norm(path)}
}})();