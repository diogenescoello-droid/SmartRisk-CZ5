(()=>{
  "use strict";

  const reports=[
    {
      id:"IR-GYE-CIUDAD-OLIMPO-2026",
      code:"SGR-IASR-08-2026-009",
      title:"Evaluación de afectaciones en viviendas y determinación de riesgo en Cdla. Ciudad Olimpo",
      date:"2026-03-20",
      inspectionDate:"2026-02-26",
      province:"Guayas",
      canton:"Guayaquil",
      parish:"Chongón",
      sectors:["Cdla. Ciudad Olimpo"],
      reportType:"Informe de análisis de riesgos",
      threats:["Inundación", "Saturación del suelo", "Asentamientos diferenciales", "Peligro sísmico"],
      status:"Emitido",
      validation:"Informe técnico con levantamiento de campo, SIG y 29 registros georreferenciados de viviendas.",
      summary:"El sector presenta acumulación recurrente de agua, suelos finos de baja permeabilidad y rellenos antrópicos no controlados. Estas condiciones favorecen saturación, asentamientos diferenciales y deterioro progresivo de viviendas.",
      keyData:[
        {label:"Viviendas levantadas",value:"29 registros georreferenciados"},
        {label:"Ubicación referencial",value:"UTM 17S: 602800 E / 9754000 N"},
        {label:"Accesibilidad",value:"Ingreso posible para unidades de respuesta, condicionado por anegamiento y drenajes"}
      ],
      conclusions:[
        "La dinámica hídrica, los suelos finos y los rellenos sin control explican condiciones de saturación y afectación progresiva.",
        "La conectividad externa limitada puede condicionar la respuesta durante lluvias intensas."
      ],
      recommendations:[
        "Corregir drenajes y verificar la evacuación de aguas superficiales.",
        "Realizar valoración estructural y geotécnica de las viviendas con daños.",
        "Mantener seguimiento georreferenciado de afectaciones y medidas ejecutadas."
      ],
      url:"https://drive.google.com/file/d/1l7uW7gNBl61vDUyNkVsym0QvwZN6wKKv/view",
      source:"Repositorio de informes de la Coordinación Zonal 5"
    },
    {
      id:"IR-GYE-LEONIDAS-GARCIA-2026",
      code:"SNGR-CZ5-IT-2026-017",
      title:"Escenario preliminar de riesgo químico en la Unidad Educativa Fiscal Leonidas García",
      date:"2026-07-30",
      inspectionDate:"",
      province:"Guayas",
      canton:"Guayaquil",
      parish:"Tarqui / entorno 09D08 Pascuales 2",
      sectors:["Unidad Educativa Leonidas García", "Inmaconsa", "Monte Sinaí"],
      reportType:"Informe técnico preliminar de escritorio",
      threats:["Posible incidente tecnológico", "Riesgo químico", "NaTech por verificar"],
      status:"En revisión técnica",
      validation:"No confirma sustancia, concentración, fuente emisora ni relación causal sanitaria. Requiere medición e inspección de entidades competentes.",
      summary:"Se registra un reporte reiterado de olores o gases en un receptor educativo sensible. La información disponible permite justificar protección preventiva y articulación institucional, pero no identificar el agente ni atribuir una fuente.",
      keyData:[
        {label:"Receptor sensible",value:"Unidad educativa y Dirección Distrital 09D08"},
        {label:"Evidencia instrumental",value:"No disponible en el expediente"},
        {label:"Nivel de confianza",value:"Preliminar; incertidumbre explícita"}
      ],
      conclusions:[
        "La reiteración documental y la sensibilidad del receptor justifican verificación urgente.",
        "No existe evidencia suficiente para confirmar intoxicación, contaminación ambiental o responsabilidad de una fuente."
      ],
      recommendations:[
        "Activar Ambiente, MSP, Bomberos/MATPEL, Municipio y Educación según competencia.",
        "Realizar monitoreo con equipos calibrados y registrar meteorología, horarios y síntomas.",
        "Definir confinamiento o evacuación según fuente, viento y evaluación inicial; no aplicar evacuación automática."
      ],
      url:"https://drive.google.com/file/d/1vfPFjEV6UASV4OrN58B2YvPomkZiR8oT/view",
      source:"Expediente técnico en revisión de la Coordinación Zonal 5"
    },
    {
      id:"IR-DURAN-ESTERO-LA-MONA-2026",
      code:"SNGR-CZ5GR-2026-016",
      title:"Análisis preliminar del sistema Estero La Mona – Canal La Hormiga",
      date:"2026-06-29",
      inspectionDate:"2026-06-29",
      province:"Guayas",
      canton:"Durán",
      parish:"",
      sectors:["Estero La Mona", "Canal La Hormiga", "La Magdalena", "La Ensenada"],
      reportType:"Informe técnico preliminar hidrogeomorfológico y social",
      threats:["Inundación recurrente", "Restricción hidráulica", "Obstrucción de drenajes", "Modificación del patrón de flujo"],
      status:"Informe técnico preliminar",
      validation:"Requiere inspección hidráulica especializada, levantamiento topográfico, secciones y modelación de escenarios.",
      summary:"El caso debe analizarse como una red de drenaje intervenida. La evidencia señala obstrucciones, flujo casi estático, pérdida de conectividad y exposición directa de viviendas y medios de vida.",
      keyData:[
        {label:"Población levantada",value:"109 personas"},
        {label:"Viviendas",value:"30; 27 reportan inundación total"},
        {label:"Hogares vulnerables",value:"24 con al menos una condición de vulnerabilidad"},
        {label:"Tramo referencial",value:"Aproximadamente 14 km de cauce/canal reportado por Prefectura"}
      ],
      conclusions:[
        "La problemática no corresponde únicamente a una inundación natural aislada, sino al funcionamiento integrado de canales, estructuras y descargas.",
        "La evidencia justifica una evaluación hidráulica, pero no permite definir todavía una obra final ni responsabilidades administrativas."
      ],
      recommendations:[
        "Separar atención preventiva a población, diagnóstico hidráulico y revisión competencial/administrativa.",
        "Inspeccionar secciones, alcantarillas, compuertas, pasos de vía, sedimentos y puntos de descarga.",
        "Vincular las medidas acordadas con responsables, plazos y verificables."
      ],
      url:"https://drive.google.com/file/d/1aauwJFC1EtTuuEiQt64SbiKf_N3CAVTi/view",
      source:"Repositorio de informes de la Coordinación Zonal 5"
    },
    {
      id:"IR-NOBOL-LA-PRIMAVERA-2026",
      code:"SGR-IASR-08-2026-007",
      title:"Riesgo por contaminación ambiental de aguas residuales en Cdla. La Primavera",
      date:"2026-03-09",
      inspectionDate:"2026-02-02",
      province:"Guayas",
      canton:"Nobol",
      parish:"Comuna Petrillo",
      sectors:["Cdla. La Primavera", "Petrillo"],
      reportType:"Informe de análisis de riesgos sanitario y ambiental",
      threats:["Inundación localizada", "Colapso de alcantarillado", "Aguas residuales", "Riesgo sanitario"],
      status:"Emitido y firmado",
      validation:"Informe con inspección territorial, análisis SIG, PTAR, alcantarillado y antecedentes sanitarios.",
      summary:"Las pendientes bajas, los suelos sedimentarios y las fallas del alcantarillado y de la PTAR favorecen acumulación de aguas residuales, contaminación ambiental y exposición sanitaria de la población.",
      keyData:[
        {label:"Ubicación referencial",value:"UTM 17S: 609600 E / 9781800 N"},
        {label:"Tiempo de respuesta",value:"5–10 minutos desde Nobol; 35–45 minutos desde Guayaquil"},
        {label:"Infraestructura analizada",value:"Red de alcantarillado sanitario y PTAR"}
      ],
      conclusions:[
        "La susceptibilidad natural al anegamiento se agrava por deficiencias operativas y estructurales del sistema sanitario.",
        "La descarga superficial de aguas servidas configura una brecha ambiental y de salud pública."
      ],
      recommendations:[
        "Intervenir y mantener la red sanitaria y la PTAR con responsables y cronograma.",
        "Controlar descargas, limpiar puntos críticos y verificar capacidad de tratamiento.",
        "Mantener vigilancia sanitaria y seguimiento de morbilidades asociadas."
      ],
      url:"https://drive.google.com/file/d/1mfM2yYtw9vkXc6OS5gbKGzhxpCZEEgMz/view",
      source:"Repositorio de informes de la Coordinación Zonal 5"
    },
    {
      id:"IR-GYE-CRISTO-REY-2025",
      code:"SNGR-IASR-05-2024-035",
      title:"Factores de riesgo entre la Fundación Cristo Rey y la Inmobiliaria San Jorge",
      date:"2025-09-15",
      inspectionDate:"2025-09-05",
      province:"Guayas",
      canton:"Guayaquil",
      parish:"Tarqui",
      sectors:["Aldea Cristo Rey", "Fundación Cristo Rey", "Inmobiliaria San Jorge"],
      reportType:"Informe de análisis geotécnico y de factores de riesgo",
      threats:["Deslizamiento planar", "Inestabilidad de talud", "Saturación", "Amenaza sísmica"],
      status:"Emitido y firmado",
      validation:"Incluye inspección de campo, fotogrametría, modelado 3D, SIG y análisis geomecánico.",
      summary:"El talud presenta estratos buzando a favor de la pendiente, geometría pronunciada y acumulación potencial de humedad, condiciones que pueden favorecer deslizamiento planar y afectar la casa de acogida ubicada en la parte superior.",
      keyData:[
        {label:"Pendiente del talud",value:"Aproximadamente 80°"},
        {label:"Altura",value:"Aproximadamente 25 m"},
        {label:"Área de posible afectación",value:"Aproximadamente 373 m²"},
        {label:"PGA contextual",value:"Aproximadamente 0,45 g, sujeto a condiciones locales"}
      ],
      conclusions:[
        "La orientación de los estratos y la humedad constituyen factores desfavorables para la estabilidad.",
        "La presencia de una casa de acogida sobre el talud exige medidas preventivas y control técnico."
      ],
      recommendations:[
        "Implementar drenaje superficial y medidas de estabilización sustentadas en diseño geotécnico.",
        "Monitorear deformaciones, grietas, humedad y cambios en el talud.",
        "Controlar intervenciones y ocupación dentro del área potencialmente afectada."
      ],
      url:"https://drive.google.com/file/d/1k22L-KAolb-aoCJkvDGZG3T_h2nIksGY/view",
      source:"Repositorio de informes de la Coordinación Zonal 5"
    },
    {
      id:"IR-SANTA-ELENA-SANTUARIO-OLON-2022",
      code:"SNGRE-IASR-05-2022-020",
      title:"Análisis técnico del Santuario Blanca Estrella de la Mar y vías de acceso",
      date:"2022-06-02",
      inspectionDate:"2022-05-27",
      province:"Santa Elena",
      canton:"Santa Elena",
      parish:"Manglaralto",
      sectors:["Santuario Blanca Estrella de la Mar", "Olón", "Vía al Cerro Olón"],
      reportType:"Informe especial de comisión",
      threats:["Erosión marina", "Erosión hídrica y eólica", "Caída de bloques", "Socavación", "Inestabilidad de vía"],
      status:"Emitido y firmado",
      validation:"Inspección de campo y análisis de amenazas geológicas, erosivas y de acceso.",
      summary:"El acantilado y las vías de acceso presentan erosión, grietas longitudinales, socavones y caída de bloques. La infraestructura del Santuario y la movilidad hacia la unidad educativa se encuentran condicionadas por la inestabilidad del terreno.",
      keyData:[
        {label:"Ubicación",value:"UTM 17S: 527020 E / 9799390 N"},
        {label:"Sitios críticos",value:"Dos socavones, cierres viales y tramos de cuneta afectados"},
        {label:"Ventana temporal",value:"Informe incluido por encontrarse dentro de los últimos cinco años"}
      ],
      conclusions:[
        "La erosión marina, eólica e hídrica mantiene inestable el acantilado.",
        "Las grietas y socavones constituyen señales de deterioro que afectan la seguridad vial y la infraestructura."
      ],
      recommendations:[
        "Realizar estudio geotécnico para definir obras de protección y estabilización.",
        "Mantener monitoreo permanente del Santuario, acantilado y vías.",
        "Recuperar cunetas y habilitar accesos únicamente bajo condiciones técnicas verificadas."
      ],
      url:"https://drive.google.com/file/d/1QpraJ5QQKzBfkjB_uEE23jxnwhPvx29K/view",
      source:"Repositorio de informes de la Coordinación Zonal 5"
    }
  ];

  window.SMART_RISK_RISK_REPORTS_5Y=Object.freeze({
    version:"2026-07-31T14:13:00-05:00",
    rollingWindowYears:5,
    cutoffPolicy:"La fecha del informe debe ser igual o posterior a la fecha de consulta menos cinco años.",
    sourceMatrix:{
      title:"Base_RIESGO_CANTONAL_ENOS_CZ5",
      spreadsheetId:"1Lz99D_XLzuwgbdntRAyi75EYk5mOWysGRU4oIQ2YUJo",
      status:"La matriz territorial aún no contiene enlaces; este índice se consolida desde los documentos de Drive."
    },
    reports:Object.freeze(reports.map(report=>Object.freeze(report)))
  });
})();