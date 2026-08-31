(() => {
  "use strict";

  const VERSION = "2026.08.31.1";
  const ROUTE = "escenario-cuenca-media";
  const STORAGE_KEY = "smartrisk-scenario-cuenca-media-076";
  const CANTONS = ["Montalvo","Babahoyo","Baba","Urdaneta","Simón Bolívar","Milagro","Yaguachi"];
  const PHASES = [
    {id:"0-24",label:"0–24 h",title:"Detección y validación",text:"Lluvias persistentes, primeros anegamientos, cierres puntuales y reportes dispersos.",decision:"Validar sitios, asignar evaluación y consolidar imagen operacional."},
    {id:"24-48",label:"24–48 h",title:"Expansión de afectaciones",text:"Aumentan sectores afectados y presión sobre drenajes, vías, puentes y servicios.",decision:"Priorizar población y estimar asistencia, transporte y personal."},
    {id:"48-72",label:"48–72 h",title:"Respuesta simultánea",text:"Varios cantones requieren recursos al mismo tiempo y aparecen brechas de capacidad.",decision:"Comparar demanda vs. capacidad y escalar requerimientos."},
    {id:"72-120",label:"72–120 h",title:"Persistencia y estabilización",text:"Persisten aislamientos, recurrencias o daños que necesitan intervención técnica.",decision:"Separar respuesta inmediata de rehabilitación y estabilización."},
    {id:"post",label:"Postevento",title:"Cierre y reducción del riesgo",text:"Se consolidan daños, recurrencias, acciones ejecutadas y necesidades de estudios.",decision:"Actualizar cartografía, informes y hojas de ruta de preinversión."}
  ];

  const $ = (s,r=document) => r.querySelector(s);
  const $$ = (s,r=document) => [...r.querySelectorAll(s)];
  const norm = v => String(v||"").normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase().trim();
  const esc = v => String(v??"").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const n = v => Number.isFinite(Number(v)) ? Number(v) : 0;
  const fmt = v => Math.round(n(v)).toLocaleString("es-EC");
  let scheduled = false;

  function currentRoute(){return String(location.hash||"").replace(/^#\/?/,"").split(/[?&]/)[0].toLowerCase();}
  function appState(){return window.SmartRiskV11App?.state || {};}
  function entity(k){return appState().data?.entities?.[k] || [];}
  function allRecords(){return appState().data?.records || [];}

  function recordInCorridor(r){return CANTONS.some(c=>norm(c)===norm(r?.canton));}
  function corridor(list){return (list||[]).filter(recordInCorridor);}
  function existingMetrics(){
    const plans=corridor(entity("plans"));
    const sites=corridor(entity("criticalSites"));
    const risks=corridor(entity("risks"));
    const actions=corridor(entity("actions"));
    const reports=corridor([...entity("reports"),...entity("monitoringReports")]);
    const visibleCantons=[...new Set(allRecords().filter(recordInCorridor).map(r=>r.canton).filter(Boolean))];
    return {plans,sites,risks,actions,reports,visibleCantons};
  }

  function readLocal(){
    try{return JSON.parse(localStorage.getItem(STORAGE_KEY)||"{}");}catch{return {};}
  }
  function writeLocal(v){try{localStorage.setItem(STORAGE_KEY,JSON.stringify(v));}catch(_){}}

  function defaultModel(){
    return {phase:"0-24",people:0,days:3,meals:3,water:15,households:0,sectors:1,teamYield:3,vehicleCapacity:0,notes:""};
  }
  function model(){return {...defaultModel(),...readLocal()};}

  function authorizedScopeLabel(){
    const s=appState();
    if(s.filters?.canton) return `${s.filters.canton} · ${s.filters.provincia||"Zona 5"}`;
    if(s.filters?.provincia) return s.filters.provincia;
    return s.profileContext?.scopeLabel || "Coordinación Zonal 5";
  }

  function phaseCards(active){
    return PHASES.map(p=>`<article class="sr-scenario-phase ${p.id===active?"active":""}"><span>${esc(p.label)}</span><b>${esc(p.title)}</b><p>${esc(p.text)}</p><small><strong>Decisión:</strong> ${esc(p.decision)}</small></article>`).join("");
  }

  function cantonPills(metrics){
    return CANTONS.map(c=>`<span class="sr-scenario-canton ${metrics.visibleCantons.some(v=>norm(v)===norm(c))?"in-scope":""}">${esc(c)}</span>`).join("")+`<span class="sr-scenario-canton">Cabeceras vinculadas · Bolívar</span>`;
  }

  function logisticsResults(m){
    const meals=n(m.people)*n(m.meals)*n(m.days);
    const water=n(m.people)*n(m.water)*n(m.days);
    const teams=Math.max(1,Math.ceil(n(m.sectors)/Math.max(1,n(m.teamYield))));
    const kits=n(m.households);
    return {meals,water,teams,kits};
  }

  function roadmap(){
    return [
      ["0–72 h","Proteger y atender","Evaluación, evacuación si corresponde, señalización, limpieza emergente, asistencia y continuidad de servicios."],
      ["Días–semanas","Estabilizar y documentar","Topografía/geología/hidráulica según necesidad, evaluación de daños, restitución funcional y actualización cartográfica."],
      ["Meses","Formular solución","Alternativas, costos, permisos, vínculo PDOT/PUGS/POA y perfil de preinversión; incorporar academia cuando aporte capacidad técnica."],
      ["Mediano plazo","Financiar y ejecutar","Diseño, financiamiento, ejecución, mantenimiento y evaluación de reducción del riesgo por el titular de competencia."]
    ].map(x=>`<div class="sr-scenario-route"><strong>${x[0]}</strong><div><small>${x[1]}</small><span>${x[2]}</span></div><div class="sr-scenario-progress"><i class="on"></i><i class="${x[0]!=="0–72 h"?"on":""}"></i><i></i><i></i></div></div>`).join("");
  }

  function render(){
    if(currentRoute()!==ROUTE) return false;
    const content=$("#content"); if(!content) return false;
    const m=model(), r=logisticsResults(m), met=existingMetrics();
    content.className="sr-content sr-scenario-shell";
    content.innerHTML=`
      <section class="sr-scenario-hero">
        <div><span class="sr-scenario-kicker">Informe SGR-IASR-08-2026-076 · escenario operacional zonal</span><h2>Cuenca media del río Guayas</h2><p>Escenario común para simulación, planificación logística, coordinación territorial y actualización progresiva de información frente al ENOS 2026–2027. No constituye una predicción determinista de afectación.</p></div>
        <div class="sr-scenario-status"><span class="sr-scenario-pill red">Alerta Roja · contexto de preparación</span><span class="sr-scenario-pill sim">SIMULACIÓN · valores no oficiales</span><span class="sr-scenario-local">Alcance visible: ${esc(authorizedScopeLabel())}</span></div>
      </section>
      <div class="sr-scenario-actions"><button class="primary" data-scenario-route="mapas">Abrir cartografía operacional</button><button data-scenario-route="riesgos">Revisar sitios críticos</button><button data-scenario-route="acciones">Ver acciones vinculadas</button><button data-scenario-route="reportes">Informes y productos</button></div>
      <section class="sr-scenario-kpis">
        <article class="sr-scenario-kpi"><small>Cantones base</small><strong>7 + Bolívar</strong></article>
        <article class="sr-scenario-kpi"><small>Sitios críticos visibles</small><strong>${fmt(met.sites.length)}</strong></article>
        <article class="sr-scenario-kpi"><small>Acciones visibles</small><strong>${fmt(met.actions.length)}</strong></article>
        <article class="sr-scenario-kpi"><small>Planes asociados</small><strong>${fmt(met.plans.length)}</strong></article>
        <article class="sr-scenario-kpi"><small>Reportes / fuentes</small><strong>${fmt(met.reports.length)}</strong></article>
      </section>
      <section class="sr-scenario-card"><header><div><h3>Ámbito territorial activable</h3><p>La unidad operacional combina jurisdicción y continuidad hidrográfica.</p></div></header><div class="sr-scenario-cantons">${cantonPills(met)}</div></section>
      <section class="sr-scenario-card"><header><div><h3>Guion de simulación 0–120 horas</h3><p>Seleccione la fase de trabajo. Cada fase debe producir decisiones y verificables.</p></div><select id="scenarioPhase">${PHASES.map(p=>`<option value="${p.id}" ${p.id===m.phase?"selected":""}>${p.label} · ${p.title}</option>`).join("")}</select></header><div class="sr-scenario-timeline">${phaseCards(m.phase)}</div></section>
      <section class="sr-scenario-grid">
        <article class="sr-scenario-card"><header><div><h3>Calculadora de demanda operacional</h3><p>Dimensiona asistencia y equipos a partir de una afectación validada o de un valor marcado como simulado.</p></div></header>
          <div class="sr-scenario-form">
            <label>Personas a atender<input id="scPeople" type="number" min="0" value="${n(m.people)}"></label>
            <label>Días de cobertura<input id="scDays" type="number" min="1" value="${n(m.days)}"></label>
            <label>Raciones por persona/día<input id="scMeals" type="number" min="0" step=".5" value="${n(m.meals)}"></label>
            <label>Agua L/persona/día<input id="scWater" type="number" min="0" step=".5" value="${n(m.water)}"></label>
            <label>Hogares elegibles para kits<input id="scHouseholds" type="number" min="0" value="${n(m.households)}"></label>
            <label>Sectores simultáneos<input id="scSectors" type="number" min="1" value="${n(m.sectors)}"></label>
            <label>Rendimiento equipo evaluación (sectores/día)<input id="scYield" type="number" min="1" value="${n(m.teamYield)}"></label>
            <label>Capacidad vehículo kg (referencial)<input id="scVehicle" type="number" min="0" value="${n(m.vehicleCapacity)}"></label>
          </div>
          <div class="sr-scenario-results"><div class="sr-scenario-result"><small>Raciones estimadas</small><strong id="scRMeals">${fmt(r.meals)}</strong></div><div class="sr-scenario-result"><small>Agua estimada</small><strong id="scRWater">${fmt(r.water)} L</strong></div><div class="sr-scenario-result"><small>Kits / hogares</small><strong id="scRKits">${fmt(r.kits)}</strong></div><div class="sr-scenario-result"><small>Equipos mínimos/día</small><strong id="scRTeams">${fmt(r.teams)}</strong></div></div>
          <div class="sr-scenario-note"><b>Control metodológico:</b> población expuesta ≠ población afectada; necesidad estimada ≠ recurso asignado; celda vacía ≠ cero. Los valores de este bloque quedan en el navegador como borrador de simulación y no se escriben en Firestore.</div>
        </article>
        <article class="sr-scenario-card"><header><div><h3>Flujo de información estandarizado</h3><p>Cadena mínima para que el dato termine en una decisión trazable.</p></div></header><div class="sr-scenario-flow"><div>Reporte / formulario</div><div>Validación territorial</div><div>Cartografía + tablero</div><div>Decisión / tarea</div><div>Evidencia + informe</div></div><div class="sr-scenario-source"><b>Campos obligatorios:</b> fuente, fecha, responsable, unidad, coordenadas cuando aplique, nivel de validación, acción asociada y verificable.</div></article>
      </section>
      <section class="sr-scenario-grid">
        <article class="sr-scenario-card"><header><div><h3>Matriz de conducción CZ5</h3><p>Responsabilidad funcional dentro del escenario.</p></div></header><table class="sr-scenario-table"><thead><tr><th>Función</th><th>Producto esperado</th></tr></thead><tbody>
          <tr><td><b>Análisis de Riesgos</b>Amenaza, exposición, sitios y evolución.</td><td>Mapa de escenario, ficha territorial y priorización.</td></tr>
          <tr><td><b>Preparación y Respuesta</b>Demanda, capacidad y logística.</td><td>Matriz demanda–capacidad, movilización y asistencia.</td></tr>
          <tr><td><b>Fortalecimiento</b>GAD, competencias y procedimientos.</td><td>Asistencia técnica y compromisos de mejora.</td></tr>
          <tr><td><b>Monitoreo / Sala</b>Cortes, brechas y verificables.</td><td>SitRep, tablero y control de cambios.</td></tr>
          <tr><td><b>TIC / SmartRisk</b>Formularios, geodatabase y accesos.</td><td>Escenario digital y repositorio trazable.</td></tr>
          <tr><td><b>Dirección / Coordinación</b>Priorización y escalamiento.</td><td>Disposiciones y solicitudes sustentadas.</td></tr>
        </tbody></table></article>
        <article class="sr-scenario-card"><header><div><h3>De sitio crítico a proyecto</h3><p>La emergencia abre una hoja de ruta; no cierra el problema territorial.</p></div></header>${roadmap()}</article>
      </section>
      <section class="sr-scenario-card"><header><div><h3>Vinculación con el Plan de Acción CZ5</h3><p>El escenario traduce el marco lógico en líneas de trabajo institucional.</p></div></header><table class="sr-scenario-table"><thead><tr><th>Componente</th><th>Aplicación en SmartRisk</th><th>Siguiente producto</th></tr></thead><tbody>
        <tr><td>C1 · Gobernanza e información</td><td>Escenario, responsables, accesos y flujo común.</td><td>Reglas de activación y puntos focales.</td></tr>
        <tr><td>C2 · Diagnóstico multiamenaza</td><td>Sitios, riesgos, afectaciones y cartografía.</td><td>Ficha territorial validada.</td></tr>
        <tr><td>C3 · ENOS–PDOT–PUGS–POA</td><td>Brecha vinculada al instrumento que debe resolverla.</td><td>Matriz de articulación y presupuesto.</td></tr>
        <tr><td>C4 · Cartera / preinversión</td><td>Hoja de ruta por sitio recurrente.</td><td>Perfil técnico priorizado.</td></tr>
        <tr><td>C5 · Seguimiento adaptativo</td><td>Simulación, tablero, indicadores y lecciones.</td><td>Plan de Acción CZ5 actualizado.</td></tr>
      </tbody></table></section>
      <section class="sr-scenario-card"><div class="sr-scenario-source"><b>Base técnica:</b> Informe SGR-IASR-08-2026-076 · Cuenca media del río Guayas. Este módulo es una capa operacional inicial; las cifras oficiales deberán provenir de reportes, planes, F01–F07, verificables y fuentes institucionales validadas.</div></section>`;

    const heading=$(".sr-page-heading h1"); if(heading) heading.textContent="Escenario zonal";
    const subtitle=$(".sr-page-heading p"); if(subtitle) subtitle.textContent="Cuenca media del río Guayas · simulación y planificación operacional";
    bind();
    return true;
  }

  function bind(){
    const save=()=>{
      const v={phase:$("#scenarioPhase")?.value||"0-24",people:n($("#scPeople")?.value),days:n($("#scDays")?.value),meals:n($("#scMeals")?.value),water:n($("#scWater")?.value),households:n($("#scHouseholds")?.value),sectors:n($("#scSectors")?.value),teamYield:n($("#scYield")?.value),vehicleCapacity:n($("#scVehicle")?.value)};
      writeLocal(v); const r=logisticsResults(v);
      if($("#scRMeals")) $("#scRMeals").textContent=fmt(r.meals);
      if($("#scRWater")) $("#scRWater").textContent=`${fmt(r.water)} L`;
      if($("#scRKits")) $("#scRKits").textContent=fmt(r.kits);
      if($("#scRTeams")) $("#scRTeams").textContent=fmt(r.teams);
      if(currentRoute()===ROUTE && $("#scenarioPhase")?.value!==model().phase) render();
    };
    ["scenarioPhase","scPeople","scDays","scMeals","scWater","scHouseholds","scSectors","scYield","scVehicle"].forEach(id=>$("#"+id)?.addEventListener("change",save));
    $$('[data-scenario-route]').forEach(b=>b.onclick=()=>{location.hash=`#/${b.dataset.scenarioRoute}`;});
  }

  function ensureRoute(){
    const router=window.SmartRiskV11Router; if(!router?.routes) return;
    if(!router.routes.some(r=>r.id===ROUTE)) router.routes.splice(2,0,{id:ROUTE,title:"Escenario zonal",subtitle:"Cuenca media del río Guayas · simulación y planificación operacional",icon:"risk",group:"Resumen"});
  }

  function ensureNav(){
    const nav=$("#nav"); if(!nav) return;
    if(nav.querySelector(`[data-route='${ROUTE}'],[data-scenario-nav='${ROUTE}']`)) return;
    const button=document.createElement("button");
    button.type="button"; button.dataset.route=ROUTE; button.dataset.scenarioNav=ROUTE; button.className="v1-nav-item sr-scenario-nav-item"; button.textContent="Escenario zonal"; button.setAttribute("aria-label","Escenario zonal. Cuenca media del río Guayas");
    button.onclick=()=>{location.hash=`#/${ROUTE}`;};
    const desktop=nav.querySelector(".v1-nav-primary");
    if(desktop){const ref=desktop.querySelector("[data-route='dashboard']"); ref?.after(button) || desktop.append(button); return;}
    const rc=nav.querySelector("[data-rc13-module='analisis'] .rc13-module-items") || nav.querySelector(".rc13-nav-shell");
    if(rc){button.classList.add("rc13-nav-item"); rc.append(button); return;}
    nav.append(button);
  }

  function apply(){
    scheduled=false; ensureRoute(); ensureNav(); if(currentRoute()===ROUTE) render();
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(apply);}

  window.addEventListener("hashchange",()=>setTimeout(schedule,25));
  window.addEventListener("load",schedule);
  new MutationObserver(schedule).observe(document.body,{childList:true,subtree:true});
  schedule();

  window.SmartRiskScenarioCuencaMedia={VERSION,route:ROUTE,cantons:CANTONS,phases:PHASES,render};
})();