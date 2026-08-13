(() => {
  const ECUADOR_PROVINCES = ['Azuay','Bolívar','Cañar','Carchi','Chimborazo','Cotopaxi','El Oro','Esmeraldas','Galápagos','Guayas','Imbabura','Loja','Los Ríos','Manabí','Morona Santiago','Napo','Orellana','Pastaza','Pichincha','Santa Elena','Santo Domingo de los Tsáchilas','Sucumbíos','Tungurahua','Zamora Chinchipe'];
  const TERRITORIES = [['Azuay','Cuenca'],['Bolívar','Guaranda'],['Cañar','Azogues'],['Carchi','Tulcán'],['Chimborazo','Riobamba'],['Cotopaxi','Latacunga'],['El Oro','Machala'],['Esmeraldas','Esmeraldas'],['Galápagos','San Cristóbal'],['Guayas','Guayaquil'],['Imbabura','Ibarra'],['Loja','Loja'],['Los Ríos','Babahoyo'],['Manabí','Portoviejo'],['Morona Santiago','Morona'],['Napo','Tena'],['Orellana','Francisco de Orellana'],['Pastaza','Pastaza'],['Pichincha','Quito'],['Santa Elena','Salinas'],['Santo Domingo de los Tsáchilas','Santo Domingo'],['Sucumbíos','Lago Agrio'],['Tungurahua','Ambato'],['Zamora Chinchipe','Zamora']];
  const STAGES = [['G0','Prospección'],['G1','Oportunidad'],['G2','Prefactibilidad'],['G3','Diseño técnico-económico'],['G4','Oferta'],['G5','Contratación'],['G6','Ejecución'],['G7','Procesamiento'],['G8','Entrega'],['G9','Recepción y cobro'],['G10','Cierre / postventa']];

  function optionList(values, selected=''){
    return values.map(v=>`<option${v===selected?' selected':''}>${v}</option>`).join('');
  }

  function refreshProvinceFilter(){
    const select=$('province');
    if(!select)return;
    const current=ECUADOR_PROVINCES.includes(s.province)?s.province:'Todas';
    select.innerHTML=`<option>Todas</option>${optionList(ECUADOR_PROVINCES,current)}`;
    select.value=current;
    s.province=current;
  }

  function refreshStageFilter(){
    const select=$('stage');
    if(!select)return;
    const stages=STAGES.map(x=>x[1]);
    const current=stages.includes(s.stage)?s.stage:'Todas';
    select.innerHTML=`<option>Todas</option>${optionList(stages,current)}`;
    select.value=current;
    s.stage=current;
  }

  function toast(message){
    let el=document.getElementById('qaToast');
    if(!el){
      el=document.createElement('div');
      el.id='qaToast';
      el.style.cssText='position:fixed;right:18px;bottom:18px;z-index:80;max-width:390px;background:#102f3e;color:#fff;padding:12px 14px;border-radius:12px;box-shadow:0 12px 34px rgba(0,0,0,.22);font-size:12px;transition:.2s';
      document.body.appendChild(el);
    }
    el.textContent=message;
    el.style.opacity='1';
    clearTimeout(toast.timer);
    toast.timer=setTimeout(()=>{el.style.opacity='0'},2600);
  }

  visible=function(){
    let x=[...data];
    if(s.province!=='Todas')x=x.filter(p=>p.province===s.province);
    if(s.stage!=='Todas')x=x.filter(p=>p.stage===s.stage);
    if(s.q){
      const q=s.q.toLowerCase();
      x=x.filter(p=>(p.code+' '+p.canton+' '+p.province+' '+p.service).toLowerCase().includes(q));
    }
    if(s.filter==='attention')x=x.filter(p=>p.alerts.length);
    if(s.filter==='execution')x=x.filter(p=>['Ejecución','Procesamiento'].includes(p.stage));
    if(s.filter==='economics')x=x.filter(p=>p.price>0);
    return x;
  };

  wizard=function(){
    const labels=['Cliente','Territorio','Servicio','Presupuesto'];
    $('steps').innerHTML=labels.map((x,i)=>`<div class="step ${i===s.wizard?'active':''}">${i+1}. ${x}</div>`).join('');
    const provinceOptions=optionList(ECUADOR_PROVINCES);
    const body=[
      `<div class="formgrid"><label class="field"><span>Entidad / GAD</span><input id="newGad" placeholder="GAD Municipal de..."></label><label class="field"><span>Contacto principal</span><input id="newContact" placeholder="Nombre y cargo"></label><label class="field"><span>Correo</span><input id="newEmail" type="email"></label><label class="field"><span>Teléfono</span><input id="newPhone"></label></div>`,
      `<div class="formgrid"><label class="field"><span>Provincia</span><select id="newProvince"><option value="">Seleccione provincia</option>${provinceOptions}</select></label><label class="field"><span>Cantón</span><input id="newCanton" placeholder="Cantón"></label><label class="field"><span>Área urbana oficial (ha)</span><input id="newUrbanArea" type="number" min="0"></label><label class="field"><span>Expansión / área objetivo (ha)</span><input id="newExpansion" type="number" min="0"></label></div><div class="callout" style="margin-top:10px"><strong>Cobertura nacional habilitada.</strong><div class="muted">Las 24 provincias están disponibles. El catálogo dependiente de cantones se alimenta con la referencia territorial del módulo nacional.</div></div>`,
      `<div class="formgrid"><label class="field"><span>Servicio</span><select><option>Microzonificación sísmica integral</option><option>Estudio técnico base</option><option>Campaña geotécnica-geofísica</option></select></label><label class="field"><span>Complejidad</span><select><option>Baja</option><option>Media</option><option>Alta</option></select></label><label class="field"><span>Plazo (meses)</span><input value="4" type="number" min="1"></label><label class="field"><span>Técnicos</span><input value="4" type="number" min="1"></label></div>`,
      `<div class="callout"><strong>Motor paramétrico inicial</strong><div class="muted">Perforación USD 90/m · roca USD 200/m · Vs USD 700 · HVSR USD 300 · profesional USD 1.700/mes.</div></div><div class="metrics"><div class="metric"><small>Perforaciones</small><strong>20</strong></div><div class="metric"><small>Vs</small><strong>45</strong></div><div class="metric"><small>HVSR</small><strong>40</strong></div><div class="metric"><small>Plazo</small><strong>4 meses</strong></div></div>`
    ];
    $('wizardBody').innerHTML=body[s.wizard];
    $('backBtn').disabled=s.wizard===0;
    $('nextBtn').textContent=s.wizard===3?'Crear borrador':'Continuar';
  };

  document.addEventListener('click',event=>{
    const b=event.target.closest('button');
    if(!b)return;
    if(b.id==='newBtn'||b.id==='nextBtn'||b.id==='backBtn'||b.matches('[data-close],[data-p],[data-sec],[data-filter]'))return;
    if(b.classList.contains('tab')){
      b.parentElement?.querySelectorAll('.tab').forEach(x=>x.classList.toggle('active',x===b));
      toast(`Vista “${b.textContent.trim()}” seleccionada. Integración de detalle en modo evaluación.`);
      return;
    }
    if(b.classList.contains('btn'))toast(`Acción “${b.textContent.trim()}” reconocida para ${project()?.code||'el proyecto actual'}.`);
  });

  refreshProvinceFilter();
  refreshStageFilter();
  renderAll();

  // Catálogo auxiliar para formularios y pruebas automáticas. No genera casos visibles.
  window.SmartRiskConsultoriaQA={provinces:ECUADOR_PROVINCES,territories:TERRITORIES,stages:STAGES};
})();
