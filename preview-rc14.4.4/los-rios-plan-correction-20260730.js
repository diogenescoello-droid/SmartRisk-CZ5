(()=>{
"use strict";
const CORRECTION={"version":"2026-07-30T22:56:00-05:00","cutDate":"2026-07-30","entityId":"TER-PROV-LOS-RIOS","province":"Los Ríos","territory":"Los Ríos","level":"Provincial","planDocumentAvailable":true,"formalPlanDelivery":false,"planReviewStatus":"En revisión · plan funcional parcial (68 %) · corrección progresiva","planFinalUrl":"https://drive.google.com/file/d/1OORaykZcWJHJe3zPWB9dXn_pCc84RKDT/view","planDraftUrl":"","planDeliveryDate":"2026-06-25","planReviewScore":68,"planReviewClassification":"Plan funcional parcial","planCorrectionStatus":"En corrección progresiva","planSignatureStatus":"Plan firmado recibido; formalización institucional completa pendiente","planOfficialReference":"Correo institucional de la Prefectura de Los Ríos recibido el 25-06-2026","planReviewReportUrl":"https://drive.google.com/file/d/11cWFIu56jVBp-VWVB_gyeBumfrF4u1_I/view","planParticularities":"Plan provincial firmado recibido y revisado al 68 %. Presenta estructura provincial, amenazas, COE, fases, 43 equipos, monitoreo, comunicación, firmas y cartografía. La Prefectura debe continuar corrigiendo la cuantificación de población y viviendas expuestas por cantón y sector, ampliar puntos críticos, incorporar presupuesto por acción, cronograma, indicadores y verificables, alojamientos temporales, rutas de evacuación, puntos seguros, asistencia humanitaria y anexos F01–F07. La información parcial permanece visible para acompañar su mejora progresiva."};
const STORE_KEY="smartrisk-cz5-data-v1";
const ADMIN_EMAILS=new Set(["geopro.ec2@gmail.com","dcoellom2@unemi.edu.ec","diogenes.coello@gestionderiesgos.gob.ec"]);
const norm=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
const matches=item=>item?.entityId===CORRECTION.entityId||(norm(item?.province||item?.provincia)===norm(CORRECTION.province)&&norm(item?.level||item?.nivel)===norm(CORRECTION.level));
const entityPatch=()=>({
  entityId:CORRECTION.entityId,
  name:"GAD Provincial de Los Ríos",
  shortName:"Los Ríos",
  province:CORRECTION.province,
  level:CORRECTION.level,
  entityType:"GAD provincial",
  scopeKey:`TER:${CORRECTION.entityId}`,
  baselineStatus:"Plan firmado recibido · revisado · en corrección progresiva",
  planDocumentAvailable:CORRECTION.planDocumentAvailable,
  formalPlanDelivery:CORRECTION.formalPlanDelivery,
  planReviewStatus:CORRECTION.planReviewStatus,
  planFinalUrl:CORRECTION.planFinalUrl,
  planDraftUrl:CORRECTION.planDraftUrl,
  planDeliveryDate:CORRECTION.planDeliveryDate,
  planParticularities:CORRECTION.planParticularities,
  planOfficialReference:CORRECTION.planOfficialReference,
  planReviewScore:CORRECTION.planReviewScore,
  planReviewClassification:CORRECTION.planReviewClassification,
  planCorrectionStatus:CORRECTION.planCorrectionStatus,
  planSignatureStatus:CORRECTION.planSignatureStatus,
  planReviewReportUrl:CORRECTION.planReviewReportUrl,
  requiresAttention:true
});
const apply=target=>{
  target=target&&typeof target==="object"?target:{};
  const entities=Array.isArray(target.entidadesSeguimiento)?target.entidadesSeguimiento:[];
  const index=entities.findIndex(matches);
  const patch=entityPatch();
  if(index>=0)entities[index]={...entities[index],...structuredClone(patch)};
  else entities.push(structuredClone(patch));
  target.entidadesSeguimiento=entities;
  const previous=target._latestDataSnapshot||{};
  target._latestDataSnapshot={
    ...previous,
    cutDate:CORRECTION.cutDate,
    summary:{...(previous.summary||{}),planDocumentsAvailable:56,plansAvailable:56},
    corrections:{...(previous.corrections||{}),losRiosProvincialPlan:CORRECTION.version},
    lastDocumentCorrectionAt:new Date().toISOString()
  };
  return target;
};
const updateViews=()=>{
  const patch=entityPatch();
  const current=Array.isArray(window.SMART_RISK_PLAN_UPDATE)?window.SMART_RISK_PLAN_UPDATE:[];
  const filtered=current.filter(item=>item?.entityId!==CORRECTION.entityId&&!(norm(item?.province)===norm(CORRECTION.province)&&norm(item?.territory)===norm(CORRECTION.territory)&&norm(item?.level)===norm(CORRECTION.level)));
  window.SMART_RISK_PLAN_UPDATE=[...filtered,{...patch,territory:CORRECTION.territory}];
  if(!window.ENOS_REVIEWS)return;
  const stats=window.ENOS_REVIEWS.stats||{};
  Object.assign(stats,{canonicalTerritories:56,folders:56,plansReceived:56,plansEvaluated:56,reviewCompletion:100,formalPlanDeliveries:53,validatedPlans:52,returnedPlans:4,dataCut:CORRECTION.cutDate});
  window.ENOS_REVIEWS.stats=stats;
  const reviews=Array.isArray(window.ENOS_REVIEWS.reviews)?window.ENOS_REVIEWS.reviews:[];
  let review=reviews.find(item=>item?.entityId===CORRECTION.entityId)||reviews.find(item=>norm(item?.province)===norm(CORRECTION.province)&&norm(item?.level||item?.type||item?.tipo)==="provincial");
  if(!review){review={entityId:CORRECTION.entityId,province:CORRECTION.province,territory:CORRECTION.territory,level:CORRECTION.level};reviews.push(review)}
  Object.assign(review,{
    entityId:CORRECTION.entityId,
    province:CORRECTION.province,
    territory:CORRECTION.territory,
    level:CORRECTION.level,
    documentAvailable:true,
    formalDelivery:false,
    planReviewStatus:CORRECTION.planReviewStatus,
    planFinalUrl:CORRECTION.planFinalUrl,
    planDraftUrl:"",
    planDeliveryDate:CORRECTION.planDeliveryDate,
    reviewScore:CORRECTION.planReviewScore,
    reviewClassification:CORRECTION.planReviewClassification,
    correctionStatus:CORRECTION.planCorrectionStatus,
    signatureStatus:CORRECTION.planSignatureStatus,
    reviewReportUrl:CORRECTION.planReviewReportUrl,
    particularities:CORRECTION.planParticularities
  });
  window.ENOS_REVIEWS.reviews=reviews;
};
const completeBase=value=>Boolean(Array.isArray(value?.entidadesSeguimiento)&&value.entidadesSeguimiento.length===56&&Array.isArray(value?.seguimientos)&&value.seguimientos.length>=106);
const enough=value=>Boolean(value?._latestDataSnapshot?.corrections?.losRiosProvincialPlan===CORRECTION.version&&completeBase(value)&&value.entidadesSeguimiento.some(item=>matches(item)&&item.planDocumentAvailable===true&&Number(item.planReviewScore)===68));
const paint=()=>{
  try{
    data=apply(data);
    updateViews();
    if(typeof normalizeDataShape==="function")normalizeDataShape();
    localStorage.setItem(STORE_KEY,JSON.stringify(data));
    if(typeof render==="function")render();
    if(typeof setSyncStatus==="function")setSyncStatus("56 planes disponibles · Los Ríos revisado al 68 %",cloudReady?"synced":"local");
  }catch(error){console.error("SmartRisk corrección documental Los Ríos",error)}
};
const migrate=async()=>{
  let admin=false;
  try{
    const email=norm(session?.email);
    admin=ADMIN_EMAILS.has(email)||(typeof isAdmin==="function"&&isAdmin())||norm(currentProfile?.rol)==="administrador";
  }catch{}
  if(!admin||typeof db==="undefined"||typeof CLOUD_DOC==="undefined")return;
  let committed=null;
  try{
    await db.runTransaction(async transaction=>{
      const ref=db.doc(CLOUD_DOC),snapshot=await transaction.get(ref),remote=snapshot.exists?snapshot.data():{};
      if(enough(remote)){committed=remote;return}
      if(!completeBase(data))throw new Error("La base local validada aún no contiene 56 entidades y 106 seguimientos.");
      const source=completeBase(remote)?structuredClone(remote):structuredClone(data);
      const merged=apply(source);
      merged._revision=Number(remote._revision||0)+1;
      const size=new Blob([JSON.stringify(merged)]).size;
      if(size>880000)throw new Error(`Límite Firestore: ${size} bytes`);
      transaction.set(ref,merged);
      committed=merged;
    });
    if(committed){
      data=committed;
      updateViews();
      cloudRevision=Number(committed._revision||cloudRevision||0);
      if(typeof normalizeDataShape==="function")normalizeDataShape();
      localStorage.setItem(STORE_KEY,JSON.stringify(data));
      if(typeof render==="function")render();
      if(typeof setSyncStatus==="function")setSyncStatus("Sincronizado · 56 planes · Los Ríos en corrección","synced");
    }
  }catch(error){
    console.warn("SmartRisk persistencia Los Ríos",error);
    if(typeof setSyncStatus==="function")setSyncStatus("Los Ríos actualizado · pendiente verificar nube","local");
  }
};
let attempts=0;
const timer=setInterval(async()=>{
  attempts++;
  let ready=false,baseReady=false;
  try{ready=typeof data!=="undefined"&&typeof session!=="undefined"&&Boolean(session);baseReady=completeBase(data)}catch{}
  if((!ready||!baseReady)&&attempts<120)return;
  clearInterval(timer);
  if(!ready)return;
  if(!enough(data))paint();else updateViews();
  await migrate();
},250);
window.SMART_RISK_LOS_RIOS_PLAN_CORRECTION=Object.freeze({...CORRECTION,plansAvailable:56,safeCloudFallback:true});
})();
