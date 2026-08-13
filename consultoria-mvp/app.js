(() => {
  const DATA = window.SR_CONSULTORIA_DATA;
  const state = { role:'gerencia', selected:'salinas', section:'panel', province:'Todas', canton:'Todos', stage:'Todos', query:'', quick:'all', wizardStep:0 };
  const $ = id => document.getElementById(id);
  const money = v => new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v || 0);
  const selectedProject = () => DATA.projects.find(p => p.id === state.selected) || DATA.projects[0];
  const currentRole = () => DATA.roles[state.role];
  const margin = p => p.price > 0 ? ((p.price - p.cost) / p.price * 100) : 0;

  function fillSelect(select, values, selected){
    select.innerHTML=''; values.forEach(v=>{ const o=document.createElement('option'); o.value=v; o.textContent=v; if(v===selected)o.selected=true; select.appendChild(o); });
  }

  function initControls(){
    const roleSelect=$('roleSelect');
    Object.entries(DATA.roles).forEach(([k,r])=>{const o=document.createElement('option');o.value=k;o.textContent=r.label;roleSelect.appendChild(o)});
    roleSelect.value=state.role;
    const provinces=['Todas',...new Set(DATA.projects.map(p=>p.province))]; fillSelect($('provinceFilter'),provinces,state.province);
    updateCantonFilter();
    const stages=['Todos',...new Set(DATA.projects.map(p=>p.stage))]; fillSelect($('stageFilter'),stages,state.stage);
    $('quickFilters').innerHTML = [
      ['all','Todos'],['attention','Requieren atención'],['economics','Con presupuesto'],['execution','En ejecución']
    ].map(([k,l])=>`<button class="chip ${k==='all'?'active':''}" data-quick="${k}">${l}</button>`).join('');
  }

  function updateCantonFilter(){
    const base = state.province==='Todas' ? DATA.projects : DATA.projects.filter(p=>p.province===state.province);
    const cantons=['Todos',...new Set(base.map(p=>p.canton))];
    if(!cantons.includes(state.canton)) state.canton='Todos';
    fillSelect($('cantonFilter'),cantons,state.canton);
  }

  function filteredProjects(){
    let list=[...DATA.projects];
    if(state.province!=='Todas') list=list.filter(p=>p.province===state.province);
    if(state.canton!=='Todos') list=list.filter(p=>p.canton===state.canton);
    if(state.stage!=='Todos') list=list.filter(p=>p.stage===state.stage);
    if(state.query){const q=state.query.toLowerCase();list=list.filter(p=>`${p.code} ${p.province} ${p.canton} ${p.service}`.toLowerCase().includes(q));}
    if(state.quick==='attention') list=list.filter(p=>p.alerts.length>0 && p.gateProgress<100);
    if(state.quick==='economics') list=list.filter(p=>p.price>0);
    if(state.quick==='execution') list=list.filter(p=>p.stage==='Ejecución');
    return list;
  }

  function renderKpis(){
    const list=filteredProjects();
    const active=list.length;
    const tasks=currentRole().tasks.length;
    const portfolio=list.reduce((s,p)=>s+p.price,0);
    const alerts=list.reduce((s,p)=>s+p.alerts.length,0);
    $('kpiGrid').innerHTML = [
      ['Proyectos visibles',active,`${list.filter(p=>p.alerts.length).length} con alertas`],
      ['Mis acciones',tasks,'según rol activo'],
      ['Valor cartera',money(portfolio),'ofertas + contratos'],
      ['Alertas',alerts,'técnicas · contractuales · económicas']
    ].map(([l,v,s])=>`<article class="kpi card"><span>${l}</span><strong>${v}</strong><small>${s}</small></article>`).join('');
  }

  function renderSidebar(){
    const items=[
      ['panel','▦','Panel'],['acciones','✓','Mis acciones'],['proyecto','⌂','Proyecto'],['presupuesto','$','Presupuesto'],
      ['documentos','▤','Documentos'],['gates','◆','Gates'],['alertas','⚠','Alertas'],['auditoria','↺','Auditoría']
    ];
    $('sidebar').innerHTML=items.map(([k,ic,l])=>`<button class="nav-btn ${state.section===k?'active':''}" data-section="${k}"><span>${ic} ${l}</span><span class="nav-count">${k==='acciones'?currentRole().tasks.length:k==='alertas'?selectedProject().alerts.length:'›'}</span></button>`).join('');
    $('sidebar').querySelectorAll('[data-section]').forEach(b=>b.addEventListener('click',()=>{state.section=b.dataset.section;renderSidebar();renderMain();}));
  }

  function renderProjects(){
    const list=filteredProjects(); const grid=$('projectCards'); grid.innerHTML='';
    if(!list.length){grid.innerHTML='<div class="card empty">No hay proyectos con los filtros seleccionados.</div>';return;}
    list.forEach(p=>{
      const el=document.createElement('button'); el.type='button'; el.className=`project-card ${state.selected===p.id?'active':''}`;
      el.innerHTML=`<div class="project-top"><div><div class="project-code">${p.code}</div><div class="project-place">${p.canton}</div></div><span class="badge">${p.stage}</span></div>
      <div class="project-service">${p.service}</div><div class="project-meta"><span>${p.gate}</span><strong>${p.price?money(p.price):'Por definir'}</strong></div>
      <div class="progress" style="margin-top:9px"><span style="width:${p.gateProgress}%"></span></div><div class="project-meta"><span>${p.gateProgress}% Gate</span><span class="project-alert">${p.alerts.length?'⚠ '+p.alerts.length:'✓'}</span></div>`;
      el.addEventListener('click',()=>{state.selected=p.id;renderSidebar();renderProjects();renderMain();}); grid.appendChild(el);
    });
  }

  function headerHtml(p,title,subtitle){
    return `<div class="panel-header"><div><div class="panel-title">${title}</div><div class="panel-subtitle">${subtitle}</div></div><div class="panel-actions"><button class="btn" data-open-drawer="expediente">Ver expediente</button><button class="btn primary" data-open-drawer="accion">Abrir acción</button></div></div>`;
  }

  function metricsHtml(p){
    const econ=currentRole().economics;
    return `<div class="metric-grid"><div class="metric"><span>Oferta / contrato</span><strong>${econ?money(p.price):'Restringido'}</strong></div><div class="metric"><span>Costo previsto</span><strong>${econ?money(p.cost):'Restringido'}</strong></div><div class="metric"><span>Margen previsto</span><strong>${econ?(margin(p).toFixed(1)+'%'):'Restringido'}</strong></div><div class="metric"><span>Gate actual</span><strong>${p.gate}</strong></div></div>`;
  }

  function renderPanel(p){
    const tasks=currentRole().tasks;
    return `${headerHtml(p,`${p.code} · ${p.canton}`,p.service)}${metricsHtml(p)}
      <div class="detail-grid"><section class="section-box"><h3>Avance del Gate</h3><div class="progress"><span style="width:${p.gateProgress}%"></span></div><div class="project-meta"><span>${p.gateRequirements}</span><strong>${p.gateProgress}%</strong></div><div class="soft ${p.gateProgress<100?'warning':'ok'}" style="margin-top:10px">${p.note}</div></section>
      <section class="section-box"><h3>Próximas acciones</h3>${tasks.map((t,i)=>`<div class="list-row"><div><strong>${t}</strong><small>${i===0?'Prioridad alta':'Pendiente'}</small></div><button class="btn" data-open-drawer="task" data-task="${t}">Abrir</button></div>`).join('')}</section></div>`;
  }

  function renderActions(p){
    return `${headerHtml(p,'Mi bandeja de acción',`${currentRole().label} · ${p.code}`)}<div class="section-box" style="margin-top:14px">${currentRole().tasks.map((t,i)=>`<div class="list-row"><div><span class="badge">${i===0?'Alta':'Normal'}</span> <strong>${t}</strong><small>Proyecto: ${p.canton} · ${p.gate}</small></div><button class="btn primary" data-open-drawer="task" data-task="${t}">Gestionar</button></div>`).join('')}</div>`;
  }

  function renderProject(p){
    return `${headerHtml(p,'Ficha maestra del proyecto',p.code)}${metricsHtml(p)}<div class="detail-grid"><section class="section-box"><h3>Identificación</h3><div class="list-row"><span>Provincia</span><strong>${p.province}</strong></div><div class="list-row"><span>Cantón</span><strong>${p.canton}</strong></div><div class="list-row"><span>Etapa</span><strong>${p.stage}</strong></div><div class="list-row"><span>Servicio</span><strong>${p.service}</strong></div></section><section class="section-box"><h3>Control del expediente</h3><div class="soft">Código único: <strong>${p.code}</strong></div><div class="list-row"><span>Alertas abiertas</span><strong>${p.alerts.length}</strong></div><div class="list-row"><span>Gate</span><strong>${p.gate}</strong></div><div class="list-row"><span>Avance Gate</span><strong>${p.gateProgress}%</strong></div></section></div>`;
  }

  function renderBudget(p){
    if(!currentRole().economics) return `${headerHtml(p,'Presupuesto','Acceso restringido')}<div class="soft warning" style="margin-top:14px">Este rol no tiene acceso a costos internos, margen ni compromisos económicos.</div>`;
    return `${headerHtml(p,'Control económico',p.code)}${metricsHtml(p)}<div class="table-wrap"><table class="table"><thead><tr><th>Variable</th><th>Valor</th><th>Lectura</th></tr></thead><tbody><tr><td>Costo comprometido</td><td>${money(p.committed)}</td><td>${p.cost?((p.committed/p.cost*100).toFixed(1)+'% del presupuesto'):'—'}</td></tr><tr><td>Costo real</td><td>${money(p.actual)}</td><td>${p.cost?((p.actual/p.cost*100).toFixed(1)+'% ejecutado'):'—'}</td></tr><tr><td>Margen previsto</td><td>${margin(p).toFixed(1)}%</td><td>${margin(p)>=20?'En objetivo':'Revisar'}</td></tr></tbody></table></div>`;
  }

  function renderDocuments(p){
    return `${headerHtml(p,'Gestión documental',p.code)}<div class="section-box" style="margin-top:14px">${DATA.documents.map((d,i)=>`<div class="list-row"><div><strong>${d}</strong><small>Versión, responsable, fecha y evidencia</small></div><span class="badge">${i<3?'Vigente':'Pendiente'}</span></div>`).join('')}</div>`;
  }

  function renderGates(p){
    const currentIndex=DATA.gates.findIndex(g=>g[0]===p.gate);
    return `${headerHtml(p,'Ruta de Gates','Control por evidencia y segregación de funciones')}<div class="timeline" style="margin-top:14px">${DATA.gates.map((g,i)=>`<div class="timeline-item ${i===currentIndex?'current':''}"><div class="timeline-index">${i}</div><div class="section-box"><strong>${g[0]} · ${g[1]}</strong><small style="display:block;color:var(--muted);margin-top:3px">${i<currentIndex?'Gate cerrado':i===currentIndex?'Gate actual':'Gate futuro'}</small></div></div>`).join('')}</div>`;
  }

  function renderAlerts(p){
    return `${headerHtml(p,'Centro de alertas',p.code)}<div style="margin-top:14px">${p.alerts.length?p.alerts.map((a,i)=>`<div class="soft ${i===0?'warning':''}" style="margin-bottom:8px"><strong>⚠ ${a}</strong><div class="panel-subtitle">Debe quedar responsable, fecha objetivo y evidencia de cierre.</div></div>`).join(''):'<div class="soft ok">Sin alertas abiertas.</div>'}</div>`;
  }

  function renderAudit(p){
    return `${headerHtml(p,'Auditoría y trazabilidad',p.code)}<div class="section-box" style="margin-top:14px">${DATA.audit.map((a,i)=>`<div class="list-row"><div><strong>${a}</strong><small>Registro ${i+1} · usuario · fecha · versión</small></div><span class="badge">Trazado</span></div>`).join('')}</div>`;
  }

  function renderMain(){
    const p=selectedProject(); const panel=$('mainPanel');
    const map={panel:renderPanel,acciones:renderActions,proyecto:renderProject,presupuesto:renderBudget,documentos:renderDocuments,gates:renderGates,alertas:renderAlerts,auditoria:renderAudit};
    panel.innerHTML=(map[state.section]||renderPanel)(p);
    panel.querySelectorAll('[data-open-drawer]').forEach(btn=>btn.addEventListener('click',()=>openDrawer(btn.dataset.openDrawer,btn.dataset.task||'')));
  }

  function renderAll(){renderKpis();renderSidebar();renderProjects();renderMain();}

  function openDrawer(type,task){
    const p=selectedProject(); $('drawer').classList.add('open'); $('drawer').setAttribute('aria-hidden','false');
    $('drawerTitle').textContent=type==='task'?task:type==='expediente'?'Expediente del proyecto':'Acción rápida';
    $('drawerSubtitle').textContent=`${p.code} · ${p.canton}`;
    $('drawerContent').innerHTML = type==='expediente' ? `<div class="section-box"><h3>Resumen de expediente</h3>${DATA.documents.slice(0,6).map(d=>`<div class="list-row"><span>${d}</span><span class="badge">Control</span></div>`).join('')}</div>` : `<div class="field"><span>Responsable</span><input value="${currentRole().label}"></div><div class="field" style="margin-top:12px"><span>Estado</span><select><option>Pendiente</option><option>En proceso</option><option>Completada</option><option>Bloqueada</option></select></div><div class="field" style="margin-top:12px"><span>Observación / evidencia</span><textarea rows="6" placeholder="Registrar avance, evidencia o motivo de bloqueo..."></textarea></div><button class="btn primary" style="margin-top:12px">Guardar acción</button>`;
  }

  function closeDrawer(){ $('drawer').classList.remove('open'); $('drawer').setAttribute('aria-hidden','true'); }

  const wizardSteps=['Cliente','Territorio','Servicio','Presupuesto'];
  function openWizard(){state.wizardStep=0;$('wizard').classList.add('open');$('wizard').setAttribute('aria-hidden','false');renderWizard();}
  function closeWizard(){$('wizard').classList.remove('open');$('wizard').setAttribute('aria-hidden','true');}
  function renderWizard(){
    $('wizardSteps').innerHTML=wizardSteps.map((s,i)=>`<div class="step ${i===state.wizardStep?'active':''}">${i+1}. ${s}</div>`).join('');
    const bodies=[
      `<div class="wizard-grid"><label class="field"><span>Entidad / GAD</span><input placeholder="GAD Municipal de..."></label><label class="field"><span>Contacto principal</span><input placeholder="Nombre y cargo"></label><label class="field"><span>Correo</span><input type="email"></label><label class="field"><span>Teléfono</span><input></label></div>`,
      `<div class="wizard-grid"><label class="field"><span>Provincia</span><select><option>Guayas</option><option>Santa Elena</option><option>Los Ríos</option></select></label><label class="field"><span>Cantón</span><input placeholder="Cantón"></label><label class="field"><span>Área urbana oficial (ha)</span><input type="number"></label><label class="field"><span>Área expansión (ha)</span><input type="number"></label></div>`,
      `<div class="wizard-grid"><label class="field"><span>Servicio</span><select><option>Microzonificación sísmica integral</option><option>Estudio técnico base</option><option>Campaña geotécnica-geofísica</option></select></label><label class="field"><span>Complejidad</span><select><option>Baja</option><option>Media</option><option>Alta</option></select></label><label class="field"><span>Plazo estimado (meses)</span><input type="number" value="4"></label><label class="field"><span>Técnicos</span><input type="number" value="4"></label></div>`,
      `<div class="soft"><strong>Motor económico</strong><div class="panel-subtitle">En la integración real, este paso traerá área urbana + expansión + complejidad y generará automáticamente perforaciones, Vs, HVSR, laboratorio, personal, administración contractual, indirectos y margen.</div></div><div class="metric-grid"><div class="metric"><span>Perforación</span><strong>USD 90/m</strong></div><div class="metric"><span>Administrador</span><strong>USD 1.700/mes</strong></div><div class="metric"><span>Vs</span><strong>USD 700</strong></div><div class="metric"><span>HVSR</span><strong>USD 300</strong></div></div>`
    ];
    $('wizardBody').innerHTML=bodies[state.wizardStep]; $('wizardBack').disabled=state.wizardStep===0; $('wizardNext').textContent=state.wizardStep===wizardSteps.length-1?'Crear proyecto':'Continuar';
  }

  function bind(){
    $('roleSelect').addEventListener('change',e=>{state.role=e.target.value;renderAll();});
    $('provinceFilter').addEventListener('change',e=>{state.province=e.target.value;updateCantonFilter();renderAll();});
    $('cantonFilter').addEventListener('change',e=>{state.canton=e.target.value;renderAll();});
    $('stageFilter').addEventListener('change',e=>{state.stage=e.target.value;renderAll();});
    $('searchInput').addEventListener('input',e=>{state.query=e.target.value.trim();renderAll();});
    $('quickFilters').addEventListener('click',e=>{const b=e.target.closest('[data-quick]');if(!b)return;state.quick=b.dataset.quick;$('quickFilters').querySelectorAll('.chip').forEach(x=>x.classList.toggle('active',x===b));renderAll();});
    $('newProjectBtn').addEventListener('click',openWizard);
    document.querySelectorAll('[data-close-drawer]').forEach(x=>x.addEventListener('click',closeDrawer));
    document.querySelectorAll('[data-close-wizard]').forEach(x=>x.addEventListener('click',closeWizard));
    $('wizardBack').addEventListener('click',()=>{if(state.wizardStep>0){state.wizardStep--;renderWizard();}});
    $('wizardNext').addEventListener('click',()=>{if(state.wizardStep<wizardSteps.length-1){state.wizardStep++;renderWizard();}else{closeWizard();openDrawer('accion');$('drawerTitle').textContent='Proyecto preparado';$('drawerContent').innerHTML='<div class="soft ok"><strong>Flujo completado en el prototipo.</strong><div class="panel-subtitle">La versión Firestore guardará aquí cliente, territorio, servicio, presupuesto y Gate G0/G1.</div></div>';}});
  }

  initControls(); bind(); renderAll();
})();
