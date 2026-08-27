(() => {
  "use strict";

  const VERSION = "2026.08.27.3";
  const CANTON_ALIASES = Object.freeze({
    "jujan":"alfredo baquerizo moreno","alfredo baquerizo moreno jujan":"alfredo baquerizo moreno",
    "general antonio elizalde":"general antonio elizalde bucay","general antonio elizalde bucay":"general antonio elizalde bucay","bucay":"general antonio elizalde bucay",
    "coronel marcelino mariduena":"marcelino mariduena","marcelino mariduena":"marcelino mariduena",
    "san jacinto de yaguachi":"yaguachi","yaguachi":"yaguachi","san miguel":"san miguel de bolivar","san miguel de bolivar":"san miguel de bolivar"
  });
  let scheduled=false, observer=null;
  const norm=value=>String(value||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g," ").trim().toLowerCase();
  const cantonKey=value=>CANTON_ALIASES[norm(value)]||norm(value);
  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[char]);
  const appState=()=>window.SmartRiskV11App?.state||{};
  const entity=name=>appState().data?.entities?.[name]||[];
  const matrixRows=()=>Array.isArray(window.ENOS_MATRIX_PRELIMINARY?.gads)?window.ENOS_MATRIX_PRELIMINARY.gads:[];
  const master=()=>window.SMART_RISK_GAD_REVIEW_CONTEXT||null;
  function isDesktop(){return window.SmartRiskDeviceMode?.isSmart?window.SmartRiskDeviceMode.isSmart()!==true:document.documentElement.dataset.smartRiskDevice!=="smart";}
  function currentRoute(){const hash=String(location.hash||"").replace(/^#\/?/,"").split(/[?&]/)[0];return hash||String(appState().route||"inicio");}
  function currentFilters(){const f=appState().filters||{};return{province:f.provincia||"",canton:f.canton||""};}
  function itemScope(item){return{province:item?.province??item?.provincia??item?.payload?.province??item?.payload?.provincia??"",canton:item?.territory??item?.canton??item?.payload?.territory??item?.payload?.canton??"",level:item?.level??item?.nivel??item?.payload?.level??item?.payload?.nivel??""};}
  function isTerritorial(item){const s=itemScope(item),level=norm(s.level);if(/zonal|nacional|institucional/.test(level))return false;return Boolean(s.province);}
  function matchesScope(item,province,canton){if(!isTerritorial(item))return false;const s=itemScope(item);if(province&&norm(s.province)!==norm(province))return false;if(canton&&cantonKey(s.canton)!==cantonKey(canton))return false;return true;}
  function provinceForRow(row){const n=Number(row?.number);if(n===1||n===4||n===5||n===56)return"Santa Elena";if(n===2||n===3||(n>=6&&n<=11))return"Bolívar";if(n===12||(n>=15&&n<=17))return"Galápagos";if(n===13||(n>=18&&n<=42))return"Guayas";if(n===14||(n>=43&&n<=55))return"Los Ríos";return"";}
  function cantonForRow(row){const name=String(row?.gad||"");if(!/^GAD Municipal de /i.test(name))return"";return cantonKey(name.replace(/^GAD Municipal de /i,""));}
  function matrixRowsForScope(province,canton){return matrixRows().filter(row=>(!province||norm(provinceForRow(row))===norm(province))&&(!canton||cantonForRow(row)===cantonKey(canton)));}
  function matrixRowForCanton(province,canton){return matrixRowsForScope(province,canton).find(row=>Boolean(cantonForRow(row)))||null;}
  const statusOf=(row,form)=>String(row?.statuses?.[form]||"Sin registro").trim();
  const hasDocumentarySignal=status=>Boolean(status)&&norm(status)!=="sin registro";
  function documentaryCoverage(row){if(!row)return{count:0,forms:[],actionStatus:"Sin registro",siteStatus:"Sin registro",f07Status:"Sin registro"};const forms=["F01","F02","F03","F04","F05","F06"].filter(form=>hasDocumentarySignal(statusOf(row,form)));return{count:forms.length,forms,actionStatus:statusOf(row,"F04"),siteStatus:statusOf(row,"F01"),f07Status:statusOf(row,"F07")};}
  const masterRow=(province,canton)=>master()?.find?.(province,canton)||null;
  const masterRowsForScope=(province,canton)=>master()?.scope?.(province,canton)||[];

  function planContext(){
    const{province,canton}=currentFilters();
    const followups=(Array.isArray(window.SMART_RISK_F07_CURRENT?.followups)?window.SMART_RISK_F07_CURRENT.followups:[]).filter(item=>matchesScope(item,province,canton));
    const scopedRows=matrixRowsForScope(province,canton), masterRows=masterRowsForScope(province,canton);
    if(canton){
      const row=matrixRowForCanton(province,canton),coverage=documentaryCoverage(row),doc=masterRow(province,canton);
      const legacyPlans=entity("plans").filter(item=>matchesScope(item,province,canton));
      const planReceived=Boolean(doc&&doc.outcome!=="No evaluable")||legacyPlans.length>0;
      return{level:"canton",province,canton,matrixRow:row,doc,planReceived,
        sourceStatus:doc?.outcome==="No evaluable"?"Fuente rectora pendiente":(planReceived?"Recibido":(coverage.count?"Referencia documental":"No estructurado")),
        format:doc?.format||"Por determinar",score:Number.isFinite(Number(doc?.score))?Number(doc.score):null,historicalScore:Number.isFinite(Number(doc?.historicalScore))?Number(doc.historicalScore):null,
        outcome:doc?.outcome||row?.validationState||"Pendiente de consolidación",priority:doc?.priority||"",source:doc?.source||"Fuente documental por consolidar",universe:doc?.universe||"Universo documental por consolidar",nextAction:doc?.next||"Completar la conciliación documental y operativa.",planUrl:doc?.planUrl||"",
        f07Count:followups.length,f07MatrixStatus:coverage.f07Status,actionMatrixStatus:coverage.actionStatus,siteMatrixStatus:coverage.siteStatus,coverageForms:coverage.forms};
    }
    const scored=masterRows.map(item=>Number(item.score)).filter(Number.isFinite),rowsWithF07Reference=scopedRows.filter(row=>hasDocumentarySignal(statusOf(row,"F07"))).length;
    return{level:province?"province":"zone",province,canton:"",gadCount:masterRows.length||scopedRows.length,matrixF07GadCount:rowsWithF07Reference,
      score:scored.length?Math.round((scored.reduce((sum,value)=>sum+value,0)/scored.length)*100)/100:null,f07Count:followups.length,
      criticalCount:masterRows.filter(item=>/CR[IÍ]TIC/i.test(item.priority||"")).length,noApprovedCount:masterRows.filter(item=>/no aprobado|no evaluable/i.test(item.outcome||"")).length};
  }

  function fact(label,value,detail,tone="neutral"){return`<div class="v1-plan-fact ${tone}"><span>${esc(label)}</span><b>${esc(value)}</b><small>${esc(detail)}</small></div>`;}
  function buildContextPanel(ctx){
    if(ctx.level==="canton"){
      const reviewValue=ctx.score!==null?`${ctx.score.toFixed(2)} %`:ctx.outcome;
      const history=ctx.historicalScore!==null?` Antecedente de otra rúbrica: ${ctx.historicalScore}/100; no se mezcla con la valoración normalizada vigente.`:"";
      const f07Value=ctx.f07Count?`${ctx.f07Count} registros`:(hasDocumentarySignal(ctx.f07MatrixStatus)?"Por conciliar":"Sin reporte");
      const f07Detail=ctx.f07Count?"Seguimientos del corte vigente dentro de este cantón.":hasDocumentarySignal(ctx.f07MatrixStatus)?`La matriz documental identifica F07 como “${ctx.f07MatrixStatus}”, pero no hay registro homologado visible en el corte actual.`:"No se identificó seguimiento F07 del cantón en el corte vigente.";
      return`<section class="v1-plan-context" data-plan-context-version="${VERSION}"><div class="v1-plan-context-head"><div><span>Contexto del expediente</span><h3>${esc(ctx.canton)} · ${esc(ctx.province)}</h3></div><em>${esc(ctx.priority||"Lectura técnica")}</em></div><div class="v1-plan-facts">
        ${fact("Plan ENOS",ctx.sourceStatus,`${ctx.source}. Estructura: ${ctx.format}.`,ctx.planReceived?"ok":"warn")}
        ${fact("Universo documental","En Plan",ctx.universe,"neutral")}
        ${fact("Revisión técnica",reviewValue,`${ctx.outcome}.${history}`,ctx.score!==null?"ok":"warn")}
        ${fact("Seguimiento F07",f07Value,f07Detail,ctx.f07Count?"ok":"warn")}
      </div><p class="v1-plan-next"><b>Siguiente acción:</b> ${esc(ctx.nextAction)}</p></section>`;
    }
    const label=ctx.level==="province"?ctx.province:"Zona 5";
    return`<section class="v1-plan-context compact" data-plan-context-version="${VERSION}"><div class="v1-plan-context-head"><div><span>Contexto documental agregado</span><h3>${esc(label)}</h3></div><em>Expedientes del alcance</em></div><div class="v1-plan-facts aggregate">
      ${fact("Expedientes",String(ctx.gadCount),"Entidad provincial y cantones incluidos según el nivel seleccionado.","neutral")}
      ${fact("Prioridad crítica",String(ctx.criticalCount),"Expedientes con prioridad documental/operativa crítica en la revisión maestra.",ctx.criticalCount?"warn":"ok")}
      ${fact("Seguimientos F07",String(ctx.f07Count),"Registros territoriales vigentes; se excluyen registros institucionales zonales.",ctx.f07Count?"ok":"warn")}
      ${fact("Revisión promedio",ctx.score!==null?`${ctx.score.toFixed(2)} %`:"Por consolidar",`${ctx.noApprovedCount} expedientes no aprobados o no evaluables dentro del alcance.`,"neutral")}
    </div></section>`;
  }
  function ensureContextPanel(content,ctx){const scopePanel=content.querySelector(".v1-scope-panel");if(!scopePanel)return;const holder=document.createElement("div");holder.innerHTML=buildContextPanel(ctx);const current=content.querySelector(".v1-plan-context");if(current)current.replaceWith(holder.firstElementChild);else scopePanel.insertAdjacentElement("afterend",holder.firstElementChild);}
  function setCardState(card,value,detail,state){if(!card)return;const strong=card.querySelector("strong"),small=card.querySelector("small");if(strong)strong.textContent=value;if(small)small.textContent=detail;card.dataset.dataState=state;}
  function documentarySiteLabel(universe){const text=String(universe||"");const m=text.match(/^\s*(>|≥)?\s*(\d+)\s+(?:registros? territoriales?|puntos? críticos?|sectores?|sitios?|filas? territoriales?|zonas?|puntos?|referencias?)/i);if(m)return`${m[1]||""}${m[2]} en Plan`;if(/^Boquer[oó]n\b/i.test(text))return"1 en Plan";return"En Plan";}
  function explainNoData(content,ctx){
    if(ctx.level!=="canton")return;
    const sites=content.querySelector('[data-exec-kpi="sites"]'),linked=content.querySelector('[data-exec-kpi="linked"]'),followups=content.querySelector('[data-exec-kpi="followups"]'),evidence=content.querySelector('[data-exec-kpi="evidence"]');
    const sitesValue=sites?.querySelector("strong")?.textContent.trim(),linkedValue=linked?.querySelector("strong")?.textContent.trim(),followupsValue=followups?.querySelector("strong")?.textContent.trim(),evidenceValue=evidence?.querySelector("strong")?.textContent.trim();
    if(sitesValue==="0"){
      if(ctx.doc?.universe&&!/^sin |no determinable/i.test(ctx.doc.universe))setCardState(sites,documentarySiteLabel(ctx.doc.universe),`${ctx.doc.universe}. Aún no equivale a sitios homologados en SmartRisk.`,"pending");
      else if(hasDocumentarySignal(ctx.siteMatrixStatus))setCardState(sites,"Por homologar",`F01 figura como “${ctx.siteMatrixStatus}”; falta consolidación estructurada.`,"pending");
      else setCardState(sites,"Sin consolidar","No existe todavía un inventario homologado de sitios para este alcance.","missing");
    }
    if(linkedValue==="0"){
      if(hasDocumentarySignal(ctx.actionMatrixStatus)||/acciones|actividades|medidas|rubros|ejes|fases/i.test(ctx.doc?.universe||""))setCardState(linked,"Por homologar",`Existe contenido documental de acciones (${ctx.actionMatrixStatus}), pero no una cadena operativa sitio–acción homologada en el corte vigente.`,"pending");
      else setCardState(linked,"Sin vínculo","No hay acciones operativas homologadas y enlazadas al alcance vigente.","missing");
    }
    if(followupsValue==="0"&&!ctx.f07Count)setCardState(followups,hasDocumentarySignal(ctx.f07MatrixStatus)?"Por conciliar":"Sin reporte",hasDocumentarySignal(ctx.f07MatrixStatus)?`Existe antecedente documental F07 (“${ctx.f07MatrixStatus}”), sin registro homologado en el corte vigente.`:"No se identificó seguimiento F07 vigente para este territorio.",hasDocumentarySignal(ctx.f07MatrixStatus)?"pending":"missing");
    if(evidenceValue==="0"&&!ctx.f07Count)setCardState(evidence,"Sin evidencia F07","La ausencia de evidencia en el corte no significa ausencia de gestión; indica que no hay verificables F07 homologados visibles.","missing");
    const source=content.querySelector(".v1-ref-source-note");if(source)source.innerHTML=`<b>Interpretación:</b> ${esc(ctx.canton)} tiene un expediente documental cuyo universo se describe como “${esc(ctx.universe)}”. La pantalla separa contenido del Plan, homologación en SmartRisk y seguimiento F07 vigente; ninguno de esos estados debe interpretarse como ausencia de riesgo.`;
  }
  function mappingAudit(){return matrixRows().map(row=>({number:Number(row.number),gad:row.gad,province:provinceForRow(row),canton:cantonForRow(row),master:Boolean(masterRowsForScope(provinceForRow(row),cantonForRow(row)).length)}));}
  function apply(){scheduled=false;if(!isDesktop()||currentRoute()!=="inicio")return;const content=document.querySelector("#content.v1-baseline-contract.v1-operational-home");if(!content||!content.querySelector(".v1-ref-cards"))return;const ctx=planContext();const signature=[VERSION,ctx.level,norm(ctx.province),cantonKey(ctx.canton),ctx.score,ctx.f07Count,ctx.doc?.n||0,ctx.siteMatrixStatus||"",ctx.actionMatrixStatus||"",ctx.f07MatrixStatus||""].join("|");if(content.dataset.planContextSignature===signature&&content.querySelector(`.v1-plan-context[data-plan-context-version="${VERSION}"]`))return;ensureContextPanel(content,ctx);explainNoData(content,ctx);content.dataset.planContextSignature=signature;}
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply);}
  function start(){if(observer)return;observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true});window.addEventListener("hashchange",()=>setTimeout(schedule,30));window.addEventListener("smartrisk:desktop-reference-ready",schedule);setTimeout(schedule,0);setTimeout(schedule,160);setTimeout(schedule,500);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
  window.SmartRiskDesktopPlanContext={VERSION,apply,planContext,mappingAudit,matrixRowsForScope,matchesScope,cantonKey};
})();