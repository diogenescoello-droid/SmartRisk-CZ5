window.SmartRisk=window.SmartRisk||{};(function(){const SR=SmartRisk;
const esc=v=>SR.Utils.escapeHtml(String(v??""));
const lower=v=>String(v||"").trim().toLowerCase();
const safe=(key,fallback)=>SR.Storage.get(key,fallback)||fallback;
const today=()=>{const d=new Date();d.setHours(0,0,0,0);return d};
const parseDate=v=>{if(!v)return null;const d=new Date(`${v}T00:00:00`);return Number.isNaN(d.getTime())?null:d};
const dayDiff=v=>{const d=parseDate(v);return d?Math.ceil((d-today())/86400000):null};
const data=()=>({
  territories:safe("territories",SR.MockData.territories||[]),
  institutions:safe("institutions",SR.MockData.institutions||[]),
  sites:safe("sites",SR.MockData.sites||[]),
  actions:safe("actions",SR.MockData.actions||[]),
  sync:SR.Storage.get("sheets_sync_history",[])||[],
  kobo:SR.Storage.get("kobo_import_history",[])||[]
});
function metricData(d){
  const actions=d.actions,sites=d.sites,institutions=d.institutions,territories=d.territories;
  const avg=Math.round(actions.reduce((s,x)=>s+Number(x.avance||0),0)/Math.max(actions.length,1));
  const complete=actions.filter(x=>lower(x.estado)==="completada").length;
  const blocked=actions.filter(x=>lower(x.estado)==="bloqueada").length;
  const overdue=actions.filter(x=>{const n=dayDiff(x.fechaFin);return n!==null&&n<0&&lower(x.estado)!=="completada"}).length;
  const critical=sites.filter(x=>["alto","muy alto","crítico","critico"].includes(lower(x.nivelRiesgo||x.riesgo))).length;
  const validated=sites.filter(x=>lower(x.estado)==="validado").length;
  const operational=institutions.filter(x=>lower(x.estado)==="operativa").length;
  const plans=territories.reduce((s,x)=>s+Number(x.planes||0),0);
  const totalCantons=territories.reduce((s,x)=>s+Number(x.cantones||0),0);
  const pendingPlans=Math.max(totalCantons-plans,0);
  return{avg,complete,blocked,overdue,critical,validated,operational,plans,totalCantons,pendingPlans,
    actions:actions.length,sites:sites.length,institutions:institutions.length,territories:territories.length}
}
function quality(d){
  const records=[...d.actions,...d.sites,...d.institutions];
  let checks=0,ok=0,missing=0,invalidCoords=0,noEvidence=0;
  d.actions.forEach(x=>{["titulo","canton","responsable","estado"].forEach(k=>{checks++;x[k]?ok++:missing++});if(!Array.isArray(x.evidencias)||!x.evidencias.length)noEvidence++});
  d.sites.forEach(x=>{["nombre","canton","evento","nivelRiesgo"].forEach(k=>{checks++;x[k]?ok++:missing++});const la=Number(x.latitud),lo=Number(x.longitud);checks++;if(Number.isFinite(la)&&Number.isFinite(lo)&&Math.abs(la)<=90&&Math.abs(lo)<=180)ok++;else{missing++;invalidCoords++}});
  d.institutions.forEach(x=>{["nombre","tipo","estado","responsable","correo"].forEach(k=>{checks++;x[k]?ok++:missing++})});
  return{score:Math.round(ok/Math.max(checks,1)*100),missing,invalidCoords,noEvidence,total:records.length}
}
function lastSync(d){
  const rows=[...d.sync.map(x=>({...x,source:"Google Sheets"})),...d.kobo.map(x=>({...x,source:"KoboToolbox"}))];
  rows.sort((a,b)=>new Date(b.date||b.fecha||b.timestamp||0)-new Date(a.date||a.fecha||a.timestamp||0));
  const x=rows[0];if(!x)return{label:"Nunca",source:"Sin sincronización",fresh:false};
  const raw=x.date||x.fecha||x.timestamp;const dt=new Date(raw);
  return{label:Number.isNaN(dt.getTime())?String(raw):dt.toLocaleString("es-EC"),source:x.source,fresh:true}
}
function statusClass(value,reverse=false){
  const v=Number(value||0);
  if(reverse)return v===0?"good":v<=2?"warn":"bad";
  return v>=80?"good":v>=50?"warn":"bad"
}
function kpi({label,value,note,icon,route,status="neutral"}){
  return `<a class="cop-kpi cop-${status}" href="#${route}" aria-label="${esc(label)}: ${esc(value)}">
    <span class="cop-kpi-icon">${SR.Icon.render(icon,20)}</span>
    <span class="cop-kpi-copy"><small>${esc(label)}</small><strong>${esc(value)}</strong><em>${esc(note)}</em></span>
    <span class="cop-kpi-arrow">${SR.Icon.render("arrow-right",16)}</span>
  </a>`
}
function provinceRows(d){
  const all=[...new Set([...d.territories.map(x=>x.provincia),...d.actions.map(x=>x.provincia),...d.sites.map(x=>x.provincia)].filter(Boolean))];
  return all.map(name=>{
    const t=d.territories.find(x=>x.provincia===name)||{};
    const acts=d.actions.filter(x=>x.provincia===name);
    const sites=d.sites.filter(x=>x.provincia===name);
    const avg=acts.length?Math.round(acts.reduce((s,x)=>s+Number(x.avance||0),0)/acts.length):Number(t.avance||0);
    const risk=sites.filter(x=>["alto","muy alto","crítico","critico"].includes(lower(x.nivelRiesgo||x.riesgo))).length;
    const blocked=acts.filter(x=>lower(x.estado)==="bloqueada").length;
    return{name,avg,risk,blocked,plans:Number(t.planes||0),cantons:Number(t.cantones||0)}
  }).sort((a,b)=>a.avg-b.avg)
}
function alerts(d,q,m){
  const items=[];
  d.actions.filter(x=>lower(x.estado)==="bloqueada").forEach(x=>items.push({severity:"critical",icon:"alert-triangle",title:"Acción bloqueada",text:`${x.titulo} · ${x.canton}`,meta:x.responsable,route:"/acciones"}));
  d.actions.filter(x=>{const n=dayDiff(x.fechaFin);return n!==null&&n<0&&lower(x.estado)!=="completada"}).forEach(x=>items.push({severity:"critical",icon:"clock",title:"Plazo vencido",text:`${x.titulo} · ${x.canton}`,meta:x.fechaFin,route:"/acciones"}));
  d.sites.filter(x=>["muy alto","crítico","critico"].includes(lower(x.nivelRiesgo||x.riesgo))).forEach(x=>items.push({severity:"high",icon:"map-pin",title:"Sitio de riesgo muy alto",text:`${x.nombre} · ${x.canton}`,meta:x.nivelRiesgo,route:"/sitios"}));
  if(q.noEvidence)items.push({severity:"medium",icon:"file-text",title:"Evidencias pendientes",text:`${q.noEvidence} acciones no tienen evidencias registradas.`,meta:"Calidad",route:"/acciones"});
  if(q.invalidCoords)items.push({severity:"medium",icon:"map",title:"Coordenadas por revisar",text:`${q.invalidCoords} sitios tienen coordenadas inválidas.`,meta:"Datos",route:"/sitios"});
  if(!items.length)items.push({severity:"ok",icon:"check-circle",title:"Operación sin alertas críticas",text:"No se detectan bloqueos, vencimientos ni errores prioritarios.",meta:"OK",route:"/dashboard"});
  return items.slice(0,6)
}
function upcoming(d){
  return d.actions.filter(x=>lower(x.estado)!=="completada"&&parseDate(x.fechaFin)).map(x=>({...x,days:dayDiff(x.fechaFin)})).sort((a,b)=>a.days-b.days).slice(0,6)
}
function activity(d){
  const rows=[];
  d.actions.slice(-4).reverse().forEach(x=>rows.push({icon:"check-square",title:x.titulo,text:`${x.canton} · ${x.estado}`,route:"/acciones"}));
  d.sites.slice(-3).reverse().forEach(x=>rows.push({icon:"map-pin",title:x.nombre,text:`${x.canton} · ${x.nivelRiesgo}`,route:"/sitios"}));
  d.institutions.slice(-2).reverse().forEach(x=>rows.push({icon:"building",title:x.nombre,text:`${x.provincia} · ${x.estado}`,route:"/instituciones"}));
  return rows.slice(0,6)
}
function lineStats(d){
  const map={};d.actions.forEach(x=>{const k=x.linea||"Sin línea";map[k]=(map[k]||0)+1});
  const max=Math.max(...Object.values(map),1);
  return Object.entries(map).map(([name,value])=>({name,value,width:Math.round(value/max*100)}))
}
function render(){
  const d=data(),m=metricData(d),q=quality(d),sync=lastSync(d),provinces=provinceRows(d),alertRows=alerts(d,q,m),due=upcoming(d),feed=activity(d),lines=lineStats(d);
  const now=new Date().toLocaleString("es-EC",{dateStyle:"long",timeStyle:"short"});
  return `<section class="cop-hero">
    <div><span class="kicker">Centro de Operaciones — Coordinación Zonal 5</span><h1 class="page-title">Dashboard Ejecutivo</h1><p class="page-subtitle">Situación territorial, documental y operativa consolidada para orientar decisiones y priorizar asistencia técnica.</p></div>
    <div class="cop-hero-actions"><span class="cop-updated"><small>Lectura generada</small><strong>${esc(now)}</strong></span><button id="cop-refresh" class="btn btn-secondary">${SR.Icon.render("refresh-cw",17)}Actualizar</button><button id="cop-export" class="btn">${SR.Icon.render("download",17)}Exportar resumen</button></div>
  </section>
  <section class="cop-health">
    <div><span class="cop-pulse"></span><strong>Estado del sistema:</strong> Operativo</div>
    <div><strong>Última sincronización:</strong> ${esc(sync.label)} · ${esc(sync.source)}</div>
    <a href="#/sincronizacion">Revisar fuentes ${SR.Icon.render("arrow-right",15)}</a>
  </section>
  <section class="cop-kpi-grid">
    ${kpi({label:"Planes recibidos",value:m.plans,note:`de ${m.totalCantons} cantones`,icon:"file-text",route:"/territorios",status:statusClass(m.totalCantons?m.plans/m.totalCantons*100:0)})}
    ${kpi({label:"Cantones pendientes",value:m.pendingPlans,note:"requieren seguimiento",icon:"clock",route:"/territorios",status:statusClass(m.pendingPlans,true)})}
    ${kpi({label:"Sitios prioritarios",value:m.critical,note:`${m.validated} sitios validados`,icon:"map-pin",route:"/sitios",status:statusClass(m.critical,true)})}
    ${kpi({label:"Acciones activas",value:m.actions-m.complete,note:`${m.avg}% de avance promedio`,icon:"check-square",route:"/acciones",status:statusClass(m.avg)})}
    ${kpi({label:"Acciones vencidas",value:m.overdue,note:`${m.blocked} bloqueadas`,icon:"alert-triangle",route:"/acciones",status:statusClass(m.overdue+m.blocked,true)})}
    ${kpi({label:"Instituciones operativas",value:m.operational,note:`de ${m.institutions} registradas`,icon:"building",route:"/instituciones",status:statusClass(m.institutions?m.operational/m.institutions*100:0)})}
    ${kpi({label:"Calidad del dato",value:`${q.score}%`,note:`${q.missing} campos por revisar`,icon:"bar-chart-2",route:"/indicadores",status:statusClass(q.score)})}
    ${kpi({label:"Sincronización",value:sync.fresh?"Registrada":"Pendiente",note:sync.source,icon:"refresh-cw",route:"/sincronizacion",status:sync.fresh?"good":"warn"})}
  </section>
  <section class="cop-main-grid">
    <div class="cop-column">
      ${SR.Card.panel({title:"Alertas y decisiones prioritarias",body:`<div class="cop-alert-list">${alertRows.map(a=>`<a class="cop-alert cop-alert-${a.severity}" href="#${a.route}"><span>${SR.Icon.render(a.icon,18)}</span><div><strong>${esc(a.title)}</strong><p>${esc(a.text)}</p></div><em>${esc(a.meta)}</em></a>`).join("")}</div>`})}
      ${SR.Card.panel({title:"Situación provincial",body:`<div class="cop-table-wrap"><table class="cop-table"><thead><tr><th>Provincia</th><th>Planes</th><th>Avance</th><th>Sitios prioritarios</th><th>Bloqueos</th><th>Estado</th></tr></thead><tbody>${provinces.map(p=>`<tr><td><a href="#/territorios"><strong>${esc(p.name)}</strong></a></td><td>${p.plans}/${p.cantons||"—"}</td><td><div class="cop-progress"><span><i style="width:${Math.max(2,p.avg)}%"></i></span><strong>${p.avg}%</strong></div></td><td>${p.risk}</td><td>${p.blocked}</td><td><span class="cop-status cop-${statusClass(p.avg)}">${p.avg>=80?"Estable":p.avg>=50?"Seguimiento":"Prioritario"}</span></td></tr>`).join("")}</tbody></table></div>`})}
      ${SR.Card.panel({title:"Próximos vencimientos",body:`<div class="cop-table-wrap"><table class="cop-table"><thead><tr><th>Acción</th><th>Cantón</th><th>Responsable</th><th>Fecha</th><th>Semáforo</th></tr></thead><tbody>${due.map(x=>`<tr><td><a href="#/acciones"><strong>${esc(x.titulo)}</strong></a></td><td>${esc(x.canton)}</td><td>${esc(x.responsable)}</td><td>${esc(x.fechaFin)}</td><td><span class="cop-status cop-${x.days<0?"bad":x.days<=15?"warn":"good"}">${x.days<0?`${Math.abs(x.days)} días vencida`:x.days===0?"Vence hoy":`${x.days} días`}</span></td></tr>`).join("")||'<tr><td colspan="5">No existen vencimientos programados.</td></tr>'}</tbody></table></div>`})}
    </div>
    <aside class="cop-column">
      ${SR.Card.panel({title:"Estado ENOS",body:`<div class="cop-enos"><div class="cop-enos-level"><span>Estado operativo</span><strong>Vigilancia y preparación</strong></div><dl><div><dt>Ámbito</dt><dd>Zona 5</dd></div><div><dt>Fuente</dt><dd>Planes y seguimiento local</dd></div><div><dt>Actualización</dt><dd>${esc(new Date().toLocaleDateString("es-EC"))}</dd></div></dl><p>Este panel quedará preparado para enlazar boletines oficiales hidrometeorológicos en la fase de integración.</p></div>`})}
      ${SR.Card.panel({title:"Acciones por línea estratégica",body:`<div class="cop-bars">${lines.map(x=>`<div><header><span>${esc(x.name)}</span><strong>${x.value}</strong></header><span class="cop-bar"><i style="width:${x.width}%"></i></span></div>`).join("")}</div>`})}
      ${SR.Card.panel({title:"Calidad de datos",body:`<div class="cop-quality"><div class="cop-quality-score cop-${statusClass(q.score)}"><strong>${q.score}%</strong><span>integridad estimada</span></div><ul><li><span>Campos incompletos</span><strong>${q.missing}</strong></li><li><span>Acciones sin evidencia</span><strong>${q.noEvidence}</strong></li><li><span>Coordenadas inválidas</span><strong>${q.invalidCoords}</strong></li></ul><a class="btn btn-secondary btn-block" href="#/indicadores">Ver metodología e indicadores</a></div>`})}
      ${SR.Card.panel({title:"Actividad reciente",body:`<div class="cop-feed">${feed.map(x=>`<a href="#${x.route}"><span>${SR.Icon.render(x.icon,17)}</span><div><strong>${esc(x.title)}</strong><small>${esc(x.text)}</small></div></a>`).join("")}</div>`})}
      ${SR.Card.panel({title:"Accesos rápidos",body:`<div class="cop-quick"><a href="#/sitios">${SR.Icon.render("map-pin",18)}<span>Revisar sitios</span></a><a href="#/acciones">${SR.Icon.render("check-square",18)}<span>Gestionar acciones</span></a><a href="#/reportes">${SR.Icon.render("file-text",18)}<span>Generar reporte</span></a><a href="#/sincronizacion">${SR.Icon.render("refresh-cw",18)}<span>Sincronizar datos</span></a><a href="#/kobo">${SR.Icon.render("download",18)}<span>Consultar Kobo</span></a><a href="#/arcgis">${SR.Icon.render("map",18)}<span>Abrir ArcGIS</span></a></div>`})}
    </aside>
  </section>`
}
function bind(){
  document.getElementById("cop-refresh")?.addEventListener("click",()=>{SR.Toast.show("Dashboard actualizado con la información disponible.","success");SR.Router.go("/dashboard")});
  document.getElementById("cop-export")?.addEventListener("click",()=>{
    const d=data(),m=metricData(d),q=quality(d),s=lastSync(d);
    SR.Utils.downloadCsv("dashboard-ejecutivo-smartrisk-cz5.csv",[
      {Indicador:"Planes recibidos",Valor:m.plans},
      {Indicador:"Cantones pendientes",Valor:m.pendingPlans},
      {Indicador:"Sitios registrados",Valor:m.sites},
      {Indicador:"Sitios prioritarios",Valor:m.critical},
      {Indicador:"Acciones registradas",Valor:m.actions},
      {Indicador:"Avance promedio",Valor:`${m.avg}%`},
      {Indicador:"Acciones bloqueadas",Valor:m.blocked},
      {Indicador:"Acciones vencidas",Valor:m.overdue},
      {Indicador:"Instituciones operativas",Valor:m.operational},
      {Indicador:"Calidad del dato",Valor:`${q.score}%`},
      {Indicador:"Última sincronización",Valor:s.label}
    ]);
    SR.Toast.show("Resumen ejecutivo exportado en CSV.","success")
  })
}
SR.DashboardModule={route:{path:"/dashboard",title:"Dashboard Ejecutivo",render,bind}}})();