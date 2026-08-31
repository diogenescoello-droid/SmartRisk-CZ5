(() => {
  "use strict";

  const CUT = "2026-08-31";
  const FOLLOWUP = {
    followupId: "GADSALINAS_PAENOS_2026_2027|F07-SEG-20260826",
    formId: "SALINAS-F07-V6-20260826",
    entityId: "TER-SANTA-ELENA-SALINAS",
    province: "Santa Elena",
    canton: "Salinas",
    level: "Cantonal",
    period: "2026-08",
    sourceFormat: "F07 V6 · exportación 31-ago-2026",
    sourceType: "Actualización documental CZ5",
    actionCode: "SIN-CODIGO",
    actionTitle: "Estabilización del talud Anconcito",
    actionLinkState: "Pendiente de homologación",
    siteReference: "SAL-01 · Sector 9 de Octubre (correspondencia probable)",
    siteLinkState: "Pendiente de homologación formal",
    criterion: null,
    status: "en_proceso",
    declaredProgress: 20,
    progressDescription: "Seguimiento reportado en F07 V6. El 20 % corresponde únicamente a esta actividad y no constituye avance global del Plan ENOS.",
    criticalGap: "Conexiones domiciliarias de aguas servidas provocaron las malas condiciones del talud.",
    nextStep: "Homologar el sitio crítico y la acción con F01/F04; mantener evidencia verificable y responsable antes de incorporar el seguimiento a indicadores consolidados.",
    responsible: "GAD Municipal de Salinas · responsable por confirmar en homologación",
    nextReportDate: null,
    evidenceDescription: "Medio de verificación PDF",
    evidenceFile: "PDF",
    evidenceUrl: "https://drive.google.com/open?id=1JCmOHdeQI-iXSwbjPgEWzN-8cuNvMY-X",
    evidenceState: "Adjunto accesible",
    requiresEscalation: false,
    observations: "El formulario registra 'No encuentro el sitio crítico en la lista' y 'No encuentro la acción en la lista'; por ello SAL-01 se conserva como correspondencia probable, no como vínculo homologado.",
    qualityScore: null,
    qualityState: "Pendiente de homologación",
    submissionUuid: null,
    submissionTime: "2026-08-26",
    eligibleTerritorial: true
  };

  function patchMatrix() {
    const matrix = window.ENOS_MATRIX_PRELIMINARY;
    const gad = matrix?.gads?.find(item => Number(item.number) === 4 || String(item.gad || "").includes("Municipal de Salinas"));
    if (!gad) return false;

    gad.statuses = {
      ...gad.statuses,
      F01: "Atribuible",
      F02: "Sin detalle",
      F03: "Referencia",
      F04: "Conciliar",
      F05: "Conciliar",
      F06: "Atribuible",
      F07: "Conciliar"
    };
    gad.institutionalStatus = "DEVUELTO";
    gad.validationState = "DEVUELTO · PENDIENTE DE CORRECCIÓN";
    gad.publishable = false;
    gad.auditFinding = "Salinas: 10 sitios críticos; F01 conserva 12 registros (10 sitios + 2 infraestructuras); el Plan registra 39 acciones (23 en ejecución declarada, 16 planificadas, 0 cerradas); F05 registra 35 filas frente a 30 alojamientos potenciales del Plan; F07 actualizado a 3 envíos / 5 filas, con seguimiento de agosto para 'Estabilización del talud Anconcito' al 20 %, todavía sin vínculo formal sitio–acción. El 20 % no es avance global del Plan.";
    gad.auditState = "Actualizado 2026-08-31";
    gad.auditCut = "F07 V6 · corte 31-ago-2026 · correspondencia SAL-01 probable y pendiente de homologación formal";
    gad.updatedAt = CUT;
    gad.preliminaryUpdate = {
      source: "Informe SGR-IASR-08-2026-022 + F01–F07 + F07 V6 · corte 31-ago-2026",
      finding: "Cadena operativa pendiente de cierre: sitio → acción → responsable → meta/plazo → presupuesto/fuente → seguimiento → evidencia → cierre.",
      actions: [
        "Validar y conservar identificadores únicos SAL-01 a SAL-10.",
        "Homologar las 39 acciones del Plan con F04 y los sitios críticos.",
        "Depurar F05: 35 registros frente a 30 alojamientos potenciales del Plan.",
        "Homologar 3 envíos / 5 filas F07; el seguimiento de Anconcito al 20 % no se incorpora como avance global.",
        "Completar por acción: responsable, meta/plazo, costo, monto asignado, fuente financiera y evidencia."
      ],
      reportedBudgetUsd: 0,
      pendingFields: ["código de sitio", "código de acción", "responsable", "meta/plazo", "costo", "fuente financiera", "evidencia", "criterio de cierre"]
    };
    return true;
  }

  function patchReviewContext() {
    const review = window.SMART_RISK_GAD_REVIEW_CONTEXT;
    const row = review?.rows?.find(item => Number(item.n) === 4 || String(item.gad || "").includes("Municipal de Salinas"));
    if (!row) return false;
    row.source = "Plan V01/documento de trabajo + F01–F07 + F07 V6 · estado documental DEVUELTO · corte 31-ago-2026";
    row.universe = "10 sitios críticos · 39 acciones · 30 alojamientos potenciales · F07: 3 envíos / 5 filas";
    row.trace = "F01–F04–F07 pendientes de homologación; Anconcito 20 % es seguimiento individual, no avance global";
    row.next = "Validar SAL-01–SAL-10; homologar F04/F07; completar responsable, meta/plazo, presupuesto/fuente y evidencia; depurar F05 y formalizar versión final del Plan.";
    row.format = "Ruta CZ5: sitio → acción → responsable → meta/plazo → presupuesto/fuente → seguimiento → evidencia → cierre";
    return true;
  }

  function patchF07() {
    const current = window.SMART_RISK_F07_CURRENT;
    if (!current?.followups) return false;
    const salinas = current.followups.filter(record => String(record.canton || "").trim().toLowerCase() === "salinas");
    const exists = salinas.some(record => String(record.actionTitle || "").toLowerCase().includes("estabilización del talud anconcito") || String(record.followupId || "") === FOLLOWUP.followupId);
    if (!exists) {
      current.followups.push(FOLLOWUP);
      if (current.summary && Number.isFinite(Number(current.summary.followups))) current.summary.followups += 1;
      if (current.summary && Number.isFinite(Number(current.summary.evidenceAttached))) current.summary.evidenceAttached += 1;
    }
    return true;
  }

  function apply() {
    const matrixDone = patchMatrix();
    const f07Done = patchF07();
    patchReviewContext();
    return matrixDone && f07Done;
  }

  window.SMART_RISK_SALINAS_UPDATE_20260831 = Object.freeze({ version: "2026.08.31.1", cut: CUT, apply });
  if (!apply()) {
    const timer = setInterval(() => {
      if (apply()) clearInterval(timer);
    }, 1000);
  }
})();
