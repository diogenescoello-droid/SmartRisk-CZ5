Warning: truncated output (original token count: 70236)
Total output lines: 1880

const STORE='smartrisk-cz5-data-v1';
const ADMIN_EMAILS=['geopro.ec2@gmail.com','dcoellom2@unemi.edu.ec','diogenes.coello@gestionderiesgos.gob.ec'];
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
 data.sitios=data.sitios||[];data.acciones=data.acciones||[];data.seguimientos=data.seguimientos||[];data.entidadesSeguimiento=data.entidadesSeguimiento||[];data.decisiones=data.decisiones||[];data.validaciones=data.validaciones||[];
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
const isAdmin=()=>ADMIN_EMAILS.includes(normalizeEmail(session?.email))||Boolean(window.SmartRiskScope?.isAdministrator?.());
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
 const canonical=Number(stats.canonicalTerritories||stats.folders||0),followupEntities=data.entidadesSeguimiento||[],followups=data.seguimientos||[];
 const followupPending=followupEntities.filter(item=>normalizeText(item.baselineStatus).includes('sin remision')).length;
 const followupReported=Math.max(0,followupEntities.length-followupPending);
 const linkedFollowups=followups.filter(item=>item.accionId||item.sitioId||['Vinculada por código','Vinculada en plataforma'].includes(item.actionLinkState)||item.siteLinkState==='Vinculada en plataforma').length;
 return {dimensions:[
  {label:'Cobertura documental ENOS',value:Number(stats.territorialCoverage||0),detail:`${stats.plansReceived||0} de ${canonical} entidades con plan`},
  {label:'Cobertura de seguimiento operativo',value:followupEntities.length?Math.round(followupReported/followupEntities.length*100):0,detail:`${followupReported} de ${followupEntities.length} entidades con algún registro al corte`},
  {label:'Trazabilidad acción–sitio',value:followups.length?Math.round(linkedFollowups/followups.length*100):0,detail:`${linkedFollowups} de ${followups.length} actualizaciones vinculadas`},
  {label:'Extracción de planes recibidos',value:Number(stats.reviewCompletion||0),detail:`${stats.plansEvaluated||0} de ${stats.plansReceived||0} documentos procesados`},
  {label:'Evidencia con página identificada',value:evidenceItems.length?Math.round(tracedEvidence/evidenceItems.length*100):0,detail:`${tracedEvidence} de ${evidenceItems.length} fragmentos con referencia`},
  {label:'Validación técnica territorial',value:canonical?Math.round(validatedTerritories/canonical*100):0,detail:`${validatedTerritories} de ${canonical} territorios con validación registrada`}
 ],warnings:[
  'Procesado automáticamente no significa validado por un técnico.',
  'Un archivo no equivale a un expediente: los duplicados y versiones deben consolidarse.',
  'Los porcentajes usan universos distintos y no deben promediarse como un único avance.',
  'Los seguimientos migrados desde F07 son declarativos hasta que un técnico los vincule y valide en la plataforma.'
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
 const followupEntities=data.entidadesSeguimiento||[],followupPending=followupEntities.filter(item=>normalizeText(item.baselineStatus).includes('sin remision')).length,followupReported=Math.max(0,followupEntities.length-followupPending);
 const followupCut=data._pilotFollowup?.config?.cutDate||window.SMART_RISK_PILOT_BASELINE?.config?.cutDate||'';
 const quality=scientificQualitySnapshot();
 const executive=window.SmartRiskOperational.aggregate(data);
 const money=value=>new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(value||0);
 $('#content').innerHTML=`<div class="risk-lead"><div><span class="eyebrow">Panorama estratégico con trazabilidad</span><h3>¿Qué está documentado y qué falta validar?</h3><p>Datos extraídos de planes ENOS reales. Los hallazgos de revisión automática se identifican como preliminares y no sustituyen la validación territorial.</p></div><button id="riskGuide" class="secondary">Explícame este panorama</button></div>
 <section class="executive-supervision"><div class="executive-supervision-heading"><div><span class="eyebrow">Supervisión ejecutiva ENOS</span><h3>¿Qué se ha reportado, asignado y financiado?</h3><p>Corte automático: ${escapeHtml(new Date(executive.cutAt).toLocaleString('es-EC'))}. Solo cuenta sitios identificados o validados y acciones vinculadas a ellos.</p></div><button id="printExecutiveReport" class="secondary">Generar reporte oficial / PDF</button></div>
 <div class="executive-supervision-grid">
  <button data-target="sitios"><span>Sitios, zonas o tramos accionables</span><strong>${executive.sites}</strong><small>${executive.sitesWithActions} con al menos una acción vinculada</small></button>
  <button data-target="acciones"><span>Acciones asignadas</span><strong>${executive.actions}</strong><small>${executive.completedActions} completadas con criterio de cierre</small></button>
  <button data-target="acciones"><span>Presupuesto asignado</span><strong>${money(executive.assignedBudget)}</strong><small>${money(executive.executedBudget)} ejecutado · ${executive.actionsWithBudget}/${executive.actions} acciones presupuestadas</small></button>
  <button data-target="sitios"><span>Brechas activas / solventadas</span><strong>${executive.activeGapPct}% / ${executive.solvedGapPct}%</strong><small>${executive.activeGaps} activas · ${executive.solvedGaps} solventadas</small></button>
 </div>
 <div class="executive-territory-table"><table><thead><tr><th>Cantón</th><th>Sitios</th><th>Acciones</th><th>Asignado</th><th>Ejecutado</th><th>Brechas A/S</th></tr></thead><tbody>${executive.rows.map(row=>`<tr><td><b>${escapeHtml(row.canton)}</b><small>${escapeHtml(row.province)}</small></td><td>${row.sites}</td><td>${row.actions}</td><td>${money(row.assignedBudget)}</td><td>${money(row.executedBudget)}</td><td>${row.activeGaps} / ${row.solvedGaps}</td></tr>`).join('')||'<tr><td colspan="6">No existen sitios accionables validados al corte.</td></tr>'}</tbody></table></div></section>
 <section class="technical-overview"><div><span class="eyebrow">Contexto técnico-científico</span><h3>${technical.length} fichas disponibles · ${newTechnical} pendientes de revisión</h3><p>Boletines y observaciones se contrastan con territorio, exposición, vulnerabilidad y capacidad. Cada uso conserva la referencia del documento fuente.</p></div><div>${technical.slice(0,3).map(fiche=>`<button class="open-technical-fiche" data-fiche="${escapeHtml(fiche.id)}"><span>${escapeHtml(fiche.institucion)} ${escapeHtml(fiche.numero)}</span><b>${escapeHtml(fiche.amenaza)}</b><small>${escapeHtml(fiche.nivel)} · Ver fuente y vincular →</small></button>`).join('')}</div></section>
 <div class="cards risk-cards">
  <button class="card risk-kpi risk-kpi-attention" data-target="revision"><span>Territorios con brechas por validar</span><strong>${territoriesAttention}</strong><small>Hallazgo documental preliminar en planes reales; requiere revisión técnica</small><em>Revisar evidencia →</em></button>
  <button class="card risk-kpi risk-kpi-attention" data-target="decisiones"><span>Cobertura de actualización territorial</span><strong>${followupReported}/${followupEntities.length}</strong><small>${followupPending} entidades sin remisión al corte ${escapeHtml(followupCut)}</small><em>Revisar pendientes →</em></button>
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
 $('#printExecutiveReport').onclick=()=>{auditChange('GENERAR_REPORTE_EJECUTIVO','reporte','supervision-enos',executive.cutAt);save();window.print()};
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
 (data.entidadesSeguimiento||[]).filter(item=>normalizeText(item.baselineStatus).includes('sin remision')).forEach(item=>{
  decisions.push({id:`SEG-PEND-${item.entityId}`,type:'Seguimiento territorial pendiente',validationState:'Sin remisión al corte',province:item.provincia||item.province||'',territory:item.canton||item.shortName||item.name,territorioId:item.territorioId||'',
   title:`Solicitar actualización a ${item.shortName||item.name}`,question:'¿Qué impide registrar la actualización territorial y cuál es la fecha comprometida para completarla?',
   evidence:`No se identificó actualización al corte ${data._pilotFollowup?.config?.cutDate||''}.`,source:'Línea base F07 y correos institucionales',level:'Alta',escalation:'Punto focal territorial / Coordinación Zonal 5',deadline:'Inmediato',status:'Requiere decisión'});
 });
 const unlinkedGroups={};
 (data.seguimientos||[]).filter(item=>!item.accionId||!item.sitioId).forEach(item=>{const key=item.territorioId||item.entityId||`${item.provincia}|${item.canton}`;(unlinkedGroups[key]||=[]).push(item)});
 Object.entries(unlinkedGroups).forEach(([key,items])=>{
  const first=items[0],needsAction=items.filter(item=>!item.accionId).length,needsSite=items.filter(item=>!item.sitioId).length,urgent=items.some(item=>item.requiresEscalation);
  decisions.push({id:`SEG-HOM-${key}`,type:'Seguimientos por homologar',validationState:'Migración inicial',province:first.provincia||first.province||'',territory:first.canton||'',territorioId:first.territorioId||'',
   title:`Homologar ${items.length} actualización(es) de ${first.canton||'la entidad'}`,question:'¿Con qué acción y ficha territorial debe vincularse cada actualización antes de afectar los indicadores oficiales?',
   evidence:`${needsAction} sin acción vinculada · ${needsSite} sin sitio o ficha vinculada.`,source:first.sourceType||'F07 / migración inicial',level:urgent?'Urgente':'Alta',escalation:'Técnico territorial / analista CZ5',deadline:'Durante el piloto',status:'Requiere decisión'});
 });
 return decisions.map(item=>({...item,...(data.decisiones.find(saved=>saved.id===item.id)||{})}));
}
function decisionsPage(){
 const decisions=deriveDecisions(),open=decisions.filter(x=>!['Resuelta','Descartada'].includes(x.status)),urgent=open.filter(x=>x.level==='Urgente').length,resolved=decisions.filter(x=>x.status==='Resuelta').length;
 const categoryOf=item=>item.type==='Brecha documental por validar'?'Planes y validación':item.type==='Sitio sin mitigación'?'Mitigación territorial':item.type==='Acción vencida'?'Ejecución vencida':item.type==='Información técnico-científica nueva'?'Información científica':['Seguimiento territorial pendiente','Seguimientos por homologar'].includes(item.type)?'Seguimiento ENOS':'Otras';
 const categories=['Todas','Seguimiento ENOS','Información científica','Planes y validación','Mitigación territorial','Ejecución vencida','Otras'];
 $('#content').innerHTML=`<div class="cards">
  <div class="card"><span>Decisiones abiertas</span><strong>${open.length}</strong></div><div class="card"><span>Urgentes</span><strong>${urgent}</strong></div>
  <div class="card"><span>En gestión</span><strong>${decisions.filter(x=>x.status==='En gestión').length}</strong></div><div class="card"><span>Resueltas</span><strong>${resolved}</strong></div>
 </div><div class="decision-intro"><div><span class="eyebrow">Cerebro SmartRisk</span><h3>Del hallazgo a la decisión</h3><p>Trabaja por bandejas: valida planes, resuelve mitigación territorial y destraba ejecución.</p></div><button id="startDecisionGuide" class="secondary">¿Cómo usar esta bandeja?</button></div>
 <div class="panel decision-control"><div class="decision-category-tabs">${categories.map(category=>`<button data-decision-category="${category}" class="${ca…40236 tokens truncated…rmalizeText(item.canton)===normalizeText(assignedUser.canton))).sort((a,b)=>`${a.provincia}${a.canton}`.localeCompare(`${b.provincia}${b.canton}`,'es'));
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
 <div class="territory-overview-grid"><section><small>Plan revisado</small><strong>${row.hasPlan?`${escapeHtml(row.review.score)}%`:'No recibido'}</strong></section><section><small>Menciones / pendientes</small><strong>${row.mentions} / ${row.pending}</strong></section><section><small>Fichas gestionables</small><strong>${row.sites.length}</strong></section><section><small>Acciones abiertas / completas</small><strong>${openActions.length} / ${completed.length}</strong></section><section><small>Alertas abiertas / urgentes</small><strong>${row.alerts.length} / ${row.urgent}</strong></section><section><small>Seguimiento operativo</small><strong>${escapeHtml(row.followupEntity?.baselineStatus||'Sin línea base')}</strong></section></div>
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
  <label>Estado de la brecha<select name="estadoBrecha" required>${['Activa','Solventada','Sin brecha'].map(value=>`<option ${selected(value,record?.estadoBrecha||(record?.brechaPrincipal==='Sin brecha'?'Sin brecha':'Activa'))}>${value}</option>`).join('')}</select></label>
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
   facilidadSolucion:values.facilidadSolucion,brechaPrincipal:values.brechaPrincipal,estadoBrecha:values.estadoBrecha,brechas:values.brechas.trim(),
   fechaRegistro:values.fechaRegistro,latitud:values.latitud?Number(values.latitud):'',longitud:values.longitud?Number(values.longitud):'',
   direccion:values.direccion.trim(),descripcion:values.descripcion.trim(),origen:record?.origen||'Reporte territorial',actualizadoEn:new Date().toISOString()
  };
  if(record)Object.assign(record,siteValues);
  else data.sitios.push({id:crypto.randomUUID(),...siteValues,creadoEn:new Date().toISOString(),creadoPor:session?.email||''});
  save();dialog.close();dialog.remove();render();
 };
}
function openFollowupForm(record=null){
 const territories=[...(data.territorios||[])].sort((a,b)=>`${a.provincia}${a.canton}`.localeCompare(`${b.provincia}${b.canton}`,'es'));
 if(!territories.length)return alert('Tu perfil no tiene un territorio habilitado.');
 const dialog=document.createElement('dialog');dialog.className='site-dialog';
 const defaultTerritory=record?.territorioId||territories[0].id;
 dialog.innerHTML=`<form class="dialog-body"><span class="eyebrow">Actualización territorial</span><h3>Registrar avance sin salir del módulo de acciones</h3><p class="muted">La actualización alimentará los indicadores actuales. Solo modificará una acción oficial cuando quede vinculada a una acción y una ficha existentes.</p>
 <div class="form-grid"><label>Territorio<select name="territorioId" required>${territories.map(item=>`<option value="${escapeHtml(item.id)}" ${item.id===defaultTerritory?'selected':''}>${escapeHtml(item.provincia)} · ${escapeHtml(item.canton)}</option>`).join('')}</select></label>
 <label>Periodo<input name="period" type="month" value="${escapeHtml(record?.period||new Date().toISOString().slice(0,7))}" required></label>
 <label class="full">Acción o compromiso reportado<input name="actionTitle" value="${escapeHtml(record?.actionTitle||'')}" maxlength="500" required></label>
 <label>Vincular a acción existente<select name="accionId"><option value="">Pendiente de homologación</option></select></label>
 <label>Vincular a ficha o sitio<select name="sitioId"><option value="">Pendiente de vinculación</option></select></label>
 <label>Estado<select name="status">${['Sin iniciar','En proceso','Observada','Detenida','Cumplida'].map(value=>`<option ${value===record?.status?'selected':''}>${value}</option>`).join('')}</select></label>
 <label>Avance declarado (%)<input name="declaredProgress" type="number" min="0" max="100" step="0.1" value="${escapeHtml(record?.declaredProgress??0)}" required></label>
 <label class="full">Resultado o avance del periodo<textarea name="progressDescription" rows="3" required>${escapeHtml(record?.progressDescription||'')}</textarea></label>
 <label class="full">Nudo crítico<textarea name="criticalGap" rows="2">${escapeHtml(record?.criticalGap||'')}</textarea></label>
 <label class="full">Siguiente paso o compromiso<textarea name="nextStep" rows="2">${escapeHtml(record?.nextStep||'')}</textarea></label>
 <label>Próximo reporte<input name="nextReportDate" type="date" value="${escapeHtml(record?.nextReportDate||'')}"></label>
 <label>Evidencia o referencia<input name="evidenceDescription" value="${escapeHtml(record?.evidenceDescription||'')}" maxlength="500" placeholder="Informe, fotografía, acta, enlace o código"></label>
 </div><div class="form-error error" role="alert"></div><div class="dialog-actions"><button type="button" class="secondary cancel">Cancelar</button><button>Guardar actualización</button></div></form>`;
 document.body.append(dialog);dialog.showModal();bindCancel(dialog);const form=dialog.querySelector('form');
 const paintLinks=()=>{const territoryId=form.elements.territorioId.value,actions=(data.acciones||[]).filter(item=>data.sitios.find(site=>site.id===item.sitioId)?.territorio===territoryId),sites=(data.sitios||[]).filter(item=>item.territorio===territoryId);const currentAction=record?.accionId||form.elements.accionId.value,currentSite=record?.sitioId||form.elements.sitioId.value;form.elements.accionId.innerHTML=`<option value="">Pendiente de homologación</option>${actions.map(item=>`<option value="${escapeHtml(item.id)}" ${item.id===currentAction?'selected':''}>${escapeHtml(item.accion)}</option>`).join('')}`;form.elements.sitioId.innerHTML=`<option value="">Pendiente de vinculación</option>${sites.map(item=>`<option value="${escapeHtml(item.id)}" ${item.id===currentSite?'selected':''}>${escapeHtml(item.nombre)}</option>`).join('')}`};
 form.elements.territorioId.onchange=paintLinks;paintLinks();
 form.elements.accionId.onchange=()=>{const action=(data.acciones||[]).find(item=>item.id===form.elements.accionId.value);if(action){form.elements.actionTitle.value=action.accion;form.elements.sitioId.value=action.sitioId||''}};
 form.onsubmit=event=>{event.preventDefault();const values=Object.fromEntries(new FormData(form)),territory=territories.find(item=>item.id===values.territorioId),action=(data.acciones||[]).find(item=>item.id===values.accionId),site=(data.sitios||[]).find(item=>item.id===values.sitioId);const progress=Number(values.declaredProgress);if(values.status==='Cumplida'&&progress<100){dialog.querySelector('.form-error').textContent='Una actualización marcada como cumplida debe registrar 100% de avance.';return}const now=new Date().toISOString();const followup={followupId:record?.followupId||crypto.randomUUID(),entityId:(data.entidadesSeguimiento||[]).find(item=>item.territorioId===territory.id)?.entityId||territory.id,territorioId:territory.id,province:territory.provincia,provincia:territory.provincia,canton:territory.canton,level:'Cantonal',period:values.period,sourceFormat:'SmartRisk RC14.3',sourceType:'Ingreso directo SmartRisk',actionCode:action?.codigo||'',actionTitle:values.actionTitle.trim(),actionLinkState:action?'Vinculada en plataforma':'Pendiente de homologación',accionId:action?.id||'',siteReference:site?.nombre||'',siteLinkState:site?'Vinculada en plataforma':'Pendiente de vinculación',sitioId:site?.id||'',status:values.status,declaredProgress:progress,progressDescription:values.progressDescription.trim(),criticalGap:values.criticalGap.trim(),nextStep:values.nextStep.trim(),responsible:session?.displayName||session?.email||'',nextReportDate:values.nextReportDate,evidenceDescription:values.evidenceDescription.trim(),evidenceState:values.evidenceDescription.trim()?'Adjunta o enlazada':'Sin evidencia',requiresEscalation:Boolean(values.criticalGap.trim()),qualityState:'Pendiente de revisión técnica',submissionTime:now,eligibleTerritorial:true};if(record)Object.assign(record,followup);else data.seguimientos.push(followup);if(action){const map={Cumplida:'Completada','En proceso':'En ejecución',Detenida:'Detenida',Observada:'Detenida','Sin iniciar':'Planificada'};action.avance=progress;action.estado=map[values.status]||action.estado;action.evidencia=values.evidenceDescription.trim()||action.evidencia;action.observaciones=[action.observaciones,values.criticalGap.trim(),values.nextStep.trim()].filter(Boolean).join(' · ');action.seguimientos=[...new Set([...(action.seguimientos||[]),followup.followupId])];action.actualizadoEn=now}let entity=(data.entidadesSeguimiento||[]).find(item=>item.territorioId===territory.id);if(!entity){entity={entityId:territory.id,territorioId:territory.id,shortName:territory.canton,name:territory.canton,province:territory.provincia,provincia:territory.provincia,canton:territory.canton,level:'Cantonal'};data.entidadesSeguimiento.push(entity)}entity.baselineStatus='Actualización recibida en SmartRisk';entity.latestPeriod=values.period;entity.declaredProgressLatestPeriod=progress;entity.followupCount=(data.seguimientos||[]).filter(item=>item.territorioId===territory.id).length;entity.requiresAttention=!action||!site;auditChange('REGISTRAR_SEGUIMIENTO','seguimiento',followup.followupId,`${territory.canton} · ${values.period} · ${progress}%`);save();dialog.close();dialog.remove();render()};
}
function openActionForm(record,defaultSiteId=''){
 if(!data.sitios.length){return alert('Primero debes registrar al menos un sitio crítico.')}
 const followupHistory=record?(data.seguimientos||[]).filter(item=>item.accionId===record.id).sort((a,b)=>String(b.submissionTime||'').localeCompare(String(a.submissionTime||''))):[];
 const dialog=document.createElement('dialog');
 const selected=(value,current)=>value===current?'selected':'';
 const sites=[...data.sitios].sort((a,b)=>a.nombre.localeCompare(b.nombre,'es'));
 dialog.className='site-dialog';
 dialog.innerHTML=`<form class="dialog-body"><h3>${record?'Editar':'Nueva'} acción</h3><p class="muted">Vincula la intervención con un sitio crítico y define su seguimiento.</p>
 <div id="actionTechnicalContext" class="action-technical-context"></div>
 ${followupHistory.length?`<section class="source-card"><h4>Historial de actualizaciones (${followupHistory.length})</h4>${followupHistory.slice(0,5).map(item=>`<p><b>${escapeHtml(item.period||'Sin periodo')} · ${escapeHtml(item.status||'Sin estado')} · ${escapeHtml(item.declaredProgress??0)}%</b><br>${escapeHtml(item.progressDescription||item.actionTitle||'Sin descripción')}</p>`).join('')}</section>`:''}
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
  <label>Presupuesto asignado (USD)<input name="presupuestoAsignado" type="number" min="0" step="0.01" value="${escapeHtml(record?.presupuestoAsignado??record?.costoEstimado)}"></label>
  <label>Presupuesto ejecutado (USD)<input name="presupuestoEjecutado" type="number" min="0" step="0.01" value="${escapeHtml(record?.presupuestoEjecutado)}"></label>
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
  const budgetError=window.SmartRiskOperational.validateActionBudget(values);if(budgetError){error.textContent=budgetError;return}
  if(values.estado==='Completada'&&!values.evidencia.trim()){error.textContent='Para completar una acción debes registrar una evidencia verificable.';return}
  if(values.estado==='Completada')values.avance='100';
  const actionValues={sitioId:values.sitioId,accion:values.accion.trim(),objetivo:values.objetivo.trim(),responsable:values.responsable.trim(),dependencia:values.dependencia.trim(),estado:values.estado,
   fechaInicio:values.fechaInicio,fechaLimite:values.fechaLimite,avance:Number(values.avance),presupuestoAsignado:values.presupuestoAsignado?Number(values.presupuestoAsignado):0,presupuestoEjecutado:values.presupuestoEjecutado?Number(values.presupuestoEjecutado):0,
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
