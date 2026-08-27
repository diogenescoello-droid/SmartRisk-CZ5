(() => {
  "use strict";
  const VERSION = "2026.08.27.2-enos-georef";
  const SUMMARY = Object.freeze({ total: 122, georeferenced: 95, high: 87, medium: 8, pending: 27 });
  const rt = { plannerMap:null, quickMap:null, plannerLayer:null, quickLayer:null, observer:null, hooked:false };
  const norm = v => String(v || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/^\s*cant[oó]n\s+/i, "").replace(/\s+/g," ").trim().toLowerCase();
  const esc = v => String(v ?? "").replace(/[&<>"']/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);

  function data() {
    const rows = window.SmartRiskEnosGeorefData?.rows || [];
    return { type:"FeatureCollection", features: rows.map(r => ({
      type:"Feature",
      properties:{ id:r[0], provincia:r[1], canton:r[2], gad:r[3], parroquia_zona:r[4], sitio:r[5], amenaza:r[6], confianza_geo:r[7] },
      geometry:{ type:"Point", coordinates:[Number(r[8]),Number(r[9])] }
    })).filter(f => Number.isFinite(f.geometry.coordinates[0]) && Number.isFinite(f.geometry.coordinates[1])) };
  }

  function scope() {
    const f = window.SmartRiskV11App?.state?.filters || {};
    const level = document.querySelector("#sr16Level")?.value || (f.canton ? "canton" : f.provincia ? "provincia" : "zona");
    return {
      level,
      province: level === "zona" ? "" : (document.querySelector("#sr16Province")?.value || f.provincia || ""),
      canton: level === "canton" ? (document.querySelector("#sr16Canton")?.value || f.canton || "") : ""
    };
  }
  const threat = () => document.querySelector("#srCartoThreat")?.value || "";
  function sameScope(f,current=scope()) { const p=f.properties||{}; return (!current.province || norm(p.provincia)===norm(current.province)) && (!current.canton || norm(p.canton)===norm(current.canton)); }
  function threatMatch(f,t=threat()) {
    if(!t) return true; const text=norm(f.properties?.amenaza);
    if(t==="inundacion") return /inund|desbord|aneg/.test(text);
    if(t==="movimiento") return /desliz|movimiento|masa|ladera/.test(text);
    if(t==="sequia") return /sequia|deficit hidri/.test(text);
    if(t==="incendio") return /incend/.test(text);
    if(t==="sismo") return /sism|terrem/.test(text);
    return true;
  }
  const enabled = () => document.querySelector('[data-sr-carto-layer="enos"]')?.checked ?? true;
  function filtered(current=scope(),t=threat()) { const geo=data(); return {type:"FeatureCollection",features:geo.features.filter(f=>sameScope(f,current)&&threatMatch(f,t))}; }
  function style(f,quick=false) { return norm(f.properties?.confianza_geo)==="media" ? {radius:quick?5:7,color:"#fff",weight:1.5,fillColor:"#d97706",fillOpacity:.92} : {radius:quick?5:7,color:"#fff",weight:1.5,fillColor:"#15803d",fillOpacity:.92}; }
  function popup(f) { const p=f.properties||{}; return `<div class="sr-carto-popup sr-enos-popup"><small>ENOS 2026–2027 · sitio georreferenciado</small><b>${esc(p.sitio||p.id)}</b><span>${esc([p.parroquia_zona,p.canton,p.provincia].filter(Boolean).join(" · "))}</span><p><strong>GAD:</strong> ${esc(p.gad||"No indicado")}</p><p><strong>Amenaza:</strong> ${esc(p.amenaza||"No indicada")}</p><p><strong>Confianza geográfica:</strong> ${esc(p.confianza_geo||"No indicada")}</p><p><strong>ID:</strong> ${esc(p.id||"")}</p></div>`; }
  const tooltip = f => `${f.properties?.sitio || f.properties?.id || "Sitio ENOS"} · ${f.properties?.confianza_geo || "sin nivel"}`;

  function remove(map,key){ const layer=rt[key]; if(layer&&map?.hasLayer?.(layer)) map.removeLayer(layer); rt[key]=null; }
  function updateBadge(n=null){ const b=document.querySelector("[data-sr-enos-count]"); if(b) b.textContent=Number.isFinite(n)?`${n} visibles`:`${SUMMARY.georeferenced} puntos`; }
  function paintPlanner(map){ if(!map||rt.plannerMap!==map)return; remove(map,"plannerLayer"); updateBadge(); if(!enabled())return; const geo=filtered(); if(rt.plannerMap!==map)return; rt.plannerLayer=L.geoJSON(geo,{pointToLayer:(f,ll)=>L.circleMarker(ll,style(f)),onEachFeature:(f,m)=>{m.bindTooltip(tooltip(f),{sticky:true});m.bindPopup(()=>popup(f),{maxWidth:390});}}).addTo(map); updateBadge(geo.features.length); }
  function paintQuick(map){ if(!map||rt.quickMap!==map)return; remove(map,"quickLayer"); if(!enabled())return; const geo=filtered(scope(),""); if(rt.quickMap!==map)return; rt.quickLayer=L.geoJSON(geo,{pointToLayer:(f,ll)=>L.circleMarker(ll,style(f,true)),onEachFeature:(f,m)=>m.bindTooltip(tooltip(f),{sticky:true})}).addTo(map); }
  function schedule(map,kind){ setTimeout(()=>kind==="planner"?paintPlanner(map):paintQuick(map),450); setTimeout(()=>{ if(kind==="planner"&&rt.plannerMap===map&&!rt.plannerLayer&&enabled())paintPlanner(map); if(kind==="quick"&&rt.quickMap===map&&!rt.quickLayer&&enabled())paintQuick(map); },1300); }

  function hookLeaflet(){
    if(rt.hooked||!window.L?.map)return false; rt.hooked=true; const original=L.map;
    const hooked=function(target,options){ const map=original.call(this,target,options); const el=typeof target==="string"?document.getElementById(target):target; if(el?.id==="srCartoMap"){rt.plannerMap=map;rt.plannerLayer=null;schedule(map,"planner");} else if(el?.id==="srCartoQuickMap"){rt.quickMap=map;rt.quickLayer=null;schedule(map,"quick");} return map; };
    Object.setPrototypeOf(hooked,Object.getPrototypeOf(original)); Object.keys(original).forEach(k=>{try{hooked[k]=original[k]}catch(_){}}); L.map=hooked; return true;
  }

  function decorate(){
    const list=document.querySelector("#srCartoPlanner .sr-carto-layers"); if(!list||list.querySelector('[data-sr-carto-layer="enos"]'))return;
    const label=document.createElement("label"); label.dataset.srEnosLayerControl="1"; label.innerHTML=`<input type="checkbox" data-sr-carto-layer="enos" checked> Sitios ENOS 2026–2027 <small data-sr-enos-count>${SUMMARY.georeferenced} puntos</small>`;
    const sites=list.querySelector('[data-sr-carto-layer="sites"]')?.closest("label"); (sites||list.querySelector("label"))?.insertAdjacentElement("afterend",label);
    const note=document.createElement("p"); note.dataset.srEnosNote="1"; note.innerHTML=`<b>ENOS georreferenciado:</b> ${SUMMARY.high} alta confianza · ${SUMMARY.medium} media · ${SUMMARY.pending} pendientes sin coordenada verificable.`; const hr=list.querySelector("hr"); if(hr)hr.insertAdjacentElement("beforebegin",note);else list.appendChild(note);
    const legend=document.querySelector("#srCartoPlanner .sr-carto-legend"); if(legend&&!legend.querySelector("[data-sr-enos-legend]")){const item=document.createElement("span");item.dataset.srEnosLegend="1";item.innerHTML='<i style="display:inline-block;width:.7em;height:.7em;border-radius:50%;background:#15803d;margin-right:.35em"></i>ENOS';legend.appendChild(item);}
  }

  function fitAll(){ const map=rt.plannerMap;if(!map)return;setTimeout(()=>{let bounds=null;map.eachLayer(layer=>{if(layer instanceof L.TileLayer)return;try{const next=typeof layer.getBounds==="function"?layer.getBounds():null;if(next?.isValid?.())bounds=bounds?bounds.extend(next):next;else if(typeof layer.getLatLng==="function"){const ll=layer.getLatLng();if(ll)bounds=bounds?bounds.extend(ll):L.latLngBounds(ll,ll);}}catch(_){}});if(bounds?.isValid?.())map.fitBounds(bounds,{padding:[22,22],maxZoom:scope().canton?15:scope().province?11:8});},80); }
  function bind(){
    document.addEventListener("click",e=>{if(e.target.closest("[data-sr-carto-fit]"))fitAll();});
    document.addEventListener("change",e=>{if(e.target.matches('[data-sr-carto-layer="enos"]'))setTimeout(()=>{if(rt.plannerMap)paintPlanner(rt.plannerMap);if(rt.quickMap)paintQuick(rt.quickMap);},60);});
    rt.observer=new MutationObserver(()=>{hookLeaflet();decorate();}); rt.observer.observe(document.body,{childList:true,subtree:true});
  }
  hookLeaflet(); bind(); decorate();
  window.SmartRiskEnosGeoref={VERSION,SUMMARY,scope,refresh:()=>{decorate();if(rt.plannerMap)paintPlanner(rt.plannerMap);if(rt.quickMap)paintQuick(rt.quickMap);}};
})();
