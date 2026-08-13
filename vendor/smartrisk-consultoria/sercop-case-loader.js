(() => {
  const q=new URLSearchParams(location.search);
  if(q.get('scenario')!=='sercop-epmmop-2025')return;
  fetch('sercop-case-epmmop.json').then(r=>r.json()).then(c=>{
    const cost=34800,usd=v=>new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(v),proc=v=>v<=52218.54?'Contratación directa':v<391639.05?'Lista corta':'Concurso público';
    if(!data.some(x=>x.id===c.id))data.unshift({id:c.id,code:'SIM-'+c.processCode,province:'Pichincha',canton:'Quito',stage:'Cierre simulado',service:'Geotecnia + geofísica · referencia SERCOP',price:c.awardAmount,cost,committed:cost,actual:cost,gate:'G10',progress:100,req:'10 de 10',alerts:['Simulación SERCOP: no representa trabajo ejecutado por SmartRisk','Mapa pendiente de archivo georreferenciado']});
    s.selected=c.id;s.section='panel';s.province='Todas';s.stage='Todas';s.q='';s.filter='all';
    const base=renderMain,box=(t,rows)=>`<div class="box" style="margin-top:12px"><h3>${t}</h3>${rows.map(x=>`<div class="listrow"><span>${x[0]}</span><strong>${x[1]}</strong></div>`).join('')}</div>`;
    const banner=`<div class="callout warn"><strong>SIMULACIÓN CON DATOS PÚBLICOS SERCOP</strong><div class="muted">${c.processCode}. Lo contractual es público; costos internos y ejecución técnica son simulados.</div></div>`;
    function extra(){
      if(s.section==='panel')return box('Datos SERCOP',[['Proceso',c.processCode],['Presupuesto referencial',usd(c.referenceBudget)],['Adjudicación',usd(c.awardAmount)],['Procedimiento 2026',proc(c.referenceBudget)],['Anticipo',c.advancePct+'% · '+usd(c.advanceAmount)],['Plazo',c.termDays+' días']]);
      if(s.section==='control')return box('Contrato y garantía',[['Contrato',c.contractDate],['Inicio',c.startDate],['Fin previsto',c.plannedEnd],['Garantía',c.guaranteeNumber],['Monto garantía',usd(c.guaranteeAmount)],['Vence',c.guaranteeEnd]]);
      if(s.section==='direccion')return box('Economía interna · SIMULADA',[['Contrato',usd(c.awardAmount)],['Costo interno',usd(cost)],['Margen',(((c.awardAmount-cost)/c.awardAmount)*100).toFixed(1)+'%']]);
      if(s.section==='documentos')return box('Expediente público identificado',[['Notificación de anticipo','SERCOP'],['Transferencia de anticipo','SERCOP'],['Contrato suscrito','SERCOP'],['Certificación presupuestaria','SERCOP'],['Notificación administrador','SERCOP'],['Garantía buen uso anticipo','SERCOP']]);
      if(s.section==='operacion')return box('Ejecución técnica · SIMULADA',[['Perforaciones/SPT','Por TDR'],['Muestras/Lab','Cadena de custodia'],['Geofísica','Vs/HVSR + QA'],['SIG','Solo georreferenciación real']]);
      if(s.section==='alertas')return box('Alertas derivadas',[['Precio','Adjudicación bajo referencial'],['Anticipo','Control de garantía'],['Plazo',c.termDays+' días'],['Mapa','Sin coordenadas inventadas']]);
      return '';
    }
    renderMain=function(){base();if(project()?.id===c.id&&s.section!=='negocios'&&s.section!=='mapa')setTimeout(()=>{const m=document.getElementById('main');if(m&&!m.querySelector('[data-sercop-case]')){const d=document.createElement('div');d.dataset.sercopCase='1';d.innerHTML=banner+extra();m.prepend(d)}},0)};
    const mode=document.querySelector('.mode');if(mode)mode.textContent='● Publicado · simulación SERCOP';renderAll();
  }).catch(e=>console.error('Caso SERCOP',e));
})();