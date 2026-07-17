
const STORE='smartrisk-cz5-data-v1';
const AUTH='smartrisk-cz5-auth';
const menu=[
 ['dashboard','Panel principal'],['usuarios','Usuarios'],['territorios','Territorios'],
 ['instituciones','Instituciones'],['sitios','Sitios críticos'],['acciones','Acciones']
];
let data=JSON.parse(localStorage.getItem(STORE)||'null')||structuredClone(window.SEED_DATA);
let current='dashboard';
const $=s=>document.querySelector(s);
function save(){localStorage.setItem(STORE,JSON.stringify(data))}
function start(){
 $('#login').classList.add('hidden');$('#app').classList.remove('hidden');
 $('#nav').innerHTML=menu.map(([id,l])=>`<button data-page="${id}">${l}</button>`).join('');
 $('#nav').onclick=e=>{if(e.target.dataset.page){current=e.target.dataset.page;render()}};
 render();
}
$('#loginForm').onsubmit=e=>{
 e.preventDefault();
 if($('#email').value==='admin@smartrisk.cz5' && $('#password').value==='SmartRisk2026!'){
  localStorage.setItem(AUTH,'1');start()
 }else $('#loginError').textContent='Credenciales incorrectas.';
};
$('#logout').onclick=()=>{localStorage.removeItem(AUTH);location.reload()};
if(localStorage.getItem(AUTH)==='1')start();

function render(){
 document.querySelectorAll('nav button').forEach(b=>b.classList.toggle('nav-active',b.dataset.page===current));
 const titles={dashboard:['Panel principal','Estado operativo de la plataforma'],usuarios:['Usuarios','Directorio territorial'],
 territorios:['Territorios','Cobertura de la Coordinación Zonal 5'],instituciones:['Instituciones','GAD municipales vinculados'],
 sitios:['Sitios críticos','Registro territorial de condiciones de riesgo'],acciones:['Acciones','Seguimiento del plan de acción']};
 $('#pageTitle').textContent=titles[current][0];$('#pageSubtitle').textContent=titles[current][1];
 if(current==='dashboard')return dashboard();
 tablePage(current);
}
function dashboard(){
 const active=data.usuarios.filter(x=>x.estado==='Activo').length;
 $('#content').innerHTML=`<div class="cards">
 <div class="card"><span>Territorios</span><strong>${data.territorios.length}</strong></div>
 <div class="card"><span>Usuarios cargados</span><strong>48</strong></div>
 <div class="card"><span>Usuarios activos</span><strong>47</strong></div>
 <div class="card"><span>Pendientes</span><strong>1</strong></div>
 </div><div class="panel"><div class="toolbar"><b>Estado del MVP</b></div>
 <table><tr><th>Componente</th><th>Estado</th></tr>
 <tr><td>Login</td><td><span class="badge">Operativo</span></td></tr>
 <tr><td>Dashboard</td><td><span class="badge">Operativo</span></td></tr>
 <tr><td>Territorios e instituciones</td><td><span class="badge">Cargados</span></td></tr>
 <tr><td>Usuarios</td><td><span class="badge">Cargados</span></td></tr>
 <tr><td>Sitios y acciones</td><td><span class="badge warn">Listos para registro</span></td></tr></table></div>`;
}
const schemas={
 usuarios:[['nombre','Responsable'],['correo','Correo'],['telefono','Teléfono'],['provincia','Provincia'],['canton','Cantón'],['estado','Estado']],
 territorios:[['provincia','Provincia'],['canton','Cantón'],['estado','Estado']],
 instituciones:[['nombre','Institución'],['territorio','Territorio'],['estado','Estado']],
 sitios:[['nombre','Sitio'],['territorio','Territorio'],['amenaza','Amenaza'],['nivel','Nivel'],['estado','Estado']],
 acciones:[['accion','Acción'],['territorio','Territorio'],['responsable','Responsable'],['avance','Avance %'],['estado','Estado']]
};
function tablePage(type){
 const cols=schemas[type], rows=data[type]||[];
 $('#content').innerHTML=`<div class="panel"><div class="toolbar"><input id="search" placeholder="Buscar..."><button id="add">Nuevo registro</button></div>
 <div id="tableWrap"></div></div>`;
 const paint=()=>{
  const q=$('#search').value.toLowerCase();
  const filtered=rows.filter(r=>JSON.stringify(r).toLowerCase().includes(q));
  $('#tableWrap').innerHTML=filtered.length?`<table><thead><tr>${cols.map(c=>`<th>${c[1]}</th>`).join('')}<th></th></tr></thead>
  <tbody>${filtered.map((r,i)=>`<tr>${cols.map(c=>`<td>${badge(c[0],r[c[0]]??'')}</td>`).join('')}
  <td><button class="secondary edit" data-id="${r.id||i}">Editar</button></td></tr>`).join('')}</tbody></table>`:
  `<div class="empty">No existen registros. Usa “Nuevo registro”.</div>`;
 };
 $('#search').oninput=paint;$('#add').onclick=()=>openForm(type,null);$('#tableWrap').onclick=e=>{
  if(e.target.classList.contains('edit')){
   const id=e.target.dataset.id; const record=rows.find((r,i)=>(r.id||String(i))===id);openForm(type,record)
  }
 };paint();
}
function badge(key,val){
 if(key==='estado')return `<span class="badge ${String(val).includes('Pendiente')?'warn':''}">${val}</span>`;
 return val;
}
function openForm(type,record){
 const cols=schemas[type];const dialog=document.createElement('dialog');
 dialog.innerHTML=`<form class="dialog-body"><h3>${record?'Editar':'Nuevo'} registro</h3>
 ${cols.map(([k,l])=>`<label style="display:block;margin-top:12px;font-weight:700;font-size:13px">${l}</label>
 <input name="${k}" value="${record?.[k]??''}" required>`).join('')}
 <div class="dialog-actions"><button type="button" class="secondary cancel">Cancelar</button><button>Guardar</button></div></form>`;
 document.body.append(dialog);dialog.showModal();dialog.querySelector('.cancel').onclick=()=>{dialog.close();dialog.remove()};
 dialog.querySelector('form').onsubmit=e=>{e.preventDefault();const obj=Object.fromEntries(new FormData(e.target));
  if(record)Object.assign(record,obj);else{obj.id=crypto.randomUUID();data[type].push(obj)} save();dialog.close();dialog.remove();render()
 };
}
