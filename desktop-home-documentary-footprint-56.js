(() => {
  "use strict";

  const VERSION = "2026.08.27.1";
  const CANTON_ALIASES = Object.freeze({
    "jujan":"alfredo baquerizo moreno","alfredo baquerizo moreno jujan":"alfredo baquerizo moreno",
    "general antonio elizalde":"general antonio elizalde bucay","general antonio elizalde bucay":"general antonio elizalde bucay","bucay":"general antonio elizalde bucay",
    "coronel marcelino mariduena":"marcelino mariduena","marcelino mariduena":"marcelino mariduena",
    "san jacinto de yaguachi":"yaguachi","yaguachi":"yaguachi","san miguel":"san miguel de bolivar","san miguel de bolivar":"san miguel de bolivar"
  });

  // Huella documental mínima defendible recuperada de la matriz maestra V4 y fuentes ya verificadas.
  // exact = conteo discreto defendible; min = mínimo defendible; qualitative = contenido existente sin universo discreto;
  // grouped = fases/ejes/estrategias/rubros que no deben confundirse con acciones homologadas; unknown = fuente rectora pendiente.
  const ACTION_FOOTPRINT = Object.freeze({
    1:{kind:"qualitative",note:"El Plan contiene acción/control documental; falta consolidar el universo de acciones."},
    2:{kind:"exact",count:11,unit:"actividades"},
    3:{kind:"exact",count:7,unit:"acciones",note:"Siete acciones concretas verificadas en Prevención y Mitigación; existen controles documentales adicionales."},
    4:{kind:"exact",count:39,unit:"acciones",note:"El Plan contiene 39 acciones; F04 conserva además registros operativos sin cadena sitio–acción completa."},
    5:{kind:"exact",count:35,unit:"acciones distintas"},
    6:{kind:"exact",count:22,unit:"acciones"},
    7:{kind:"exact",count:4,unit:"acciones/control"},
    8:{kind:"exact",count:4,unit:"acciones/control"},
    9:{kind:"exact",count:4,unit:"acciones/control"},
    10:{kind:"exact",count:8,unit:"acciones/control"},
    11:{kind:"grouped",count:6,unit:"fases narrativas",note:"Las seis fases evidencian medidas previstas, pero no equivalen a seis acciones homologadas."},
    12:{kind:"exact",count:49,unit:"acciones"},
    13:{kind:"exact",count:33,unit:"acciones ENOS"},
    14:{kind:"exact",count:30,unit:"acciones"},
    15:{kind:"exact",count:9,unit:"ámbitos de acción"},
    16:{kind:"unknown",note:"La versión corregida del Plan está pendiente de recuperación; no corresponde imputar cero."},
    17:{kind:"qualitative",note:"El Plan contiene medidas de preparación, respuesta y recuperación; falta individualizar el universo comparable."},
    18:{kind:"exact",count:35,unit:"acciones"},
    19:{kind:"exact",count:12,unit:"acciones"},
    20:{kind:"exact",count:21,unit:"acciones/medidas"},
    21:{kind:"exact",count:12,unit:"acciones"},
    22:{kind:"exact",count:17,unit:"acciones"},
    23:{kind:"exact",count:11,unit:"acciones"},
    24:{kind:"qualitative",note:"El Plan y los seis seguimientos F07 evidencian acciones; el universo discreto debe homologarse."},
    25:{kind:"min",count:2,unit:"acciones F04",note:"Mínimo defendible en la base integrada; el Plan puede contener medidas adicionales."},
    26:{kind:"qualitative",note:"El Plan desarrolla medidas por fases; falta convertirlas en un catálogo discreto y codificado."},
    27:{kind:"qualitative",note:"El Plan técnico contiene medidas de mitigación/preparación; falta cuantificar y codificar."},
    28:{kind:"min",count:8,unit:"líneas de preparación",note:"Mínimo defendible; el Plan contiene medidas adicionales en otras fases."},
    29:{kind:"grouped",count:2,unit:"componentes presupuestarios",note:"Prevención y respuesta se conservan separados; no se tratan como dos acciones homologadas."},
    30:{kind:"min",count:1,unit:"acción principal",note:"Existe al menos una acción principal recuperada; falta individualizar las restantes por fase."},
    31:{kind:"qualitative",note:"El Plan documenta drenaje, desazolve, muros, bombeo, SAT y otras intervenciones; falta catálogo único."},
    32:{kind:"exact",count:25,unit:"acciones F04"},
    33:{kind:"qualitative",note:"La estructura metodológica contiene acciones previstas, pero la versión final y sus anexos siguen pendientes."},
    34:{kind:"qualitative",note:"El Plan contiene intervenciones preventivas; falta catálogo F01–acción y costeo."},
    35:{kind:"qualitative",note:"F04 es atribuible y el Plan contiene acciones; falta cerrar conteo, costos y vínculo F04–F07."},
    36:{kind:"qualitative",note:"El Plan basado en F01–F07 contiene acciones; falta depuración de códigos, anexos y presupuesto."},
    37:{kind:"exact",count:10,unit:"acciones"},
    38:{kind:"exact",count:10,unit:"acciones",note:"Presupuesto referencial distribuido en 15 rubros; acción y rubro no son necesariamente equivalentes uno a uno."},
    39:{kind:"exact",count:10,unit:"acciones correctivas"},
    40:{kind:"qualitative",note:"El Plan contiene medidas preventivas y de respuesta; falta catálogo único de acciones y seguimiento."},
    41:{kind:"grouped",count:7,unit:"ejes preventivos",note:"Los siete ejes evidencian intervención planificada, pero no se fuerzan como siete acciones homologadas."},
    42:{kind:"exact",count:8,unit:"acciones"},
    43:{kind:"qualitative",note:"El Plan contiene medidas; falta consolidar el universo discreto de acciones por sitio."},
    44:{kind:"min",count:12,unit:"medidas preventivas"},
    45:{kind:"exact",count:3,unit:"acciones F04"},
    46:{kind:"qualitative",note:"Existen acciones/F04 en el expediente; falta conciliar universo territorial y codificación."},
    47:{kind:"qualitative",note:"El Plan contiene acciones vinculables a puntos Muy Alto/Alto; falta catálogo deduplicado y costeo."},
    48:{kind:"qualitative",note:"Existen acciones F04/F07 fragmentadas; falta homologar códigos y costo por sector."},
    49:{kind:"exact",count:5,unit:"acciones preventivas"},
    50:{kind:"qualitative",note:"El Plan de Quevedo contiene acciones y medidas por parroquia/sitio; deben individualizarse en un catálogo único."},
    51:{kind:"grouped",count:5,unit:"estrategias",note:"Las cinco estrategias evidencian respuesta planificada, pero no equivalen a cinco acciones homologadas."},
    52:{kind:"qualitative",note:"El Plan contiene acciones; falta corregir datos territoriales, vincularlas a sitio y costear."},
    53:{kind:"exact",count:8,unit:"rubros/intervenciones"},
    54:{kind:"grouped",count:5,unit:"líneas preventivas",note:"Las cinco líneas evidencian medidas previstas; falta individualizar acciones y costos."},
    55:{kind:"qualitative",note:"El Plan contiene medidas y evidencia de mantenimiento; falta catálogo discreto, costo y vínculo F07."},
    56:{kind:"qualitative",note:"El Plan contiene acciones por fases; falta normalizar la cadena sitio–acción–costo–evidencia."}
  });

  const SPECIAL_BUDGETS = Object.freeze({
    4:{amount:5000000,label:"Documentado en F04",note:"Estado declarado: En ejecución. Sin vínculo territorial homologado; este estado declarado no acredita por sí solo ejecución física ni financiera."}
  });

  let scheduled = false;
  let observer = null;
  const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
  const cantonKey = value => CANTON_ALIASES[norm(value)] || norm(value);
  const master = () => window.SMART_RISK_GAD_REVIEW_CONTEXT || null;
  const appState = () => window.SmartRiskV11App?.state || {};
  const entity = name => appState().data?.entities?.[name] || [];

  function isDesktop(){
    return window.SmartRiskDeviceMode?.isSmart ? window.SmartRiskDeviceMode.isSmart() !== true : document.documentElement.dataset.smartRiskDevice !== "smart";
  }
  function currentRoute(){
    const hash = String(location.hash || "").replace(/^#\/?/, "").split(/[?&]/)[0];
    return hash || String(appState().route || "inicio");
  }
  function filters(){
    const value = appState().filters || {};
    return {province:value.provincia || "", canton:value.canton || ""};
  }
  function scopeOf(item){
    return {
      province:item?.province ?? item?.provincia ?? item?.payload?.province ?? item?.payload?.provincia ?? "",
      canton:item?.canton ?? item?.territory ?? item?.payload?.canton ?? item?.payload?.territory ?? "",
      level:item?.level ?? item?.nivel ?? item?.payload?.level ?? item?.payload?.nivel ?? ""
    };
  }
  function matchesScope(item, province, canton){
    const s = scopeOf(item);
    if (/zonal|nacional|institucional/.test(norm(s.level))) return false;
    if (province && norm(s.province) !== norm(province)) return false;
    if (canton && cantonKey(s.canton) !== cantonKey(canton)) return false;
    return Boolean(s.province);
  }
  function docsForScope(province,canton){
    if (canton) return [master()?.find?.(province,canton)].filter(Boolean);
    return master()?.scope?.(province,"") || [];
  }
  function followups(province,canton){
    const rows = Array.isArray(window.SMART_RISK_F07_CURRENT?.followups) ? window.SMART_RISK_F07_CURRENT.followups : [];
    return rows.filter(row => matchesScope(row,province,canton));
  }
  function hasSiteLink(item){
    const source = {...(item||{}),...(item?.payload||{})};
    const keys=["siteReference","siteId","sitioId","criticalSiteId","criticalSiteReference","sectorId","puntoCriticoId","puntoId","ubicacionId","territorialSiteId"];
    return keys.some(key => String(source[key]||"").trim() && !/^(no[_\s-]*encontrad|sin[_\s-]*sitio|ningun|n\/a|null|undefined)/i.test(String(source[key]||"").trim()));
  }
  function actionTitle(item){
    return String(item?.title || item?.actionTitle || item?.payload?.accion || item?.payload?.acción || item?.payload?.actividad || item?.sourceId || item?.id || "").trim();
  }
  function distinct(items, selector){
    const seen=new Set();
    return items.filter(item=>{const key=norm(selector(item));if(!key||seen.has(key))return false;seen.add(key);return true;});
  }
  function linkMetrics(province,canton){
    const f07 = followups(province,canton);
    const f07Linked = distinct(f07.filter(row => norm(row.actionLinkState)==="vinculada" && norm(row.siteLinkState)==="vinculado"), row => row.actionReference || row.actionCode || actionTitle(row)).length;
    const structured = distinct(entity("actions").filter(row => matchesScope(row,province,canton) && hasSiteLink(row)), actionTitle).length;
    return {f07, f07Linked, structured, linked:Math.max(f07Linked,structured)};
  }
  function footprintFor(doc){ return doc ? ACTION_FOOTPRINT[Number(doc.n)] || {kind:"unknown"} : {kind:"unknown"}; }
  function actionDisplay(fp, links){
    if (fp.kind === "unknown") {
      if (links.f07.length) return {value:"Sí",detail:`${links.f07.length} seguimientos F07 evidencian actividad, pero la fuente rectora no permite cerrar todavía el universo documental de acciones.`};
      return {value:"Por verificar",detail:fp.note || "La fuente rectora no permite determinar todavía el universo de acciones; no equivale a cero."};
    }
    if (fp.kind === "qualitative") {
      return {value:"Sí",detail:`Acciones/medidas documentadas. ${fp.note || "El universo discreto está pendiente."} ${links.linked ? `${links.linked} ya tienen vínculo sitio–acción estructurado.` : "Sin vínculo sitio–acción homologado identificado."}`};
    }
    const prefix = fp.kind === "min" ? "≥" : "";
    const unit = fp.unit || "acciones/medidas";
    const linked = Math.min(Number(fp.count||0),links.linked);
    const pending = Math.max(0,Number(fp.count||0)-linked);
    const grouping = fp.kind === "grouped" ? " Se muestra como agrupación documental, no como acciones homologadas." : "";
    return {value:`${prefix}${fp.count}`,detail:`${prefix}${fp.count} ${unit} documentadas · ${linked} con vínculo sitio–acción · ${pending} pendientes de vínculo.${grouping}${fp.note ? ` ${fp.note}` : ""}`};
  }
  function money(value){ return `USD ${new Intl.NumberFormat("es-EC",{maximumFractionDigits:2}).format(value)}`; }
  function patchSpecialBudget(card,doc){
    const special=SPECIAL_BUDGETS[Number(doc?.n)];
    if(!special||!card)return;
    const label=card.querySelector("span"), value=card.querySelector("strong"), detail=card.querySelector("small");
    if(label && label.textContent!=="Presupuesto documentado") label.textContent="Presupuesto documentado";
    if(value && value.textContent!==money(special.amount)) value.textContent=money(special.amount);
    const text=`${special.label}. ${special.note}`;
    if(detail && detail.textContent!==text) detail.textContent=text;
    card.dataset.documentaryBudgetOverride=VERSION;
  }
  function territoryState(doc){
    const text=norm(doc?.universe||"");
    if(!doc||/no determinable|sin catalogo nominal|sin catalogo/.test(text)) return {text:"Por depurar",cls:"is-warn"};
    if(/inconsisten|pendiente|sin total unico|coberturas territoriales/.test(text)) return {text:"Documentado · requiere depuración",cls:"is-warn"};
    return {text:"Documentado",cls:"is-ok"};
  }
  function budgetState(card){
    const value=String(card?.querySelector("strong")?.textContent||"").trim();
    const detail=String(card?.querySelector("small")?.textContent||"").trim();
    if(!value) return {text:"Por verificar",detail:"",cls:"is-muted"};
    if(/^USD\s/i.test(value)) {
      const linked=/vínculo territorial|vinculado/i.test(detail) && !/sin vínculo|no existe.*vínculo|sin sitio/i.test(detail);
      return {text:linked?`${value} · vinculado`:`${value} · vínculo pendiente`,detail,cls:linked?"is-ok":"is-warn"};
    }
    if(/sin monto|no cuantificado/i.test(value)) return {text:"Sin monto cuantificado",detail:"No equivale a USD 0.",cls:"is-muted"};
    return {text:value,detail,cls:"is-warn"};
  }
  function traceCell(label,value,detail,cls){
    return `<div class="v1-doc-trace-cell ${cls||""}"><span>${label}</span><strong>${value}</strong>${detail?`<small>${detail}</small>`:""}</div>`;
  }
  function ensureTrace(content,html,signature){
    let strip=content.querySelector(".v1-documentary-trace-strip");
    if(!strip){
      strip=document.createElement("section");
      strip.className="v1-documentary-trace-strip";
      const cards=content.querySelector(".v1-ref-cards");
      cards?.insertAdjacentElement("afterend",strip);
    }
    if(strip.dataset.signature!==signature || strip.innerHTML!==html){ strip.innerHTML=html; strip.dataset.signature=signature; }
  }
  function cantonTrace(content,doc,fp,links,budgetCard){
    const territory=territoryState(doc);
    const action=actionDisplay(fp,links);
    const actionTrace = links.linked ? {text:`${links.linked} vínculo(s) sitio–acción`,cls:"is-ok"} : {text:"Vínculo pendiente",cls:"is-warn"};
    const budget=budgetState(budgetCard);
    const f07 = links.f07.length ? `${links.f07.length} reportado(s) · ${links.f07Linked} con vínculo completo` : "Sin F07 vigente";
    const f07Cls = links.f07Linked ? "is-ok" : links.f07.length ? "is-warn" : "is-muted";
    const html=`<header><div><b>Calidad de trazabilidad</b><small>El dato documental se muestra aunque todavía no esté homologado.</small></div><span>Existencia ≠ vínculo</span></header><div class="v1-doc-trace-grid">${traceCell("Territorio",territory.text,doc?.universe||"Fuente por consolidar",territory.cls)}${traceCell("Sitio → acción",actionTrace.text,action.detail,actionTrace.cls)}${traceCell("Presupuesto",budget.text,budget.detail,budget.cls)}${traceCell("Seguimiento F07",f07,"El F07 se evalúa aparte del contenido del Plan.",f07Cls)}</div>`;
    ensureTrace(content,html,[VERSION,doc?.n,links.f07.length,links.f07Linked,links.linked,budget.text].join("|"));
  }
  function aggregateTrace(content,docs,province,links,budgetCard){
    const footprints=docs.map(doc=>footprintFor(doc));
    const actionDocs=footprints.filter(fp=>fp.kind!=="unknown").length;
    const quantified=footprints.filter(fp=>Number.isFinite(fp.count)).length;
    const territoryDocs=docs.filter(doc=>territoryState(doc).text.startsWith("Documentado")).length;
    const budget=budgetState(budgetCard);
    const label=province?`Provincia · ${province}`:"Zona 5";
    const html=`<header><div><b>Calidad de trazabilidad · ${label}</b><small>Los conteos indican expedientes con información; no fuerzan sumas de escalas incompatibles.</small></div><span>Existencia ≠ vínculo</span></header><div class="v1-doc-trace-grid">${traceCell("Territorio documentado",`${territoryDocs} / ${docs.length}`,"Expedientes con universo territorial recuperado.",territoryDocs===docs.length?"is-ok":"is-warn")}${traceCell("Acciones documentadas",`${actionDocs} / ${docs.length}`,`${quantified} tienen un universo de acciones/medidas cuantificado.`,actionDocs?"is-ok":"is-muted")}${traceCell("Presupuesto",budget.text,budget.detail,budget.cls)}${traceCell("Seguimiento F07",`${links.f07.length} registros · ${links.f07Linked} vinculados`,"No se asignan registros zonales institucionales a un GAD.",links.f07Linked?"is-ok":links.f07.length?"is-warn":"is-muted")}</div>`;
    ensureTrace(content,html,[VERSION,label,docs.length,actionDocs,quantified,territoryDocs,links.f07.length,links.f07Linked,budget.text].join("|"));
  }
  function patchActionCard(card,display,label="Acciones / medidas documentadas"){
    if(!card)return;
    const l=card.querySelector("span"),v=card.querySelector("strong"),d=card.querySelector("small");
    if(l&&l.textContent!==label)l.textContent=label;
    if(v&&v.textContent!==display.value)v.textContent=display.value;
    if(d&&d.textContent!==display.detail)d.textContent=display.detail;
    card.dataset.documentaryFootprint=VERSION;
  }
  function apply(){
    scheduled=false;
    if(!isDesktop()||currentRoute()!=="inicio")return;
    const content=document.querySelector("#content.v1-baseline-contract.v1-operational-home");
    if(!content)return;
    const actionCard=content.querySelector('[data-decision-kpi="actions"]');
    const budgetCard=content.querySelector('[data-decision-kpi="budget"]');
    if(!actionCard||!budgetCard)return;
    const {province,canton}=filters();
    const docs=docsForScope(province,canton);
    const links=linkMetrics(province,canton);
    if(canton && docs.length===1){
      const doc=docs[0];
      const fp=footprintFor(doc);
      patchSpecialBudget(budgetCard,doc);
      patchActionCard(actionCard,actionDisplay(fp,links));
      cantonTrace(content,doc,fp,links,budgetCard);
    }else{
      const footprints=docs.map(footprintFor);
      const actionDocs=footprints.filter(fp=>fp.kind!=="unknown").length;
      const quantified=footprints.filter(fp=>Number.isFinite(fp.count)).length;
      const display={value:`${actionDocs} / ${docs.length}`,detail:`${actionDocs} expedientes tienen acciones/medidas documentadas · ${quantified} con universo cuantificado · ${links.linked} vínculos sitio–acción estructurados en el alcance.`};
      patchActionCard(actionCard,display,"GAD con acciones documentadas");
      aggregateTrace(content,docs,province,links,budgetCard);
    }
    content.dataset.documentaryFootprint=VERSION;
  }
  function schedule(){ if(scheduled)return; scheduled=true; requestAnimationFrame(()=>setTimeout(apply,20)); }
  function start(){
    if(observer)return;
    observer=new MutationObserver(schedule);
    observer.observe(document.body,{childList:true,subtree:true,characterData:true});
    window.addEventListener("hashchange",()=>setTimeout(schedule,40));
    window.addEventListener("smartrisk:desktop-reference-ready",schedule);
    setTimeout(schedule,0);setTimeout(schedule,160);setTimeout(schedule,600);
  }
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
  window.SmartRiskDesktopDocumentaryFootprint56={VERSION,ACTION_FOOTPRINT,SPECIAL_BUDGETS,apply};
})();