(() => {
  if(!window.SmartRiskBusinessMarket)return;
  const previousRenderProjects=renderProjects;
  renderProjects=function(){
    const projectFilterBar=document.querySelector('main.shell > section.filters.card');
    if(s.section==='negocios'){
      $('projects').innerHTML='';
      $('projects').classList.add('hidden');
      if(projectFilterBar)projectFilterBar.classList.add('hidden');
      return;
    }
    if(projectFilterBar)projectFilterBar.classList.remove('hidden');
    previousRenderProjects();
  };

  const previousRenderMain=renderMain;
  renderMain=function(){
    if(s.section==='acciones'){
      const p=project();
      $('main').innerHTML=actions(p);
      return;
    }
    previousRenderMain();
  };

  renderAll();
  const script=document.createElement('script');script.src='executive-polish.js';document.body.appendChild(script);
})();