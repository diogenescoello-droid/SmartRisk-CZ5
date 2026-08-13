(() => {
  let step=0;
  const items=[
    ['#nav [data-sec="negocios"],#mobileBottomNav [data-mobile-sec="negocios"]','Mercado antes que proyecto','Empieza valorando clientes potenciales y decide GO / NO-GO antes de preparar una oferta.'],
    ['#quickEvaluate,#marketSearch','Precalifica al GAD','Aquí valoras oportunidad, presupuesto, acceso, datos, riesgo de cobro y viabilidad.'],
    ['#showCriteria','Criterios de decisión','Abre la metodología completa, categorías A–X y bloqueos especiales.'],
    ['#newBtn,#mobileFab','Crear proyecto','Cuando la oportunidad esté madura, crea cliente → territorio → servicio → presupuesto.'],
    ['#nav [data-sec="mapa"],#mobileBottomNav [data-mobile-sec="mapa"]','Mapa / Área','Carga KMZ, KML o GeoJSON, mide el área y superpone resultados técnicos.'],
    ['#role','Vista por rol','Cambia el perfil para ver las acciones y datos que corresponden a cada responsable.']
  ];
  const st=document.createElement('style');st.textContent=`#srGuide{position:fixed;right:18px;bottom:18px;z-index:95;border:0;border-radius:999px;background:#102f3e;color:#fff;padding:9px 12px;font-weight:700;cursor:pointer;box-shadow:0 10px 25px #0003}#srBubble{position:fixed;right:18px;bottom:64px;z-index:96;width:min(330px,calc(100vw - 24px));background:#fff;border:1px solid #d4e0e5;border-radius:15px;padding:13px;box-shadow:0 18px 45px #0003;display:none}#srBubble strong{display:block;margin-bottom:5px}#srBubble p{margin:0;color:#60717c;font-size:12px;line-height:1.45}#srBubble .a{display:flex;justify-content:space-between;margin-top:11px;gap:6px}#srBubble button{border:1px solid #dbe3e7;background:#fff;border-radius:8px;padding:7px 9px;cursor:pointer}#srBubble .next{background:#176b87;color:#fff;border-color:#176b87}.srGuideTarget{outline:4px solid #78b7ca!important;outline-offset:3px!important;position:relative;z-index:94!important}@media(max-width:780px){#srGuide{right:14px;bottom:84px;width:44px;height:44px;padding:0;font-size:0}#srGuide:after{content:'?';font-size:20px}#srBubble{left:12px;right:12px;bottom:82px;width:auto}}`;document.head.appendChild(st);
  document.body.insertAdjacentHTML('beforeend','<button id="srGuide">? Guía</button><div id="srBubble"><strong id="srGuideTitle"></strong><p id="srGuideText"></p><div class="a"><button id="srGuideClose">Cerrar</button><span><button id="srGuideBack">Atrás</button> <button class="next" id="srGuideNext">Siguiente</button></span></div></div>');
  const bubble=document.getElementById('srBubble');
  function visible(sel){return [...document.querySelectorAll(sel)].find(x=>x.offsetParent!==null)||document.querySelector(sel)}
  function clear(){document.querySelectorAll('.srGuideTarget').forEach(x=>x.classList.remove('srGuideTarget'))}
  function show(n){clear();step=Math.max(0,Math.min(items.length-1,n));const [sel,title,text]=items[step],el=visible(sel);if(!el&&step<items.length-1)return show(step+1);bubble.style.display='block';document.getElementById('srGuideTitle').textContent=`${step+1}. ${title}`;document.getElementById('srGuideText').textContent=text;document.getElementById('srGuideBack').disabled=step===0;document.getElementById('srGuideNext').textContent=step===items.length-1?'Terminar':'Siguiente';if(el){el.classList.add('srGuideTarget');el.scrollIntoView({behavior:'smooth',block:'center'})}}
  function close(){clear();bubble.style.display='none';sessionStorage.setItem('srGuideSeen','1')}
  document.getElementById('srGuide').onclick=()=>show(0);document.getElementById('srGuideClose').onclick=close;document.getElementById('srGuideBack').onclick=()=>show(step-1);document.getElementById('srGuideNext').onclick=()=>step===items.length-1?close():show(step+1);
  if(!sessionStorage.getItem('srGuideSeen'))setTimeout(()=>show(0),1000);
  window.SmartRiskTour={start:()=>show(0),close};
})();
