(() => {
  const DEMO={
    milagro:{
      boreholes:[
        {id:'P-01',site:'Sector norte',planned:25,executed:25,status:'Completada',spt:8,samples:5,rock:0},
        {id:'P-02',site:'Centro urbano',planned:25,executed:22,status:'En proceso',spt:7,samples:4,rock:3},
        {id:'P-03',site:'Sector sur',planned:30,executed:18,status:'En proceso',spt:5,samples:3,rock:0},
        {id:'P-04',site:'Expansión oeste',planned:25,executed:0,status:'Pendiente',spt:0,samples:0,rock:0}
      ],
      samples:[
        {id:'MZ-P01-01',borehole:'P-01',depth:'2.0-2.5',custody:'Recibida laboratorio',tests:['Humedad','Atterberg','Granulometría'],status:'En ensayo'},
        {id:'MZ-P01-02',borehole:'P-01',depth:'5.0-5.5',custody:'Recibida laboratorio',tests:['Compresión simple'],status:'Resultado disponible'},
        {id:'MZ-P02-01',borehole:'P-02',depth:'3.0-3.5',custody:'Campo',tests:['Humedad','Atterberg'],status:'Pendiente envío'}
      ],
      geophysics:[
        {id:'VS-01',type:'Vs30/Vs40',site:'Centro urbano',status:'Procesado',value:'Vs30 315 m/s',qa:'Aprobado'},
        {id:'VS-02',type:'Vs30/Vs40',site:'Sector norte',status:'Campo completado',value:'Pendiente',qa:'Pendiente'},
        {id:'HV-01',type:'HVSR',site:'Centro urbano',status:'Procesado',value:'T0 0,62 s',qa:'Aprobado'},
        {id:'HV-17',type:'HVSR',site:'Sector sur',status:'Repetir medición',value:'Curva inestable',qa:'No conforme'}
      ],
      sig:[
        {id:'SIG-01',product:'Base de puntos de investigación',version:'V04',status:'Actualizada',qa:'Aprobado'},
        {id:'SIG-02',product:'Modelo geológico-geotécnico',version:'V02',status:'En proceso',qa:'Pendiente'},
        {id:'SIG-03',product:'Superficie Vs30',version:'V01',status:'En proceso',qa:'Pendiente'}
      ],
      qaqc:[
        {id:'NC-017',area:'Geofísica',finding:'HVSR H-17 con curva inestable',severity:'Alta',owner:'geofisica',status:'Abierta'},
        {id:'OBS-022',area:'Geotecnia',finding:'Completar fotografía de testigo P-02',severity:'Media',owner:'geotecnia',status:'En proceso'}
      ]
    },
    salinas:{boreholes:[{id:'P-REF-01',site:'Campaña propuesta',planned:25,executed:0,status:'Planificada',spt:0,samples:0,rock:0}],samples:[],geophysics:[{id:'VS-REF',type:'Vs30/Vs40',site:'Campaña propuesta',status:'Planificada',value:'59 puntos estimados',qa:'Pendiente'}],sig:[],qaqc:[]},
    daule:{boreholes:[],samples:[],geophysics:[],sig:[],qaqc:[]},babahoyo:{boreholes:[],samples:[],geophysics:[],sig:[],qaqc:[]}
  };
  async function load(projectId){return structuredClone(DEMO[projectId]||{boreholes:[],samples:[],geophysics:[],sig:[],qaqc:[]});}
  async function save(projectId,type,record){const root=DEMO[projectId]||(DEMO[projectId]={boreholes:[],samples:[],geophysics:[],sig:[],qaqc:[]});const list=root[type];const created={...record,id:record.id||`${type}-${Date.now()}`};const i=list.findIndex(x=>x.id===created.id);if(i>=0)list[i]=created;else list.unshift(created);return created;}
  function summarize(data){const planned=data.boreholes.reduce((s,x)=>s+Number(x.planned||0),0),executed=data.boreholes.reduce((s,x)=>s+Number(x.executed||0),0);return{planned,executed,drillingProgress:planned?Math.round(executed/planned*100):0,geoDone:data.geophysics.filter(x=>/procesado|completado/i.test(x.status||'')).length,geoTotal:data.geophysics.length,nonConformities:data.qaqc.filter(x=>!/cerrad/i.test(x.status||'')).length,pendingSamples:data.samples.filter(x=>!/resultado disponible|complet/i.test(x.status||'')).length};}
  window.SR_OPERATIONS={load,save,summarize};
})();