(() => {
  const mq=window.matchMedia('(max-width:780px)');
  function injectStyles(){
    if(document.getElementById('srMobileV2Styles')) return;
    const s=document.createElement('style');s.id='srMobileV2Styles';s.textContent=`
      @media (prefers-color-scheme: dark){
        :root{--bg:#0f1519;--panel:#141b20;--soft:#192228;--text:#f2f6f7;--muted:#9eabb2;--line:#2a373e;--accent:#2d91b1;--accent2:#73bfd6;--ok:#52b887;--warn:#d4a249;--danger:#db7474;--shadow:0 10px 28px rgba(0,0,0,.28)}
        html{color-scheme:dark}.top{background:#103747}.card,.main,.modal-card,.modal-head,.modal-foot,.mobile-bottom-nav,.mobile-more-sheet,.sr-bubble{background:var(--panel);color:var(--text)}
        .field input,.field select,.chip,.btn,.tab,.navbtn,.mobile-filter-toggle{background:#11181d;color:var(--text);border-color:var(--line)}
        .metric,.decision-card,.box,.decision-details>summary{background:var(--soft)}.decision-card.primary{background:#16292f}.decision-card.warn{background:#2a2317}.callout{background:#17282e}.callout.warn{background:#2a2417}.callout.ok{background:#17281f}.badge,.status{background:#223039;color:var(--text)}
      }
      .mobile-market-cards{display:none}
      @media(max-width:780px){
        .business-mobile-table .table-wrap{display:none!important}
        .mobile-market-cards{display:grid;gap:9px;margin-top:10px}
        .market-mobile-card{border:1px solid var(--line);background:var(--panel);border-radius:14px;padding:12px;box-shadow:0 4px 15px rgba(0,0,0,.08)}
        .market-mobile-head{display:flex;justify-content:space-between;gap:8px;align-items:flex-start}.market-mobile-title{font-size:16px;font-weight:800;line-height:1.1}.market-mobile-sub{font-size:10px;color:var(--muted);margin-top:3px}
        .market-mobile-tags{display:flex;gap:5px;flex-wrap:wrap;margin:9px 0}.market-mobile-tag{font-size:10px;border:1px solid var(--line);border-radius:999px;padding:4px 7px;background:var(--soft)}
        .market-mobile-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px;margin:8px 0}.market-mobile-field{background:var(--soft);border-radius:9px;padding:8px}.market-mobile-field small{display:block;color:var(--muted);font-size:9px;margin-bottom:2px}.market-mobile-field strong{font-size:12px}
        .market-mobile-next{font-size:11px;color:var(--muted);border-top:1px solid var(--line);padding-top:8px;margin-top:7px}.market-mobile-actions{display:flex;justify-content:flex-end;margin-top:8px}.market-mobile-actions .btn{min-height:40px;min-width:110px}
        .decision-strip{display:grid!important;grid-template-columns:1fr 1fr!important;overflow:visible!important;margin:8px 0!important;padding:0!important;gap:7px!important}.decision-card{min-width:0!important;padding:10px!important}.decision-card.primary{grid-column:1/-1}.decision-value{font-size:21px}.decision-card small{font-size:10px}.decision-card .btn{min-height:38px;width:100%}
        .panel-actions{grid-template-columns:1fr 1fr!important}.panel-actions .btn{font-size:12px;line-height:1.15;min-height:44px}
        .sr-help{display:none!important}.mobile-more-sheet{grid-template-columns:1fr 1fr!important}#mobileGuideButton{display:block}
        .kpis{scroll-padding-left:1px}.kpi{min-width:42vw}.kpi strong{font-size:20px}
      }
    `;document.head.appendChild(s);
  }
  function simplifyButtons(){if(!mq.matches)return;const a=document.getElementById('showCriteria'),b=document.getElementById('marketNewProject');if(a&&a.textContent!=='Criterios')a.textContent='Criterios';if(b&&b.textContent!=='+ Oportunidad')b.textContent='+ Oportunidad'}
  function cardsHost(){let h=document.getElementById('mobileMarketCards');if(!h){const wrap=document.querySelector('#marketTable')?.closest('.table-wrap');if(!wrap)return null;h=document.createElement('div');h.id='mobileMarketCards';h.className='mobile-market-cards';wrap.insertAdjacentElement('afterend',h)}return h}
  function buildCards(){if(!mq.matches)return;const tbody=document.getElementById('marketTable'),host=cardsHost();if(!tbody||!host)return;const rows=[...tbody.querySelectorAll('tr')],signature=rows.map(r=>r.innerText).join('|');if(host.dataset.signature===signature)return;host.dataset.signature=signature;host.innerHTML=rows.map((r,i)=>{const c=r.querySelectorAll('td');if(c.length<10)return'';const dpa=c[0].innerText.trim(),province=c[1].innerText.trim(),client=c[2].querySelector('strong')?.innerText.trim()||c[2].innerText.trim(),gad=c[2].querySelector('small')?.innerText.trim()||'',urban=c[3].innerText.trim(),exp=c[4].innerText.trim(),base=c[5].innerText.trim(),interest=c[6].innerText.trim(),risk=c[7].innerText.trim(),next=c[8].innerText.trim();return `<article class="market-mobile-card"><div class="market-mobile-head"><div><div class="market-mobile-title">${client}</div><div class="market-mobile-sub">${province} · DPA ${dpa}<br>${gad}</div></div><span class="market-mobile-tag">${risk}</span></div><div class="market-mobile-tags"><span class="market-mobile-tag">${interest}</span><span class="market-mobile-tag">${base}</span></div><div class="market-mobile-grid"><div class="market-mobile-field"><small>Área urbana</small><strong>${urban}</strong></div><div class="market-mobile-field"><small>Expansión</small><strong>${exp}</strong></div></div><div class="market-mobile-next"><strong>Próxima acción:</strong> ${next}</div><div class="market-mobile-actions"><button class="btn primary" data-mobile-eval="${i}">Evaluar</button></div></article>`}).join('');host.querySelectorAll('[data-mobile-eval]').forEach(btn=>btn.onclick=()=>rows[Number(btn.dataset.mobileEval)]?.querySelector('[data-market-eval]')?.click())}
  function installGuideInMore(){if(!mq.matches)return;const more=document.getElementById('mobileMoreSheet');if(!more||document.getElementById('mobileGuideButton'))return;const b=document.createElement('button');b.id='mobileGuideButton';b.textContent='❔ Guía paso a paso';b.onclick=()=>{more.classList.remove('open');document.getElementById('srHelp')?.click()};more.appendChild(b)}
  function refresh(){simplifyButtons();buildCards();installGuideInMore()}
  function watch(){let scheduled=false;const obs=new MutationObserver(()=>{if(scheduled)return;scheduled=true;requestAnimationFrame(()=>{scheduled=false;refresh()})});obs.observe(document.body,{childList:true,subtree:true});mq.addEventListener?.('change',refresh)}
  injectStyles();refresh();watch();window.SmartRiskMobileV2={refresh};
})();