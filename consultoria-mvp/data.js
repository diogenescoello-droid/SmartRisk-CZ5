window.SR_CONSULTORIA_DATA = {
  roles: {
    gerencia:{label:'Gerencia / Superadministrador',economics:true,tasks:['Aprobar presupuesto V03','Resolver alerta contractual','Revisar margen actualizado']},
    comercial:{label:'Comercial / Promoción',economics:false,tasks:['Registrar seguimiento con GAD','Actualizar probabilidad de contratación','Programar siguiente contacto']},
    tecnico:{label:'Coordinación técnica',economics:true,tasks:['Validar campaña de investigación','Revisar avance técnico','Asignar especialistas']},
    geotecnia:{label:'Geotecnia',economics:false,tasks:['Completar perforación P-07','Validar cadena de custodia','Revisar laboratorio']},
    geofisica:{label:'Geofísica',economics:false,tasks:['Procesar VS-14','Repetir HVSR H-17','Cerrar QA instrumental']},
    contractual:{label:'Gestión contractual',economics:true,tasks:['Controlar plazo contractual','Preparar expediente de planilla','Verificar garantía']},
    finanzas:{label:'Finanzas',economics:true,tasks:['Registrar costo comprometido','Conciliar anticipo','Actualizar margen real']},
    qaqc:{label:'QA/QC',economics:false,tasks:['Revisar informe V05','Cerrar observaciones','Aprobar cartografía']}
  },
  projects:[
    {id:'salinas',code:'MZS-2026-SALINAS-001',province:'Santa Elena',canton:'Salinas',stage:'Oferta',service:'Microzonificación sísmica integral',price:285366,cost:214843,committed:78000,actual:31420,gate:'G4',gateProgress:80,gateRequirements:'8 de 10 requisitos',note:'Falta aprobación económica y validación QA/QC.',alerts:['Oferta pendiente de QA/QC','Garantía referencial por definir']},
    {id:'daule',code:'MZS-2026-DAULE-002',province:'Guayas',canton:'Daule',stage:'Prefactibilidad',service:'Estudio técnico base',price:198500,cost:151300,committed:8500,actual:3200,gate:'G2',gateProgress:71,gateRequirements:'5 de 7 requisitos',note:'Falta validar área urbana y campaña definitiva.',alerts:['Área PDOT/PUGS pendiente de validar']},
    {id:'milagro',code:'MZS-2026-MILAGRO-003',province:'Guayas',canton:'Milagro',stage:'Ejecución',service:'Microzonificación sísmica integral',price:322400,cost:249700,committed:171200,actual:126350,gate:'G6',gateProgress:100,gateRequirements:'9 de 9 requisitos',note:'Gate operativo aprobado. Continúa control semanal.',alerts:['HVSR H-17 requiere repetición','Costo de campo al 78% del rubro']},
    {id:'babahoyo',code:'MZS-2026-BABAHOYO-004',province:'Los Ríos',canton:'Babahoyo',stage:'Oportunidad',service:'Prefactibilidad de microzonificación',price:0,cost:0,committed:0,actual:0,gate:'G1',gateProgress:50,gateRequirements:'2 de 4 requisitos',note:'Pendiente confirmar presupuesto institucional y alcance.',alerts:['Sin presupuesto referencial aprobado']}
  ],
  gates:[
    ['G0','Prospección'],['G1','Oportunidad'],['G2','Prefactibilidad'],['G3','Diseño técnico-económico'],['G4','Oferta'],['G5','Contratación'],['G6','Inicio / campo'],['G7','Procesamiento técnico'],['G8','Entrega'],['G9','Recepción y cobro'],['G10','Cierre / postventa']
  ],
  documents:['TDR / Pliegos','Oferta técnica','Presupuesto vigente','Contrato / garantías','Plan de trabajo','Bitácoras de campo','Resultados laboratorio / geofísica','Informe técnico','Cartografía y bases','Acta de recepción'],
  audit:['Presupuesto V03 actualizado','TDR clasificado','Perforación referencial ajustada a USD 90/m','QA/QC abrió observación 016']
};
