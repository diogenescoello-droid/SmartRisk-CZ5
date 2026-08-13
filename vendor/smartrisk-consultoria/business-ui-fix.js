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
  renderAll();
  const script=document.createElement('script');script.src='executive-polish.js';document.body.appendChild(script);
})();