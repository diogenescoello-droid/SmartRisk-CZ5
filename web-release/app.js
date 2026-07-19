const STORE='smartrisk-cz5-data-v1';
const ADMIN_EMAILS=['geopro.ec2@gmail.com','dcoellom2@unemi.edu.ec'];
const menu=[
 ['dashboard','Panel principal'],['usuarios','Actores y flujo COE'],['territorios','Territorios'],
 ['instituciones','Mesas y grupos de trabajo'],['revision','Revisión de planes'],['decisiones','Bandeja de decisiones'],['sitios','Sitios críticos'],['acciones','Acciones'],['herramientas','Herramientas']
];
let data=JSON.parse(localStorage.getItem(STORE)||'null')||structuredClone(window.SEED_DATA);
const DEFAULT_TECHNICAL_FICHES=[
 {id:'TEC-INAMHI-199-20260718',institucion:'INAMHI',numero:'199',titulo:'Concentración de lluvias: predicción y vigilancia meteorológica',tipo:'Pronóstico y vigilancia',amenaza:'Lluvias intensas',emitidoEn:'2026-07-18T10:30:00-05:00',vigencia:'Próximas 24 horas',provincias:['Los Ríos'],cantones:[],nivel:'Vigilancia',resumen:'Se prevén lluvias y tormentas en el Litoral, con incidencia en el norte de Los Ríos durante el periodo informado.',implicacion:'Contrastar el pronóstico con sitios susceptibles, población expuesta, drenajes, cuerpos hídricos y capacidades locales antes de decidir acciones.',fuenteDocumento:'Bitácora de Turno de Monitoreo BT-GUAYAS-0271-18072026-MP-06h30-15H00, pp. 6–7',validacion:'Fuente institucional revisada',estado:'Nueva',vinculos:{territorios:[],sitios:[],decisiones:[],acciones:[],sesiones:[]}},
 {id:'TEC-INAMHI-52-20260718',institucion:'INAMHI',numero:'52',titulo:'Alta temperatura diurna y condiciones favorables a incendios forestales',tipo:'Advertencia meteorológica',amenaza:'Incendio forestal',emitidoEn:'2026-07-18T08:46:00-05:00',vigencia:'18/07/2026 10:00 – 21/07/2026 16:00',provincias:['Guayas'],cantones:[],nivel:'Advertencia',resumen:'Condiciones meteorológicas favorables para propagación de incendios forestales; Guayas consta entre las provincias de atención.',implicacion:'Priorizar vigilancia de cobertura vegetal, disponibilidad de respuesta, accesos, fuentes de agua y exposición de comunidades e infraestructura.',fuenteDocumento:'Reporte de Monitoreo Provincial 0237-18072026-09H00, p. 1',validacion:'Fuente institucional revisada',estado:'Nueva',vinculos:{territorios:[],sitios:[],decisiones:[],acciones:[],sesiones:[]}},
 {id:'TEC-SNGR-0271-ESTERO-SALADO',institucion:'Secretaría Nacional de Gestión de Riesgos',numero:'Evento 2026-10772',titulo:'Desbordamiento observado del Estero Salado',tipo:'Monitoreo observado',amenaza:'Inundación',emitidoEn:'2026-07-18T11:54:00-05:00',vigencia:'Evento finalizado a las 13:32; mantener vigilancia ante pleamar',provincias:['Guayas'],cantones:['Guayaquil'],nivel:'Observado',resumen:'Se reportó desbordamiento por pleamar en Febres Cordero, Coop. 24 de Julio. El nivel disminuyó y el evento fue finalizado.',implicacion:'Conservar el antecedente para contrastar recurrencia, población expuesta, drenaje, cotas, respuesta local y medidas de mitigación.',fuenteDocumento:'Bitácora de Turno de Monitoreo BT-GUAYAS-0271-18072026-MP-06h30-15H00, pp. 4–7',validacion:'Registro operativo revisado',estado:'Nueva',vinculos:{territorios:[],sitios:[],decisiones:[],acciones:[],sesiones:[]}}
];
function normalizeDataShape(){
 data.sitios=data.sitios||[];data.acciones=data.acciones||[];data.decisiones=data.decisiones||[];data.validaciones=data.validaciones||[];
 data.auditoria=data.auditoria||[];data.actoresCOE=data.actoresCOE||[];data.equiposCOE=data.equiposCOE||[];data.actividadesCOE=data.actividadesCOE||[];data.capasGeograficas=data.capasGeograficas||[];data.sesionesCabina=data.sesionesCabina||[];data.tareasCabina=data.tareasCabina||[];data.cartografiaOperativa=data.cartografiaOperativa||[];data.fichasTecnicas=Array.isArray(data.fichasTecnicas)?data.fichasTecnicas:structuredClone(DEFAULT_TECHNICAL_FICHES);data._revision=Number(data._revision||0);
}
normalizeDataShape();
let current='dashboard';
let session=null;
let currentProfile=null;
let pendingTemporaryPassword='';
let cloudReady=false;
let cloudUnsubscribe=null;
let cloudRevision=0;
let saveQueue=Promise.resolve();
let activeActionMap=null;
let activeActionGeoLayer=null;
let activeF03Map=null;
let f03ExternalCache=null;
let f03DrawMode='';
let f03DrawPoints=[];
let f03SketchLayer=null;
let currentF03Filtered=[];
let riskReadingStep='territory';
let analystHistory=[];
let analystBusy=false;
const CLOUD_DOC='plataforma/datos';
const $=s=>document.querySelector(s);
const normalizeEmail=value=>String(value||'').trim().toLowerCase();
const normalizeText=value=>String(value||'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const escapeHtml=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
const isAdmin=()=>ADMIN_EMAILS.includes(normalizeEmail(session?.email));
function ficheLinks(fiche){return fiche.vinculos||{territorios:[],sitios:[],decisiones:[],acciones:[],sesiones:[]}}
function relevantTechnicalFiches(context={}){
 return (data.fichasTecnicas||[]).filter(fiche=>{
  const links=ficheLinks(fiche);
  if(context.siteId&&links.sitios?.includes(context.siteId)||context.actionId&&links.acciones?.includes(context.actionId)||context.decisionId&&links.decisiones?.includes(context.decisionId))return true;
  const province=normalizeText(context.province||''),territory=normalizeText(context.territory||''),threat=normalizeText(context.threat||'');
  return Boolean((province&&fiche.provincias?.some(value=>normalizeText(value)===province))||(territory&&fiche.cantones?.some(value=>normalizeText(value)===territory))||(threat&&normalizeText(fiche.amenaza).includes(threat)));
 });
}
function technicalFicheCards(fiches,context={}){
 if(!fiches.length)return '<div class="empty compact-empty">No hay información técnico-científica vinculada a este contexto.</div>';
 return `<div class="technical-fiche-list">${fiches.map(fiche=>`<article><div><span class="badge technical">${escapeHtml(fiche.institucion)} · ${escapeHtml(fiche.numero)}</span><span class="badge ${fiche.nivel==='Observado'?'danger':'warn'}">${escapeHtml(fiche.nivel)}</span><h4>${escapeHtml(fiche.titulo)}</h4><p>${escapeHtml(fiche.resumen)}</p><small><b>Fuente:</b> ${escapeHtml(fiche.fuenteDocumento)} · ${escapeHtml(fiche.validacion)}</small></div><button type="button" class="secondary open-technical-fiche" data-fiche="${escapeHtml(fiche.id)}" data-context='${escapeHtml(JSON.stringify(context))}'>Revisar impacto</button></article>`).join('')}</div>`;
}
const currentRole=()=>isAdmin()?'Administrador':(currentProfile?.rol||'Sin perfil');
const roleMenus={
 'Usuario territorial':['dashboard','territorios','revision','decisiones','sitios','acciones','herramientas'],
 'Técnico territorial':['dashboard','territorios','revision','decisiones','sitios','acciones','herramientas'],
 'Coordinador COE':['dashboard','usuarios','territorios','instituciones','revision','decisiones','sitios','acciones','herramientas'],
 'Líder MTT/GT':['dashboard','usuarios','territorios','instituciones','decisiones','acciones','herramientas'],
 'Tomador de decisión/control':['dashboard','usuarios','territorios','revision','decisiones','sitios','acciones','herramientas']
};
function availableMenuForRole(){
 if(isAdmin())return menu;
 const allowed=roleMenus[currentRole()]||[];
 return menu.filter(([id])=>allowed.includes(id));
}
async function loadCurrentProfile(){
 if(isAdmin()){currentProfile={rol:'Administrador',estado:'Activo',correo:session?.email};return true}
 try{
  const snapshot=await db.collection('perfiles').doc(session.uid).get();
  currentProfile=snapshot.exists?snapshot.data():null;
  return currentProfile?.estado==='Activo'&&Boolean(roleMenus[currentProfile?.rol]);
 }catch{
  currentProfile=null;
  return false;
 }
}
function setSyncStatus(text,state='local'){
 const status=$('#syncStatus');
 if(!status)return;
 status.textContent=text;status.className=`sync-status ${state}`;
}
function auditChange(action,entity,id,detail=''){
 data.auditoria.push({id:crypto.randomUUID(),action,entity,recordId:id||'',detail,at:new Date().toISOString(),by:session?.email||''});
 if(data.auditoria.length>500)data.auditoria=data.auditoria.slice(-500);
}
function save(){
 localStorage.setItem(STORE,JSON.stringify(data));
 if(!cloudReady)return setSyncStatus('Guardado local','local');
 const pendingData=structuredClone(data);
 saveQueue=saveQueue.then(async()=>{
  const payloadSize=new Blob([JSON.stringify(pendingData)]).size;
  if(payloadSize>900000){setSyncStatus('Límite de sincronización · requiere migración','conflict');return}
  setSyncStatus('Guardando...','saving');
  try{
   await db.runTransaction(async transaction=>{
    const ref=db.doc(CLOUD_DOC),snapshot=await transaction.get(ref),remote=snapshot.exists?snapshot.data():{};
    const remoteRevision=Number(remote._revision||0);
    if(remoteRevision!==cloudRevision)throw new Error('VERSION_CONFLICT');
    pendingData._revision=remoteRevision+1;transaction.set(ref,pendingData);cloudRevision=pendingData._revision;
   });
   data._revision=cloudRevision;
   localStorage.setItem(STORE,JSON.stringify(data));setSyncStatus('Sincronizado','synced');
  }catch(error){
   if(error.message==='VERSION_CONFLICT'){setSyncStatus('Hay cambios de otro usuario · recargando','conflict');await connectCloudData()}
   else{cloudReady=false;setSyncStatus('Sin conexión · respaldo local','local')}
  }
 });
}
async function connectCloudData(){
 if(cloudUnsubscribe){cloudUnsubscribe();cloudUnsubscribe=null}
 cloudReady=false;setSyncStatus('Conectando...','saving');
 try{
  const ref=db.doc(CLOUD_DOC);
  const snapshot=await ref.get();
  if(snapshot.exists){
   data=snapshot.data();
   normalizeDataShape();
   cloudRevision=data._revision;
   localStorage.setItem(STORE,JSON.stringify(data));
  }else if(isAdmin()){
   await ref.set(data);
  }else{
   throw new Error('La base compartida aún no ha sido inicializada.');
  }
  cloudReady=true;setSyncStatus('Sincronizado','synced');render();
  cloudUnsubscribe=ref.onSnapshot(change=>{
   if(!change.exists)return;
   const incoming=change.data();
   const incomingRevision=Number(incoming._revision||0);
   if(incomingRevision<=cloudRevision)return;
   if(JSON.stringify(incoming)===JSON.stringify(data))return;
   data=incoming;normalizeDataShape();cloudRevision=incomingRevision;localStorage.setItem(STORE,JSON.stringify(data));render();
  },()=>{cloudReady=false;setSyncStatus('Sin conexión · respaldo local','local')});
 }catch{
  cloudReady=false;setSyncStatus('Modo local','local');
 }
}
function passwordError(value){
 if(value.length<10)return 'La contraseña debe tener al menos 10 caracteres.';
 if(!/[A-Z]/.test(value)||!/[a-z]/.test(value)||!/\d/.test(value)||!/[^\w\s]/.test(value))return 'Incluye mayúscula, minúscula, número y símbolo.';
 return '';
}
function analystScreenName(){
 return {dashboard:'Panel principal',usuarios:'Actores y flujo COE',territorios:'Territorios',instituciones:'Mesas y grupos de trabajo',revision:'Revisión de planes',decisiones:'Bandeja de decisiones',sitios:'Sitios críticos',acciones:'Acciones',herramientas:'Cartografía y herramientas',cabina:'Cabina COE'}[current]||current;
}
function buildAnalystContext(options={}){
 const focusProvince=normalizeText(options.province||''),focusCanton=normalizeText(options.canton||''),topic=options.topic||'Todo el expediente';
 const matchesFocus=(province,territory)=>(!focusProvince||normalizeText(province).includes(focusProvince))&&(!focusCanton||normalizeText(territory).includes(focusCanton));
 const includeTopic=name=>topic==='Todo el expediente'||topic===name;
 const territoriesById=Object.fromEntries((data.territorios||[]).map(item=>[item.id,`${item.provincia} · ${item.canton}`]));
 const base={screen:analystScreenName(),role:currentRole(),generatedAt:new Date().toISOString(),scope:'Coordinación Zonal 5',
  focus:{province:options.province||'Sin filtro',canton:options.canton||'Sin filtro',topic,question:options.question||''},
  summary:{territories:(data.territorios||[]).length,sites:(data.sitios||[]).length,actions:(data.acciones||[]).length,openDecisions:deriveDecisions().filter(item=>!['Resuelta','Descartada'].includes(item.status)).length,technicalFiches:(data.fichasTecnicas||[]).length},
  technicalFiches:(data.fichasTecnicas||[]).filter(item=>(!focusProvince||item.provincias?.some(value=>normalizeText(value).includes(focusProvince)))&&(!focusCanton||!item.cantones?.length||item.cantones.some(value=>normalizeText(value).includes(focusCanton)))).slice(0,20).map(item=>({id:item.id,institution:item.institucion,number:item.numero,title:item.titulo,type:item.tipo,threat:item.amenaza,issued:item.emitidoEn,validity:item.vigencia,provinces:item.provincias,cantons:item.cantones,level:item.nivel,summary:item.resumen,implication:item.implicacion,source:item.fuenteDocumento,validation:item.validacion,status:item.estado}))
 };
 const focusedSites=(data.sitios||[]).filter(site=>{const label=territoriesById[site.territorio]||site.territorio;return matchesFocus(label.split(' · ')[0]||'',label.split(' · ')[1]||label)});
 const focusedSiteIds=new Set(focusedSites.map(site=>site.id));
 if((current==='revision'||focusProvince||focusCanton)&&includeTopic('Planes y brechas'))base.plans=(window.ENOS_REVIEWS?.reviews||[]).filter(item=>matchesFocus(item.province,item.territory)).slice(0,focusCanton?50:20).map(item=>({province:item.province,territory:item.territory,plan:item.plan?.split('\\').pop(),score:item.score,status:item.status,gaps:(item.criteria||[]).filter(gap=>gap.status!=='Cumple').map(gap=>({criterion:gap.name,status:gap.status,score:gap.score,action:gap.newAction,evidence:gap.evidence?.slice(0,2)}))}));
 if((current==='decisiones'||current==='dashboard'||focusProvince||focusCanton)&&includeTopic('Decisiones'))base.decisions=deriveDecisions().filter(item=>!['Resuelta','Descartada'].includes(item.status)&&matchesFocus(item.province,item.territory)).slice(0,focusCanton?50:current==='dashboard'?12:20).map(item=>({id:item.id,type:item.type,province:item.province,territory:item.territory,title:item.title,question:item.question,evidence:item.evidence,source:item.source,priority:item.level,status:item.status,responsible:item.responsable||item.escalation,deadline:item.fechaCompromiso||item.deadline}));
 if((current==='sitios'||current==='dashboard'||current==='acciones'||focusProvince||focusCanton)&&includeTopic('Sitios críticos'))base.sites=focusedSites.slice(0,focusCanton?60:25).map(site=>({id:site.id,name:site.nombre,territory:territoriesById[site.territorio]||site.territorio,threat:site.amenaza,riskLevel:site.nivel,status:site.estado,description:site.descripcion,exposedPopulation:site.poblacionExpuesta,exposedElements:site.elementosExpuestos,gap:site.brechaPrincipal||site.brechas,measure:site.medidaNecesaria,source:site.fuentePlan?`${site.fuentePlan}, página ${site.fuentePagina}`:'Reporte territorial',actionStatus:siteActionStatus(site)}));
 if((current==='acciones'||current==='dashboard'||current==='cabina'||focusProvince||focusCanton)&&includeTopic('Acciones'))base.actions=(data.acciones||[]).filter(action=>!focusProvince&&!focusCanton||focusedSiteIds.has(action.sitioId)).slice(0,60).map(action=>({id:action.id,siteId:action.sitioId,action:action.accion,objective:action.objetivo,responsible:action.responsable,support:action.dependencia,status:action.estado,start:action.fechaInicio,deadline:action.fechaLimite,progress:action.avance,product:action.producto,indicator:action.indicador,closureCriterion:action.criterioCierre,evidence:action.evidencia}));
 if((current==='herramientas'||focusProvince||focusCanton)&&includeTopic('Cartografía'))base.cartography={f03:(window.F03_DATA?.records||[]).filter(item=>matchesFocus(item.provincia||item.province,item.canton||item.territorio||item.territory)).slice(0,60),operational:(data.cartografiaOperativa||[]).filter(item=>matchesFocus(item.provincia||'',item.canton||item.territorio||'')).slice(0,50).map(item=>({name:item.nombre,type:item.tipo,classification:item.clasificacion,risk:item.nivelRiesgo,territory:item.territorio,source:item.fuente,validity:item.validez,representation:item.representacion})),actionLayers:(data.capasGeograficas||[]).filter(item=>!focusProvince&&!focusCanton||focusedSiteIds.has((data.acciones||[]).find(action=>action.id===item.accionId)?.sitioId)).slice(0,40).map(item=>({name:item.nombre,source:item.fuente||item.institucionFuente,validation:item.estadoValidacion,threat:item.amenaza,date:item.fechaCorte,features:item.features?.length||0}))};
 if(includeTopic('Casos e informes')||topic==='Todo el expediente'){
  const cases=window.CZ5_CASES||{};
  base.historicalEvidence={
   methodology:cases.methodology,
   sources:(cases.sources||[]).filter(item=>!focusProvince||normalizeText(item.title).includes(focusProvince)||normalizeText(item.title).includes('guayas')),
   summaries:(cases.summaries||[]).filter(item=>matchesFocus(item.province,'')),
   cases:(cases.cases||[]).filter(item=>matchesFocus(item.province,item.canton)).slice(0,focusCanton?30:15),
   warnings:cases.warnings
  };
 }
 if(current==='cabina'){const cabin=(data.sesionesCabina||[]).find(item=>item.id===data.cabinaActiva);base.coe=cabin?{session:cabin,tasks:(data.tareasCabina||[]).filter(item=>item.sesionId===cabin.id)}:{status:'Sin sesión activa'}}
 if(current==='territorios')base.territories=(data.territorios||[]).map(item=>({province:item.provincia,canton:item.canton,status:item.estado,sites:(data.sitios||[]).filter(site=>site.territorio===item.id).length}));
 if(current==='instituciones')base.workgroups=(data.equiposCOE||[]).slice(0,40).map(item=>({territory:territoriesById[item.territorio]||item.territorio,unit:item.unidad,objective:item.objetivo,status:item.estado,product:item.producto}));
 if(current==='usuarios')base.coeFlow={actorsConfigured:(data.actoresCOE||[]).length,territorialContacts:(data.usuarios||[]).length,activeAccess:(data.usuarios||[]).filter(item=>item.authUid).length,note:'No se incluyen nombres, correos ni teléfonos en el contexto enviado al modelo.'};
 return base;
}
function analystSuggestions(){
 const defaults=['¿Cuál es la lectura integral del riesgo con estos datos?','¿Qué información falta antes de decidir?'];
 return {revision:['¿Cuáles son las brechas operativas más críticas?','¿Qué acciones nuevas surgen de las propuestas de los planes?'],decisiones:['Prioriza las decisiones que requieren control inmediato','Compara opciones y consecuencias de la decisión más urgente'],sitios:['¿Qué sitios requieren validación o mitigación inmediata?','Separa amenaza, exposición, vulnerabilidad y capacidad'],acciones:['¿Qué acciones están vencidas, bloqueadas o sin evidencia?','Propón verificables para cerrar las acciones prioritarias'],herramientas:['¿Qué cartografía es técnicamente válida para esta decisión?','¿Qué capas faltan para leer claramente el proceso de riesgo?'],cabina:['Prepara una lectura ejecutiva para el COE','¿Qué actor, acción o información falta para conducir la respuesta?']}[current]||defaults;
}
function renderAnalystText(value){
 return escapeHtml(value).replace(/^###?\s+(.+)$/gm,'<h4>$1</h4>').replace(/^\-\s+(.+)$/gm,'<li>$1</li>').replace(/\*\*(.+?)\*\*/g,'<b>$1</b>').replace(/\n/g,'<br>');
}
function paintAnalyst(){
 const messages=$('#analystMessages');if(!messages)return;
 $('#analystContextLabel').innerHTML=`<span>Contexto activo</span><b>${escapeHtml(analystScreenName())}</b><small>${escapeHtml(currentRole())} · se enviarán solo datos operativos de esta pantalla</small>`;
 messages.innerHTML=analystHistory.length?analystHistory.map(item=>`<article class="${item.role}"><small>${item.role==='assistant'?'Analista SmartRisk':'Tu pregunta'}</small><div>${renderAnalystText(item.content)}</div>${item.meta?`<span>${escapeHtml(item.meta)}</span>`:''}</article>`).join(''):`<div class="analyst-welcome"><b>¿Qué necesitas comprender o decidir?</b><p>Analizaré los registros visibles, distinguiré evidencia de inferencia y citaré las fuentes disponibles.</p></div>`;
 $('#analystSuggestions').innerHTML=analystSuggestions().map(value=>`<button type="button">${escapeHtml(value)}</button>`).join('');
 $('#analystSuggestions').querySelectorAll('button').forEach(button=>button.onclick=()=>{$('#analystQuestion').value=button.textContent;$('#analystQuestion').focus()});
 messages.scrollTop=messages.scrollHeight;
}
function initializeRiskAnalyst(){
 if($('#riskAnalyst').dataset.ready)return;$('#riskAnalyst').dataset.ready='1';
 $('#riskAnalyst').onclick=openExternalAnalyst;
}
function externalAnalystPrompt(options={}){
 return `Actúa como analista especialista en gestión integral del riesgo para la Coordinación Zonal 5 de Ecuador.
Diferencia dato documentado, observación territorial, pronóstico, inferencia y dato faltante. Analiza amenaza, exposición, vulnerabilidad y capacidad. No inventes información. Cita las fuentes incluidas y señala quién debe validar cada recomendación.

PREGUNTA QUE DEBES RESPONDER DIRECTAMENTE
${options.question||'Primero pregunta al usuario qué decisión o problema necesita resolver.'}

ENFOQUE SOLICITADO
Provincia: ${options.province||'Sin filtro'} · Cantón: ${options.canton||'Sin filtro'} · Datos de interés: ${options.topic||'Todo el expediente'}

PANTALLA Y PERFIL
${analystScreenName()} · ${currentRole()}

CONTEXTO EXPORTADO DESDE SMARTRISK
${JSON.stringify(buildAnalystContext(options),null,2)}

Responde directamente la pregunta indicada. Presenta lectura ejecutiva, evidencia y fuentes, brechas, opciones y acciones verificables. Si la base no contiene registros después de revisar el expediente focalizado, indícalo expresamente.`;
}
function externalQuestionSuggestions(topic='Todo el expediente',canton='este territorio'){
 const place=canton||'este territorio';
 const common=[
  `¿Cuáles son los datos clave del riesgo de ${place} y qué falta validar?`,
  `¿Qué situación requiere atención inmediata en ${place} y con qué evidencia?`,
  `¿Cómo interactúan amenaza, exposición, vulnerabilidad y capacidad en ${place}?`,
  `¿Qué información podría cambiar la prioridad actual de ${place}?`
 ];
 const byTopic={
  'Planes y brechas':[`¿Cuáles son las brechas operativas más críticas del plan de ${place}?`,`¿Qué acciones nuevas surgen de las propuestas del propio plan de ${place}?`,`¿Qué evidencia documental debe validarse primero en territorio?`,`¿Qué componente del plan impide una respuesta efectiva y cómo fortalecerlo?`],
  'Sitios críticos':[`¿Qué sitios de ${place} deben priorizarse y por qué?`,`¿Qué población, infraestructura y servicios permanecen expuestos sin mitigación?`,`¿Qué fichas están incompletas y qué dato falta para hacerlas gestionables?`,`¿Qué medida inmediata y qué solución definitiva requiere cada sitio prioritario?`],
  'Decisiones':[`¿Qué decisión no puede postergarse en ${place} y cuáles son sus opciones?`,`¿Qué decisión está vencida, sin responsable o sin evidencia suficiente?`,`¿Qué consecuencias tendría no actuar durante la ventana temporal disponible?`,`¿Qué información mínima necesita la autoridad antes de decidir?`],
  'Acciones':[`¿Qué acciones están vencidas, detenidas o sin evidencia de cierre?`,`¿Qué responsable, plazo, producto e indicador debe definirse para cada acción prioritaria?`,`¿Qué acciones reducen realmente el riesgo y cuáles solo atienden síntomas?`,`¿Qué acción debería escalarse al nivel provincial, zonal o nacional?`],
  'Cartografía':[`¿Qué capas permiten leer claramente el riesgo de ${place} y cuáles faltan?`,`¿Qué datos cartográficos tienen validez técnica suficiente para decidir?`,`¿Qué geometrías deberían actualizarse, dibujarse o verificarse en campo?`,`¿Cómo se relacionan amenaza, exposición, vulnerabilidad y capacidad en el mapa?`],
  'Casos e informes':[`¿Qué casos históricos son comparables con la situación actual de ${place}?`,`¿Qué respuestas funcionaron, cuáles dejaron riesgo residual y con qué evidencia?`,`¿Qué patrones de recurrencia e impacto deben cambiar la prioridad de ${place}?`,`¿Qué lecciones de los informes deben convertirse en acciones verificables?`],
  'Todo el expediente':common
 };
 return [...common,...(byTopic[topic]||[])].filter((value,index,array)=>array.indexOf(value)===index).slice(0,8);
}
function openExternalAnalyst(){
 document.querySelector('.technical-bubble')?.remove();closeActiveGuide(false);
 const dialog=document.createElement('dialog');dialog.className='detail-dialog external-analyst-dialog';
 const provinces=[...new Set((data.territorios||[]).map(item=>item.provincia))].sort((a,b)=>a.localeCompare(b,'es'));
 dialog.innerHTML=`<div class="dialog-body"><div class="detail-heading"><div><span class="eyebrow">GPT especializado · Analista SmartRisk CZ5</span><h3>Continuar el análisis fuera de SmartRisk</h3></div><button type="button" class="icon-button cancel">×</button></div>
 <div class="external-warning"><b>Se abrirá una nueva pestaña.</b><p>SmartRisk no enviará datos automáticamente ni usará servicios de pago. Preparará un contexto técnico sin nombres, correos ni teléfonos; tú decides si lo pegas en ChatGPT.</p></div>
 <section class="analyst-focus"><h4>1. Define qué debe analizar</h4><div class="form-grid"><label>Provincia<select id="analystProvince"><option value="">Todas las provincias</option>${provinces.map(value=>`<option>${escapeHtml(value)}</option>`).join('')}</select></label><label>Cantón<select id="analystCanton"><option value="">Todos los cantones</option></select></label><label>Datos de interés<select id="analystTopic">${['Todo el expediente','Planes y brechas','Sitios críticos','Decisiones','Acciones','Cartografía','Casos e informes'].map(value=>`<option>${value}</option>`).join('')}</select></label><div class="full strategic-question-picker"><small>Preguntas estratégicas sugeridas</small><div id="externalQuestionSuggestions"></div></div><label class="full">Pregunta que debe responder el GPT<textarea id="analystDirectQuestion" rows="2" maxlength="800" placeholder="Elige una pregunta sugerida o escribe aquí una diferente…"></textarea></label></div></section>
 <div class="detail-grid"><section><h4>2. Contexto focalizado</h4><p><b>${escapeHtml(analystScreenName())}</b> · ${escapeHtml(currentRole())}</p><p>Al cambiar territorio, tema o pregunta, SmartRisk reconstruye el expediente que se copiará.</p></section><section><h4>Antes de compartir</h4><p>Revisa el texto y elimina cualquier dato que consideres reservado. La respuesta de ChatGPT no sustituye la validación institucional ni una decisión del COE.</p></section></div>
 <label>Instrucción y contexto que se copiarán<textarea id="externalAnalystContext" rows="7" readonly>${escapeHtml(externalAnalystPrompt())}</textarea></label>
 <div class="dialog-actions"><button type="button" class="secondary cancel-bottom">Cancelar</button><button type="button" class="secondary copy-only">Copiar solamente</button><button type="button" class="open-chatgpt">Copiar y abrir ChatGPT ↗</button></div></div>`;
 document.body.append(dialog);dialog.showModal();const textarea=dialog.querySelector('#externalAnalystContext'),close=()=>{dialog.close();dialog.remove()};
 const provinceSelect=dialog.querySelector('#analystProvince'),cantonSelect=dialog.querySelector('#analystCanton'),topicSelect=dialog.querySelector('#analystTopic'),questionInput=dialog.querySelector('#analystDirectQuestion');
 const options=()=>({province:provinceSelect.value,canton:cantonSelect.value,topic:topicSelect.value,question:questionInput.value.trim()});
 const refreshPrompt=()=>{textarea.value=externalAnalystPrompt(options())};
 const paintQuestions=()=>{const container=dialog.querySelector('#externalQuestionSuggestions');container.innerHTML=externalQuestionSuggestions(topicSelect.value,cantonSelect.value||provinceSelect.value||'este territorio').map((value,index)=>`<button type="button" data-question-index="${index}">${escapeHtml(value)}</button>`).join('');container.querySelectorAll('button').forEach((button,index)=>button.onclick=()=>{questionInput.value=externalQuestionSuggestions(topicSelect.value,cantonSelect.value||provinceSelect.value||'este territorio')[index];refreshPrompt();questionInput.focus()})};
 provinceSelect.onchange=()=>{const cantons=(data.territorios||[]).filter(item=>!provinceSelect.value||item.provincia===provinceSelect.value).map(item=>item.canton).sort((a,b)=>a.localeCompare(b,'es'));cantonSelect.innerHTML=`<option value="">Todos los cantones</option>${cantons.map(value=>`<option>${escapeHtml(value)}</option>`).join('')}`;paintQuestions();refreshPrompt()};
 cantonSelect.onchange=()=>{paintQuestions();refreshPrompt()};topicSelect.onchange=()=>{paintQuestions();refreshPrompt()};questionInput.oninput=refreshPrompt;paintQuestions();
 dialog.querySelectorAll('.cancel,.cancel-bottom').forEach(button=>button.onclick=close);
 const copy=async()=>{try{await navigator.clipboard.writeText(textarea.value);return true}catch{textarea.focus();textarea.select();return document.execCommand('copy')}};
 dialog.querySelector('.copy-only').onclick=async event=>{const ok=await copy();event.target.textContent=ok?'Contexto copiado':'Selecciona y copia el texto'};
 dialog.querySelector('.open-chatgpt').onclick=async()=>{await copy();auditChange('ABRIR_ANALISTA_EXTERNO','analisisIA','analista-smartrisk-cz5',analystScreenName());save();window.open('https://chatgpt.com/g/g-6a5c2edc0e7c8191a55be8c2c3da582a-analista-smartrisk-cz5','_blank','noopener');close()};
}
async function start(){
 session=auth.currentUser;
 if(!session)return;
 if(!await loadCurrentProfile()){
  $('#login').classList.remove('hidden');$('#app').classList.add('hidden');
  $('#loginError').textContent='Tu cuenta no tiene un perfil activo autorizado. Solicita habilitación al administrador.';
  await auth.signOut();
  return;
 }
 $('#login').classList.add('hidden');$('#app').classList.remove('hidden');
 $('#guideHelp').classList.remove('hidden');
 $('#riskAnalyst').classList.remove('hidden');
 const role=currentRole();
 $('#sessionUser').textContent=`${session.displayName||session.email} · ${role}`;
 const availableMenu=availableMenuForRole();
 if(!availableMenu.some(([id])=>id===current))current='dashboard';
 $('#nav').innerHTML=availableMenu.map(([id,label])=>`<button data-page="${id}">${label}</button>`).join('');
 $('#nav').onclick=event=>{if(event.target.dataset.page){current=event.target.dataset.page;render()}};
 render();
 initializeRiskAnalyst();
 await connectCloudData();
}
$('#loginForm').onsubmit=async event=>{
 event.preventDefault();
 const error=$('#loginError');error.textContent='';
 const email=normalizeEmail($('#email').value);
 const password=$('#password').value;
 try{
  pendingTemporaryPassword=password.startsWith('CZ5-')?password:'';
  await auth.signInWithEmailAndPassword(email,password);
  $('#password').value='';
 }catch{
  pendingTemporaryPassword='';
  error.textContent='Correo o contraseña incorrectos.';
 }
};
$('#showRecovery').onclick=()=>openRecoveryDialog();
$('#changePassword').onclick=()=>openPasswordDialog(false);
$('#logout').onclick=()=>auth.signOut();
auth.onAuthStateChanged(async user=>{
 if(user){
  await start();
  if(pendingTemporaryPassword)openPasswordDialog(true,pendingTemporaryPassword);
 }
 else{
  if(cloudUnsubscribe){cloudUnsubscribe();cloudUnsubscribe=null}
  cloudReady=false;$('#app').classList.add('hidden');$('#login').classList.remove('hidden');$('#guideHelp').classList.add('hidden')
 }
});

function render(){
 if(current!=='acciones'&&activeActionMap){activeActionMap.remove();activeActionMap=null;activeActionGeoLayer=null}
 if(activeF03Map){activeF03Map.remove();activeF03Map=null}
 f03DrawMode='';f03DrawPoints=[];f03SketchLayer=null;
 document.querySelectorAll('nav button').forEach(button=>button.classList.toggle('nav-active',button.dataset.page===current));
 const titles={dashboard:['Panel principal','Estado operativo de la plataforma'],usuarios:['Actores y flujo COE','Estructura, responsabilidades y circulación de información'],
 territorios:['Territorios','Cobertura de la Coordinación Zonal 5'],instituciones:['Mesas y grupos de trabajo','Objetivos, flujos, actividades y productos del COE'],
 revision:['Revisión de planes','Evaluación estructural y operativa ENOS'],decisiones:['Bandeja de decisiones','Riesgos, preguntas y acciones que requieren control'],sitios:['Sitios críticos','Registro territorial de condiciones de riesgo'],acciones:['Acciones','Seguimiento del plan de acción'],herramientas:['Herramientas','Cartografía, asistentes y recursos operativos'],cabina:['Cabina COE territorial','Dirección de problemas, decisiones y acciones por actor']};
 $('#pageTitle').textContent=titles[current][0];$('#pageSubtitle').textContent=titles[current][1];
 setTimeout(()=>maybeStartGuide(current),120);
 setTimeout(showNewTechnicalFiche,700);
 if(current==='dashboard')return dashboard();
 if(current==='usuarios')return coeActorsPage();
 if(current==='territorios')return territoriesPage();
 if(current==='instituciones')return workgroupsPage();
 if(current==='revision')return reviewsPage();
 if(current==='decisiones')return decisionsPage();
 if(current==='sitios')return sitesPage();
 if(current==='acciones')return actionsPage();
 if(current==='herramientas')return toolsPage();
 if(current==='cabina')return cabinPage();
 tablePage(current);
}
function openTechnicalFiche(id,context={}){
 const fiche=(data.fichasTecnicas||[]).find(item=>item.id===id);if(!fiche)return;
 closeActiveGuide(false);document.querySelector('.technical-bubble')?.remove();
 const dialog=document.createElement('dialog'),links=ficheLinks(fiche);
 const territoryOptions=(data.territorios||[]).map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(`${item.provincia} · ${item.canton}`)}</option>`).join('');
 const siteOptions=(data.sitios||[]).map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.nombre)}</option>`).join('');
 const actionOptions=(data.acciones||[]).map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.accion)}</option>`).join('');
 dialog.className='detail-dialog';dialog.innerHTML=`<form class="dialog-body technical-detail"><div class="detail-heading"><div><span class="eyebrow">Ficha técnico-científica · ${escapeHtml(fiche.institucion)} ${escapeHtml(fiche.numero)}</span><h3>${escapeHtml(fiche.titulo)}</h3></div><button type="button" class="icon-button cancel">×</button></div>
 <div class="detail-badges"><span class="badge ${fiche.nivel==='Observado'?'danger':'warn'}">${escapeHtml(fiche.nivel)}</span><span class="badge neutral">${escapeHtml(fiche.tipo)}</span><span class="badge success">${escapeHtml(fiche.validacion)}</span></div>
 <div class="detail-grid"><section><h4>Qué informa</h4><p>${escapeHtml(fiche.resumen)}</p><dl><dt>Amenaza</dt><dd>${escapeHtml(fiche.amenaza)}</dd><dt>Territorios referidos</dt><dd>${escapeHtml([...(fiche.provincias||[]),...(fiche.cantones||[])].join(' · ')||'No delimitados')}</dd><dt>Vigencia</dt><dd>${escapeHtml(fiche.vigencia)}</dd></dl></section><section><h4>Cómo usarlo en la gestión</h4><p>${escapeHtml(fiche.implicacion)}</p><p><b>No reemplaza la validación territorial.</b> Debe contrastarse con exposición, vulnerabilidad, capacidad y observaciones de campo.</p></section></div>
 <section class="source-card"><h4>Procedencia verificable</h4><p>${escapeHtml(fiche.fuenteDocumento)}</p><small>Emisión registrada: ${escapeHtml(new Date(fiche.emitidoEn).toLocaleString('es-EC'))}</small></section>
 <section class="technical-linker"><h4>Vincular al proceso de riesgo</h4><p>La ficha quedará disponible en el registro elegido y será citada en el informe de seguimiento.</p><div class="form-grid"><label>Territorio<select name="territorio"><option value="">No vincular</option>${territoryOptions}</select></label><label>Sitio crítico<select name="sitio"><option value="">No vincular</option>${siteOptions}</select></label><label>Acción<select name="accion"><option value="">No vincular</option>${actionOptions}</select></label></div><small>Vínculos actuales: ${links.territorios?.length||0} territorios · ${links.sitios?.length||0} sitios · ${links.decisiones?.length||0} decisiones · ${links.acciones?.length||0} acciones.</small></section>
 <div class="dialog-actions"><button type="button" class="secondary cancel-bottom">Cerrar</button><button type="submit">Guardar vínculos y marcar revisada</button></div></form>`;
 document.body.append(dialog);dialog.showModal();const form=dialog.querySelector('form');
 if(context.siteId)form.elements.sitio.value=context.siteId;if(context.actionId)form.elements.accion.value=context.actionId;
 const close=()=>{dialog.close();dialog.remove()};dialog.querySelectorAll('.cancel,.cancel-bottom').forEach(button=>button.onclick=close);
 form.onsubmit=event=>{event.preventDefault();const values=Object.fromEntries(new FormData(form)),target=ficheLinks(fiche);
  [['territorios',values.territorio],['sitios',values.sitio],['acciones',values.accion],['decisiones',context.decisionId]].forEach(([key,value])=>{target[key]=target[key]||[];if(value&&!target[key].includes(value))target[key].push(value)});
  fiche.vinculos=target;fiche.estado='Revisada';fiche.revisadoEn=new Date().toISOString();fiche.revisadoPor=session?.email||'';markTechnicalFicheSeen(fiche.id);auditChange('REVISAR_Y_VINCULAR','fichaTecnica',fiche.id,fiche.fuenteDocumento);save();close();render();
 };
}
function technicalSeenKey(){return `smartrisk-technical-seen-${normalizeEmail(session?.email)||'local'}`}
function markTechnicalFicheSeen(id){const seen=JSON.parse(localStorage.getItem(technicalSeenKey())||'[]');if(!seen.includes(id))seen.push(id);localStorage.setItem(technicalSeenKey(),JSON.stringify(seen))}
function showNewTechnicalFiche(){
 if(document.querySelector('dialog[open],.guide-layer,.technical-bubble')||sessionStorage.getItem('smartrisk-technical-later'))return;
 const seen=JSON.parse(localStorage.getItem(technicalSeenKey())||'[]'),fiche=(data.fichasTecnicas||[]).find(item=>item.estado==='Nueva'&&!seen.includes(item.id));if(!fiche)return;
 const bubble=document.createElement('aside');bubble.className='technical-bubble';bubble.innerHTML=`<small>NUEVA INFORMACIÓN TÉCNICO-CIENTÍFICA</small><h3>¿Este boletín cambia la lectura del riesgo?</h3><p><b>${escapeHtml(fiche.institucion)} ${escapeHtml(fiche.numero)}</b> · ${escapeHtml(fiche.titulo)}</p><span>${escapeHtml(fiche.fuenteDocumento)}</span><div><button class="secondary later">Revisar después</button><button class="review">Revisar impacto</button></div>`;
 document.body.append(bubble);bubble.querySelector('.later').onclick=()=>{sessionStorage.setItem('smartrisk-technical-later','1');bubble.remove()};bubble.querySelector('.review').onclick=()=>openTechnicalFiche(fiche.id);
}
document.addEventListener('click',event=>{const button=event.target.closest('.open-technical-fiche');if(!button)return;let context={};try{context=JSON.parse(button.dataset.context||'{}')}catch{}openTechnicalFiche(button.dataset.fiche,context)});
function scientificQualitySnapshot(){
 const stats=window.ENOS_REVIEWS?.stats||{},reviews=window.ENOS_REVIEWS?.reviews||[];
 const evidenceItems=reviews.flatMap(review=>(review.criteria||[]).flatMap(criterion=>criterion.evidence||[]));
 const tracedEvidence=evidenceItems.filter(item=>Number(item.page)>0).length;
 const validations=(data.validaciones||[]).filter(item=>item.estado==='Validado'||item.status==='Validado');
 const validatedTerritories=new Set(validations.map(item=>item.territorio||item.territory).filter(Boolean)).size;
 const canonical=Number(stats.canonicalTerritories||stats.folders||0),historicalUniverse=994,historicalReviewed=3;
 return {dimensions:[
  {label:'Cobertura documental ENOS',value:Number(stats.territorialCoverage||0),detail:`${stats.plansReceived||0} de ${canonical} entidades con plan`},
  {label:'Extracción de planes recibidos',value:Number(stats.reviewCompletion||0),detail:`${stats.plansEvaluated||0} de ${stats.plansReceived||0} documentos procesados`},
  {label:'Evidencia con página identificada',value:evidenceItems.length?Math.round(tracedEvidence/evidenceItems.length*100):0,detail:`${tracedEvidence} de ${evidenceItems.length} fragmentos con referencia`},
  {label:'Validación técnica territorial',value:canonical?Math.round(validatedTerritories/canonical*100):0,detail:`${validatedTerritories} de ${canonical} territorios con validación registrada`},
  {label:'Expedientes históricos revisados',value:Number((historicalReviewed/historicalUniverse*100).toFixed(1)),detail:`${historicalReviewed} de ${historicalUniverse} expedientes inventariados`}
 ],warnings:[
  'Procesado automáticamente no significa validado por un técnico.',
  'Un archivo no equivale a un expediente: los duplicados y versiones deben consolidarse.',
  'Los porcentajes usan universos distintos y no deben promediarse como un único avance.'
 ]};
}
function openScientificQuality(){
 const quality=scientificQualitySnapshot(),dialog=document.createElement('dialog');dialog.className='detail-dialog scientific-quality-dialog';
 dialog.innerHTML=`<div class="dialog-body"><div class="detail-heading"><div><span class="eyebrow">Control científico y reproducibilidad</span><h3>¿Qué está completo y qué todavía necesita revisión?</h3></div><button type="button" class="icon-button cancel">×</button></div>
 <div class="quality-method"><b>Unidad correcta: expediente territorial</b><p>Correos, versiones, anexos y cartografía se agrupan bajo un expediente. La extracción automática conserva su fuente, pero solo cambia a “validada” cuando un técnico registra su revisión.</p></div>
 <div class="quality-detail-list">${quality.dimensions.map(item=>`<article><div><span>${escapeHtml(item.label)}</span><strong>${item.value}%</strong></div><div class="quality-track"><i style="width:${Math.min(100,item.value)}%"></i></div><small>${escapeHtml(item.detail)}</small></article>`).join('')}</div>
 <section><h4>Reglas que protegen la validez</h4><ul>${quality.warnings.map(item=>`<li>${escapeHtml(item)}</li>`).join('')}</ul></section>
 <div class="evidence-states"><span>Localizada</span><span>Inventariada</span><span>Extraída</span><span>Revisada</span><span>Validada</span><span>Corroborada</span><span>Cerrada</span></div>
 <div class="dialog-actions"><button type="button" class="secondary cancel-bottom">Cerrar</button><button type="button" class="go-reviews">Ir a validación de planes</button></div></div>`;
 document.body.append(dialog);dialog.showModal();const close=()=>{dialog.close();dialog.remove()};dialog.querySelectorAll('.cancel,.cancel-bottom').forEach(button=>button.onclick=close);dialog.querySelector('.go-reviews').onclick=()=>{close();current='revision';render()};
}
function dashboard(){
 const reviews=window.ENOS_REVIEWS?.reviews||[],attentionReviews=reviews.filter(item=>item.score==null||item.score<80);
 const locationStats=window.ENOS_RISK_LOCATIONS?.stats||{};
 const territoriesAttention=new Set(attentionReviews.map(item=>`${item.province}|${item.territory}`)).size;
 const decisions=deriveDecisions(),openDecisions=decisions.filter(item=>!['Resuelta','Descartada'].includes(item.status));
 const exposed=(data.sitios||[]).reduce((sum,site)=>sum+Number(site.poblacionExpuesta||0),0);
 const withoutMitigation=(data.sitios||[]).filter(site=>siteActionStatus(site)==='Sin acciones').length;
 const planSites=(data.sitios||[]).filter(site=>site.origen==='Plan ENOS').length;
 const validatedSites=(data.sitios||[]).filter(site=>site.estado&&site.estado!=='Pendiente de validación territorial').length;
 const territoryCounts={};openDecisions.filter(item=>item.validationState==='Preliminar documental').forEach(item=>{const key=`${item.territory} · ${item.province}`;territoryCounts[key]=(territoryCounts[key]||0)+1});
 const topTerritories=Object.entries(territoryCounts).sort((a,b)=>b[1]-a[1]).slice(0,5);
 const technical=data.fichasTecnicas||[],newTechnical=technical.filter(item=>item.estado==='Nueva').length;
 const quality=scientificQualitySnapshot();
 $('#content').innerHTML=`<div class="risk-lead"><div><span class="eyebrow">Panorama estratégico con trazabilidad</span><h3>¿Qué está documentado y qué falta validar?</h3><p>Datos extraídos de planes ENOS reales. Los hallazgos de revisión automática se identifican como preliminares y no sustituyen la validación territorial.</p></div><button id="riskGuide" class="secondary">Explícame este panorama</button></div>
 <section class="technical-overview"><div><span class="eyebrow">Contexto técnico-científico</span><h3>${technical.length} fichas disponibles · ${newTechnical} pendientes de revisión</h3><p>Boletines y observaciones se contrastan con territorio, exposición, vulnerabilidad y capacidad. Cada uso conserva la referencia del documento fuente.</p></div><div>${technical.slice(0,3).map(fiche=>`<button class="open-technical-fiche" data-fiche="${escapeHtml(fiche.id)}"><span>${escapeHtml(fiche.institucion)} ${escapeHtml(fiche.numero)}</span><b>${escapeHtml(fiche.amenaza)}</b><small>${escapeHtml(fiche.nivel)} · Ver fuente y vincular →</small></button>`).join('')}</div></section>
 <div class="cards risk-cards">
  <button class="card risk-kpi risk-kpi-attention" data-target="revision"><span>Territorios con brechas por validar</span><strong>${territoriesAttention}</strong><small>Hallazgo documental preliminar en planes reales; requiere revisión técnica</small><em>Revisar evidencia →</em></button>
  <button class="card risk-kpi risk-kpi-urgent" data-target="sitios"><span>Menciones territoriales detectadas</span><strong>${locationStats.mentions||0}</strong><small>${locationStats.byType?.Sitio||0} sitios · ${locationStats.byType?.Tramo||0} tramos · ${locationStats.byType?.Área||0} áreas; aún no representan lugares únicos</small><em>Revisar y depurar →</em></button>
  <button class="card risk-kpi risk-kpi-exposed" data-target="sitios"><span>Población documentada en fichas</span><strong>${exposed.toLocaleString('es-EC')}</strong><small>Dato parcial: corresponde únicamente a ${planSites} fichas estructuradas y sigue pendiente de verificación territorial</small><em>Ver fichas y fuentes →</em></button>
  <button class="card risk-kpi risk-kpi-mitigation" data-target="acciones"><span>Fichas sin acción vinculada</span><strong>${withoutMitigation}</strong><small>De ${planSites} fichas estructuradas; no incluye todavía todas las menciones encontradas en los planes</small><em>Gestionar acciones →</em></button>
 </div>
 <div class="dashboard-grid"><section class="panel"><div class="toolbar"><b>Territorios con más alertas documentales preliminares</b><button class="secondary" data-target="revision">Revisar planes</button></div>
  ${topTerritories.length?`<div class="priority-territories">${topTerritories.map(([name,count],index)=>`<button data-target="revision"><span>${index+1}</span><b>${escapeHtml(name)}</b><strong>${count} hallazgos por validar</strong></button>`).join('')}</div>`:'<div class="empty">No existen alertas documentales preliminares.</div>'}</section>
 <section class="panel next-questions"><div class="toolbar"><b>Preguntas que debe responder el control</b></div><ul><li>¿Qué territorios necesitan apoyo inmediato?</li><li>¿Qué población permanece expuesta sin mitigación?</li><li>¿Qué decisión está vencida o sin responsable?</li><li>¿Qué brecha impide reducir el riesgo?</li></ul></section></div>`;
 $('#content').insertAdjacentHTML('afterbegin',`<section class="scientific-quality"><div class="quality-heading"><div><span class="eyebrow">Preparación científica</span><h3>La base no tiene un solo porcentaje de avance</h3><p>Cada dimensión responde una pregunta diferente y conserva su denominador.</p></div><button id="openScientificQuality" class="secondary">Ver control de calidad</button></div><div class="quality-mini-grid">${quality.dimensions.map(item=>`<article><span>${escapeHtml(item.label)}</span><strong>${item.value}%</strong><div><i style="width:${Math.min(100,item.value)}%"></i></div><small>${escapeHtml(item.detail)}</small></article>`).join('')}</div></section>`);
 $('#content').onclick=event=>{const route=event.target.closest('[data-target]')?.dataset.target;if(route){current=route;render()}};
 $('#riskGuide').onclick=()=>startGuide('dashboard',true);
 $('#openScientificQuality').onclick=openScientificQuality;
}
function deriveDecisions(){
 const decisions=[];
 (window.ENOS_REVIEWS?.reviews||[]).forEach(review=>{
  (review.criteria||[]).filter(item=>item.status!=='Cumple').forEach(item=>{
   const urgent=item.status==='No evidenciado'||item.score<30;
   decisions.push({id:`REV-${review.province}-${review.territory}-${item.key}`,type:'Brecha documental por validar',validationState:'Preliminar documental',province:review.province,territory:review.territory,
    title:item.newAction||`Completar ${item.name}`,question:`¿Qué impide que ${review.territory} complete ${item.name.toLocaleLowerCase('es')} y qué apoyo requiere?`,
    evidence:item.evidence?.[0]?.snippet||'No se encontró evidencia suficiente en el plan.',source:item.evidence?.length?`Plan territorial, página ${item.evidence[0].page}`:'Plan territorial sin evidencia localizada',
    level:urgent?'Urgente':'Alta',escalation:item.key==='coe_mtt'||item.key==='monitoreo_alerta'?'Zonal / autoridad territorial':'GAD responsable',
    deadline:urgent?'48 horas':'15 días',status:'Requiere decisión'});
  });
 });
 (data.sitios||[]).forEach(site=>{
  if(siteActionStatus(site)!=='Sin acciones')return;
  const territory=displayValue('sitios','territorio',site.territorio);
  decisions.push({id:`SITE-${site.id}`,type:'Sitio sin mitigación',validationState:site.estado==='Pendiente de validación territorial'?'Pendiente de validación territorial':'Validado territorialmente',province:territory.split(' · ')[1]||'',territory:territory.split(' · ')[0]||territory,
   title:`Definir mitigación para ${site.nombre}`,question:`¿Qué acción inmediata y qué solución definitiva reducirán el riesgo en ${site.nombre}?`,
   evidence:site.descripcion||site.brechas||'Sitio crítico registrado sin acciones vinculadas.',source:site.fuentePlan?`${site.fuentePlan}, página ${site.fuentePagina}`:'Reporte territorial',
   level:site.nivel==='Alto'||site.nivel==='Muy alto'?'Urgente':'Alta',escalation:'Responsable territorial / Obras Públicas',deadline:'7 días',status:'Requiere decisión'});
 });
 (data.acciones||[]).forEach(action=>{
  const overdue=action.estado!=='Completada'&&action.fechaLimite&&action.fechaLimite<new Date().toISOString().slice(0,10);
  if(!overdue)return;const site=data.sitios.find(x=>x.id===action.sitioId),territory=site?displayValue('sitios','territorio',site.territorio):'';
  decisions.push({id:`ACT-${action.id}`,type:'Acción vencida',validationState:'Registro operativo',province:territory.split(' · ')[1]||'',territory:territory.split(' · ')[0]||territory,
   title:`Destrabar: ${action.accion}`,question:'¿Se reprograma, se refuerza o se escala esta acción vencida?',
   evidence:`Avance ${action.avance||0}%. Responsable: ${action.responsable}.`,source:site?.nombre||'Plan de acción',
   level:'Urgente',escalation:'Responsable y nivel de control',deadline:'48 horas',status:'Requiere decisión'});
 });
 (data.fichasTecnicas||[]).filter(fiche=>fiche.estado==='Nueva').forEach(fiche=>{
  decisions.push({id:`TECH-${fiche.id}`,type:'Información técnico-científica nueva',validationState:fiche.validacion,province:fiche.provincias?.join(', ')||'',territory:fiche.cantones?.join(', ')||'Ámbito provincial',
   title:`Evaluar incidencia: ${fiche.titulo}`,question:`¿Esta información modifica la prioridad, el área expuesta, las medidas o el monitoreo vigente para ${fiche.amenaza.toLocaleLowerCase('es')}?`,
   evidence:fiche.resumen,source:fiche.fuenteDocumento,level:fiche.nivel==='Observado'?'Urgente':'Alta',escalation:'Monitoreo / responsable territorial / control',deadline:'Durante la vigencia',status:'Requiere decisión'});
 });
 return decisions.map(item=>({...item,...(data.decisiones.find(saved=>saved.id===item.id)||{})}));
}
function decisionsPage(){
 const decisions=deriveDecisions(),open=decisions.filter(x=>!['Resuelta','Descartada'].includes(x.status)),urgent=open.filter(x=>x.level==='Urgente').length,resolved=decisions.filter(x=>x.status==='Resuelta').length;
 const categoryOf=item=>item.type==='Brecha documental por validar'?'Planes y validación':item.type==='Sitio sin mitigación'?'Mitigación territorial':item.type==='Acción vencida'?'Ejecución vencida':item.type==='Información técnico-científica nueva'?'Información científica':'Otras';
 const categories=['Todas','Información científica','Planes y validación','Mitigación territorial','Ejecución vencida','Otras'];
 $('#content').innerHTML=`<div class="cards">
  <div class="card"><span>Decisiones abiertas</span><strong>${open.length}</strong></div><div class="card"><span>Urgentes</span><strong>${urgent}</strong></div>
  <div class="card"><span>En gestión</span><strong>${decisions.filter(x=>x.status==='En gestión').length}</strong></div><div class="card"><span>Resueltas</span><strong>${resolved}</strong></div>
 </div><div class="decision-intro"><div><span class="eyebrow">Cerebro SmartRisk</span><h3>Del hallazgo a la decisión</h3><p>Trabaja por bandejas: valida planes, resuelve mitigación territorial y destraba ejecución.</p></div><button id="startDecisionGuide" class="secondary">¿Cómo usar esta bandeja?</button></div>
 <div class="panel decision-control"><div class="decision-category-tabs">${categories.map(category=>`<button data-decision-category="${category}" class="${category==='Todas'?'active':''}"><span>${escapeHtml(category)}</span><b>${category==='Todas'?decisions.length:decisions.filter(item=>categoryOf(item)===category).length}</b></button>`).join('')}</div>
 <div class="toolbar site-toolbar"><input id="decisionSearch" aria-label="Buscar decisiones" placeholder="Buscar territorio, pregunta o responsable..."><select id="decisionLevel" aria-label="Filtrar prioridad"><option value="">Todas las prioridades</option><option>Urgente</option><option>Alta</option></select><select id="decisionStatus" aria-label="Filtrar estado"><option value="">Todos los estados</option>${['Requiere decisión','En gestión','Resuelta','Descartada'].map(x=>`<option>${x}</option>`).join('')}</select></div><div id="decisionList"></div><div id="decisionPager" class="decision-pager"></div></div>`;
 let activeCategory='Todas',page=1;const perPage=10;
 const paint=()=>{
  const q=$('#decisionSearch').value.trim().toLocaleLowerCase('es'),level=$('#decisionLevel').value,status=$('#decisionStatus').value;
  const filtered=decisions.filter(x=>(activeCategory==='Todas'||categoryOf(x)===activeCategory)&&(!q||`${x.territory} ${x.title} ${x.question} ${x.evidence} ${x.responsable||''}`.toLocaleLowerCase('es').includes(q))&&(!level||x.level===level)&&(!status||x.status===status)).sort((a,b)=>(a.status==='Resuelta')-(b.status==='Resuelta')||(a.level==='Urgente'?-1:1)-(b.level==='Urgente'?-1:1)||`${a.province}${a.territory}`.localeCompare(`${b.province}${b.territory}`,'es'));
  const pages=Math.max(1,Math.ceil(filtered.length/perPage));page=Math.min(page,pages);const visible=filtered.slice((page-1)*perPage,page*perPage);
  $('#decisionList').innerHTML=visible.length?`<div class="decision-compact-list"><div class="decision-list-summary"><b>${filtered.length} decisiones en esta consulta</b><span>Mostrando ${((page-1)*perPage)+1}–${Math.min(page*perPage,filtered.length)}</span></div>${visible.map(item=>`<article class="${item.level==='Urgente'?'urgent':''} ${item.status==='Resuelta'?'resolved':''}"><div class="decision-priority-dot"></div><div class="decision-compact-main"><div><span class="badge ${item.level==='Urgente'?'danger':'warn'}">${item.level}</span><span class="badge neutral">${escapeHtml(categoryOf(item))}</span><span class="badge ${item.status==='Resuelta'?'success':item.status==='En gestión'?'warn':'neutral'}">${escapeHtml(item.status)}</span></div><h4>${escapeHtml(item.title)}</h4><p>${escapeHtml(item.question)}</p></div><div class="decision-compact-context"><b>${escapeHtml(item.territory)}</b><span>${escapeHtml(item.province)}</span><small>${escapeHtml(item.responsable||item.escalation)}</small></div><button class="secondary decision-details" data-id="${escapeHtml(item.id)}">${item.respuesta?'Revisar':'Resolver'}</button></article>`).join('')}</div>`:'<div class="empty">No hay decisiones que coincidan con los filtros.</div>';
  $('#decisionPager').innerHTML=filtered.length>perPage?`<button class="secondary" data-page="${page-1}" ${page===1?'disabled':''}>← Anterior</button><span>Página ${page} de ${pages}</span><button class="secondary" data-page="${page+1}" ${page===pages?'disabled':''}>Siguiente →</button>`:'';
 };
 ['decisionSearch','decisionLevel','decisionStatus'].forEach(id=>$(`#${id}`).oninput=()=>{page=1;paint()});
 $('.decision-category-tabs').onclick=event=>{const category=event.target.closest('[data-decision-category]')?.dataset.decisionCategory;if(!category)return;activeCategory=category;page=1;document.querySelectorAll('[data-decision-category]').forEach(button=>button.classList.toggle('active',button.dataset.decisionCategory===category));paint()};
 $('#decisionList').onclick=event=>{if(event.target.classList.contains('decision-details'))openDecisionDetail(decisions.find(x=>x.id===event.target.dataset.id))};$('#decisionPager').onclick=event=>{const next=Number(event.target.closest('[data-page]')?.dataset.page);if(next>0){page=next;paint();$('#decisionList').scrollIntoView({block:'start'})}};
 $('#startDecisionGuide').onclick=()=>startGuide('decisiones',true);paint();
}
function openDecisionDetail(item){
 if(!item)return;closeActiveGuide(false);const dialog=document.createElement('dialog');dialog.className='detail-dialog';
 const defaultDate=new Date(Date.now()+7*86400000).toISOString().slice(0,10);
 dialog.innerHTML=`<form class="dialog-body decision-detail"><div class="detail-heading"><div><span class="eyebrow">${escapeHtml(item.type)} · ${escapeHtml(item.territory)}</span><h3>${escapeHtml(item.title)}</h3></div><button type="button" class="icon-button cancel">×</button></div>
 <div class="decision-question-box"><small>Pregunta para decisión</small><p>${escapeHtml(item.question)}</p></div>
 <div class="detail-grid"><section><h4>Evidencia disponible</h4><p>${escapeHtml(item.evidence)}</p><small>${escapeHtml(item.source)}</small></section><section><h4>Ruta sugerida</h4><dl><dt>Prioridad</dt><dd>${escapeHtml(item.level)}</dd><dt>Escalar a</dt><dd>${escapeHtml(item.escalation)}</dd><dt>Respuesta esperada</dt><dd>${escapeHtml(item.deadline)}</dd></dl></section></div>
 ${technicalFicheCards(relevantTechnicalFiches({decisionId:item.id.replace(/^TECH-/,''),province:item.province,territory:item.territory}),{decisionId:item.id})}
 <section class="decision-response"><div class="detail-actions-heading"><h4>Respuesta y compromiso</h4><span class="badge ${item.status==='Resuelta'?'success':item.status==='En gestión'?'warn':'neutral'}">${escapeHtml(item.status)}</span></div>
  <div class="form-grid"><label>Estado<select name="status" required>${['Requiere decisión','En gestión','Resuelta','Descartada'].map(value=>`<option ${value===item.status?'selected':''}>${value}</option>`).join('')}</select></label>
  <label>Responsable de respuesta<input name="responsable" value="${escapeHtml(item.responsable||'')}" maxlength="120" required></label>
  <label>Nivel de gestión<select name="nivelGestion" required>${['Territorial','Provincial','Zonal','Nacional'].map(value=>`<option ${value===(item.nivelGestion||'Territorial')?'selected':''}>${value}</option>`).join('')}</select></label>
  <label>Fecha de compromiso<input name="fechaCompromiso" type="date" value="${escapeHtml(item.fechaCompromiso||defaultDate)}" required></label>
  <label class="full">Respuesta del responsable<textarea name="respuesta" rows="3" maxlength="1000" placeholder="Indique la decisión tomada, sustento y alcance" required>${escapeHtml(item.respuesta||'')}</textarea></label>
  <label class="full">Compromiso verificable<textarea name="compromiso" rows="2" maxlength="700" placeholder="Producto, obra, coordinación o resultado que se entregará" required>${escapeHtml(item.compromiso||'')}</textarea></label>
  <label class="full">Evidencia o referencia<input name="evidenciaRespuesta" value="${escapeHtml(item.evidenciaRespuesta||'')}" maxlength="500" placeholder="Número de informe, enlace, acta, fotografía o documento"></label>
  <label class="full">Observaciones de control<textarea name="observacionesControl" rows="2" maxlength="600">${escapeHtml(item.observacionesControl||'')}</textarea></label></div>
  <div class="form-error error" role="alert"></div></section>
 <div class="dialog-actions"><button type="button" class="secondary cancel-bottom">Cancelar</button><button type="submit">Guardar respuesta</button></div></form>`;
 document.body.append(dialog);dialog.showModal();const close=()=>{dialog.close();dialog.remove()};dialog.querySelector('.cancel').onclick=close;dialog.querySelector('.cancel-bottom').onclick=close;
 dialog.querySelector('form').onsubmit=event=>{
  event.preventDefault();const values=Object.fromEntries(new FormData(event.target)),error=dialog.querySelector('.form-error');
  if(values.status==='Resuelta'&&!values.evidenciaRespuesta.trim()){error.textContent='Para marcar como resuelta, registra una evidencia o referencia verificable.';return}
  const saved={id:item.id,status:values.status,responsable:values.responsable.trim(),nivelGestion:values.nivelGestion,fechaCompromiso:values.fechaCompromiso,
   respuesta:values.respuesta.trim(),compromiso:values.compromiso.trim(),evidenciaRespuesta:values.evidenciaRespuesta.trim(),observacionesControl:values.observacionesControl.trim(),
   actualizadoEn:new Date().toISOString(),actualizadoPor:session?.email||''};
  const existing=data.decisiones.find(x=>x.id===item.id);if(existing)Object.assign(existing,saved);else data.decisiones.push(saved);
  save();close();render();
 };
}
function reviewsPage(){
 const packageData=window.ENOS_REVIEWS||{stats:{},reviews:[]},stats=packageData.stats,reviews=packageData.reviews;
 const reviewCategory=item=>item.score==null?'Sin plan':item.score>=80?'Fortalecidos':item.score>=60?'Requieren mejora':'Atención prioritaria';
 const reviewCategories=['Todos','Atención prioritaria','Requieren mejora','Fortalecidos','Sin plan'];
 $('#content').innerHTML=`<div class="cards">
  <div class="card"><span>Planes recibidos y evaluados</span><strong>${stats.plansEvaluated||0}/${stats.plansReceived||0}</strong><small>Incluye el plan procesado mediante OCR</small></div>
  <div class="card"><span>Extracción automática inicial</span><strong>${stats.reviewCompletion||0}%</strong><small>Procesado no significa validado territorialmente</small></div>
  <div class="card"><span>Cobertura territorial documental</span><strong>${stats.territorialCoverage||0}%</strong><small>${stats.plansReceived||0} de ${stats.canonicalTerritories||stats.folders||0} entidades con plan</small></div>
  <div class="card"><span>Planes no recibidos</span><strong>${stats.missingPlans||0}</strong><small>No se inventan resultados para estas entidades</small></div>
  <div class="card"><span>Ítems de checklist</span><strong>${stats.totalChecklist||0}</strong><small>Brechas y propuestas extraídas de los planes</small></div>
 </div><div class="panel compact-control"><div class="review-notice"><b>100% de los planes recibidos procesados automáticamente</b><span>La base canónica contiene ${stats.canonicalTerritories||stats.folders||0} entidades: ${stats.plansReceived||0} con plan evaluado y ${stats.missingPlans||0} sin documento recibido. Cada hallazgo conserva página y fuente, pero permanece preliminar hasta la validación técnica territorial.</span></div>
 <div class="compact-tabs">${reviewCategories.map(category=>`<button data-review-category="${category}" class="${category==='Todos'?'active':''}"><span>${category}</span><b>${category==='Todos'?reviews.length:reviews.filter(item=>reviewCategory(item)===category).length}</b></button>`).join('')}</div>
 <div class="toolbar site-toolbar"><input id="reviewSearch" placeholder="Buscar provincia, territorio o plan...">
 <select id="reviewProvince"><option value="">Todas las provincias</option>${[...new Set(reviews.map(x=>x.province))].map(x=>`<option>${escapeHtml(x)}</option>`).join('')}</select>
 <select id="reviewState"><option value="">Todos los resultados</option><option value="strong">80% o más</option><option value="attention">Menos de 80%</option><option value="missing">Sin plan</option></select></div>
 <div id="reviewTable"></div><div id="reviewPager" class="decision-pager"></div></div>`;
 let activeCategory='Todos',page=1;const perPage=10;
 const paint=()=>{
  const q=$('#reviewSearch').value.trim().toLocaleLowerCase('es'),province=$('#reviewProvince').value,state=$('#reviewState').value;
  const filtered=reviews.filter(item=>{
   const matches=!q||`${item.province} ${item.territory} ${item.plan}`.toLocaleLowerCase('es').includes(q);
   const stateMatch=!state||(state==='missing'?item.score==null:state==='strong'?item.score>=80:item.score!=null&&item.score<80);
   return matches&&(!province||item.province===province)&&stateMatch&&(activeCategory==='Todos'||reviewCategory(item)===activeCategory);
  }).sort((a,b)=>(a.score==null)-(b.score==null)||(a.score??0)-(b.score??0));
  const pages=Math.max(1,Math.ceil(filtered.length/perPage));page=Math.min(page,pages);const visible=filtered.slice((page-1)*perPage,page*perPage);
  $('#reviewTable').innerHTML=`<div class="decision-list-summary"><b>${filtered.length} planes en esta consulta</b><span>${filtered.length?`Mostrando ${(page-1)*perPage+1}–${Math.min(page*perPage,filtered.length)}`:''}</span></div><div class="table-scroll compact-table"><table><thead><tr><th>Territorio / plan</th><th>Resultado</th><th>Brechas</th><th>Checklist</th><th></th></tr></thead><tbody>${visible.map(item=>{
   const gaps=item.criteria?.filter(x=>x.status!=='Cumple').length||0;
   return `<tr><td><b>${escapeHtml(item.territory)}</b><small class="table-note">${escapeHtml(item.province)} · ${escapeHtml(item.plan?item.plan.split('\\').pop():'No disponible')}${item.status?.includes('OCR')?' · OCR':''}</small></td><td>${item.score==null?`<span class="badge danger">Sin plan recibido</span>`:`<span class="review-score ${item.score>=80?'good':item.score>=60?'warn':'danger'}">${item.score}%</span>`}</td><td>${gaps}</td><td>${item.totalChecklist||0}</td><td><button class="secondary review-details" data-province="${escapeHtml(item.province)}" data-territory="${escapeHtml(item.territory)}">${item.score==null?'Ver estado':'Revisar'}</button></td></tr>`;
  }).join('')}</tbody></table></div>`;
  $('#reviewPager').innerHTML=filtered.length>perPage?`<button class="secondary" data-review-page="${page-1}" ${page===1?'disabled':''}>← Anterior</button><span>Página ${page} de ${pages}</span><button class="secondary" data-review-page="${page+1}" ${page===pages?'disabled':''}>Siguiente →</button>`:'';
 };
 ['reviewSearch','reviewProvince','reviewState'].forEach(id=>$(`#${id}`).oninput=()=>{page=1;paint()});
 $('.compact-tabs').onclick=event=>{const category=event.target.closest('[data-review-category]')?.dataset.reviewCategory;if(!category)return;activeCategory=category;page=1;document.querySelectorAll('[data-review-category]').forEach(button=>button.classList.toggle('active',button.dataset.reviewCategory===category));paint()};
 $('#reviewPager').onclick=event=>{const next=Number(event.target.closest('[data-review-page]')?.dataset.reviewPage);if(next>0){page=next;paint()}};
 $('#reviewTable').onclick=event=>{
  if(!event.target.classList.contains('review-details'))return;
  openReviewDetail(reviews.find(item=>item.province===event.target.dataset.province&&item.territory===event.target.dataset.territory));
 };
 paint();
}
function openReviewDetail(review){
 if(!review)return;
 const dialog=document.createElement('dialog');dialog.className='review-dialog';
 const criteria=review.criteria||[];
 const checklist=review.checklist||[];
 dialog.innerHTML=`<div class="dialog-body review-detail"><div class="detail-heading"><div><span class="eyebrow">${escapeHtml(review.province)}</span><h3>${escapeHtml(review.territory)}</h3><p class="muted">${escapeHtml(review.plan||review.status)}</p></div><button type="button" class="icon-button cancel">×</button></div>
 ${review.score==null?`<div class="empty">El paquete no contiene un plan evaluable para este territorio. Debe solicitarse el documento oficial y sus anexos.</div>`:`<div class="detail-badges"><span class="review-score ${review.score>=80?'good':review.score>=60?'warn':'danger'}">${review.score}% global</span><span class="badge neutral">${review.pages} páginas</span><span class="badge neutral">${review.totalChecklist} ítems de checklist</span>${review.status?.includes('OCR')?'<span class="badge warn">Fuente procesada con OCR</span>':''}</div>
 <h4>Evaluación por componente</h4><div class="criteria-list">${criteria.map(item=>`<article class="criterion"><div><b>${escapeHtml(item.name)}</b><small>${item.score}% · ${escapeHtml(item.status)}</small></div><span class="criterion-state ${item.status==='Cumple'?'good':item.status==='Parcial'?'warn':'danger'}">${escapeHtml(item.status)}</span>${item.evidence?.length?`<p><b>Evidencia:</b> pág. ${item.evidence.map(x=>x.page).join(', ')} · ${escapeHtml(item.evidence[0].snippet)}</p>`:'<p class="danger-text">No se encontró evidencia suficiente en el documento.</p>'}${item.newAction?`<p><b>Acción nueva:</b> ${escapeHtml(item.newAction)}</p>`:''}</article>`).join('')}</div>
 <div class="detail-actions-heading"><h4>Checklist operativo visible (${checklist.length} de ${review.totalChecklist})</h4></div><div class="checklist-list">${checklist.map(item=>`<article><span class="badge ${item.origin==='Brecha de revisión'?'warn':'neutral'}">${escapeHtml(item.origin)}</span><p>${escapeHtml(item.action)}</p><small>Página ${escapeHtml(item.source_page||'por verificar')} · ${escapeHtml(item.status)}</small></article>`).join('')}</div>`}
 <div class="dialog-actions"><button type="button" class="secondary cancel-bottom">Cerrar</button></div></div>`;
 document.body.append(dialog);dialog.showModal();
 const close=()=>{dialog.close();dialog.remove()};
 dialog.querySelector('.cancel').onclick=close;dialog.querySelector('.cancel-bottom').onclick=close;dialog.addEventListener('cancel',()=>dialog.remove());
}
const schemas={
 usuarios:[['nombre','Responsable'],['correo','Correo'],['telefono','Teléfono'],['provincia','Provincia'],['canton','Cantón'],['estado','Estado']],
 territorios:[['provincia','Provincia'],['canton','Cantón'],['estado','Estado']],
 instituciones:[['nombre','Institución'],['territorio','Territorio'],['estado','Estado']],
 sitios:[['nombre','Sitio'],['territorio','Territorio'],['amenaza','Amenaza'],['nivel','Nivel'],['estado','Estado']],
 acciones:[['accion','Acción'],['territorio','Territorio'],['responsable','Responsable'],['avance','Avance %'],['estado','Estado']]
};
function sitePriority(site){
 const risk={Bajo:1,Medio:2,Alto:3,'Muy alto':4}[site.nivel]||0;
 const actionGap={'Sin acciones':3,'Acciones insuficientes':2,'En ejecución':1,Resuelto:0}[siteActionStatus(site)]??2;
 const score=risk*3+actionGap*2;
 const label=score>=15?'Urgente':score>=11?'Alta':score>=7?'Media':'Baja';
 const opportunity=(label==='Urgente'||label==='Alta')&&site.facilidadSolucion==='Alta';
 return {score,label,opportunity};
}
function linkedActions(siteId){return (data.acciones||[]).filter(action=>action.sitioId===siteId)}
function siteActionStatus(site){
 const actions=linkedActions(site.id);
 if(!actions.length)return 'Sin acciones';
 if(actions.every(action=>action.estado==='Completada'||Number(action.avance)>=100))return 'Resuelto';
 if(actions.some(action=>Number(action.avance)>0||action.estado==='En ejecución'))return 'En ejecución';
 return 'Acciones insuficientes';
}
function sitesPage(){
 const sites=data.sitios||[];
 const locationData=window.ENOS_RISK_LOCATIONS||{stats:{},locations:[]},locationStats=locationData.stats||{};
 const urgent=sites.filter(site=>sitePriority(site).label==='Urgente').length;
 const withoutActions=sites.filter(site=>siteActionStatus(site)==='Sin acciones').length;
 const withGaps=sites.filter(site=>site.brechaPrincipal&&site.brechaPrincipal!=='Sin brecha').length;
 const planSites=sites.filter(site=>site.origen==='Plan ENOS').length;
 $('#content').innerHTML=`<div class="cards site-cards">
  <div class="card"><span>Fichas gestionables</span><strong>${sites.length}</strong><small>Sitios ya estructurados para seguimiento</small></div>
  <div class="card"><span>Menciones territoriales</span><strong>${locationStats.mentions||0}</strong><small>Sitios, tramos y áreas nombrados en 54 planes</small></div>
  <div class="card"><span>Territorios con menciones</span><strong>${locationStats.territoriesWithMentions||0}</strong><small>De ${locationStats.plansReviewed||54} planes revisados</small></div>
  <div class="card"><span>Descripción suficiente</span><strong>${(locationStats.byQuality?.Alta||0)+(locationStats.byQuality?.Media||0)}</strong><small>Información alta o media; pendiente de validación</small></div>
 </div><div class="compact-tabs site-view-tabs"><button class="active" data-site-view="managed"><span>Fichas gestionables</span><b>${sites.length}</b></button><button data-site-view="pending"><span>Fichas pendientes</span><b>${locationStats.mentions||0}</b></button></div><div id="pendingSitesSection" hidden>${riskLocationInventory(locationData)}</div>
 <div class="panel managed-sites"><div class="toolbar"><div><b>Fichas gestionables</b><small class="table-note">${planSites} extraídas de planes · ${withoutActions} sin acciones · ${withGaps} con brecha</small></div></div><div class="toolbar site-toolbar">
  <input id="siteSearch" placeholder="Buscar sitio, cantón o brecha...">
  <select id="sourceFilter" aria-label="Filtrar por origen"><option value="">Todos los orígenes</option><option>Plan ENOS</option><option>Reporte territorial</option></select>
  <select id="riskFilter" aria-label="Filtrar por riesgo"><option value="">Todos los riesgos</option>${['Muy alto','Alto','Medio','Bajo'].map(value=>`<option>${value}</option>`).join('')}</select>
  <select id="actionFilter" aria-label="Filtrar por acciones"><option value="">Todas las acciones</option>${['Sin acciones','Acciones insuficientes','En ejecución','Resuelto'].map(value=>`<option>${value}</option>`).join('')}</select>
  <select id="feasibilityFilter" aria-label="Filtrar por facilidad"><option value="">Toda facilidad</option>${['Alta','Media','Baja'].map(value=>`<option>${value}</option>`).join('')}</select>
  <select id="gapFilter" aria-label="Filtrar por brecha"><option value="">Todas las brechas</option>${['Sin brecha','Financiera','Técnica','Infraestructura','Equipamiento','Información','Coordinación institucional','Participación comunitaria'].map(value=>`<option>${value}</option>`).join('')}</select>
  ${isAdmin()&&window.ENOS_IMPORT?.sites?.some(incoming=>!sites.some(site=>site.id===incoming.id))?'<button id="importEnos" class="secondary">Importar registros reales ENOS</button>':''}<button id="add">Nuevo sitio</button>
 </div><div id="tableWrap"></div><div id="sitePager" class="decision-pager"></div></div>`;
 let sitePage=1;const sitesPerPage=10;
 const paint=()=>{
  const query=$('#siteSearch').value.trim().toLocaleLowerCase('es');
  const source=$('#sourceFilter').value,risk=$('#riskFilter').value,actions=$('#actionFilter').value,feasibility=$('#feasibilityFilter').value,gap=$('#gapFilter').value;
  const filtered=sites.filter(site=>{
   const territory=displayValue('sitios','territorio',site.territorio);
   const searchable=`${site.nombre} ${territory} ${site.amenaza} ${site.brechaPrincipal||''} ${site.brechas||''}`.toLocaleLowerCase('es');
   return (!query||searchable.includes(query))&&(!source||(site.origen||'Reporte territorial')===source)&&(!risk||site.nivel===risk)&&(!actions||siteActionStatus(site)===actions)
    &&(!feasibility||site.facilidadSolucion===feasibility)&&(!gap||(site.brechaPrincipal||'Sin brecha')===gap);
  }).sort((a,b)=>sitePriority(b).score-sitePriority(a).score);
  const pages=Math.max(1,Math.ceil(filtered.length/sitesPerPage));sitePage=Math.min(sitePage,pages);const visible=filtered.slice((sitePage-1)*sitesPerPage,sitePage*sitesPerPage);
  $('#tableWrap').innerHTML=filtered.length?`<div class="decision-list-summary"><b>${filtered.length} fichas en esta consulta</b><span>Mostrando ${(sitePage-1)*sitesPerPage+1}–${Math.min(sitePage*sitesPerPage,filtered.length)}</span></div><div class="table-scroll compact-table"><table><thead><tr><th>Prioridad</th><th>Sitio</th><th>Territorio</th><th>Riesgo</th><th>Acciones</th><th>Brecha</th><th></th></tr></thead>
   <tbody>${visible.map(site=>{const priority=sitePriority(site);const hasLocation=site.latitud!==''&&site.latitud!=null&&site.longitud!==''&&site.longitud!=null;
    return `<tr><td><span class="badge ${priority.label==='Urgente'?'danger':priority.label==='Alta'?'warn':''}">${priority.label}</span>${priority.opportunity?'<small class="table-note quick-win">Solución rápida</small>':''}</td>
    <td><b>${escapeHtml(site.nombre)}</b><small class="table-note">${escapeHtml(site.amenaza||'')} · ${escapeHtml(site.origen||'Reporte territorial')}</small></td><td>${escapeHtml(displayValue('sitios','territorio',site.territorio))}</td>
    <td>${badge('nivel',site.nivel||'')}</td><td>${escapeHtml(siteActionStatus(site))}</td>
    <td>${escapeHtml(site.brechaPrincipal||'Sin brecha')}</td><td><div class="row-actions"><button class="secondary details" data-id="${escapeHtml(site.id)}">Ver ficha</button>${hasLocation?`<a class="map-link" href="https://www.google.com/maps?q=${encodeURIComponent(site.latitud)},${encodeURIComponent(site.longitud)}" target="_blank" rel="noopener">Mapa</a>`:''}<button class="secondary edit" data-id="${escapeHtml(site.id)}">Editar</button></div></td></tr>`}).join('')}</tbody></table></div>`:
   `<div class="empty">${sites.length?'No hay sitios que coincidan con los filtros.':'Aún no existen sitios reportados. Usa “Nuevo sitio”.'}</div>`;
  $('#sitePager').innerHTML=filtered.length>sitesPerPage?`<button class="secondary" data-site-page="${sitePage-1}" ${sitePage===1?'disabled':''}>← Anterior</button><span>Página ${sitePage} de ${pages}</span><button class="secondary" data-site-page="${sitePage+1}" ${sitePage===pages?'disabled':''}>Siguiente →</button>`:'';
 };
 ['siteSearch','sourceFilter','riskFilter','actionFilter','feasibilityFilter','gapFilter'].forEach(id=>$(`#${id}`).oninput=()=>{sitePage=1;paint()});
 $('.site-view-tabs').onclick=event=>{const view=event.target.closest('[data-site-view]')?.dataset.siteView;if(!view)return;document.querySelectorAll('[data-site-view]').forEach(button=>button.classList.toggle('active',button.dataset.siteView===view));$('.managed-sites').hidden=view!=='managed';$('#pendingSitesSection').hidden=view!=='pending'};
 $('#sitePager').onclick=event=>{const next=Number(event.target.closest('[data-site-page]')?.dataset.sitePage);if(next>0){sitePage=next;paint()}};
 $('#add').onclick=()=>openSiteForm(null);
 if($('#importEnos'))$('#importEnos').onclick=importEnosSites;
 $('#tableWrap').onclick=event=>{
  const site=sites.find(item=>item.id===event.target.dataset.id);
  if(event.target.classList.contains('edit'))openSiteForm(site);
  if(event.target.classList.contains('details'))openSiteDetail(site);
 };
 paint();
 bindRiskLocationInventory(locationData);
}
function riskLocationInventory(payload){
 const stats=payload.stats||{};
 return `<section class="panel location-inventory"><div class="toolbar"><div><b>Inventario de lugares mencionados en los planes</b><small class="table-note">No son todavía fichas validadas. Cada mención conserva plan, página y cantidad de información disponible.</small></div></div>
 <div class="location-summary"><span><b>${stats.byType?.Sitio||0}</b> sitios</span><span><b>${stats.byType?.Tramo||0}</b> tramos</span><span><b>${stats.byType?.Área||0}</b> áreas</span><span><b>${stats.byQuality?.Baja||0}</b> con descripción insuficiente</span></div>
 <div class="toolbar site-toolbar"><input id="locationSearch" placeholder="Buscar lugar, territorio, amenaza o plan...">
 <select id="locationType"><option value="">Sitio, tramo o área</option><option>Sitio</option><option>Tramo</option><option>Área</option></select>
 <select id="locationQuality"><option value="">Toda calidad descriptiva</option><option>Alta</option><option>Media</option><option>Baja</option></select></div>
 <div id="locationTable"></div></section>`;
}
function bindRiskLocationInventory(payload){
 const assignedUser=(data.usuarios||[]).find(user=>normalizeEmail(user.correo)===normalizeEmail(session?.email));
 let locationPage=1;const locationsPerPage=12;
 const allowedLocations=(payload.locations||[]).filter(item=>isAdmin()||!assignedUser||(normalizeEmail(item.province)===normalizeEmail(assignedUser.provincia)&&normalizeEmail(item.territory)===normalizeEmail(assignedUser.canton)));
 const locations=allowedLocations.filter(item=>pendingLocationUpdate(item).estado!=='Convertida en ficha gestionable'),paintLocations=()=>{
  const query=$('#locationSearch').value.trim().toLocaleLowerCase('es'),type=$('#locationType').value,quality=$('#locationQuality').value;
  const filtered=locations.filter(item=>(!type||item.type===type)&&(!quality||item.descriptionQuality===quality)&&(!query||`${item.name} ${item.territory} ${item.province} ${item.threat} ${item.sourcePlan}`.toLocaleLowerCase('es').includes(query)));
  const pages=Math.max(1,Math.ceil(filtered.length/locationsPerPage));locationPage=Math.min(locationPage,pages);const visible=filtered.slice((locationPage-1)*locationsPerPage,locationPage*locationsPerPage);
  $('#locationTable').innerHTML=`<div class="inventory-result decision-list-summary"><b>${filtered.length} fichas pendientes</b><small>${filtered.length?`Mostrando ${(locationPage-1)*locationsPerPage+1}–${Math.min(locationPage*locationsPerPage,filtered.length)}`:''}</small></div>${visible.length?`<div class="table-scroll compact-table"><table><thead><tr><th>Lugar / tipo</th><th>Territorio</th><th>Amenaza</th><th>Completitud</th><th>Trazabilidad</th><th></th></tr></thead><tbody>${visible.map(item=>{const progress=pendingLocationProgress(item);return `<tr>
   <td><b>${escapeHtml(item.name)}</b><small class="table-note">${escapeHtml(item.type)} · ${escapeHtml(item.validationState)}</small></td>
   <td>${escapeHtml(item.territory)} · ${escapeHtml(item.province)}</td><td>${escapeHtml(item.threat)}</td>
   <td><div class="progress"><span style="width:${progress.percent}%"></span></div><small>${progress.done} de ${progress.total} campos · ${progress.missing.length?'Falta: '+escapeHtml(progress.missing.join(', ')):'Lista para convertir'}</small></td>
   <td><small>${escapeHtml(item.sourcePlan.split('\\').pop())}<br>Página ${escapeHtml(item.sourcePage)}</small></td>
   <td><button class="secondary complete-location" data-location="${escapeHtml(item.id)}">${pendingLocationUpdate(item).estado==='En revisión técnica'?(isAdmin()?'Aprobar ficha':'En revisión técnica'):progress.complete?(isAdmin()?'Revisar y convertir':'Enviar a revisión'):'Completar ficha'}</button></td></tr>`}).join('')}</tbody></table></div><div class="decision-pager">${filtered.length>locationsPerPage?`<button class="secondary" data-location-page="${locationPage-1}" ${locationPage===1?'disabled':''}>← Anterior</button><span>Página ${locationPage} de ${pages}</span><button class="secondary" data-location-page="${locationPage+1}" ${locationPage===pages?'disabled':''}>Siguiente →</button>`:''}</div>`:'<div class="empty">No existen menciones que coincidan con los filtros.</div>'}`;
 };
 ['locationSearch','locationType','locationQuality'].forEach(id=>$(`#${id}`).oninput=()=>{locationPage=1;paintLocations()});
 $('#locationTable').onclick=event=>{const next=Number(event.target.closest('[data-location-page]')?.dataset.locationPage);if(next>0){locationPage=next;paintLocations();return}const item=locations.find(x=>x.id===event.target.dataset.location);if(!item)return;if(event.target.classList.contains('complete-location'))openPendingLocationForm(item);else openRiskLocationDetail(item)};
 paintLocations();
}
function pendingLocationUpdate(item){
 return data.validaciones.find(entry=>entry.tipo==='ficha-pendiente'&&entry.locationId===item.id)||{};
}
function pendingLocationValues(item){
 const update=pendingLocationUpdate(item);
 return {nombre:update.nombre||item.name,tipo:update.tipoUbicacion||item.type,amenaza:update.amenaza||(item.threat==='Amenaza por precisar'?'':item.threat),nivel:update.nivel||'',
  direccion:update.direccion||'',descripcion:update.descripcion||'',poblacionExpuesta:update.poblacionExpuesta??'',elementosExpuestos:update.elementosExpuestos||'',medidaNecesaria:update.medidaNecesaria||'',territorio:update.territorio||''};
}
function pendingLocationProgress(item,values=pendingLocationValues(item)){
 const requirements=[['nombre','nombre'],['territorio','territorio'],['amenaza','amenaza'],['nivel','nivel de riesgo'],['direccion','ubicación'],['descripcion','condición'],['elementosExpuestos','elementos expuestos'],['medidaNecesaria','medida necesaria']];
 const missing=requirements.filter(([key])=>!String(values[key]??'').trim()).map(([,label])=>label),done=requirements.length-missing.length;
 return {done,total:requirements.length,missing,percent:Math.round(done/requirements.length*100),complete:missing.length===0};
}
function openRiskLocationDetail(item){
 const fields=item.documentedFields||{},dialog=document.createElement('dialog');
 dialog.innerHTML=`<div class="dialog-body"><span class="eyebrow">${escapeHtml(item.type)} · mención documental</span><h3>${escapeHtml(item.name)}</h3><p>${escapeHtml(item.territory)} · ${escapeHtml(item.province)}</p>
 <div class="detail-badges"><span class="badge neutral">${escapeHtml(item.threat)}</span><span class="badge ${item.descriptionQuality==='Alta'?'success':item.descriptionQuality==='Baja'?'danger':'warn'}">Descripción ${escapeHtml(item.descriptionQuality)}</span></div>
 <section class="source-card"><h4>Lo que consta en el plan</h4><p>${escapeHtml(item.excerpt)}</p><p><b>Fuente:</b> ${escapeHtml(item.sourcePlan)} · página ${escapeHtml(item.sourcePage)}</p></section>
 <section><h4>Información encontrada</h4><div class="location-field-grid">${[['Amenaza',fields.amenaza],['Población',fields.poblacion],['Elementos expuestos',fields.elementos],['Ubicación o coordenadas',fields.ubicacion],['Medida propuesta',fields.medida]].map(([label,found])=>`<span class="${found?'found':'missing'}">${found?'✓':'Pendiente'} · ${label}</span>`).join('')}</div></section>
 <p class="review-notice"><b>Siguiente control:</b> confirmar el nombre y alcance territorial, depurar duplicados y completar en campo los datos pendientes antes de convertir esta mención en una ficha gestionable.</p>
 <div class="dialog-actions"><button class="cancel">Cerrar</button></div></div>`;
 document.body.append(dialog);bindCancel(dialog);dialog.showModal();
}
function openPendingLocationForm(item){
 const dialog=document.createElement('dialog'),values=pendingLocationValues(item);
 const territory=data.territorios.find(entry=>normalizeEmail(entry.provincia)===normalizeEmail(item.province)&&normalizeEmail(entry.canton)===normalizeEmail(item.territory));
 if(!values.territorio&&territory)values.territorio=territory.id;
 const threats=['Inundación / desbordamiento','Movimiento en masa','Socavamiento / erosión','Sequía / déficit hídrico','Sismo','Tsunami','Incendio forestal','Otro'];
 const levels=['Bajo','Medio','Alto','Muy alto'],selected=(value,current)=>value===current?'selected':'';
 const options=[...data.territorios].filter(entry=>entry.estado==='Activo'||entry.id===values.territorio).sort((a,b)=>`${a.provincia}${a.canton}`.localeCompare(`${b.provincia}${b.canton}`,'es')).map(entry=>`<option value="${escapeHtml(entry.id)}" ${selected(entry.id,values.territorio)}>${escapeHtml(entry.provincia)} · ${escapeHtml(entry.canton)}</option>`).join('');
 const examples=(data.sitios||[]).filter(site=>site.origen==='Plan ENOS').slice(0,3);
 dialog.className='site-dialog';
 dialog.innerHTML=`<form class="dialog-body pending-form"><span class="eyebrow">Ficha pendiente · ${escapeHtml(item.type)}</span><h3>Completar ${escapeHtml(item.name)}</h3>
 <div class="review-notice"><b>El plan es el punto de partida</b><span>Completa o corrige con conocimiento territorial. La ficha solo será gestionable cuando tenga los ocho campos mínimos.</span></div>
 <div class="pending-progress"><div class="progress"><span></span></div><b></b><small></small></div>
 <div class="form-grid">
  <label class="full">Nombre preciso del sitio, tramo o área<input name="nombre" value="${escapeHtml(values.nombre)}" maxlength="120"></label>
  <label>Tipo<select name="tipoUbicacion"><option ${selected('Sitio',values.tipo)}>Sitio</option><option ${selected('Tramo',values.tipo)}>Tramo</option><option ${selected('Área',values.tipo)}>Área</option></select></label>
  <label>Territorio<select name="territorio"><option value="">Selecciona</option>${options}</select></label>
  <label>Amenaza<select name="amenaza"><option value="">Por precisar</option>${threats.map(value=>`<option ${selected(value,values.amenaza)}>${value}</option>`).join('')}</select></label>
  <label>Nivel de riesgo<select name="nivel"><option value="">Por evaluar</option>${levels.map(value=>`<option ${selected(value,values.nivel)}>${value}</option>`).join('')}</select></label>
  <label class="full">Ubicación, tramo, límites o referencia<input name="direccion" value="${escapeHtml(values.direccion)}" maxlength="220" placeholder="Indica cómo llegar o delimitar el área"></label>
  <label class="full">Condición de riesgo observada<textarea name="descripcion" rows="3" maxlength="1000">${escapeHtml(values.descripcion)}</textarea></label>
  <label>Población expuesta, si está disponible<input name="poblacionExpuesta" type="number" min="0" value="${escapeHtml(values.poblacionExpuesta)}" placeholder="Puede completarse después"></label>
  <label>Elementos expuestos<input name="elementosExpuestos" value="${escapeHtml(values.elementosExpuestos)}" maxlength="300" placeholder="Viviendas, vías, escuela, cultivos..."></label>
  <label class="full">Medida necesaria para reducir el riesgo<textarea name="medidaNecesaria" rows="3" maxlength="1000">${escapeHtml(values.medidaNecesaria)}</textarea></label>
 </div>
 <details class="pending-source"><summary>Ver evidencia del plan y fichas de referencia</summary><p>${escapeHtml(item.excerpt)}</p><small>${escapeHtml(item.sourcePlan)} · página ${escapeHtml(item.sourcePage)}</small>
 ${examples.length?`<div class="example-sites">${examples.map(site=>`<span><b>${escapeHtml(site.nombre)}</b><small>${escapeHtml(site.amenaza)} · ${escapeHtml(site.elementosExpuestos||'Sin elementos')}</small></span>`).join('')}</div>`:''}</details>
 <div class="dialog-actions"><button type="button" class="secondary cancel">Cancelar</button><button type="submit" name="intent" value="save" class="secondary">Guardar avance</button><button type="submit" name="intent" value="convert" class="convert-pending">${isAdmin()?'Aprobar y convertir':'Enviar a revisión técnica'}</button></div></form>`;
 document.body.append(dialog);dialog.showModal();bindCancel(dialog);
 const form=dialog.querySelector('form'),convert=form.querySelector('.convert-pending'),refresh=()=>{
  const currentValues=Object.fromEntries(new FormData(form)),progress=pendingLocationProgress(item,currentValues);
  form.querySelector('.pending-progress span').style.width=`${progress.percent}%`;form.querySelector('.pending-progress b').textContent=`${progress.percent}% completa`;
  form.querySelector('.pending-progress small').textContent=progress.missing.length?`Falta: ${progress.missing.join(', ')}`:'Cumple los campos mínimos para convertirse en ficha gestionable.';
  convert.disabled=!progress.complete;
 };
 form.oninput=refresh;refresh();
 form.onsubmit=event=>{
  event.preventDefault();const submitted=Object.fromEntries(new FormData(form)),intent=event.submitter?.value||'save';
  const record={tipo:'ficha-pendiente',locationId:item.id,...submitted,actualizadoEn:new Date().toISOString(),actualizadoPor:session?.email||'',fuentePlan:item.sourcePlan,fuentePagina:item.sourcePage};
  delete record.intent;const existing=pendingLocationUpdate(item);if(existing.locationId)Object.assign(existing,record);else data.validaciones.push(record);
  if(intent==='convert'){
   const progress=pendingLocationProgress(item,submitted);if(!progress.complete)return refresh();
   if(!isAdmin()){record.estado='En revisión técnica';auditChange('ENVIAR_REVISION','ficha-pendiente',item.id,submitted.nombre);save();dialog.close();dialog.remove();render();return}
   if(data.sitios.some(site=>site.fichaPendienteId===item.id))return alert('Esta ficha pendiente ya fue convertida.');
   const normalizedPendingName=submitted.nombre.trim().toLocaleLowerCase('es');
   const duplicate=data.sitios.find(site=>site.territorio===submitted.territorio&&(String(site.nombre).trim().toLocaleLowerCase('es')===normalizedPendingName||
    String(site.nombre).trim().toLocaleLowerCase('es').includes(normalizedPendingName)||normalizedPendingName.includes(String(site.nombre).trim().toLocaleLowerCase('es'))));
   if(duplicate){record.estado='Posible duplicado';record.posibleDuplicadoId=duplicate.id;save();dialog.querySelector('.review-notice span').textContent=`Posible duplicado de “${duplicate.nombre}”. Revisa y fusiona la información antes de convertir.`;return}
   data.sitios.push({id:crypto.randomUUID(),nombre:submitted.nombre,territorio:submitted.territorio,tipoUbicacion:submitted.tipoUbicacion,amenaza:submitted.amenaza,nivel:submitted.nivel,direccion:submitted.direccion,
    descripcion:submitted.descripcion,poblacionExpuesta:Number(submitted.poblacionExpuesta||0),elementosExpuestos:submitted.elementosExpuestos,medidaNecesaria:submitted.medidaNecesaria,estado:'Identificado',
    facilidadSolucion:'Por evaluar',brechaPrincipal:'Por determinar',brechas:'Pendiente de evaluación técnica y vinculación de acciones.',fechaRegistro:new Date().toISOString().slice(0,10),origen:'Plan ENOS',
    fuentePlan:item.sourcePlan,fuentePagina:item.sourcePage,fichaPendienteId:item.id,creadoEn:new Date().toISOString(),creadoPor:session?.email||''});
   record.estado='Convertida en ficha gestionable';
   auditChange('APROBAR_CONVERTIR','sitio',item.id,submitted.nombre);
  }
  if(intent==='save')auditChange('GUARDAR_AVANCE','ficha-pendiente',item.id,submitted.nombre);
  save();dialog.close();dialog.remove();render();
 };
}
function importEnosSites(){
 const incoming=window.ENOS_IMPORT?.sites||[];
 const existing=new Set((data.sitios||[]).map(site=>site.id));
 const additions=incoming.filter(site=>!existing.has(site.id)).map(site=>({...site,creadoEn:new Date().toISOString(),creadoPor:session?.email||''}));
 if(!additions.length)return alert('Los registros reales del paquete ENOS ya están cargados.');
 data.sitios.push(...additions);save();render();
 alert(`Se importaron ${additions.length} sitios reales con trazabilidad al plan de origen. Permanecen pendientes de validación territorial.`);
}
function openSiteDetail(site){
 if(!site)return;
 const dialog=document.createElement('dialog'),priority=sitePriority(site),actions=linkedActions(site.id);
 const territory=displayValue('sitios','territorio',site.territorio);
 const coordinates=site.latitud!==''&&site.latitud!=null&&site.longitud!==''&&site.longitud!=null;
 const actionRows=actions.length?actions.map(action=>`<tr><td>${escapeHtml(action.accion)}</td><td>${escapeHtml(action.responsable)}</td><td>${escapeHtml(action.fechaLimite)}</td><td>${escapeHtml(action.avance||0)}%</td><td>${escapeHtml(action.estado)}</td></tr>`).join(''):
  '<tr><td colspan="5" class="muted">Este sitio todavía no tiene acciones registradas.</td></tr>';
 dialog.className='detail-dialog';
 dialog.innerHTML=`<div class="dialog-body site-detail">
  <div class="detail-heading"><div><span class="eyebrow">${escapeHtml(territory)}</span><h3>${escapeHtml(site.nombre)}</h3><p class="muted">${escapeHtml(site.amenaza||'Amenaza no definida')} · Identificado el ${escapeHtml(site.fechaRegistro||'sin fecha')}</p></div>
   <button type="button" class="icon-button cancel" aria-label="Cerrar ficha">×</button></div>
  <div class="detail-badges"><span class="badge ${priority.label==='Urgente'?'danger':priority.label==='Alta'?'warn':''}">Prioridad ${priority.label}</span>${badge('nivel',site.nivel||'Sin nivel')}<span class="badge neutral">${escapeHtml(siteActionStatus(site))}</span>${priority.opportunity?'<span class="badge quick">Oportunidad de solución rápida</span>':''}</div>
  <div class="detail-grid">
   <section><h4>Condición reportada</h4><p>${escapeHtml(site.descripcion||'No se ha registrado una descripción.')}</p><dl><dt>Dirección o referencia</dt><dd>${escapeHtml(site.direccion||'No registrada')}</dd><dt>Estado del sitio</dt><dd>${escapeHtml(site.estado||'No definido')}</dd><dt>Población expuesta</dt><dd>${escapeHtml(site.poblacionExpuesta??'No registrada')}</dd><dt>Elementos expuestos</dt><dd>${escapeHtml(site.elementosExpuestos||'No registrados')}</dd></dl></section>
   <section><h4>Brecha y mitigación</h4><p><b>${escapeHtml(site.brechaPrincipal||'Sin brecha')}</b></p><p>${escapeHtml(site.brechas||'No se ha detallado la brecha.')}</p><dl><dt>Medida necesaria</dt><dd>${escapeHtml(site.medidaNecesaria||'Pendiente de definir o vincular desde el plan de acciones')}</dd><dt>Facilidad de solución</dt><dd>${escapeHtml(site.facilidadSolucion||'No definida')}</dd></dl></section>
  </div>
  ${site.fuentePlan?`<section class="source-card"><h4>Trazabilidad documental</h4><p><b>Dato real extraído del plan</b> · ${escapeHtml(site.fuentePlan)}</p><p>Página ${escapeHtml(site.fuentePagina)} · Prioridad reportada: ${escapeHtml(site.prioridadPlan||'No indicada')}</p><p><span class="badge neutral">${escapeHtml(site.estado||'Pendiente de validación territorial')}</span></p></section>`:''}
  <section class="context-technical"><div class="detail-actions-heading"><h4>Información técnico-científica relacionada</h4><small>Contraste contextual; no sustituye la verificación del sitio.</small></div>${technicalFicheCards(relevantTechnicalFiches({siteId:site.id,province:territory.split(' · ')[1]||'',territory:territory.split(' · ')[0]||'',threat:site.amenaza}),{siteId:site.id})}</section>
  ${coordinates?`<a class="location-card" href="https://www.google.com/maps?q=${encodeURIComponent(site.latitud)},${encodeURIComponent(site.longitud)}" target="_blank" rel="noopener">Ver ubicación en el mapa <small>${escapeHtml(site.latitud)}, ${escapeHtml(site.longitud)}</small></a>`:''}
  <div class="detail-actions-heading"><h4>Acciones vinculadas (${actions.length})</h4><button type="button" class="new-action">Nueva acción</button></div>
  <div class="table-scroll"><table><thead><tr><th>Acción</th><th>Responsable</th><th>Plazo</th><th>Avance</th><th>Estado</th></tr></thead><tbody>${actionRows}</tbody></table></div>
  <div class="dialog-actions"><button type="button" class="secondary edit-site">Editar ficha</button><button type="button" class="secondary cancel-bottom">Cerrar</button></div>
 </div>`;
 document.body.append(dialog);dialog.showModal();
 const close=()=>{dialog.close();dialog.remove()};
 dialog.querySelector('.cancel').onclick=close;dialog.querySelector('.cancel-bottom').onclick=close;
 dialog.querySelector('.edit-site').onclick=()=>{close();openSiteForm(site)};
 dialog.querySelector('.new-action').onclick=()=>{close();openActionForm(null,site.id)};
 dialog.addEventListener('cancel',()=>dialog.remove());
}
function actionsPage(){
 const actions=data.acciones||[];
 const layers=data.capasGeograficas||[];
 const backlog=(data.sitios||[]).filter(site=>!linkedActions(site.id).length).sort((a,b)=>sitePriority(b).score-sitePriority(a).score);
 const pending=actions.filter(action=>action.estado!=='Completada').length;
 const overdue=actions.filter(action=>action.estado!=='Completada'&&action.fechaLimite&&action.fechaLimite<new Date().toISOString().slice(0,10)).length;
 const blocked=actions.filter(action=>action.estado==='Detenida').length;
 const average=actions.length?Math.round(actions.reduce((sum,action)=>sum+Number(action.avance||0),0)/actions.length):0;
 const geoSection=layers.length?`<section class="panel action-map-panel"><div class="toolbar"><div><b>Evidencia territorial de ejecución</b><small class="table-note">Compara el área comprometida con lo ejecutado. El color representa el estado de la acción, no el nivel de riesgo.</small></div><button id="uploadKmz">Añadir evidencia KMZ</button></div>
 <div class="map-toolbar"><select id="mapTerritoryFilter"><option value="">Todos los territorios</option>${[...data.territorios].sort((a,b)=>a.canton.localeCompare(b.canton,'es')).map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.provincia)} · ${escapeHtml(item.canton)}</option>`).join('')}</select><select id="mapStateFilter"><option value="">Todos los estados</option><option value="red">Vencida o detenida</option><option value="yellow">Planificada o en ejecución</option><option value="green">Completada con evidencia</option></select><select id="mapSourceFilter"><option value="">Todas las fuentes</option><option value="F03">F03</option><option value="Levantamiento territorial">Levantamiento territorial</option><option value="Otra fuente">Otra fuente</option></select><span id="mapFeatureCount"></span></div>
 <div id="actionMap" aria-label="Mapa de evidencia territorial de acciones"></div></section>`:
 `<section class="panel geo-readiness"><div><span class="eyebrow">Función opcional</span><h3>Evidencia territorial de ejecución</h3><p>${actions.length?'Todavía ninguna acción tiene una geometría vinculada. Añádela únicamente cuando necesites comprobar cobertura, tramos intervenidos, zonas pendientes o puntos atendidos.':'Primero formaliza una acción. El mapa se habilitará cuando exista una intervención que realmente necesite seguimiento espacial.'}</p></div><ol><li>Formaliza la acción y su resultado esperado.</li><li>Define si el cumplimiento necesita verificarse por punto, tramo o área.</li><li>Carga KML/KMZ solo cuando aporte evidencia a la decisión.</li></ol>${actions.length?'<button id="uploadKmz">Añadir primera evidencia KMZ</button>':''}</section>`;
 $('#content').innerHTML=`<div class="action-lead"><div><span class="eyebrow">Centro de ejecución territorial</span><h3>¿Qué riesgo debe convertirse en acción y qué impide cerrarlo?</h3><p>Separa necesidades documentadas, compromisos formalizados, ejecución y evidencia. Cada acción parte de una ficha real.</p></div><div class="action-lead-buttons"><button id="exportActionsWord" class="secondary">Descargar informe Word</button><button id="add">Crear acción desde una ficha</button></div></div>
 <div class="action-flow">
  <button data-action-view="backlog"><small>1 · Necesidad documentada</small><strong>${backlog.length}</strong><span>fichas sin medida formalizada</span></button><i>→</i>
  <button data-action-view="tracking"><small>2 · Acción asignada</small><strong>${pending}</strong><span>compromisos pendientes</span></button><i>→</i>
  <button data-action-view="tracking"><small>3 · Ejecución crítica</small><strong>${overdue+blocked}</strong><span>${overdue} vencidas · ${blocked} detenidas</span></button><i>→</i>
  <button data-action-view="tracking"><small>4 · Cierre verificable</small><strong>${actions.filter(x=>x.estado==='Completada'&&x.evidencia).length}</strong><span>acciones cerradas con evidencia</span></button>
 </div>
 <div class="cards action-cards">
  <div class="card"><span>Acciones formalizadas</span><strong>${actions.length}</strong><small>${backlog.length} fichas todavía deben convertirse</small></div>
  <div class="card"><span>Avance promedio</span><strong>${average}%</strong><small>Solo sobre acciones registradas</small></div>
  <div class="card"><span>Sin control oportuno</span><strong>${overdue+blocked}</strong><small>Vencidas o detenidas</small></div>
  <div class="card"><span>Evidencia geográfica</span><strong>${layers.length}</strong><small>KMZ/KML vinculados</small></div>
 </div>
 <section class="panel action-portfolio"><div class="toolbar"><div><b>Cartera de intervención</b><small class="table-note">Prioriza la brecha, formaliza el compromiso y controla su cierre.</small></div><div class="action-tabs"><button class="secondary active" data-action-view="backlog">Por convertir (${backlog.length})</button><button class="secondary" data-action-view="tracking">En seguimiento (${actions.length})</button></div></div><div id="actionPortfolio"></div></section>
 ${geoSection}`;
 let actionView='backlog',actionPage=1;const actionsPerPage=10;
 const paintPortfolio=()=>{
  document.querySelectorAll('[data-action-view]').forEach(button=>button.classList.toggle('active',button.dataset.actionView===actionView));
  if(actionView==='backlog'){
   const pages=Math.max(1,Math.ceil(backlog.length/actionsPerPage));actionPage=Math.min(actionPage,pages);const visible=backlog.slice((actionPage-1)*actionsPerPage,actionPage*actionsPerPage);
   $('#actionPortfolio').innerHTML=backlog.length?`<div class="decision-list-summary"><b>${backlog.length} fichas por convertir</b><span>Mostrando ${(actionPage-1)*actionsPerPage+1}–${Math.min(actionPage*actionsPerPage,backlog.length)}</span></div><div class="action-backlog compact-action-list">${visible.map(site=>{const priority=sitePriority(site),territory=displayValue('sitios','territorio',site.territorio);return `<article><div><span class="badge ${priority.label==='Urgente'?'danger':priority.label==='Alta'?'warn':'neutral'}">${escapeHtml(priority.label)}</span><small>${escapeHtml(territory)}</small><h4>${escapeHtml(site.nombre)}</h4><p>${escapeHtml(site.medidaNecesaria||site.brechas||'La ficha aún no define una medida concreta.')}</p></div><dl><dt>Riesgo / amenaza</dt><dd>${escapeHtml(site.nivel||'Por calificar')} · ${escapeHtml(site.amenaza||'Por definir')}</dd><dt>Brecha / exposición</dt><dd>${escapeHtml(site.brechaPrincipal||'Por determinar')} · ${Number(site.poblacionExpuesta||0).toLocaleString('es-EC')} personas</dd></dl><button class="create-from-site" data-id="${escapeHtml(site.id)}">Formalizar acción</button></article>`}).join('')}</div><div class="decision-pager">${backlog.length>actionsPerPage?`<button class="secondary" data-action-page="${actionPage-1}" ${actionPage===1?'disabled':''}>← Anterior</button><span>Página ${actionPage} de ${pages}</span><button class="secondary" data-action-page="${actionPage+1}" ${actionPage===pages?'disabled':''}>Siguiente →</button>`:''}</div>`:'<div class="empty"><b>No quedan fichas gestionables sin acción.</b><p>Revisa vencimientos, bloqueos y evidencia de cierre.</p></div>';
   return;
  }
  $('#actionPortfolio').innerHTML=`<div class="toolbar site-toolbar"><input id="actionSearch" placeholder="Buscar acción, sitio o responsable..."><select id="actionStateFilter"><option value="">Todos los estados</option>${['Planificada','En ejecución','Detenida','Completada'].map(value=>`<option>${value}</option>`).join('')}</select></div><div id="tableWrap"></div>`;
  const paint=()=>{const query=$('#actionSearch').value.trim().toLocaleLowerCase('es'),state=$('#actionStateFilter').value;const filtered=actions.filter(action=>{const site=data.sitios.find(item=>item.id===action.sitioId);return (!state||action.estado===state)&&(!query||`${action.accion} ${action.responsable} ${site?.nombre||''}`.toLocaleLowerCase('es').includes(query))}).sort((a,b)=>(a.fechaLimite||'9999').localeCompare(b.fechaLimite||'9999'));const pages=Math.max(1,Math.ceil(filtered.length/actionsPerPage));actionPage=Math.min(actionPage,pages);const visible=filtered.slice((actionPage-1)*actionsPerPage,actionPage*actionsPerPage);
   $('#tableWrap').innerHTML=filtered.length?`<div class="decision-list-summary"><b>${filtered.length} acciones en seguimiento</b><span>Mostrando ${(actionPage-1)*actionsPerPage+1}–${Math.min(actionPage*actionsPerPage,filtered.length)}</span></div><div class="table-scroll compact-table"><table><thead><tr><th>Acción / sitio</th><th>Responsable</th><th>Plazo</th><th>Avance</th><th>Estado</th><th></th></tr></thead><tbody>${visible.map(action=>{const site=data.sitios.find(item=>item.id===action.sitioId),isOverdue=action.estado!=='Completada'&&action.fechaLimite&&action.fechaLimite<new Date().toISOString().slice(0,10);return `<tr><td><b>${escapeHtml(action.accion)}</b><small class="table-note">${escapeHtml(site?.nombre||'Sitio no disponible')} · ${escapeHtml(action.producto||'Producto por definir')}</small></td><td>${escapeHtml(action.responsable)}</td><td>${escapeHtml(action.fechaLimite||'Sin plazo')}${isOverdue?'<small class="table-note danger-text">Vencida</small>':''}</td><td><div class="progress"><span style="width:${Math.min(100,Math.max(0,Number(action.avance)||0))}%"></span></div><small>${escapeHtml(action.avance||0)}%</small></td><td>${badge('estado',action.estado)}</td><td><button class="secondary edit" data-id="${escapeHtml(action.id)}">Editar</button></td></tr>`}).join('')}</tbody></table></div><div class="decision-pager">${filtered.length>actionsPerPage?`<button class="secondary" data-action-page="${actionPage-1}" ${actionPage===1?'disabled':''}>← Anterior</button><span>Página ${actionPage} de ${pages}</span><button class="secondary" data-action-page="${actionPage+1}" ${actionPage===pages?'disabled':''}>Siguiente →</button>`:''}</div>`:'<div class="empty"><b>Aún no existen compromisos formalizados.</b><p>Abre “Por convertir” y transforma una ficha real en una acción controlable.</p></div>';
  };$('#actionSearch').oninput=()=>{actionPage=1;paint()};$('#actionStateFilter').oninput=()=>{actionPage=1;paint()};$('#tableWrap').onclick=event=>{const next=Number(event.target.closest('[data-action-page]')?.dataset.actionPage);if(next>0){actionPage=next;paint();return}if(event.target.classList.contains('edit'))openActionForm(actions.find(action=>action.id===event.target.dataset.id))};paint();
 };
 $('#content').onclick=event=>{const view=event.target.closest('[data-action-view]')?.dataset.actionView,siteId=event.target.closest('.create-from-site')?.dataset.id,next=Number(event.target.closest('[data-action-page]')?.dataset.actionPage);if(next>0){actionPage=next;paintPortfolio()}else if(view){actionView=view;actionPage=1;paintPortfolio()}else if(siteId)openActionForm(null,siteId)};
 $('#add').onclick=()=>openActionForm(null,backlog[0]?.id||'');
 $('#exportActionsWord').onclick=exportActionsWord;
 if($('#uploadKmz'))$('#uploadKmz').onclick=()=>openKmzUpload();
 if(layers.length){$('#mapTerritoryFilter').oninput=paintActionMap;$('#mapStateFilter').oninput=paintActionMap;$('#mapSourceFilter').oninput=paintActionMap}
 paintPortfolio();if(layers.length)setTimeout(paintActionMap,0);
}
async function exportActionsWord(){
 if(typeof JSZip==='undefined')return alert('No fue posible iniciar el generador Word. Actualiza la página.');
 const actions=data.acciones||[],sites=data.sitios||[],layers=data.capasGeograficas||[],now=new Date(),stamp=now.toISOString().replace(/\D/g,'').slice(0,14),reportCode=`SR-ACT-${stamp}`,generatedAt=now.toLocaleString('es-EC',{dateStyle:'long',timeStyle:'short'});
 const xml=value=>String(value??'').replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]));
 const p=(value,style='Normal')=>`<w:p><w:pPr><w:pStyle w:val="${style}"/></w:pPr><w:r><w:t xml:space="preserve">${xml(value)}</w:t></w:r></w:p>`;
 const field=(label,value)=>`<w:tr><w:tc><w:tcPr><w:tcW w:w="2800" w:type="dxa"/><w:shd w:fill="EAF2F8"/></w:tcPr>${p(label,'Label')}</w:tc><w:tc><w:tcPr><w:tcW w:w="6500" w:type="dxa"/></w:tcPr>${p(value||'No registrado')}</w:tc></w:tr>`;
 const table=rows=>`<w:tbl><w:tblPr><w:tblW w:w="9300" w:type="dxa"/><w:tblBorders><w:top w:val="single" w:sz="4" w:color="B8C4CE"/><w:left w:val="single" w:sz="4" w:color="B8C4CE"/><w:bottom w:val="single" w:sz="4" w:color="B8C4CE"/><w:right w:val="single" w:sz="4" w:color="B8C4CE"/><w:insideH w:val="single" w:sz="4" w:color="D9E1E8"/><w:insideV w:val="single" w:sz="4" w:color="D9E1E8"/></w:tblBorders></w:tblPr>${rows}</w:tbl>`;
 const overdue=actions.filter(action=>action.estado!=='Completada'&&action.fechaLimite&&action.fechaLimite<now.toISOString().slice(0,10)).length,completed=actions.filter(action=>action.estado==='Completada').length,average=actions.length?Math.round(actions.reduce((sum,item)=>sum+Number(item.avance||0),0)/actions.length):0;
 const summary=table(field('Acciones formalizadas',actions.length)+field('Pendientes',actions.length-completed)+field('Vencidas',overdue)+field('Completadas',completed)+field('Avance promedio',`${average}%`)+field('Capas geográficas vinculadas',layers.length)+field('Fichas técnico-científicas disponibles',(data.fichasTecnicas||[]).length));
 const sections=actions.length?actions.map((action,index)=>{
  const site=sites.find(item=>item.id===action.sitioId),territory=site?displayValue('sitios','territorio',site.territorio):'No vinculado',actionLayers=layers.filter(item=>item.accionId===action.id),isOverdue=action.estado!=='Completada'&&action.fechaLimite&&action.fechaLimite<now.toISOString().slice(0,10);
  const audit=(data.auditoria||[]).filter(item=>item.entity==='accion'&&item.recordId===action.id).slice(-8).map(item=>`${item.at||''} · ${item.action||''} · ${item.by||''}`).join('\n');
  const technicalSources=relevantTechnicalFiches({actionId:action.id,siteId:site?.id,province:territory.split(' · ')[1]||'',territory:territory.split(' · ')[0]||'',threat:site?.amenaza});
  const technicalText=technicalSources.map(fiche=>`${fiche.institucion} ${fiche.numero}: ${fiche.titulo}. ${fiche.resumen} Fuente: ${fiche.fuenteDocumento}. Uso registrado: ${fiche.estado}.`).join('\n\n');
  return `${index?'<w:p><w:r><w:br w:type="page"/></w:r></w:p>':''}${p(`Seguimiento ${index+1}: ${action.accion}`,'Heading1')}${p(`${action.estado||'Sin estado'} · ${action.avance||0}%${isOverdue?' · PLAZO VENCIDO':''}`,'Status')}
  ${table(field('Sitio crítico',site?.nombre)+field('Territorio',territory)+field('Amenaza / riesgo',site?`${site.amenaza||'No indicada'} · ${site.nivel||'Por calificar'}`:'No registrado')+field('Responsable',action.responsable)+field('Mesa, grupo o institución de apoyo',action.dependencia)+field('Objetivo verificable',action.objetivo)+field('Fecha de inicio',action.fechaInicio)+field('Fecha límite',action.fechaLimite)+field('Estado',action.estado)+field('Avance',`${action.avance||0}%`)+field('Costo estimado',action.costoEstimado!==''&&action.costoEstimado!=null?`USD ${Number(action.costoEstimado).toLocaleString('es-EC')}`:'No registrado')+field('Producto esperado',action.producto)+field('Indicador',action.indicador)+field('Criterio de cierre',action.criterioCierre)+field('Evidencia de ejecución',action.evidencia)+field('Observaciones',action.observaciones)+field('Evidencia geográfica',actionLayers.length?`${actionLayers.length} capa(s): ${actionLayers.map(item=>item.nombre).join(', ')}`:'Sin capa geográfica vinculada')+field('Última actualización',action.actualizadoEn?new Date(action.actualizadoEn).toLocaleString('es-EC'):'No registrada'))}
  ${p('Información técnico-científica considerada','Heading2')}${p(technicalText||'No se vinculó información técnico-científica a esta acción.')}
  ${audit?`${p('Trazabilidad de cambios','Heading2')}${p(audit)}`:''}`;
 }).join(''):p('No existen acciones formalizadas al momento de generar este informe. Las fichas pendientes deben convertirse en acciones con responsable, plazo y resultado esperado.','Notice');
 const document=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:document xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:body>${p('INFORME DE SEGUIMIENTO DE ACCIONES','Title')}${p('SmartRisk CZ5 · Gestión integral del riesgo','Subtitle')}${table(field('Código del informe',reportCode)+field('Fecha de generación',generatedAt)+field('Generado por',session?.email||'Usuario no identificado')+field('Ámbito','Coordinación Zonal 5'))}${p('Resumen ejecutivo','Heading1')}${summary}${p('Criterio de verificabilidad','Heading2')}${p('El informe reproduce el estado registrado en SmartRisk al momento de la descarga. Una acción solo se considera cerrada cuando alcanza 100% y conserva evidencia verificable. La validación institucional corresponde al responsable competente.')}${p('Detalle de seguimientos','Heading1')}${sections}<w:sectPr><w:pgSz w:w="11906" w:h="16838"/><w:pgMar w:top="1134" w:right="1134" w:bottom="1134" w:left="1134"/></w:sectPr></w:body></w:document>`;
 const styles=`<?xml version="1.0" encoding="UTF-8" standalone="yes"?><w:styles xmlns:w="http://schemas.openxmlformats.org/wordprocessingml/2006/main"><w:style w:type="paragraph" w:default="1" w:styleId="Normal"><w:name w:val="Normal"/><w:rPr><w:rFonts w:ascii="Aptos" w:hAnsi="Aptos"/><w:sz w:val="20"/></w:rPr><w:pPr><w:spacing w:after="100"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Title"><w:name w:val="Title"/><w:rPr><w:b/><w:color w:val="102C3B"/><w:sz w:val="36"/></w:rPr><w:pPr><w:spacing w:after="80"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Subtitle"><w:name w:val="Subtitle"/><w:rPr><w:color w:val="2563EB"/><w:sz w:val="24"/></w:rPr><w:pPr><w:spacing w:after="220"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading1"><w:name w:val="Heading 1"/><w:rPr><w:b/><w:color w:val="102C3B"/><w:sz w:val="28"/></w:rPr><w:pPr><w:spacing w:before="220" w:after="100"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Heading2"><w:name w:val="Heading 2"/><w:rPr><w:b/><w:color w:val="2563EB"/><w:sz w:val="23"/></w:rPr><w:pPr><w:spacing w:before="160" w:after="80"/></w:pPr></w:style><w:style w:type="paragraph" w:styleId="Label"><w:name w:val="Label"/><w:rPr><w:b/><w:color w:val="102C3B"/><w:sz w:val="19"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Status"><w:name w:val="Status"/><w:rPr><w:b/><w:color w:val="B42318"/><w:sz w:val="22"/></w:rPr></w:style><w:style w:type="paragraph" w:styleId="Notice"><w:name w:val="Notice"/><w:rPr><w:i/><w:color w:val="64748B"/><w:sz w:val="21"/></w:rPr></w:style></w:styles>`;
 const zip=new JSZip();zip.file('[Content_Types].xml','<?xml version="1.0" encoding="UTF-8"?><Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types"><Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/><Default Extension="xml" ContentType="application/xml"/><Override PartName="/word/document.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.document.main+xml"/><Override PartName="/word/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.wordprocessingml.styles+xml"/></Types>');zip.folder('_rels').file('.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="word/document.xml"/></Relationships>');const word=zip.folder('word');word.file('document.xml',document);word.file('styles.xml',styles);word.folder('_rels').file('document.xml.rels','<?xml version="1.0" encoding="UTF-8"?><Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships"><Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/></Relationships>');
 const blob=await zip.generateAsync({type:'blob',mimeType:'application/vnd.openxmlformats-officedocument.wordprocessingml.document',compression:'DEFLATE'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`Informe_seguimiento_acciones_${reportCode}.docx`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);auditChange('DESCARGAR_INFORME','acciones',reportCode,`${actions.length} acciones · ${generatedAt}`);save();
}
function actionSemaphore(action){
 const today=new Date().toISOString().slice(0,10);
 if(!action||action.estado==='Detenida'||(action.estado!=='Completada'&&action.fechaLimite&&action.fechaLimite<today))return 'red';
 if(action.estado==='Completada'&&action.evidencia)return 'green';
 return 'yellow';
}
function paintActionMap(){
 const container=$('#actionMap');if(!container)return;if(typeof L==='undefined'){container.innerHTML='<div class="empty">No fue posible iniciar el mapa. Actualiza la página o revisa la conexión.</div>';return}
 if(activeActionMap){activeActionMap.remove();activeActionMap=null;activeActionGeoLayer=null}
 activeActionMap=L.map(container).setView([-1.55,-79.2],7);
 L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'&copy; OpenStreetMap'}).addTo(activeActionMap);
 const territory=$('#mapTerritoryFilter')?.value||'',state=$('#mapStateFilter')?.value||'',source=$('#mapSourceFilter')?.value||'',features=[];
 (data.capasGeograficas||[]).forEach(layer=>{
  const action=data.acciones.find(item=>item.id===layer.accionId),colorState=actionSemaphore(action);
  if((territory&&layer.territorio!==territory)||(state&&colorState!==state)||(source&&layer.origenDatos!==source))return;
  const site=data.sitios.find(item=>item.id===action?.sitioId),territoryName=site?displayValue('sitios','territorio',site.territorio):'Territorio no disponible';
  (layer.features||[]).forEach(feature=>features.push({...feature,properties:{...(feature.properties||{}),layerId:layer.id,actionId:action?.id||'',actionName:action?.accion||'Acción no disponible',responsable:action?.responsable||'',estado:action?.estado||'',avance:action?.avance||0,territoryName,sourceName:layer.nombre,origenDatos:layer.origenDatos||'Otra fuente',codigoF03:layer.codigoF03||'',fechaCorte:layer.fechaCorte||'',amenaza:layer.amenaza||'',estadoValidacion:layer.estadoValidacion||'Pendiente',institucionFuente:layer.institucionFuente||layer.fuente||'',colorState}}));
 });
 const colors={red:'#dc2626',yellow:'#f59e0b',green:'#16a34a'};
 activeActionGeoLayer=L.geoJSON({type:'FeatureCollection',features},{style:feature=>({color:colors[feature.properties.colorState],weight:5,fillColor:colors[feature.properties.colorState],fillOpacity:.38}),
  pointToLayer:(feature,latlng)=>L.circleMarker(latlng,{radius:9,color:'#fff',weight:2,fillColor:colors[feature.properties.colorState],fillOpacity:1}),
  onEachFeature:(feature,layer)=>{const p=feature.properties;layer.bindPopup(`<b>${escapeHtml(p.actionName)}</b><br>${escapeHtml(p.name||p.sourceName)}<br><small>${escapeHtml(p.territoryName)} · ${escapeHtml(p.responsable)}</small><br><span>${escapeHtml(p.estado)} · ${escapeHtml(p.avance)}%</span><hr><small><b>Origen:</b> ${escapeHtml(p.origenDatos)}${p.codigoF03?` · F03 ${escapeHtml(p.codigoF03)}`:''}<br><b>Amenaza:</b> ${escapeHtml(p.amenaza||'No indicada')}<br><b>Corte:</b> ${escapeHtml(p.fechaCorte||'Sin fecha')} · <b>Validación:</b> ${escapeHtml(p.estadoValidacion)}<br><b>Fuente:</b> ${escapeHtml(p.institucionFuente||'No indicada')}</small>`)}
 }).addTo(activeActionMap);
 if(features.length){const bounds=activeActionGeoLayer.getBounds();if(bounds.isValid())activeActionMap.fitBounds(bounds,{padding:[25,25],maxZoom:16})}
 $('#mapFeatureCount').textContent=`${features.length} elementos geográficos visibles`;
 setTimeout(()=>activeActionMap?.invalidateSize(),80);
}
function parseCoordinateText(value){
 const points=String(value||'').trim().split(/\s+/).map(item=>item.split(',').slice(0,2).map(Number)).filter(pair=>pair.length===2&&pair.every(Number.isFinite));
 if(points.length<=1200)return points;
 const step=Math.ceil(points.length/1200);return points.filter((_,index)=>index%step===0||index===points.length-1);
}
function parseKmlFeatures(kmlText){
 const xml=new DOMParser().parseFromString(kmlText,'application/xml');
 if(xml.querySelector('parsererror'))throw new Error('El archivo KML contenido en el KMZ no es válido.');
 const features=[];
 [...xml.getElementsByTagName('Placemark')].slice(0,400).forEach((placemark,index)=>{
 const name=placemark.getElementsByTagName('name')[0]?.textContent?.trim()||`Elemento ${index+1}`;
  const metadata={};
  [...placemark.querySelectorAll('ExtendedData Data, ExtendedData SimpleData')].slice(0,40).forEach(node=>{
   const key=(node.getAttribute('name')||'').trim().slice(0,80);
   const value=(node.getElementsByTagName('value')[0]?.textContent||node.textContent||'').trim().slice(0,500);
   if(key&&value)metadata[key]=value;
  });
  const geometries=[];
  [...placemark.getElementsByTagName('Point')].forEach(node=>{const point=parseCoordinateText(node.getElementsByTagName('coordinates')[0]?.textContent)[0];if(point)geometries.push({type:'Point',coordinates:point})});
  [...placemark.getElementsByTagName('LineString')].forEach(node=>{const coordinates=parseCoordinateText(node.getElementsByTagName('coordinates')[0]?.textContent);if(coordinates.length>1)geometries.push({type:'LineString',coordinates})});
  [...placemark.getElementsByTagName('Polygon')].forEach(node=>{const ring=node.getElementsByTagName('outerBoundaryIs')[0]?.getElementsByTagName('coordinates')[0];const coordinates=parseCoordinateText(ring?.textContent);if(coordinates.length>3)geometries.push({type:'Polygon',coordinates:[coordinates]})});
  geometries.forEach(geometry=>features.push({type:'Feature',properties:{name,...metadata},geometry}));
 });
 if(!features.length)throw new Error('No se encontraron puntos, líneas o polígonos dentro del archivo.');
 return features;
}
async function readKmzOrKml(file){
 if(file.size>10*1024*1024)throw new Error('El archivo supera 10 MB. Simplifica la capa antes de cargarla.');
 if(file.name.toLowerCase().endsWith('.kml')){const text=await file.text();if(text.length>5_000_000)throw new Error('El KML contiene demasiada información. Simplifica la capa.');return text}
 if(typeof JSZip==='undefined')throw new Error('No fue posible cargar el lector de KMZ.');
 const zip=await JSZip.loadAsync(await file.arrayBuffer()),entry=Object.values(zip.files).find(item=>!item.dir&&item.name.toLowerCase().endsWith('.kml'));
 if(!entry)throw new Error('El KMZ no contiene un archivo KML.');
 const text=await entry.async('text');if(text.length>5_000_000)throw new Error('El KML contenido en el KMZ es demasiado grande. Simplifica la capa.');return text;
}
function openKmzUpload(){
 const assignedUser=(data.usuarios||[]).find(user=>normalizeEmail(user.correo)===normalizeEmail(session?.email));
 const actions=(data.acciones||[]).filter(action=>{const site=data.sitios.find(item=>item.id===action.sitioId),territory=data.territorios.find(item=>item.id===site?.territorio);return isAdmin()||!assignedUser||(territory&&normalizeText(territory.provincia)===normalizeText(assignedUser.provincia)&&normalizeText(territory.canton)===normalizeText(assignedUser.canton))});
 if(!actions.length)return alert('No existen acciones asignadas a tu territorio para vincular con un KMZ.');
 const dialog=document.createElement('dialog');dialog.className='site-dialog';dialog.innerHTML=`<form class="dialog-body"><span class="eyebrow">Seguimiento geográfico</span><h3>Cargar KMZ de una acción</h3><p class="muted">El archivo debe contener puntos, líneas o polígonos en coordenadas geográficas. La plataforma guardará la geometría procesada, no el archivo binario.</p>
 <label>Acción vinculada<select name="accionId" required><option value="">Selecciona</option>${actions.map(action=>{const site=data.sitios.find(item=>item.id===action.sitioId);return `<option value="${escapeHtml(action.id)}">${escapeHtml(action.accion)} · ${escapeHtml(site?.nombre||'Sin sitio')}</option>`}).join('')}</select></label>
 <label>Nombre de la capa<input name="nombre" maxlength="140" placeholder="Ej. Tramos intervenidos julio 2026" required></label><label>Archivo KMZ o KML<input name="archivo" type="file" accept=".kmz,.kml,application/vnd.google-earth.kmz,application/vnd.google-earth.kml+xml" required></label>
 <div class="form-grid"><label>Origen de los datos<select name="origenDatos" required><option value="F03">F03</option><option value="Levantamiento territorial">Levantamiento territorial</option><option value="Otra fuente">Otra fuente</option></select></label><label>Código o referencia F03<input name="codigoF03" maxlength="100" placeholder="Código de ficha, evento o registro"></label><label>Fecha de corte<input name="fechaCorte" type="date"></label><label>Amenaza principal<input name="amenaza" maxlength="140" placeholder="Inundación, deslizamiento..."></label><label>Estado de validación<select name="estadoValidacion"><option>Pendiente de validación</option><option>Validado documentalmente</option><option>Validado en territorio</option><option>Observado</option></select></label><label>Institución fuente<input name="institucionFuente" maxlength="180" placeholder="Institución que genera o custodia el dato"></label></div>
 <label>Responsable, brigada o informe de levantamiento<input name="fuente" maxlength="240" placeholder="Responsable y referencia documental"></label><div class="form-error error" role="alert"></div>
 <div class="dialog-actions"><button type="button" class="secondary cancel">Cancelar</button><button type="submit">Procesar y mostrar en mapa</button></div></form>`;
 document.body.append(dialog);dialog.showModal();bindCancel(dialog);const form=dialog.querySelector('form');
 form.onsubmit=async event=>{event.preventDefault();const error=dialog.querySelector('.form-error'),button=form.querySelector('button[type="submit"]');error.textContent='';button.disabled=true;button.textContent='Procesando...';
  try{const values=Object.fromEntries(new FormData(form)),file=form.elements.archivo.files[0],kml=await readKmzOrKml(file),features=parseKmlFeatures(kml),action=data.acciones.find(item=>item.id===values.accionId),site=data.sitios.find(item=>item.id===action?.sitioId);
   const layer={id:crypto.randomUUID(),accionId:action.id,territorio:site?.territorio||'',nombre:values.nombre.trim(),origenDatos:values.origenDatos,codigoF03:values.codigoF03.trim(),fechaCorte:values.fechaCorte,amenaza:values.amenaza.trim(),estadoValidacion:values.estadoValidacion,institucionFuente:values.institucionFuente.trim(),fuente:values.fuente.trim(),archivoOrigen:file.name,features,cargadoEn:new Date().toISOString(),cargadoPor:session?.email||''};
   if(new Blob([JSON.stringify(layer)]).size>350000)throw new Error('La geometría procesada sigue siendo demasiado grande. Simplifica el KMZ o divídelo en varias capas.');
   data.capasGeograficas.push(layer);auditChange('CARGAR_KMZ','capa-geografica',layer.id,`${layer.nombre} · ${features.length} elementos`);save();dialog.close();dialog.remove();render();
  }catch(uploadError){error.textContent=uploadError.message||'No fue posible procesar el archivo.';button.disabled=false;button.textContent='Procesar y mostrar en mapa'}
 };
}
function f03TechnicalScore(item){
 const reported=Number(item.calidad);
 if(item.calidad!==null&&item.calidad!==undefined&&String(item.calidad).trim()!==''&&Number.isFinite(reported)&&reported>=0&&reported<=100)return reported;
 let score=0;
 if(item.punto||item.poligono)score+=30;
 if(item.fuente||item.institucion)score+=15;
 if(item.fechaRegistro)score+=10;
 if(item.descripcion)score+=10;
 if(item.archivo||item.archivoUrl||item.mapaUrl)score+=15;
 if(item.codigoCaso)score+=10;
 if(item.estadoValidacion)score+=10;
 return score;
}
function f03Validity(item){
 const score=f03TechnicalScore(item);
 if(score>=80&&item.estadoValidacion&&normalizeText(item.estadoValidacion).includes('valid'))return {label:'Válido técnicamente',className:'success'};
 if(score>=60)return {label:'Utilizable con observaciones',className:'warn'};
 return {label:'Pendiente de validación',className:'danger'};
}
function normalizedF03Record(item){
 const place=value=>normalizeText(value).replace(/\bcanton\b/g,'').replace(/[_-]+/g,' ').replace(/\s+/g,' ').trim();
 const canton=place(item.canton);
 const matches=(data.territorios||[]).filter(territory=>place(territory.canton)===canton);
 const territory=matches.length===1?matches[0]:matches.find(row=>normalizeText(row.provincia)===normalizeText(item.provincia));
 return territory?{...item,provincia:territory.provincia,canton:territory.canton,provinciaOriginal:item.provincia,cantonOriginal:item.canton}:item;
}
function toolsPage(){
 const records=(window.F03_CARTOGRAPHY||[]).map(normalizedF03Record);
 const operational=data.cartografiaOperativa||[];
 const geometry=records.filter(item=>item.punto||item.poligono),attachments=records.filter(item=>item.archivo||item.archivoUrl),valid=records.filter(item=>f03Validity(item).label==='Válido técnicamente');
 const riskWeight={'Crítico':5,'Alto':4,'Medio':3,'Bajo':2,'Por calificar':1};
 const territoryIndex={};geometry.forEach(item=>{const key=`${item.canton||'Sin cantón'}|${item.provincia||'Sin provincia'}`,entry=territoryIndex[key]||{name:item.canton||'Sin cantón',province:item.provincia||'Sin provincia',count:0,weight:0,risk:'Por calificar'};entry.count++;const risk=cartographicRiskLevel(item);if(riskWeight[risk]>entry.weight){entry.weight=riskWeight[risk];entry.risk=risk}territoryIndex[key]=entry});
 const priorityTerritories=Object.values(territoryIndex).sort((a,b)=>b.weight-a.weight||b.count-a.count).slice(0,5);
 const componentCounts=Object.fromEntries(['Amenaza','Vulnerabilidad','Exposición','Capacidad','Por clasificar'].map(name=>[name,records.filter(item=>cartographicClassification(item)===name).length]));
 $('#content').innerHTML=`<div class="cartography-lead"><div><span class="eyebrow">Taller cartográfico SmartRisk</span><h3>Actualizar la geografía de un riesgo, una acción o un sitio</h3><p>Carga un archivo, dibuja en el mapa o reutiliza un aporte F03; después vincúlalo al registro que necesita evidencia territorial.</p></div><button data-tool="cabina">Abrir Cabina COE</button></div>
 <div class="tool-grid cartography-tools">
  <button class="tool-card primary-tool" data-tool="import"><span>⇧</span><div><h3>Cargar y convertir</h3><p>Importa ZIP/SHP, GeoJSON, KML o KMZ; revisa atributos, vincula y descarga el resultado como KMZ.</p></div></button>
  <button class="tool-card" data-tool="draw"><span>✎</span><div><h3>Dibujar o corregir</h3><p>Crea puntos, tramos, áreas y buffers directamente sobre el mapa y asígnalos a un sitio o acción.</p></div></button>
  <button class="tool-card" data-tool="f03"><span>▤</span><div><h3>Usar aportes F03</h3><p>${records.length} aportes disponibles como fuente; revisa validez, selecciona los útiles y conviértelos en cartografía operativa.</p></div></button>
  <button class="tool-card" data-tool="library"><span>◫</span><div><h3>Cartografía incorporada</h3><p>${operational.length} vectores operativos y ${(data.capasGeograficas||[]).length} capas vinculadas con acciones.</p></div></button>
 </div>
 <section class="panel cartography-workflow"><div class="toolbar"><div><b>Ruta de actualización cartográfica</b><small class="table-note">Elige una entrada y termina con una vinculación verificable.</small></div></div><div class="cartography-steps"><span><b>1</b> Cargar o dibujar</span><i>→</i><span><b>2</b> Revisar geometría y atributos</span><i>→</i><span><b>3</b> Clasificar amenaza, exposición, vulnerabilidad o capacidad</span><i>→</i><span><b>4</b> Vincular a sitio, acción o COE</span><i>→</i><span><b>5</b> Exportar KMZ o registrar evidencia</span></div></section>
 <section class="panel f03-panel" id="f03Inventory"><div class="toolbar"><div><b>Mapa de edición y fuentes cartográficas</b><small class="table-note">F03 funciona aquí como fuente con control técnico. Los vectores dibujados o importados se convierten en capas operativas.</small></div><button id="zoomF03" class="secondary">Zoom a resultados</button></div>
 <div class="sig-workflow"><button data-sig-preset="context"><small>1 · Ubicar</small><b>Contexto territorial</b><span>Límites y fuente</span></button><i>→</i><button data-sig-preset="risk"><small>2 · Analizar</small><b>Construir lectura de riesgo</b><span>Amenaza + exposición + capacidad</span></button><i>→</i><button data-sig-preset="validate"><small>3 · Validar</small><b>Revisar calidad técnica</b><span>Escala, fecha y custodio</span></button><i>→</i><button data-sig-preset="export"><small>4 · Producir</small><b>Crear capa operativa</b><span>KML/KMZ con trazabilidad</span></button></div>
 <div class="cards f03-cards"><div class="card"><span>Aportes F03</span><strong>${records.length}</strong></div><div class="card"><span>Con geometría directa</span><strong>${geometry.length}</strong></div><div class="card"><span>Con respaldo o enlace</span><strong>${attachments.length}</strong></div><div class="card"><span>Validados técnicamente</span><strong>${valid.length}</strong></div></div>
 <div class="risk-reading"><div class="risk-reading-steps">${[['territory','1','Territorio'],['threat','2','Amenaza'],['exposure','3','Exposición'],['vulnerability','4','Vulnerabilidad'],['capacity','5','Capacidad y brechas'],['result','6','Lectura preliminar']].map(([id,number,label])=>`<button data-risk-step="${id}" class="${riskReadingStep===id?'active':''}"><small>${number}</small><b>${label}</b></button>`).join('')}</div><div id="riskReadingStatus"></div></div>
 <div class="toolbar site-toolbar"><input id="f03Search" placeholder="Buscar institución, capa o amenaza..."><select id="f03ProvinceFilter"><option value="">Selecciona una provincia</option>${[...new Set(records.map(item=>item.provincia).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es')).map(value=>`<option>${escapeHtml(value)}</option>`).join('')}</select><select id="f03CantonFilter"><option value="">Todos los cantones de la provincia</option></select><select id="f03ClassFilter"><option value="">Todos los componentes</option><option>Amenaza</option><option>Vulnerabilidad</option><option>Exposición</option><option>Capacidad</option><option>Por clasificar</option></select><select id="f03ValidityFilter"><option value="">Toda validez</option><option>Válido técnicamente</option><option>Utilizable con observaciones</option><option>Pendiente de validación</option></select><select id="f03GeometryFilter"><option value="">Toda representación</option><option value="point">Puntos</option><option value="line">Líneas</option><option value="polygon">Áreas</option><option value="document">Solo documental</option></select></div>
 <div class="decision-gis-layout"><aside class="decision-priority-panel"><h4>Territorios con información</h4><div class="decision-territories">${priorityTerritories.map((item,index)=>`<button data-territory-query="${escapeHtml(item.name)}"><span>${index+1}</span><div><b>${escapeHtml(item.name)}</b><small>${escapeHtml(item.province)} · ${item.count} geometrías</small></div><em>${escapeHtml(item.risk)} reportado</em></button>`).join('')||'<p class="muted">Sin territorios proyectables.</p>'}</div><h4>Pregunta de esta etapa</h4><div id="stageQuestion" class="stage-question"></div><h4>Geografía seleccionada</h4><div id="f03Selection" class="map-selection">Selecciona una geometría para revisar su fuente, validez y uso posible.</div></aside><div class="f03-map-stage decision-map-stage"><div class="f03-drawbar"><button class="secondary map-tool" data-mode="select">↖ Seleccionar</button><button class="secondary map-tool" data-mode="point">● Punto</button><button class="secondary map-tool" data-mode="line">╱ Línea</button><button class="secondary map-tool" data-mode="polygon">⬡ Área</button><button class="secondary map-tool" data-mode="buffer">◯ Buffer</button><label>Radio <input id="f03BufferRadius" type="number" min="10" max="10000" value="250"> m</label><button class="secondary" id="exportF03Kmz">Crear KMZ con resultados</button><button class="secondary" id="exportF03GeoJSON">Exportar vectores dibujados</button></div><div id="f03Map" aria-label="Mapa territorial para lectura guiada del riesgo"></div><div class="map-risk-key"><b>Clasificación preliminar reportada</b><span><i class="risk-critical"></i> Crítico</span><span><i class="risk-high"></i> Alto</span><span><i class="risk-medium"></i> Medio</span><span><i class="risk-low"></i> Bajo</span><span><i class="risk-unrated"></i> Por calificar</span></div></div><aside class="decision-components-panel"><div class="component-panel-head"><h4>Disponibilidad por componente</h4></div>${[['Amenaza','Probabilidad e intensidad del evento','⚠'],['Vulnerabilidad','Susceptibilidad y fragilidad','◒'],['Exposición','Personas, bienes y servicios','▱'],['Capacidad','Recursos para responder','◇']].map(([name,description,icon])=>`<button class="decision-component-card component-${normalizeText(name)}" data-component="${name}"><span>${icon}</span><div><b>${name}</b><small>${description}</small><em>${componentCounts[name]||0} aportes en toda la base</em></div><strong>›</strong></button>`).join('')}<div class="component-unclassified"><b>${componentCounts['Por clasificar']||0}</b> aportes pendientes de clasificar</div></aside></div>
 <div class="decision-actionbar"><div><small>Geografía seleccionada</small><b id="decisionSelectionName">Ningún elemento seleccionado</b></div><button data-route="decisiones">⚖ Decisión</button><button data-route="acciones">➜ Acción</button><button data-route="acciones">⌁ Monitoreo</button><button data-route="cabina">◉ Cabina COE</button></div>
 <div class="toolbar"><b>Tabla de atributos y control técnico</b><span id="f03VisibleCount" class="table-note"></span></div><div id="f03Table"></div></section>`;
 const paint=()=>{
  const query=normalizeText($('#f03Search').value),province=$('#f03ProvinceFilter').value,canton=$('#f03CantonFilter').value,classFilter=$('#f03ClassFilter').value,validity=$('#f03ValidityFilter').value,geometryFilter=$('#f03GeometryFilter').value,enabledValues=[...document.querySelectorAll('.f03-layer-toggle:checked')].map(input=>input.value),enabled=new Set(enabledValues.length?enabledValues:['Válido técnicamente','Utilizable con observaciones','Pendiente de validación']);
  const filtered=records.filter(item=>{const geometry=cartographicGeometryType(item),state=f03Validity(item).label,classification=cartographicClassification(item);return enabled.has(state)&&(!province||normalizeText(item.provincia)===normalizeText(province))&&(!canton||normalizeText(item.canton)===normalizeText(canton))&&(!classFilter||classification===classFilter)&&(!validity||state===validity)&&(!geometryFilter||(geometryFilter==='document'?geometry==='Documentos':geometry===({point:'Puntos',line:'Líneas',polygon:'Áreas'}[geometryFilter])))&&(!query||normalizeText(`${item.institucion} ${item.nombre} ${item.descripcion} ${item.amenaza}`).includes(query))});
  currentF03Filtered=filtered;
  paintF03Map(filtered,'f03Map');
  $('#f03VisibleCount').textContent=`${filtered.length} registros visibles · ${filtered.filter(item=>item.punto||item.poligono).length} proyectables`;
  $('#f03Table').innerHTML=filtered.length?`<div class="table-scroll"><table><thead><tr><th>Aporte / territorio</th><th>Componente</th><th>Capa geométrica</th><th>Fuente</th><th>Calidad</th><th>Uso recomendado</th></tr></thead><tbody>${filtered.map(item=>{const state=f03Validity(item),geometry=cartographicGeometryType(item);return `<tr><td><b>${escapeHtml(item.nombre)}</b><small class="table-note">${escapeHtml(item.provincia||'Sin provincia')} · ${escapeHtml(item.canton||'Sin cantón')}</small></td><td>${escapeHtml(cartographicClassification(item))}<small class="table-note">${escapeHtml(item.tipo||'No indicado')}</small></td><td>${badge('estado',geometry)}<small class="table-note">Riesgo: ${escapeHtml(cartographicRiskLevel(item))}</small></td><td>${escapeHtml(item.fuente||item.institucion||'No indicada')}<small class="table-note">${escapeHtml(item.archivo||'Sin adjunto local identificado')}</small></td><td><span class="review-score ${state.className}">${f03TechnicalScore(item)}%</span><small class="table-note">${escapeHtml(state.label)}</small></td><td>${state.label==='Válido técnicamente'?'Incorporar al análisis territorial':state.label==='Utilizable con observaciones'?'Usar señalando limitaciones':'Solicitar metadatos, geometría o validación'}</td></tr>`}).join('')}</tbody></table></div>`:'<div class="empty">No hay aportes que coincidan con los filtros.</div>';
  updateRiskReading(records,province,canton);
 };
 const populateCantons=()=>{const province=$('#f03ProvinceFilter').value,current=$('#f03CantonFilter').value,cantons=[...new Set(records.filter(item=>!province||normalizeText(item.provincia)===normalizeText(province)).map(item=>item.canton).filter(Boolean))].sort((a,b)=>a.localeCompare(b,'es'));$('#f03CantonFilter').innerHTML=`<option value="">Todos los cantones de la provincia</option>${cantons.map(value=>`<option ${value===current?'selected':''}>${escapeHtml(value)}</option>`).join('')}`};
 $('#f03Search').oninput=paint;$('#f03ProvinceFilter').oninput=()=>{populateCantons();paint()};$('#f03CantonFilter').oninput=paint;$('#f03ClassFilter').oninput=paint;$('#f03ValidityFilter').oninput=paint;$('#f03GeometryFilter').oninput=paint;document.querySelectorAll('.f03-layer-toggle').forEach(input=>input.oninput=paint);
 $('#content').onclick=event=>{const tool=event.target.closest('[data-tool]')?.dataset.tool,component=event.target.closest('[data-component]')?.dataset.component,territory=event.target.closest('[data-territory-query]')?.dataset.territoryQuery,route=event.target.closest('[data-route]')?.dataset.route,preset=event.target.closest('[data-sig-preset]')?.dataset.sigPreset,riskStep=event.target.closest('[data-risk-step]')?.dataset.riskStep,f03Id=event.target.closest('[data-incorporate-f03]')?.dataset.incorporateF03;if(tool==='cabina'||route==='cabina'){current='cabina';render()}else if(tool==='import')openCartographyImport();else if(tool==='draw'){$('#f03Inventory').scrollIntoView({behavior:'smooth'});setTimeout(()=>setF03MapMode('polygon'),250)}else if(tool==='f03')$('#f03Inventory').scrollIntoView({behavior:'smooth'});else if(tool==='library'){$('#f03Search').value='';$('#f03Inventory').scrollIntoView({behavior:'smooth'});paint()}else if(f03Id){const item=records.find(record=>record.id===f03Id),point=parseF03Coordinate(item?.punto),polygon=parseF03Polygon(item?.poligono),feature=polygon.length>=3?{type:'Feature',properties:{fuente:'F03',f03Id},geometry:{type:'Polygon',coordinates:[[...polygon.map(([lat,lng])=>[lng,lat]),[polygon[0][1],polygon[0][0]]] ]}}:point?{type:'Feature',properties:{fuente:'F03',f03Id},geometry:{type:'Point',coordinates:[point[1],point[0]]}}:null;if(feature)openOperationalGeometryForm(feature)}else if(route){current=route;render()}else if(riskStep){setRiskReadingStep(riskStep);paint()}else if(preset==='context'){setRiskReadingStep('territory');paint()}else if(preset==='risk'){setRiskReadingStep('threat');paint()}else if(preset==='validate'){$('#f03ValidityFilter').value='Pendiente de validación';paint()}else if(preset==='export')exportF03SelectionKmz();else if(component!==undefined){$('#f03ClassFilter').value=component;paint()}else if(territory){const record=records.find(item=>normalizeText(item.canton)===normalizeText(territory));if(record){$('#f03ProvinceFilter').value=record.provincia;populateCantons();$('#f03CantonFilter').value=record.canton}paint()}};
 $('#zoomF03').onclick=()=>{const bounds=activeF03Map?._f03Bounds;if(bounds?.isValid())activeF03Map.fitBounds(bounds,{padding:[25,25],maxZoom:16})};
 document.querySelectorAll('.map-tool').forEach(button=>button.onclick=()=>setF03MapMode(button.dataset.mode));
 $('#exportF03GeoJSON').onclick=exportOperationalGeoJSON;
 $('#exportF03Kmz').onclick=exportF03SelectionKmz;
 populateCantons();setRiskReadingStep(riskReadingStep);paint();
}
async function readCartographyFile(file){
 const name=file.name.toLowerCase();let payload;
 if(name.endsWith('.zip')){
  if(typeof shp!=='function')throw new Error('No fue posible iniciar el lector SHP.');
  payload=await shp(await file.arrayBuffer());
 }else if(name.endsWith('.geojson')||name.endsWith('.json'))payload=JSON.parse(await file.text());
 else if(name.endsWith('.kml')||name.endsWith('.kmz'))payload={type:'FeatureCollection',features:parseKmlFeatures(await readKmzOrKml(file))};
 else throw new Error('Formato no compatible. Usa ZIP/SHP, GeoJSON, KML o KMZ.');
 const collections=Array.isArray(payload)?payload:[payload],features=collections.flatMap(item=>item?.type==='FeatureCollection'?item.features:item?.type==='Feature'?[item]:[]);
  const usable=features.filter(item=>item?.geometry?.type&&item.geometry.coordinates).slice(0,500);
  if(!usable.length)throw new Error('El archivo no contiene geometrías vectoriales utilizables.');
  if(new Blob([JSON.stringify(usable)]).size>350000)throw new Error('La capa supera el tamaño operativo de la plataforma. Simplifica la geometría o divídela por territorio antes de incorporarla.');
 return usable.map((feature,index)=>({type:'Feature',properties:{...(feature.properties||{}),_nombreOrigen:feature.properties?.name||feature.properties?.NOMBRE||`Elemento ${index+1}`},geometry:feature.geometry}));
}
function geometryToKml(feature,index){
 const xml=value=>String(value??'').replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]));
 const coordinates=value=>value.map(point=>`${point[0]},${point[1]},${point[2]||0}`).join(' ');
 const geometry=feature.geometry||{},render=current=>{
  if(current.type==='Point')return `<Point><coordinates>${current.coordinates[0]},${current.coordinates[1]},${current.coordinates[2]||0}</coordinates></Point>`;
  if(current.type==='LineString')return `<LineString><coordinates>${coordinates(current.coordinates)}</coordinates></LineString>`;
  if(current.type==='Polygon')return `<Polygon><outerBoundaryIs><LinearRing><coordinates>${coordinates(current.coordinates[0])}</coordinates></LinearRing></outerBoundaryIs></Polygon>`;
  if(current.type==='MultiPoint')return `<MultiGeometry>${current.coordinates.map(item=>render({type:'Point',coordinates:item})).join('')}</MultiGeometry>`;
  if(current.type==='MultiLineString')return `<MultiGeometry>${current.coordinates.map(item=>render({type:'LineString',coordinates:item})).join('')}</MultiGeometry>`;
  if(current.type==='MultiPolygon')return `<MultiGeometry>${current.coordinates.map(item=>render({type:'Polygon',coordinates:item})).join('')}</MultiGeometry>`;
  return '';
 };
 const properties=feature.properties||{},description=Object.entries(properties).slice(0,30).map(([key,value])=>`${key}: ${typeof value==='object'?JSON.stringify(value):value}`).join(' | ');
 return `<Placemark><name>${xml(properties.nombre||properties._nombreOrigen||properties.name||`Elemento ${index+1}`)}</name><description>${xml(description)}</description>${render(geometry)}</Placemark>`;
}
async function downloadFeaturesKmz(features,name='smartrisk-cartografia'){
 if(typeof JSZip==='undefined')throw new Error('No fue posible iniciar el generador KMZ.');
 const kml=`<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>${name}</name>${features.map(geometryToKml).join('')}</Document></kml>`;
 const zip=new JSZip();zip.file('doc.kml',kml);const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`${name.replace(/[^\w-]+/g,'-').toLowerCase()}.kmz`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
function openCartographyImport(){
 const sites=data.sitios||[],actions=data.acciones||[],sessions=data.sesionesCabina||[],dialog=document.createElement('dialog');dialog.className='site-dialog';
 dialog.innerHTML=`<form class="dialog-body"><span class="eyebrow">Cargar, convertir e incorporar</span><h3>Actualizar cartografía operativa</h3><p class="muted">Para SHP carga un ZIP con los archivos .shp, .dbf y .prj. También puedes usar GeoJSON, KML o KMZ.</p>
 <label>Archivo vectorial<input type="file" name="archivo" accept=".zip,.geojson,.json,.kml,.kmz" required></label><div id="cartographyPreview" class="cartography-preview">Selecciona un archivo para revisar sus geometrías.</div>
 <div class="form-grid"><label class="full">Nombre de la capa<input name="nombre" required maxlength="160"></label><label>Componente<select name="clasificacion"><option>Amenaza</option><option>Vulnerabilidad</option><option>Exposición</option><option>Capacidad</option><option>Por clasificar</option></select></label><label>Nivel de riesgo<select name="nivelRiesgo"><option>Crítico</option><option>Alto</option><option>Medio</option><option>Bajo</option><option selected>Por calificar</option></select></label>
 <label>Sitio crítico<select name="sitioId"><option value="">Sin vincular</option>${sites.map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.nombre)} · ${escapeHtml(displayValue('sitios','territorio',item.territorio))}</option>`).join('')}</select></label>
 <label>Acción<select name="accionId"><option value="">Sin vincular</option>${actions.map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.accion)}</option>`).join('')}</select></label>
 <label>Sesión COE<select name="sesionId"><option value="">Sin vincular</option>${sessions.map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.problema)}</option>`).join('')}</select></label><label>Estado técnico<select name="estado"><option>Por validar</option><option>Confirmado</option><option>En intervención</option><option>Controlado</option></select></label>
 <label class="full">Fuente, fecha y criterio técnico<textarea name="descripcion" rows="3" required placeholder="Institución, fecha, escala, método, limitaciones y uso previsto"></textarea></label></div>
 <label class="check-row"><input type="checkbox" name="descargar" checked> Descargar también el resultado convertido a KMZ</label><label class="check-row"><input type="checkbox" name="cerrarAccion"> Si la capa se vincula a una acción y está controlada, registrar evidencia y completar la acción</label><div class="form-error error"></div>
 <div class="dialog-actions"><button type="button" class="secondary cancel">Cancelar</button><button>Incorporar cartografía</button></div></form>`;
 document.body.append(dialog);dialog.showModal();bindCancel(dialog);const form=dialog.querySelector('form');let features=[];
 form.elements.archivo.onchange=async()=>{const preview=dialog.querySelector('#cartographyPreview');preview.textContent='Procesando archivo...';try{features=await readCartographyFile(form.elements.archivo.files[0]);const counts={};features.forEach(item=>counts[item.geometry.type]=(counts[item.geometry.type]||0)+1);preview.innerHTML=`<b>${features.length} geometrías listas</b><span>${Object.entries(counts).map(([type,count])=>`${count} ${type}`).join(' · ')}</span><small>Se conservarán los atributos y se transformarán a WGS84 cuando el SHP incluya su .prj.</small>`;if(!form.elements.nombre.value)form.elements.nombre.value=form.elements.archivo.files[0].name.replace(/\.[^.]+$/,'')}catch(error){features=[];preview.textContent=error.message}};
 form.onsubmit=async event=>{event.preventDefault();const error=dialog.querySelector('.form-error');error.textContent='';if(!features.length){error.textContent='Primero carga un archivo vectorial válido.';return}const values=Object.fromEntries(new FormData(form)),groupId=crypto.randomUUID(),now=new Date().toISOString();
  const base={grupoId:groupId,nombre:values.nombre.trim(),clasificacion:values.clasificacion,nivelRiesgo:values.nivelRiesgo,estado:values.estado,sitioId:values.sitioId,accionId:values.accionId,sesionId:values.sesionId,descripcion:values.descripcion.trim(),responsable:session?.email||'',origen:'Archivo importado',creadoEn:now,creadoPor:session?.email||''};
  features.forEach((feature,index)=>data.cartografiaOperativa.push({id:crypto.randomUUID(),...base,nombre:features.length===1?base.nombre:`${base.nombre} · ${feature.properties?._nombreOrigen||index+1}`,geometry:feature}));
  if(values.accionId)data.capasGeograficas.push({id:groupId,accionId:values.accionId,territorio:data.sitios.find(item=>item.id===values.sitioId)?.territorio||'',nombre:base.nombre,origenDatos:'Levantamiento territorial',estadoValidacion:values.estado==='Confirmado'||values.estado==='Controlado'?'Validado en territorio':'Pendiente de validación',fuente:values.descripcion.trim(),features,cargadoEn:now,cargadoPor:session?.email||''});
  const action=data.acciones.find(item=>item.id===values.accionId);if(action&&values.cerrarAccion&&values.estado==='Controlado'){Object.assign(action,{estado:'Completada',avance:100,evidencia:`Capa ${base.nombre} · ${features.length} geometrías · ${now.slice(0,10)}`,actualizadoEn:now,actualizadoPor:session?.email||''})}
  auditChange('IMPORTAR_CARTOGRAFIA','cartografia',groupId,`${base.nombre} · ${features.length} geometrías`);save();if(values.descargar)await downloadFeaturesKmz(features,base.nombre);dialog.close();dialog.remove();render();
 };
}
function setRiskReadingStep(step){
 riskReadingStep=step;const mapping={territory:'',threat:'Amenaza',exposure:'Exposición',vulnerability:'Vulnerabilidad',capacity:'Capacidad',result:''};
 if($('#f03ClassFilter'))$('#f03ClassFilter').value=mapping[step]??'';
 document.querySelectorAll('[data-risk-step]').forEach(button=>button.classList.toggle('active',button.dataset.riskStep===step));
}
function updateRiskReading(records,province,canton){
 const scope=records.filter(item=>(!province||normalizeText(item.provincia)===normalizeText(province))&&(!canton||normalizeText(item.canton)===normalizeText(canton)));
 const count=name=>scope.filter(item=>cartographicClassification(item)===name).length;
 const counts={Amenaza:count('Amenaza'),Exposición:count('Exposición'),Vulnerabilidad:count('Vulnerabilidad'),Capacidad:count('Capacidad')},place=canton||province||'el territorio seleccionado';
 const content={
  territory:['¿Dónde se realizará el análisis?',province?`${place}: ${scope.length} aportes disponibles. Selecciona un cantón para evitar conclusiones demasiado generales.`:'Selecciona primero una provincia y, de ser posible, un cantón. Sin ámbito territorial no debe emitirse una lectura de riesgo.'],
  threat:['¿Qué evento puede ocurrir y dónde?',`${counts.Amenaza} aportes de amenaza en ${place}. Revisa intensidad, extensión, fecha y fuente; una amenaza no equivale todavía a riesgo.`],
  exposure:['¿Quiénes y qué bienes podrían afectarse?',`${counts.Exposición} aportes de exposición en ${place}. Si no hay población, infraestructura o servicios localizados, la consecuencia no puede estimarse.`],
  vulnerability:['¿Qué condiciones pueden aumentar el daño?',`${counts.Vulnerabilidad} aportes de vulnerabilidad en ${place}. Revisa fragilidad física, social, ambiental e institucional.`],
  capacity:['¿Con qué recursos se puede responder y qué falta?',`${counts.Capacidad} aportes de capacidad en ${place}. Cero aportes significa una brecha de información, no ausencia real de capacidades.`],
  result:['¿Qué puede concluirse responsablemente?',!province?'No existe lectura: falta seleccionar territorio.':counts.Amenaza&&counts.Exposición?`Lectura preliminar posible para ${place}: existen datos de amenaza y exposición. ${counts.Vulnerabilidad?'Hay vulnerabilidad documentada.':'Falta vulnerabilidad suficiente.'} ${counts.Capacidad?'Hay capacidades registradas.':'Falta registrar capacidades y brechas.'} Debe validarse antes de decidir.`:`Lectura incompleta para ${place}: se necesitan al menos amenaza y exposición localizadas; luego vulnerabilidad y capacidad.`]
 }[riskReadingStep]||['Lectura territorial','Selecciona una etapa.'];
 if($('#stageQuestion'))$('#stageQuestion').innerHTML=`<b>${escapeHtml(content[0])}</b><p>${escapeHtml(content[1])}</p>`;
 if($('#riskReadingStatus'))$('#riskReadingStatus').innerHTML=`<div><span class="eyebrow">Etapa actual</span><b>${escapeHtml(content[0])}</b><p>${escapeHtml(content[1])}</p></div><div class="risk-reading-counts"><span>Amenaza <b>${counts.Amenaza}</b></span><span>Exposición <b>${counts.Exposición}</b></span><span>Vulnerabilidad <b>${counts.Vulnerabilidad}</b></span><span>Capacidad <b>${counts.Capacidad}</b></span></div>`;
}
function parseF03Coordinate(value){
 const parts=String(value||'').trim().split(/\s+/).map(Number);
 return parts.length>=2&&Number.isFinite(parts[0])&&Number.isFinite(parts[1])?[parts[0],parts[1]]:null;
}
function parseF03Polygon(value){
 return String(value||'').split(';').map(parseF03Coordinate).filter(Boolean);
}
function cartographicRiskLevel(item){
 const value=normalizeText(item.nivelRiesgo||item.riesgo||item.prioridad||'');
 if(value.includes('crit')||value.includes('urgent')||value.includes('muy alto'))return 'Crítico';
 if(value.includes('alto')||value==='alta')return 'Alto';
 if(value.includes('medio')||value==='media')return 'Medio';
 if(value.includes('bajo')||value==='baja')return 'Bajo';
 return 'Por calificar';
}
function cartographicClassification(item){
 const value=normalizeText(`${item.clasificacion||''} ${item.tipo||''} ${item.funcion||''} ${item.amenaza||''}`);
 if(value.includes('vulnerab'))return 'Vulnerabilidad';
 if(value.includes('expos')||value.includes('infraestructura')||value.includes('poblacion')||value.includes('alojamiento')||value.includes('medio de vida'))return 'Exposición';
 if(value.includes('capacidad')||value.includes('recurso')||value.includes('punto seguro')||value.includes('puesto de mando')||value.includes('ruta de evacuacion'))return 'Capacidad';
 if(value.includes('amenaza')||value.includes('inund')||value.includes('desliz')||value.includes('erosion')||value.includes('socav')||value.includes('zona de afectacion'))return 'Amenaza';
 return 'Por clasificar';
}
function cartographicGeometryType(item){
 const type=item.geometry?.geometry?.type||item.geometry?.type||'';
 if(item.poligono||type==='Polygon'||type==='MultiPolygon')return 'Áreas';
 if(item.linea||type==='LineString'||type==='MultiLineString')return 'Líneas';
 if(item.punto||type==='Point'||type==='MultiPoint')return 'Puntos';
 return 'Documentos';
}
function paintF03Map(records,targetId,cabinSessionId=''){
 const container=document.getElementById(targetId);if(!container||typeof L==='undefined')return;
 if(activeF03Map){activeF03Map.remove();activeF03Map=null}
 activeF03Map=L.map(container,{zoomControl:true}).setView([-1.55,-79.45],7);
 const street=L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',{maxZoom:19,attribution:'© OpenStreetMap'}).addTo(activeF03Map);
 const imagery=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Esri World Imagery'});
 const topo=L.tileLayer('https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',{maxZoom:19,attribution:'Esri World Topographic Map'});
 L.control.layers({'Calles':street,'Imagen satelital':imagery,'Topográfico':topo},null,{position:'topright'}).addTo(activeF03Map);
 const groups={},colors={'Crítico':'#b91c1c','Alto':'#f97316','Medio':'#eab308','Bajo':'#16a34a','Por calificar':'#64748b'};
 const groupFor=item=>{const key=`${cartographicClassification(item)} · ${cartographicGeometryType(item)}`;return groups[key]||(groups[key]=L.featureGroup())};
 const dauleGroup=groups['Amenaza · Áreas']=L.featureGroup();
 records.forEach(item=>{
  const validity=f03Validity(item).label,risk=cartographicRiskLevel(item),color=colors[risk],point=parseF03Coordinate(item.punto),polygon=parseF03Polygon(item.poligono);let layer=null;
  if(polygon.length>=3)layer=L.polygon(polygon,{color,weight:3,fillColor:color,fillOpacity:.28});
  else if(point)layer=L.circleMarker(point,{radius:8,color:'#fff',weight:2,fillColor:color,fillOpacity:1});
  if(!layer)return;
  layer.bindTooltip(escapeHtml(item.nombre),{direction:'top'});
  layer.on('click',()=>showF03Selection(item));
  layer.bindPopup(`<b>${escapeHtml(item.nombre)}</b><br>${escapeHtml(item.canton||'Sin cantón')} · ${escapeHtml(item.provincia||'Sin provincia')}<br><b>Riesgo: ${escapeHtml(risk)}</b><br><small>${escapeHtml(validity)} · ${f03TechnicalScore(item)}%</small><br><small>${escapeHtml(item.tipo||'Aporte F03')} · ${escapeHtml(item.formato||'Sin formato')}</small>`);
  groupFor(item).addLayer(layer);
 });
 const operationalRecords=(data.cartografiaOperativa||[]).filter(item=>!cabinSessionId||item.sesionId===cabinSessionId);
 operationalRecords.forEach(item=>{const risk=cartographicRiskLevel(item),color=colors[risk],feature={...item.geometry,properties:{...(item.geometry.properties||{}),operationalId:item.id}},layer=L.geoJSON(feature,{style:{color,weight:4,fillColor:color,fillOpacity:.32},pointToLayer:(geo,latlng)=>L.circleMarker(latlng,{radius:9,color:'#fff',weight:2,fillColor:color,fillOpacity:1}),onEachFeature:(geo,child)=>child.on('click',()=>showOperationalSelection(item))});groupFor(item).addLayer(layer)});
 Object.entries(groups).forEach(([,group])=>{if(group.getLayers().length)group.addTo(activeF03Map)});
 const overlayControl={};Object.entries(groups).forEach(([name,group])=>{if(group.getLayers().length||name==='Amenaza · Áreas')overlayControl[name]=group});const f03LayerControl=L.control.layers(null,overlayControl,{position:'bottomright',collapsed:true}).addTo(activeF03Map);
 const all=L.featureGroup(Object.values(groups).flatMap(group=>group.getLayers()));const bounds=all.getBounds();activeF03Map._f03Bounds=bounds;if(bounds.isValid())activeF03Map.fitBounds(bounds,{padding:[25,25],maxZoom:15});
 const updatedLayers=Object.values(groups).flatMap(group=>group.getLayers()),updatedBounds=L.featureGroup(updatedLayers).getBounds();if(updatedBounds.isValid())activeF03Map._f03Bounds=updatedBounds;
 activeF03Map.on('click',handleF03MapClick);activeF03Map.on('dblclick',handleF03MapDoubleClick);
 if(records.some(item=>item.id==='F03-29'))loadDauleExternalLayer(activeF03Map,dauleGroup);
 loadAdministrativeBoundaries(activeF03Map,f03LayerControl);
 loadRiskScreeningLayers(activeF03Map,f03LayerControl);
 L.control.scale({imperial:false,position:'bottomleft'}).addTo(activeF03Map);setTimeout(()=>activeF03Map?.invalidateSize(),80);
}
async function loadRiskScreeningLayers(map,layerControl){
 const sources=[['Bolívar','geo/riesgo-bolivar-web.geojson'],['Guayas','geo/riesgo-guayas-web.geojson'],['Santa Elena','geo/riesgo-santa-elena-web.geojson']];
 const colors={ALTA:'#dc2626','MUY ALTA':'#991b1b',MEDIA:'#f59e0b',BAJA:'#16a34a',SIN:'#64748b'};
 for(const [province,url] of sources){
  try{
   const collection=await fetch(url).then(response=>response.ok?response.json():Promise.reject());
   if(map!==activeF03Map)return;
   const layer=L.geoJSON(collection,{pointToLayer:(feature,latlng)=>{
    const p=feature.properties||{},level=String(p.susceptibilidad_inundacion||'SIN').toUpperCase();
    return L.circleMarker(latlng,{radius:Math.min(12,4+Math.log10(Number(p.elementos||1)+1)*3),color:'#fff',weight:1,fillColor:colors[level]||colors.SIN,fillOpacity:.75});
   },onEachFeature:(feature,itemLayer)=>{const p=feature.properties||{};itemLayer.bindPopup(`<b>Tamizaje agregado · ${escapeHtml(province)}</b><br><small>No constituye nivel oficial de riesgo</small><hr><b>Inundación:</b> ${escapeHtml(p.susceptibilidad_inundacion||'Sin dato')}<br><b>Sequía:</b> ${escapeHtml(p.susceptibilidad_sequia||'Sin dato')}<br><b>Incendio:</b> ${escapeHtml(p.susceptibilidad_incendio||'Sin dato')}<br><b>Elementos agrupados:</b> ${escapeHtml(p.elementos||0)}<br><small>${escapeHtml(p.cantones||'Cantón por validar')} · ${escapeHtml(p.lugares_muestra||'Sin nombres disponibles')}</small>`)}}); 
   layerControl.addOverlay(layer,`Tamizaje preliminar · ${province}`);
  }catch{}
 }
}
async function loadAdministrativeBoundaries(map,layerControl){
 try{
  const [provinces,cantons]=await Promise.all([
   fetch('geo/provincias-zonal5.geojson').then(response=>response.ok?response.json():Promise.reject()),
   fetch('geo/cantones-zonal5.geojson').then(response=>response.ok?response.json():Promise.reject())
  ]);
  if(map!==activeF03Map)return;
  const provinceLayer=L.geoJSON(provinces,{style:{color:'#0f3b5d',weight:3,fillOpacity:0},onEachFeature:(feature,layer)=>layer.bindTooltip(feature.properties?.DPA_DESPRO||'Provincia',{sticky:true}).bindPopup(`<b>${escapeHtml(feature.properties?.DPA_DESPRO||'Provincia')}</b><br><small>Límite provincial · fuente DPA ${escapeHtml(feature.properties?.DPA_ANIO||'2012')}</small>`)});
  const cantonLayer=L.geoJSON(cantons,{style:{color:'#2563eb',weight:1.5,dashArray:'5 4',fillOpacity:0},onEachFeature:(feature,layer)=>layer.bindTooltip(feature.properties?.DPA_DESCAN||'Cantón',{sticky:true}).bindPopup(`<b>${escapeHtml(feature.properties?.DPA_DESCAN||'Cantón')}</b><br>${escapeHtml(feature.properties?.DPA_DESPRO||'')}<br><small>Código ${escapeHtml(feature.properties?.DPA_CANTON||'No indicado')} · DPA ${escapeHtml(feature.properties?.DPA_ANIO||'2012')}</small>`)});
  provinceLayer.addTo(map);layerControl.addOverlay(provinceLayer,'Contexto · Provincias');layerControl.addOverlay(cantonLayer,'Contexto · Cantones');
 }catch{}
}
async function loadDauleExternalLayer(map,group){
 try{
  if(!f03ExternalCache)f03ExternalCache=await fetch('f03-daule-inundacion.geojson').then(response=>{if(!response.ok)throw new Error('No disponible');return response.json()});
  if(map!==activeF03Map)return;
  const layer=L.geoJSON(f03ExternalCache,{style:{color:'#64748b',weight:1,fillColor:'#94a3b8',fillOpacity:.16},onEachFeature:(feature,itemLayer)=>itemLayer.on('click',()=>showF03Selection({id:'F03-29',nombre:'Zonas de inundación y recintos afectados',provincia:'Guayas',canton:'Daule',institucion:'GAD Municipal Daule',fuente:'F03 · RIESGOS ayuda humanitaria',tipo:'KMZ',formato:'KML/KMZ',descripcion:'Capa masiva recibida con 3.296 polígonos. Su nivel de riesgo está por calificar y requiere validar escala, fecha, método y atributos.',calidad:60,estadoValidacion:'Observada',poligono:'capa masiva'}))});
  layer.addTo(group);if(!map.hasLayer(group))group.addTo(map);const layerBounds=layer.getBounds();if(layerBounds.isValid()){map._f03Bounds=map._f03Bounds?.isValid()?map._f03Bounds.extend(layerBounds):layerBounds;map.fitBounds(map._f03Bounds,{padding:[25,25],maxZoom:15})}
 }catch{}
}
function setF03MapMode(mode){
 if(!activeF03Map)return;f03DrawMode=mode;f03DrawPoints=[];if(f03SketchLayer){f03SketchLayer.remove();f03SketchLayer=null}
 document.querySelectorAll('.map-tool').forEach(button=>button.classList.toggle('active',button.dataset.mode===mode));
 activeF03Map.getContainer().style.cursor=mode==='select'?'default':'crosshair';
 const box=$('#f03Selection');if(box)box.innerHTML=`<b>Herramienta: ${escapeHtml(mode==='point'?'Punto':mode==='line'?'Línea':mode==='polygon'?'Área':mode==='buffer'?'Buffer':'Selección')}</b><p>${mode==='line'||mode==='polygon'?'Marca vértices y haz doble clic para finalizar.':mode==='buffer'?'Haz clic en el centro del área de influencia.':mode==='point'?'Haz clic en la ubicación que deseas registrar.':'Selecciona una geometría para revisar sus atributos.'}</p>`;
}
function handleF03MapClick(event){
 if(!f03DrawMode||f03DrawMode==='select')return;
 if(f03DrawMode==='point'){openOperationalGeometryForm({type:'Feature',properties:{},geometry:{type:'Point',coordinates:[event.latlng.lng,event.latlng.lat]}});return}
 if(f03DrawMode==='buffer'){const radius=Math.max(10,Number($('#f03BufferRadius')?.value)||250),circle=L.circle(event.latlng,{radius}),polygon=circle.toGeoJSON();polygon.properties={bufferMetros:radius};openOperationalGeometryForm(polygon);return}
 f03DrawPoints.push(event.latlng);if(f03SketchLayer)f03SketchLayer.remove();f03SketchLayer=f03DrawMode==='line'?L.polyline(f03DrawPoints,{color:'#2563eb',dashArray:'6 5'}).addTo(activeF03Map):L.polygon(f03DrawPoints,{color:'#2563eb',dashArray:'6 5',fillOpacity:.12}).addTo(activeF03Map);
}
function handleF03MapDoubleClick(){
 if(!['line','polygon'].includes(f03DrawMode))return;
 const minimum=f03DrawMode==='line'?2:3;if(f03DrawPoints.length<minimum)return;
 const geometry=f03DrawMode==='line'?{type:'LineString',coordinates:f03DrawPoints.map(point=>[point.lng,point.lat])}:{type:'Polygon',coordinates:[[...f03DrawPoints.map(point=>[point.lng,point.lat]),[f03DrawPoints[0].lng,f03DrawPoints[0].lat]]]};
 if(f03SketchLayer){f03SketchLayer.remove();f03SketchLayer=null}openOperationalGeometryForm({type:'Feature',properties:{},geometry});
}
function openOperationalGeometryForm(feature){
 const sessions=data.sesionesCabina||[],sites=data.sitios||[],actions=data.acciones||[],dialog=document.createElement('dialog');dialog.className='site-dialog';dialog.innerHTML=`<form class="dialog-body"><span class="eyebrow">Nuevo vector operativo</span><h3>Clasificar y vincular para gestión</h3><div class="form-grid"><label class="full">Nombre del elemento<input name="nombre" required maxlength="160" placeholder="Sitio, tramo, área o recurso"></label><label>Componente del riesgo<select name="clasificacion" required><option>Amenaza</option><option>Vulnerabilidad</option><option>Exposición</option><option>Capacidad</option><option>Por clasificar</option></select></label><label>Función<select name="funcion"><option>Zona de afectación</option><option>Sitio crítico</option><option>Ruta de evacuación</option><option>Punto seguro</option><option>Alojamiento temporal</option><option>Infraestructura esencial</option><option>Recurso operativo</option><option>Puesto de mando</option><option>Área de monitoreo</option></select></label><label>Amenaza relacionada<input name="amenaza" required placeholder="Inundación, deslizamiento..."></label><label>Nivel de riesgo<select name="nivelRiesgo" required><option>Crítico</option><option>Alto</option><option>Medio</option><option>Bajo</option><option>Por calificar</option></select></label><label>Prioridad operativa<select name="prioridad"><option>Urgente</option><option>Alta</option><option>Media</option><option>Baja</option></select></label><label>Estado<select name="estado"><option>Por validar</option><option>Confirmado</option><option>En intervención</option><option>Controlado</option></select></label>
 <label>Sitio crítico<select name="sitioId"><option value="">Sin vincular</option>${sites.map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.nombre)}</option>`).join('')}</select></label><label>Acción<select name="accionId"><option value="">Sin vincular</option>${actions.map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.accion)}</option>`).join('')}</select></label><label>Sesión COE/COR<select name="sesionId"><option value="">Sin vincular</option>${sessions.map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.problema)}</option>`).join('')}</select></label><label>Responsable<input name="responsable" value="${escapeHtml(session?.email||'')}"></label><label class="full">Descripción y criterio técnico<textarea name="descripcion" required></textarea></label></div><label class="check-row"><input type="checkbox" name="cerrarAccion"> Si está controlado, usar como evidencia y completar la acción vinculada</label><div class="dialog-actions"><button type="button" class="secondary cancel">Cancelar</button><button>Guardar vector</button></div></form>`;document.body.append(dialog);dialog.showModal();bindCancel(dialog);
 dialog.querySelector('form').onsubmit=event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.target)),now=new Date().toISOString(),record={id:crypto.randomUUID(),...values,geometry:feature,creadoEn:now,creadoPor:session?.email||''};data.cartografiaOperativa.push(record);if(values.accionId)data.capasGeograficas.push({id:record.id,accionId:values.accionId,territorio:data.sitios.find(item=>item.id===values.sitioId)?.territorio||'',nombre:record.nombre,origenDatos:'Levantamiento territorial',estadoValidacion:values.estado==='Confirmado'||values.estado==='Controlado'?'Validado en territorio':'Pendiente de validación',fuente:values.descripcion,features:[feature],cargadoEn:now,cargadoPor:session?.email||''});const action=data.acciones.find(item=>item.id===values.accionId);if(action&&values.cerrarAccion&&values.estado==='Controlado')Object.assign(action,{estado:'Completada',avance:100,evidencia:`Vector ${record.nombre} · ${now.slice(0,10)}`,actualizadoEn:now,actualizadoPor:session?.email||''});auditChange('CREAR_VECTOR_OPERATIVO','cartografia',record.id,record.nombre);save();dialog.close();dialog.remove();f03DrawMode='';render()};
}
function showOperationalSelection(item){
 const box=$('#f03Selection');if(!box||!item)return;box.innerHTML=`<span class="badge neutral">Vector operativo</span><b>${escapeHtml(item.nombre)}</b><small>${escapeHtml(cartographicClassification(item))} · ${escapeHtml(cartographicGeometryType(item))} · riesgo ${escapeHtml(cartographicRiskLevel(item))}</small><p>${escapeHtml(item.descripcion)}</p><dl><dt>Amenaza relacionada</dt><dd>${escapeHtml(item.amenaza)}</dd><dt>Prioridad operativa</dt><dd>${escapeHtml(item.prioridad)}</dd><dt>Estado</dt><dd>${escapeHtml(item.estado)}</dd><dt>Responsable</dt><dd>${escapeHtml(item.responsable)}</dd></dl>`;if($('#decisionSelectionName'))$('#decisionSelectionName').textContent=item.nombre;
}
function exportOperationalGeoJSON(){
 const collection={type:'FeatureCollection',features:(data.cartografiaOperativa||[]).map(item=>({...item.geometry,properties:{...(item.geometry.properties||{}),id:item.id,nombre:item.nombre,clasificacion:item.clasificacion,funcion:item.funcion,amenaza:item.amenaza,nivelRiesgo:item.nivelRiesgo,prioridad:item.prioridad,estado:item.estado,responsable:item.responsable,sesionId:item.sesionId}}))};
 if(!collection.features.length)return alert('Todavía no existen vectores operativos para exportar.');
 const link=document.createElement('a');link.href=URL.createObjectURL(new Blob([JSON.stringify(collection,null,2)],{type:'application/geo+json'}));link.download=`smartrisk-cartografia-operativa-${new Date().toISOString().slice(0,10)}.geojson`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
async function exportF03SelectionKmz(){
 const records=currentF03Filtered.filter(item=>item.punto||item.poligono);
 if(!records.length)return alert('La consulta actual no contiene geometrías exportables. Ajusta territorio, componente o validez técnica.');
 if(typeof JSZip==='undefined')return alert('No fue posible iniciar el generador KMZ. Actualiza la página.');
 const xml=value=>String(value??'').replace(/[<>&"']/g,char=>({'<':'&lt;','>':'&gt;','&':'&amp;','"':'&quot;',"'":'&apos;'}[char]));
 const placemarks=records.map(item=>{
  const point=parseF03Coordinate(item.punto),polygon=parseF03Polygon(item.poligono);
  const geometry=polygon.length>=3?`<Polygon><outerBoundaryIs><LinearRing><coordinates>${[...polygon,polygon[0]].map(([lat,lng])=>`${lng},${lat},0`).join(' ')}</coordinates></LinearRing></outerBoundaryIs></Polygon>`:point?`<Point><coordinates>${point[1]},${point[0]},0</coordinates></Point>`:'';
  return `<Placemark><name>${xml(item.nombre)}</name><description>${xml(`${item.provincia||'Sin provincia'} · ${item.canton||'Sin cantón'} | ${f03Validity(item).label} | Uso: ${f03Validity(item).label==='Pendiente de validación'?'No concluyente hasta validar':'Conservar fuente y limitaciones'}`)}</description><ExtendedData><Data name="componente"><value>${xml(cartographicClassification(item))}</value></Data><Data name="riesgo_reportado"><value>${xml(cartographicRiskLevel(item))}</value></Data><Data name="validez_tecnica"><value>${xml(f03Validity(item).label)}</value></Data><Data name="calidad"><value>${f03TechnicalScore(item)}%</value></Data><Data name="fuente"><value>${xml(item.fuente||item.institucion||'No indicada')}</value></Data><Data name="archivo_origen"><value>${xml(item.archivo||'No indicado')}</value></Data></ExtendedData>${geometry}</Placemark>`;
 }).join('');
 const kml=`<?xml version="1.0" encoding="UTF-8"?><kml xmlns="http://www.opengis.net/kml/2.2"><Document><name>SmartRisk CZ5 · resultados F03</name><description>Exportación de consulta. Los niveles reportados y evaluaciones preliminares no sustituyen validación técnica o territorial.</description>${placemarks}</Document></kml>`;
 const zip=new JSZip();zip.file('doc.kml',kml);zip.file('LEEME.txt',`SmartRisk CZ5\nFecha: ${new Date().toISOString()}\nRegistros: ${records.length}\nUso: consulta y coordinación. Conservar fuente, fecha, escala, custodio y estado de validación.\n`);
 const blob=await zip.generateAsync({type:'blob',compression:'DEFLATE'}),link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=`smartrisk-consulta-f03-${new Date().toISOString().slice(0,10)}.kmz`;link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000);
}
function showF03Selection(item){
 const box=$('#f03Selection');if(!box)return;const validity=f03Validity(item);
 box.innerHTML=`<b>${escapeHtml(item.nombre)}</b><small>${escapeHtml(item.canton||'Sin cantón')} · ${escapeHtml(item.provincia||'Sin provincia')}</small><span class="review-score ${validity.className}">${f03TechnicalScore(item)}%</span><p>${escapeHtml(item.descripcion||'Sin descripción técnica suficiente.')}</p><dl><dt>Capa</dt><dd>${escapeHtml(cartographicClassification(item))} · ${escapeHtml(cartographicGeometryType(item))}</dd><dt>Nivel de riesgo</dt><dd>${escapeHtml(cartographicRiskLevel(item))}</dd><dt>Fuente</dt><dd>${escapeHtml(item.fuente||item.institucion||'No indicada')}</dd><dt>Uso recomendado</dt><dd>${validity.label==='Válido técnicamente'?'Usar en análisis y decisiones, conservando la fuente.':validity.label==='Utilizable con observaciones'?'Proyectar señalando sus limitaciones y validar en territorio.':'No usar como evidencia concluyente hasta completar su validación.'}</dd></dl>${item.punto||item.poligono?`<button data-incorporate-f03="${escapeHtml(item.id)}">Vincular este aporte a sitio o acción</button>`:''}`;if($('#decisionSelectionName'))$('#decisionSelectionName').textContent=item.nombre;
}
function cabinPage(){
 const assignedUser=(data.usuarios||[]).find(user=>normalizeEmail(user.correo)===normalizeEmail(session?.email));
 const visibleTerritories=(data.territorios||[]).filter(territory=>isAdmin()||!assignedUser||(normalizeText(territory.provincia)===normalizeText(assignedUser.provincia)&&normalizeText(territory.canton)===normalizeText(assignedUser.canton)));
 const visibleIds=new Set(visibleTerritories.map(item=>item.id));
 const sessions=(data.sesionesCabina||[]).filter(item=>isAdmin()||visibleIds.has(item.territorio));
 const active=sessions.find(item=>item.id===data.cabinaActiva)||sessions[0];
 const tasks=(data.tareasCabina||[]).filter(item=>item.sesionId===active?.id);
 const overdue=tasks.filter(item=>item.estado!=='Cumplida'&&item.plazo&&item.plazo<new Date().toISOString().slice(0,10)).length;
 const f03=(window.F03_CARTOGRAPHY||[]).filter(item=>{const territory=data.territorios.find(row=>row.id===active?.territorio);return territory&&normalizeText(item.provincia)===normalizeText(territory.provincia)&&normalizeText(item.canton)===normalizeText(territory.canton)});
 const candidates=(data.sitios||[]).filter(site=>visibleIds.has(site.territorio)&&!linkedActions(site.id).length).sort((a,b)=>sitePriority(b).score-sitePriority(a).score).slice(0,6);
 $('#content').innerHTML=`<div class="cabin-lead"><div><button class="secondary" id="backTools">← Herramientas</button><span class="eyebrow">Sistema de conducción territorial</span><h3>${active?escapeHtml(active.problema):'Abre una sesión para gestionar un problema del COE'}</h3><p>${active?escapeHtml(active.objetivo):'La cabina ordena información, decisiones, responsables, acciones y evidencia según el perfil de cada participante.'}</p></div><button id="newCabin">Nueva sesión COE</button></div>
 <div class="cards"><div class="card"><span>Sesiones visibles</span><strong>${sessions.length}</strong></div><div class="card"><span>Acciones asignadas</span><strong>${tasks.length}</strong></div><div class="card"><span>Vencidas</span><strong>${overdue}</strong></div><div class="card"><span>Aportes F03 del territorio</span><strong>${f03.length}</strong></div></div>
 ${active?`<section class="panel"><div class="toolbar cabin-session-tabs"><select id="cabinSession">${sessions.map(item=>`<option value="${escapeHtml(item.id)}" ${item.id===active.id?'selected':''}>${escapeHtml(item.problema)}</option>`).join('')}</select><button id="newCabinTask">Asignar acción</button></div>
 <div class="cabin-command"><article><small>1 · Problema territorial</small><b>${escapeHtml(active.problema)}</b><p>${escapeHtml(active.situacion||'Situación pendiente de detallar')}</p></article><span>→</span><article><small>2 · Objetivo de control</small><b>${escapeHtml(active.objetivo)}</b><p>Nivel ${escapeHtml(active.nivel||'Cantonal')} · ${escapeHtml(displayValue('sitios','territorio',active.territorio))}</p></article><span>→</span><article><small>3 · Dirección del COE</small><b>${tasks.length} acciones distribuidas</b><p>${overdue} vencidas · ${tasks.filter(item=>item.estado==='Cumplida').length} cumplidas</p></article></div>
 <div class="toolbar"><b>Matriz de acciones por actor</b><small class="table-note">Cada usuario territorial ve y actualiza las acciones correspondientes a su ámbito.</small></div><div class="table-scroll"><table><thead><tr><th>Acción / producto</th><th>Actor y mesa</th><th>Prioridad</th><th>Plazo</th><th>Estado</th><th>Evidencia</th><th></th></tr></thead><tbody>${tasks.length?tasks.map(task=>`<tr><td><b>${escapeHtml(task.accion)}</b><small class="table-note">${escapeHtml(task.producto||'Producto pendiente')}</small></td><td>${escapeHtml(task.actor)}<small class="table-note">${escapeHtml(task.mesa||'Sin mesa asignada')}</small></td><td>${badge('prioridad',task.prioridad)}</td><td>${escapeHtml(task.plazo||'Sin plazo')}</td><td>${badge('estado',task.estado)}</td><td>${escapeHtml(task.evidencia||'Pendiente')}</td><td><button class="secondary edit-cabin-task" data-id="${escapeHtml(task.id)}">Actualizar</button></td></tr>`).join(''):'<tr><td colspan="7"><div class="empty">La sesión todavía no tiene acciones asignadas.</div></td></tr>'}</tbody></table></div></section>
 <section class="panel"><div class="toolbar"><b>Mapa operativo del problema</b><button class="secondary" id="openF03">Abrir visor completo</button></div><div class="cabin-inputs"><span>${f03.length} aportes cartográficos F03</span><span>${f03.filter(item=>item.punto||item.poligono).length} geometrías directas</span><span>${f03.filter(item=>f03Validity(item).label==='Pendiente de validación').length} pendientes de validar</span></div><div class="f03-map-workspace cabin-map-workspace"><aside class="f03-layer-panel"><h4>Lectura para el COE</h4><p>Selecciona un elemento para revisar su validez antes de usarlo para dirigir acciones.</p><div id="f03Selection" class="map-selection">La cartografía aparece semaforizada por validez técnica.</div></aside><div id="cabinF03Map" aria-label="Mapa operativo de la Cabina COE"></div></div></section>`:`<section class="cabin-preparation"><div class="cabin-ready"><div><span class="eyebrow">Antes de activar la conducción</span><h3>Selecciona un problema real que requiera coordinación</h3><p>Una sesión no se abre para explorar: debe partir de una situación confirmada, una decisión pendiente y un resultado que varios actores deban alcanzar.</p></div><div class="readiness-check"><span>1 · Problema y territorio</span><span>2 · Evidencia disponible</span><span>3 · Objetivo de control</span><span>4 · Actores y productos</span></div></div>
 <div class="cabin-candidates">${candidates.length?candidates.map(site=>{const priority=sitePriority(site);return `<article><div><span class="badge ${priority.label==='Urgente'?'danger':'warn'}">${escapeHtml(priority.label)}</span><small>${escapeHtml(displayValue('sitios','territorio',site.territorio))}</small><h4>${escapeHtml(site.nombre)}</h4><p>${escapeHtml(site.descripcion||site.brechas||'Situación pendiente de ampliar con evidencia territorial.')}</p></div><dl><dt>Amenaza</dt><dd>${escapeHtml(site.amenaza||'Por determinar')}</dd><dt>Brecha</dt><dd>${escapeHtml(site.brechaPrincipal||'Por determinar')}</dd><dt>Fuente</dt><dd>${escapeHtml(site.fuentePlan||site.origen||'Reporte territorial')}</dd></dl><button class="open-cabin-candidate" data-id="${escapeHtml(site.id)}">Preparar sesión desde este problema</button></article>`}).join(''):'<div class="empty"><b>No existen fichas disponibles para preparar una sesión.</b><p>Completa primero una ficha territorial o abre una sesión manual con información confirmada.</p></div>'}</div></section>`}`;
 $('#backTools').onclick=()=>{current='herramientas';render()};$('#newCabin').onclick=()=>openCabinSessionForm(visibleTerritories);
 if(!active)$('#content').onclick=event=>{const siteId=event.target.closest('.open-cabin-candidate')?.dataset.id;if(siteId)openCabinSessionForm(visibleTerritories,data.sitios.find(item=>item.id===siteId))};
 if(active){$('#cabinSession').oninput=event=>{data.cabinaActiva=event.target.value;save();render()};$('#newCabinTask').onclick=()=>openCabinTaskForm(active);$('#openF03').onclick=()=>{current='herramientas';render();setTimeout(()=>$('#f03Inventory')?.scrollIntoView(),50)};$('#content').onclick=event=>{const id=event.target.closest('.edit-cabin-task')?.dataset.id;if(id)openCabinTaskForm(active,data.tareasCabina.find(item=>item.id===id))};setTimeout(()=>paintF03Map(f03,'cabinF03Map',active.id),0)}
}
function openCabinSessionForm(territories,sourceSite=null){
 if(!territories.length)return alert('Tu perfil no tiene un territorio habilitado.');
 const dialog=document.createElement('dialog'),suggestedProblem=sourceSite?`${sourceSite.amenaza||'Condición de riesgo'} en ${sourceSite.nombre}`:'',suggestedSituation=sourceSite?(sourceSite.descripcion||sourceSite.brechas||''):'';
 dialog.className='site-dialog';dialog.innerHTML=`<form class="dialog-body"><span class="eyebrow">Nueva sesión COE</span><h3>Definir el problema territorial</h3>${sourceSite?`<p class="review-notice"><b>Fuente vinculada:</b><span>${escapeHtml(sourceSite.fuentePlan||sourceSite.origen||'Ficha territorial')} · los textos son un borrador editable y deben confirmarse antes de iniciar.</span></p>`:''}<div class="form-grid"><label>Territorio<select name="territorio" required>${territories.map(item=>`<option value="${escapeHtml(item.id)}" ${item.id===sourceSite?.territorio?'selected':''}>${escapeHtml(item.provincia)} · ${escapeHtml(item.canton)}</option>`).join('')}</select></label><label>Nivel<select name="nivel"><option>Cantonal</option><option>Provincial</option><option>Zonal</option></select></label><label class="full">Problema a resolver<input name="problema" maxlength="180" required value="${escapeHtml(suggestedProblem)}" placeholder="Describe la condición que requiere coordinación"></label><label class="full">Situación confirmada<textarea name="situacion" required>${escapeHtml(suggestedSituation)}</textarea></label><label class="full">Objetivo de control<textarea name="objetivo" required placeholder="Resultado concreto, verificable y temporal que debe alcanzar el COE"></textarea></label><label class="full">Fuente y trazabilidad<input name="fuente" required value="${escapeHtml(sourceSite?`${sourceSite.fuentePlan||sourceSite.origen||'Ficha territorial'}${sourceSite.fuentePagina?`, página ${sourceSite.fuentePagina}`:''}`:'')}" placeholder="Informe, ficha, monitoreo o autoridad que confirma la situación"></label></div><div class="dialog-actions"><button type="button" class="secondary cancel">Cancelar</button><button>Iniciar cabina</button></div></form>`;document.body.append(dialog);dialog.showModal();bindCancel(dialog);
 dialog.querySelector('form').onsubmit=event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.target)),record={id:crypto.randomUUID(),...values,sitioId:sourceSite?.id||'',estado:'Activa',creadaEn:new Date().toISOString(),creadaPor:session?.email||''};data.sesionesCabina.push(record);data.cabinaActiva=record.id;auditChange('ABRIR_CABINA','sesion-coe',record.id,record.problema);save();dialog.close();dialog.remove();render()};
}
function openCabinTaskForm(cabin,existing=null){
 const actors=[...(data.actoresCOE||[]).map(item=>item.nombre||item.institucion).filter(Boolean),...(data.usuarios||[]).map(item=>item.responsable).filter(Boolean)];
 const dialog=document.createElement('dialog');dialog.className='site-dialog';dialog.innerHTML=`<form class="dialog-body"><span class="eyebrow">Dirección de acciones</span><h3>${existing?'Actualizar':'Asignar'} acción COE</h3><div class="form-grid"><label class="full">Acción concreta<textarea name="accion" required>${escapeHtml(existing?.accion||'')}</textarea></label><label>Actor responsable<input name="actor" list="cabinActors" required value="${escapeHtml(existing?.actor||'')}"><datalist id="cabinActors">${[...new Set(actors)].map(item=>`<option value="${escapeHtml(item)}">`).join('')}</datalist></label><label>Mesa o grupo<input name="mesa" required value="${escapeHtml(existing?.mesa||'')}"></label><label>Prioridad<select name="prioridad">${['Urgente','Alta','Media','Baja'].map(value=>`<option ${existing?.prioridad===value?'selected':''}>${value}</option>`).join('')}</select></label><label>Plazo<input name="plazo" type="date" required value="${escapeHtml(existing?.plazo||'')}"></label><label>Estado<select name="estado">${['Asignada','En ejecución','Bloqueada','Cumplida'].map(value=>`<option ${existing?.estado===value?'selected':''}>${value}</option>`).join('')}</select></label><label>Producto esperado<input name="producto" value="${escapeHtml(existing?.producto||'')}"></label><label class="full">Evidencia o novedad<textarea name="evidencia">${escapeHtml(existing?.evidencia||'')}</textarea></label></div><div class="dialog-actions"><button type="button" class="secondary cancel">Cancelar</button><button>Guardar acción</button></div></form>`;document.body.append(dialog);dialog.showModal();bindCancel(dialog);
 dialog.querySelector('form').onsubmit=event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.target));if(existing)Object.assign(existing,values,{actualizadaEn:new Date().toISOString(),actualizadaPor:session?.email||''});else data.tareasCabina.push({id:crypto.randomUUID(),sesionId:cabin.id,...values,creadaEn:new Date().toISOString(),creadaPor:session?.email||''});auditChange(existing?'ACTUALIZAR_ACCION_COE':'ASIGNAR_ACCION_COE','tarea-cabina',existing?.id||'',values.accion);save();dialog.close();dialog.remove();render()};
}
function territoryOperationalData(){
 const reviews=window.ENOS_REVIEWS?.reviews||[],mentions=window.ENOS_RISK_LOCATIONS?.locations||[],decisions=deriveDecisions();
 return (data.territorios||[]).map(territory=>{
  const same=(province,canton)=>normalizeText(province)===normalizeText(territory.provincia)&&normalizeText(canton)===normalizeText(territory.canton);
  const review=reviews.find(item=>same(item.province,item.territory));
  const hasPlan=Boolean(review&&review.score!=null);
  const territoryMentions=mentions.filter(item=>same(item.province,item.territory));
  const pending=territoryMentions.filter(item=>pendingLocationUpdate(item).estado!=='Convertida en ficha gestionable');
  const sites=(data.sitios||[]).filter(site=>site.territorio===territory.id);
  const siteIds=new Set(sites.map(site=>site.id));
  const actions=(data.acciones||[]).filter(action=>siteIds.has(action.sitioId));
  const alerts=decisions.filter(item=>same(item.province,item.territory)&&!['Resuelta','Descartada'].includes(item.status));
  const urgent=alerts.filter(item=>item.level==='Urgente').length;
  const status=!hasPlan?'Sin plan':urgent?'Atención inmediata':!sites.length?'Sin fichas gestionables':!actions.length?'Sin acciones':'En gestión';
  const next=!hasPlan?'Solicitar y cargar el plan territorial':urgent?'Responder alertas urgentes y validar evidencia':!sites.length?'Completar, revisar y aprobar fichas pendientes':!actions.length?'Definir medidas, responsables y plazos':'Controlar avance y evidencia de las acciones';
  return {territory,review,hasPlan,mentions:territoryMentions.length,pending:pending.length,sites,actions,alerts,urgent,status,next};
 });
}
const COE_PROBLEMS={
 inundacion:{label:'Inundación o desbordamiento',mtt:'MTT 1 y MTT 3',product:'Escenario actualizado, zonas afectadas, evacuación y continuidad de servicios'},
 movimiento:{label:'Movimiento en masa o afectación vial',mtt:'MTT 3',product:'Cierre o restricción, ruta alterna, maquinaria y estabilización'},
 servicios:{label:'Interrupción de servicios básicos',mtt:'MTT 1 y MTT 4',product:'Daño, población afectada, solución temporal y tiempo de recuperación'},
 evacuacion:{label:'Evacuación y alojamiento temporal',mtt:'MTT 2',product:'Orden de evacuación, rutas, transporte, capacidad y necesidades'},
 salud:{label:'Emergencia sanitaria',mtt:'MTT 2',product:'Evaluación sanitaria, capacidad, derivación y medidas de protección'},
 alerta:{label:'Monitoreo y alerta temprana',mtt:'Sala situacional / plenaria COE',product:'Umbral, nivel de alerta, mensaje oficial y población destinataria'}
};
function coeFlowStages(territoryId,problemKey){
 const territory=data.territorios.find(item=>item.id===territoryId),problem=COE_PROBLEMS[problemKey],custom=data.actoresCOE||[];
 const assigned=stage=>custom.find(actor=>actor.territorio===territoryId&&actor.problema===problemKey&&actor.etapa===stage);
 const technician=(data.usuarios||[]).find(user=>territory&&normalizeText(user.provincia)===normalizeText(territory.provincia)&&normalizeText(user.canton)===normalizeText(territory.canton));
 const institution=(data.instituciones||[]).find(item=>item.territorio===territoryId);
 const admin=(data.usuarios||[]).find(user=>ADMIN_EMAILS.includes(normalizeEmail(user.correo)))||{nombre:'Coordinación Zonal 5',correo:'Por asignar',telefono:''};
 const stage=(id,title,ideal,fallback)=>{const actor=assigned(id)||fallback||{},missing=[];if(!actor.nombre)missing.push('responsable');if(!actor.correo&&!actor.telefono)missing.push('contacto');if(!actor.canal)missing.push('canal de reporte');return {id,title,ideal,actor,missing,state:missing.length?'gap':'ready'}};
 return [
  stage('reporte','1. Reporte territorial','Comunidad, brigada, operador o institución que detecta el problema',null),
  stage('validacion','2. Validación técnica','UGR municipal confirma ubicación, impacto y nivel de urgencia',technician?{nombre:technician.nombre,correo:technician.correo,telefono:technician.telefono,canal:technician.correo?'Correo / teléfono':'Teléfono'}:null),
  stage('coordinacion','3. Coordinación municipal','GAD articula áreas operativas y consolida necesidades',institution?{nombre:institution.nombre,correo:'',telefono:'',canal:'Por definir'}:null),
  stage('mtt','4. Mesa técnica','Especialistas de '+problem.mtt+' analizan opciones y recursos',null),
  stage('decision','5. Decisión COE','Plenaria COE aprueba prioridades, responsables y comunicación oficial',null),
  stage('escalamiento','6. Escalamiento y control','Nivel provincial/zonal recibe brecha, gestiona apoyo y controla compromisos',{nombre:admin.nombre,correo:admin.correo,telefono:admin.telefono,canal:'Plataforma / correo'})
 ];
}
function coeActorsPage(){
 const assignedUser=(data.usuarios||[]).find(user=>normalizeEmail(user.correo)===normalizeEmail(session?.email));
 const territories=[...(data.territorios||[])].filter(item=>isAdmin()||!assignedUser||(normalizeText(item.provincia)===normalizeText(assignedUser.provincia)&&normalizeText(item.canton)===normalizeText(assignedUser.canton))).sort((a,b)=>`${a.provincia}${a.canton}`.localeCompare(`${b.provincia}${b.canton}`,'es'));
 $('#content').innerHTML=`<div class="risk-lead coe-lead"><div><span class="eyebrow">Estructura operativa del COE</span><h3>¿Cómo debe fluir la información para resolver un problema?</h3><p>Selecciona territorio y situación. El diagrama compara el flujo ideal con los actores realmente identificados y marca los vacíos de responsabilidad, contacto y canal.</p></div><button id="coeGuide" class="secondary">Guíame por el flujo</button></div>
 <div class="panel coe-panel"><div class="toolbar coe-filters"><select id="coeTerritory" aria-label="Seleccionar territorio">${territories.map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.provincia)} · ${escapeHtml(item.canton)}</option>`).join('')}</select>
 <select id="coeProblem" aria-label="Seleccionar problema">${Object.entries(COE_PROBLEMS).map(([key,value])=>`<option value="${key}">${escapeHtml(value.label)}</option>`).join('')}</select></div>
 <div id="coeSummary"></div><div id="coeFlow"></div></div>
 ${isAdmin()?'<section class="panel access-management"><div class="toolbar"><div><b>Contactos y accesos de la plataforma</b><small class="table-note">Administra quién puede ingresar. Los roles operativos del COE se asignan en el diagrama superior.</small></div><input id="userSearch" placeholder="Buscar contacto..."><button id="addUser">Nuevo contacto</button></div><div id="userTable"></div></section>':''}`;
 const paintFlow=()=>{
  const territoryId=$('#coeTerritory').value,problemKey=$('#coeProblem').value,problem=COE_PROBLEMS[problemKey],stages=coeFlowStages(territoryId,problemKey);
  const gaps=stages.reduce((sum,item)=>sum+item.missing.length,0),ready=stages.filter(item=>item.state==='ready').length;
  $('#coeSummary').innerHTML=`<div class="coe-summary"><span><b>${ready}/${stages.length}</b> etapas completas</span><span class="${gaps?'gap':''}"><b>${gaps}</b> vacíos operativos</span><span><b>${escapeHtml(problem.mtt)}</b> estructura sugerida</span></div>
  <div class="coe-product"><b>Producto que debe llegar al COE:</b> ${escapeHtml(problem.product)}</div>`;
  $('#coeFlow').innerHTML=`<div class="coe-flow">${stages.map((item,index)=>`<article class="coe-node ${item.state}"><div class="coe-node-head"><span>${index+1}</span><div><small>${item.state==='ready'?'Flujo habilitado':'Flujo incompleto'}</small><h4>${escapeHtml(item.title.replace(/^\d+\.\s*/,''))}</h4></div></div><p>${escapeHtml(item.ideal)}</p>
   ${item.actor.nombre?`<div class="coe-actor"><b>${escapeHtml(item.actor.nombre)}</b><small>${escapeHtml(item.actor.correo||item.actor.telefono||'Contacto no registrado')} · ${escapeHtml(item.actor.canal||'Canal no definido')}</small></div>`:'<div class="coe-missing">No existe un actor asignado</div>'}
   ${item.missing.length?`<div class="coe-gaps">Falta: ${escapeHtml(item.missing.join(', '))}</div>`:''}<button class="secondary assign-coe" data-stage="${item.id}">${item.actor.nombre?'Completar actor':'Asignar actor'}</button></article>${index<stages.length-1?'<div class="coe-arrow" aria-hidden="true">→<small>información<br>confirmada</small></div>':''}`).join('')}</div>`;
  $('#coeFlow').onclick=event=>{if(event.target.classList.contains('assign-coe'))openCoeActorForm(territoryId,problemKey,event.target.dataset.stage,paintFlow)};
 };
 $('#coeTerritory').oninput=paintFlow;$('#coeProblem').oninput=paintFlow;$('#coeGuide').onclick=()=>startGuide('usuarios',true);
 if(isAdmin())bindUserManagement();paintFlow();
}
function bindUserManagement(){
 const rows=data.usuarios||[],paint=()=>{
  const query=normalizeText($('#userSearch').value),filtered=rows.filter(row=>!query||normalizeText(`${row.nombre} ${row.correo} ${row.provincia} ${row.canton}`).includes(query));
  $('#userTable').innerHTML=filtered.length?`<div class="table-scroll"><table><thead><tr><th>Responsable</th><th>Territorio</th><th>Contacto</th><th>Estado</th><th>Acceso</th><th></th></tr></thead><tbody>${filtered.map(row=>`<tr><td><b>${escapeHtml(row.nombre)}</b></td><td>${escapeHtml(row.canton)} · ${escapeHtml(row.provincia)}</td><td>${escapeHtml(row.correo||'Sin correo')}<small class="table-note">${escapeHtml(row.telefono||'Sin teléfono')}</small></td><td>${badge('estado',row.estado)}</td><td>${accessBadge(row)}</td><td><button class="secondary edit-user" data-id="${escapeHtml(row.id)}">Editar</button></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No existen contactos que coincidan con la búsqueda.</div>';
 };
 $('#userSearch').oninput=paint;$('#addUser').onclick=()=>openUserForm(null);$('#userTable').onclick=event=>{if(event.target.classList.contains('edit-user'))openUserForm(rows.find(row=>row.id===event.target.dataset.id))};paint();
}
function openCoeActorForm(territoryId,problemKey,stage,refresh){
 const existing=(data.actoresCOE||[]).find(actor=>actor.territorio===territoryId&&actor.problema===problemKey&&actor.etapa===stage),dialog=document.createElement('dialog');
 const users=(data.usuarios||[]).filter(user=>user.estado==='Activo');
 dialog.innerHTML=`<form class="dialog-body"><span class="eyebrow">Asignación operativa COE</span><h3>${escapeHtml(COE_PROBLEMS[problemKey].label)}</h3><p class="muted">Registra al actor que recibe, valida o entrega información en esta etapa.</p>
 <label>Usar contacto existente<select name="usuario"><option value="">Asignación manual</option>${users.map(user=>`<option value="${escapeHtml(user.id)}">${escapeHtml(user.nombre)} · ${escapeHtml(user.canton)}</option>`).join('')}</select></label>
 <label>Responsable o institución<input name="nombre" value="${escapeHtml(existing?.nombre)}" maxlength="160" required></label><label>Correo<input name="correo" type="email" value="${escapeHtml(existing?.correo)}"></label>
 <label>Teléfono<input name="telefono" value="${escapeHtml(existing?.telefono)}"></label><label>Canal oficial de reporte<input name="canal" value="${escapeHtml(existing?.canal)}" placeholder="Plataforma, radio, teléfono, correo..." required></label>
 <label>Tiempo esperado de respuesta<input name="tiempoRespuesta" value="${escapeHtml(existing?.tiempoRespuesta)}" placeholder="Ej. 30 minutos, 2 horas"></label>
 <div class="dialog-actions"><button type="button" class="secondary cancel">Cancelar</button><button>Guardar actor</button></div></form>`;
 document.body.append(dialog);dialog.showModal();bindCancel(dialog);const form=dialog.querySelector('form');
 form.elements.usuario.oninput=()=>{const user=users.find(item=>item.id===form.elements.usuario.value);if(user){form.elements.nombre.value=user.nombre;form.elements.correo.value=user.correo||'';form.elements.telefono.value=user.telefono||''}};
 form.onsubmit=event=>{event.preventDefault();const values=Object.fromEntries(new FormData(form)),record={territorio:territoryId,problema:problemKey,etapa:stage,nombre:values.nombre.trim(),correo:values.correo.trim(),telefono:values.telefono.trim(),canal:values.canal.trim(),tiempoRespuesta:values.tiempoRespuesta.trim(),actualizadoEn:new Date().toISOString(),actualizadoPor:session?.email||''};
  if(existing)Object.assign(existing,record);else data.actoresCOE.push({id:crypto.randomUUID(),...record});auditChange('ASIGNAR_ACTOR_COE','actor-coe',existing?.id||stage,record.nombre);save();dialog.close();dialog.remove();refresh();
 };
}
const COE_WORKGROUPS=[
 {id:'MTT1',type:'MTT humanitaria',name:'Agua segura, saneamiento y residuos',objective:'Garantizar agua segura, saneamiento y manejo de residuos para la población afectada.',input:'Daños, demanda, calidad y cobertura',output:'Plan de abastecimiento, saneamiento y residuos',destination:'Sala de Situación / Plenaria'},
 {id:'MTT2',type:'MTT humanitaria',name:'Salud y atención prehospitalaria',objective:'Coordinar vigilancia, atención sanitaria y atención prehospitalaria.',input:'Afectados, capacidad sanitaria y alertas epidemiológicas',output:'Plan sanitario, referencia y protección de la salud',destination:'Sala de Situación / Plenaria'},
 {id:'MTT3',type:'MTT humanitaria',name:'Servicios básicos esenciales',objective:'Restablecer y sostener servicios esenciales afectados por el evento.',input:'Daños y continuidad de energía, telecomunicaciones y servicios',output:'Prioridades de restablecimiento y continuidad',destination:'Sala de Situación / Plenaria'},
 {id:'MTT4',type:'MTT humanitaria',name:'Alojamientos y asistencia humanitaria',objective:'Organizar alojamiento temporal y asistencia digna, suficiente y oportuna.',input:'Evacuados, necesidades, capacidad y brechas',output:'Plan de alojamiento y distribución de asistencia',destination:'Sala de Situación / Plenaria'},
 {id:'MTT5',type:'MTT complementaria',name:'Educación en emergencia',objective:'Asegurar protección y continuidad educativa en condiciones de emergencia.',input:'Daños, estudiantes afectados y espacios disponibles',output:'Plan de continuidad educativa y espacios temporales',destination:'Sala de Situación / Plenaria'},
 {id:'MTT6',type:'MTT complementaria',name:'Medios de vida y productividad',objective:'Proteger y recuperar medios de vida y actividades productivas prioritarias.',input:'Pérdidas, cadenas afectadas y población dependiente',output:'Plan de protección y recuperación temprana',destination:'Sala de Situación / Plenaria'},
 {id:'MTT7',type:'MTT complementaria',name:'Infraestructura esencial y vivienda',objective:'Evaluar daños y priorizar seguridad, habilitación y recuperación de infraestructura y vivienda.',input:'Evaluaciones, habitabilidad, conectividad y criticidad',output:'Prioridades de intervención y soluciones temporales',destination:'Sala de Situación / Plenaria'},
 {id:'GT-LOG',type:'Grupo de trabajo',name:'Apoyo logístico',objective:'Proveer recursos, transporte, abastecimiento y soporte para las operaciones aprobadas.',input:'Requerimientos aprobados por MTT y Plenaria',output:'Plan logístico, despacho y trazabilidad de recursos',destination:'MTT solicitante / Plenaria'},
 {id:'GT-SEG',type:'Grupo de trabajo',name:'Seguridad y control',objective:'Ejecutar seguridad, control, vigilancia y apoyo al orden durante la respuesta.',input:'Zonas, operaciones y restricciones de seguridad',output:'Plan de seguridad, control y protección operativa',destination:'MTT / Plenaria'},
 {id:'GT-BR',type:'Grupo de trabajo',name:'Búsqueda y rescate',objective:'Coordinar búsqueda, salvamento, rescate y primera respuesta especializada.',input:'Personas desaparecidas, atrapadas o aisladas y condiciones de acceso',output:'Plan de operación, resultados y necesidades de apoyo',destination:'Sala de Situación / Plenaria'}
];
function workgroupConfig(unitId,territoryId){
 return (data.equiposCOE||[]).find(item=>item.unidad===unitId&&item.territorio===territoryId)||{};
}
function workgroupsPage(){
 const assignedUser=(data.usuarios||[]).find(user=>normalizeEmail(user.correo)===normalizeEmail(session?.email));
 const territories=[...(data.territorios||[])].filter(item=>isAdmin()||!assignedUser||(normalizeText(item.provincia)===normalizeText(assignedUser.provincia)&&normalizeText(item.canton)===normalizeText(assignedUser.canton))).sort((a,b)=>`${a.provincia}${a.canton}`.localeCompare(`${b.provincia}${b.canton}`,'es'));
 $('#content').innerHTML=`<div class="risk-lead workgroup-lead"><div><span class="eyebrow">Implementación técnica y soporte operativo</span><h3>¿Qué debe producir cada mesa y qué está impidiendo cumplirlo?</h3><p>Gestiona objetivos, responsables, participantes, entradas, actividades, productos y entrega de información a Sala de Situación y Plenaria.</p></div><button id="workgroupGuide" class="secondary">¿Cómo gestionar una mesa?</button></div>
 <div class="panel workgroup-panel"><div class="toolbar workgroup-filters"><select id="workTerritory">${territories.map(item=>`<option value="${escapeHtml(item.id)}">${escapeHtml(item.provincia)} · ${escapeHtml(item.canton)}</option>`).join('')}</select>
 <select id="workType"><option value="">MTT y grupos de trabajo</option><option>MTT humanitaria</option><option>MTT complementaria</option><option>Grupo de trabajo</option></select><button id="newWorkActivity">Nueva actividad</button></div>
 <div id="workSummary"></div><div id="workUnits"></div></div>
 <div id="workDetail"></div>`;
 let selectedUnit=COE_WORKGROUPS[0].id;
 const paint=()=>{
  const territoryId=$('#workTerritory').value,type=$('#workType').value,activities=(data.actividadesCOE||[]).filter(item=>item.territorio===territoryId),units=COE_WORKGROUPS.filter(unit=>!type||unit.type===type);
  const configured=units.filter(unit=>workgroupConfig(unit.id,territoryId).lider).length,pending=activities.filter(item=>item.estado!=='Completada').length;
  const overdue=activities.filter(item=>item.estado!=='Completada'&&item.fechaLimite&&item.fechaLimite<new Date().toISOString().slice(0,10)).length,products=activities.filter(item=>item.producto&&item.estado==='Completada').length;
  $('#workSummary').innerHTML=`<div class="cards work-cards"><div class="card"><span>Unidades configuradas</span><strong>${configured}/${units.length}</strong><small>Con líder asignado</small></div><div class="card"><span>Actividades abiertas</span><strong>${pending}</strong><small>Requieren seguimiento</small></div><div class="card"><span>Actividades vencidas</span><strong>${overdue}</strong><small>Plazo superado</small></div><div class="card"><span>Productos entregados</span><strong>${products}</strong><small>Actividades cerradas con producto</small></div></div>`;
  $('#workUnits').innerHTML=`<div class="work-unit-grid">${units.map(unit=>{const config=workgroupConfig(unit.id,territoryId),unitActivities=activities.filter(item=>item.unidad===unit.id),gaps=[];if(!config.lider)gaps.push('líder');if(!config.gestorInformacion)gaps.push('gestor de información');if(!config.instituciones)gaps.push('participantes');if(!unitActivities.length)gaps.push('actividades');return `<button class="work-unit ${gaps.length?'gap':'ready'} ${selectedUnit===unit.id?'selected':''}" data-unit="${unit.id}"><span>${escapeHtml(unit.id)}</span><b>${escapeHtml(unit.name)}</b><small>${unitActivities.length} actividades · ${gaps.length?`Falta ${escapeHtml(gaps.join(', '))}`:'Estructura completa'}</small></button>`}).join('')}</div>`;
  document.querySelectorAll('.work-unit').forEach(button=>button.onclick=()=>{selectedUnit=button.dataset.unit;paint();paintWorkDetail(territoryId,selectedUnit,paint)});
  if(!units.some(unit=>unit.id===selectedUnit))selectedUnit=units[0]?.id||COE_WORKGROUPS[0].id;
  paintWorkDetail(territoryId,selectedUnit,paint);
 };
 $('#workTerritory').oninput=paint;$('#workType').oninput=paint;$('#newWorkActivity').onclick=()=>openWorkActivityForm($('#workTerritory').value,selectedUnit,null,paint);
 $('#workgroupGuide').onclick=()=>startGuide('instituciones',true);paint();
}
function paintWorkDetail(territoryId,unitId,refresh){
 const unit=COE_WORKGROUPS.find(item=>item.id===unitId);if(!unit)return;
 const config=workgroupConfig(unitId,territoryId),activities=(data.actividadesCOE||[]).filter(item=>item.territorio===territoryId&&item.unidad===unitId);
 $('#workDetail').innerHTML=`<section class="panel work-detail"><div class="toolbar"><div><span class="eyebrow">${escapeHtml(unit.type)}</span><h3>${escapeHtml(unit.id)} · ${escapeHtml(unit.name)}</h3></div><button id="configureWorkgroup" class="secondary">Configurar mesa</button></div>
 <div class="work-objective"><small>Objetivo operativo</small><p>${escapeHtml(config.objetivo||unit.objective)}</p><div><span><b>Líder:</b> ${escapeHtml(config.lider||'No asignado')}</span><span><b>Gestión de información:</b> ${escapeHtml(config.gestorInformacion||'No asignada')}</span><span><b>Participantes:</b> ${escapeHtml(config.instituciones||'No registrados')}</span></div></div>
 <div class="work-flow"><div><small>Entrada necesaria</small><b>${escapeHtml(config.entrada||unit.input)}</b></div><span>→</span><div><small>Actividades de la mesa</small><b>${activities.length} registradas</b></div><span>→</span><div><small>Producto esperado</small><b>${escapeHtml(config.productoEsperado||unit.output)}</b></div><span>→</span><div><small>Destino</small><b>${escapeHtml(config.destino||unit.destination)}</b></div></div>
 <div class="toolbar"><b>Plan de actividades</b><button id="addUnitActivity">Nueva actividad</button></div><div class="table-scroll"><table><thead><tr><th>Actividad / objetivo específico</th><th>Responsable</th><th>Plazo</th><th>Estado</th><th>Producto o evidencia</th><th>Flujo</th><th></th></tr></thead><tbody>${activities.length?activities.map(item=>`<tr><td><b>${escapeHtml(item.actividad)}</b><small class="table-note">${escapeHtml(item.objetivoEspecifico||'Sin objetivo específico')}</small></td><td>${escapeHtml(item.responsable)}</td><td>${escapeHtml(item.fechaLimite||'Sin plazo')}</td><td>${badge('estado',item.estado)}</td><td>${escapeHtml(item.producto||'Pendiente')}</td><td><small>${escapeHtml(item.entrada||'Entrada por definir')} → ${escapeHtml(item.destino||unit.destination)}</small></td><td><button class="secondary edit-work-activity" data-id="${escapeHtml(item.id)}">Editar</button></td></tr>`).join(''):'<tr><td colspan="7"><div class="empty">La mesa todavía no tiene actividades registradas.</div></td></tr>'}</tbody></table></div></section>`;
 $('#configureWorkgroup').onclick=()=>openWorkgroupConfig(territoryId,unit,config,refresh);$('#addUnitActivity').onclick=()=>openWorkActivityForm(territoryId,unitId,null,refresh);
 document.querySelectorAll('.edit-work-activity').forEach(button=>button.onclick=()=>openWorkActivityForm(territoryId,unitId,activities.find(item=>item.id===button.dataset.id),refresh));
}
function openWorkgroupConfig(territoryId,unit,config,refresh){
 const dialog=document.createElement('dialog');dialog.className='site-dialog';dialog.innerHTML=`<form class="dialog-body"><span class="eyebrow">${escapeHtml(unit.id)}</span><h3>Configurar ${escapeHtml(unit.name)}</h3><div class="form-grid">
 <label class="full">Objetivo operativo<textarea name="objetivo" rows="2">${escapeHtml(config.objetivo||unit.objective)}</textarea></label><label>Líder de la mesa<input name="lider" value="${escapeHtml(config.lider)}" required></label><label>Gestor de información<input name="gestorInformacion" value="${escapeHtml(config.gestorInformacion)}" required></label>
 <label class="full">Instituciones participantes<textarea name="instituciones" rows="2" placeholder="Una o varias instituciones">${escapeHtml(config.instituciones)}</textarea></label><label class="full">Entrada requerida<textarea name="entrada" rows="2">${escapeHtml(config.entrada||unit.input)}</textarea></label>
 <label class="full">Producto esperado<textarea name="productoEsperado" rows="2">${escapeHtml(config.productoEsperado||unit.output)}</textarea></label><label>Destino de la información<input name="destino" value="${escapeHtml(config.destino||unit.destination)}"></label><label>Frecuencia de reporte<input name="frecuencia" value="${escapeHtml(config.frecuencia)}" placeholder="Ej. cada 4 horas"></label></div>
 <div class="dialog-actions"><button type="button" class="secondary cancel">Cancelar</button><button>Guardar configuración</button></div></form>`;document.body.append(dialog);dialog.showModal();bindCancel(dialog);
 dialog.querySelector('form').onsubmit=event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.target)),record={territorio:territoryId,unidad:unit.id,...values,actualizadoEn:new Date().toISOString(),actualizadoPor:session?.email||''};if(config.unidad)Object.assign(config,record);else data.equiposCOE.push({id:crypto.randomUUID(),...record});auditChange('CONFIGURAR_UNIDAD_COE','equipo-coe',unit.id,values.lider);save();dialog.close();dialog.remove();refresh()};
}
function openWorkActivityForm(territoryId,unitId,record,refresh){
 const dialog=document.createElement('dialog'),unit=COE_WORKGROUPS.find(item=>item.id===unitId);dialog.className='site-dialog';dialog.innerHTML=`<form class="dialog-body"><span class="eyebrow">${escapeHtml(unit.id)} · ${escapeHtml(unit.name)}</span><h3>${record?'Editar':'Nueva'} actividad</h3><div class="form-grid">
 <label class="full">Actividad<input name="actividad" value="${escapeHtml(record?.actividad)}" required></label><label class="full">Objetivo específico<input name="objetivoEspecifico" value="${escapeHtml(record?.objetivoEspecifico)}" placeholder="Resultado concreto que debe lograr"></label>
 <label>Responsable<input name="responsable" value="${escapeHtml(record?.responsable)}" required></label><label>Fecha límite<input name="fechaLimite" type="date" value="${escapeHtml(record?.fechaLimite)}" required></label>
 <label>Estado<select name="estado">${['Planificada','En ejecución','Detenida','Completada'].map(value=>`<option ${value===(record?.estado||'Planificada')?'selected':''}>${value}</option>`).join('')}</select></label><label>Avance (%)<input name="avance" type="number" min="0" max="100" value="${escapeHtml(record?.avance??0)}"></label>
 <label class="full">Información de entrada<input name="entrada" value="${escapeHtml(record?.entrada)}" placeholder="Reporte, evaluación, requerimiento o decisión que activa la actividad"></label><label class="full">Producto o evidencia<input name="producto" value="${escapeHtml(record?.producto)}" placeholder="Informe, mapa, listado, servicio, acta o evidencia verificable"></label>
 <label>Destino del producto<input name="destino" value="${escapeHtml(record?.destino||unit.destination)}"></label><label>Brecha o restricción<input name="brecha" value="${escapeHtml(record?.brecha)}"></label></div><div class="form-error error" role="alert"></div>
 <div class="dialog-actions"><button type="button" class="secondary cancel">Cancelar</button><button>Guardar actividad</button></div></form>`;document.body.append(dialog);dialog.showModal();bindCancel(dialog);
 dialog.querySelector('form').onsubmit=event=>{event.preventDefault();const values=Object.fromEntries(new FormData(event.target)),error=dialog.querySelector('.form-error');if(values.estado==='Completada'&&!values.producto.trim()){error.textContent='Para completar la actividad registra el producto o evidencia entregada.';return}if(values.estado==='Completada')values.avance='100';
  const activity={territorio:territoryId,unidad:unitId,...values,avance:Number(values.avance||0),actualizadoEn:new Date().toISOString(),actualizadoPor:session?.email||''};if(record)Object.assign(record,activity);else data.actividadesCOE.push({id:crypto.randomUUID(),...activity,creadoEn:new Date().toISOString()});auditChange(values.estado==='Completada'?'CERRAR_ACTIVIDAD_COE':'GUARDAR_ACTIVIDAD_COE','actividad-coe',record?.id||unitId,values.actividad);save();dialog.close();dialog.remove();refresh()};
}
function territoriesPage(){
 const rows=territoryOperationalData(),withPlan=rows.filter(row=>row.hasPlan).length,withMentions=rows.filter(row=>row.mentions).length;
 const withoutSites=rows.filter(row=>!row.sites.length).length,urgent=rows.filter(row=>row.urgent).length;
 const provinces=[...new Set(rows.map(row=>row.territory.provincia))].sort((a,b)=>a.localeCompare(b,'es'));
 $('#content').innerHTML=`<div class="risk-lead territory-lead"><div><span class="eyebrow">Cobertura y capacidad territorial</span><h3>¿Qué tiene cada territorio y qué debe resolver ahora?</h3><p>El estado combina planes recibidos, lugares mencionados, fichas gestionables, acciones y alertas abiertas. Las menciones documentales no equivalen todavía a sitios únicos.</p></div><button id="territoryGuide" class="secondary">¿Cómo leer esta pantalla?</button></div>
 <div class="cards territory-cards"><button class="card territory-stat" data-filter=""><span>Territorios activos</span><strong>${rows.length}</strong><small>Catálogo cantonal operativo</small></button>
 <button class="card territory-stat" data-filter="plan"><span>Con plan revisado</span><strong>${withPlan}</strong><small>${rows.length-withPlan} sin plan asociado al cantón</small></button>
 <button class="card territory-stat" data-filter="mentions"><span>Con lugares mencionados</span><strong>${withMentions}</strong><small>Cuentan con punto de partida documental</small></button>
 <button class="card territory-stat" data-filter="no-sites"><span>Sin fichas gestionables</span><strong>${withoutSites}</strong><small>Requieren depuración y validación</small></button>
 <button class="card territory-stat" data-filter="urgent"><span>Con alertas urgentes</span><strong>${urgent}</strong><small>Necesitan atención prioritaria</small></button></div>
 <div class="panel"><div class="toolbar territory-toolbar"><input id="territorySearch" aria-label="Buscar territorio" placeholder="Buscar provincia o cantón...">
 <select id="territoryProvince" aria-label="Filtrar provincia"><option value="">Todas las provincias</option>${provinces.map(value=>`<option>${escapeHtml(value)}</option>`).join('')}</select>
 <select id="territoryState" aria-label="Filtrar estado"><option value="">Todos los estados</option>${['Sin plan','Atención inmediata','Sin fichas gestionables','Sin acciones','En gestión'].map(value=>`<option>${value}</option>`).join('')}</select>
 <button id="addTerritory" class="secondary">Nuevo territorio</button></div><div id="territoryTable"></div></div>`;
 let quickFilter='';
 const paint=()=>{
  const query=normalizeText($('#territorySearch').value),province=$('#territoryProvince').value,state=$('#territoryState').value;
  const filtered=rows.filter(row=>(!query||normalizeText(`${row.territory.provincia} ${row.territory.canton}`).includes(query))&&(!province||row.territory.provincia===province)&&(!state||row.status===state)
   &&(!quickFilter||(quickFilter==='plan'&&row.hasPlan)||(quickFilter==='mentions'&&row.mentions)||(quickFilter==='no-sites'&&!row.sites.length)||(quickFilter==='urgent'&&row.urgent)));
  $('#territoryTable').innerHTML=filtered.length?`<div class="table-scroll"><table class="territory-matrix"><thead><tr><th>Territorio</th><th>Plan</th><th>Menciones</th><th>Pendientes</th><th>Fichas</th><th>Acciones</th><th>Alertas</th><th>Estado operativo</th><th></th></tr></thead><tbody>${filtered.map(row=>`<tr>
   <td><b>${escapeHtml(row.territory.canton)}</b><small class="table-note">${escapeHtml(row.territory.provincia)}</small></td>
   <td>${row.hasPlan?`<span class="badge success">${escapeHtml(row.review.score)}%</span>`:'<span class="badge danger">Sin plan</span>'}</td>
   <td><b>${row.mentions}</b></td><td><b>${row.pending}</b></td><td><b>${row.sites.length}</b></td><td><b>${row.actions.length}</b></td>
   <td><b class="${row.urgent?'danger-text':''}">${row.alerts.length}</b>${row.urgent?`<small class="table-note danger-text">${row.urgent} urgentes</small>`:''}</td>
   <td><span class="badge ${row.status==='En gestión'?'success':row.status==='Atención inmediata'?'danger':'warn'}">${escapeHtml(row.status)}</span><small class="table-note">${escapeHtml(row.next)}</small></td>
   <td><div class="row-actions"><button class="secondary territory-detail" data-id="${escapeHtml(row.territory.id)}">Ver panorama</button><button class="link-button territory-edit" data-id="${escapeHtml(row.territory.id)}">Editar</button></div></td></tr>`).join('')}</tbody></table></div>`:'<div class="empty">No existen territorios que coincidan con los filtros.</div>';
 };
 ['territorySearch','territoryProvince','territoryState'].forEach(id=>$(`#${id}`).oninput=()=>{quickFilter='';paint()});
 document.querySelectorAll('.territory-stat').forEach(button=>button.onclick=()=>{quickFilter=button.dataset.filter;$('#territoryState').value='';paint()});
 $('#addTerritory').onclick=()=>openForm('territorios',null);
 $('#territoryTable').onclick=event=>{const row=rows.find(item=>item.territory.id===event.target.dataset.id);if(!row)return;if(event.target.classList.contains('territory-detail'))openTerritoryOverview(row);if(event.target.classList.contains('territory-edit'))openForm('territorios',row.territory)};
 $('#territoryGuide').onclick=()=>startGuide('territorios',true);paint();
}
function openTerritoryOverview(row){
 const dialog=document.createElement('dialog'),openActions=row.actions.filter(action=>action.estado!=='Completada'),completed=row.actions.filter(action=>action.estado==='Completada');
 dialog.className='detail-dialog';
 dialog.innerHTML=`<div class="dialog-body territory-overview"><div class="detail-heading"><div><span class="eyebrow">${escapeHtml(row.territory.provincia)}</span><h3>${escapeHtml(row.territory.canton)}</h3><p>${escapeHtml(row.status)}</p></div><button type="button" class="icon-button cancel" aria-label="Cerrar panorama">×</button></div>
 <div class="territory-overview-grid"><section><small>Plan revisado</small><strong>${row.hasPlan?`${escapeHtml(row.review.score)}%`:'No recibido'}</strong></section><section><small>Menciones / pendientes</small><strong>${row.mentions} / ${row.pending}</strong></section><section><small>Fichas gestionables</small><strong>${row.sites.length}</strong></section><section><small>Acciones abiertas / completas</small><strong>${openActions.length} / ${completed.length}</strong></section><section><small>Alertas abiertas / urgentes</small><strong>${row.alerts.length} / ${row.urgent}</strong></section></div>
 <section class="next-step-card"><span class="eyebrow">Siguiente paso recomendado</span><h4>${escapeHtml(row.next)}</h4><p>${row.status==='Sin plan'?'Sin documento no es posible verificar escenarios, lugares y acciones propuestas.':row.status==='Atención inmediata'?'Prioriza las preguntas urgentes, asigna responsable y compromiso verificable.':row.status==='Sin fichas gestionables'?'Depura menciones, completa los campos territoriales y envía las fichas a revisión técnica.':row.status==='Sin acciones'?'Vincula medidas concretas a las fichas con responsable, plazo y evidencia esperada.':'Revisa vencimientos, avance y evidencia antes de cerrar acciones.'}</p></section>
 <div class="dialog-actions"><button class="secondary go-reviews">Revisar plan</button><button class="secondary go-sites">Gestionar fichas</button><button class="secondary go-decisions">Atender decisiones</button><button class="cancel-bottom">Cerrar</button></div></div>`;
 document.body.append(dialog);dialog.showModal();const close=()=>{dialog.close();dialog.remove()};
 dialog.querySelector('.cancel').onclick=close;dialog.querySelector('.cancel-bottom').onclick=close;
 [['.go-reviews','revision'],['.go-sites','sitios'],['.go-decisions','decisiones']].forEach(([selector,page])=>dialog.querySelector(selector).onclick=()=>{close();current=page;render()});
 dialog.addEventListener('cancel',()=>dialog.remove());
}
function tablePage(type){
 const cols=schemas[type],rows=data[type]||[];
 $('#content').innerHTML=`${type==='usuarios'?'<div class="review-notice"><b>Contacto no significa acceso</b><span>“Activo” identifica un contacto vigente; “Acceso habilitado” confirma que puede ingresar a la plataforma.</span></div>':''}<div class="panel"><div class="toolbar"><input id="search" aria-label="Buscar registros" placeholder="Buscar..."><button id="add">Nuevo registro</button></div>
 <div id="tableWrap"></div></div>`;
 const paint=()=>{
  const query=$('#search').value.toLowerCase();
  const filtered=rows.filter(row=>JSON.stringify(row).toLowerCase().includes(query));
  $('#tableWrap').innerHTML=filtered.length?`<table><thead><tr>${cols.map(col=>`<th>${col[1]}</th>`).join('')}${type==='usuarios'?'<th>Acceso</th>':''}<th></th></tr></thead>
  <tbody>${filtered.map((row,index)=>`<tr>${cols.map(col=>`<td>${badge(col[0],displayValue(type,col[0],row[col[0]]??''))}</td>`).join('')}
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
function displayValue(type,key,value){
 if(type==='sitios'&&key==='territorio'){
  const territory=data.territorios.find(item=>item.id===value);
  return territory?`${territory.canton} · ${territory.provincia}`:value;
 }
 return value;
}
function accessBadge(user){
 return user.authUid?badge('estado',user.estado):'<span class="badge neutral">Sin acceso</span>';
}
function badge(key,value){
 if(key==='estado'){
  const style=String(value).includes('Pendiente')?'warn':value==='Inactivo'?'danger':'';
  return `<span class="badge ${style}">${escapeHtml(value)}</span>`;
 }
 if(key==='nivel'){
  const style=value==='Muy alto'||value==='Alto'?'danger':value==='Medio'?'warn':'';
  return `<span class="badge ${style}">${escapeHtml(value)}</span>`;
 }
 return escapeHtml(value);
}
function openForm(type,record){
 if(type==='usuarios')return openUserForm(record);
 if(type==='sitios')return openSiteForm(record);
 if(type==='acciones')return openActionForm(record);
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
function openSiteForm(record){
 const dialog=document.createElement('dialog');
 const threats=['Inundación','Inundación / lluvias intensas','Inundación / lluvias intensas + socavamiento','Inundación / anegamiento','Socavamiento','Deslizamiento','Sequía','Sismo','Incendio forestal','Erosión','Tsunami','Otro'];
 const levels=['Bajo','Medio','Alto','Muy alto'];
 const statuses=['Pendiente de validación territorial','Identificado','En evaluación','En seguimiento','Intervenido','Cerrado'];
 const feasibilities=['Por evaluar','Alta','Media','Baja'];
 const gapTypes=['Por determinar','Sin brecha','Financiera','Técnica','Infraestructura','Equipamiento','Información','Coordinación institucional','Participación comunitaria'];
 const selected=(value,current)=>value===current?'selected':'';
 const territoryOptions=[...data.territorios]
  .filter(item=>item.estado==='Activo'||item.id===record?.territorio)
  .sort((a,b)=>`${a.provincia}${a.canton}`.localeCompare(`${b.provincia}${b.canton}`,'es'))
  .map(item=>`<option value="${escapeHtml(item.id)}" ${selected(item.id,record?.territorio)}>${escapeHtml(item.provincia)} · ${escapeHtml(item.canton)}</option>`).join('');
 dialog.className='site-dialog';
 dialog.innerHTML=`<form class="dialog-body"><h3>${record?'Editar':'Nuevo'} sitio crítico</h3>
 <p class="muted">Registra la ubicación y condición de riesgo identificada en territorio.</p>
 <div class="form-grid">
  <label class="full">Nombre o referencia del sitio<input name="nombre" value="${escapeHtml(record?.nombre)}" maxlength="120" required></label>
  <label class="full">Territorio<select name="territorio" required><option value="">Selecciona un territorio</option>${territoryOptions}</select></label>
  <label>Amenaza<select name="amenaza" required><option value="">Selecciona</option>${threats.map(value=>`<option ${selected(value,record?.amenaza)}>${value}</option>`).join('')}</select></label>
  <label>Nivel de criticidad<select name="nivel" required><option value="">Selecciona</option>${levels.map(value=>`<option ${selected(value,record?.nivel)}>${value}</option>`).join('')}</select></label>
  <label>Facilidad de solución<select name="facilidadSolucion" required><option value="">Selecciona</option>${feasibilities.map(value=>`<option ${selected(value,record?.facilidadSolucion)}>${value}</option>`).join('')}</select></label>
  <label class="full">Brecha principal<select name="brechaPrincipal" required>${gapTypes.map(value=>`<option ${selected(value,record?.brechaPrincipal||'Sin brecha')}>${value}</option>`).join('')}</select></label>
  <label>Estado<select name="estado" required>${statuses.map(value=>`<option ${selected(value,record?.estado||'Identificado')}>${value}</option>`).join('')}</select></label>
  <label>Fecha de identificación<input name="fechaRegistro" type="date" value="${escapeHtml(record?.fechaRegistro||new Date().toISOString().slice(0,10))}" required></label>
  <label>Latitud<input name="latitud" type="number" min="-5.1" max="1.6" step="any" value="${escapeHtml(record?.latitud)}" placeholder="-2.170998"></label>
  <label>Longitud<input name="longitud" type="number" min="-81.5" max="-74.5" step="any" value="${escapeHtml(record?.longitud)}" placeholder="-79.922359"></label>
  <label class="full">Dirección o referencia<input name="direccion" value="${escapeHtml(record?.direccion)}" maxlength="180" placeholder="Sector, vía, comunidad o punto de referencia"></label>
  <label class="full">Descripción<textarea name="descripcion" rows="3" maxlength="600" placeholder="Describe la condición observada y la población o infraestructura expuesta">${escapeHtml(record?.descripcion)}</textarea></label>
  <label class="full">Detalle de las brechas<textarea name="brechas" rows="3" maxlength="600" placeholder="Indica qué recurso, capacidad, coordinación o información hace falta">${escapeHtml(record?.brechas)}</textarea></label>
 </div>
 <div class="form-error error" role="alert"></div>
 <div class="dialog-actions"><button type="button" class="secondary cancel">Cancelar</button><button>Guardar sitio</button></div></form>`;
 document.body.append(dialog);dialog.showModal();bindCancel(dialog);
 const form=dialog.querySelector('form');
 form.onsubmit=event=>{
  event.preventDefault();
  const values=Object.fromEntries(new FormData(form));
  const error=dialog.querySelector('.form-error');
  const normalizedName=values.nombre.trim().toLocaleLowerCase('es');
  const duplicate=data.sitios.some(item=>item.id!==record?.id&&item.territorio===values.territorio&&String(item.nombre).trim().toLocaleLowerCase('es')===normalizedName);
  if(duplicate){error.textContent='Ya existe un sitio con este nombre en el territorio seleccionado.';return}
  if((values.latitud&&!values.longitud)||(!values.latitud&&values.longitud)){error.textContent='Ingresa tanto la latitud como la longitud, o deja ambas vacías.';return}
  const siteValues={
   nombre:values.nombre.trim(),territorio:values.territorio,amenaza:values.amenaza,nivel:values.nivel,estado:values.estado,
   facilidadSolucion:values.facilidadSolucion,brechaPrincipal:values.brechaPrincipal,brechas:values.brechas.trim(),
   fechaRegistro:values.fechaRegistro,latitud:values.latitud?Number(values.latitud):'',longitud:values.longitud?Number(values.longitud):'',
   direccion:values.direccion.trim(),descripcion:values.descripcion.trim(),origen:record?.origen||'Reporte territorial',actualizadoEn:new Date().toISOString()
  };
  if(record)Object.assign(record,siteValues);
  else data.sitios.push({id:crypto.randomUUID(),...siteValues,creadoEn:new Date().toISOString(),creadoPor:session?.email||''});
  save();dialog.close();dialog.remove();render();
 };
}
function openActionForm(record,defaultSiteId=''){
 if(!data.sitios.length){return alert('Primero debes registrar al menos un sitio crítico.')}
 const dialog=document.createElement('dialog');
 const selected=(value,current)=>value===current?'selected':'';
 const sites=[...data.sitios].sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
 dialog.className='site-dialog';
 dialog.innerHTML=`<form class="dialog-body"><h3>${record?'Editar':'Nueva'} acción</h3><p class="muted">Vincula la intervención con un sitio crítico y define su seguimiento.</p>
 <div id="actionTechnicalContext" class="action-technical-context"></div>
 <div class="form-grid">
  <label class="full">Sitio crítico<select name="sitioId" required><option value="">Selecciona un sitio</option>${sites.map(site=>`<option value="${escapeHtml(site.id)}" ${selected(site.id,record?.sitioId||defaultSiteId)}>${escapeHtml(site.nombre)} · ${escapeHtml(displayValue('sitios','territorio',site.territorio))}</option>`).join('')}</select></label>
  <label class="full">Acción requerida<input name="accion" value="${escapeHtml(record?.accion)}" maxlength="180" required></label>
  <label class="full">Objetivo verificable<textarea name="objetivo" rows="2" maxlength="360" required placeholder="¿Qué condición de riesgo debe cambiar y para quién?">${escapeHtml(record?.objetivo)}</textarea></label>
  <label>Responsable<input name="responsable" value="${escapeHtml(record?.responsable)}" maxlength="120" required></label>
  <label>Mesa, grupo o institución de apoyo<input name="dependencia" value="${escapeHtml(record?.dependencia)}" maxlength="160" placeholder="Dependencia necesaria para ejecutar"></label>
  <label>Estado<select name="estado" required>${['Planificada','En ejecución','Detenida','Completada'].map(value=>`<option ${selected(value,record?.estado||'Planificada')}>${value}</option>`).join('')}</select></label>
  <label>Fecha de inicio<input name="fechaInicio" type="date" value="${escapeHtml(record?.fechaInicio||new Date().toISOString().slice(0,10))}" required></label>
  <label>Fecha límite<input name="fechaLimite" type="date" value="${escapeHtml(record?.fechaLimite)}" required></label>
  <label>Avance (%)<input name="avance" type="number" min="0" max="100" step="1" value="${escapeHtml(record?.avance??0)}" required></label>
  <label>Costo estimado (USD)<input name="costoEstimado" type="number" min="0" step="0.01" value="${escapeHtml(record?.costoEstimado)}"></label>
  <label>Producto esperado<input name="producto" value="${escapeHtml(record?.producto)}" maxlength="240" required placeholder="Obra, informe, servicio o condición conseguida"></label>
  <label>Indicador de cumplimiento<input name="indicador" value="${escapeHtml(record?.indicador)}" maxlength="240" required placeholder="Unidad, cantidad, cobertura o porcentaje"></label>
  <label class="full">Criterio de cierre<input name="criterioCierre" value="${escapeHtml(record?.criterioCierre)}" maxlength="360" required placeholder="Qué debe comprobarse antes de marcarla como completada"></label>
  <label class="full">Evidencia de ejecución<input name="evidencia" value="${escapeHtml(record?.evidencia)}" maxlength="500" placeholder="Informe, acta, fotografía, enlace o documento verificable"></label>
  <label class="full">Observaciones<textarea name="observaciones" rows="3" maxlength="600">${escapeHtml(record?.observaciones)}</textarea></label>
 </div><div class="form-error error" role="alert"></div>
 <div class="dialog-actions"><button type="button" class="secondary cancel">Cancelar</button><button>Guardar acción</button></div></form>`;
 document.body.append(dialog);dialog.showModal();bindCancel(dialog);
 const form=dialog.querySelector('form');
 const paintTechnicalContext=()=>{const site=data.sitios.find(item=>item.id===form.elements.sitioId.value),container=dialog.querySelector('#actionTechnicalContext');if(!site){container.innerHTML='';return}const territory=displayValue('sitios','territorio',site.territorio);container.innerHTML=`<div><b>Información que debe contrastarse antes de ejecutar</b><small>Estas fichas podrán vincularse a la acción y citarse en el informe.</small></div>${technicalFicheCards(relevantTechnicalFiches({actionId:record?.id,siteId:site.id,province:territory.split(' · ')[1]||'',territory:territory.split(' · ')[0]||'',threat:site.amenaza}),{actionId:record?.id||'',siteId:site.id})}`};form.elements.sitioId.onchange=paintTechnicalContext;paintTechnicalContext();
 form.onsubmit=event=>{
  event.preventDefault();const values=Object.fromEntries(new FormData(form));const error=dialog.querySelector('.form-error');
  if(values.fechaLimite<values.fechaInicio){error.textContent='La fecha límite no puede ser anterior a la fecha de inicio.';return}
  if(values.estado==='Completada'&&!values.evidencia.trim()){error.textContent='Para completar una acción debes registrar una evidencia verificable.';return}
  if(values.estado==='Completada')values.avance='100';
  const actionValues={sitioId:values.sitioId,accion:values.accion.trim(),objetivo:values.objetivo.trim(),responsable:values.responsable.trim(),dependencia:values.dependencia.trim(),estado:values.estado,
   fechaInicio:values.fechaInicio,fechaLimite:values.fechaLimite,avance:Number(values.avance),costoEstimado:values.costoEstimado?Number(values.costoEstimado):'',
   producto:values.producto.trim(),indicador:values.indicador.trim(),criterioCierre:values.criterioCierre.trim(),evidencia:values.evidencia.trim(),observaciones:values.observaciones.trim(),actualizadoEn:new Date().toISOString()};
  if(record)Object.assign(record,actionValues);
  else data.acciones.push({id:crypto.randomUUID(),...actionValues,creadoEn:new Date().toISOString(),creadoPor:session?.email||''});
  auditChange(values.estado==='Completada'?'CERRAR_ACCION':'GUARDAR_ACCION','accion',record?.id||actionValues.sitioId,values.accion.trim());
  save();dialog.close();dialog.remove();render();
 };
}
function openUserForm(record){
 const dialog=document.createElement('dialog');
 const hasAccess=Boolean(record?.authUid);
 dialog.innerHTML=`<form class="dialog-body"><h3>${record?'Editar':'Nuevo'} usuario</h3>
 ${schemas.usuarios.map(([key,label])=>`<label>${label}</label><input name="${key}" value="${record?.[key]??''}" ${key==='correo'?'type="email"':''} required>`).join('')}
 <label>Rol</label><select name="rol"><option ${['Usuario territorial','Técnico territorial'].includes(record?.rol)?'selected':''}>Técnico territorial</option><option ${record?.rol==='Coordinador COE'?'selected':''}>Coordinador COE</option><option ${record?.rol==='Líder MTT/GT'?'selected':''}>Líder MTT/GT</option><option ${record?.rol==='Tomador de decisión/control'?'selected':''}>Tomador de decisión/control</option><option ${record?.rol==='Administrador'?'selected':''}>Administrador</option></select>
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
  if(record.authUid)await db.collection('perfiles').doc(record.authUid).set({correo:email,nombre:values.nombre,rol:values.rol,provincia:values.provincia,canton:values.canton,estado:values.estado,actualizadoEn:new Date().toISOString()},{merge:true}).catch(()=>{});
  if(toggle.checked&&!hasAccess){
   try{
    const secondaryName=`user-creation-${crypto.randomUUID()}`;
    const secondaryApp=firebase.initializeApp(firebaseConfig,secondaryName);
    const temporary=`CZ5-${crypto.randomUUID()}!aA1`;
    const credential=await secondaryApp.auth().createUserWithEmailAndPassword(email,temporary);
    await credential.user.updateProfile({displayName:values.nombre});
    record.authUid=credential.user.uid;
    await db.collection('perfiles').doc(record.authUid).set({correo:email,nombre:values.nombre,rol:values.rol,provincia:values.provincia,canton:values.canton,estado:values.estado,actualizadoEn:new Date().toISOString()}).catch(()=>{});
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
function openPasswordDialog(required,currentPassword=''){
 const dialog=document.createElement('dialog');
 dialog.innerHTML=`<form class="dialog-body"><h3>Cambiar contraseña</h3>${required?'<p class="notice">Debes definir una contraseña nueva antes de continuar.</p>':''}
 ${currentPassword?'':`<label>Contraseña actual</label><input name="currentPassword" type="password" autocomplete="current-password" required>`}
 <label>Nueva contraseña</label><input name="newPassword" type="password" autocomplete="new-password" required>
 <label>Confirmar contraseña</label><input name="confirmation" type="password" autocomplete="new-password" required>
 <div class="form-error error" role="alert"></div>
 <div class="dialog-actions">${required?'':'<button type="button" class="secondary cancel">Cancelar</button>'}<button>Actualizar</button></div></form>`;
 document.body.append(dialog);dialog.showModal();if(!required)bindCancel(dialog);
 dialog.querySelector('form').onsubmit=async event=>{
  event.preventDefault();const values=Object.fromEntries(new FormData(event.target));const error=dialog.querySelector('.form-error');
  values.currentPassword=currentPassword||values.currentPassword;
  const validation=passwordError(values.newPassword);
  if(validation){error.textContent=validation;return}
  if(values.newPassword!==values.confirmation){error.textContent='Las contraseñas nuevas no coinciden.';return}
  if(values.currentPassword===values.newPassword){error.textContent='La nueva contraseña debe ser diferente.';return}
  try{
   const credential=firebase.auth.EmailAuthProvider.credential(session.email,values.currentPassword);
   await session.reauthenticateWithCredential(credential);
   await session.updatePassword(values.newPassword);
   pendingTemporaryPassword='';
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
const GUIDE_STEPS={
 dashboard:[
  {selector:'.risk-kpi-attention',question:'¿Qué territorios tienen brechas documentales que todavía deben validarse?',answer:'Abre la revisión de planes y contrasta cada hallazgo preliminar con su evidencia antes de emitir una conclusión técnica.',action:'Revisar la evidencia',route:'revision'},
  {selector:'.risk-kpi-urgent',question:'¿Qué lugares, tramos o áreas en riesgo mencionan los planes?',answer:'Revisa el inventario documental y separa las menciones repetidas o incompletas antes de convertirlas en lugares únicos.',action:'Revisar las menciones',route:'sitios'},
  {selector:'.risk-kpi-exposed',question:'¿Cuánta población está documentada y qué parte sigue sin cuantificarse?',answer:'La cifra visible procede solo de las fichas estructuradas. Contrasta cada fuente y completa la exposición faltante en las demás menciones.',action:'Revisar la exposición',route:'sitios'},
  {selector:'.risk-kpi-mitigation',question:'¿Qué fichas gestionables todavía no tienen una acción vinculada?',answer:'Abre el seguimiento de acciones. El indicador se limita a las fichas estructuradas y no supone que todas las menciones del plan ya fueron gestionadas.',action:'Gestionar la mitigación',route:'acciones'}
 ],
 revision:[
  {selector:'.review-notice',title:'Primero: comprender el plan',text:'La evaluación identifica qué existe, qué está parcial y qué no tiene evidencia suficiente.'},
  {selector:'#reviewTable',title:'Selecciona un territorio',text:'Abre “Ver evaluación” para revisar evidencia, páginas, brechas y acciones nuevas antes de validarlas.'}
 ],
 decisiones:[
  {selector:'.decision-intro',title:'El cerebro de SmartRisk',text:'Esta bandeja transforma brechas, sitios sin mitigación y acciones vencidas en preguntas para decidir.'},
  {selector:'#decisionLevel',title:'Atiende lo urgente',text:'Filtra por prioridad. Lo urgente necesita respuesta rápida porque combina ausencia de control o riesgo alto.'},
  {selector:'.decision-card',title:'Lee la pregunta',text:'Cada tarjeta indica qué debe responderse, quién debe intervenir y en cuánto tiempo.'},
  {selector:'.decision-details',title:'Analiza antes de responder',text:'Abre la ficha para contrastar la pregunta con su evidencia y la ruta de escalamiento.'}
 ],
 sitios:[
  {selector:'.site-cards',title:'Entiende el territorio',text:'Compara sitios reportados, origen documental, brechas y ausencia de acciones.'},
  {selector:'#sourceFilter',title:'Distingue el origen',text:'Separa lo importado desde planes ENOS de los nuevos reportes levantados por técnicos.'},
  {selector:'#tableWrap',title:'Prioriza y actúa',text:'Abre la ficha del sitio para revisar exposición, mitigación y vincular una acción concreta.'}
 ],
 acciones:[
  {selector:'.action-flow',title:'Convierte riesgo en control',text:'Empieza por las fichas sin medida, formaliza el compromiso y controla ejecución y cierre verificable.'},
  {selector:'.action-portfolio',title:'Prioriza la cartera real',text:'Cada ficha debe convertirse en una acción con objetivo, responsable, plazo, producto, indicador y criterio de cierre.'},
  {selector:'.action-map-panel,.geo-readiness',title:'Usa geografía solo cuando aporte',text:'El mapa es evidencia opcional para comprobar puntos, tramos o áreas atendidas; no reemplaza el seguimiento operativo ni representa por sí mismo el nivel de riesgo.'}
 ],
 usuarios:[
  {selector:'.coe-filters',title:'Define el problema',text:'El territorio y la situación determinan qué actores, mesas y productos de información se necesitan.'},
  {selector:'#coeFlow',title:'Sigue y completa el flujo',text:'Verde indica una etapa habilitada; rojo muestra responsables, contactos o canales que todavía deben asignarse.'}
 ],
 territorios:[
  {selector:'.territory-cards',title:'Lee la capacidad territorial',text:'Compara cobertura de planes, menciones, fichas gestionables y alertas urgentes.'},
  {selector:'#territoryTable',title:'Encuentra el siguiente paso',text:'Cada territorio resume qué tiene, qué le falta y a qué módulo debes ir para resolverlo.'}
 ],
 instituciones:[
  {selector:'.work-unit-grid',title:'Selecciona la unidad operativa',text:'Compara MTT humanitarias, complementarias y grupos de trabajo; los vacíos aparecen señalados en cada tarjeta.'},
  {selector:'.work-flow',title:'Controla el flujo de productos',text:'Toda actividad debe partir de una entrada, producir evidencia y entregar información a Sala de Situación, otra mesa o Plenaria.'}
 ]
};
let activeGuideClose=null;
function closeActiveGuide(markSeen=true){if(activeGuideClose)activeGuideClose(markSeen)}
function maybeStartGuide(page){
 if(activeGuideClose||!session||document.querySelector('dialog[open]')||!GUIDE_STEPS[page]||localStorage.getItem(`smartrisk-guide-${page}-${normalizeEmail(session.email)}`))return;
 startGuide(page,false);
}
function startGuide(page,force=false){
 if(document.querySelector('dialog[open]'))return;
 const steps=(GUIDE_STEPS[page]||[]).filter(step=>document.querySelector(step.selector));if(!steps.length)return;
 closeActiveGuide(false);document.querySelectorAll('.guide-focus').forEach(x=>x.classList.remove('guide-focus'));
 const layer=document.createElement('div');layer.className='guide-layer';layer.innerHTML='<div class="guide-dim"></div><div class="guide-bubble" role="dialog" aria-live="polite"></div>';document.body.append(layer);
 let index=0,introTimer=null;const bubble=layer.querySelector('.guide-bubble');
 const clearHighlight=()=>{layer.classList.add('guide-calm');document.querySelectorAll('.guide-focus').forEach(x=>x.classList.remove('guide-focus'))};
 const close=(markSeen=true)=>{clearTimeout(introTimer);document.querySelectorAll('.guide-focus').forEach(x=>x.classList.remove('guide-focus'));layer.remove();activeGuideClose=null;if(markSeen)localStorage.setItem(`smartrisk-guide-${page}-${normalizeEmail(session.email)}`,'1')};activeGuideClose=close;
 const positionBubble=target=>{
  requestAnimationFrame(()=>{const rect=target?.getBoundingClientRect(),width=Math.min(360,window.innerWidth-24),height=bubble.offsetHeight,gap=16;let top,left;
   if(!rect){top=window.innerHeight-height-24;left=window.innerWidth-width-24}
   else{if(window.innerHeight-rect.bottom>=height+gap)top=rect.bottom+gap;else if(rect.top>=height+gap)top=rect.top-height-gap;else top=12;
    if(rect.width>window.innerWidth*.7)left=Math.min(window.innerWidth-width-12,Math.max(12,rect.right-width));else left=Math.min(window.innerWidth-width-12,Math.max(12,rect.left+rect.width/2-width/2))}
   bubble.style.top=`${Math.max(12,Math.min(top,window.innerHeight-height-12))}px`;bubble.style.left=`${Math.max(12,left)}px`;
  });
 };
 const show=()=>{
  clearTimeout(introTimer);layer.classList.remove('guide-calm','guide-reviewing');document.querySelectorAll('.guide-focus').forEach(x=>x.classList.remove('guide-focus'));const step=steps[index],target=document.querySelector(step.selector);if(!target)return close();
  target.classList.add('guide-focus');target.scrollIntoView({behavior:'auto',block:'center'});
  bubble.innerHTML=`<div class="guide-progress">Pregunta ${index+1} de ${steps.length}</div><h4>${escapeHtml(step.question||step.title)}</h4><p>${escapeHtml(step.answer||step.text)}</p><div class="guide-actions"><button type="button" class="guide-skip">Salir de la guía</button><button type="button" class="guide-next">${escapeHtml(step.action||'Mostrarme')}</button></div>`;
  positionBubble(target);introTimer=setTimeout(clearHighlight,2000);
  bubble.querySelector('.guide-skip').onclick=close;bubble.querySelector('.guide-next').onclick=()=>{
   if(!step.route){if(index===steps.length-1)close();else{index++;show()}return}
   clearHighlight();layer.classList.add('guide-reviewing');current=step.route;render();
   bubble.innerHTML=`<div class="guide-progress">Pregunta ${index+1} de ${steps.length} · consulta abierta</div><h4>Revisa los datos relacionados</h4><p>${escapeHtml(step.answer)}</p><div class="guide-actions"><button type="button" class="guide-back">Volver al panorama</button><button type="button" class="guide-next">${index===steps.length-1?'Terminar recorrido':'Ya revisé · Siguiente'}</button></div>`;
   positionBubble(null);
   bubble.querySelector('.guide-back').onclick=()=>{current=page;render();show()};
   bubble.querySelector('.guide-next').onclick=()=>{
    current=page;render();
    if(index===steps.length-1){
     localStorage.setItem(`smartrisk-guide-${page}-${normalizeEmail(session.email)}`,'1');
     layer.classList.add('guide-calm','guide-complete');
     bubble.innerHTML='<div class="guide-progress">Recorrido completado</div><h4>Ya tienes el panorama para decidir</h4><p>Puedes quedarte aquí y explorar libremente. Los demás módulos siguen disponibles cuando los necesites.</p><div class="guide-actions"><button type="button" class="guide-skip">Cerrar</button><button type="button" class="guide-optional">Ver bandeja de decisiones <small>(opcional)</small></button></div>';
     positionBubble(null);bubble.querySelector('.guide-skip').onclick=close;bubble.querySelector('.guide-optional').onclick=()=>{close();current='decisiones';render()};
    }else{index++;show()}
   };
  };
 };
 layer.addEventListener('keydown',event=>{if(event.key==='Escape')close()});show();bubble.focus();
}
$('#guideHelp').onclick=()=>startGuide(current,true);
document.addEventListener('click',event=>{
 const button=event.target.closest('button');if(!button||!document.querySelector('.guide-layer')||button.closest('.guide-bubble')||button.id==='guideHelp'||button.id==='startDecisionGuide')return;
 if(button.matches('.edit,.details,.review-details,.decision-details,.new-action,#add,#changePassword'))closeActiveGuide(false);
},true);
