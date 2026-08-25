const pages={
 inicio:{title:'Inicio',subtitle:'Supervisión y resumen para decisión'},
 territorio:{title:'Territorio',subtitle:'Ficha territorial integrada y expediente técnico'},
 mapa:{title:'Mapa',subtitle:'Lectura territorial, capas y trabajo de campo'},
 acciones:{title:'Acciones',subtitle:'Seguimiento multinivel, responsables y evidencia'},
 riesgos:{title:'Riesgos y sitios',subtitle:'Amenazas, exposición, vulnerabilidad y sitios reportados'},
 planes:{title:'Planes y revisión',subtitle:'Plan oficial, criterios, brechas y verificables'},
 coe:{title:'COE y actores',subtitle:'Sesiones, decisiones y coordinación institucional'},
 mesas:{title:'Mesas técnicas',subtitle:'Instituciones, competencias y responsables'},
 reportes:{title:'Reportes y fuentes',subtitle:'Productos oficiales, formularios, fuentes y evidencias'},
 auditoria:{title:'Auditoría y configuración',subtitle:'Calidad, trazabilidad, perfil y alcance autorizado'}
};

const menu=[
 ['inicio','Inicio'],
 ['territorio','Territorio'],
 ['mapa','Mapa'],
 ['acciones','Acciones'],
 ['riesgos','Riesgos y sitios'],
 ['planes','Planes y revisión'],
 ['coe','COE y actores'],
 ['mesas','Mesas técnicas'],
 ['reportes','Reportes y fuentes'],
 ['auditoria','Auditoría y configuración']
];

const scopeCatalog={
 'Bolívar':['Caluma','Chimbo','Guaranda'],
 'Guayas':['Daule','Balzar','Milagro','Salitre','Santa Lucía'],
 'Santa Elena':['Salinas','Santa Elena','La Libertad'],
 'Los Ríos':['Palenque','Babahoyo','Quevedo']
};

let current='inicio';
let scope={level:'canton',province:'Bolívar',canton:'Caluma'};
const nav=document.querySelector('#nav');
const content=document.querySelector('#content');
const pageTitle=document.querySelector('#pageTitle');
const pageSubtitle=document.querySelector('#pageSubtitle');

const metricData=()=>({
 sites:'—',
 sitesDetail:'Sitios reportados en el alcance seleccionado',
 actions:'—',
 actionsDetail:'Acciones vinculadas y trazables',
 budget:'—',
 budgetDetail:'Solo valores estructurados y verificables',
 gaps:'—',
 gapsDetail:'Activas / solventadas',
 f07:'24 ago 2026',
 plan:'Plan ENOS 2026–2027'
});

function renderNav(){
 nav.innerHTML=menu.map(([id,label])=>`<button data-page="${id}" class="${id===current?'nav-active':''}">${label}</button>`).join('');
 nav.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{current=btn.dataset.page;render();});
}

function scopeText(){
 if(scope.level==='zona') return 'Zona 5';
 if(scope.level==='provincia') return `${scope.province} · Zona 5`;
 return `${scope.canton} · ${scope.province} · Zona 5`;
}

function scopePanel(){
 const provinces=Object.keys(scopeCatalog);
 const cantons=scopeCatalog[scope.province]||[];
 return `<section class="scope-panel">
  <div class="scope-head"><div><span class="eyebrow">Alcance de los indicadores</span><h3>${scopeText()}</h3></div><span class="badge">Selección jerárquica</span></div>
  <div class="scope-grid">
   <label>Nivel territorial<select id="scopeLevel"><option value="zona" ${scope.level==='zona'?'selected':''}>Zona</option><option value="provincia" ${scope.level==='provincia'?'selected':''}>Provincia</option><option value="canton" ${scope.level==='canton'?'selected':''}>Cantón</option></select></label>
   <label>Provincia<select id="scopeProvince" ${scope.level==='zona'?'disabled':''}>${provinces.map(p=>`<option ${p===scope.province?'selected':''}>${p}</option>`).join('')}</select></label>
   <label>Cantón<select id="scopeCanton" ${scope.level!=='canton'?'disabled':''}>${cantons.map(c=>`<option ${c===scope.canton?'selected':''}>${c}</option>`).join('')}</select></label>
  </div>
 </section>`;
}

function bindScope(){
 const level=document.querySelector('#scopeLevel');
 const province=document.querySelector('#scopeProvince');
 const canton=document.querySelector('#scopeCanton');
 if(level) level.onchange=()=>{scope.level=level.value;render();};
 if(province) province.onchange=()=>{scope.province=province.value;scope.canton=(scopeCatalog[scope.province]||[])[0]||'';render();};
 if(canton) canton.onchange=()=>{scope.canton=canton.value;render();};
}

function metricCards(){
 const d=metricData();
 return `<section class="cards smart-metrics">
  <article class="card"><span>Sitios reportados</span><strong>${d.sites}</strong><small>${d.sitesDetail}</small><button class="card-link" data-go="riesgos">Abrir detalle →</button></article>
  <article class="card"><span>Acciones vinculadas</span><strong>${d.actions}</strong><small>${d.actionsDetail}</small><button class="card-link" data-go="acciones">Abrir detalle →</button></article>
  <article class="card"><span>Presupuesto verificable</span><strong>${d.budget}</strong><small>${d.budgetDetail}</small><button class="card-link" data-go="acciones">Abrir presupuesto →</button></article>
  <article class="card"><span>Brechas de seguimiento</span><strong>${d.gaps}</strong><div class="gapbar"><i></i><i></i></div><small>${d.gapsDetail}</small><button class="card-link" data-go="planes">Abrir brechas →</button></article>
 </section>`;
}

function inicio(){
 const d=metricData();
 return `${scopePanel()}
 <section class="risk-lead"><div><span class="eyebrow">Pregunta rectora</span><h3>¿Qué se reportó, qué se asignó y qué falta solventar?</h3><p>La información técnica permanece disponible en el detalle, igual que en Smart móvil, con mayor profundidad de análisis en escritorio.</p></div><button type="button" data-go="territorio">Abrir territorio</button></section>
 ${metricCards()}
 <p class="source-note"><b>Corte de referencia:</b> F07 actualizado ${d.f07}. Esta vista es solo de arquitectura; no consulta Firestore.</p>
 <section class="dashboard-grid">
  <article class="panel territory-focus"><div class="panel-head"><h3>Territorio seleccionado</h3><span class="badge">${d.plan}</span></div><div class="territory-body"><div><span class="territory-pin">⌖</span><div><b>${scopeText()}</b><small>Plan, revisión, sitios, acciones, presupuesto y evidencias en un solo expediente.</small></div></div><button data-go="territorio">Abrir ficha territorial</button></div></article>
  <article class="panel next-questions"><div class="panel-head"><h3>Preguntas para decidir</h3></div><ul><li>¿Qué sitios requieren atención?</li><li>¿Qué acciones están pendientes o en ejecución?</li><li>¿Qué brechas siguen activas?</li><li>¿Qué evidencia falta verificar?</li></ul></article>
 </section>`;
}

function territorio(){
 const d=metricData();
 return `${scopePanel()}
 <section class="module-intro"><div><span class="eyebrow">Ficha territorial integrada</span><h3>${scopeText()}</h3><p>La versión de escritorio conserva las mismas puertas de entrada del celular, pero permite abrir el expediente, comparar fuentes y trabajar con mayor detalle.</p></div><span class="badge">${d.plan}</span></section>
 <section class="panel"><div class="panel-head"><h3>Plan y revisión técnica</h3><span class="badge">Corte F07 · ${d.f07}</span></div><div class="quick-actions">
  <button data-go="planes"><b>↗</b><span>PDF</span><small>Plan oficial</small></button>
  <button data-go="planes"><b>✓</b><span>Criterios</span><small>Revisión técnica</small></button>
  <button data-go="planes"><b>!</b><span>Brechas</span><small>Activas / solventadas</small></button>
  <button data-go="acciones"><b>↻</b><span>Seguimiento</span><small>Avance y control</small></button>
 </div></section>
 <section class="panel section-gap"><div class="panel-head"><h3>Gestión del territorio</h3><span class="badge">Extensión de Smart móvil</span></div><div class="quick-actions management-actions">
  <button data-go="riesgos"><b>⌖</b><span>Sitios críticos</span><small>Amenaza y exposición</small></button>
  <button data-go="acciones"><b>✓</b><span>Acciones</span><small>Responsable y estado</small></button>
  <button data-go="acciones"><b>$</b><span>Presupuesto</span><small>Valor verificable</small></button>
  <button data-go="reportes"><b>▣</b><span>Evidencias</span><small>Fuentes y adjuntos</small></button>
  <button data-go="mapa"><b>✎</b><span>Trabajo de campo</span><small>Flujos Kobo</small></button>
 </div></section>`;
}

function mapa(){
 return `${scopePanel()}
 <section class="module-intro"><div><span class="eyebrow">Mapa</span><h3>Sitios, acciones y brechas · ${scopeText()}</h3><p>El escritorio amplía la lectura del mapa móvil con capas, filtros, consulta espacial y acceso a los flujos de campo.</p></div><span class="badge">Capas activas</span></section>
 <section class="map-reference"><div class="map-water"></div><div class="map-copy"><b>Lectura territorial integrada</b><small>Referencia visual: capas de amenazas, sitios, acciones y brechas.</small></div></section>
 <section class="panel section-gap"><div class="panel-head"><h3>Capas y trabajo técnico</h3><span class="badge">Solo referencia</span></div><div class="quick-actions">
  <button data-go="riesgos"><b>≈</b><span>Amenazas</span><small>Capas territoriales</small></button>
  <button data-go="riesgos"><b>⌖</b><span>Sitios</span><small>Reportados / críticos</small></button>
  <button data-go="acciones"><b>✓</b><span>Acciones</span><small>Vinculadas</small></button>
  <button data-go="planes"><b>!</b><span>Brechas</span><small>Seguimiento</small></button>
  <button class="reference-only"><b>✎</b><span>Reportar sitio</span><small>Kobo en operación</small></button>
  <button class="reference-only"><b>↻</b><span>Actualizar acción</span><small>Kobo en operación</small></button>
 </div></section>`;
}

function acciones(){
 return `${scopePanel()}
 <section class="module-intro"><div><span class="eyebrow">Acciones</span><h3>Seguimiento multinivel</h3><p>Responsable, plazo, presupuesto, evidencia y estado deben poder leerse en una sola ficha, como en Smart móvil, con filtros y edición autorizada en escritorio.</p></div><span class="badge">${scopeText()}</span></section>
 <section class="action-states"><button><span>○</span><b>Pendientes</b><small>Requieren gestión</small></button><button><span>◐</span><b>En ejecución</b><small>Con seguimiento</small></button><button><span>●</span><b>Completadas</b><small>Con cierre verificable</small></button><button><span>$</span><b>Sin presupuesto</b><small>Dato por completar</small></button></section>
 ${genericTable('acciones')}`;
}

function genericTable(id){
 const rows={
  riesgos:[['Sitios reportados','Amenaza, exposición y localización','Consulta'],['Riesgos','Escenario y prioridad','Consulta'],['Brechas relacionadas','Seguimiento territorial','Consulta']],
  planes:[['Plan oficial','PDF legalizado','Disponible'],['Criterios','Revisión técnica','Disponible'],['Brechas','Activas / solventadas','Seguimiento'],['Verificables','Evidencia documental','Consulta']],
  coe:[['COE','Sesiones y estado','Consulta'],['Actores','Responsables institucionales','Consulta'],['Decisiones','Coordinación y escalamiento','Seguimiento']],
  mesas:[['Mesas técnicas','Instituciones y competencias','Consulta'],['Responsables','Titulares y delegados','Consulta'],['Capacidades','Recursos y articulación','Seguimiento']],
  reportes:[['Reportes','Productos oficiales','Disponible'],['Formularios','F01–F07 / Kobo','Consulta'],['Fuentes','Documentos originales','Disponible'],['Evidencias','Adjuntos y verificables','Consulta']],
  auditoria:[['Auditoría','Calidad y trazabilidad','Disponible'],['Perfil','Rol y alcance autorizado','Disponible'],['Configuración','Preferencias y seguridad','Disponible']],
  acciones:[['Acción','Responsable y plazo','Seguimiento'],['Presupuesto','Monto estructurado','Verificación'],['Evidencia','Fuente o adjunto','Verificación'],['Estado','Pendiente / ejecución / completada','Seguimiento']]
 }[id]||[];
 return `<section class="panel section-gap"><div class="toolbar"><input placeholder="Buscar en ${pages[id]?.title||'módulo'}…"><select><option>Todos</option><option>Activos</option><option>Pendientes</option></select></div><table><thead><tr><th>Elemento</th><th>Criterio SmartRisk</th><th>Estado</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${row[0]}</td><td>${row[1]}</td><td><span class="badge ${row[2].includes('Pendiente')?'warn':''}">${row[2]}</span></td></tr>`).join('')}</tbody></table></section>`;
}

function render(){
 renderNav();
 pageTitle.textContent=pages[current].title;
 pageSubtitle.textContent=pages[current].subtitle;
 if(current==='inicio') content.innerHTML=inicio();
 else if(current==='territorio') content.innerHTML=territorio();
 else if(current==='mapa') content.innerHTML=mapa();
 else if(current==='acciones') content.innerHTML=acciones();
 else content.innerHTML=`<section class="module-intro"><div><span class="eyebrow">${pages[current].title}</span><h3>${pages[current].subtitle}</h3><p>Este módulo adopta el mismo contrato conceptual de Smart móvil y lo extiende con filtros, tablas, comparación y gestión autorizada en escritorio.</p></div><span class="badge">Escritorio extendido</span></section>${genericTable(current)}`;
 bindScope();
 document.querySelectorAll('[data-go]').forEach(btn=>btn.onclick=()=>{current=btn.dataset.go;render();window.scrollTo({top:0,behavior:'smooth'});});
 document.querySelectorAll('.reference-only').forEach(btn=>btn.onclick=()=>alert('Referencia visual: este botón no ejecuta acciones ni abre Kobo.'));
}

window.setPage=id=>{if(pages[id]){current=id;render();}};
const dialog=document.querySelector('#analystDialog');
document.querySelector('#riskAnalyst').onclick=()=>dialog.showModal();
document.querySelector('#closeAnalyst').onclick=()=>dialog.close();
document.querySelector('#closeAnalyst2').onclick=()=>dialog.close();
render();
