(() => {
  "use strict";
  const ADMIN_EMAILS = new Set(["geopro.ec2@gmail.com","dcoellom2@unemi.edu.ec"]);
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g,"").trim().toLowerCase();
  const list = value => Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
  const unique = values => [...new Set(values.filter(Boolean))];
  const clone = value => typeof structuredClone === "function" ? structuredClone(value) : JSON.parse(JSON.stringify(value));
  let state = null;

  function values(profile,names){return unique(names.flatMap(name=>list(profile?.[name])))}
  function init({user,profile}){
    const role=profile?.rol||profile?.codigoRol||"Técnico territorial";
    const roleKey=normalize(role);
    const territoryIds=values(profile,["territorioIds","territoryIds","cantonIds"]);
    const provinceIds=values(profile,["provinciaIds","provinceIds"]);
    const cantons=values(profile,["canton","cantones","cantonNombre"]);
    const provinces=values(profile,["provincia","provincias","provinciaNombre"]);
    const administrator=ADMIN_EMAILS.has(normalize(user?.email))||roleKey.includes("administrador");
    let scopeType="cantonal";
    if(administrator)scopeType="zonal";
    else if(roleKey.includes("provincial"))scopeType="provincial";
    else if(!roleKey.match(/territorial|municipal|cantonal/)&&!cantons.length&&!territoryIds.length&&(provinces.length||provinceIds.length))scopeType="provincial";
    const scopeKeys=unique([
      ...values(profile,["scopeKeys"]),
      ...provinceIds.map(id=>`PROV:${id}`),
      ...territoryIds.map(id=>`TER:${id}`),
      ...values(profile,["unidadIds"]).map(id=>`UNI:${id}`),
      ...values(profile,["institucionIds"]).map(id=>`INST:${id}`)
    ]);
    state={user,profile:{...profile},role,appRole:administrator?"Administrador":"Coordinador COE",administrator,scopeType,territoryIds,provinceIds,cantons,provinces,scopeKeys,territories:[]};
    window.SMART_RISK_PROFILE={...profile};
    document.documentElement.dataset.smartRiskScope=scopeType;
    return api;
  }
  function territoryMatches(item){
    if(!state||state.administrator)return true;
    if(state.territoryIds.length&&state.territoryIds.includes(item?.id))return true;
    if(state.scopeType==="cantonal")return state.cantons.map(normalize).includes(normalize(item?.canton));
    return [...state.provinces,...state.provinceIds].map(normalize).includes(normalize(item?.provincia));
  }
  function recordMatches(item,territoryIds,siteIds,actionIds,sessionIds=new Set()){
    if(!state||state.administrator)return true;
    if(!item||typeof item!=="object")return false;
    const territory=item.territorio||item.territorioId||item.territoryId||item.cantonId;
    if(territory&&territoryIds.has(territory))return true;
    if(item.sitioId&&siteIds.has(item.sitioId))return true;
    if(item.accionId&&actionIds.has(item.accionId))return true;
    if(item.sesionId&&sessionIds.has(item.sesionId))return true;
    const canton=item.canton||item.municipio||item.cantonNombre||item.territorioNombre;
    if(canton&&state.territories.some(row=>normalize(row.canton)===normalize(canton)))return true;
    const province=item.provincia||item.province||item.provinciaNombre;
    return state.scopeType==="provincial"&&province&&state.territories.some(row=>normalize(row.provincia)===normalize(province));
  }
  function filterData(input){
    if(!state||state.administrator)return clone(input||{});
    const output=clone(input||{});
    output.territorios=(output.territorios||[]).filter(territoryMatches);
    state.territories=output.territorios;
    const territoryIds=new Set(output.territorios.map(item=>item.id));
    output.sitios=(output.sitios||[]).filter(item=>recordMatches(item,territoryIds,new Set(),new Set()));
    const siteIds=new Set(output.sitios.map(item=>item.id));
    output.acciones=(output.acciones||[]).filter(item=>recordMatches(item,territoryIds,siteIds,new Set()));
    const actionIds=new Set(output.acciones.map(item=>item.id));
    output.entidadesSeguimiento=(output.entidadesSeguimiento||[]).filter(item=>{
      if(item?.territorioId&&territoryIds.has(item.territorioId))return true;
      const province=normalize(item?.provincia||item?.province);
      return state.scopeType==="provincial"&&province&&state.territories.some(row=>normalize(row.provincia)===province);
    });
    output.seguimientos=(output.seguimientos||[]).filter(item=>{
      if(item?.territorioId&&territoryIds.has(item.territorioId))return true;
      const province=normalize(item?.provincia||item?.province);
      return state.scopeType==="provincial"&&province&&state.territories.some(row=>normalize(row.provincia)===province);
    });
    output.sesionesCabina=(output.sesionesCabina||[]).filter(item=>recordMatches(item,territoryIds,siteIds,actionIds));
    const sessionIds=new Set(output.sesionesCabina.map(item=>item.id));
    ["decisiones","validaciones","actoresCOE","equiposCOE","actividadesCOE","capasGeograficas","tareasCabina","cartografiaOperativa","planes","revisiones","informes","recursos","alertas"].forEach(key=>{
      if(Array.isArray(output[key]))output[key]=output[key].filter(item=>recordMatches(item,territoryIds,siteIds,actionIds,sessionIds));
    });
    output.instituciones=(output.instituciones||[]).filter(item=>{
      if(recordMatches(item,territoryIds,siteIds,actionIds,sessionIds))return true;
      const name=normalize(item?.nombre||item?.institucion||item?.razonSocial);
      return state.territories.some(row=>name.includes(normalize(row.canton)));
    });
    output.usuarios=(output.usuarios||[]).filter(item=>normalize(item?.correo)===normalize(state.user?.email)||recordMatches(item,territoryIds,siteIds,actionIds,sessionIds));
    output.fichasTecnicas=(output.fichasTecnicas||[]).filter(item=>{
      const cantons=list(item?.cantones||item?.canton).map(normalize);
      const provinces=list(item?.provincias||item?.provincia).map(normalize);
      return state.territories.some(row=>cantons.includes(normalize(row.canton))||(state.scopeType==="provincial"&&provinces.includes(normalize(row.provincia))));
    });
    output.auditoria=(output.auditoria||[]).filter(item=>normalize(item?.by)===normalize(state.user?.email)||recordMatches(item,territoryIds,siteIds,actionIds,sessionIds));
    output._scopeView={type:state.scopeType,role:state.role,territoryIds:[...territoryIds],generatedAt:new Date().toISOString()};
    return output;
  }
  function scopeLabel(){
    if(!state)return"Sin alcance";
    if(state.administrator)return"Coordinación Zonal 5";
    if(state.scopeType==="provincial")return`Provincia ${state.territories[0]?.provincia||state.provinces[0]||"asignada"}`;
    const territory=state.territories[0];
    return territory?`${territory.canton} · ${territory.provincia}`:(state.cantons[0]||"Cantón sin asignar");
  }
  const api={
    init,filterData,scopeLabel,
    isAdministrator:()=>Boolean(state?.administrator),
    canAdminUsers:()=>Boolean(state?.administrator),
    canRead:()=>Boolean(state),
    canWrite:module=>Boolean(state&&(state.administrator||!["usuarios","perfiles","configuracion"].includes(module))),
    scopeKeys:()=>[...(state?.scopeKeys||[])],
    availableTerritories:()=>[...(state?.territories||[])],
    currentTerritory:()=>state?.territories?.[0]||null,
    getState:()=>state?{...state,user:undefined}:null,
    getAppProfile:()=>state?{...state.profile,rol:state.appRole,_smartRiskOriginalRole:state.role,_smartRiskScopeType:state.scopeType}:null
  };
  window.SmartRiskScope=api;
})();