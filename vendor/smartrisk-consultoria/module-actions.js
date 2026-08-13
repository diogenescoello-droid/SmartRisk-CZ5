(() => {
  const baseRenderMain=renderMain;
  const main=()=>document.getElementById('main');
  const go=sec=>{s.section=sec;renderAll();window.scrollTo({top:0,behavior:'smooth'})};

  function safeRender(){
    if(s.section==='negocios'){baseRenderMain();return}
    const p=project();
    if(s.section==='panel')main().innerHTML=panel(p);
    else if(s.section==='acciones')main().innerHTML=actions(p);
    else if(s.section==='control')main().innerHTML=control(p);
    else if(s.section==='operacion')main().innerHTML=operation(p);
    else if(s.section==='direccion')main().innerHTML=direction();
    else if(s.section==='documentos')main().innerHTML=documents(p);
    else if(s.section==='alertas')main().innerHTML=alerts(p);
    else baseRenderMain();
  }

  function detailModal(title,sub,body){
    let m=document.getElementById('srModuleModal');
    if(!m){m=document.createElement('div');m.id='srModuleModal';m.className='modal';m.innerHTML='<div class="back" data-x></div><section class="modal-card"><div class="modal-head"><div><strong id="srModuleTitle"></strong><div class="muted" id="srModuleSub"></div></div><button class="btn" data-x>✕</button></div><div class="modal-body" id="srModuleBody"></div><div class="modal-foot"><button class="btn" data-x>Cerrar</button></div></section>';document.body.appendChild(m);m.querySelectorAll('[data-x]').forEach(b=>b.onclick=()=>m.classList.remove('open'))}
    document.getElementById('srModuleTitle').textContent=title;document.getElementById('srModuleSub').textContent=sub||'';document.getElementById('srModuleBody').innerHTML=body;m.classList.add('open');
  }

  function bindHeader(){
    if(['negocios','mapa'].includes(s.section))return;
    const a=main()?.querySelector('.panel-head .panel-actions');if(!a)return;const b=a.querySelectorAll('.btn');
    if(b[0])b[0].onclick=()=>go('panel');if(b[1])b[1].onclick=()=>go('acciones');
  }

  function bindActions(){
    if(s.section!=='acciones')return;const p=project();
    main().querySelectorAll('.listrow .btn.primary').forEach((b,i)=>b.onclick=()=>detailModal(roles[s.role].tasks[i]||'Acción',`${roles[s.role].label} · ${p.code}`,'<div class="box"><h3>Ruta de gestión</h3><div class="listrow"><span>Revisar antecedentes y evidencia</span><span class="status warn">Pendiente</span></div><div class="listrow"><span>Ejecutar / coordinar</span><span class="status">Siguiente</span></div><div class="listrow"><span>Registrar resultado y evidencia</span><span class="status">Cierre</span></div></div>'));
  }

  function bindControl(){
    if(s.section!=='control')return;const p=project(),tabs=[...main().querySelectorAll('.tabs .tab')],detail=main().querySelector('.detail');if(!detail||tabs.length<3)return;const gate=detail.innerHTML;
    const schedule='<div class="box"><h3>Cronograma operativo</h3><div class="listrow"><div><strong>Revisión de alcance</strong><small>Coordinación técnica</small></div><span class="status warn">75%</span></div><div class="listrow"><div><strong>Control contractual</strong><small>Gestión contractual</small></div><span class="status warn">60%</span></div><div class="listrow"><div><strong>QA previo al siguiente Gate</strong><small>QA/QC</small></div><span class="status warn">35%</span></div><div class="callout">Las tareas críticas vencidas o con bajo avance alimentan Alertas.</div></div>';
    const docs=`<div class="box"><h3>Documentos requeridos para ${p.gate}</h3>${['Alcance / TDR vigente','Presupuesto aprobado','Cronograma vigente','Evidencia técnica','QA/QC del hito'].map((x,i)=>`<div class="listrow"><div><strong>${x}</strong><small>Versión, responsable y fecha</small></div><span class="status ${i<2?'ok':'warn'}">${i<2?'Vigente':'Pendiente'}</span></div>`).join('')}<button class="btn primary" id="goDocuments">Abrir gestión documental</button></div>`;
    [gate,schedule,docs].forEach((html,i)=>tabs[i].onclick=()=>{tabs.forEach((t,j)=>t.classList.toggle('active',i===j));detail.innerHTML=html;document.getElementById('goDocuments')?.addEventListener('click',()=>go('documentos'))});
  }

  function bindOperation(){
    if(s.section!=='operacion')return;const p=project(),tabs=[...main().querySelectorAll('.tabs .tab')],host=main().querySelector('.tabs');if(!host||tabs.length<5)return;let pane=document.getElementById('operationPane');if(!pane){pane=document.createElement('div');pane.id='operationPane';let n=host.nextSibling;while(n){const next=n.nextSibling;pane.appendChild(n);n=next}host.insertAdjacentElement('afterend',pane)}const drilling=pane.innerHTML;
    const samples='<div class="box" style="margin-top:11px"><h3>Muestras / Laboratorio</h3><div class="listrow"><div><strong>M-001 · P-01</strong><small>Granulometría + Atterberg</small></div><span class="status ok">Completado</span></div><div class="listrow"><div><strong>M-014 · P-07</strong><small>Corte directo</small></div><span class="status warn">En laboratorio</span></div></div>';
    const geo='<div class="box" style="margin-top:11px"><h3>Geofísica</h3><div class="listrow"><div><strong>VS-14 · Vs30</strong><small>286 m/s</small></div><span class="status ok">Procesado</span></div><div class="listrow"><div><strong>H-17 · HVSR</strong><small>Repetir adquisición</small></div><span class="status warn">Observado</span></div></div>';
    const sig=`<div class="box" style="margin-top:11px"><h3>SIG / Modelación</h3><div class="listrow"><div><strong>Superficie Vs30</strong><small>V03 · ${p.canton}</small></div><span class="status warn">En revisión QA</span></div><div class="listrow"><div><strong>Microzonas preliminares</strong><small>V01</small></div><span class="status warn">Borrador</span></div><button class="btn" id="goMap">Ver capas en mapa</button></div>`;
    const qa='<div class="box" style="margin-top:11px"><h3>QA/QC</h3><div class="listrow"><div><strong>NC-016 · Coherencia HVSR H-17</strong><small>Severidad alta</small></div><span class="status warn">Abierta</span></div><div class="listrow"><div><strong>OBS-021 · Metadatos cartográficos</strong><small>Severidad media</small></div><span class="status warn">En corrección</span></div><div class="callout warn">QA/QC observa y aprueba; no modifica el resultado técnico original.</div></div>';
    [drilling,samples,geo,sig,qa].forEach((html,i)=>tabs[i].onclick=()=>{tabs.forEach((t,j)=>t.classList.toggle('active',i===j));pane.innerHTML=html;document.getElementById('goMap')?.addEventListener('click',()=>go('mapa'))});
  }

  function bindDocuments(){
    if(s.section!=='documentos')return;const p=project();main().querySelectorAll('.box .listrow').forEach((r,i)=>{if(r.querySelector('.docOpen'))return;const b=document.createElement('button');b.className='btn docOpen';b.textContent='Abrir';b.onclick=()=>detailModal(r.querySelector('strong')?.textContent||'Documento',p.code,`<div class="box"><div class="listrow"><span>Versión</span><strong>${i<3?'Registrada':'Pendiente'}</strong></div><div class="listrow"><span>Responsable</span><strong>${i<4?'Gestión contractual':'Coordinación técnica'}</strong></div></div>`);r.appendChild(b)});
  }

  function bindAlerts(){
    if(s.section!=='alertas')return;const p=project();main().querySelectorAll('.callout').forEach((r,i)=>{if(r.querySelector('.alertOpen'))return;const b=document.createElement('button');b.className='btn alertOpen';b.textContent='Gestionar';b.style.marginTop='8px';b.onclick=()=>detailModal(p.alerts[i]||'Alerta',p.code,'<div class="box"><div class="listrow"><span>Asignar responsable</span><span class="status warn">Pendiente</span></div><div class="listrow"><span>Definir fecha objetivo</span><span class="status warn">Pendiente</span></div><div class="listrow"><span>Adjuntar evidencia de cierre</span><span class="status">Requerido</span></div></div>');r.appendChild(b)});
  }

  function bind(){bindHeader();bindActions();bindControl();bindOperation();bindDocuments();bindAlerts()}
  renderMain=function(){safeRender();setTimeout(bind,0)};
  window.SmartRiskModuleActions={go,bind};
})();