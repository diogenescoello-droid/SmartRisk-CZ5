window.SR_CONSULTORIA_DATA = {
  roles: {
    gerencia:{label:'Gerencia / Superadministrador',economics:true,canCreate:true,permissions:['all_projects','economics','users','gates','audit'],tasks:['Aprobar presupuesto vigente','Resolver alerta contractual','Revisar margen actualizado']},
    comercial:{label:'Comercial / Promoción',economics:false,canCreate:true,permissions:['clients','contacts','opportunities','reference_quote'],tasks:['Registrar seguimiento con GAD','Actualizar probabilidad de contratación','Programar siguiente contacto']},
    tecnico:{label:'Coordinación técnica',economics:false,canCreate:false,permissions:['technical_scope','assignments','technical_results','technical_gates'],tasks:['Validar campaña de investigación','Revisar avance técnico','Asignar especialistas']},
    geotecnia:{label:'Geotecnia',economics:false,canCreate:false,permissions:['boreholes','samples','spt','lab_evidence'],tasks:['Completar perforación P-07','Validar cadena de custodia','Revisar laboratorio']},
    geofisica:{label:'Geofísica',economics:false,canCreate:false,permissions:['vs','hvsr','instrumentation','processing'],tasks:['Procesar VS-14','Repetir HVSR H-17','Cerrar QA instrumental']},
    sig:{label:'SIG / Modelación',economics:false,canCreate:false,permissions:['gis','maps','geodatabase','models'],tasks:['Actualizar geodatabase','Revisar metadatos','Preparar mapa de microzonas']},
    contractual:{label:'Gestión contractual',economics:false,canCreate:false,permissions:['contract','communications','guarantees','deadlines','deliverables'],tasks:['Controlar plazo contractual','Preparar expediente de planilla','Verificar garantía']},
    finanzas:{label:'Finanzas / Contabilidad',economics:true,canCreate:false,permissions:['budget','commitments','actual_costs','invoices','payments','margin'],tasks:['Registrar costo comprometido','Conciliar anticipo','Actualizar margen real']},
    qaqc:{label:'QA/QC',economics:false,canCreate:false,permissions:['technical_read','nonconformities','deliverable_approval','gate_block'],tasks:['Revisar informe V05','Cerrar observaciones','Aprobar cartografía']},
    cliente:{label:'Cliente / GAD',economics:false,canCreate:false,permissions:['published_deliverables','client_observations','client_acceptance'],tasks:['Revisar entregable liberado','Responder observaciones institucionales']},
    auditor:{label:'Auditor / Consulta',economics:false,canCreate:false,permissions:['authorized_read','audit_read','approved_versions'],tasks:[]}
  },
  projects:[
    {id:'salinas',code:'MZS-2026-SALINAS-001',province:'Santa Elena',canton:'Salinas',stage:'Oferta',service:'Microzonificación sísmica integral',price:285366,cost:214843,committed:78000,actual:31420,invoiced:0,collected:0,gate:'G4',gateProgress:80,gateRequirements:'8 de 10 requisitos',note:'Falta aprobación económica y validación QA/QC.',alerts:['Oferta pendiente de QA/QC','Garantía referencial por definir'],source:'demo'},
    {id:'daule',code:'MZS-2026-DAULE-002',province:'Guayas',canton:'Daule',stage:'Prefactibilidad',service:'Estudio técnico base',price:198500,cost:151300,committed:8500,actual:3200,invoiced:0,collected:0,gate:'G2',gateProgress:71,gateRequirements:'5 de 7 requisitos',note:'Falta validar área urbana y campaña definitiva.',alerts:['Área PDOT/PUGS pendiente de validar'],source:'demo'},
    {id:'milagro',code:'MZS-2026-MILAGRO-003',province:'Guayas',canton:'Milagro',stage:'Ejecución',service:'Microzonificación sísmica integral',price:322400,cost:249700,committed:171200,actual:126350,invoiced:128960,collected:64480,gate:'G6',gateProgress:100,gateRequirements:'9 de 9 requisitos',note:'Gate operativo aprobado. Continúa control semanal.',alerts:['HVSR H-17 requiere repetición','Costo de campo al 78% del rubro'],source:'demo'},
    {id:'babahoyo',code:'MZS-2026-BABAHOYO-004',province:'Los Ríos',canton:'Babahoyo',stage:'Oportunidad',service:'Prefactibilidad de microzonificación',price:0,cost:0,committed:0,actual:0,invoiced:0,collected:0,gate:'G1',gateProgress:50,gateRequirements:'2 de 4 requisitos',note:'Pendiente confirmar presupuesto institucional y alcance.',alerts:['Sin presupuesto referencial aprobado'],source:'demo'}
  ],
  gates:[
    {id:'G0',name:'Prospección',requirements:['Cliente identificado','Contacto responsable','Necesidad registrada','Próxima acción']},
    {id:'G1',name:'Oportunidad',requirements:['Necesidad validada','Probabilidad','Presupuesto referencial','Viabilidad']},
    {id:'G2',name:'Prefactibilidad',requirements:['Área objetivo','PDOT/PUGS','Complejidad','Campaña preliminar']},
    {id:'G3',name:'Diseño técnico-económico',requirements:['Alcance','Campaña definitiva','Presupuesto','Cronograma','Equipo']},
    {id:'G4',name:'Oferta',requirements:['TDR / pliegos','Metodología','Oferta económica','Experiencia','Personal','QA/QC']},
    {id:'G5',name:'Contratación',requirements:['Adjudicación','Contrato','Garantías','Administrador entidad','Gestor interno','Condiciones de inicio']},
    {id:'G6',name:'Inicio / campo',requirements:['Plan de trabajo','Permisos','SST','Equipos','Bitácora','Cadena de custodia']},
    {id:'G7',name:'Procesamiento técnico',requirements:['Laboratorio','Geofísica','SIG','Modelación','Trazabilidad','QA/QC']},
    {id:'G8',name:'Entrega',requirements:['Borrador','QA/QC','Cartografía','Bases','Observaciones']},
    {id:'G9',name:'Recepción y cobro',requirements:['Conformidad','Acta','Factura','Liquidación','Cobro']},
    {id:'G10',name:'Cierre / postventa',requirements:['Expediente','Lecciones aprendidas','Rentabilidad','Caso de éxito','Seguimiento comercial']}
  ],
  documents:['TDR / Pliegos','Oferta técnica','Presupuesto vigente','Contrato / garantías','Plan de trabajo','Bitácoras de campo','Resultados laboratorio / geofísica','Informe técnico','Cartografía y bases','Acta de recepción'],
  audit:['Presupuesto V03 actualizado','TDR clasificado','Perforación referencial ajustada a USD 90/m','QA/QC abrió observación 016'],
  pricing:{drillingSoil:90,drillingRock:200,vs:700,hvsr:300,professionalMonth:1700,contractAdminMonth:1700,indirectPct:10,contingencyPct:5,marginPct:15}
};
