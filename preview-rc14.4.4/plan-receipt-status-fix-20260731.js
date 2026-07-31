(()=>{
  "use strict";

  const VERSION="2026-07-31T12:15:00-05:00";
  const STORE="smartrisk-cz5-data-v1";
  const ADMIN_EMAILS=new Set([
    "geopro.ec2@gmail.com",
    "dcoellom2@unemi.edu.ec",
    "diogenes.coello@gestionderiesgos.gob.ec"
  ]);
  const normalize=value=>String(value||"")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g,"")
    .trim()
    .toLowerCase();

  const CORRECTIONS=[
    {
      id:"TER-REG-ESPECIAL-GALAPAGOS",
      province:"Galápagos",
      territory:"Consejo de Gobierno del Régimen Especial de Galápagos",
      aliases:["gobierno provincial de galapagos","cgreg"],
      level:"Régimen especial",
      entityType:"Régimen especial",
      plan:"15.1. plan_de_accion_galapagos-signed-signed-signed.pdf",
      score:84,
      status:"En revisión · plan defendible · corrección progresiva",
      resultLabel:"Recibido · revisado 84 %",
      resultClass:"warn",
      deliveryDate:"2026-06-24",
      planUrl:"https://drive.google.com/file/d/1M79_NXC7Q3oZsXTS8ZJnd5XTUaRfjtIp/view",
      reportUrl:"https://drive.google.com/file/d/1VtlXrd5qoL2jW-2UUw-6GD8dduyQedzn/view",
      signatureStatus:"Documento firmado; aprobación institucional definitiva no declarada",
      note:"Plan provincial recibido, firmado y revisado al 84 %. Mantiene corrección progresiva de población expuesta, inventario operativo, presupuesto, cartografía, alojamientos, rutas y anexos.",
      criteria:[[10,10],[15,13],[15,11],[10,9],[20,18],[10,6],[8,6],[5,5],[4,4],[3,2]]
    },
    {
      id:"TER-GALAPAGOS-SAN-CRISTOBAL",
      province:"Galápagos",
      territory:"San Cristóbal",
      aliases:["san cristobal"],
      level:"Cantonal",
      entityType:"GAD municipal",
      plan:"Plan ENOS San Cristóbal · recibido 24-06-2026 · versión devuelta",
      score:null,
      status:"Devuelto · pendiente de corrección",
      resultLabel:"Recibido · devuelto",
      resultClass:"danger",
      deliveryDate:"2026-06-24",
      planUrl:"",
      reportUrl:"",
      signatureStatus:"Firmas completas pendientes de verificar",
      note:"Plan cantonal recibido y devuelto para corrección. La falta de versión corregida enlazada o de firmas completas no equivale a ausencia del plan.",
      criteria:[]
    },
    {
      id:"TER-PROV-LOS-RIOS",
      province:"Los Ríos",
      territory:"Los Ríos",
      aliases:["prefectura los rios","gobierno provincial de los rios"],
      level:"Provincial",
      entityType:"GAD provincial",
      plan:"PLAN DE ACCIÓN TERRITORIAL ANTE EL EVENTO EL NIÑO 2026-signed.pdf",
      score:68,
      status:"En revisión · plan funcional parcial · corrección progresiva",
      resultLabel:"Recibido · revisado 68 %",
      resultClass:"warn",
      deliveryDate:"2026-06-25",
      planUrl:"https://drive.google.com/file/d/1OORaykZcWJHJe3zPWB9dXn_pCc84RKDT/view",
      reportUrl:"https://drive.google.com/file/d/11cWFIu56jVBp-VWVB_gyeBumfrF4u1_I/view",
      signatureStatus:"Plan firmado recibido; formalización institucional completa pendiente",
      note:"Plan provincial recibido, firmado y revisado al 68 %. Mantiene corrección progresiva de población expuesta, puntos críticos, presupuesto, cronograma, indicadores, alojamientos, rutas y anexos F01–F07.",
      criteria:[[10,9],[15,9],[15,5],[10,8],[20,14],[10,6],[8,2],[5,4],[4,3],[3,2]]
    }
  ];

  const CRITERIA_NAMES=[
    "Datos generales, objetivos y contexto",
    "Caracterización territorial, amenazas y zonas expuestas",
    "Población y elementos expuestos",
    "Organización COE, MTT, GT y activación",
    "Fases del plan",
    "Recursos, capacidades, brechas y presupuesto",
    "Alojamientos, rutas, puntos seguros y asistencia humanitaria",
    "Monitoreo, seguimiento, indicadores y medios de verificación",
    "Comunicación del riesgo",
    "Firmas, anexos, cartografía y evidencias"
  ];

  function matches(record,correction){
    const province=normalize(record?.province||record?.provincia);
    const territory=normalize(record?.territory||record?.shortName||record?.canton||record?.name);
    return record?.entityId===correction.id||(
      province===normalize(correction.province)&&(
        territory===normalize(correction.territory)||
        correction.aliases.some(alias=>territory.includes(normalize(alias)))
      )
    );
  }

  function entityPatch(correction){
    return {
      entityId:correction.id,
      name:correction.territory,
      shortName:correction.territory,
      province:correction.province,
      level:correction.level,
      entityType:correction.entityType,
      scopeKey:`TER:${correction.id}`,
      baselineStatus:correction.status,
      planReceived:true,
      planDocumentAvailable:Boolean(correction.planUrl),
      formalPlanDelivery:false,
      planReviewStatus:correction.status,
      planFinalUrl:correction.planUrl,
      planDeliveryDate:correction.deliveryDate,
      planReviewScore:correction.score,
      planCorrectionStatus:correction.status,
      planSignatureStatus:correction.signatureStatus,
      planReviewReportUrl:correction.reportUrl,
      planParticularities:correction.note,
      requiresAttention:true
    };
  }

  function reviewPatch(correction){
    return {
      entityId:correction.id,
      province:correction.province,
      territory:correction.territory,
      level:correction.level,
      plan:correction.plan,
      planReceived:true,
      documentAvailable:Boolean(correction.planUrl),
      formalDelivery:false,
      score:correction.score,
      status:correction.status,
      criteria:correction.criteria.map((pair,index)=>({
        name:CRITERIA_NAMES[index],
        maxScore:pair[0],
        score:pair[1],
        status:pair[0]===pair[1]?"Cumple":"Parcial",
        evidence:[]
      })),
      totalChecklist:correction.criteria.length,
      planReviewStatus:correction.status,
      planFinalUrl:correction.planUrl,
      planDeliveryDate:correction.deliveryDate,
      reviewScore:correction.score,
      correctionStatus:correction.status,
      signatureStatus:correction.signatureStatus,
      reviewReportUrl:correction.reportUrl,
      particularities:correction.note,
      resultLabel:correction.resultLabel,
      resultClass:correction.resultClass
    };
  }

  function applyToData(target){
    const next=target&&typeof target==="object"?target:{};
    const entities=Array.isArray(next.entidadesSeguimiento)?next.entidadesSeguimiento:[];
    CORRECTIONS.forEach(correction=>{
      const index=entities.findIndex(record=>matches(record,correction));
      if(index<0)entities.push(entityPatch(correction));
      else entities[index]={...entities[index],...entityPatch(correction)};
    });
    next.entidadesSeguimiento=entities;
    const snapshot=next._latestDataSnapshot||{};
    next._latestDataSnapshot={
      ...snapshot,
      corrections:{...(snapshot.corrections||{}),planReceiptReconciliation:VERSION},
      planReceiptPolicy:"Recepción, archivo, firma, revisión y validación son estados independientes."
    };
    return next;
  }

  function applyToViews(){
    const updates=Array.isArray(window.SMART_RISK_PLAN_UPDATE)?window.SMART_RISK_PLAN_UPDATE:[];
    CORRECTIONS.forEach(correction=>{
      const patch={...entityPatch(correction),...reviewPatch(correction)};
      const index=updates.findIndex(record=>matches(record,correction));
      if(index<0)updates.push(patch);
      else updates[index]={...updates[index],...patch};
    });
    window.SMART_RISK_PLAN_UPDATE=updates;

    if(!window.ENOS_REVIEWS)return;
    Object.assign(window.ENOS_REVIEWS.stats||{}, {
      canonicalTerritories:56,
      folders:56,
      plansReceived:56,
      plansEvaluated:56,
      reviewCompletion:100,
      dataCut:"2026-07-31"
    });

    const reviews=Array.isArray(window.ENOS_REVIEWS.reviews)?window.ENOS_REVIEWS.reviews:[];
    CORRECTIONS.forEach(correction=>{
      let index=reviews.findIndex(record=>matches(record,correction));
      const patch=reviewPatch(correction);
      if(index<0){reviews.push(patch);index=reviews.length-1}
      else reviews[index]={...reviews[index],...patch};
      for(let duplicate=reviews.length-1;duplicate>=0;duplicate--){
        if(duplicate!==index&&matches(reviews[duplicate],correction)){
          reviews.splice(duplicate,1);
          if(duplicate<index)index--;
        }
      }
    });
    window.ENOS_REVIEWS.reviews=reviews;
  }

  let observer=null;
  let observedRoot=null;
  let labelFrame=0;

  function correctionForButton(button){
    const row=button.closest("tr");
    const province=button.dataset.province||row?.querySelector("small")?.textContent?.split("·")[0]||"";
    const territory=button.dataset.territory||row?.querySelector("td b")?.textContent||"";
    return CORRECTIONS.find(correction=>
      normalize(province)===normalize(correction.province)&&(
        normalize(territory)===normalize(correction.territory)||
        correction.aliases.some(alias=>normalize(territory).includes(normalize(alias)))
      )
    );
  }

  function applyLabels(){
    labelFrame=0;
    if(observer)observer.disconnect();
    try{
      document.querySelectorAll("#reviewTable .review-details").forEach(button=>{
        const correction=correctionForButton(button);
        if(!correction)return;
        const row=button.closest("tr");
        if(!row)return;
        const note=row.cells?.[0]?.querySelector("small");
        const desiredNote=`${correction.province} · ${correction.plan}`;
        if(note&&note.textContent!==desiredNote)note.textContent=desiredNote;

        const resultCell=row.cells?.[1];
        if(correction.score==null&&resultCell){
          const marker=`${correction.id}:${correction.resultLabel}`;
          if(resultCell.dataset.receiptCorrection!==marker){
            resultCell.innerHTML=`<span class="badge ${correction.resultClass}">${correction.resultLabel}</span>`;
            resultCell.dataset.receiptCorrection=marker;
          }
        }
        if(button.textContent!=="Ver estado"&&correction.score==null)button.textContent="Ver estado";
      });
    }finally{
      if(observer&&observedRoot?.isConnected){
        observer.observe(observedRoot,{childList:true,subtree:true});
      }
    }
  }

  function scheduleLabels(){
    if(labelFrame)return;
    labelFrame=requestAnimationFrame(applyLabels);
  }

  function observeContent(){
    const root=document.querySelector("#content");
    if(!root||root===observedRoot)return;
    if(observer)observer.disconnect();
    observedRoot=root;
    observer=new MutationObserver(scheduleLabels);
    observer.observe(root,{childList:true,subtree:true});
    scheduleLabels();
  }

  const complete=target=>Array.isArray(target?.entidadesSeguimiento)&&target.entidadesSeguimiento.length===56&&Array.isArray(target?.seguimientos)&&target.seguimientos.length>=106;
  const enough=target=>target?._latestDataSnapshot?.corrections?.planReceiptReconciliation===VERSION&&complete(target)&&CORRECTIONS.every(correction=>target.entidadesSeguimiento.some(entity=>matches(entity,correction)&&entity.planReceived));

  function paintLocal(){
    data=applyToData(data);
    applyToViews();
    if(typeof normalizeDataShape==="function")normalizeDataShape();
    localStorage.setItem(STORE,JSON.stringify(data));
    if(typeof render==="function")render();
    observeContent();
    scheduleLabels();
  }

  async function syncCloud(){
    let admin=false;
    try{
      admin=ADMIN_EMAILS.has(normalize(session?.email))||
        (typeof isAdmin==="function"&&isAdmin())||
        normalize(currentProfile?.rol)==="administrador";
    }catch{}
    if(!admin||typeof db==="undefined"||typeof CLOUD_DOC==="undefined")return;

    try{
      let saved=null;
      await db.runTransaction(async transaction=>{
        const ref=db.doc(CLOUD_DOC);
        const snapshot=await transaction.get(ref);
        const remote=snapshot.exists?snapshot.data():{};
        if(enough(remote)){saved=remote;return}
        if(!complete(data))throw new Error("Base incompleta");
        const merged=applyToData(complete(remote)?structuredClone(remote):structuredClone(data));
        merged._revision=Number(remote._revision||0)+1;
        if(new Blob([JSON.stringify(merged)]).size>880000)throw new Error("Límite Firestore");
        transaction.set(ref,merged);
        saved=merged;
      });
      if(saved){
        data=saved;
        applyToViews();
        cloudRevision=Number(saved._revision||0);
        localStorage.setItem(STORE,JSON.stringify(data));
        if(typeof render==="function")render();
        observeContent();
        scheduleLabels();
      }
    }catch(error){
      console.warn("Reconciliación documental",error);
    }
  }

  let attempts=0;
  const timer=setInterval(async()=>{
    attempts++;
    let ready=false;
    try{ready=Boolean(session)&&complete(data)}catch{}
    if(!ready&&attempts<120)return;
    clearInterval(timer);
    if(!ready)return;

    if(enough(data)){
      applyToViews();
      observeContent();
      scheduleLabels();
    }else{
      paintLocal();
    }
    await syncCloud();
  },250);

  window.SMART_RISK_PLAN_RECEIPT_STATUS_FIX=Object.freeze({
    version:VERSION,
    receivedPlans:3,
    policy:"received-independent-from-signature-link-review-validation",
    observerStrategy:"idempotent-disconnect-write-reconnect"
  });
})();