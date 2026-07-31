(()=>{
"use strict";
const PAYLOAD="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";
const STORE_KEY="smartrisk-cz5-data-v1";
const n=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g," ").trim().toLowerCase();
const fkey=item=>String(item?.followupId||item?.id||`${item?.submissionId||""}|${item?.actionOrCommitment||item?.accion_o_compromiso||item?.description||""}`);
async function decode(){
  const bytes=Uint8Array.from(atob(PAYLOAD),c=>c.charCodeAt(0));
  if(typeof DecompressionStream!=="function")throw new Error("El navegador no admite descompresión de la actualización.");
  return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text());
}
decode().then(delta=>{
  const baseline=window.SMART_RISK_PILOT_BASELINE;
  if(!baseline)throw new Error("No se cargó la línea base de seguimiento.");
  const VERSION=delta.config.version;
  const prepareBaseline=()=>{
    const emap=new Map((baseline.entities||[]).map(item=>[item.entityId,item]));
    (delta.entityPatches||[]).forEach(patch=>emap.set(patch.entityId,{...(emap.get(patch.entityId)||{}),...patch}));
    baseline.entities=[...emap.values()];
    const fmap=new Map((baseline.followups||[]).map(item=>[fkey(item),item]));
    (delta.followups||[]).forEach(item=>fmap.set(fkey(item),{...(fmap.get(fkey(item))||{}),...item}));
    baseline.followups=[...fmap.values()];
    baseline.summary={...(baseline.summary||{}),...delta.summary};
    baseline.config={...(baseline.config||{}),version:VERSION,cutDate:delta.config.cutDate,sourceWorkbook:"F07 V6 + matriz documental + correo institucional"};
  };
  prepareBaseline();
  const mergeEntity=(incoming,existing)=>{
    if(!existing)return structuredClone(incoming);
    const merged={...incoming,...existing};
    for(const key of ["name","shortName","province","level","entityType","scopeKey","baselineStatus","formCount","followupCount","emailRecordCount","latestPeriod","latestSubmissionAt","declaredProgressLatestPeriod","linkedActionCount","linkedSiteCount","evidenceAttachedCount","requiresAttention","planDocumentAvailable","formalPlanDelivery","planReviewStatus","planFinalUrl","planDraftUrl","planDeliveryDate","planParticularities","planOfficialReference","latestReporter","latestReporterEmail"])if(Object.prototype.hasOwnProperty.call(incoming,key))merged[key]=incoming[key];
    return merged;
  };
  const applyTo=target=>{
    target=target&&typeof target==="object"?target:{};
    const current=Array.isArray(target.entidadesSeguimiento)?target.entidadesSeguimiento:[];
    target.entidadesSeguimiento=(baseline.entities||[]).map(incoming=>{
      const existing=current.find(item=>item?.entityId===incoming.entityId)||current.find(item=>n(item?.province||item?.provincia)===n(incoming.province)&&n(item?.shortName||item?.canton||item?.territory)===n(incoming.shortName)&&n(item?.level||item?.nivel)===n(incoming.level));
      return mergeEntity(incoming,existing);
    });
    const followups=new Map((baseline.followups||[]).map(item=>[fkey(item),structuredClone(item)]));
    (Array.isArray(target.seguimientos)?target.seguimientos:[]).forEach(item=>{
      const key=fkey(item),base=followups.get(key);
      followups.set(key,base?{...base,...item,entityId:base.entityId||item.entityId,territorioId:base.territorioId||item.territorioId,province:base.province||item.province,canton:base.canton||item.canton,period:base.period||item.period,submittedAt:base.submittedAt||item.submittedAt,sourceType:base.sourceType||item.sourceType}:item);
    });
    target.seguimientos=[...followups.values()];
    target._latestDataSnapshot={version:VERSION,cutDate:delta.config.cutDate,summary:delta.summary,sources:{kobo:delta.config.sourceKobo,plans:delta.config.sourcePlans,email:delta.config.sourceEmail},appliedAt:new Date().toISOString()};
    return target;
  };
  const updatePlanView=()=>{
    window.SMART_RISK_PLAN_UPDATE=delta.planPatches;
    if(!window.ENOS_REVIEWS)return;
    const stats=window.ENOS_REVIEWS.stats||{};
    Object.assign(stats,{canonicalTerritories:56,folders:56,plansReceived:55,plansEvaluated:55,reviewCompletion:100,formalPlanDeliveries:53,validatedPlans:52,returnedPlans:4,dataCut:delta.config.cutDate});
    window.ENOS_REVIEWS.stats=stats;
    (window.ENOS_REVIEWS.reviews||[]).forEach(review=>{
      const patch=(delta.planPatches||[]).find(item=>n(item.province)===n(review.province)&&n(item.territory)===n(review.territory));
      if(!patch)return;
      review.documentAvailable=patch.planDocumentAvailable;review.formalDelivery=patch.formalPlanDelivery;review.planReviewStatus=patch.planReviewStatus;review.planFinalUrl=patch.planFinalUrl;review.planDraftUrl=patch.planDraftUrl;review.planDeliveryDate=patch.planDeliveryDate;
    });
  };
  updatePlanView();
  const currentEnough=value=>value?._latestDataSnapshot?.version===VERSION&&Array.isArray(value.entidadesSeguimiento)&&value.entidadesSeguimiento.length===56&&Array.isArray(value.seguimientos)&&value.seguimientos.length>=106;
  const paint=()=>{
    try{
      data=applyTo(data);
      if(typeof normalizeDataShape==="function")normalizeDataShape();
      localStorage.setItem(STORE_KEY,JSON.stringify(data));
      updatePlanView();
      if(typeof render==="function")render();
      if(typeof setSyncStatus==="function")setSyncStatus(`Datos al 30-07-2026 · ${data.seguimientos.length} seguimientos`,cloudReady?"synced":"local");
    }catch(error){console.error("SmartRisk actualización local",error)}
  };
  const migrate=async()=>{
    let admin=false;
    try{admin=(typeof isAdmin==="function"&&isAdmin())||String(currentProfile?.rol||"").toLowerCase()==="administrador"}catch{}
    if(!admin||typeof db==="undefined")return;
    let committed=null;
    try{
      await db.runTransaction(async transaction=>{
        const ref=db.doc(CLOUD_DOC),snapshot=await transaction.get(ref),remote=snapshot.exists?snapshot.data():{};
        if(currentEnough(remote)){committed=remote;return}
        const merged=applyTo(structuredClone(remote));merged._revision=Number(remote._revision||0)+1;
        const size=new Blob([JSON.stringify(merged)]).size;
        if(size>880000)throw new Error(`Límite Firestore: ${size} bytes`);
        transaction.set(ref,merged);committed=merged;
      });
      if(committed){data=committed;cloudRevision=Number(committed._revision||cloudRevision||0);if(typeof normalizeDataShape==="function")normalizeDataShape();localStorage.setItem(STORE_KEY,JSON.stringify(data));updatePlanView();if(typeof render==="function")render();if(typeof setSyncStatus==="function")setSyncStatus("Sincronizado · corte 30-07-2026","synced")}
    }catch(error){console.warn("SmartRisk actualización compartida",error);if(typeof setSyncStatus==="function")setSyncStatus("Datos actuales · respaldo local","local")}
  };
  let attempts=0;
  const timer=setInterval(async()=>{
    attempts++;
    let ready=false;try{ready=typeof data!=="undefined"&&typeof session!=="undefined"&&Boolean(session)}catch{}
    if(!ready)return;
    if(cloudReady||attempts>=80){clearInterval(timer);paint();await migrate()}
  },250);
  setInterval(()=>{try{if(typeof data!=="undefined"&&!currentEnough(data))paint()}catch{}},3000);
  window.SMART_RISK_LATEST_DATA_UPDATE=Object.freeze({version:VERSION,summary:delta.summary,deltaFollowups:delta.followups.length});
}).catch(error=>{console.error("SmartRisk actualización 30-07-2026",error);window.SMART_RISK_LATEST_DATA_UPDATE_ERROR=String(error?.message||error)});
})();
