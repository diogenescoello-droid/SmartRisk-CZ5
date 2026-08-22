(() => {
  "use strict";
  const audit = {
    25:{institutionalStatus:"VALIDADO",statuses:{F01:"Atribuible",F02:"Atribuible",F03:"Conciliar",F04:"Atribuible",F05:"Atribuible",F06:"Conciliar",F07:"Conciliar"},finding:"El Empalme: 4 F01 en plataforma más San Marcos en plan; discrepancia de exposición en 7 de Agosto/María Asunción; F07 SIN-CODIGO y sin vínculo F04."},
    26:{institutionalStatus:"EN REVISIÓN",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"El Triunfo: plan 1-jul-2026 en revisión; sin paquete municipal en la base sincronizada al 23-jun."},
    27:{institutionalStatus:"EN REVISIÓN",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"General Antonio Elizalde: versión completa recibida 10-jul; sin paquete municipal en la base sincronizada al 23-jun."},
    28:{institutionalStatus:"VALIDADO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"Guayaquil: plan validado; excluir registros MAG asociados al cantón. Falta Quipux es administrativa."},
    29:{institutionalStatus:"EN REVISIÓN",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"Isidro Ayora: plan de gran tamaño localizado; congelar versión oficial y no interpretar presupuestos referenciales como ejecución."},
    30:{institutionalStatus:"VALIDADO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"Lomas de Sargentillo: plan validado; no paquete municipal sincronizado. Mantener separadas referencias posteriores."},
    31:{institutionalStatus:"VALIDADO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"Milagro: plan validado; no paquete municipal sincronizado. No atribuir al GAD registros SNGR con contenido territorial de Milagro."},
    32:{institutionalStatus:"VALIDADO",statuses:{F01:"Atribuible",F02:"Atribuible",F03:"Conciliar",F04:"Atribuible",F05:"Sin registro",F06:"Atribuible",F07:"Sin registro"},finding:"Naranjal: 24 F01, 1 F02, 5 F03, 25 F04 y 5 F06; no F05/F07 municipal sincronizado. El antiguo conteo 25 F07 era fuga de F04."},
    33:{institutionalStatus:"DEVUELTO – PENDIENTE DE CORRECCIÓN",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"Naranjito: no existe PDF final firmado; mantener devuelto hasta versión corregida."},
    34:{institutionalStatus:"VALIDADO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"Nobol: plan validado; falta Quipux es administrativa. No paquete municipal sincronizado."},
    35:{institutionalStatus:"EN REVISIÓN",statuses:{F01:"Atribuible",F02:"Sin registro",F03:"Conciliar",F04:"Atribuible",F05:"Atribuible",F06:"Atribuible",F07:"Conciliar"},finding:"Palestina: 1 F01 subrepresenta el plan; F03 huérfano; 2 F04; 6 alojamientos; F07 con periodo/fecha inconsistente y sin vínculo a F04."},
    36:{institutionalStatus:"VALIDADO",statuses:{F01:"Conciliar",F02:"Atribuible",F03:"Atribuible",F04:"Atribuible",F05:"Atribuible",F06:"Conciliar",F07:"Conciliar"},finding:"Pedro Carbo: F01-F07 existentes en envíos fragmentados; IDs repetidos y códigos de caso variantes. 5 F07 usan SIN-CODIGO y carecen de evidencia enlazada."},
    37:{institutionalStatus:"VALIDADO",statuses:{F01:"Conciliar",F02:"Sin registro",F03:"Atribuible",F04:"Atribuible",F05:"Atribuible",F06:"Sin registro",F07:"Sin registro"},finding:"Playas: 3 F01 en envíos distintos, F03/F04 y 4 F05 con 769 plazas declaradas; falta F07 municipal verificable."},
    38:{institutionalStatus:"EN REVISIÓN",statuses:{F01:"Conciliar",F02:"Atribuible",F03:"Atribuible",F04:"Sin registro",F05:"Atribuible",F06:"Atribuible",F07:"Sin registro"},finding:"Salitre: F01/F02/F03/F05/F06 sincronizados; F01 está formulado como brecha y no sitio. Alojamiento 20 personas requiere adecuación. USD 200.000/15 rubros son referenciales."},
    39:{institutionalStatus:"EN REVISIÓN",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Referencia"},finding:"Samborondón: nueva versión firmada 10-jul; sin paquete municipal sincronizado. Desagregar ~33.000 personas y confirmar F07 posterior."},
    40:{institutionalStatus:"VALIDADO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"San Jacinto de Yaguachi: validar contradicción entre porcentajes de susceptibilidad antes de publicar; no paquete municipal sincronizado."},
    41:{institutionalStatus:"VALIDADO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Referencia",F06:"Sin registro",F07:"Sin registro"},finding:"Santa Lucía: 80% es meta de protección, no exposición/avance. Control actualizado: 2 alojamientos habilitados + 4 condicionados."},
    42:{institutionalStatus:"VALIDADO",statuses:{F01:"Atribuible",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Referencia",F06:"Sin registro",F07:"Referencia"},finding:"Simón Bolívar: 14 F01 sincronizados; 7 seguimientos posteriores deben homologarse. USD 128.000/11 componentes son referenciales."},
    43:{institutionalStatus:"VALIDADO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Referencia"},finding:"Baba: plan validado y enviado por Quipux; no paquete municipal sincronizado. Seguimientos posteriores requieren extracción y vínculo."},
    44:{institutionalStatus:"VALIDADO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Referencia"},finding:"Babahoyo: plan validado; falta Quipux administrativa. No paquete municipal sincronizado; referencias F07 posteriores no homologadas."},
    45:{institutionalStatus:"VALIDADO",statuses:{F01:"Atribuible",F02:"Atribuible",F03:"Sin registro",F04:"Atribuible",F05:"Atribuible",F06:"Atribuible",F07:"Sin registro"},finding:"Buena Fe: 14 F01, 3 F04, 7 F05 y 4 F06; falta F03/F07. Aclarar transición de documento preliminar a VALIDADO."},
    46:{institutionalStatus:"EN REVISIÓN",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Atribuible",F04:"Atribuible",F05:"Sin registro",F06:"Sin registro",F07:"Referencia"},finding:"Mocache: plan firmado 29-jun; F03/F04 sincronizados. F04 La Yuca 100% sin evidencia adjunta; F07 agosto es posterior al corte sincronizado."},
    47:{institutionalStatus:"EN REVISIÓN",statuses:{F01:"Conciliar",F02:"Atribuible",F03:"Conciliar",F04:"Atribuible",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"Montalvo: F01/F02/F03/F04 existentes en códigos variantes; un F01 agrupa 15 sectores. Excluir La Ernestina de Prefectura."},
    48:{institutionalStatus:"VALIDADO",statuses:{F01:"Conciliar",F02:"Atribuible",F03:"Conciliar",F04:"Atribuible",F05:"Conciliar",F06:"Atribuible",F07:"Conciliar"},finding:"Palenque: F01-F07 prácticamente completos pero fragmentados 2025/2026. F04 100%; F07 junio 75% con foto y SIN-CODIGO; F05 agrupa dos alojamientos (425 personas)."},
    49:{institutionalStatus:"VALIDADO",statuses:{F01:"Atribuible",F02:"Atribuible",F03:"Atribuible",F04:"Atribuible",F05:"Atribuible",F06:"Atribuible",F07:"Conciliar"},finding:"Puebloviejo: circuito F01-F07 completo; 7 F01 nominales, F04 70%, F05 120 plazas, 4 F06 y 1 F07 sincronizado al 80% SIN-CODIGO. Antiguo conteo 8 F07 no es válido."},
    50:{institutionalStatus:"EN REVISIÓN",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Referencia"},finding:"Quevedo: plan final ~90 MB; 26 registros/8 parroquias/32.817 habitantes son del plan, no F01 sincronizados. F07 julio es referencia posterior."},
    51:{institutionalStatus:"EN REVISIÓN",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"Quinsaloma: resolver vigencia 2025-2026 versus 2026-2027 y emitir versión/aclaración oficial; falta catálogo territorial y F07 verificable."},
    52:{institutionalStatus:"EN REVISIÓN",statuses:{F01:"Conciliar",F02:"Atribuible",F03:"Sin registro",F04:"Conciliar",F05:"Atribuible",F06:"Atribuible",F07:"Conciliar"},finding:"Urdaneta: F01/F02/F04/F05/F06 declarados y múltiples registros; IDs repetidos, 10 F04 actuales + borrador, 2 F05 y 8 F06. F07 declarado pero no normalizado; corregir población/viviendas."},
    53:{institutionalStatus:"EN REVISIÓN",statuses:{F01:"Atribuible",F02:"Atribuible",F03:"Sin registro",F04:"Atribuible",F05:"Atribuible",F06:"Atribuible",F07:"Referencia"},finding:"Valencia: 2 F01 (Chipe/San Simón), F02/F04/F05/F06; F04 100%, F05 120 plazas, F06 40 bomberos. USD 329.400 referencial; F07 posterior no sincronizado."},
    54:{institutionalStatus:"EN REVISIÓN",statuses:{F01:"Atribuible",F02:"Atribuible",F03:"Sin registro",F04:"Sin registro",F05:"Referencia",F06:"Sin registro",F07:"Referencia"},finding:"Ventanas: F01 Nahomi Rubio y F02 Carlos Carriel sincronizados; excluir Santa Ana de Prefectura. 4 alojamientos/90 familias y F07 agosto son referencias posteriores por homologar."},
    55:{institutionalStatus:"EN REVISIÓN",statuses:{F01:"Sin registro",F02:"Atribuible",F03:"Atribuible",F04:"Atribuible",F05:"Atribuible",F06:"Atribuible",F07:"Conciliar"},finding:"Vinces: F02-F07 existentes, falta F01. F04 90% con evidencia; F07 junio 70% solo reporta elaboración del plan y usa SIN-CODIGO. Separar ~3.800 familias históricas de exposición actual."},
    56:{institutionalStatus:"VALIDADO",statuses:{F01:"Conciliar",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"Santa Elena municipal: 12 F01 vigentes más borrador; IDs PUNTO reutilizados entre submissions. Corregir total de inundación; informe 074 vigente y 018 histórico."}
  };
  function apply(){
    const matrix=window.ENOS_MATRIX_PRELIMINARY;
    if(!matrix?.gads) return false;
    Object.entries(audit).forEach(([number,patch])=>{
      const gad=matrix.gads.find(item=>Number(item.number)===Number(number));
      if(!gad) return;
      gad.statuses={...gad.statuses,...patch.statuses};
      gad.institutionalStatus=patch.institutionalStatus;
      gad.auditFinding=patch.finding;
      gad.auditState="Auditado 2026-08-22";
      gad.auditCut="Kobo sincronizado 2026-06-23 + documentación posterior verificada";
    });
    matrix.auditVersion="2026-08-22.1";
    matrix.auditScope="GAD 25-56 auditados y corregidos; fuentes posteriores separadas del corte Kobo sincronizado";
    matrix.auditRule="No atribuir por cantón solamente. Usar institución + código de caso + tipo de usuario y conservar submission_uuid/repeat_index para resolver colisiones.";
    return true;
  }
  if(!apply()){
    const timer=setInterval(()=>{if(apply()) clearInterval(timer);},25);
    setTimeout(()=>clearInterval(timer),5000);
  }
  window.ENOS_MATRIX_AUDIT_20260822=audit;
})();
