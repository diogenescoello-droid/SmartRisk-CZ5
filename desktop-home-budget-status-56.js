(() => {
  "use strict";
  const VERSION="2026.08.27.1";
  const CANTON_ALIASES=Object.freeze({"jujan":"alfredo baquerizo moreno","alfredo baquerizo moreno jujan":"alfredo baquerizo moreno","general antonio elizalde":"general antonio elizalde bucay","general antonio elizalde bucay":"general antonio elizalde bucay","bucay":"general antonio elizalde bucay","coronel marcelino mariduena":"marcelino mariduena","marcelino mariduena":"marcelino mariduena","san jacinto de yaguachi":"yaguachi","yaguachi":"yaguachi","san miguel":"san miguel de bolivar","san miguel de bolivar":"san miguel de bolivar"});

  // Estados financieros cualitativos respaldados por las lecturas ejecutivas/fuentes integradas.
  // Solo se aplican cuando no existe ya un monto numérico defendible en la tarjeta.
  const STATUS=Object.freeze({
    1:{value:"No recuperado",detail:"No se recuperó un monto monetario verificable en las fuentes integradas; no equivale a USD 0."},
    5:{value:"No documentado",detail:"El Plan recuperado no incorpora presupuesto por acción; debe costearse durante la homologación."},
    6:{value:"No cuantificado",detail:"El expediente contempla intervención, pero el presupuesto monetario no está cuantificado."},
    7:{value:"No recuperado",detail:"No se recuperó monto monetario por acción en el expediente integrado; no equivale a USD 0."},
    8:{value:"No recuperado",detail:"No se recuperó monto monetario por acción en el expediente integrado; falta vincular acción, sitio y costo."},
    9:{value:"No recuperado",detail:"No se recuperó monto monetario defendible por acción; falta homologar F01–F04–F07."},
    10:{value:"No recuperado",detail:"No se recuperó monto monetario defendible por acción; falta vínculo verificable con F04/F07."},
    11:{value:"No documentado",detail:"El borrador técnico no individualiza presupuesto por acción."},
    12:{value:"No cuantificado",detail:"El Plan contiene acciones, pero el presupuesto monetario no está cuantificado."},
    14:{value:"No cuantificado",detail:"La Prefectura documenta acciones y equipos, pero el presupuesto monetario del expediente integrado no está cuantificado."},
    15:{value:"Por cuantificar",detail:"El Plan identifica ámbitos de intervención; falta cuantificar presupuesto por sitio/acción."},
    16:{value:"Fuente pendiente",detail:"La versión corregida del Plan está pendiente; no corresponde imputar cero ni inferir presupuesto."},
    17:{value:"Por consolidar",detail:"El Plan contempla intervenciones, pero falta un presupuesto consolidado y trazable por acción."},
    18:{value:"No recuperado",detail:"No se recuperó un monto consolidado en la fuente integrada; las acciones deben homologarse y costearse."},
    19:{value:"Por costear",detail:"Las acciones están documentadas; falta costeo y trazabilidad sitio–acción–presupuesto."},
    22:{value:"Por costear",detail:"El Plan contiene acciones y recursos; el componente monetario por acción está pendiente."},
    23:{value:"No cuantificado",detail:"El Plan contiene acciones; el presupuesto monetario no está cuantificado en la lectura integrada."},
    25:{value:"Por consolidar",detail:"Existen acciones F04 y verificables; falta consolidar monto, fuente y estado presupuestario por acción."},
    26:{value:"Por costear",detail:"El Plan desarrolla acciones por fases; falta costearlas y homologarlas en F01–F07."},
    27:{value:"Por cuantificar",detail:"El Plan contiene medidas; falta cuantificar exposición, costos y vínculo territorial."},
    28:{value:"Por consolidar",detail:"El Plan contempla presupuesto/ejecución física, pero el consolidado por acción y sitio sigue pendiente."},
    30:{value:"No documentado",detail:"La lectura integrada recupera una acción principal, pero no presupuesto monetario asociado."},
    31:{value:"Por cerrar",detail:"El Plan contiene intervenciones; falta la matriz única de acciones/costos y el presupuesto final."},
    32:{value:"Por consolidar",detail:"Las acciones F04 existen, pero no hay presupuesto consolidado por acción/sitio."},
    33:{value:"Pendiente",detail:"La versión final, anexos y presupuesto continúan pendientes de cierre documental."},
    34:{value:"Por costear",detail:"El Plan identifica intervenciones; falta costeo por sitio y acción."},
    35:{value:"Por costear",detail:"La priorización y las acciones existen, pero presupuesto y trazabilidad F04–F07 siguen pendientes."},
    36:{value:"Por costear",detail:"El Plan contiene acciones; faltan anexos, presupuesto por acción y vínculo con evidencia."},
    37:{value:"Por costear",detail:"El Plan contiene diez acciones; no se recuperó costeo monetario consolidado."},
    39:{value:"Por costear",detail:"El Plan contiene diez acciones correctivas; falta presupuesto y desagregación por sitio."},
    40:{value:"Por costear",detail:"El Plan contiene medidas; falta costearlas y homologar F07."},
    41:{value:"Por consolidar",detail:"Existen siete ejes preventivos; falta presupuesto consolidado y cuantificación por sitio."},
    43:{value:"No localizado",detail:"No se localizó presupuesto monetario consolidado; las acciones deben costearse y vincularse a los 11 sectores prioritarios."},
    44:{value:"Por costear",detail:"El Plan contiene medidas preventivas; presupuesto por acción y F07 siguen abiertos."},
    45:{value:"No defendible",detail:"El paquete contiene F04, pero no existe todavía un presupuesto monetario defendible ni verificables de ejecución."},
    46:{value:"Por costear",detail:"Existen acciones; falta conciliar territorio, codificarlas y costearlas."},
    47:{value:"Por costear",detail:"El Plan contiene acciones vinculables a sitios; falta costeo de intervenciones."},
    48:{value:"Por costear",detail:"Las acciones existen, pero el costo por sector y la cadena F04–F07 están pendientes."},
    49:{value:"Por costear",detail:"Se documentan cinco acciones preventivas; falta costear intervenciones y enlazar verificables."},
    50:{value:"Mencionado",detail:"El Plan menciona proyectos de inversión, pero no se recupera un consolidado monetario por acción. No equivale a USD 0."},
    51:{value:"No documentado",detail:"La versión 2025–2026 identifica estrategias, pero no contiene presupuesto monetario suficiente para el ciclo vigente."},
    52:{value:"Por costear",detail:"El Plan contiene acciones; falta corregir datos territoriales, vincularlas a sitio y costearlas."},
    54:{value:"No consolidado",detail:"El Plan contiene cinco líneas preventivas, pero no hay un monto monetario consolidado por acción."},
    55:{value:"Por costear",detail:"El Plan contiene medidas y evidencia de mantenimiento; falta costearlas y homologar F07."},
    56:{value:"Por costear",detail:"El Plan contiene acciones por fases; falta vincular sitio–acción–costo–evidencia y completar F07."}
  });

  let scheduled=false,observer=null;
  const norm=v=>String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-zA-Z0-9]+/g," ").trim().toLowerCase();
  const cantonKey=v=>CANTON_ALIASES[norm(v)]||norm(v);
  const state=()=>window.SmartRiskV11App?.state||{};
  const master=()=>window.SMART_RISK_GAD_REVIEW_CONTEXT||null;
  function isDesktop(){return window.SmartRiskDeviceMode?.isSmart?window.SmartRiskDeviceMode.isSmart()!==true:document.documentElement.dataset.smartRiskDevice!=="smart";}
  function route(){const h=String(location.hash||"").replace(/^#\/?/,"").split(/[?&]/)[0];return h||String(state().route||"inicio");}
  function filters(){const f=state().filters||{};return {province:f.provincia||"",canton:f.canton||""};}
  function currentDoc(province,canton){return canton?master()?.find?.(province,canton)||null:null;}
  function hasNumeric(card){return /^USD\s+[0-9]/i.test(String(card?.querySelector("strong")?.textContent||"").trim());}
  function apply(){
    scheduled=false;
    if(!isDesktop()||route()!=="inicio")return;
    const content=document.querySelector("#content.v1-baseline-contract.v1-operational-home");
    const card=content?.querySelector('[data-decision-kpi="budget"]');
    if(!content||!card)return;
    const {province,canton}=filters();
    const doc=currentDoc(province,canton);
    if(!doc||!canton||hasNumeric(card))return;
    const status=STATUS[Number(doc.n)];
    if(!status)return;
    const label=card.querySelector("span"),value=card.querySelector("strong"),detail=card.querySelector("small");
    if(label&&label.textContent!=="Presupuesto / componente financiero")label.textContent="Presupuesto / componente financiero";
    if(value&&value.textContent!==status.value)value.textContent=status.value;
    if(detail&&detail.textContent!==status.detail)detail.textContent=status.detail;
    card.dataset.budgetQualitativeStatus=VERSION;
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(()=>setTimeout(apply,35));}
  function start(){if(observer)return;observer=new MutationObserver(schedule);observer.observe(document.body,{childList:true,subtree:true,characterData:true});window.addEventListener("hashchange",()=>setTimeout(schedule,50));window.addEventListener("smartrisk:desktop-reference-ready",schedule);setTimeout(schedule,0);setTimeout(schedule,250);setTimeout(schedule,800);}
  if(document.readyState==="loading")document.addEventListener("DOMContentLoaded",start,{once:true});else start();
  window.SmartRiskDesktopBudgetStatus56={VERSION,STATUS,apply};
})();