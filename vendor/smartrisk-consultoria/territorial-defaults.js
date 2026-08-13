(() => {
  const CANTONS_BY_PROVINCE = {
    'Loja': ['Calvas','Catamayo','Celica','Chaguarpamba','Espíndola','Gonzanamá','Loja','Macará','Olmedo','Paltas','Pindal','Puyango','Quilanga','Saraguro','Sozoranga','Zapotillo']
  };

  // Catálogo territorial verificable. Nunca sustituir una superficie oficial por una
  // estimación paramétrica sin identificarla expresamente como ajuste del proyecto.
  const OFFICIAL_TERRITORY_DATA = {
    'Loja|Loja': {
      urbanOfficialHa: 6060.18,
      expansionOfficialHa: null,
      expansionHistoricalHa: 1278.10,
      instrument: 'PDOT 2023-2027 / PUGS 2023-2033 - Ordenanza 0070-2025',
      sourceDate: '2025-04-24',
      sourceLabel: 'Municipio de Loja - delimitación urbana vigente, Art. 60',
      sourceUrl: 'https://www.loja.gob.ec/documentos/reforma-la-ordenanza-de-actualizacion-de-los-planes-de-desarrollo-y-ordenamiento',
      note: 'La ciudad de Loja tiene 6.060,18 ha de área urbana vigente. La referencia de 1.278,10 ha de suelo rural de expansión corresponde a la planificación 2019-2023 y no se adopta automáticamente como superficie vigente del PUGS 2023-2033 hasta verificar su cartografía/anexo.'
    }
  };

  const draft = window.SmartRiskConsultoriaDraft || (window.SmartRiskConsultoriaDraft = {
    gad:'', contact:'', email:'', phone:'', province:'', canton:'',
    officialUrbanHa:'', officialExpansionHa:'', projectUrbanHa:'', projectExpansionHa:'',
    service:'Microzonificación sísmica integral', complexity:'Media', months:4, technicians:4
  });

  function esc(v){return String(v??'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]))}
  function fmt(v){return v===null||v===''?'Pendiente de validación':new Intl.NumberFormat('es-EC',{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(v))+' ha'}
  function territoryKey(){return `${draft.province}|${draft.canton}`}
  function currentOfficial(){return OFFICIAL_TERRITORY_DATA[territoryKey()] || null}
  function provinceOptions(){return (window.SmartRiskConsultoriaQA?.provinces||[]).map(v=>`<option value="${esc(v)}" ${draft.province===v?'selected':''}>${esc(v)}</option>`).join('')}
  function cantonOptions(){
    const list=CANTONS_BY_PROVINCE[draft.province] || [];
    const fallback=window.SmartRiskConsultoriaQA?.territories?.filter(x=>x[0]===draft.province).map(x=>x[1])||[];
    const values=[...new Set([...list,...fallback])];
    if(!values.length)return '<option value="">Seleccione primero una provincia</option>';
    return '<option value="">Seleccione cantón</option>'+values.map(v=>`<option value="${esc(v)}" ${draft.canton===v?'selected':''}>${esc(v)}</option>`).join('');
  }
  function applyOfficial(){
    const item=currentOfficial();
    if(item){
      draft.officialUrbanHa=item.urbanOfficialHa ?? '';
      draft.officialExpansionHa=item.expansionOfficialHa ?? '';
      if(draft.projectUrbanHa==='' || draft._lastAutoUrban===draft.projectUrbanHa){draft.projectUrbanHa=item.urbanOfficialHa ?? '';draft._lastAutoUrban=draft.projectUrbanHa}
      if(draft.projectExpansionHa==='' || draft._lastAutoExpansion===draft.projectExpansionHa){draft.projectExpansionHa=item.expansionOfficialHa ?? '';draft._lastAutoExpansion=draft.projectExpansionHa}
    } else {
      draft.officialUrbanHa=''; draft.officialExpansionHa='';
      if(draft._lastAutoUrban===draft.projectUrbanHa)draft.projectUrbanHa='';
      if(draft._lastAutoExpansion===draft.projectExpansionHa)draft.projectExpansionHa='';
      draft._lastAutoUrban='';draft._lastAutoExpansion='';
    }
  }
  function capture(){
    const ids={newGad:'gad',newContact:'contact',newEmail:'email',newPhone:'phone',newProvince:'province',newCanton:'canton',projectUrbanHa:'projectUrbanHa',projectExpansionHa:'projectExpansionHa',newService:'service',newComplexity:'complexity',newMonths:'months',newTechnicians:'technicians'};
    Object.entries(ids).forEach(([id,key])=>{const el=document.getElementById(id);if(el)draft[key]=el.value});
  }
  function sourceCard(){
    const item=currentOfficial();
    if(!item)return `<div class="callout warn" style="margin-top:10px"><strong>Superficie oficial pendiente de carga.</strong><div class="muted">El proyecto puede continuar con una superficie técnica ingresada manualmente, pero debe quedar marcada como “ajuste del proyecto” hasta incorporar el PDOT/PUGS oficial del cantón.</div></div>`;
    const hist=item.expansionHistoricalHa?`<div class="muted" style="margin-top:5px">Referencia histórica de expansión: ${fmt(item.expansionHistoricalHa)}. No se usa automáticamente.</div>`:'';
    return `<div class="callout ok" style="margin-top:10px"><strong>Base oficial encontrada · ${esc(item.instrument)}</strong><div class="muted">${esc(item.sourceLabel)} · ${esc(item.sourceDate)}</div><div style="margin-top:7px"><b>Área urbana oficial:</b> ${fmt(item.urbanOfficialHa)} &nbsp; · &nbsp; <b>Expansión oficial vigente:</b> ${fmt(item.expansionOfficialHa)}</div>${hist}<div class="muted" style="margin-top:6px">${esc(item.note)}</div></div>`;
  }

  const previousWizard = window.wizard || wizard;
  wizard = function(){
    capture();
    const labels=['Cliente','Territorio','Servicio','Presupuesto'];
    $('steps').innerHTML=labels.map((x,i)=>`<div class="step ${i===s.wizard?'active':''}">${i+1}. ${x}</div>`).join('');
    let html='';
    if(s.wizard===0){
      html=`<div class="formgrid"><label class="field"><span>Entidad / GAD</span><input id="newGad" value="${esc(draft.gad)}" placeholder="GAD Municipal de..."></label><label class="field"><span>Contacto principal</span><input id="newContact" value="${esc(draft.contact)}" placeholder="Nombre y cargo"></label><label class="field"><span>Correo</span><input id="newEmail" value="${esc(draft.email)}" type="email"></label><label class="field"><span>Teléfono</span><input id="newPhone" value="${esc(draft.phone)}"></label></div>`;
    } else if(s.wizard===1){
      applyOfficial();
      html=`<div class="formgrid"><label class="field"><span>Provincia</span><select id="newProvince"><option value="">Seleccione provincia</option>${provinceOptions()}</select></label><label class="field"><span>Cantón</span><select id="newCanton">${cantonOptions()}</select></label><label class="field"><span>Área urbana oficial PDOT/PUGS</span><input value="${esc(draft.officialUrbanHa)}" readonly placeholder="Pendiente de validación"></label><label class="field"><span>Expansión oficial PDOT/PUGS</span><input value="${esc(draft.officialExpansionHa)}" readonly placeholder="Pendiente de validación"></label><label class="field"><span>Área urbana utilizada en este proyecto (ha)</span><input id="projectUrbanHa" value="${esc(draft.projectUrbanHa)}" type="number" min="0" step="0.01"></label><label class="field"><span>Expansión / área adicional utilizada (ha)</span><input id="projectExpansionHa" value="${esc(draft.projectExpansionHa)}" type="number" min="0" step="0.01"></label></div>${sourceCard()}<div class="callout" style="margin-top:10px"><strong>Regla de trazabilidad.</strong><div class="muted">El valor oficial nunca se modifica. Si la consultoría define una superficie distinta, se cambia únicamente “Área utilizada en este proyecto” y queda como ajuste técnico del expediente.</div></div>`;
    } else if(s.wizard===2){
      html=`<div class="formgrid"><label class="field"><span>Servicio</span><select id="newService">${['Microzonificación sísmica integral','Estudio técnico base','Campaña geotécnica-geofísica'].map(v=>`<option ${draft.service===v?'selected':''}>${v}</option>`).join('')}</select></label><label class="field"><span>Complejidad</span><select id="newComplexity">${['Baja','Media','Alta'].map(v=>`<option ${draft.complexity===v?'selected':''}>${v}</option>`).join('')}</select></label><label class="field"><span>Plazo (meses)</span><input id="newMonths" value="${esc(draft.months)}" type="number" min="1"></label><label class="field"><span>Técnicos</span><input id="newTechnicians" value="${esc(draft.technicians)}" type="number" min="1"></label></div>`;
    } else {
      const totalArea=(Number(draft.projectUrbanHa)||0)+(Number(draft.projectExpansionHa)||0);
      html=`<div class="callout"><strong>Base territorial del presupuesto</strong><div class="muted">${esc(draft.province||'Provincia pendiente')} · ${esc(draft.canton||'Cantón pendiente')} · Área urbana proyecto: ${fmt(draft.projectUrbanHa)} · Expansión/área adicional: ${fmt(draft.projectExpansionHa)} · Total objetivo: ${fmt(totalArea)}</div></div><div class="metrics"><div class="metric"><small>Área urbana oficial</small><strong>${fmt(draft.officialUrbanHa)}</strong></div><div class="metric"><small>Área objetivo proyecto</small><strong>${fmt(totalArea)}</strong></div><div class="metric"><small>Plazo</small><strong>${esc(draft.months)} meses</strong></div><div class="metric"><small>Fuente</small><strong>${currentOfficial()?'PDOT/PUGS':'Ajuste técnico'}</strong></div></div><div class="callout" style="margin-top:10px"><strong>Motor paramétrico inicial</strong><div class="muted">La superficie seleccionada alimentará la campaña y el presupuesto; la superficie oficial queda conservada para trazabilidad.</div></div>`;
    }
    $('wizardBody').innerHTML=html;$('backBtn').disabled=s.wizard===0;$('nextBtn').textContent=s.wizard===3?'Crear borrador':'Continuar';
  };

  document.addEventListener('change',e=>{
    if(e.target.id==='newProvince'){
      capture(); draft.canton=''; draft.projectUrbanHa=''; draft.projectExpansionHa=''; draft._lastAutoUrban=''; draft._lastAutoExpansion=''; wizard();
    } else if(e.target.id==='newCanton'){
      capture(); draft.projectUrbanHa=''; draft.projectExpansionHa=''; draft._lastAutoUrban=''; draft._lastAutoExpansion=''; applyOfficial(); wizard();
    }
  });
  document.addEventListener('input',e=>{
    if(e.target.id==='projectUrbanHa'){draft.projectUrbanHa=e.target.value;draft._lastAutoUrban=null}
    if(e.target.id==='projectExpansionHa'){draft.projectExpansionHa=e.target.value;draft._lastAutoExpansion=null}
  });

  // Exponer catálogo para QA y para futuras cargas masivas desde PDOT/PUGS.
  window.SmartRiskTerritorialDefaults={cantons:CANTONS_BY_PROVINCE,official:OFFICIAL_TERRITORY_DATA,draft,getCurrent:currentOfficial};
})();
