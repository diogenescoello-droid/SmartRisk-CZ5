(() => {
  "use strict";

  const RELEASE="RC14.4.4 RC9";
  const VERSION="2026-07-31T14:13:00-05:00";
  let wrapped=false;
  let applying=false;
  let attempts=0;

  const normalize=value=>String(value||"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim()
    .toLowerCase();
  const percent=(part,total)=>total?Math.round(part/total*100):0;
  const unique=values=>[...new Set(values.filter(Boolean))];

  function scopeState(){return window.SmartRiskScope?.getState?.()||null}
  function isAdministrator(){return Boolean(window.SmartRiskScope?.isAdministrator?.())}
  function territories(){return window.SmartRiskScope?.availableTerritories?.()||[]}

  function locationIndex(){
    const rows=territories();
    return {
      rows,
      ids:new Set(rows.map(item=>String(item?.id||""))),
      cantons:new Set(rows.map(item=>normalize(item?.canton))),
      provinces:new Set(rows.map(item=>normalize(item?.provincia)))
    };
  }

  function matchRecord(item,index=locationIndex()){
    if(isAdministrator())return true;
    if(!item||typeof item!=="object")return false;

    const territoryId=String(item.territorio||item.territorioId||item.territoryId||item.cantonId||item.entityId||"");
    if(territoryId&&index.ids.has(territoryId))return true;

    const canton=normalize(item.canton||item.cantón||item.municipio||item.territory||item.territorioNombre||item.shortName||item.name);
    const province=normalize(item.provincia||item.province||item.provinciaNombre);
    if(canton&&index.cantons.has(canton))return !province||index.provinces.has(province);

    const scope=scopeState();
    if(scope?.scopeType==="provincial"&&province&&index.provinces.has(province))return true;
    return false;
  }

  function reviewReceived(review){
    const status=normalize(review?.status||review?.planReviewStatus||review?.baselineStatus);
    if(review?.planReceived===false||status.includes("sin plan")||status.includes("no recibido"))return false;
    if(review?.planReceived===true)return true;
    if(status.includes("recibid")||status.includes("devuelt")||status.includes("revision")||status.includes("correccion"))return true;
    if(review?.documentAvailable===true||review?.planDocumentAvailable===true)return true;
    if(review?.plan&&normalize(review.plan)!=="no disponible")return true;
    return review?.score!=null||review?.reviewScore!=null;
  }

  function reviewEvaluated(review){return review?.score!=null||review?.reviewScore!=null||Boolean(review?.criteria?.length)}

  function filterReviews(index){
    const pack=window.ENOS_REVIEWS;
    if(!pack||!Array.isArray(pack.reviews))return;
    pack.reviews=pack.reviews.filter(item=>matchRecord(item,index));
    const reviews=pack.reviews;
    const canonical=Math.max(1,index.rows.length);
    const received=reviews.filter(reviewReceived).length;
    const evaluated=reviews.filter(reviewEvaluated).length;
    const missing=Math.max(0,canonical-received);
    const totalChecklist=reviews.reduce((sum,item)=>sum+Number(item?.totalChecklist||item?.checklist?.length||0),0);
    const validated=reviews.filter(item=>normalize(item?.planReviewStatus||item?.status).includes("validado")).length;
    pack.stats={...(pack.stats||{}),canonicalTerritories:canonical,folders:canonical,plansReceived:received,plansEvaluated:evaluated,missingPlans:missing,totalChecklist,territorialCoverage:percent(received,canonical),reviewCompletion:percent(evaluated,received),validatedPlans:validated,scopeFiltered:true,scopeLabel:window.SmartRiskScope?.scopeLabel?.()||"Alcance autorizado"};
  }

  function filterRiskLocations(index){
    const pack=window.ENOS_RISK_LOCATIONS;
    if(!pack||!Array.isArray(pack.locations))return;
    pack.locations=pack.locations.filter(item=>matchRecord(item,index));
    const locations=pack.locations,byType={},byQuality={};
    locations.forEach(item=>{
      const type=item?.type||item?.tipo||item?.geometryType||"Sin tipo";
      const quality=item?.quality||item?.calidad||item?.qualityLevel||"Sin calificar";
      byType[type]=(byType[type]||0)+1;
      byQuality[quality]=(byQuality[quality]||0)+1;
    });
    pack.stats={...(pack.stats||{}),mentions:locations.length,territoriesWithMentions:unique(locations.map(item=>normalize(item?.territory||item?.canton||item?.municipio))).length,plansReviewed:Math.max(1,index.rows.length),byType,byQuality,scopeFiltered:true};
  }

  function filterCases(index){
    const pack=window.CZ5_CASES;
    if(!pack||typeof pack!=="object")return;
    ["cases","events","records","locations","summaries"].forEach(key=>{if(Array.isArray(pack[key]))pack[key]=pack[key].filter(item=>matchRecord(item,index))});
    pack.scope=window.SmartRiskScope?.scopeLabel?.()||pack.scope;
    pack.scopeFiltered=true;
  }

  function applyGlobals(){
    if(isAdministrator())return;
    const index=locationIndex();
    if(!index.rows.length)return;
    filterReviews(index);
    filterRiskLocations(index);
    if(Array.isArray(window.F03_CARTOGRAPHY))window.F03_CARTOGRAPHY=window.F03_CARTOGRAPHY.filter(item=>matchRecord(item,index));
    if(Array.isArray(window.SMART_RISK_PLAN_UPDATE))window.SMART_RISK_PLAN_UPDATE=window.SMART_RISK_PLAN_UPDATE.filter(item=>matchRecord(item,index));
    if(window.ENOS_IMPORT&&Array.isArray(window.ENOS_IMPORT.sites))window.ENOS_IMPORT.sites=window.ENOS_IMPORT.sites.filter(item=>matchRecord(item,index));
    filterCases(index);
  }

  function applyData(){
    if(isAdministrator())return;
    try{
      if(typeof data!=="undefined"&&data&&window.SmartRiskScope?.filterData){
        data=window.SmartRiskScope.filterData(data);
        localStorage.setItem("smartrisk-cz5-data-v1",JSON.stringify(data));
      }
    }catch(error){console.warn("SmartRisk: no fue posible reforzar el alcance de data",error)}
  }

  function updateVisibleVersion(){
    const brand=document.querySelector(".brand span");
    if(brand){
      const label=window.SmartRiskScope?.scopeLabel?.()||"Alcance autorizado";
      const desired=`CZ5 · ${RELEASE} · ${label}`;
      if(brand.textContent!==desired)brand.textContent=desired;
    }
    document.querySelectorAll(".r023-banner .badge").forEach(badge=>{if(badge.textContent!==RELEASE)badge.textContent=RELEASE});
    document.querySelectorAll("header .badge, header .pill").forEach(element=>{
      if(/RC14\.4\.4\s+RC\d+/i.test(element.textContent||""))element.textContent=String(element.textContent).replace(/RC14\.4\.4\s+RC\d+/ig,RELEASE);
    });
    document.documentElement.dataset.smartRiskRelease=RELEASE;
  }

  function enforce(){
    if(applying)return;
    applying=true;
    try{applyGlobals();applyData();updateVisibleVersion()}finally{applying=false}
  }

  function installRuntime(){
    if(wrapped||typeof window.render!=="function")return false;
    const original=window.render;
    window.render=function(...args){
      enforce();
      const result=original.apply(this,args);
      requestAnimationFrame(updateVisibleVersion);
      return result;
    };
    wrapped=true;
    enforce();
    try{window.render()}catch(error){console.warn("SmartRisk: no fue posible repintar el alcance",error)}
    return true;
  }

  const timer=setInterval(()=>{
    attempts++;
    const state=scopeState();
    if(state&&!isAdministrator())enforce();
    if(state&&installRuntime()){
      clearInterval(timer);
      setTimeout(enforce,500);
      setTimeout(enforce,2000);
      setTimeout(enforce,8000);
    }else if(attempts>600)clearInterval(timer);
  },100);

  window.SMART_RISK_TERRITORIAL_SCOPE_GUARD=Object.freeze({version:VERSION,release:RELEASE,apply:enforce,matchRecord});
})();