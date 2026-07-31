(()=>{
  "use strict";

  const RELEASE="RC14.4.4 RC9";
  const VERSION="2026-07-31T14:13:00-05:00";
  const pack=window.SMART_RISK_RISK_REPORTS_5Y;
  if(!pack||!Array.isArray(pack.reports)){
    console.warn("SmartRisk: no se encontró el índice de informes de riesgo.");
    return;
  }

  const normalize=value=>String(value||"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim()
    .toLowerCase();
  const html=value=>typeof window.escapeHtml==="function"
    ?window.escapeHtml(value)
    :String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
  const unique=values=>[...new Set(values.filter(Boolean))];

  function cutoff(reference=new Date()){
    const date=new Date(reference);
    date.setFullYear(date.getFullYear()-Number(pack.rollingWindowYears||5));
    return date;
  }
  function reportDate(report){
    const value=new Date(`${report.date}T12:00:00`);
    return Number.isNaN(value.getTime())?null:value;
  }
  function withinWindow(report,reference=new Date()){
    const date=reportDate(report);
    return Boolean(date&&date>=cutoff(reference)&&date<=reference);
  }
  function formatDate(value){
    if(!value)return"No registrada";
    const date=new Date(`${value}T12:00:00`);
    return Number.isNaN(date.getTime())?String(value):date.toLocaleDateString("es-EC",{day:"2-digit",month:"2-digit",year:"numeric"});
  }
  function scopeAllows(territory){
    const scope=window.SmartRiskScope;
    if(!scope||scope.isAdministrator?.())return true;
    const rows=scope.availableTerritories?.()||[];
    if(!rows.length)return false;
    return rows.some(item=>normalize(item.provincia)===normalize(territory.provincia)&&normalize(item.canton)===normalize(territory.canton));
  }
  function reportsForTerritory(territory,reference=new Date()){
    if(!territory||!scopeAllows(territory))return[];
    return pack.reports
      .filter(report=>withinWindow(report,reference))
      .filter(report=>normalize(report.province)===normalize(territory.provincia)&&normalize(report.canton)===normalize(territory.canton))
      .sort((a,b)=>String(b.date).localeCompare(String(a.date)));
  }
  function tone(report){
    const status=normalize(report.status);
    if(status.includes("revision")||status.includes("preliminar"))return"warn";
    return"success";
  }
  function audit(action,report){
    try{
      if(typeof window.auditChange==="function"){
        window.auditChange(action,"informeRiesgo",report.id,`${report.code} · ${report.canton} · ${report.title}`);
        if(typeof window.save==="function")window.save();
      }
    }catch(error){console.warn("SmartRisk: no fue posible registrar la consulta del informe",error)}
  }
  function closeDialog(dialog){
    if(!dialog)return;
    try{dialog.close()}catch{}
    dialog.remove();
  }
  function openDocument(report){
    audit("ABRIR_INFORME_RIESGO",report);
    window.open(report.url,"_blank","noopener,noreferrer");
  }

  function openReportDetail(report){
    if(!report)return;
    audit("CONSULTAR_FICHA_INFORME_RIESGO",report);
    const dialog=document.createElement("dialog");
    dialog.className="detail-dialog risk-report-detail-dialog";
    const keyData=(report.keyData||[]).map(item=>`<article><small>${html(item.label)}</small><b>${html(item.value)}</b></article>`).join("");
    const conclusions=(report.conclusions||[]).map(item=>`<li>${html(item)}</li>`).join("");
    const recommendations=(report.recommendations||[]).map(item=>`<li>${html(item)}</li>`).join("");
    dialog.innerHTML=`<div class="dialog-body risk-report-detail">
      <div class="detail-heading"><div><span class="eyebrow">Informe de riesgo · ${html(report.province)} · ${html(report.canton)}</span><h3>${html(report.title)}</h3><p>${html(report.code)} · ${formatDate(report.date)}</p></div><button type="button" class="icon-button close" aria-label="Cerrar">×</button></div>
      <div class="detail-badges"><span class="badge ${tone(report)}">${html(report.status)}</span><span class="badge neutral">Ventana móvil de ${Number(pack.rollingWindowYears||5)} años</span><span class="badge technical">${html(report.reportType)}</span></div>
      <section class="risk-report-location"><div><small>Sector o sectores</small><b>${html((report.sectors||[]).join(" · "))}</b></div><div><small>Parroquia</small><b>${html(report.parish||"No registrada")}</b></div><div><small>Inspección</small><b>${formatDate(report.inspectionDate)}</b></div></section>
      <section class="risk-report-summary"><h4>Lectura principal</h4><p>${html(report.summary)}</p><small><b>Estado técnico:</b> ${html(report.validation)}</small></section>
      <section><h4>Amenazas o procesos analizados</h4><div class="risk-report-threats">${(report.threats||[]).map(item=>`<span>${html(item)}</span>`).join("")}</div></section>
      ${keyData?`<section><h4>Datos destacados</h4><div class="risk-report-key-data">${keyData}</div></section>`:""}
      <div class="risk-report-columns"><section><h4>Conclusiones principales</h4><ul>${conclusions||"<li>Conclusiones pendientes de indexación técnica.</li>"}</ul></section><section><h4>Recomendaciones principales</h4><ul>${recommendations||"<li>Recomendaciones pendientes de indexación técnica.</li>"}</ul></section></div>
      <section class="source-card"><h4>Fuente y trazabilidad</h4><p>${html(report.source)}</p><small>La ficha resume el documento y no sustituye la lectura integral del informe, sus anexos, limitaciones y firmas.</small></section>
      <div class="dialog-actions"><button type="button" class="secondary close-bottom">Cerrar</button><button type="button" class="open-document">Abrir informe original</button></div>
    </div>`;
    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelectorAll(".close,.close-bottom").forEach(button=>button.onclick=()=>closeDialog(dialog));
    dialog.querySelector(".open-document").onclick=()=>openDocument(report);
  }

  function openReportList(territory,reports=reportsForTerritory(territory)){
    if(!reports.length)return;
    const dialog=document.createElement("dialog");
    dialog.className="detail-dialog risk-report-list-dialog";
    const start=cutoff().toLocaleDateString("es-EC",{day:"2-digit",month:"2-digit",year:"numeric"});
    dialog.innerHTML=`<div class="dialog-body risk-report-list">
      <div class="detail-heading"><div><span class="eyebrow">Memoria técnica territorial · últimos ${Number(pack.rollingWindowYears||5)} años</span><h3>${html(territory.canton)} · ${html(territory.provincia)}</h3><p>Informes emitidos desde ${html(start)} hasta la fecha.</p></div><button type="button" class="icon-button close" aria-label="Cerrar">×</button></div>
      <div class="risk-report-list-cards">${reports.map(report=>`<article>
        <div><span class="badge ${tone(report)}">${html(report.status)}</span><small>${formatDate(report.date)} · ${html(report.code)}</small><h4>${html(report.title)}</h4><p><b>Sectores:</b> ${html((report.sectors||[]).join(" · "))}</p><p>${html(report.summary)}</p></div>
        <div class="risk-report-card-actions"><button type="button" class="secondary report-detail" data-id="${html(report.id)}">Ver ficha</button><button type="button" class="report-open" data-id="${html(report.id)}">Abrir informe</button></div>
      </article>`).join("")}</div>
      <div class="dialog-actions"><button type="button" class="secondary close-bottom">Cerrar</button></div>
    </div>`;
    document.body.append(dialog);
    dialog.showModal();
    dialog.querySelectorAll(".close,.close-bottom").forEach(button=>button.onclick=()=>closeDialog(dialog));
    dialog.querySelector(".risk-report-list-cards").onclick=event=>{
      const button=event.target.closest("button[data-id]");
      if(!button)return;
      const report=reports.find(item=>item.id===button.dataset.id);
      if(button.classList.contains("report-detail"))openReportDetail(report);
      if(button.classList.contains("report-open"))openDocument(report);
    };
  }

  function overviewPanel(territory,reports){
    const sectors=unique(reports.flatMap(report=>report.sectors||[]));
    const start=cutoff().toLocaleDateString("es-EC",{day:"2-digit",month:"2-digit",year:"numeric"});
    const section=document.createElement("section");
    section.className="risk-report-context-card";
    section.dataset.riskReports5y="true";
    section.innerHTML=`<div><span class="eyebrow">Memoria técnica disponible · últimos ${Number(pack.rollingWindowYears||5)} años</span><h4>Existen ${reports.length} ${reports.length===1?"informe técnico":"informes técnicos"} para este cantón</h4><p>Se identifican antecedentes en ${sectors.length===1?"el sector":"los sectores"}: <b>${html(sectors.join(" · "))}</b>.</p><small>Ventana consultada: ${html(start)} hasta hoy. Los antecedentes deben contrastarse con las condiciones actuales.</small></div><button type="button" class="risk-report-show">${reports.length===1?"Ver informe":"Ver informes"}</button>`;
    section.querySelector(".risk-report-show").onclick=()=>reports.length===1?openReportDetail(reports[0]):openReportList(territory,reports);
    return section;
  }

  function injectOverview(row){
    const territory=row?.territory;
    const reports=reportsForTerritory(territory);
    if(!reports.length)return;
    const dialogs=[...document.querySelectorAll("dialog[open] .territory-overview")];
    const container=dialogs.at(-1);
    if(!container||container.querySelector("[data-risk-reports-5y]"))return;
    const anchor=container.querySelector(".next-step-card")||container.querySelector(".territory-overview-grid");
    const panel=overviewPanel(territory,reports);
    if(anchor)anchor.insertAdjacentElement("afterend",panel);
    else container.append(panel);
  }

  let tableFrame=0;
  function decorateTerritoryTable(){
    tableFrame=0;
    const host=document.querySelector("#territoryTable");
    if(!host)return;
    host.querySelectorAll(".territory-detail[data-id]").forEach(button=>{
      const territory=(typeof data!=="undefined"&&data?.territorios||[]).find(item=>item.id===button.dataset.id);
      if(!territory)return;
      const reports=reportsForTerritory(territory);
      const cell=button.closest("tr")?.cells?.[0];
      if(!cell)return;
      const existing=cell.querySelector(".risk-report-table-link");
      if(!reports.length){existing?.remove();return}
      if(existing)return;
      const quick=document.createElement("button");
      quick.type="button";
      quick.className="link-button risk-report-table-link";
      quick.textContent=`${reports.length} ${reports.length===1?"informe":"informes"} · últimos 5 años`;
      quick.onclick=event=>{event.stopPropagation();openReportList(territory,reports)};
      cell.append(quick);
    });
    if(!host.__riskReportObserver){
      const observer=new MutationObserver(()=>{
        if(tableFrame)return;
        tableFrame=requestAnimationFrame(decorateTerritoryTable);
      });
      observer.observe(host,{childList:true,subtree:true});
      host.__riskReportObserver=observer;
    }
  }

  function installStyles(){
    if(document.querySelector("#risk-reports-5y-styles"))return;
    const style=document.createElement("style");
    style.id="risk-reports-5y-styles";
    style.textContent=`
      .risk-report-context-card{display:flex;align-items:center;justify-content:space-between;gap:20px;margin:16px 0;padding:18px;border:1px solid #b8d8ea;border-left:5px solid #1769a6;border-radius:15px;background:#f1f8fd}.risk-report-context-card h4{margin:4px 0 6px}.risk-report-context-card p{margin:0 0 6px}.risk-report-context-card small{color:#586b79}.risk-report-context-card button{flex:0 0 auto}.risk-report-table-link{display:block;margin-top:5px;padding:0;font-size:.76rem;text-align:left}.risk-report-list-cards{display:grid;gap:12px}.risk-report-list-cards article{display:flex;justify-content:space-between;gap:16px;padding:16px;border:1px solid #d8e4eb;border-radius:13px;background:#fbfdfe}.risk-report-list-cards article h4{margin:6px 0}.risk-report-list-cards article p{margin:4px 0}.risk-report-list-cards article small{display:block;color:#657783;margin-top:5px}.risk-report-card-actions{display:flex;align-items:center;gap:8px;flex:0 0 auto}.risk-report-location,.risk-report-key-data{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:10px}.risk-report-location>div,.risk-report-key-data article{padding:12px;border:1px solid #dce6ec;border-radius:11px;background:#f8fbfc}.risk-report-location small,.risk-report-key-data small{display:block;color:#687987}.risk-report-location b,.risk-report-key-data b{display:block;margin-top:4px}.risk-report-summary{margin:14px 0;padding:15px;border-radius:12px;background:#eef7fb}.risk-report-summary h4{margin-top:0}.risk-report-threats{display:flex;flex-wrap:wrap;gap:7px}.risk-report-threats span{padding:7px 10px;border-radius:999px;background:#e8f2f7;font-size:.82rem;font-weight:650}.risk-report-columns{display:grid;grid-template-columns:1fr 1fr;gap:12px}.risk-report-columns section{padding:14px;border:1px solid #dce6ec;border-radius:12px}.risk-report-columns li{margin:7px 0}.risk-report-detail>section{margin-top:14px}@media(max-width:900px){.risk-report-context-card,.risk-report-list-cards article{align-items:stretch;flex-direction:column}.risk-report-card-actions{justify-content:flex-end}.risk-report-location,.risk-report-key-data,.risk-report-columns{grid-template-columns:1fr}}
    `;
    document.head.append(style);
  }

  function install(){
    if(window.__SMART_RISK_REPORTS_5Y_INSTALLED)return true;
    if(typeof window.openTerritoryOverview!=="function"||typeof window.territoriesPage!=="function")return false;
    installStyles();
    const originalOverview=window.openTerritoryOverview;
    window.openTerritoryOverview=function(row,...args){
      const result=originalOverview.call(this,row,...args);
      requestAnimationFrame(()=>injectOverview(row));
      return result;
    };
    const originalTerritoriesPage=window.territoriesPage;
    window.territoriesPage=function(...args){
      const result=originalTerritoriesPage.apply(this,args);
      requestAnimationFrame(decorateTerritoryTable);
      return result;
    };
    window.__SMART_RISK_REPORTS_5Y_INSTALLED=true;
    if(typeof current!=="undefined"&&current==="territorios")requestAnimationFrame(()=>{
      try{window.territoriesPage()}catch{}
    });
    return true;
  }

  let attempts=0;
  const timer=setInterval(()=>{
    attempts++;
    if(install()||attempts>300)clearInterval(timer);
  },100);

  window.SMART_RISK_RISK_REPORTS_API=Object.freeze({
    version:VERSION,
    release:RELEASE,
    rollingWindowYears:Number(pack.rollingWindowYears||5),
    cutoff,
    reportsForTerritory,
    openReportDetail,
    openReportList
  });
})();