(() => {
  const registry=window.SmartRiskTerritorialDefaults;
  const market=window.SmartRiskEcuadorMarket;
  if(!registry)return;

  registry.official['Guayas|Milagro']={
    urbanOfficialHa:3332.31,
    expansionOfficialHa:1112.50,
    instrument:'Plan Milagro 2040 / PUGS - Memoria Técnica',
    sourceDate:'2024-10-18',
    sourceLabel:'GAD Municipal de Milagro - componente estructurante y subclasificación del suelo',
    sourceUrl:'https://milagro.gob.ec/category/plan-milagro-2040/',
    note:'Suelo urbano: 475,54 ha consolidado + 123,63 ha de protección + 2.733,14 ha no consolidado = 3.332,31 ha. Suelo rural de expansión urbana: 1.112,50 ha.'
  };

  const milagro=market?.records?.find(r=>r.province==='Guayas'&&r.canton==='Milagro');
  if(milagro){
    milagro.urbanOfficialHa=3332.31;
    milagro.expansionOfficialHa=1112.50;
    milagro.sourceStatus='verificado_pdout_pugs';
    milagro.instrument='Plan Milagro 2040 / PUGS - Memoria Técnica';
    milagro.sourceDate='2024-10-18';
    milagro.sourceLabel='GAD Municipal de Milagro - componente estructurante y subclasificación del suelo';
    milagro.sourceUrl='https://milagro.gob.ec/category/plan-milagro-2040/';
  }

  const baseWizard=wizard;
  function labelByText(text){return [...document.querySelectorAll('#wizardBody label.field')].find(l=>l.querySelector('span')?.textContent.trim()===text)}
  function enhanceTerritory(){
    if(s.wizard!==1)return;
    const draft=registry.draft;
    const urbanOfficial=labelByText('Área urbana oficial PDOT/PUGS');
    const expansionOfficial=labelByText('Expansión oficial PDOT/PUGS');
    const urbanProject=labelByText('Área urbana utilizada en este proyecto (ha)');
    const expansionProject=labelByText('Expansión / área adicional utilizada (ha)');
    if(!urbanOfficial||!expansionOfficial||!urbanProject||!expansionProject)return;

    const uRef=urbanOfficial.querySelector('input'),eRef=expansionOfficial.querySelector('input');
    const uProject=urbanProject.querySelector('input'),eProject=expansionProject.querySelector('input');
    urbanOfficial.querySelector('span').textContent='Área urbana de referencia / proyecto (ha)';
    expansionOfficial.querySelector('span').textContent='Expansión de referencia / proyecto (ha)';
    [uRef,eRef].forEach(i=>{i.readOnly=false;i.type='number';i.min='0';i.step='0.01';i.placeholder='Ingrese superficie'});
    uRef.value=draft.projectUrbanHa!==''?draft.projectUrbanHa:draft.officialUrbanHa;
    eRef.value=draft.projectExpansionHa!==''?draft.projectExpansionHa:draft.officialExpansionHa;
    urbanProject.style.display='none'; expansionProject.style.display='none';
    uProject.value=uRef.value; eProject.value=eRef.value;

    const sync=(ref,hidden,key,lastKey)=>ref.addEventListener('input',()=>{hidden.value=ref.value;draft[key]=ref.value;draft[lastKey]=null});
    sync(uRef,uProject,'projectUrbanHa','_lastAutoUrban');
    sync(eRef,eProject,'projectExpansionHa','_lastAutoExpansion');

    const rule=[...document.querySelectorAll('#wizardBody .callout')].find(x=>x.textContent.includes('Regla de trazabilidad'));
    if(rule)rule.innerHTML='<strong>Referencia editable con trazabilidad.</strong><div class="muted">El valor del PDOT/PUGS se carga como punto de partida. Puedes borrarlo o reemplazarlo por el área específica del cliente/TDR. La referencia documental original y su fuente se conservan en el expediente.</div>';
  }

  wizard=function(){baseWizard();enhanceTerritory()};
  if(s.wizard===1)enhanceTerritory();
  window.SmartRiskAreaReferenceEditable={enhance:enhanceTerritory};
})();
