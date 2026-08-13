(() => {
  const DATA = window.SR_CONSULTORIA_DATA || {projects:[]};
  const state = {tab:'portfolio'};
  const $ = id => document.getElementById(id);
  const money = v => new Intl.NumberFormat('es-EC',{style:'currency',currency:'USD',maximumFractionDigits:0}).format(v || 0);
  const margin = p => p.price > 0 ? ((p.price - p.cost) / p.price * 100) : 0;

  function totals(){
    const projects = DATA.projects || [];
    const portfolio = projects.reduce((s,p)=>s+(p.price||0),0);
    const budget = projects.reduce((s,p)=>s+(p.cost||0),0);
    const actual = projects.reduce((s,p)=>s+(p.actual||0),0);
    const committed = projects.reduce((s,p)=>s+(p.committed||0),0);
    const alerts = projects.reduce((s,p)=>s+(p.alerts?.length||0),0);
    return {projects,portfolio,budget,actual,committed,alerts,margin:portfolio?((portfolio-budget)/portfolio*100):0};
  }

  function renderKpis(){
    const t=totals();
    $('mgmtKpis').innerHTML=[
      ['Cartera',money(t.portfolio),`${t.projects.length} proyectos`],
      ['Costo previsto',money(t.budget),'cartera visible'],
      ['Ejecutado',money(t.actual),t.budget?`${(t.actual/t.budget*100).toFixed(1)}% del costo`: '—'],
      ['Margen previsto',`${t.margin.toFixed(1)}%`,t.margin>=20?'En objetivo':'Revisar'],
      ['Alertas abiertas',t.alerts,'técnicas · contractuales · económicas']
    ].map(([l,v,s])=>`<article class="kpi card"><span>${l}</span><strong>${v}</strong><small>${s}</small></article>`).join('');
  }

  function portfolio(){
    const rows=(DATA.projects||[]).map(p=>`<div class="portfolio-row"><strong>${p.canton}</strong><span>${p.stage}</span><span>${money(p.price)}</span><span>${money(p.cost)}</span><span>${margin(p).toFixed(1)}%</span><span>${p.alerts?.length||0}</span></div>`).join('');
    $('mgmtMain').innerHTML=`<div class="panel-header"><div><div class="panel-title">Cartera de consultorías</div><div class="panel-subtitle">Precio, costo, margen y alertas por proyecto.</div></div></div><div class="portfolio-row header"><span>Proyecto</span><span>Etapa</span><span>Precio</span><span>Costo</span><span>Margen</span><span>Alertas</span></div>${rows}`;
    const ranked=[...(DATA.projects||[])].sort((a,b)=>(b.alerts?.length||0)-(a.alerts?.length||0));
    $('mgmtAside').innerHTML=`<div class="panel-title">Prioridad gerencial</div><div class="panel-subtitle">Proyectos con mayor número de alertas.</div>${ranked.map((p,i)=>`<div class="list-row"><div><strong>${i+1}. ${p.canton}</strong><small>${p.note||p.stage}</small></div><span class="badge">${p.alerts?.length||0} alertas</span></div>`).join('')}`;
  }

  function risks(){
    const risks=[];
    (DATA.projects||[]).forEach(p=>{
      (p.alerts||[]).forEach((a,i)=>risks.push({project:p.canton,desc:a,prob:i===0?4:3,impact:p.stage==='Ejecución'?4:3,owner:p.stage==='Ejecución'?'Coordinación':'Gerencia'}));
    });
    $('mgmtMain').innerHTML=`<div class="panel-title">Registro consolidado de riesgos</div><div class="panel-subtitle">Priorización P × I para decisiones de dirección.</div><div class="risk-row" style="color:var(--muted);font-size:11px;font-weight:700"><span>Riesgo</span><span>P</span><span>I</span><span>Responsable</span><span>Nivel</span></div>${risks.map(r=>{const score=r.prob*r.impact;return `<div class="risk-row"><div><strong>${r.project}</strong><small style="display:block;color:var(--muted)">${r.desc}</small></div><span>${r.prob}</span><span>${r.impact}</span><span>${r.owner}</span><span class="risk-score ${score>=16?'high':score>=9?'medium':''}">${score}</span></div>`}).join('')}`;
    $('mgmtAside').innerHTML=`<div class="panel-title">Criterio de acción</div><div class="soft warning" style="margin-top:10px"><strong>16–25</strong><br>Intervención inmediata y seguimiento de Gerencia.</div><div class="soft" style="margin-top:8px"><strong>9–15</strong><br>Plan de tratamiento y responsable definido.</div><div class="soft ok" style="margin-top:8px"><strong>1–8</strong><br>Seguimiento rutinario.</div>`;
  }

  function capacity(){
    const capacity=[
      ['Coordinación técnica',78],['Geotecnia',86],['Geofísica',62],['SIG / Modelación',71],['Gestión contractual',55],['QA/QC',67]
    ];
    $('mgmtMain').innerHTML=`<div class="panel-title">Capacidad del equipo</div><div class="panel-subtitle">Carga estimada para decidir si se puede asumir una nueva consultoría.</div>${capacity.map(([n,v])=>`<div class="capacity-row"><strong>${n}</strong><div class="bar"><span style="width:${v}%"></span></div><span>${v}%</span></div>`).join('')}`;
    const max=Math.max(...capacity.map(x=>x[1]));
    $('mgmtAside').innerHTML=`<div class="panel-title">Decisión de capacidad</div><div class="soft ${max>=85?'warning':'ok'}" style="margin-top:10px"><strong>${max>=85?'Capacidad limitada':'Capacidad disponible'}</strong><div class="panel-subtitle">La mayor carga actual estimada es ${max}%.</div></div><div class="list-row"><span>Cuello de botella</span><strong>${capacity.sort((a,b)=>b[1]-a[1])[0][0]}</strong></div>`;
  }

  function cash(){
    const rows=(DATA.projects||[]).filter(p=>p.price>0).map((p,i)=>({p,invoiced:Math.round((p.price||0)*(i===2?.60:.35)),collected:Math.round((p.price||0)*(i===2?.35:.20))}));
    const invoiced=rows.reduce((s,x)=>s+x.invoiced,0), collected=rows.reduce((s,x)=>s+x.collected,0);
    $('mgmtMain').innerHTML=`<div class="panel-title">Facturación y cobranza</div><div class="panel-subtitle">Seguimiento de liquidez por proyecto.</div><div class="portfolio-row header"><span>Proyecto</span><span>Etapa</span><span>Contrato</span><span>Facturado</span><span>Cobrado</span><span>Saldo</span></div>${rows.map(x=>`<div class="portfolio-row"><strong>${x.p.canton}</strong><span>${x.p.stage}</span><span>${money(x.p.price)}</span><span>${money(x.invoiced)}</span><span>${money(x.collected)}</span><span>${money(x.invoiced-x.collected)}</span></div>`).join('')}`;
    $('mgmtAside').innerHTML=`<div class="panel-title">Liquidez</div><div class="metric-grid" style="grid-template-columns:1fr"><div class="metric"><span>Facturado</span><strong>${money(invoiced)}</strong></div><div class="metric"><span>Cobrado</span><strong>${money(collected)}</strong></div><div class="metric"><span>Por cobrar</span><strong>${money(invoiced-collected)}</strong></div></div>`;
  }

  function render(){
    renderKpis();
    ({portfolio,risks,capacity,cash}[state.tab]||portfolio)();
    document.querySelectorAll('[data-mgmt-tab]').forEach(b=>b.classList.toggle('active',b.dataset.mgmtTab===state.tab));
  }

  document.querySelectorAll('[data-mgmt-tab]').forEach(b=>b.addEventListener('click',()=>{state.tab=b.dataset.mgmtTab;render();}));
  render();
})();
