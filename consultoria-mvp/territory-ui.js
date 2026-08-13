(() => {
  const catalog = window.SR_ECUADOR_TERRITORIES;
  if (!catalog) return;

  const knownAreas = {
    'Santa Elena|Salinas': {urban:7827.48, expansion:834.13, source:'PDOT/PUGS — dato territorial referencial verificado'},
    'Guayas|Naranjal': {urban:1017.32, expansion:180.85, source:'PDOT/PUGS — dato territorial referencial verificado'},
    'Los Ríos|Babahoyo': {urban:3190.08, expansion:null, source:'Área urbana referencial; expansión pendiente de validar'}
  };

  const option = (value, selected) => {
    const o=document.createElement('option'); o.value=value; o.textContent=value; o.selected=value===selected; return o;
  };

  function replaceInputWithSelect(input, values, selected) {
    if (!input || input.tagName === 'SELECT') return input;
    const select=document.createElement('select');
    [...input.attributes].forEach(a=>{ if(a.name!=='type' && a.name!=='value') select.setAttribute(a.name,a.value); });
    values.forEach(v=>select.appendChild(option(v,selected)));
    input.replaceWith(select);
    return select;
  }

  function fillCantons(provinceSelect, cantonSelect, preferred='') {
    const cantons=catalog.provinces[provinceSelect.value] || [];
    cantonSelect.innerHTML='';
    cantonSelect.appendChild(option('Seleccione cantón', preferred || 'Seleccione cantón'));
    cantons.forEach(c=>cantonSelect.appendChild(option(c,preferred)));
    if(preferred && cantons.includes(preferred)) cantonSelect.value=preferred;
  }

  function updateAreaStatus(provinceSelect,cantonSelect){
    const key=`${provinceSelect.value}|${cantonSelect.value}`;
    const data=knownAreas[key];
    const urban=document.getElementById('wUrban');
    const expansion=document.getElementById('wExpansion');
    let note=document.getElementById('territoryAreaStatus');
    if(!note){
      note=document.createElement('div'); note.id='territoryAreaStatus'; note.className='soft'; note.style.marginTop='12px';
      document.getElementById('wizardBody')?.appendChild(note);
    }
    if(data){
      if(urban)urban.value=data.urban ?? 0;
      if(expansion && data.expansion!==null)expansion.value=data.expansion;
      note.innerHTML=`<strong>Área territorial precargada</strong><div class="panel-subtitle">${data.source}. Verificar nuevamente antes de emitir una oferta formal.</div>`;
      note.classList.remove('warning'); note.classList.add('ok');
    }else{
      note.innerHTML='<strong>Área pendiente de validación</strong><div class="panel-subtitle">El cantón está disponible en el catálogo nacional, pero el área urbana y de expansión debe cargarse desde su PDOT/PUGS antes de formalizar el presupuesto.</div>';
      note.classList.remove('ok'); note.classList.add('warning');
    }
  }

  function enhanceTerritoryStep(){
    const body=document.getElementById('wizardBody');
    const provinceInput=document.getElementById('wProvince');
    const cantonInput=document.getElementById('wCanton');
    if(!body || !provinceInput || !cantonInput || body.dataset.territoryEnhanced==='1') return;

    const currentProvince=provinceInput.value && catalog.provinces[provinceInput.value] ? provinceInput.value : 'Guayas';
    const currentCanton=cantonInput.value || '';
    const provinces=Object.keys(catalog.provinces);
    const provinceSelect=replaceInputWithSelect(provinceInput,provinces,currentProvince);
    const cantonSelect=replaceInputWithSelect(cantonInput,['Seleccione cantón'],currentCanton);
    fillCantons(provinceSelect,cantonSelect,currentCanton);

    provinceSelect.addEventListener('change',()=>{fillCantons(provinceSelect,cantonSelect,'');updateAreaStatus(provinceSelect,cantonSelect);});
    cantonSelect.addEventListener('change',()=>updateAreaStatus(provinceSelect,cantonSelect));
    body.dataset.territoryEnhanced='1';

    const info=document.createElement('div');
    info.className='panel-subtitle'; info.style.marginTop='10px';
    info.textContent=`Catálogo nacional: 24 provincias · 222 cantones · ${catalog.source}.`;
    body.appendChild(info);
    updateAreaStatus(provinceSelect,cantonSelect);
  }

  const body=document.getElementById('wizardBody');
  if(!body)return;
  new MutationObserver(()=>{
    if(!document.getElementById('wProvince')) body.dataset.territoryEnhanced='0';
    enhanceTerritoryStep();
  }).observe(body,{childList:true,subtree:true});
})();
