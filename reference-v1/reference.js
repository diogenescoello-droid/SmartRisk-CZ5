const pages={
 dashboard:{title:'Panel principal',subtitle:'Estado operativo de la plataforma'},
 usuarios:{title:'Actores y flujo COE',subtitle:'Responsables, roles y articulación institucional'},
 territorios:{title:'Territorios',subtitle:'Lectura territorial y alcance de gestión'},
 instituciones:{title:'Mesas y grupos de trabajo',subtitle:'Coordinación institucional y capacidades'},
 revision:{title:'Revisión de planes',subtitle:'Planes, brechas, evidencias y seguimiento'},
 decisiones:{title:'Bandeja de decisiones',subtitle:'Decisiones pendientes y prioridades'},
 sitios:{title:'Sitios críticos',subtitle:'Amenazas, exposición y vulnerabilidad territorial'},
 acciones:{title:'Acciones',subtitle:'Medidas, responsables, avance y verificación'},
 herramientas:{title:'Herramientas',subtitle:'Cartografía, consulta y utilidades técnicas'}
};
const menu=[
 ['dashboard','Panel principal'],['usuarios','Actores y flujo COE'],['territorios','Territorios'],['instituciones','Mesas y grupos de trabajo'],['revision','Revisión de planes'],['decisiones','Bandeja de decisiones'],['sitios','Sitios críticos'],['acciones','Acciones'],['herramientas','Herramientas']
];
let current='dashboard';
const nav=document.querySelector('#nav'),content=document.querySelector('#content'),pageTitle=document.querySelector('#pageTitle'),pageSubtitle=document.querySelector('#pageSubtitle');
function renderNav(){nav.innerHTML=menu.map(([id,label])=>`<button data-page="${id}" class="${id===current?'nav-active':''}">${label}</button>`).join('');nav.querySelectorAll('button').forEach(btn=>btn.onclick=()=>{current=btn.dataset.page;render();});}
function dashboard(){return `
<section class="risk-lead"><div><span class="eyebrow">Centro de lectura ejecutiva</span><h3>Situación territorial para decisión</h3><p>La plataforma resume prioridades, brechas, decisiones y acciones sin perder el acceso al expediente técnico.</p></div><button type="button" onclick="setPage('decisiones')">Abrir bandeja de decisiones</button></section>
<section class="cards">
 <article class="card"><span>Territorios monitoreados</span><strong>56</strong><small>5 provincias · 51 cantones</small></article>
 <article class="card"><span>Planes disponibles</span><strong>56</strong><small>Seguimiento documental progresivo</small></article>
 <article class="card"><span>Sitios críticos</span><strong>18</strong><small>Priorización por amenaza y exposición</small></article>
 <article class="card"><span>Acciones en seguimiento</span><strong>23</strong><small>Con responsable y evidencia esperada</small></article>
</section>
<section class="dashboard-grid">
 <article class="panel"><div class="panel-head"><h3>Territorios prioritarios</h3><span class="badge danger">Atención</span></div><div class="priority-territories">
  <button><span>1</span><div><b>Daule</b><small>Brechas de seguimiento y sitios susceptibles</small></div><strong>Alta</strong></button>
  <button><span>2</span><div><b>Salinas</b><small>Revisión de acciones y evidencias</small></div><strong>Alta</strong></button>
  <button><span>3</span><div><b>Los Ríos</b><small>Consolidación documental provincial</small></div><strong>Media</strong></button>
 </div></article>
 <article class="panel next-questions"><div class="panel-head"><h3>Preguntas para decidir</h3></div><ul><li>¿Qué territorio requiere intervención primero?</li><li>¿Qué acción tiene evidencia pendiente?</li><li>¿Qué brecha puede cerrarse con coordinación inmediata?</li><li>¿Qué información debe escalarse al COE?</li></ul></article>
</section>`;}
function genericTable(id){const rows={usuarios:[['SNGR','Coordinación Zonal 5','Coordinación'],['GAD cantonal','Unidad de Gestión de Riesgos','Operación'],['AME','Asistencia municipal','Consulta']],territorios:[['Guayas','Daule','Seguimiento activo'],['Santa Elena','Salinas','Seguimiento activo'],['Los Ríos','Palenque','En revisión']],instituciones:[['MTT 1','Agua segura y saneamiento','Activa'],['MTT 2','Salud y APH','Activa'],['GT 3','Infraestructura','Seguimiento']],revision:[['Daule','Plan ENOS 2026–2027','En revisión'],['Salinas','Plan ENOS 2026–2027','Validado'],['Palenque','Plan ENOS 2026–2027','En revisión']],decisiones:[['Daule','Validar brecha prioritaria','Pendiente'],['Salinas','Revisar evidencia de acción','Seguimiento'],['Los Ríos','Escalar coordinación provincial','Pendiente']],sitios:[['Guayas','Daule','Inundación'],['Santa Elena','Salinas','Inundación costera'],['Los Ríos','Palenque','Inundación']],acciones:[['Daule','Actualización de responsables','En ejecución'],['Salinas','Verificación de evidencia','Pendiente'],['Palenque','Consolidación de información','En seguimiento']],herramientas:[['Cartografía','Capas territoriales','Disponible'],['Analista SmartRisk','Contexto técnico','Disponible'],['Exportación','Reportes y matrices','Disponible']]}[id]||[];return `<section class="module-intro"><div><span class="eyebrow">${pages[id].title}</span><h3>${pages[id].subtitle}</h3><p>Esta vista reproduce la lógica simple y directa de la primera plataforma estable: acceso por función, tabla operativa y acciones contextuales.</p></div><span class="badge">Solo referencia</span></section><section class="panel"><div class="toolbar"><input placeholder="Buscar…"><select><option>Todos</option><option>Activos</option><option>Pendientes</option></select></div><table><thead><tr><th>Ámbito</th><th>Elemento</th><th>Estado</th></tr></thead><tbody>${rows.map(row=>`<tr><td>${row[0]}</td><td>${row[1]}</td><td><span class="badge ${row[2].includes('Pendiente')?'warn':''}">${row[2]}</span></td></tr>`).join('')}</tbody></table></section>`;}
function render(){renderNav();pageTitle.textContent=pages[current].title;pageSubtitle.textContent=pages[current].subtitle;content.innerHTML=current==='dashboard'?dashboard():genericTable(current);}
window.setPage=id=>{current=id;render();};
const dialog=document.querySelector('#analystDialog');document.querySelector('#riskAnalyst').onclick=()=>dialog.showModal();document.querySelector('#closeAnalyst').onclick=()=>dialog.close();document.querySelector('#closeAnalyst2').onclick=()=>dialog.close();
render();
