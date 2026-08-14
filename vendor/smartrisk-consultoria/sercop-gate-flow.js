(() => {
  const ctx=window.SmartRiskSercopCase;
  if(!ctx)return;
  const c=ctx.case,p=ctx.project;
  const usd=v=>new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD',maximumFractionDigits:2}).format(Number(v)||0);
  const sim={targetPrice:46500,offerAmount:44500,internalCost:34800,committedField:21600,actualField:11800,actualProcessing:25500,eac:34800,invoiced:43500,collected:43500};
  const flow=[
    {gate:'G0',name:'Prospección',stage:'Prospecto',progress:100,req:'4 de 4',born:['Entidad objetivo','Necesidad potencial','Contacto / canal','Próxima acción'],block:'No avanzar sin entidad, necesidad y siguiente acción definidos.',alert:'Validar encaje comercial antes de invertir tiempo técnico.'},
    {gate:'G1',name:'Oportunidad calificada',stage:'Oportunidad',progress:100,req:'6 de 6',born:['Proceso SERCOP','Presupuesto referencial','Procedimiento','GO/NO-GO','Probabilidad comercial'],block:'NO-GO si la oportunidad no es viable comercial, legal o temporalmente.',alert:'Comparar presupuesto referencial con capacidad y costo de preparar oferta.'},
    {gate:'G2',name:'Prefactibilidad técnica',stage:'Prefactibilidad',progress:100,req:'6 de 6',born:['Alcance preliminar','Campaña defendible','Complejidad','Productos técnicos','Riesgos técnicos'],block:'No ofertar sin alcance y campaña técnicamente defendibles.',alert:'Confirmar que TDR, acceso y plazo permiten ejecutar la campaña.'},
    {gate:'G3',name:'Presupuesto aprobado',stage:'Diseño técnico-económico',progress:100,req:'7 de 7',born:['BAC interno','Precio objetivo','Contingencia','Margen mínimo','Supuestos'],block:'No preparar oferta con margen no autorizado o costos críticos sin cubrir.',alert:'El presupuesto interno no debe confundirse con presupuesto referencial SERCOP.'},
    {gate:'G4',name:'Oferta lista',stage:'Oferta',progress:100,req:'8 de 8',born:['Oferta técnica','Oferta económica','Equipo propuesto','Cronograma de oferta','Documentación habilitante'],block:'No presentar mientras falten requisitos del pliego o QA de la oferta.',alert:'La oferta económica puede diferir del referencial y del valor luego adjudicado.'},
    {gate:'G5',name:'Contrato activado',stage:'Contratación',progress:100,req:'8 de 8',born:['Valor contractual','Contrato','Administrador','Garantía','Anticipo','Condición real de inicio'],block:'Campo bloqueado hasta contrato, garantía, anticipo/condición de inicio y responsables.',alert:'Controlar vigencia de garantía y fecha real desde la que corre el plazo.'},
    {gate:'G6',name:'Campo autorizado',stage:'Ejecución',progress:100,req:'9 de 9',born:['Plan de campo','Accesos','Puntos de investigación','Cadena de custodia','SST','Compromisos de costo'],block:'No ejecutar puntos sin acceso, seguridad, equipos y custodia definidos.',alert:'Comparar costo comprometido y avance físico; no usar Gate como avance físico.'},
    {gate:'G7',name:'Datos validados',stage:'Procesamiento',progress:100,req:'8 de 8',born:['Resultados validados','Laboratorio','Geofísica procesada','QA instrumental','Base SIG'],block:'No modelar ni cerrar resultados con inconsistencias técnicas abiertas.',alert:'Toda no conformidad alta debe cerrarse antes del entregable.'},
    {gate:'G8',name:'Entregable listo',stage:'Revisión / Entrega',progress:100,req:'8 de 8',born:['Informe técnico','Cartografía','Base de datos','Checklist TDR','Versión aprobada QA/QC'],block:'Entrega bloqueada mientras exista QA/QC crítico o requisito TDR pendiente.',alert:'Control de versiones obligatorio antes de liberar al cliente.'},
    {gate:'G9',name:'Recepción y cobro',stage:'Recepción / Cobro',progress:100,req:'7 de 7',born:['Acta / conformidad','Factura','Cobro','Saldo','Liberación / control de garantías'],block:'No cerrar económicamente con saldo, acta o garantías pendientes.',alert:'Conciliar facturación, cobro y costos pagados antes del cierre.'},
    {gate:'G10',name:'Cierre / postventa',stage:'Cierre',progress:100,req:'6 de 6',born:['Costo final','Margen real','Lecciones aprendidas','Archivo','Referencia / postventa'],block:'Cierre exige expediente completo y economía conciliada.',alert:'Convertir el cierre en referencia comercial y nueva oportunidad cuando aplique.'}
  ];
  const qp=new URLSearchParams(location.search),requested=(qp.get('gate')||'').toUpperCase();
  let index=Math.max(0,flow.findIndex(x=>x.gate===requested));
  if(index<0)index=0;
  const sourceTag=t=>`<span class="status ${t==='Público SERCOP'?'ok':'warn'}">${t}</span>`;
  const row=(a,b,t)=>`<div class="listrow"><div><strong>${a}</strong>${t?`<small>${t}</small>`:''}</div><span>${b}</span></div>`;
  const box=(title,html)=>`<div class="box" style="margin-top:10px"><h3>${title}</h3>${html}</div>`;
  function finance(i){
    return {
      reference:c.referenceBudget,
      target:i>=3?sim.targetPrice:0,
      offer:i>=4?sim.offerAmount:0,
      contract:i>=5?c.awardAmount:0,
      bac:i>=3?sim.internalCost:0,
      committed:i===6?sim.committedField:i>6?sim.internalCost:0,
      actual:i===6?sim.actualField:i===7?sim.actualProcessing:i>7?sim.internalCost:0,
      eac:i>=6?sim.eac:0,
      invoiced:i>=9?sim.invoiced:0,
      collected:i>=9?sim.collected:0
    };
  }
  function apply(){
    const f=flow[index],e=finance(index);
    Object.assign(p,{stage:f.stage,gate:f.gate,progress:f.progress,req:f.req,price:e.contract||e.offer||e.target||0,cost:e.bac,committed:e.committed,actual:e.actual});
    p.alerts=['Simulación SERCOP: no representa trabajo ejecutado por SmartRisk',f.alert];
  }
  function gateBar(){
    const f=flow[index];
    return `<div data-sercop-flow><div class="callout warn"><strong>SIMULACIÓN G0–G10 · ${c.processCode}</strong><div class="muted">Datos contractuales públicos SERCOP + ejecución/costos internos simulados. Gate actual: ${f.gate} · ${f.name}.</div></div><div class="box" style="margin-top:8px"><div class="row" style="gap:8px;align-items:center"><button class="btn" id="srPrevGate" ${index===0?'disabled':''}>← Anterior</button><label class="field" style="flex:1"><span>Momento del proyecto</span><select id="srGateSelect">${flow.map((g,i)=>`<option value="${i}" ${i===index?'selected':''}>${g.gate} · ${g.name}</option>`).join('')}</select></label><button class="btn primary" id="srNextGate" ${index===flow.length-1?'disabled':''}>Siguiente →</button></div><div class="callout ${index<5?'warn':'ok'}" style="margin-top:8px"><strong>Regla de salida</strong><div class="muted">${f.block}</div></div></div></div>`;
  }
  function bornBox(){const f=flow[index];return box(`Datos que nacen en ${f.gate}`,f.born.map(x=>row(x,'✓ dato canónico','Se registra una vez y se reutiliza')).join(''))}
  function financialBox(){
    const e=finance(index),items=[['Presupuesto referencial',e.reference,'Público SERCOP','G1'],['Precio objetivo',e.target,'Simulado interno','G3'],['Oferta económica',e.offer,'Simulado interno','G4'],['Valor contractual',e.contract,'Público SERCOP','G5'],['BAC / costo interno',e.bac,'Simulado interno','G3'],['Comprometido',e.committed,'Simulado interno','G6'],['Costo real',e.actual,'Simulado interno','G6–G10'],['EAC',e.eac,'Simulado interno','G6–G10'],['Facturado',e.invoiced,'Simulado interno','G9'],['Cobrado',e.collected,'Simulado interno','G9']];
    return box('Trazabilidad económica',items.map(x=>row(`${x[0]} · origen ${x[3]}`,x[1]?usd(x[1]):'—',x[2])).join(''));
  }
  function contractBox(){
    const ready=index>=5;
    return box('Contrato y activación',row('Valor adjudicado / contractual',ready?usd(c.awardAmount):'Aún no nace','Público SERCOP')+row('Anticipo',ready?`${c.advancePct}% · ${usd(c.advanceAmount)}`:'Aún no nace','Público SERCOP')+row('Contrato',ready?c.contractDate:'Aún no nace','Público SERCOP')+row('Inicio contractual',ready?c.startDate:'Aún no nace','Público SERCOP')+row('Garantía',ready?`${c.guaranteeNumber} · ${usd(c.guaranteeAmount)}`:'Aún no nace','Público SERCOP'));
  }
  function operationBox(){
    if(index<6)return box('Operación técnica','<div class="callout warn"><strong>Bloqueada</strong><div class="muted">La operación no debe iniciar antes de G6. Esto evita que una oferta o adjudicación se confunda con autorización de campo.</div></div>');
    const status=index===6?'En campo':index===7?'Procesando':index>=8?'Validado / incorporado':'Planificado';
    return box('Ejecución técnica · SIMULADA',row('Perforaciones / SPT',status,'Simulado')+row('Muestras / laboratorio',index===6?'En cadena de custodia':index>=7?'Resultados validados':'Pendiente','Simulado')+row('Vs / HVSR',index===6?'Adquisición':index>=7?'Procesado + QA':'Pendiente','Simulado')+row('SIG / modelación',index===6?'Base de campo':index===7?'Integración':index>=8?'Versión de entrega':'Pendiente','Simulado'));
  }
  function documentsBox(){
    const docs=[['TDR / Pliegos',1,'Público SERCOP'],['Oferta técnica/económica',4,'Simulado'],['Contrato suscrito',5,'Público SERCOP'],['Garantía buen uso anticipo',5,'Público SERCOP'],['Plan de trabajo',6,'Simulado'],['Bitácoras / custodia',6,'Simulado'],['Resultados técnicos',7,'Simulado'],['Informe y cartografía',8,'Simulado'],['Acta / conformidad',9,'Simulado'],['Cierre económico',10,'Simulado']];
    return box('Expediente por madurez',docs.map(d=>row(d[0],index>=d[1]?'Disponible':'Aún no corresponde',d[2])).join(''));
  }
  function traceBox(){
    const links=[['Proceso / entidad / referencial','G1','Negocios → Proyecto → Dirección'],['Alcance técnico','G2','Presupuesto → Oferta → Operación'],['BAC / precio objetivo','G3','Dirección → Oferta → Alertas'],['Oferta económica','G4','Proyecto → Documentos'],['Contrato / anticipo / garantía','G5','Control → Finanzas → Alertas'],['Puntos / muestras / costos comprometidos','G6','Operación → Dirección → Mapa'],['Resultados validados','G7','Operación → SIG → QA/QC'],['Entregable aprobado','G8','Documentos → Cliente'],['Factura / cobro','G9','Dirección → Cierre'],['Margen real / lecciones','G10','Dirección → Postventa']];
    return box('Mapa de propagación',links.map(x=>row(`${x[0]} · ${x[1]}`,x[2],'Origen único → múltiples vistas')).join(''));
  }
  function sectionExtra(){
    if(s.section==='panel')return bornBox()+financialBox();
    if(s.section==='acciones')return bornBox()+box('Siguiente acción',row(flow[index].alert,'Gestionar','Derivada del Gate actual'));
    if(s.section==='control')return bornBox()+traceBox()+contractBox();
    if(s.section==='operacion')return operationBox();
    if(s.section==='direccion')return financialBox()+box('Indicadores derivados',row('Margen previsto',index>=5?(((c.awardAmount-sim.eac)/c.awardAmount)*100).toFixed(1)+'%':'—','Contrato − EAC')+row('Brecha de cobro',index>=9?usd(sim.invoiced-sim.collected):'—','Facturado − Cobrado')+row('Exposición de caja',index>=9?usd(sim.internalCost-sim.collected):'—','Costos pagados − Cobrado'));
    if(s.section==='documentos')return documentsBox();
    if(s.section==='alertas')return box('Alertas del Gate',row(flow[index].alert,'Abierta','Regla derivada')+row('Separación de fuentes','Público ≠ Simulado','Control de trazabilidad'));
    return '';
  }
  function bind(){
    document.getElementById('srGateSelect')?.addEventListener('change',e=>{index=Number(e.target.value);apply();renderAll()});
    document.getElementById('srPrevGate')?.addEventListener('click',()=>{if(index>0){index--;apply();renderAll()}});
    document.getElementById('srNextGate')?.addEventListener('click',()=>{if(index<flow.length-1){index++;apply();renderAll()}});
  }
  const base=renderMain;
  renderMain=function(){
    apply();base();
    if(project()?.id!==c.id||s.section==='negocios')return;
    setTimeout(()=>{
      const m=document.getElementById('main');if(!m)return;
      const d=document.createElement('div');d.innerHTML=gateBar()+sectionExtra();m.prepend(d);bind();
    },0);
  };
  apply();renderAll();
  window.SmartRiskSercopFlow={flow,get index(){return index},setGate(g){const i=flow.findIndex(x=>x.gate===g);if(i>=0){index=i;apply();renderAll()}},finance};
})();