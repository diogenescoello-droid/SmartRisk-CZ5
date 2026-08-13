(() => {
  const DATA=window.SR_CONSULTORIA_DATA; const WF=window.SR_WORKFLOW;
  const state={selected:DATA.projects[0]?.id||'',tab:'gates',gate:null,schedule:[],documents:[],alerts:[]};
  const $=id=>document.getElementById(id); const money=v=>new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v||0);
  const project=()=>DATA.projects.find(p=>p.id===state.selected)||DATA.projects[0];
  function esc(s){return String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
  function roleLabel(r){return DATA.roles?.[r]?.label||r||'—';}

  async function loadProjectState(){
    const p=project(); state.gate=await WF.loadGate(p.id,p.gate); state.schedule=await WF.loadSchedule(p.id); state.documents=await WF.loadDocuments(p.id);
    state.alerts=WF.deriveAlerts({project:p,schedule:state.schedule,gate:state.gate,documents:state.documents,economics:{cost:p.cost,committed:p.committed,actual:p.actual}});
    renderAll();
  }

  function renderProjects(){
    $('projectList').innerHTML=DATA.projects.map(p=>`<button class="project-select ${p.id===state.selected?'active':''}" data-project="${p.id}"><strong>${esc(p.canton)}</strong><small>${esc(p.code)} · ${esc(p.stage)} · ${esc(p.gate)}</small></button>`).join('');
    $('projectList').querySelectorAll('[data-project]').forEach(b=>b.addEventListener('click',async()=>{state.selected=b.dataset.project;await loadProjectState();}));
  }

  function renderKpis(){
    const p=project(), gate=state.gate; const done=gate?.requirements?.filter(r=>r.done).length||0,total=gate?.requirements?.length||0;
    const overdue=state.alerts.filter(a=>a.severity==='critical').length;
    const docsPending=state.documents.filter(d=>!/vigente|aprobado/i.test(d.status||'')).length;
    $('moduleKpis').innerHTML=[
      ['Gate actual',p.gate,p.stage],['Cumplimiento',total?`${Math.round(done/total*100)}%`:'0%',`${done}/${total} requisitos`],['Alertas críticas',overdue,`${state.alerts.length} totales`],['Documentos pendientes',docsPending,`${state.documents.length} versionados`]
    ].map(([l,v,s])=>`<article class="kpi card"><span>${l}</span><strong>${v}</strong><small>${s}</small></article>`).join('');
  }

  function gateView(){
    const p=project(),g=state.gate,done=g.requirements.filter(r=>r.done).length,total=g.requirements.length,pct=total?Math.round(done/total*100):0;
    return `<div class="gate-head"><div><div class="panel-title">${p.gate} · ${esc(WF.GATES.find(x=>x.id===p.gate)?.name||'Gate')}</div><div class="panel-subtitle">Checklist obligatorio con responsable, evidencia y aprobación.</div></div><span class="badge">${esc(g.status||'Pendiente')}</span></div>
    <div class="metric-grid"><div class="metric"><span>Requisitos</span><strong>${done}/${total}</strong></div><div class="metric"><span>Avance</span><strong>${pct}%</strong></div><div class="metric"><span>Aprobaciones</span><strong>${g.approvals?.length||0}</strong></div><div class="metric"><span>Estado</span><strong>${esc(g.status||'Pendiente')}</strong></div></div>
    <div class="progress"><span style="width:${pct}%"></span></div>
    <div class="section-box" style="margin-top:12px">${g.requirements.map(r=>`<div class="gate-requirement"><input type="checkbox" data-req-check="${r.id}" ${r.done?'checked':''}><div><strong>${esc(r.label)}</strong><small>Responsable funcional: ${esc(roleLabel(r.role))}</small></div><input data-req-evidence="${r.id}" placeholder="Evidencia / referencia" value="${esc(r.evidence||'')}"><span class="gate-role">${esc(r.role)}</span></div>`).join('')}</div>
    <div class="approval-row"><button class="btn" data-gate-save>Guardar checklist</button><button class="btn primary" data-gate-approve>Aprobar Gate</button><button class="btn" data-gate-reject>Rechazar / devolver</button></div>
    <div style="margin-top:12px">${(g.approvals||[]).map(a=>`<div class="soft"><strong>${esc(a.decision)}</strong> · ${esc(a.role)} · <span class="panel-subtitle">${esc(a.user)} · ${esc(a.at)}</span><div>${esc(a.comment||'')}</div></div>`).join('')}</div>`;
  }

  function scheduleView(){
    return `<div class="gate-head"><div><div class="panel-title">Cronograma y plazos</div><div class="panel-subtitle">Actividades, responsable, fecha objetivo, criticidad y avance.</div></div><button class="btn primary" data-add-schedule>＋ Actividad</button></div>
    <div class="schedule-grid header"><span>Actividad</span><span>Responsable</span><span>Vence</span><span>Avance</span><span>Estado</span></div>${state.schedule.map(i=>`<div class="schedule-grid"><strong>${esc(i.title)}</strong><span>${esc(roleLabel(i.ownerRole))}</span><span>${esc(i.due||'—')}</span><span>${Number(i.progress||0)}%</span><span class="badge">${esc(i.status||'Pendiente')}</span></div>`).join('')||'<div class="soft">No hay actividades programadas.</div>'}
    <div id="scheduleForm"></div>`;
  }

  function documentsView(){
    return `<div class="gate-head"><div><div class="panel-title">Centro documental</div><div class="panel-subtitle">Cada entrega conserva tipo, versión, estado, responsable y fecha.</div></div><button class="btn primary" data-add-document>＋ Nueva versión</button></div>
    <div class="doc-version"><strong>Documento</strong><strong>Versión</strong><strong>Responsable</strong><strong>Fecha</strong><strong>Estado</strong></div>${state.documents.map(d=>`<div class="doc-version"><span>${esc(d.type)}</span><span>${esc(d.version)}</span><span>${esc(roleLabel(d.ownerRole))}</span><span>${esc(d.date||'—')}</span><span class="badge">${esc(d.status||'Pendiente')}</span></div>`).join('')||'<div class="soft">Aún no existen documentos versionados.</div>'}<div id="documentForm"></div>`;
  }

  function alertsView(){
    const order={critical:0,high:1,medium:2,low:3}; const alerts=[...state.alerts].sort((a,b)=>(order[a.severity]??9)-(order[b.severity]??9));
    return `<div class="gate-head"><div><div class="panel-title">Alertas automáticas</div><div class="panel-subtitle">Derivadas de plazos, Gate, documentos, costos y QA/QC.</div></div><span class="badge">${alerts.length} abiertas</span></div><div style="margin-top:12px">${alerts.map(a=>`<div class="alert-card ${esc(a.severity)}"><strong>${a.severity==='critical'?'🔴':a.severity==='high'?'🟠':'🟡'} ${esc(a.message)}</strong><div class="panel-subtitle">Tipo: ${esc(a.type)} · Responsable: ${esc(roleLabel(a.ownerRole))}</div></div>`).join('')||'<div class="soft ok">Sin alertas automáticas abiertas.</div>'}</div>`;
  }

  function renderPanel(){
    const views={gates:gateView,schedule:scheduleView,documents:documentsView,alerts:alertsView}; $('controlPanel').innerHTML=(views[state.tab]||gateView)(); bindPanel();
  }

  function bindPanel(){
    if(state.tab==='gates'){
      $('controlPanel').querySelectorAll('[data-req-check]').forEach(x=>x.addEventListener('change',()=>{const r=state.gate.requirements.find(r=>r.id===x.dataset.reqCheck);if(r)r.done=x.checked;}));
      $('controlPanel').querySelectorAll('[data-req-evidence]').forEach(x=>x.addEventListener('input',()=>{const r=state.gate.requirements.find(r=>r.id===x.dataset.reqEvidence);if(r)r.evidence=x.value;}));
      $('controlPanel').querySelector('[data-gate-save]')?.addEventListener('click',async()=>{await WF.saveGate(project().id,state.gate);await loadProjectState();});
      $('controlPanel').querySelector('[data-gate-approve]')?.addEventListener('click',async()=>{await WF.approveGate(project().id,state.gate.id,'Aprobado','Validación registrada desde Centro de Control');await loadProjectState();});
      $('controlPanel').querySelector('[data-gate-reject]')?.addEventListener('click',async()=>{await WF.approveGate(project().id,state.gate.id,'Rechazado','Devuelto para subsanación');await loadProjectState();});
    }
    $('controlPanel').querySelector('[data-add-schedule]')?.addEventListener('click',()=>{$('scheduleForm').innerHTML=`<div class="section-box" style="margin-top:12px"><div class="mini-form"><label class="field"><span>Actividad</span><input id="scTitle"></label><label class="field"><span>Responsable</span><select id="scRole">${Object.entries(DATA.roles).map(([k,r])=>`<option value="${k}">${esc(r.label)}</option>`).join('')}</select></label><label class="field"><span>Fecha objetivo</span><input id="scDue" type="date"></label></div><button class="btn primary" id="scSave" style="margin-top:10px">Guardar actividad</button></div>`;$('scSave').addEventListener('click',async()=>{const item=await WF.saveScheduleItem(project().id,{title:$('scTitle').value,ownerRole:$('scRole').value,due:$('scDue').value,status:'Pendiente',progress:0,critical:true});state.schedule.push(item);state.alerts=WF.deriveAlerts({project:project(),schedule:state.schedule,gate:state.gate,documents:state.documents,economics:{cost:project().cost,committed:project().committed,actual:project().actual}});renderAll();});});
    $('controlPanel').querySelector('[data-add-document]')?.addEventListener('click',()=>{$('documentForm').innerHTML=`<div class="section-box" style="margin-top:12px"><div class="mini-form"><label class="field"><span>Documento</span><input id="docType"></label><label class="field"><span>Versión</span><input id="docVersion" value="V01"></label><label class="field"><span>Estado</span><select id="docStatus"><option>En revisión</option><option>Pendiente aprobación</option><option>Vigente</option><option>Aprobado</option></select></label></div><button class="btn primary" id="docSave" style="margin-top:10px">Guardar versión</button></div>`;$('docSave').addEventListener('click',async()=>{const doc=await WF.saveDocument(project().id,{type:$('docType').value,version:$('docVersion').value,status:$('docStatus').value,ownerRole:'contractual',date:'2026-08-13',published:false});state.documents.unshift(doc);state.alerts=WF.deriveAlerts({project:project(),schedule:state.schedule,gate:state.gate,documents:state.documents,economics:{cost:project().cost,committed:project().committed,actual:project().actual}});renderAll();});});
  }

  function renderAll(){renderProjects();renderKpis();renderPanel();}
  document.querySelectorAll('[data-tab]').forEach(b=>b.addEventListener('click',()=>{document.querySelectorAll('[data-tab]').forEach(x=>x.classList.toggle('active',x===b));state.tab=b.dataset.tab;renderPanel();}));
  loadProjectState();
})();