(() => {
  "use strict";
  function install(){
    const matrix=window.ENOS_MATRIX_PRELIMINARY;
    const api=window.SmartRiskMatrix;
    if(!matrix?.gads || !api?.areasFor || !api?.contextFor) return false;
    matrix.gads.forEach(gad=>{
      if(!gad.auditFinding) return;
      gad.validationState=`${gad.institutionalStatus || "ESTADO POR CONFIRMAR"} · ${String(gad.auditState || "AUDITADO").toUpperCase()}`;
    });
    if(!api.__audit20260822Wrapped){
      const originalAreas=api.areasFor.bind(api);
      const originalContext=api.contextFor.bind(api);
      api.areasFor=gad=>originalAreas(gad).map((area,index)=>index===0 && gad?.auditFinding ? {...area,gap:`Hallazgo auditado: ${gad.auditFinding} ${area.gap}`} : area);
      api.contextFor=gad=>{
        const context=originalContext(gad);
        return gad?.auditFinding ? {...context,conclusion:`${gad.auditFinding} Corte: ${gad.auditCut || matrix.auditScope || "por verificar"}.`} : context;
      };
      api.__audit20260822Wrapped=true;
    }
    return true;
  }
  if(!install()){
    const timer=setInterval(()=>{if(install()) clearInterval(timer);},50);
    setTimeout(()=>clearInterval(timer),5000);
  }
})();