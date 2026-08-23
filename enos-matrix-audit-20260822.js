(() => {
  "use strict";
  const audit = {
    25:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Atribuible",F02:"Atribuible",F03:"Conciliar",F04:"Atribuible",F05:"Atribuible",F06:"Conciliar",F07:"Conciliar"},finding:"4 F01 en plataforma más San Marcos en plan; discrepancia de exposición; F07 SIN-CODIGO y sin vínculo F04."},
    26:{institutionalStatus:"DEVUELTO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"Plan 1-jul-2026 en revisión; sin paquete municipal en la base sincronizada."},
    27:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"Versión completa recibida 10-jul; sin paquete municipal en la base sincronizada."},
    28:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"Excluir registros MAG asociados al cantón; falta Quipux es administrativa."},
    29:{institutionalStatus:"DEVUELTO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"Congelar versión oficial; presupuestos del plan son referenciales, no ejecución."},
    30:{institutionalStatus:"VALIDADO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"Plan validado; no paquete municipal sincronizado. Separar referencias posteriores."},
    31:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"No atribuir al GAD registros SNGR con contenido territorial de Milagro."},
    32:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Atribuible",F02:"Atribuible",F03:"Conciliar",F04:"Atribuible",F05:"Sin registro",F06:"Atribuible",F07:"Sin registro"},finding:"24 F01, 1 F02, 5 F03, 25 F04 y 5 F06; antiguo conteo 25 F07 era fuga de F04."},
    33:{institutionalStatus:"DEVUELTO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"No existe PDF final firmado; mantener devuelto hasta versión corregida."},
    34:{institutionalStatus:"VALIDADO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"Plan validado; falta Quipux es administrativa; sin paquete municipal sincronizado."},
    35:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Atribuible",F02:"Sin registro",F03:"Conciliar",F04:"Atribuible",F05:"Atribuible",F06:"Atribuible",F07:"Conciliar"},finding:"1 F01 subrepresenta el plan; F03 huérfano; F07 con periodo/fecha inconsistente y sin vínculo F04."},
    36:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Conciliar",F02:"Atribuible",F03:"Atribuible",F04:"Atribuible",F05:"Atribuible",F06:"Conciliar",F07:"Conciliar"},finding:"F01-F07 existen en envíos fragmentados; 5 F07 usan SIN-CODIGO y no tienen evidencia enlazada."},
    37:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Conciliar",F02:"Sin registro",F03:"Atribuible",F04:"Atribuible",F05:"Atribuible",F06:"Sin registro",F07:"Sin registro"},finding:"3 F01 en envíos distintos, F03/F04 y 4 F05 con 769 plazas; sin F07 municipal verificable."},
    38:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Conciliar",F02:"Atribuible",F03:"Atribuible",F04:"Sin registro",F05:"Atribuible",F06:"Atribuible",F07:"Sin registro"},finding:"F01/F02/F03/F05/F06 sincronizados; alojamiento 20 personas requiere adecuación; USD 200.000/15 rubros referenciales."},
    39:{institutionalStatus:"DEVUELTO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Referencia"},finding:"Nueva versión firmada 10-jul; desagregar ~33.000 personas y confirmar F07 posterior."},
    40:{institutionalStatus:"DEVUELTO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"Conciliar contradicción entre porcentajes de susceptibilidad antes de publicar."},
    41:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Referencia",F06:"Sin registro",F07:"Sin registro"},finding:"80% es meta de protección, no avance; 2 alojamientos habilitados + 4 condicionados."},
    42:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Atribuible",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Referencia",F06:"Sin registro",F07:"Referencia"},finding:"14 F01 sincronizados; 7 seguimientos posteriores deben homologarse; USD 128.000/11 componentes referenciales."},
    43:{institutionalStatus:"VALIDADO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Referencia"},finding:"Plan validado y Quipux; sin paquete municipal sincronizado; seguimientos posteriores requieren vínculo."},
    44:{institutionalStatus:"VALIDADO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Referencia"},finding:"Plan validado; falta Quipux administrativa; referencias F07 posteriores no homologadas."},
    45:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Atribuible",F02:"Atribuible",F03:"Sin registro",F04:"Atribuible",F05:"Atribuible",F06:"Atribuible",F07:"Sin registro"},finding:"14 F01, 3 F04, 7 F05 y 4 F06; falta F03/F07; aclarar transición de preliminar a VALIDADO."},
    46:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Atribuible",F04:"Atribuible",F05:"Sin registro",F06:"Sin registro",F07:"Referencia"},finding:"F03/F04 sincronizados; F04 La Yuca 100% sin evidencia adjunta; F07 agosto posterior al corte."},
    47:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Conciliar",F02:"Atribuible",F03:"Conciliar",F04:"Atribuible",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"F01/F02/F03/F04 existen en códigos variantes; un F01 agrupa 15 sectores; excluir La Ernestina de Prefectura."},
    48:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Conciliar",F02:"Atribuible",F03:"Conciliar",F04:"Atribuible",F05:"Conciliar",F06:"Atribuible",F07:"Conciliar"},finding:"F01-F07 casi completos pero fragmentados 2025/2026; F04 100%; F07 junio 75% con foto y SIN-CODIGO."},
    49:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Atribuible",F02:"Atribuible",F03:"Atribuible",F04:"Atribuible",F05:"Atribuible",F06:"Atribuible",F07:"Conciliar"},finding:"Circuito F01-F07 completo; 7 F01, F04 70%, F05 120 plazas, 4 F06 y 1 F07 sincronizado 80%; antiguo 8 F07 inválido."},
    50:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Referencia"},finding:"26 registros/8 parroquias/32.817 habitantes pertenecen al plan; F07 julio es referencia posterior."},
    51:{institutionalStatus:"DEVUELTO",statuses:{F01:"Sin registro",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"Resolver vigencia 2025-2026 versus 2026-2027; falta catálogo territorial y F07 verificable."},
    52:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Conciliar",F02:"Atribuible",F03:"Sin registro",F04:"Conciliar",F05:"Atribuible",F06:"Atribuible",F07:"Conciliar"},finding:"IDs repetidos; múltiples F01/F04, 2 F05 y 8 F06; F07 declarado pero no normalizado; corregir población/viviendas."},
    53:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Atribuible",F02:"Atribuible",F03:"Sin registro",F04:"Atribuible",F05:"Atribuible",F06:"Atribuible",F07:"Referencia"},finding:"2 F01, F02/F04/F05/F06; F04 100%, F05 120 plazas, F06 40 bomberos; USD 329.400 referencial."},
    54:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Atribuible",F02:"Atribuible",F03:"Sin registro",F04:"Sin registro",F05:"Referencia",F06:"Sin registro",F07:"Referencia"},finding:"F01 Nahomi Rubio y F02 Carlos Carriel; excluir Santa Ana de Prefectura; alojamientos/F07 agosto son posteriores."},
    55:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Sin registro",F02:"Atribuible",F03:"Atribuible",F04:"Atribuible",F05:"Atribuible",F06:"Atribuible",F07:"Conciliar"},finding:"F02-F07 existentes, falta F01; F04 90% con evidencia; F07 70% solo reporta elaboración del plan; separar exposición histórica."},
    56:{institutionalStatus:"CON BRECHAS",statuses:{F01:"Conciliar",F02:"Sin registro",F03:"Sin registro",F04:"Sin registro",F05:"Sin registro",F06:"Sin registro",F07:"Sin registro"},finding:"12 F01 vigentes más borrador; IDs PUNTO reutilizados; corregir total de inundación; informe 074 vigente y 018 histórico."}
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
      gad.auditState="Auditado 2026-08-23";
      gad.auditCut="F07 sincronizado 2026-08-23; última entrega 2026-08-21 17:39:13 + documentación posterior verificada";
    });
    matrix.auditVersion="2026-08-23.1";
    matrix.auditScope="GAD 25-56 auditados y corregidos; F07 sincronizado el 23-ago con última entrega el 21-ago; referencias posteriores separadas de registros homologados.";
    matrix.auditRule="No atribuir por cantón solamente. Usar institución + código de caso + tipo de usuario y conservar submission_uuid/repeat_index para resolver colisiones.";
    matrix.platformUpdatedAt="2026-08-23";
    matrix.f07SyncedAt="2026-08-23T17:57:45.664Z";
    matrix.f07LatestSubmissionAt="2026-08-21T17:39:13";
    return true;
  }
  if(!apply()){
    const timer=setInterval(()=>{if(apply()) clearInterval(timer);},25);
    setTimeout(()=>clearInterval(timer),5000);
  }
  window.ENOS_MATRIX_AUDIT_20260822=audit;
})();