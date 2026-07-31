(()=>{
  "use strict";

  const BUILD="14.4.4-rc6";
  const PAGE_SIZE=10;
  const CHECKLIST_BATCH=25;
  let installed=false;
  let sourceRef=null;
  let index=[];

  const text=value=>String(value??"");
  const lower=value=>text(value).normalize("NFD").replace(/[\u0300-\u036f]/g,"").toLowerCase();
  const html=value=>typeof escapeHtml==="function"?escapeHtml(value):text(value).replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
  const defer=callback=>window.requestAnimationFrame(()=>window.requestAnimationFrame(callback));
  const debounce=(callback,wait=140)=>{let timer=0;return(...args)=>{clearTimeout(timer);timer=setTimeout(()=>callback(...args),wait)}};
  const scoreCategory=score=>score==null?"Sin plan":score>=80?"Fortalecidos":score>=60?"Requieren mejora":"Atención prioritaria";

  function buildIndex(reviews){
    if(sourceRef===reviews&&index.length===reviews.length)return index;
    sourceRef=reviews;
    index=reviews.map((review,position)=>{
      const score=Number.isFinite(Number(review?.score))?Number(review.score):null;
      const criteria=Array.isArray(review?.criteria)?review.criteria:[];
      return {
        position,
        review,
        score,
        category:scoreCategory(score),
        province:text(review?.province),
        territory:text(review?.territory),
        plan:text(review?.plan),
        search:lower(`${review?.province||""} ${review?.territory||""} ${review?.plan||""}`),
        gaps:criteria.reduce((total,item)=>total+(item?.status!=="Cumple"?1:0),0),
        checklist:Number(review?.totalChecklist||0)
      };
    }).sort((a,b)=>(a.score==null)-(b.score==null)||(a.score??0)-(b.score??0)||a.territory.localeCompare(b.territory,"es"));
    return index;
  }

  function installStyles(){
    if(document.querySelector("#sr-review-performance-styles"))return;
    const style=document.createElement("style");
    style.id="sr-review-performance-styles";
    style.textContent=`
      .review-performance-status{display:flex;align-items:center;gap:.5rem;color:#5d7180;font-size:.78rem}
      .review-performance-status::before{content:"";width:.55rem;height:.55rem;border-radius:50%;background:#1b9b74}
      .review-loading{display:grid;place-items:center;min-height:180px;color:#607583;background:#f8fbfc;border:1px dashed #c9d8e2;border-radius:14px}
      .review-loading b{display:block;margin-bottom:.35rem;color:#173f55}
      .review-checklist-controls{display:flex;justify-content:space-between;align-items:center;gap:1rem;margin-top:.8rem;padding-top:.8rem;border-top:1px solid #dce5ed}
      .review-checklist-controls small{color:#637383}
      .review-dialog .checklist-list article{content-visibility:auto;contain-intrinsic-size:86px}
      .review-dialog .criteria-list article{content-visibility:auto;contain-intrinsic-size:120px}
    `;
    document.head.append(style);
  }

  function optimizedReviewsPage(){
    installStyles();
    const started=performance.now();
    const packageData=window.ENOS_REVIEWS||{stats:{},reviews:[]};
    const stats=packageData.stats||{};
    const reviews=Array.isArray(packageData.reviews)?packageData.reviews:[];
    const indexed=buildIndex(reviews);
    const categories=["Todos","Atención prioritaria","Requieren mejora","Fortalecidos","Sin plan"];
    const counts=indexed.reduce((acc,item)=>{acc[item.category]=(acc[item.category]||0)+1;return acc},{Todos:indexed.length});
    const provinces=[...new Set(indexed.map(item=>item.province).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"es"));

    $("#content").innerHTML=`<div class="cards">
      <div class="card"><span>Planes recibidos y evaluados</span><strong>${stats.plansEvaluated||0}/${stats.plansReceived||0}</strong><small>Documentos procesados; la validación territorial es independiente</small></div>
      <div class="card"><span>Extracción automática inicial</span><strong>${stats.reviewCompletion||0}%</strong><small>Procesado no significa validado</small></div>
      <div class="card"><span>Cobertura territorial documental</span><strong>${stats.territorialCoverage||0}%</strong><small>${stats.plansReceived||0} de ${stats.canonicalTerritories||stats.folders||0} entidades con plan</small></div>
      <div class="card"><span>Planes no recibidos</span><strong>${stats.missingPlans||0}</strong><small>No se generan resultados sin documento</small></div>
      <div class="card"><span>Ítems de checklist</span><strong>${stats.totalChecklist||0}</strong><small>Se muestran progresivamente para evitar bloqueos</small></div>
    </div>
    <div class="panel compact-control">
      <div class="review-notice"><b>Revisión documental con carga optimizada</b><span>La pantalla indexa una sola vez los planes y pagina tanto la matriz como los checklist extensos.</span></div>
      <div class="compact-tabs">${categories.map(category=>`<button data-review-category="${html(category)}" class="${category==="Todos"?"active":""}"><span>${html(category)}</span><b>${counts[category]||0}</b></button>`).join("")}</div>
      <div class="toolbar site-toolbar"><input id="reviewSearch" placeholder="Buscar provincia, territorio o plan...">
        <select id="reviewProvince"><option value="">Todas las provincias</option>${provinces.map(value=>`<option>${html(value)}</option>`).join("")}</select>
        <select id="reviewState"><option value="">Todos los resultados</option><option value="strong">80% o más</option><option value="attention">Menos de 80%</option><option value="missing">Sin plan</option></select>
        <span id="reviewPerformanceStatus" class="review-performance-status">Preparando resultados…</span>
      </div>
      <div id="reviewTable" class="review-loading"><div><b>Cargando planes</b><span>Construyendo una vista ligera…</span></div></div>
      <div id="reviewPager" class="decision-pager"></div>
    </div>`;

    let activeCategory="Todos";
    let page=1;
    let paintToken=0;

    const paint=()=>{
      const token=++paintToken;
      const paintStarted=performance.now();
      const query=lower($("#reviewSearch")?.value||"");
      const province=$("#reviewProvince")?.value||"";
      const state=$("#reviewState")?.value||"";
      defer(()=>{
        if(token!==paintToken)return;
        const filtered=indexed.filter(item=>{
          const stateMatch=!state||(state==="missing"?item.score==null:state==="strong"?item.score!=null&&item.score>=80:item.score!=null&&item.score<80);
          return (!query||item.search.includes(query))&&(!province||item.province===province)&&stateMatch&&(activeCategory==="Todos"||item.category===activeCategory);
        });
        const pages=Math.max(1,Math.ceil(filtered.length/PAGE_SIZE));
        page=Math.min(page,pages);
        const start=(page-1)*PAGE_SIZE;
        const visible=filtered.slice(start,start+PAGE_SIZE);
        const table=$("#reviewTable");
        if(!table)return;
        table.classList.remove("review-loading");
        table.innerHTML=`<div class="decision-list-summary"><b>${filtered.length} planes en esta consulta</b><span>${filtered.length?`Mostrando ${start+1}–${Math.min(start+PAGE_SIZE,filtered.length)}`:""}</span></div>
          <div class="table-scroll compact-table"><table><thead><tr><th>Territorio / plan</th><th>Resultado</th><th>Brechas</th><th>Checklist</th><th></th></tr></thead><tbody>${visible.map(item=>`<tr>
            <td><b>${html(item.territory||"Territorio sin nombre")}</b><small class="table-note">${html(item.province)} · ${html(item.plan?item.plan.split("\\").pop():"No disponible")}${item.review?.status?.includes("OCR")?" · OCR":""}</small></td>
            <td>${item.score==null?'<span class="badge danger">Sin plan recibido</span>':`<span class="review-score ${item.score>=80?"good":item.score>=60?"warn":"danger"}">${item.score}%</span>`}</td>
            <td>${item.gaps}</td><td>${item.checklist}</td>
            <td><button class="secondary review-details" data-review-position="${item.position}">${item.score==null?"Ver estado":"Revisar"}</button></td>
          </tr>`).join("")}</tbody></table></div>`;
        $("#reviewPager").innerHTML=filtered.length>PAGE_SIZE?`<button class="secondary" data-review-page="${page-1}" ${page===1?"disabled":""}>← Anterior</button><span>Página ${page} de ${pages}</span><button class="secondary" data-review-page="${page+1}" ${page===pages?"disabled":""}>Siguiente →</button>`:"";
        const elapsed=Math.round(performance.now()-paintStarted);
        const totalElapsed=Math.round(performance.now()-started);
        const status=$("#reviewPerformanceStatus");
        if(status)status.textContent=`${filtered.length} resultados · ${elapsed} ms · carga inicial ${totalElapsed} ms`;
      });
    };

    const delayedPaint=debounce(()=>{page=1;paint()});
    ["reviewSearch","reviewProvince","reviewState"].forEach(id=>{const element=$("#"+id);if(element)element.oninput=delayedPaint});
    $(".compact-tabs").onclick=event=>{const category=event.target.closest("[data-review-category]")?.dataset.reviewCategory;if(!category)return;activeCategory=category;page=1;document.querySelectorAll("[data-review-category]").forEach(button=>button.classList.toggle("active",button.dataset.reviewCategory===category));paint()};
    $("#reviewPager").onclick=event=>{const next=Number(event.target.closest("[data-review-page]")?.dataset.reviewPage);if(next>0){page=next;paint()}};
    $("#reviewTable").onclick=event=>{const button=event.target.closest("[data-review-position]");if(!button)return;const item=indexed.find(entry=>entry.position===Number(button.dataset.reviewPosition));if(item)window.openReviewDetail(item.review)};
    paint();
  }

  function optimizedReviewDetail(review){
    if(!review)return;
    installStyles();
    const dialog=document.createElement("dialog");
    dialog.className="review-dialog";
    const criteria=Array.isArray(review.criteria)?review.criteria:[];
    const checklist=Array.isArray(review.checklist)?review.checklist:[];
    let shown=Math.min(CHECKLIST_BATCH,checklist.length);
    const snippet=value=>{const result=text(value);return result.length>360?result.slice(0,357)+"…":result};

    dialog.innerHTML=`<div class="dialog-body review-detail"><div class="detail-heading"><div><span class="eyebrow">${html(review.province)}</span><h3>${html(review.territory)}</h3><p class="muted">${html(review.plan||review.status)}</p></div><button type="button" class="icon-button cancel">×</button></div>
      ${review.score==null?'<div class="empty">El paquete no contiene un plan evaluable para este territorio. Debe solicitarse el documento oficial y sus anexos.</div>':`<div class="detail-badges"><span class="review-score ${review.score>=80?"good":review.score>=60?"warn":"danger"}">${html(review.score)}% global</span><span class="badge neutral">${html(review.pages)} páginas</span><span class="badge neutral">${html(review.totalChecklist)} ítems de checklist</span>${review.status?.includes("OCR")?'<span class="badge warn">Fuente procesada con OCR</span>':""}</div>
      <h4>Evaluación por componente</h4><div class="criteria-list">${criteria.map(item=>`<article class="criterion"><div><b>${html(item?.name)}</b><small>${html(item?.score)}% · ${html(item?.status)}</small></div><span class="criterion-state ${item?.status==="Cumple"?"good":item?.status==="Parcial"?"warn":"danger"}">${html(item?.status)}</span>${item?.evidence?.length?`<p><b>Evidencia:</b> pág. ${html(item.evidence.map(value=>value?.page).filter(Boolean).join(", "))} · ${html(snippet(item.evidence[0]?.snippet))}</p>`:'<p class="danger-text">No se encontró evidencia suficiente en el documento.</p>'}${item?.newAction?`<p><b>Acción nueva:</b> ${html(item.newAction)}</p>`:""}</article>`).join("")}</div>
      <div class="detail-actions-heading"><h4>Checklist operativo</h4><small>Se muestran ${shown} de ${checklist.length} registros</small></div><div class="checklist-list"></div><div class="review-checklist-controls"></div>`}
      <div class="dialog-actions"><button type="button" class="secondary cancel-bottom">Cerrar</button></div></div>`;

    document.body.append(dialog);
    const checklistContainer=dialog.querySelector(".checklist-list");
    const controls=dialog.querySelector(".review-checklist-controls");
    const paintChecklist=()=>{
      if(!checklistContainer||!controls)return;
      checklistContainer.innerHTML=checklist.slice(0,shown).map(item=>`<article><span class="badge ${item?.origin==="Brecha de revisión"?"warn":"neutral"}">${html(item?.origin)}</span><p>${html(item?.action)}</p><small>Página ${html(item?.source_page||"por verificar")} · ${html(item?.status)}</small></article>`).join("");
      controls.innerHTML=`<small>Mostrando ${shown} de ${checklist.length}</small>${shown<checklist.length?'<button type="button" class="secondary show-more-checklist">Mostrar 25 más</button>':""}`;
      controls.querySelector(".show-more-checklist")?.addEventListener("click",()=>{shown=Math.min(shown+CHECKLIST_BATCH,checklist.length);paintChecklist()});
    };
    paintChecklist();
    dialog.showModal();
    const close=()=>{dialog.close();dialog.remove()};
    dialog.querySelectorAll(".cancel,.cancel-bottom").forEach(button=>button.onclick=close);
    dialog.addEventListener("cancel",()=>dialog.remove());
  }

  function install(){
    if(installed)return true;
    if(typeof window.reviewsPage!=="function"||typeof window.openReviewDetail!=="function"||typeof window.$!=="function")return false;
    window.reviewsPage=optimizedReviewsPage;
    window.openReviewDetail=optimizedReviewDetail;
    window.SMART_RISK_REVIEW_PERFORMANCE_FIX={version:BUILD,pageSize:PAGE_SIZE,checklistBatch:CHECKLIST_BATCH,installedAt:new Date().toISOString()};
    installed=true;
    console.info("SmartRisk: optimización de Planes, checklist y brechas instalada",window.SMART_RISK_REVIEW_PERFORMANCE_FIX);
    return true;
  }

  if(!install()){
    const timer=setInterval(()=>{if(install())clearInterval(timer)},100);
    setTimeout(()=>clearInterval(timer),300000);
  }
})();
