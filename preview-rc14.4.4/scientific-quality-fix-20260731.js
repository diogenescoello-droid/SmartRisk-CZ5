(()=>{
"use strict";
const original=globalThis.scientificQualitySnapshot;
if(typeof original!=="function"){
  console.warn("SmartRisk: no se encontró scientificQualitySnapshot para aplicar la corrección científica.");
  return;
}
const norm=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
const asNumber=value=>Number.isFinite(Number(value))?Number(value):0;
const percent=(part,total)=>total?Math.round(part/total*100):0;
function uniqueCount(items,keyFn){
  return new Set((items||[]).map(keyFn).filter(Boolean)).size;
}
function correctedScientificQualitySnapshot(){
  const snapshot=original();
  const stats=globalThis.ENOS_REVIEWS?.stats||{};
  const reviews=Array.isArray(globalThis.ENOS_REVIEWS?.reviews)?globalThis.ENOS_REVIEWS.reviews:[];
  let entities=[],followups=[],validations=[];
  try{
    entities=Array.isArray(data?.entidadesSeguimiento)?data.entidadesSeguimiento:[];
    followups=Array.isArray(data?.seguimientos)?data.seguimientos:[];
    validations=Array.isArray(data?.validaciones)?data.validaciones:[];
  }catch{}

  const canonical=Math.max(asNumber(stats.canonicalTerritories),asNumber(stats.folders),entities.length,56);
  const plansFromEntities=entities.filter(item=>item?.planDocumentAvailable===true).length;
  const plansFromReview=reviews.filter(item=>item?.documentAvailable!==false&&(item?.planFinalUrl||item?.plan||item?.reviewScore!=null||item?.score!=null||item?.planReviewStatus)).length;
  const plansReceived=Math.min(canonical,Math.max(asNumber(stats.plansReceived),plansFromEntities,plansFromReview));

  const evaluatedFromReview=reviews.filter(item=>item?.reviewScore!=null||item?.score!=null||item?.criteria?.length||item?.planReviewStatus||item?.status).length;
  const plansEvaluated=Math.min(plansReceived,Math.max(asNumber(stats.plansEvaluated),evaluatedFromReview));

  const validatedFromRecords=uniqueCount(
    validations.filter(item=>norm(item?.estado||item?.status)==="validado"),
    item=>item?.territorio||item?.territory||item?.entityId
  );
  const validatedFromReviews=uniqueCount(
    reviews.filter(item=>norm(item?.planReviewStatus||item?.status||item?.reviewClassification).includes("validado")),
    item=>item?.entityId||`${norm(item?.province)}|${norm(item?.territory)}|${norm(item?.level||item?.type||item?.tipo)}`
  );
  const validatedPlans=Math.min(canonical,Math.max(asNumber(stats.validatedPlans),validatedFromRecords,validatedFromReviews));

  Object.assign(stats,{
    canonicalTerritories:canonical,
    folders:canonical,
    plansReceived,
    plansEvaluated,
    territorialCoverage:percent(plansReceived,canonical),
    reviewCompletion:percent(plansEvaluated,plansReceived),
    validatedPlans
  });
  if(globalThis.ENOS_REVIEWS)globalThis.ENOS_REVIEWS.stats=stats;

  const dimensions=(snapshot?.dimensions||[]).map(item=>{
    if(item.label==="Cobertura documental ENOS")return {...item,value:percent(plansReceived,canonical),detail:`${plansReceived} de ${canonical} entidades con plan`};
    if(item.label==="Extracción de planes recibidos")return {...item,value:percent(plansEvaluated,plansReceived),detail:`${plansEvaluated} de ${plansReceived} documentos procesados`};
    if(item.label==="Validación técnica territorial")return {...item,value:percent(validatedPlans,canonical),detail:`${validatedPlans} de ${canonical} planes con validación documental registrada`};
    return item;
  });

  const warnings=(snapshot?.warnings||[]).filter(text=>!norm(text).includes("procesado automaticamente no significa validado"));
  warnings.unshift(
    "Procesado y revisado no significan necesariamente validado: la validación documental exige un estado técnico registrado.",
    "Los Ríos cuenta como plan recibido y revisado al 68 %, pero permanece en corrección progresiva y no se suma a los planes validados.",
    "La validación documental del plan no equivale al cierre del expediente ni a la corroboración de los seguimientos F07."
  );

  return {...snapshot,dimensions,warnings,scientificCorrection:{version:"2026-07-31T00:05:00-05:00",canonical,plansReceived,plansEvaluated,validatedPlans,followups:followups.length}};
}
globalThis.scientificQualitySnapshot=correctedScientificQualitySnapshot;
globalThis.SMART_RISK_SCIENTIFIC_QUALITY_FIX=Object.freeze({
  version:"2026-07-31T00:05:00-05:00",
  derivesPercentagesFromCounts:true,
  separatesProcessedReviewedValidated:true,
  losRiosValidated:false
});
})();
