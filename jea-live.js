(() => {
  'use strict';

  const pct = (n, d) => d ? `${(n * 100 / d).toFixed(1)}%` : '0%';
  const el = (tag, cls, html='') => { const n=document.createElement(tag); if(cls)n.className=cls; n.innerHTML=html; return n; };

  async function loadData(){
    try{
      const res=await fetch(`jea-live-data.json?ts=${Date.now()}`,{cache:'no-store'});
      if(!res.ok) throw new Error('data');
      return await res.json();
    }catch{
      return {generatedAt:null,cohort:{officialTotal:0,interacted:0,reportedFiveFamilies:0,concreteProgress:0,withEvidenceUrl:0,withoutIdentifiableKoboInteraction:0},banking:{confirmedPending:0,pendingNames:[]},sources:[],actionQueue:[],guides:[]};
    }
  }

  function kpi(label,value,sub){ return `<div class="jea-card jea-kpi"><b>${value}</b><span>${label}</span>${sub?`<div class="jea-mini">${sub}</div>`:''}</div>`; }

  function render(data){
    const c=data.cohort;
    const panel=el('div','jea-live-panel');
    panel.id='jeaLivePanel';
    panel.innerHTML=`<section class="jea-live-shell" role="dialog" aria-modal="true" aria-label="JEA Live">
      <div class="jea-live-top">
        <div class="jea-live-title"><h2>JEA Live · Gestión de cohorte</h2><p>Lectura operativa, prioridades y siguiente mejor acción</p><div class="jea-mini">Corte: ${data.generatedAt?new Date(data.generatedAt).toLocaleString('es-EC'):'sin sincronización'}</div></div>
        <button class="jea-live-close" type="button">Cerrar</button>
      </div>
      <div class="jea-grid">
        ${kpi('Base oficial',c.officialTotal,'Universo de gestión')}
        ${kpi('Interacción identificada',c.interacted,pct(c.interacted,c.officialTotal))}
        ${kpi('5 familias reportadas',c.reportedFiveFamilies,pct(c.reportedFiveFamilies,c.officialTotal))}
        ${kpi('Con avance/producto',c.concreteProgress,pct(c.concreteProgress,c.officialTotal))}

        <div class="jea-card jea-wide">
          <h3>Cola de acción</h3><p class="jea-mini">Ordenada para trabajar primero lo individual y crítico; después lo masivo por segmentación.</p>
          ${data.actionQueue.map(q=>`<div class="jea-priority"><div class="jea-priority-num">${q.priority}</div><div><b>${q.title}</b><div class="jea-mini">${q.action}</div></div><span class="jea-badge">${q.count}</span></div>`).join('')}
        </div>

        <div class="jea-card jea-side">
          <h3>Salud de fuentes</h3>
          ${data.sources.map(s=>`<div class="jea-source"><div><span class="jea-status ${s.status}"></span><b>${s.label}</b><div class="jea-mini">${s.detail}</div></div></div>`).join('')}
          <div class="jea-focus"><b>Atención inmediata</b><span>${data.banking.confirmedPending} pendiente bancario confirmado${data.banking.pendingNames?.length?`: ${data.banking.pendingNames.join(', ')}`:''}.</span></div>
        </div>

        <div class="jea-card jea-full">
          <h3>Cómo gestionar esta cohorte</h3>
          <div class="jea-strategy">
            <article><b>1 · Estado</b><span>Clasificar a cada JEA por interacción, avance, cumplimiento y novedad administrativa.</span></article>
            <article><b>2 · Fricción</b><span>Identificar qué impide avanzar: información, acceso, comprensión, conectividad, cuenta bancaria o coordinación.</span></article>
            <article><b>3 · Acción</b><span>Asignar una sola “siguiente mejor acción” concreta, con responsable y fecha de revisión.</span></article>
            <article><b>4 · Evidencia</b><span>Distinguir reporte, producto y verificable. No castigar automáticamente la ausencia de enlace.</span></article>
          </div>
        </div>

        <div class="jea-card jea-wide">
          <h3>Embudo de participación</h3>
          <div><b>${c.interacted} interactuaron</b> · ${pct(c.interacted,c.officialTotal)}<div class="jea-progress"><i style="width:${Math.min(100,c.interacted*100/c.officialTotal)}%"></i></div></div>
          <div style="margin-top:14px"><b>${c.concreteProgress} con avance/producto</b> · ${pct(c.concreteProgress,c.officialTotal)}<div class="jea-progress"><i style="width:${Math.min(100,c.concreteProgress*100/c.officialTotal)}%"></i></div></div>
          <div style="margin-top:14px"><b>${c.reportedFiveFamilies} reportaron 5 familias</b> · ${pct(c.reportedFiveFamilies,c.officialTotal)}<div class="jea-progress"><i style="width:${Math.min(100,c.reportedFiveFamilies*100/c.officialTotal)}%"></i></div></div>
          <div style="margin-top:14px"><b>${c.withEvidenceUrl} con enlace verificable</b> · ${pct(c.withEvidenceUrl,c.interacted)} de quienes interactuaron<div class="jea-progress"><i style="width:${Math.min(100,c.withEvidenceUrl*100/Math.max(1,c.interacted))}%"></i></div></div>
        </div>

        <div class="jea-card jea-side">
          <h3>Burbujas guía</h3>
          ${data.guides.map(g=>`<div class="jea-guide"><strong>${g.title}</strong><span>${g.text}</span></div>`).join('')}
        </div>

        <div class="jea-card jea-full">
          <h3>Buscador operativo</h3>
          <p class="jea-mini">Esta caja queda preparada para consultar por cédula, nombre o teléfono cuando la sincronización nominal esté conectada a Firestore/API segura.</p>
          <div class="jea-search"><input id="jeaLiveSearch" placeholder="Cédula, nombre o teléfono" aria-label="Buscar JEA"><button type="button" id="jeaLiveSearchBtn">Buscar</button></div>
          <div id="jeaLiveSearchResult" class="jea-mini" style="margin-top:8px">La versión actual muestra indicadores consolidados; la consulta nominal requiere el conector de backend para no exponer datos personales en un archivo público.</div>
        </div>
      </div>
    </section>`;
    document.body.appendChild(panel);
    panel.querySelector('.jea-live-close').addEventListener('click',()=>panel.classList.remove('is-open'));
    panel.addEventListener('click',e=>{if(e.target===panel)panel.classList.remove('is-open')});
    panel.querySelector('#jeaLiveSearchBtn').addEventListener('click',()=>{
      const q=panel.querySelector('#jeaLiveSearch').value.trim();
      panel.querySelector('#jeaLiveSearchResult').textContent=q?`Consulta nominal “${q}”: pendiente de backend seguro. Usa la base conectada, no datos personales publicados en GitHub.`:'Escribe una cédula, nombre o teléfono.';
    });
    return panel;
  }

  async function start(){
    const data=await loadData();
    const panel=render(data);
    const button=el('button','jea-live-launch','JEA Live');
    button.type='button'; button.setAttribute('aria-label','Abrir gestión viva de Jóvenes en Acción');
    button.addEventListener('click',()=>panel.classList.add('is-open'));
    document.body.appendChild(button);
  }

  if(document.readyState==='loading') document.addEventListener('DOMContentLoaded',start); else start();
})();
