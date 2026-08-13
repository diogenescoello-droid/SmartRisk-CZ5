(() => {
  const safe=v=>String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));
  let routeMain=renderMain;

  function go(sec){
    s.section=sec;
    renderAll();
    window.scrollTo({top:0,behavior:'smooth'});
  }

  function ensureDetailModal(){
    if(document.getElementById('moduleDetailModal')) return document.getElementById('moduleDetailModal');
    const wrap=document.createElement('div');
    wrap.id='moduleDetailModal';
    wrap.className='modal';
    wrap.innerHTML=`<div class="back" data-module-close></div><section class="modal-card"><div class="modal-head"><div><strong id="moduleDetailTitle">Detalle</strong><div class="muted" id="moduleDetailSub"></div></div><button class="btn" data-module-close>✕</button></div><div class="modal-body" id="moduleDetailBody"></div><div class="modal-foot"><button class="btn" data-module-close>Cerrar</button></div></section>`;
    document.body.appendChild(wrap);
    wrap.querySelectorAll('[data-module-close]').forEach(b=>b.onclick=()=>wrap.classList.remove('open'));
    return wrap;
  }

  function openDetail(title,sub,body){
    const m=ensureDetailModal();
    document.getElementById('moduleDetailTitle').textContent=title;
    document.getElementById('moduleDetailSub').textContent=sub||'';
    document.getElementById('moduleDetailBody').innerHTML=body;
    m.classList.add('open');
  }

  function bindHeader(){
    if(s.section==='negocios'||s.section==='mapa') return;
    const actions=document.querySelector('#main .panel-head .panel-actions');
    if(!actions) return;
    const buttons=actions.querySelectorAll('.btn');
    if(buttons[0]) buttons[0].onclick=()=>go('panel');
    if(buttons[1]) buttons[1].onclick=()=>go('acciones');
  }

  function bindActions(){
    if(s.section!=='acciones') return;
    const p=project();
    document.querySelectorAll('#main .listrow .btn.primary').forEach((btn,i)=>{
      btn.onclick=()=>{
        const task=roles[s.role].tasks[i]||'Acción';
        openDetail(task,`${roles[s.role].label} · ${p.code}`,`<div class="callout"><strong>Responsable</strong><div class="muted">${safe(roles[s.role].label)}</div></div><div class="box" style="margin-top:10px"><h3>Ruta de gestión</h3><div class="listrow"><span>1. Revisar antecedentes y evidencia</span><span class="status warn">Pendiente</span></div><div class="listrow"><span>2. Ejecutar o coordinar la acción</span><span class="status">Siguiente</span></div><div class="listrow"><span>3. Registrar resultado y evidencia</span><span class="status">Cierre</span></div></div>`);
      };
    });
  }

  function bindControl(){
    if(s.section!=='control') return;
    const p=project(),tabs=[...document.querySelectorAll('#main .tabs .tab')],detail=document.querySelector('#main .detail');
    if(!detail||tabs.length<3) return;
    const gateHtml=detail.innerHTML;
    const cronograma=`<div class="box"><h3>Cronograma operativo</h3>${[['Revisión de alcance','Coordinación técnica','75%'],['Control contractual','Gestión contractual','60%'],['QA previo al siguiente Gate','QA/QC','35%']].map(x=>`<div class="listrow"><div><strong>${x[0]}</strong><small>${x[1]} · ${p.canton}</small></div><span class="status warn">${x[2]}</span></div>`).join('')}<div class="callout"><strong>Regla:</strong><div class="muted">Las actividades críticas vencidas o con avance insuficiente alimentan Alertas.</div></div></div>`;
    const docs=`<div class="box"><h3>Documentos requeridos para ${p.gate}</h3>${['Alcance / TDR vigente','Presupuesto aprobado','Cronograma vigente','Evidencia técnica','QA/QC del hito'].map((x,i)=>`<div class="listrow"><div><strong>${x}</strong><small>Versión, responsable y fecha de control</small></div><span class="status ${i<2?'ok':'warn'}">${i<2?'Vigente':'Pendiente'}</span></div>`).join('')}<button class="btn primary" id="controlGoDocs" style="margin-top:10px">Abrir gestión documental</button></div>`;
    const panes=[gateHtml,cronograma,docs];
    tabs.forEach((tab,i)=>tab.onclick=()=>{
      tabs.forEach((t,j)=>t.classList.toggle('active',i===j));
      detail.innerHTML=panes[i];
      document.getElementById('controlGoDocs')?.addEventListener('click',()=>go('documentos'));
    });
  }

  function bindOperation(){
    if(s.section!=='operacion') return;
    const p=project(),tabs=[...document.querySelectorAll('#main .tabs .tab')],tabsHost=document.querySelector('#main .tabs');
    if(!tabsHost||tabs.length<5) return;
    let pane=document.getElementById('operationPane');
    if(!pane){
      pane=document.createElement('div');pane.id='operationPane';
      let n=tabsHost.nextSibling;while(n){const next=n.nextSibling;pane.appendChild(n);n=next}
      tabsHost.insertAdjacentElement('afterend',pane);
    }
    const perforaciones=pane.innerHTML;
    const muestras=`<div class="box" style="margin-top:11px"><h3>Muestras / Laboratorio</h3>${[['M-001','P-01 · 3,0 m','Granulometría + Atterberg','Completado'],['M-014','P-07 · 9,0 m','Corte directo','En laboratorio'],['M-021','P-12 · 6,0 m','Consolidación','Pendiente']].map(x=>`<div class="listrow"><div><strong>${x[0]} · ${x[1]}</strong><small>${x[2]}</small></div><span class="status ${x[3]==='Completado'?'ok':'warn'}">${x[3]}</span></div>`).join('')}</div>`;
    const geofisica=`<div class="box" style="margin-top:11px"><h3>Geofísica</h3>${[['VS-14','Vs30','286 m/s','Procesado'],['H-17','HVSR','Repetir adquisición','Observado'],['H-22','HVSR','Periodo validado','Aprobado']].map(x=>`<div class="listrow"><div><strong>${x[0]} · ${x[1]}</strong><small>${x[2]}</small></div><span class="status ${x[3]==='Aprobado'||x[3]==='Procesado'?'ok':'warn'}">${x[3]}</span></div>`).join('')}</div>`;
    const sig=`<div class="box" style="margin-top:11px"><h3>SIG / Modelación</h3>${[['Superficie Vs30','V03','En revisión QA'],['Puntos de investigación','V02','Vigente'],['Microzonas preliminares','V01','Borrador']].map(x=>`<div class="listrow"><div><strong>${x[0]}</strong><small>${x[1]} · ${p.canton}</small></div><span class="status warn">${x[2]}</span></div>`).join('')}<button class="btn" id="operationGoMap">Ver capas en mapa</button></div>`;
    const qaqc=`<div class="box" style="margin-top:11px"><h3>QA/QC</h3>${[['NC-016','Coherencia HVSR H-17','Alta','Abierta'],['OBS-021','Metadatos cartográficos','Media','En corrección']].map(x=>`<div class="listrow"><div><strong>${x[0]} · ${x[1]}</strong><small>Severidad ${x[2]}</small></div><span class="status warn">${x[3]}</span></div>`).join('')}<div class="callout warn"><strong>Separación de funciones</strong><div class="muted">QA/QC observa y aprueba; no modifica el resultado técnico original.</div></div></div>`;
    const panes=[perforaciones,muestras,geofisica,sig,qaqc];
    tabs.forEach((tab,i)=>tab.onclick=()=>{
      tabs.forEach((t,j)=>t.classList.toggle('active',i===j));pane.innerHTML=panes[i];
      document.getElementById('operationGoMap')?.addEventListener('click',()=>go('mapa'));
    });
  }

  function bindDocuments(){
    if(s.section!=='documentos') return;
    const p=project();
    document.querySelectorAll('#main .box .listrow').forEach((row,i)=>{
      if(row.querySelector('.doc-open')) return;
      const b=document.createElement('button');b.className='btn doc-open';b.textContent='Abrir';
      b.onclick=()=>{const title=row.querySelector('strong')?.textContent||'Documento';openDetail(title,p.code,`<div class="box"><h3>Control documental</h3><div class="listrow"><span>Versión vigente</span><strong>${i<3?'Registrada':'Pendiente'}</strong></div><div class="listrow"><span>Responsable</span><strong>${i<4?'Gestión contractual':'Coordinación técnica'}</strong></div><div class="listrow"><span>Estado</span><span class="status ${i<3?'ok':'warn'}">${i<3?'Vigente':'Pendiente'}</span></div></div>`)};
      row.appendChild(b);
    });
  }

  function bindAlerts(){
    if(s.section!=='alertas') return;
    const p=project();
    document.querySelectorAll('#main .callout').forEach((c,i)=>{
      if(c.querySelector('.alert-open'))return;
      const b=document.createElement('button');b.className='btn alert-open';b.style.marginTop='8px';b.textContent='Gestionar';
      b.onclick=()=>openDetail(p.alerts[i]||'Alerta',p.code,`<div class="box"><h3>Plan de cierre</h3><div class="listrow"><span>Asignar responsable</span><span class="status warn">Pendiente</span></div><div class="listrow"><span>Definir fecha objetivo</span><span class="status warn">Pendiente</span></div><div class="listrow"><span>Adjuntar evidencia de cierre</span><span class="status">Requerido</span></div></div>`);
      c.appendChild(b);
    });
  }

  function bindAll(){bindHeader();bindActions();bindControl();bindOperation();bindDocuments();bindAlerts()}
  renderMain=function(){routeMain();setTimeout(bindAll,0)};
  setTimeout(bindAll,0);
  window.SmartRiskModuleActions={go,bindAll};
})();
