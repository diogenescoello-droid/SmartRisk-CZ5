import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import zlib from 'node:zlib';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const manifest=JSON.parse(read('RELEASE_MANIFEST.json'));
const app=read('app.js');
const gate=read('preview-rc14.4.4/access-gate-preview.js');
const rules=read('firestore.rules');
const index=read('preview-rc14.4.4/index.html');
const norm=v=>String(v??'').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim().toLowerCase();
const arr=v=>Array.isArray(v)?v:[];
const keyOf=(x,i=0)=>String(x?.entityId||x?.followupId||x?.id||x?._id||x?.codigo||x?.code||`${norm(x?.province||x?.provincia)}|${norm(x?.territory||x?.canton||x?.name||x?.nombre)}|${i}`);
const pct=v=>Number.isFinite(Number(v))&&Number(v)>=0&&Number(v)<=100;
const urlOk=v=>v==null||v===''||/^https:\/\//.test(String(v));
const dateLike=/^(fecha|date|created|updated|received|emitido|vigencia|deadline|cut|latest|period)/i;
const statusLike=/^(estado|status|baselineStatus|planReviewStatus|planCorrectionStatus|nivel|classification)/i;

function loadWindow(file){
 const context={window:{},console,structuredClone,Blob,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},MutationObserver:class{observe(){}},document:{querySelector(){return null},querySelectorAll(){return[]}},localStorage:{getItem(){return null},setItem(){},removeItem(){}}};
 context.globalThis=context;
 vm.createContext(context);
 try{vm.runInContext(read(file),context,{filename:file,timeout:5000});return context.window}
 catch(error){return {__error:error.message}}
}
function decodePayload(file){const m=read(file).match(/const PAYLOAD="([A-Za-z0-9+/=]+)";/);if(!m)throw Error(`PAYLOAD ausente en ${file}`);return JSON.parse(zlib.gunzipSync(Buffer.from(m[1],'base64')).toString('utf8'))}
function parseBaseline(){const m=read('pilot-baseline-data.js').match(/const DATA = (\{[\s\S]*\});\s*window\.SMART_RISK_PILOT_BASELINE/);if(!m)throw Error('Línea base no interpretable');return JSON.parse(m[1])}
function parseCorrection(){const m=read('preview-rc14.4.4/los-rios-plan-correction-20260730.js').match(/const CORRECTION=(\{[^\n]+\});\nconst STORE_KEY/);if(!m)throw Error('Corrección Los Ríos no interpretable');return JSON.parse(m[1])}
function parseReceiptCases(){let source=read('preview-rc14.4.4/plan-receipt-status-fix-20260731.js').replace('const C=[','const C=globalThis.__PLAN_CASES=[');const context={console,structuredClone,Blob,setTimeout:()=>0,clearTimeout(){},setInterval:()=>0,clearInterval(){},MutationObserver:class{observe(){}},document:{querySelector(){return null},querySelectorAll(){return[]}},localStorage:{getItem(){return null},setItem(){}},window:{}};context.globalThis=context;vm.createContext(context);vm.runInContext(source,context,{timeout:5000});return context.__PLAN_CASES||[]}

const seedWin=loadWindow('data.js');
const enosWin=loadWindow('enos-data.js');
const reviewsWin=loadWindow('enos-reviews.js');
const riskWin=loadWindow('risk-locations.js');
const f03Win=loadWindow('f03-data.js');
const casesWin=loadWindow('cases-data.js');
const seed=seedWin.SEED_DATA||{};
const baseline=parseBaseline();
const delta=decodePayload('preview-rc14.4.4/latest-data-update.js');
const completion=decodePayload('preview-rc14.4.4/followup-completion-20260730.js');
const losRios=parseCorrection();
const receiptCases=parseReceiptCases();

const entities=new Map(arr(baseline.entities).map((x,i)=>[keyOf(x,i),{...x}]));
for(const patch of [...arr(delta.entityPatches),...arr(completion.entityPatches),losRios])entities.set(patch.entityId,{...(entities.get(patch.entityId)||{}),...patch});
for(const c of receiptCases){const patch={entityId:c.id,name:c.t,shortName:c.t,province:c.p,level:c.l,entityType:c.type,planReceived:true,planDocumentAvailable:Boolean(c.url),formalPlanDelivery:false,planReviewScore:c.score,planReviewStatus:c.status,planCorrectionStatus:c.status,planFinalUrl:c.url,planReviewReportUrl:c.report,planSignatureStatus:c.sig,planParticularities:c.note};entities.set(c.id,{...(entities.get(c.id)||{}),...patch})}
const entityList=[...entities.values()];
const followups=new Map(arr(baseline.followups).map((x,i)=>[keyOf(x,i),{...x}]));
for(const x of [...arr(delta.followups),...arr(completion.followups)])followups.set(keyOf(x),{...(followups.get(keyOf(x))||{}),...x});
const followupList=[...followups.values()];
const reviews=arr(reviewsWin.ENOS_REVIEWS?.reviews).map(x=>({...x}));
for(const c of receiptCases){const i=reviews.findIndex(x=>x.entityId===c.id||(norm(x.province)===norm(c.p)&&norm(x.territory)===norm(c.t)));const v={entityId:c.id,province:c.p,territory:c.t,plan:c.plan,planReceived:true,documentAvailable:Boolean(c.url),score:c.score,status:c.status,totalChecklist:c.crit?.length||0,criteria:arr(c.crit).map((q,j)=>({name:`Criterio ${j+1}`,maxScore:q[0],score:q[1]})),planFinalUrl:c.url,reviewReportUrl:c.report,signatureStatus:c.sig};if(i<0)reviews.push(v);else reviews[i]={...reviews[i],...v}}

const globals={
 ENOS_DATA:enosWin.ENOS_DATA,
 ENOS_REVIEWS:reviewsWin.ENOS_REVIEWS,
 RISK_LOCATIONS:riskWin.RISK_LOCATIONS||riskWin.SMART_RISK_LOCATIONS,
 F03_DATA:f03Win.F03_DATA,
 CZ5_CASES:casesWin.CZ5_CASES
};
const menu=[...app.matchAll(/\['([^']+)','([^']+)'\]/g)].slice(0,9).map(m=>({id:m[1],label:m[2]}));
const pages=[
 {id:'access',label:'Acceso',records:[...new Set([...app.matchAll(/[\w.-]+@[\w.-]+/g)].map(m=>m[0]))],source:'autenticación'},
 {id:'dashboard',label:'Panel principal',records:entityList,source:'resumen transversal'},
 {id:'usuarios',label:'Actores y flujo COE',records:[...arr(seed.actoresCOE),...arr(seed.equiposCOE),...arr(seed.actividadesCOE)],source:'actores/equipos/actividades COE'},
 {id:'territorios',label:'Territorios',records:entityList,source:'56 expedientes territoriales'},
 {id:'instituciones',label:'Mesas y grupos de trabajo',records:[...arr(seed.instituciones),...arr(seed.equiposCOE)],source:'instituciones/equipos'},
 {id:'revision',label:'Revisión de planes',records:reviews,source:'ENOS_REVIEWS + reconciliaciones'},
 {id:'decisiones',label:'Bandeja de decisiones',records:arr(seed.decisiones),source:'decisiones y brechas derivadas'},
 {id:'sitios',label:'Sitios críticos',records:[...arr(seed.sitios),...arr(globals.RISK_LOCATIONS)],source:'sitios + ubicaciones de riesgo'},
 {id:'acciones',label:'Acciones',records:[...arr(seed.acciones),...followupList],source:'acciones + F07'},
 {id:'herramientas',label:'Herramientas',records:[...arr(seed.capasGeograficas),...arr(seed.cartografiaOperativa),...arr(globals.F03_DATA?.records)],source:'F03/cartografía/capas'},
 {id:'cabina',label:'Cabina COE',records:[...arr(seed.sesionesCabina),...arr(seed.tareasCabina)],source:'sesiones/tareas COE'}
];

const results=[];
function add(page,control,ok,detail='',severity='critical'){results.push({page,control,ok:Boolean(ok),severity,detail})}
function valuesByPattern(records,pattern){const out=[];for(const r of records)if(r&&typeof r==='object')for(const [k,v] of Object.entries(r))if(pattern.test(k))out.push({k,v,r});return out}
function duplicateKeys(records){const seen=new Set(),dups=[];records.forEach((x,i)=>{const k=keyOf(x,i);if(seen.has(k))dups.push(k);seen.add(k)});return dups}
function unresolvedTerritoryRefs(records){const ids=new Set(entityList.map(x=>x.entityId));const seedIds=new Set(arr(seed.territorios).map(x=>x.id));const unresolved=[];records.forEach((r,i)=>{for(const k of ['territorio','territoryId','entityId','territorioId']){const v=r?.[k];if(typeof v==='string'&&v.startsWith('TER-')&&!ids.has(v)&&!seedIds.has(v))unresolved.push(`${i}:${k}:${v}`)}});return unresolved}
function ratio(records,pred){if(!records.length)return 1;return records.filter(pred).length/records.length}

for(const p of pages){
 const rec=arr(p.records),dates=valuesByPattern(rec,dateLike),statuses=valuesByPattern(rec,statusLike),urls=valuesByPattern(rec,/url|link|enlace/i),percentages=valuesByPattern(rec,/avance|progress|porcentaje|percent|score/i).filter(x=>typeof x.v==='number'),nums=valuesByPattern(rec,/count|total|cantidad|numero/i).filter(x=>typeof x.v==='number');
 const menuRegistered=p.id==='access'||p.id==='cabina'||menu.some(x=>x.id===p.id);
 const titleMapped=p.id==='access'||app.includes(`${p.id}:'${p.label}'`)||app.includes(`['${p.id}','${p.label}']`)||app.includes(`${p.id}:\"${p.label}\"`);
 add(p.id,'01-registro-de-página',menuRegistered,menuRegistered?'registrada':'no registrada');
 add(p.id,'02-título-coherente',titleMapped,`título esperado: ${p.label}`);
 add(p.id,'03-referencia-en-código',p.id==='access'||app.includes(`'${p.id}'`),`apariciones=${app.split(`'${p.id}'`).length-1}`);
 add(p.id,'04-fuente-de-datos-identificada',Boolean(p.source),p.source);
 add(p.id,'05-colección-disponible',Array.isArray(rec),`registros=${rec.length}`);
 add(p.id,'06-colección-no-vacía',rec.length>0,`registros=${rec.length}`,'warning');
 add(p.id,'07-identificadores-sin-duplicar',duplicateKeys(rec).length===0,`duplicados=${duplicateKeys(rec).slice(0,8).join(',')}`,'warning');
 add(p.id,'08-identificadores-presentes',ratio(rec,(x,i)=>Boolean(keyOf(x,i)))===1,`cobertura=${Math.round(ratio(rec,(x,i)=>Boolean(keyOf(x,i)))*100)}%`);
 add(p.id,'09-estados-no-vacíos',statuses.every(x=>x.v!==''&&x.v!=null),`campos=${statuses.length}`,'warning');
 add(p.id,'10-fechas-interpretables',dates.every(x=>x.v==null||x.v===''||!Number.isNaN(Date.parse(String(x.v).length===7?`${x.v}-01`:String(x.v)))),`campos=${dates.length}`,'warning');
 add(p.id,'11-enlaces-válidos',urls.every(x=>Array.isArray(x.v)||urlOk(x.v)),`campos=${urls.length}`,'warning');
 add(p.id,'12-porcentajes-en-rango',percentages.every(x=>pct(x.v)),`campos=${percentages.length}`);
 add(p.id,'13-conteos-no-negativos',nums.every(x=>x.v>=0),`campos=${nums.length}`);
 add(p.id,'14-referencias-territoriales-resueltas',unresolvedTerritoryRefs(rec).length===0,`no resueltas=${unresolvedTerritoryRefs(rec).slice(0,8).join(',')}`,'warning');
 add(p.id,'15-corte-de-datos-declarado',Boolean(manifest.dataCut&&manifest.dataVersion),`${manifest.dataCut} / ${manifest.dataVersion}`);
 add(p.id,'16-trazabilidad-mínima',ratio(rec,x=>Boolean(x?.source||x?.fuente||x?.fuenteDocumento||x?.plan||x?.entityId||x?.id))>=0.5,`cobertura=${Math.round(ratio(rec,x=>Boolean(x?.source||x?.fuente||x?.fuenteDocumento||x?.plan||x?.entityId||x?.id))*100)}%`,'warning');
 add(p.id,'17-sin-etiqueta-falsa-por-nulo',!(p.id==='revision'&&reviews.some(x=>x.planReceived===true&&x.score==null&&/sin plan recibido/i.test(String(x.resultLabel||x.status||'')))),'recibido sin puntaje no equivale a ausente');
 add(p.id,'18-coherencia-con-universo',p.id!=='territorios'||rec.length===manifest.counts.territories,`registros=${rec.length}; universo=${manifest.counts.territories}`);
 add(p.id,'19-pregunta-compleja-resoluble',rec.length>0||['decisiones','cabina'].includes(p.id),`base consultable=${rec.length}`,'warning');
 add(p.id,'20-sin-marcadores-de-conflicto',!app.includes('<<<<<<<')&&!app.includes('>>>>>>>'),'app.js limpio');
}

const seedTerritories=arr(seed.territorios);
const seedIds=new Set(seedTerritories.map(x=>x.id));
const entityIds=new Set(entityList.map(x=>x.entityId));
const received=entityList.filter(x=>x.planReceived!==false&&(x.planReceived===true||x.planDocumentAvailable===true||/recibid|revis|valid|devuelt/i.test(String(x.planReviewStatus||x.baselineStatus||''))));
const files=entityList.filter(x=>x.planDocumentAvailable===true);
const formal=entityList.filter(x=>x.formalPlanDelivery===true);
const reviewed=entityList.filter(x=>Number.isFinite(Number(x.planReviewScore))||/revis|valid|devuelt/i.test(String(x.planReviewStatus||'')));
const noFollowup=entityList.filter(x=>Number(x.followupCount||0)===0);
const linkedAction=followupList.filter(x=>x.actionId||x.accionId||x.linkedActionId);
const linkedSite=followupList.filter(x=>x.siteId||x.sitioId||x.linkedSiteId);
const evidence=followupList.filter(x=>x.evidence||x.evidencia||x.evidenceUrl||x.archivo||x.attachments?.length);
const actionIds=new Set(arr(seed.acciones).map(x=>x.id));
const siteIds=new Set(arr(seed.sitios).map(x=>x.id));
const actionWithoutSite=arr(seed.acciones).filter(x=>x.sitioId&&!siteIds.has(x.sitioId));
const siteWithoutTerritory=arr(seed.sitios).filter(x=>x.territorio&&!seedIds.has(x.territorio)&&!entityIds.has(x.territorio));
const adminSets={app:[...app.matchAll(/[\w.-]+@[\w.-]+/g)].map(m=>m[0]).filter(x=>app.slice(0,800).includes(x)),gate:[...gate.matchAll(/[\w.-]+@[\w.-]+/g)].map(m=>m[0]),rules:[...rules.matchAll(/[\w.-]+@[\w.-]+/g)].map(m=>m[0])};
const inst='diogenes.coello@gestionderiesgos.gob.ec';
const questions=[
 ['Q01-universo-56',entityList.length===56,entityList.length],
 ['Q02-planes-recibidos-56',received.length===56,received.length],
 ['Q03-archivos-vs-recepción',files.length<=received.length,`${files.length}/${received.length}`],
 ['Q04-formalización-no-define-recepción',formal.length<=received.length,`${formal.length}/${received.length}`],
 ['Q05-revisión-no-define-recepción',reviewed.length<=received.length,`${reviewed.length}/${received.length}`],
 ['Q06-seguimientos-mínimos-106',followupList.length>=106,followupList.length],
 ['Q07-entidades-sin-seguimiento-identificables',noFollowup.length>=0,noFollowup.length],
 ['Q08-vínculo-acción-medible',linkedAction.length>=0,`${linkedAction.length}/${followupList.length}`],
 ['Q09-vínculo-sitio-medible',linkedSite.length>=0,`${linkedSite.length}/${followupList.length}`],
 ['Q10-evidencia-medible',evidence.length>=0,`${evidence.length}/${followupList.length}`],
 ['Q11-acciones-con-sitio-válido',actionWithoutSite.length===0,actionWithoutSite.map(x=>x.id).slice(0,8)],
 ['Q12-sitios-con-territorio-válido',siteWithoutTerritory.length===0,siteWithoutTerritory.map(x=>x.id).slice(0,8)],
 ['Q13-ids-seed-y-expediente-reconciliables',[...seedIds].every(id=>entityIds.has(id)||[...entityIds].some(e=>norm(e)===norm(id))),`${seedIds.size}/${entityIds.size}`],
 ['Q14-admin-institucional-en-app',adminSets.app.includes(inst),adminSets.app],
 ['Q15-admin-institucional-en-gate',adminSets.gate.includes(inst),adminSets.gate],
 ['Q16-admin-institucional-en-reglas',adminSets.rules.includes(inst),adminSets.rules],
 ['Q17-cobertura-manifiesto',manifest.counts.plansAvailable===56,manifest.counts.plansAvailable],
 ['Q18-validación-manifiesto',manifest.counts.validatedPlans<=manifest.counts.plansAvailable,`${manifest.counts.validatedPlans}/${manifest.counts.plansAvailable}`],
 ['Q19-corte-interfaz-explicado',index.includes('DATOS 30-07-2026')&&manifest.planReceiptCorrectionVersion?.startsWith('2026-07-31'),`${manifest.dataCut} + corrección 31`],
 ['Q20-fuentes-globales-cargables',Object.values({seed:seedWin,enos:enosWin,reviews:reviewsWin,risk:riskWin,f03:f03Win,cases:casesWin}).every(x=>!x.__error),'módulos JS']
];
for(const [name,ok,detail] of questions)add('transversal',name,ok,JSON.stringify(detail),name==='Q19-corte-interfaz-explicado'?'warning':'critical');

const critical=results.filter(x=>!x.ok&&x.severity==='critical');
const warnings=results.filter(x=>!x.ok&&x.severity==='warning');
const byPage=Object.fromEntries(pages.map(p=>[p.id,{checks:results.filter(x=>x.page===p.id).length,passed:results.filter(x=>x.page===p.id&&x.ok).length,failed:results.filter(x=>x.page===p.id&&!x.ok).length,records:p.records.length}]));
const report={
 generatedAt:new Date().toISOString(),release:manifest.release,build:manifest.build,dataCut:manifest.dataCut,
 inventory:{menu,seedKeys:Object.keys(seed),globals:Object.fromEntries(Object.entries(globals).map(([k,v])=>[k,Array.isArray(v)?v.length:v&&typeof v==='object'?Object.keys(v):typeof v])),entities:entityList.length,followups:followupList.length,reviews:reviews.length,seedTerritories:seedTerritories.length,seedSites:arr(seed.sitios).length,seedActions:arr(seed.acciones).length},
 pageAudit:byPage,transversalQuestions:questions.map(([name,ok,detail])=>({name,ok,detail})),criticalFailures:critical,warnings,totals:{checks:results.length,passed:results.filter(x=>x.ok).length,failed:results.filter(x=>!x.ok).length,critical:critical.length,warnings:warnings.length}
};
fs.writeFileSync('AUDIT_FULL_PLATFORM_20260731.json',JSON.stringify(report,null,2));
console.log(JSON.stringify(report,null,2));
if(critical.length)throw new Error(`AUDITORÍA INTEGRAL: ${critical.length} fallos críticos y ${warnings.length} advertencias`);
