const STORE='smartrisk-cz5-data-v1';
const ADMIN_EMAILS=['geopro.ec2@gmail.com','dcoellom2@unemi.edu.ec'];
const menu=[
 ['dashboard','Panel principal'],['usuarios','Usuarios'],['territorios','Territorios'],
 ['instituciones','Instituciones'],['sitios','Sitios críticos'],['acciones','Acciones']
];
let data=JSON.parse(localStorage.getItem(STORE)||'null')||structuredClone(window.SEED_DATA);
let current='dashboard';
let session=null;
const $=s=>document.querySelector(s);
const normalizeEmail=value=>String(value||'').trim().toLowerCase();
const isAdmin=()=>ADMIN_EMAILS.includes(normalizeEmail(session?.email));
function save(){localStorage.setItem(STORE,JSON.stringify(data))}
function passwordError(value){
 if(value.length<10)return 'La contraseña debe tener al menos 10 caracteres.';
 if(!/[A-Z]/.test(value)||!/[a-z]/.test(value)||!/\d/.test(value)||!/[^\w\s]/.test(value))return 'Incluye mayúscula, minúscula, número y símbolo.';
 return '';
}
function start(){
 session=auth.currentUser;
 if(!session)return;
 $('#login').classList.add('hidden');$('#app').classList.remove('hidden');
 const role=isAdmin()?'Administrador':'Usuario territorial';
 $('#sessionUser').textContent=`${session.displayName||session.email} · ${role}`;
 const availableMenu=isAdmin()?menu:menu.filter(([id])=>id!=='usuarios');
 if(!availableMenu.some(([id])=>id===current))current='dashboard';
 $('#nav').innerHTML=availableMenu.map(([id,label])=>`<button data-page="${id}">${label}</button>`).join('');
 $('#nav').onclick=event=>{if(event.target.dataset.page){current=event.target.dataset.page;render()}};
 render();
}
$('#loginForm').onsubmit=async event=>{
 event.preventDefault();
 const error=$('#loginError');error.textContent='';
 const email=normalizeEmail($('#email').value);
 try{
  await auth.signInWithEmailAndPassword(email,$('#password').value);
  $('#password').value='';
 }catch{
  error.textContent='Correo o contraseña incorrectos.';
 }
};
$('#showRecovery').onclick=()=>openRecoveryDialog();
$('#changePassword').onclick=()=>openPasswordDialog(false);
$('#logout').onclick=()=>auth.signOut();
auth.onAuthStateChanged(user=>{
 if(user)start();
 else{$('#app').classList.add('hidden');$('#login').classList.remove('hidden')}
});

function render(){
 if(current==='usuarios'&&!isAdmin()){current='dashboard'}
 document.querySelectorAll('nav button').forEach(button=>button.classList.toggle('nav-active',button.dataset.page===current));
 const titles={dashboard:['Panel principal','Estado operativo de la plataforma'],usuarios:['Usuarios','Gestión de usuarios y accesos'],
 territorios:['Territorios','Cobertura de la Coordinación Zonal 5'],instituciones:['Instituciones','GAD municipales vinculados'],
 sitios:['Sitios críticos','Registro territorial de condiciones de riesgo'],acciones:['Acciones','Seguimiento del plan de acción']};
 $('#pageTitle').textContent=titles[current][0];$('#pageSubtitle').textContent=titles[current][1];
 if(current==='dashboard')return dashboard();
 tablePage(current);
}
function dashboard(){
 const active=data.usuarios.filter(item=>item.estado==='Activo').length;
 const enabled=data.usuarios.filter(item=>item.authUid).length+1;
 $('#content').innerHTML=`<div class="cards">
 <div class="card"><span>Territorios</span><strong>${data.territorios.length}</strong></div>
 <div class="card"><span>Usuarios cargados</span><strong>${data.usuarios.length}</strong></div>
 <div class="card"><span>Usuarios activos</span><strong>${active}</strong></div>
 <div class="card"><span>Accesos habilitados</span><strong>${enabled}</strong></div>
 </div><div class="panel"><div class="toolbar"><b>Estado del MVP</b></div>
 <table><tr><th>Componente</th><th>Estado</th></tr>
 <tr><td>Login y sesión</td><td><span class="badge">Operativo</span></td></tr>
 <tr><td>Recuperación y cambio de contraseña</td><td><span class="badge">Operativo</span></td></tr>
 <tr><td>Dashboard</td><td><span class="badge">Operativo</span></td></tr>
 <tr><td>Territorios e instituciones</td><td><span class="badge">Cargados</span></td></tr>
 <tr><td>Usuarios</td><td><span class="badge">Gestionables</span></td></tr>
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
 const cols=schemas[type],rows=data[type]||[];
 $('#content').innerHTML=`<div class="panel"><div class="toolbar"><input id="search" placeholder="Buscar..."><button id="add">Nuevo registro</button></div>
 <div id="tableWrap"></div></div>`;
 const paint=()=>{
  const query=$('#search').value.toLowerCase();
  const filtered=rows.filter(row=>JSON.stringify(row).toLowerCase().includes(query));
  $('#tableWrap').innerHTML=filtered.length?`<table><thead><tr>${cols.map(col=>`<th>${col[1]}</th>`).join('')}${type==='usuarios'?'<th>Acceso</th>':''}<th></th></tr></thead>
  <tbody>${filtered.map((row,index)=>`<tr>${cols.map(col=>`<td>${badge(col[0],row[col[0]]??'')}</td>`).join('')}
  ${type==='usuarios'?`<td>${accessBadge(row)}</td>`:''}<td><button class="secondary edit" data-id="${row.id||index}">Editar</button></td></tr>`).join('')}</tbody></table>`:
  `<div class="empty">No existen registros. Usa “Nuevo registro”.</div>`;
 };
 $('#search').oninput=paint;$('#add').onclick=()=>openForm(type,null);$('#tableWrap').onclick=event=>{
  if(event.target.classList.contains('edit')){
   const id=event.target.dataset.id;
   const record=rows.find((row,index)=>(row.id||String(index))===id);
   openForm(type,record);
  }
 };paint();
}
function accessBadge(user){
 return user.authUid?badge('estado',user.estado):'<span class="badge neutral">Sin acceso</span>';
}
function badge(key,value){
 if(key==='estado'){
  const style=String(value).includes('Pendiente')?'warn':value==='Inactivo'?'danger':'';
  return `<span class="badge ${style}">${value}</span>`;
 }
 return value;
}
function openForm(type,record){
 if(type==='usuarios')return openUserForm(record);
 const cols=schemas[type];const dialog=document.createElement('dialog');
 dialog.innerHTML=`<form class="dialog-body"><h3>${record?'Editar':'Nuevo'} registro</h3>
 ${cols.map(([key,label])=>`<label>${label}</label><input name="${key}" value="${record?.[key]??''}" required>`).join('')}
 <div class="dialog-actions"><button type="button" class="secondary cancel">Cancelar</button><button>Guardar</button></div></form>`;
 document.body.append(dialog);dialog.showModal();bindCancel(dialog);
 dialog.querySelector('form').onsubmit=event=>{event.preventDefault();const obj=Object.fromEntries(new FormData(event.target));
  if(record)Object.assign(record,obj);else{obj.id=crypto.randomUUID();data[type].push(obj)}
  save();dialog.close();dialog.remove();render();
 };
}
function openUserForm(record){
 const dialog=document.createElement('dialog');
 const hasAccess=Boolean(record?.authUid);
 dialog.innerHTML=`<form class="dialog-body"><h3>${record?'Editar':'Nuevo'} usuario</h3>
 ${schemas.usuarios.map(([key,label])=>`<label>${label}</label><input name="${key}" value="${record?.[key]??''}" ${key==='correo'?'type="email"':''} required>`).join('')}
 <label>Rol</label><select name="rol"><option ${record?.rol==='Usuario territorial'?'selected':''}>Usuario territorial</option><option ${record?.rol==='Administrador'?'selected':''}>Administrador</option></select>
 <label class="check-row"><input name="acceso" type="checkbox" ${hasAccess?'checked disabled':''}> ${hasAccess?'Acceso habilitado en Firebase':'Crear acceso y enviar correo para definir contraseña'}</label>
 <div class="form-error error" role="alert"></div>
 <div class="dialog-actions"><button type="button" class="secondary cancel">Cancelar</button><button>Guardar</button></div></form>`;
 document.body.append(dialog);dialog.showModal();bindCancel(dialog);
 const form=dialog.querySelector('form'),toggle=form.elements.acceso;
 form.onsubmit=async event=>{
  event.preventDefault();const values=Object.fromEntries(new FormData(form));const error=dialog.querySelector('.form-error');
  const email=normalizeEmail(values.correo);
  if(data.usuarios.some(item=>normalizeEmail(item.correo)===email&&item.id!==record?.id)){error.textContent='Ya existe un usuario con este correo.';return}
  const userValues={nombre:values.nombre,correo:email,telefono:values.telefono,provincia:values.provincia,canton:values.canton,estado:values.estado,rol:values.rol};
  if(record)Object.assign(record,userValues);else{record={id:crypto.randomUUID(),...userValues};data.usuarios.push(record)}
  if(toggle.checked&&!hasAccess){
   try{
    const secondaryName=`user-creation-${crypto.randomUUID()}`;
    const secondaryApp=firebase.initializeApp(firebaseConfig,secondaryName);
    const temporary=`CZ5-${crypto.randomUUID()}!aA1`;
    const credential=await secondaryApp.auth().createUserWithEmailAndPassword(email,temporary);
    await credential.user.updateProfile({displayName:values.nombre});
    record.authUid=credential.user.uid;
    await secondaryApp.auth().signOut();await secondaryApp.delete();
    await auth.sendPasswordResetEmail(email,{url:location.origin+location.pathname});
   }catch(firebaseError){
    error.textContent=firebaseMessage(firebaseError);return;
   }
  }
  save();dialog.close();dialog.remove();render();
 };
}
function openRecoveryDialog(){
 const dialog=document.createElement('dialog');
 dialog.innerHTML=`<form class="dialog-body"><h3>Recuperar contraseña</h3><p class="muted">Ingresa el correo de una cuenta activa.</p>
 <label>Correo</label><input name="correo" type="email" required><div class="form-message" role="status"></div>
 <div class="dialog-actions"><button type="button" class="secondary cancel">Cancelar</button><button>Enviar enlace</button></div></form>`;
 document.body.append(dialog);dialog.showModal();bindCancel(dialog);
 dialog.querySelector('form').onsubmit=async event=>{
  event.preventDefault();const email=normalizeEmail(new FormData(event.target).get('correo'));
  const message=dialog.querySelector('.form-message');
  try{await auth.sendPasswordResetEmail(email,{url:location.origin+location.pathname})}catch{}
  message.className='form-message success';
  message.textContent='Si el correo está registrado, recibirás un enlace para definir una nueva contraseña.';
 };
}
function openPasswordDialog(required){
 const dialog=document.createElement('dialog');
 dialog.innerHTML=`<form class="dialog-body"><h3>Cambiar contraseña</h3>${required?'<p class="notice">Debes definir una contraseña nueva antes de continuar.</p>':''}
 <label>Contraseña actual</label><input name="currentPassword" type="password" autocomplete="current-password" required>
 <label>Nueva contraseña</label><input name="newPassword" type="password" autocomplete="new-password" required>
 <label>Confirmar contraseña</label><input name="confirmation" type="password" autocomplete="new-password" required>
 <div class="form-error error" role="alert"></div>
 <div class="dialog-actions">${required?'':'<button type="button" class="secondary cancel">Cancelar</button>'}<button>Actualizar</button></div></form>`;
 document.body.append(dialog);dialog.showModal();if(!required)bindCancel(dialog);
 dialog.querySelector('form').onsubmit=async event=>{
  event.preventDefault();const values=Object.fromEntries(new FormData(event.target));const error=dialog.querySelector('.form-error');
  const validation=passwordError(values.newPassword);
  if(validation){error.textContent=validation;return}
  if(values.newPassword!==values.confirmation){error.textContent='Las contraseñas nuevas no coinciden.';return}
  if(values.currentPassword===values.newPassword){error.textContent='La nueva contraseña debe ser diferente.';return}
  try{
   const credential=firebase.auth.EmailAuthProvider.credential(session.email,values.currentPassword);
   await session.reauthenticateWithCredential(credential);
   await session.updatePassword(values.newPassword);
   dialog.close();dialog.remove();
  }catch(firebaseError){error.textContent=firebaseMessage(firebaseError)}
 };
}
function firebaseMessage(error){
 const messages={
  'auth/email-already-in-use':'Ya existe una cuenta con este correo.',
  'auth/invalid-email':'El correo no es válido.',
  'auth/weak-password':'La contraseña no cumple los requisitos.',
  'auth/wrong-password':'La contraseña actual no es correcta.',
  'auth/invalid-credential':'La contraseña actual no es correcta.',
  'auth/too-many-requests':'Demasiados intentos. Espera unos minutos.'
 };
 return messages[error?.code]||'No fue posible completar la operación. Intenta nuevamente.';
}
function bindCancel(dialog){
 dialog.querySelector('.cancel').onclick=()=>{dialog.close();dialog.remove()};
 dialog.addEventListener('cancel',()=>dialog.remove());
}
