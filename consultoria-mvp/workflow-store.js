(() => {
  const GATES = [
    {id:'G0',name:'Prospección',requirements:[
      ['cliente','Cliente/entidad identificada','comercial'],['contacto','Contacto responsable registrado','comercial'],['necesidad','Necesidad documentada','comercial'],['seguimiento','Próxima acción programada','comercial']
    ]},
    {id:'G1',name:'Oportunidad',requirements:[
      ['validacion','Necesidad validada con el cliente','comercial'],['probabilidad','Probabilidad de contratación asignada','comercial'],['referencial','Presupuesto referencial generado','finanzas'],['viabilidad','Viabilidad preliminar aprobada','gerencia']
    ]},
    {id:'G2',name:'Prefactibilidad',requirements:[
      ['area','Área urbana/objetivo validada','sig'],['pdot','PDOT/PUGS o fuente territorial anexada','sig'],['complejidad','Complejidad geológica/geotécnica clasificada','tecnico'],['campana','Campaña preliminar dimensionada','tecnico']
    ]},
    {id:'G3',name:'Diseño técnico-económico',requirements:[
      ['alcance','Alcance técnico aprobado','tecnico'],['campana','Campaña definitiva aprobada','tecnico'],['presupuesto','Presupuesto vigente aprobado','finanzas'],['cronograma','Cronograma preliminar aprobado','contractual'],['equipo','Equipo profesional confirmado','gerencia']
    ]},
    {id:'G4',name:'Oferta',requirements:[
      ['tdr','TDR/pliegos revisados','contractual'],['metodologia','Metodología y plan de trabajo','tecnico'],['oferta','Oferta económica cerrada','finanzas'],['experiencia','Experiencia acreditable validada','contractual'],['personal','Personal clave acreditado','contractual'],['qaqc','QA/QC de oferta completado','qaqc']
    ]},
    {id:'G5',name:'Contratación',requirements:[
      ['adjudicacion','Adjudicación/documento habilitante','contractual'],['contrato','Contrato suscrito','contractual'],['garantias','Garantías registradas y vigentes','contractual'],['admin_entidad','Administrador de contrato de la entidad registrado','contractual'],['gestor_interno','Gestor contractual interno asignado','gerencia'],['anticipo','Condiciones de anticipo/pago registradas','finanzas']
    ]},
    {id:'G6',name:'Inicio / campo',requirements:[
      ['plan','Plan de trabajo aprobado','tecnico'],['accesos','Accesos y permisos coordinados','contractual'],['sst','Plan SST/campo disponible','tecnico'],['equipos','Equipos y calibraciones verificadas','tecnico'],['bitacora','Bitácora operativa activada','tecnico'],['custodia','Cadena de custodia definida','geotecnia']
    ]},
    {id:'G7',name:'Procesamiento técnico',requirements:[
      ['lab','Resultados de laboratorio controlados','geotecnia'],['geofisica','Procesamiento geofísico controlado','geofisica'],['sig','Integración SIG actualizada','sig'],['modelacion','Modelación/respuesta de sitio completada','tecnico'],['trazabilidad','Trazabilidad de datos verificada','qaqc'],['qaqc','QA/QC técnico aprobado','qaqc']
    ]},
    {id:'G8',name:'Entrega',requirements:[
      ['borrador','Borrador integral consolidado','tecnico'],['qaqc','QA/QC de entregable aprobado','qaqc'],['cartografia','Cartografía y bases completas','sig'],['version','Versión contractual identificada','contractual'],['observaciones','Observaciones internas cerradas','qaqc']
    ]},
    {id:'G9',name:'Recepción y cobro',requirements:[
      ['conformidad','Conformidad/aceptación registrada','contractual'],['acta','Acta de entrega-recepción','contractual'],['factura','Factura emitida','finanzas'],['liquidacion','Liquidación económica registrada','finanzas'],['cobro','Cobro conciliado','finanzas']
    ]},
    {id:'G10',name:'Cierre / postventa',requirements:[
      ['expediente','Expediente digital cerrado','contractual'],['lecciones','Lecciones aprendidas registradas','gerencia'],['rentabilidad','Rentabilidad final calculada','finanzas'],['caso','Caso de éxito/documentación comercial','comercial'],['seguimiento','Seguimiento postventa programado','comercial']
    ]}
  ].map(g=>({...g,requirements:g.requirements.map(r=>({id:r[0],label:r[1],role:r[2]}))}));

  const DEMO_SCHEDULE = {
    salinas:[
      {id:'sc1',title:'Cierre oferta técnica',ownerRole:'tecnico',start:'2026-08-12',due:'2026-08-14',status:'En proceso',progress:80,critical:true},
      {id:'sc2',title:'Validación económica V03',ownerRole:'finanzas',start:'2026-08-13',due:'2026-08-14',status:'Pendiente',progress:30,critical:true},
      {id:'sc3',title:'Presentación de oferta',ownerRole:'contractual',start:'2026-08-14',due:'2026-08-17',status:'Pendiente',progress:0,critical:true}
    ],
    daule:[{id:'sc4',title:'Validar área PDOT/PUGS',ownerRole:'sig',start:'2026-08-12',due:'2026-08-16',status:'En proceso',progress:45,critical:true}],
    milagro:[
      {id:'sc5',title:'Perforaciones campaña 1',ownerRole:'geotecnia',start:'2026-08-08',due:'2026-08-18',status:'En proceso',progress:68,critical:true},
      {id:'sc6',title:'Vs/HVSR campaña 1',ownerRole:'geofisica',start:'2026-08-10',due:'2026-08-20',status:'En proceso',progress:55,critical:false},
      {id:'sc7',title:'Informe de avance',ownerRole:'tecnico',start:'2026-08-15',due:'2026-08-24',status:'Pendiente',progress:10,critical:true}
    ]
  };

  const DEMO_DOCUMENTS = {
    salinas:[
      {id:'d1',type:'TDR / Pliegos',version:'V01',status:'Vigente',ownerRole:'contractual',date:'2026-08-11',published:false},
      {id:'d2',type:'Oferta técnica',version:'V03',status:'En revisión',ownerRole:'tecnico',date:'2026-08-13',published:false},
      {id:'d3',type:'Presupuesto',version:'V03',status:'Pendiente aprobación',ownerRole:'finanzas',date:'2026-08-13',published:false}
    ],
    milagro:[
      {id:'d4',type:'Contrato',version:'Firmado',status:'Vigente',ownerRole:'contractual',date:'2026-08-01',published:true},
      {id:'d5',type:'Plan de trabajo',version:'V02',status:'Aprobado',ownerRole:'tecnico',date:'2026-08-05',published:true}
    ]
  };

  const demoGateState = {};
  function demoGate(projectId, gateId){
    const key=`${projectId}:${gateId}`;
    if(!demoGateState[key]){
      const template=GATES.find(g=>g.id===gateId)||GATES[0];
      demoGateState[key]={id:gateId,status:'Pendiente',requirements:template.requirements.map((r,i)=>({...r,done:i<Math.floor(template.requirements.length*.55),evidence:'',comment:'',updatedAt:null})),approvals:[]};
    }
    return demoGateState[key];
  }

  const firebaseReady=()=>window.SR_CONSULTORIA_STORE?.state?.mode==='firebase' && window.db;
  const session=()=>window.SR_CONSULTORIA_STORE?.state || {};
  const timestamp=()=>window.firebase?.firestore?.FieldValue?.serverTimestamp?.() || new Date().toISOString();
  const projectRef=id=>window.db.collection('consultoria_proyectos').doc(id);

  async function loadGate(projectId,gateId){
    if(!firebaseReady()) return structuredClone(demoGate(projectId,gateId));
    const snap=await projectRef(projectId).collection('gates').doc(gateId).get();
    if(snap.exists) return {id:gateId,...snap.data()};
    const template=GATES.find(g=>g.id===gateId)||GATES[0];
    return {id:gateId,status:'Pendiente',requirements:template.requirements.map(r=>({...r,done:false,evidence:'',comment:''})),approvals:[]};
  }

  async function saveGate(projectId,gate){
    if(!firebaseReady()){demoGateState[`${projectId}:${gate.id}`]=structuredClone(gate);return gate;}
    const payload={...gate,updatedAt:timestamp(),updatedBy:session().user?.email || ''};
    await projectRef(projectId).collection('gates').doc(gate.id).set(payload,{merge:true});
    await window.SR_CONSULTORIA_STORE.logAudit(projectId,'gate.save',{gateId:gate.id,status:gate.status});
    return payload;
  }

  async function approveGate(projectId,gateId,decision,comment=''){
    const gate=await loadGate(projectId,gateId);
    gate.approvals=Array.isArray(gate.approvals)?gate.approvals:[];
    gate.approvals.push({decision,comment,role:session().profile?.rol || 'demo',user:session().user?.email || 'demo',at:new Date().toISOString()});
    if(decision==='Aprobado' && gate.requirements.every(r=>r.done)) gate.status='Aprobado';
    if(decision==='Rechazado') gate.status='Rechazado';
    return saveGate(projectId,gate);
  }

  async function loadSchedule(projectId){
    if(!firebaseReady()) return structuredClone(DEMO_SCHEDULE[projectId]||[]);
    const snap=await projectRef(projectId).collection('cronograma').orderBy('due','asc').get();
    return snap.docs.map(d=>({id:d.id,...d.data()}));
  }

  async function saveScheduleItem(projectId,item){
    if(!firebaseReady()) return {...item,id:item.id||`demo-sc-${Date.now()}`};
    const ref=item.id?projectRef(projectId).collection('cronograma').doc(item.id):projectRef(projectId).collection('cronograma').doc();
    const payload={...item,updatedAt:timestamp(),updatedBy:session().user?.email || ''}; delete payload.id;
    await ref.set(payload,{merge:true});
    await window.SR_CONSULTORIA_STORE.logAudit(projectId,'schedule.save',{scheduleId:ref.id,title:item.title||''});
    return {id:ref.id,...payload};
  }

  async function loadDocuments(projectId){
    if(!firebaseReady()) return structuredClone(DEMO_DOCUMENTS[projectId]||[]);
    const snap=await projectRef(projectId).collection('documentos').orderBy('date','desc').get();
    return snap.docs.map(d=>({id:d.id,...d.data()}));
  }

  async function saveDocument(projectId,doc){
    if(!firebaseReady()) return {...doc,id:doc.id||`demo-doc-${Date.now()}`};
    const ref=doc.id?projectRef(projectId).collection('documentos').doc(doc.id):projectRef(projectId).collection('documentos').doc();
    const payload={...doc,updatedAt:timestamp(),updatedBy:session().user?.email || ''}; delete payload.id;
    await ref.set(payload,{merge:true});
    await window.SR_CONSULTORIA_STORE.logAudit(projectId,'document.save',{documentId:ref.id,type:doc.type||'',version:doc.version||''});
    return {id:ref.id,...payload};
  }

  function deriveAlerts({project,schedule=[],gate,documents=[],economics=null,operations=null}){
    const alerts=[]; const now=new Date('2026-08-13T06:54:00-05:00');
    schedule.forEach(item=>{
      if(!item.due || item.status==='Completada') return;
      const due=new Date(`${item.due}T23:59:59`); const days=Math.ceil((due-now)/86400000);
      if(days<0) alerts.push({severity:'critical',type:'plazo',message:`Actividad vencida: ${item.title}`,ownerRole:item.ownerRole,source:item.id});
      else if(days<=3) alerts.push({severity:'high',type:'plazo',message:`Vence en ${days} día(s): ${item.title}`,ownerRole:item.ownerRole,source:item.id});
    });
    if(gate && gate.requirements?.some(r=>!r.done)){
      const pending=gate.requirements.filter(r=>!r.done).length;
      alerts.push({severity:'medium',type:'gate',message:`${pending} requisito(s) pendientes en ${gate.id}`,ownerRole:'tecnico',source:gate.id});
    }
    documents.forEach(d=>{if(/pendiente|vencid/i.test(d.status||''))alerts.push({severity:'medium',type:'documento',message:`Documento ${d.type} ${d.version}: ${d.status}`,ownerRole:d.ownerRole,source:d.id});});
    if(economics?.cost>0){
      const committed=(economics.committed||0)/economics.cost;
      const actual=(economics.actual||0)/economics.cost;
      if(committed>=.9) alerts.push({severity:'critical',type:'costo',message:`Costo comprometido ${(committed*100).toFixed(0)}% del presupuesto`,ownerRole:'finanzas',source:'economia'});
      else if(committed>=.75) alerts.push({severity:'high',type:'costo',message:`Costo comprometido ${(committed*100).toFixed(0)}% del presupuesto`,ownerRole:'finanzas',source:'economia'});
      if(actual>1) alerts.push({severity:'critical',type:'costo',message:'Costo real supera presupuesto',ownerRole:'finanzas',source:'economia'});
    }
    if(operations?.nonConformities>0) alerts.push({severity:'high',type:'qaqc',message:`${operations.nonConformities} no conformidad(es) técnica(s) abierta(s)`,ownerRole:'qaqc',source:'operacion'});
    return alerts;
  }

  window.SR_WORKFLOW={GATES,loadGate,saveGate,approveGate,loadSchedule,saveScheduleItem,loadDocuments,saveDocument,deriveAlerts};
})();