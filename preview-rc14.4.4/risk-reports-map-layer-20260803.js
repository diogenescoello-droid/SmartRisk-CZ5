(()=>{
  "use strict";

  const VERSION="2026-08-03T00:24:00-05:00";
  const COORDINATES={
    "IR-GYE-CIUDAD-OLIMPO-2026":{
      lat:-2.2253365595,
      lng:-80.0755100411,
      source:"UTM 17S: 602800 E / 9754000 N",
      crs:"EPSG:32717",
      accuracy:"Coordenada referencial del informe"
    },
    "IR-NOBOL-LA-PRIMAVERA-2026":{
      lat:-1.9738222734,
      lng:-80.0145204400,
      source:"UTM 17S: 609600 E / 9781800 N",
      crs:"EPSG:32717",
      accuracy:"Coordenada referencial del informe"
    },
    "IR-SANTA-ELENA-SANTUARIO-OLON-2022":{
      lat:-1.8149590913,
      lng:-80.7570577498,
      source:"UTM 17S: 527020 E / 9799390 N",
      crs:"EPSG:32717",
      accuracy:"Coordenada referencial del informe"
    }
  };

  let reportLayer=null;
  let reportControl=null;

  const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;","\"":"&quot;","'":"&#39;"}[char]));
  const reports=()=>window.SMART_RISK_RISK_REPORTS_5Y?.reports||[];
  const mappedReports=()=>reports().filter(report=>COORDINATES[report.id]);

  function popup(report,coordinate){
    const threats=(report.threats||[]).slice(0,3).join(" · ");
    const sectors=(report.sectors||[]).join(", ");
    const url=report.url?`<p style="margin:8px 0 0"><a href="${esc(report.url)}" target="_blank" rel="noopener">Abrir informe técnico</a></p>`:"";
    return `<div class="sr-risk-report-popup">
      <span class="badge technical">Informe CZ5GR</span>
      <h4 style="margin:7px 0 4px">${esc(report.title)}</h4>
      <p style="margin:0 0 5px"><b>${esc(report.code)}</b> · ${esc(report.status||"Sin estado")}</p>
      <p style="margin:0 0 5px">${esc(report.canton)}, ${esc(report.province)}${sectors?` · ${esc(sectors)}`:""}</p>
      <p style="margin:0 0 5px"><b>Amenazas:</b> ${esc(threats||"Sin clasificación")}</p>
      <p style="margin:0 0 5px"><b>Fecha:</b> ${esc(report.date||report.inspectionDate||"Sin fecha")}</p>
      <p style="margin:0"><small>${coordinate.lat.toFixed(6)}, ${coordinate.lng.toFixed(6)} · convertido desde ${esc(coordinate.source)} · ${esc(coordinate.crs)}</small></p>
      ${url}
    </div>`;
  }

  function clear(){
    if(reportControl&&activeF03Map){try{activeF03Map.removeControl(reportControl)}catch{}}
    reportControl=null;
    reportLayer=null;
  }

  function addLayer(){
    if(!window.activeF03Map||typeof L==="undefined")return;
    clear();
    const items=mappedReports();
    reportLayer=L.featureGroup();
    items.forEach(report=>{
      const coordinate=COORDINATES[report.id];
      const marker=L.circleMarker([coordinate.lat,coordinate.lng],{
        radius:8,
        color:"#ffffff",
        weight:2,
        fillColor:"#7c3aed",
        fillOpacity:.95
      });
      marker.bindTooltip(`Informe CZ5GR · ${report.canton}`,{sticky:true});
      marker.bindPopup(popup(report,coordinate),{maxWidth:360});
      marker.on("click",()=>{
        window.dispatchEvent(new CustomEvent("smartrisk:risk-report-map-open",{detail:{reportId:report.id}}));
      });
      reportLayer.addLayer(marker);
    });
    reportControl=L.control.layers(null,{[`Informes CZ5GR · ${items.length}`]:reportLayer},{position:"bottomright",collapsed:true}).addTo(activeF03Map);
    window.SMART_RISK_REPORT_MAP_LAYER={version:VERSION,totalReports:reports().length,mappedReports:items.length,layer:reportLayer,control:reportControl};
  }

  const original=window.paintF03Map;
  if(typeof original!=="function")return;
  window.paintF03Map=function(...args){
    const result=original.apply(this,args);
    setTimeout(addLayer,120);
    return result;
  };
})();