(() => {
  const q=new URLSearchParams(location.search);
  if(q.get('scenario')!=='sercop-epmmop-2025')return;
  const VERSION='20260814-01';
  fetch(`sercop-case-epmmop.json?v=${VERSION}`,{cache:'no-store'}).then(r=>r.json()).then(c=>{
    let p=data.find(x=>x.id===c.id);
    if(!p){p={id:c.id,code:'SIM-'+c.processCode,province:'Pichincha',canton:'Quito',stage:'Prospecto',service:'Geotecnia + geofísica · referencia SERCOP',price:0,cost:0,committed:0,actual:0,gate:'G0',progress:100,req:'4 de 4',alerts:['Simulación SERCOP: no representa trabajo ejecutado por SmartRisk']};data.unshift(p)}
    else Object.assign(p,{province:'Pichincha',canton:'Quito',stage:'Prospecto',price:0,cost:0,committed:0,actual:0,gate:'G0',progress:100,req:'4 de 4',alerts:['Simulación SERCOP: no representa trabajo ejecutado por SmartRisk']});
    s.selected=c.id;s.section='panel';s.province='Todas';s.stage='Todas';s.q='';s.filter='all';s.wizard=0;
    const modal=document.getElementById('modal');if(modal){modal.classList.remove('open');modal.style.display='none'}
    const mode=document.querySelector('.mode');if(mode)mode.textContent='● Publicado · simulación SERCOP G0–G10';
    window.SmartRiskSercopCase={case:c,project:p};
    const sc=document.createElement('script');sc.src=`sercop-gate-flow.js?v=${VERSION}`;sc.onload=()=>renderAll();document.body.appendChild(sc);
  }).catch(e=>console.error('Caso SERCOP',e));
})();