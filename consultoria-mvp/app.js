(() => {
  const DATA = window.SR_CONSULTORIA_DATA;
  const STORE = window.SR_CONSULTORIA_STORE;
  const state = {
    role:'gerencia', selected:null, section:'panel', province:'Todas', canton:'Todos', stage:'Todos',
    query:'', quick:'all', wizardStep:0, projectView:'cards', projects:[], session:null,
    wizard:{client:'',contact:'',email:'',phone:'',province:'Guayas',canton:'',urbanArea:0,expansionArea:0,service:'Microzonificación sísmica integral',complexity:'Media',months:4,technicians:4}
  };
  const $ = id => document.getElementById(id);
  const money = v => new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(Number(v || 0));
  const escapeHtml = value => String(value ?? '').replace(/[&<>'"]/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
  const currentRole = () => DATA.roles[state.role] || DATA.roles.auditor;
  const selectedProject = () => state.projects.find(p => p.id === state.selected) || state.projects[0] || null;
  const margin = p => p && p.price > 0 ? ((p.price - (p.cost || 0)) / p.price * 100) : 0;
  const canSeeEconomics = () => !!currentRole().economics;

  let toastTimer;
  function toast(message,type='success'){
    const el=$('toast'); if(!el)return;
    el.textContent=message; el.className=`toast show ${type}`;
    clearTimeout(toastTimer); toastTimer=setTimeout(()=>el.className='toast',2800);
  }

  function fillSelect(select, values, selected){
    select.innerHTML='';
    values.forEach(v=>{const o=document.createElement('option');o.value=v;o.textContent=v;if(v===selected)o.selected=true;select.appendChild(o);});
  }

  function setSessionUi(session){
    state.session=session;
    const signedIn = session?.mode === 'firebase' || session?.mode === 'demo';
    $('authGate').classList.toggle('is-hidden',signedIn);
    $('appRoot').classList.toggle('is-hidden',!signedIn);
    if(!signedIn) return;

    const profile=session.profile || {};
    const profileRole=STORE.normalizeRole(profile.rol || 'auditor');
    state.role=DATA.roles[profileRole] ? profileRole : 'auditor';
    $('sessionName').textContent=profile.nombre || session.user?.displayName || session.user?.email || 'Usuario';
    $('sessionRole').textContent=DATA.roles[state.role]?.label || state.role;
    $('dataMode').textContent=session.mode==='demo'?'Modo demostración':'Firestore conectado';
    $('dataMode').className=`session-pill ${session.mode==='demo'?'demo':'live'}`;
    document.querySelector('.role-switcher').classList.toggle('demo-role',session.mode==='demo');
    $('newProjectBtn').style.display=currentRole().canCreate ? '' : 'none';
    initializeWorkspace();
  }

  async function initializeWorkspace(){
    try{
      state.projects=await STORE.loadProjects();
      if(!state.projects.length) state.projects=[...DATA.projects];
      if(!state.selected || !state.projects.some(p=>p.id===state.selected)) state.selected=state.projects[0]?.id || null;
      initControls(); renderAll();
    }catch(error){toast(error.message || 'No fue posible cargar los proyectos.','error');}
  }

  function initControls(){
    const roleSelect=$('roleSelect'); roleSelect.innerHTML='';
    Object.entries(DATA.roles).forEach(([k,r])=>{const o=document.createElement('option');o.value=k;o.textContent=r.label;roleSelect.appendChild(o);});
    roleSelect.value=state.role;
    const provinces=['Todas',...new Set(state.projects.map(p=>p.province).filter(Boolean))];
    fillSelect($('provinceFilter'),provinces,state.province);
    updateCantonFilter();
    const stages=['Todos',...new Set(state.projects.map(p=>p.stage).filter(Boolean))];
    fillSelect($('stageFilter'),stages,state.stage);
    $('quickFilters').innerHTML=[['all','Todos'],['attention','Requieren atención'],['economics','Con presupuesto'],['execution','En ejecución']]
      .map(([k,l])=>`<button class="chip ${state.quick===k?'active':''}" data-quick="${k}">${l}</button>`).join('');
  }

  function updateCantonFilter(){
    const base=state.province==='Todas'?state.projects:state.projects.filter(p=>p.province===state.province);
    const cantons=['Todos',...new Set(base.map(p=>p.canton).filter(Boolean))];
    if(!cantons.includes(state.canton))state.canton='Todos';
    fillSelect($('cantonFilter'),cantons,state.canton);
  }

  function filteredProjects(){
    let list=[...state.projects];
    if(state.province!=='Todas')list=list.filter(p=>p.province===state.province);
    if(state.canton!=='Todos')list=list.filter(p=>p.canton===state.canton);
    if(state.stage!=='Todos')list=list.filter(p=>p.stage===state.stage);
    if(state.query){const q=state.query.toLowerCase();list=list.filter(p=>`${p.code} ${p.province} ${p.canton} ${p.service}`.toLowerCase().includes(q));}
    if(state.quick==='attention')list=list.filter(p=>(p.alerts||[]).length>0 && Number(p.gateProgress||0)<100);
    if(state.quick==='economics')list=list.filter(p=>Number(p.price||0)>0);
    if(state.quick==='execution')list=list.filter(p=>p.stage==='Ejecución');
    return list;
  }

  function tasksForProject(p){
    const base=currentRole().tasks || [];
    return base.map((title,index)=>({
      title,
      priority:index===0?'Alta':'Normal',
      due:index===0?'Hoy':'Esta semana',
      projectId:p?.id || '',
      gate:p?.gate || ''
    }));
  }

  function renderKpis(){
    const list=filteredProjects();
    const portfolio=canSeeEconomics()?list.reduce((s,p)=>s+Number(p.price||0),0):null;
    const alerts=list.reduce((s,p)=>s+(p.alerts||[]).length,0);
    const tasks=selectedProject()?tasksForProject(selectedProject()).length:0;
    $('kpiGrid').innerHTML=[
      ['Proyectos visibles',list.length,`${list.filter(p=>(p.alerts||[]).length).length} con alertas`],
      ['Mis acciones',tasks,'según rol y proyecto'],
      ['Valor cartera',portfolio===null?'Restringido':money(portfolio),canSeeEconomics()?'ofertas + contratos':'según permisos'],
      ['Alertas abiertas',alerts,'técnicas · contractuales · económicas']
    ].map(([l,v,s])=>`<article class="kpi card"><span>${l}</span><strong>${v}</strong><small>${s}</small></article>`).join('');
  }

  function renderSidebar(){
    const p=selectedProject();
    const items=[['panel','▦','Panel'],['acciones','✓','Mis acciones'],['proyecto','⌂','Proyecto'],['presupuesto','$','Presupuesto'],['documentos','▤','Documentos'],['gates','◆','Gates'],['alertas','⚠','Alertas'],['auditoria','↺','Auditoría']];
    $('sidebar').innerHTML=items.map(([k,ic,l])=>`<button class="nav-btn ${state.section===k?'active':''}" data-section="${k}"><span>${ic} ${l}</span><span class="nav-count">${k==='acciones'?(p?tasksForProject(p).length:0):k==='alertas'?(p?.alerts||[]).length:'›'}</span></button>`).join('');
    $('sidebar').querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>{state.section=b.dataset.section;renderSidebar();renderMain();}));
  }

  function projectCard(p){
    const econ=canSeeEconomics();
    return `<div class="project-top"><div><div class="project-code">${escapeHtml(p.code)}</div><div class="project-place">${escapeHtml(p.canton)}</div></div><span class="badge">${escapeHtml(p.stage)}</span></div>
      <div class="project-service">${escapeHtml(p.service)} <span class="source-tag">${p.source==='firestore'?'● en línea':'demo'}</span></div>
      <div class="project-meta"><span>${escapeHtml(p.gate)}</span><strong>${econ?(Number(p.price||0)?money(p.price):'Por definir'):'Acceso según rol'}</strong></div>
      <div class="progress" style="margin-top:9px"><span style="width:${Math.max(0,Math.min(100,Number(p.gateProgress||0)))}%"></span></div>
      <div class="project-meta"><span>${Number(p.gateProgress||0)}% Gate</span><span class="project-alert">${(p.alerts||[]).length?'⚠ '+p.alerts.length:'✓'}</span></div>`;
  }

  function renderProjects(){
    const list=filteredProjects(); const grid=$('projectCards'); grid.innerHTML='';
    grid.classList.toggle('list-view',state.projectView==='list');
    $('projectCountLabel').textContent=`${list.length} visibles`;
    if(!list.length){grid.innerHTML='<div class="card empty">No hay proyectos con los filtros seleccionados.</div>';return;}
    list.forEach(p=>{const el=document.createElement('button');el.type='button';el.className=`project-card ${state.selected===p.id?'active':''}`;el.innerHTML=projectCard(p);el.addEventListener('click',()=>{state.selected=p.id;renderAll();});grid.appendChild(el);});
  }

  function headerHtml(p,title,subtitle){
    return `<div class="panel-header"><div><div class="panel-title">${escapeHtml(title)}</div><div class="panel-subtitle">${escapeHtml(subtitle)}</div></div><div class="panel-actions"><button class="btn" data-open-drawer="expediente">Ver expediente</button><button class="btn primary" data-open-drawer="accion">Abrir acción</button></div></div>`;
  }

  function metricsHtml(p){
    return `<div class="metric-grid"><div class="metric"><span>Oferta / contrato</span><strong>${canSeeEconomics()?money(p.price):'Restringido'}</strong></div><div class="metric"><span>Costo previsto</span><strong>${canSeeEconomics()?money(p.cost):'Restringido'}</strong></div><div class="metric"><span>Margen previsto</span><strong>${canSeeEconomics()?(margin(p).toFixed(1)+'%'):'Restringido'}</strong></div><div class="metric"><span>Gate actual</span><strong>${escapeHtml(p.gate)}</strong></div></div>`;
  }

  function renderPanel(p){
    const tasks=tasksForProject(p);
    return `${headerHtml(p,`${p.code} · ${p.canton}`,p.service)}${metricsHtml(p)}<div class="detail-grid"><section class="section-box"><h3>Avance del Gate</h3><div class="progress"><span style="width:${p.gateProgress||0}%"></span></div><div class="project-meta"><span>${escapeHtml(p.gateRequirements||'Pendiente')}</span><strong>${Number(p.gateProgress||0)}%</strong></div><div class="soft ${Number(p.gateProgress||0)<100?'warning':'ok'}" style="margin-top:10px">${escapeHtml(p.note||'Sin observaciones')}</div></section><section class="section-box"><h3>Próximas acciones</h3>${tasks.length?tasks.map(t=>`<div class="list-row"><div><strong>${escapeHtml(t.title)}</strong><small>${t.priority} · ${t.due}</small></div><button class="btn" data-open-drawer="task" data-task="${escapeHtml(t.title)}">Abrir</button></div>`).join(''):'<div class="soft ok">Sin acciones pendientes para este rol.</div>'}</section></div>`;
  }

  function renderActions(p){
    const tasks=tasksForProject(p);
    return `${headerHtml(p,'Mi bandeja de acción',`${currentRole().label} · ${p.code}`)}<div class="section-box" style="margin-top:14px">${tasks.length?tasks.map(t=>`<div class="list-row"><div><span class="badge">${t.priority}</span> <strong>${escapeHtml(t.title)}</strong><small>${p.canton} · ${p.gate} · ${t.due}</small></div><button class="btn primary" data-open-drawer="task" data-task="${escapeHtml(t.title)}">Gestionar</button></div>`).join(''):'<div class="soft ok">No existen tareas asignadas a este perfil.</div>'}</div>`;
  }

  function renderProject(p){
    return `${headerHtml(p,'Ficha maestra del proyecto',p.code)}${metricsHtml(p)}<div class="detail-grid"><section class="section-box"><h3>Identificación</h3><div class="list-row"><span>Provincia</span><strong>${escapeHtml(p.province)}</strong></div><div class="list-row"><span>Cantón</span><strong>${escapeHtml(p.canton)}</strong></div><div class="list-row"><span>Etapa</span><strong>${escapeHtml(p.stage)}</strong></div><div class="list-row"><span>Servicio</span><strong>${escapeHtml(p.service)}</strong></div></section><section class="section-box"><h3>Control del expediente</h3><div class="soft">Código único: <strong>${escapeHtml(p.code)}</strong></div><div class="list-row"><span>Origen</span><strong>${p.source==='firestore'?'Firestore':'Demostración'}</strong></div><div class="list-row"><span>Alertas abiertas</span><strong>${(p.alerts||[]).length}</strong></div><div class="list-row"><span>Avance Gate</span><strong>${Number(p.gateProgress||0)}%</strong></div></section></div>`;
  }

  function renderBudget(p){
    if(!canSeeEconomics())return `${headerHtml(p,'Presupuesto','Acceso restringido')}<div class="soft warning" style="margin-top:14px">Este rol no puede visualizar costos internos, margen ni compromisos económicos.</div>`;
    const collectionGap=Math.max(0,Number(p.invoiced||0)-Number(p.collected||0));
    return `${headerHtml(p,'Control económico',p.code)}${metricsHtml(p)}<div class="table-wrap"><table class="table"><thead><tr><th>Variable</th><th>Valor</th><th>Lectura</th></tr></thead><tbody><tr><td>Costo comprometido</td><td>${money(p.committed)}</td><td>${p.cost?((p.committed/p.cost*100).toFixed(1)+'% del presupuesto'):'—'}</td></tr><tr><td>Costo real</td><td>${money(p.actual)}</td><td>${p.cost?((p.actual/p.cost*100).toFixed(1)+'% ejecutado'):'—'}</td></tr><tr><td>Facturado</td><td>${money(p.invoiced)}</td><td>Ingresos emitidos</td></tr><tr><td>Cobrado</td><td>${money(p.collected)}</td><td>${collectionGap?money(collectionGap)+' por cobrar':'Al día'}</td></tr><tr><td>Margen previsto</td><td>${margin(p).toFixed(1)}%</td><td>${margin(p)>=20?'En objetivo':'Revisar'}</td></tr></tbody></table></div>`;
  }

  function renderDocuments(p){
    return `${headerHtml(p,'Gestión documental',p.code)}<div class="section-box" style="margin-top:14px">${DATA.documents.map((d,i)=>`<div class="list-row"><div><strong>${escapeHtml(d)}</strong><small>Versión · responsable · fecha · evidencia</small></div><span class="badge">${i<3?'Vigente':'Pendiente'}</span></div>`).join('')}</div>`;
  }

  function renderGates(p){
    const currentIndex=DATA.gates.findIndex(g=>g.id===p.gate);
    return `${headerHtml(p,'Ruta de Gates','Control por evidencia y segregación de funciones')}<div class="timeline" style="margin-top:14px">${DATA.gates.map((g,i)=>`<div class="timeline-item ${i===currentIndex?'current':''}"><div class="timeline-index">${i}</div><div class="section-box"><strong>${g.id} · ${escapeHtml(g.name)}</strong><small style="display:block;color:var(--muted);margin-top:3px">${i<currentIndex?'Gate cerrado':i===currentIndex?'Gate actual':'Gate futuro'}</small><div class="panel-subtitle">${g.requirements.map(escapeHtml).join(' · ')}</div></div></div>`).join('')}</div>`;
  }

  function renderAlerts(p){
    return `${headerHtml(p,'Centro de alertas',p.code)}<div style="margin-top:14px">${(p.alerts||[]).length?p.alerts.map((a,i)=>`<div class="soft ${i===0?'warning':''}" style="margin-bottom:8px"><strong>⚠ ${escapeHtml(a)}</strong><div class="panel-subtitle">Debe registrar responsable, fecha objetivo y evidencia de cierre.</div></div>`).join(''):'<div class="soft ok">Sin alertas abiertas.</div>'}</div>`;
  }

  function renderAudit(p){
    return `${headerHtml(p,'Auditoría y trazabilidad',p.code)}<div class="section-box" style="margin-top:14px">${DATA.audit.map((a,i)=>`<div class="list-row"><div><strong>${escapeHtml(a)}</strong><small>Registro ${i+1} · usuario · fecha · versión</small></div><span class="badge">Trazado</span></div>`).join('')}</div>`;
  }

  function renderMain(){
    const p=selectedProject();
    if(!p){$('mainPanel').innerHTML='<div class="empty">No hay proyectos disponibles para este usuario.</div>';return;}
    const map={panel:renderPanel,acciones:renderActions,proyecto:renderProject,presupuesto:renderBudget,documentos:renderDocuments,gates:renderGates,alertas:renderAlerts,auditoria:renderAudit};
    $('mainPanel').innerHTML=(map[state.section]||renderPanel)(p);
    $('mainPanel').querySelectorAll('[data-open-drawer]').forEach(btn=>btn.addEventListener('click',()=>openDrawer(btn.dataset.openDrawer,btn.dataset.task||'')));
  }

  function renderAll(){renderKpis();renderSidebar();renderProjects();renderMain();}

  function openDrawer(type,task=''){
    const p=selectedProject(); if(!p)return;
    $('drawer').classList.add('open'); $('drawer').setAttribute('aria-hidden','false');
    $('drawerTitle').textContent=type==='task'?task:type==='expediente'?'Expediente del proyecto':'Acción rápida';
    $('drawerSubtitle').textContent=`${p.code} · ${p.canton}`;
    if(type==='expediente'){
      $('drawerContent').innerHTML=`<div class="section-box"><h3>Resumen de expediente</h3>${DATA.documents.map((d,i)=>`<div class="list-row"><span>${escapeHtml(d)}</span><span class="badge">${i<3?'Vigente':'Control'}</span></div>`).join('')}</div>`;
      return;
    }
    $('drawerContent').innerHTML=`<div class="action-editor"><label class="field"><span>Título</span><input id="actionTitle" value="${escapeHtml(task || 'Nueva acción')}"></label><label class="field"><span>Responsable / rol</span><input id="actionOwner" value="${escapeHtml(currentRole().label)}"></label><label class="field"><span>Estado</span><select id="actionStatus"><option>Pendiente</option><option>En proceso</option><option>Completada</option><option>Bloqueada</option></select></label><label class="field"><span>Observación / evidencia</span><textarea id="actionEvidence" rows="6" placeholder="Registrar avance, evidencia o motivo de bloqueo..."></textarea></label></div><div class="action-footer"><button id="saveActionBtn" class="btn primary">Guardar acción</button></div>`;
    $('saveActionBtn').addEventListener('click',async()=>{
      try{
        await STORE.saveAction(p.id,{titulo:$('actionTitle').value,responsable:$('actionOwner').value,estado:$('actionStatus').value,evidencia:$('actionEvidence').value,gate:p.gate});
        toast('Acción registrada.'); closeDrawer();
      }catch(error){toast(error.message || 'No se pudo guardar la acción.','error');}
    });
  }

  function closeDrawer(){$('drawer').classList.remove('open');$('drawer').setAttribute('aria-hidden','true');}

  const wizardSteps=['Cliente','Territorio','Servicio','Presupuesto'];
  function openWizard(){state.wizardStep=0;state.wizard={client:'',contact:'',email:'',phone:'',province:'Guayas',canton:'',urbanArea:0,expansionArea:0,service:'Microzonificación sísmica integral',complexity:'Media',months:4,technicians:4};$('wizard').classList.add('open');$('wizard').setAttribute('aria-hidden','false');renderWizard();}
  function closeWizard(){$('wizard').classList.remove('open');$('wizard').setAttribute('aria-hidden','true');}

  function collectWizardStep(){
    const ids=['wClient','wContact','wEmail','wPhone','wProvince','wCanton','wUrban','wExpansion','wService','wComplexity','wMonths','wTechnicians'];
    ids.forEach(id=>{const el=$(id);if(!el)return;const map={wClient:'client',wContact:'contact',wEmail:'email',wPhone:'phone',wProvince:'province',wCanton:'canton',wUrban:'urbanArea',wExpansion:'expansionArea',wService:'service',wComplexity:'complexity',wMonths:'months',wTechnicians:'technicians'};state.wizard[map[id]]=el.type==='number'?Number(el.value||0):el.value;});
  }

  function budgetEstimate(){
    const w=state.wizard, pr=DATA.pricing;
    const area=Math.max(1,Number(w.urbanArea||0)+Number(w.expansionArea||0));
    const cf=w.complexity==='Alta'?1.2:w.complexity==='Baja'?0.9:1;
    const holes=Math.max(12,Math.round((12+Math.sqrt(area/100)*1.5)*cf));
    const drillingMeters=holes*25;
    const vs=Math.max(24,Math.round(holes*2.25));
    const hvsr=Math.max(20,Math.round(holes*2));
    const drilling=drillingMeters*pr.drillingSoil;
    const lab=(drilling+700)*0.31;
    const geophysics=vs*pr.vs+hvsr*pr.hvsr;
    const staff=Number(w.technicians||4)*pr.professionalMonth*Number(w.months||4);
    const admin=pr.contractAdminMonth*Number(w.months||4);
    const direct=drilling+700+lab+geophysics+staff+admin;
    const indirect=direct*pr.indirectPct/100;
    const contingency=(direct+indirect)*pr.contingencyPct/100;
    const cost=direct+indirect+contingency;
    const price=cost/(1-pr.marginPct/100);
    return {area,holes,drillingMeters,vs,hvsr,direct,cost,price};
  }

  function renderWizard(){
    $('wizardSteps').innerHTML=wizardSteps.map((s,i)=>`<div class="step ${i===state.wizardStep?'active':''}">${i+1}. ${s}</div>`).join('');
    const w=state.wizard;
    const estimate=budgetEstimate();
    const bodies=[
      `<div class="wizard-grid"><label class="field"><span>Entidad / GAD</span><input id="wClient" value="${escapeHtml(w.client)}" placeholder="GAD Municipal de..."></label><label class="field"><span>Contacto principal</span><input id="wContact" value="${escapeHtml(w.contact)}" placeholder="Nombre y cargo"></label><label class="field"><span>Correo</span><input id="wEmail" value="${escapeHtml(w.email)}" type="email"></label><label class="field"><span>Teléfono</span><input id="wPhone" value="${escapeHtml(w.phone)}"></label></div>`,
      `<div class="wizard-grid"><label class="field"><span>Provincia</span><input id="wProvince" value="${escapeHtml(w.province)}" placeholder="Provincia"></label><label class="field"><span>Cantón</span><input id="wCanton" value="${escapeHtml(w.canton)}" placeholder="Cantón"></label><label class="field"><span>Área urbana oficial (ha)</span><input id="wUrban" type="number" value="${Number(w.urbanArea||0)}"></label><label class="field"><span>Área de expansión (ha)</span><input id="wExpansion" type="number" value="${Number(w.expansionArea||0)}"></label></div>`,
      `<div class="wizard-grid"><label class="field"><span>Servicio</span><select id="wService"><option ${w.service==='Microzonificación sísmica integral'?'selected':''}>Microzonificación sísmica integral</option><option ${w.service==='Estudio técnico base'?'selected':''}>Estudio técnico base</option><option ${w.service==='Campaña geotécnica-geofísica'?'selected':''}>Campaña geotécnica-geofísica</option></select></label><label class="field"><span>Complejidad</span><select id="wComplexity"><option ${w.complexity==='Baja'?'selected':''}>Baja</option><option ${w.complexity==='Media'?'selected':''}>Media</option><option ${w.complexity==='Alta'?'selected':''}>Alta</option></select></label><label class="field"><span>Plazo estimado (meses)</span><input id="wMonths" type="number" min="1" value="${Number(w.months||4)}"></label><label class="field"><span>Técnicos</span><input id="wTechnicians" type="number" min="1" value="${Number(w.technicians||4)}"></label></div>`,
      `<div class="soft warning"><strong>Estimación paramétrica preliminar</strong><div class="panel-subtitle">Sirve para prospección y prefactibilidad. La oferta formal requiere revisión territorial y técnica.</div></div><div class="metric-grid"><div class="metric"><span>Área objetivo</span><strong>${estimate.area.toFixed(0)} ha</strong></div><div class="metric"><span>Perforaciones</span><strong>${estimate.holes}</strong></div><div class="metric"><span>Vs / HVSR</span><strong>${estimate.vs} / ${estimate.hvsr}</strong></div><div class="metric"><span>Precio referencial</span><strong>${money(estimate.price)}</strong></div></div><div class="table-wrap"><table class="table"><tbody><tr><td>Metros de perforación</td><td>${estimate.drillingMeters} m</td></tr><tr><td>Costo técnico estimado</td><td>${money(estimate.cost)}</td></tr><tr><td>Perforación suelo</td><td>USD ${DATA.pricing.drillingSoil}/m</td></tr><tr><td>Administrador contractual</td><td>${money(DATA.pricing.contractAdminMonth)}/mes</td></tr></tbody></table></div>`
    ];
    $('wizardBody').innerHTML=bodies[state.wizardStep];
    $('wizardBack').disabled=state.wizardStep===0;
    $('wizardNext').textContent=state.wizardStep===wizardSteps.length-1?'Crear proyecto':'Continuar';
  }

  async function saveWizardProject(asDraft=false){
    collectWizardStep(); const w=state.wizard, e=budgetEstimate();
    if(!w.canton && !asDraft) throw new Error('Debes definir el cantón antes de crear el proyecto.');
    const slug=(w.canton||'NUEVO').normalize('NFD').replace(/[\u0300-\u036f]/g,'').replace(/[^a-zA-Z0-9]+/g,'-').replace(/^-|-$/g,'').toUpperCase();
    const year=new Date().getFullYear();
    const project={
      code:`MZS-${year}-${slug}-${String(Date.now()).slice(-3)}`,
      province:w.province,canton:w.canton||'Por definir',stage:asDraft?'Prospección':'Oportunidad',service:w.service,
      gate:asDraft?'G0':'G1',gateProgress:asDraft?25:50,gateRequirements:asDraft?'1 de 4 requisitos':'2 de 4 requisitos',
      note:'Proyecto creado desde el asistente técnico-económico.',alerts:asDraft?['Borrador pendiente de completar']:['Validar PDOT/PUGS y alcance definitivo'],
      price:e.price,cost:e.cost,committed:0,actual:0,invoiced:0,collected:0,
      client:w.client,contact:w.contact,email:w.email,phone:w.phone,urbanArea:w.urbanArea,expansionArea:w.expansionArea,complexity:w.complexity,
      months:w.months,technicians:w.technicians
    };
    const saved=await STORE.saveProject(project);
    state.projects=await STORE.loadProjects();
    if(!state.projects.some(p=>p.id===saved.id))state.projects.unshift(saved);
    state.selected=saved.id; closeWizard(); initControls(); renderAll(); toast(asDraft?'Borrador guardado.':'Proyecto creado correctamente.');
  }

  function bind(){
    $('loginForm').addEventListener('submit',async e=>{e.preventDefault();$('loginMessage').textContent='';try{await STORE.login($('loginEmail').value.trim(),$('loginPassword').value);}catch(error){$('loginMessage').textContent=error.message || 'No fue posible iniciar sesión.';}});
    $('demoModeBtn').addEventListener('click',()=>STORE.enterDemo());
    $('logoutBtn').addEventListener('click',()=>STORE.logout());
    $('roleSelect').addEventListener('change',e=>{state.role=e.target.value;$('sessionRole').textContent=currentRole().label;$('newProjectBtn').style.display=currentRole().canCreate?'':'none';renderAll();});
    $('provinceFilter').addEventListener('change',e=>{state.province=e.target.value;updateCantonFilter();renderAll();});
    $('cantonFilter').addEventListener('change',e=>{state.canton=e.target.value;renderAll();});
    $('stageFilter').addEventListener('change',e=>{state.stage=e.target.value;renderAll();});
    $('searchInput').addEventListener('input',e=>{state.query=e.target.value;renderAll();});
    $('quickFilters').addEventListener('click',e=>{const b=e.target.closest('[data-quick]');if(!b)return;state.quick=b.dataset.quick;$('quickFilters').querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x===b));renderAll();});
    document.querySelectorAll('[data-project-view]').forEach(b=>b.addEventListener('click',()=>{state.projectView=b.dataset.projectView;document.querySelectorAll('[data-project-view]').forEach(x=>x.classList.toggle('active',x===b));renderProjects();}));
    $('newProjectBtn').addEventListener('click',openWizard);
    document.querySelectorAll('[data-close-drawer]').forEach(x=>x.addEventListener('click',closeDrawer));
    document.querySelectorAll('[data-close-wizard]').forEach(x=>x.addEventListener('click',closeWizard));
    $('wizardBack').addEventListener('click',()=>{collectWizardStep();if(state.wizardStep>0){state.wizardStep--;renderWizard();}});
    $('wizardNext').addEventListener('click',async()=>{try{collectWizardStep();if(state.wizardStep<wizardSteps.length-1){state.wizardStep++;renderWizard();}else await saveWizardProject(false);}catch(error){toast(error.message || 'No se pudo completar el proyecto.','error');}});
    $('wizardSaveDraft').addEventListener('click',async()=>{try{await saveWizardProject(true);}catch(error){toast(error.message || 'No se pudo guardar el borrador.','error');}});
  }

  bind();
  STORE.onSession(setSessionUi);
})();
