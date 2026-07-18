window.SmartRisk = window.SmartRisk || {};

(function () {
  const SR = SmartRisk;
  const TARGET_DATE = new Date("2026-07-23T23:59:59");

  function norm(value) {
    return String(value || "").trim().toLowerCase();
  }

  function daysUntilTarget() {
    return Math.ceil((TARGET_DATE.getTime() - Date.now()) / 86400000);
  }

  function evaluate(actions) {
    const rows = (actions || []).map(action => {
      const quality = SR.ActionQuality.evaluate(action);
      const review = SR.ActionQuality.reviewState(action);
      const updatedAt = action.ultimaActualizacion ? new Date(action.ultimaActualizacion) : null;
      const staleDays = updatedAt ? Math.floor((Date.now() - updatedAt.getTime()) / 86400000) : null;
      const due = action.fechaFin ? new Date(`${action.fechaFin}T23:59:59`) : null;
      return {
        action,
        quality,
        review,
        isBlocked: norm(action.estado) === "bloqueada",
        isOverdue: Boolean(due && due < new Date() && norm(action.estado) !== "completada"),
        needsReview: ["enviado a revisión", "corregido"].includes(norm(review)),
        observed: norm(review) === "observado",
        noEvidence: !(action.evidencias || []).length,
        noCommitment: !String(action.compromisoProximaActualizacion || "").trim(),
        assistance: Boolean(String(action.solicitudAsistencia || "").trim()),
        stale: staleDays === null || staleDays >= 7,
        staleDays
      };
    });

    return {
      rows,
      counters: {
        critical: rows.filter(row => row.quality.score < 60).length,
        review: rows.filter(row => row.needsReview).length,
        blocked: rows.filter(row => row.isBlocked).length,
        overdue: rows.filter(row => row.isOverdue).length,
        evidence: rows.filter(row => row.noEvidence).length,
        commitments: rows.filter(row => row.noCommitment).length,
        assistance: rows.filter(row => row.assistance).length,
        stale: rows.filter(row => row.stale).length
      }
    };
  }

  function tasks(actions, role) {
    const result = evaluate(actions);
    const config = {
      coordinacion: [
        ["Validar acciones enviadas", result.rows.filter(row => row.needsReview), "Revisión institucional pendiente"],
        ["Atender brechas críticas", result.rows.filter(row => row.quality.score < 60), "Calidad operativa menor a 60 %"],
        ["Resolver solicitudes de asistencia", result.rows.filter(row => row.assistance), "El territorio solicita acompañamiento técnico"],
        ["Gestionar acciones bloqueadas", result.rows.filter(row => row.isBlocked), "La ejecución reporta un bloqueo"]
      ],
      ugr: [
        ["Registrar compromiso al 23 de julio", result.rows.filter(row => row.noCommitment), "Falta definir la siguiente actividad"],
        ["Cargar verificables", result.rows.filter(row => row.noEvidence), "La acción no cuenta con evidencia"],
        ["Corregir acciones observadas", result.rows.filter(row => row.observed), "Coordinación devolvió la acción"],
        ["Actualizar acciones sin movimiento", result.rows.filter(row => row.stale), "No existe actualización reciente"]
      ],
      autoridad: [
        ["Revisar acciones vencidas", result.rows.filter(row => row.isOverdue), "Compromisos fuera de plazo"],
        ["Revisar acciones bloqueadas", result.rows.filter(row => row.isBlocked), "Requieren decisión o gestión"],
        ["Revisar brechas críticas", result.rows.filter(row => row.quality.score < 60), "Acciones con baja viabilidad operativa"]
      ],
      coe: [
        ["Priorizar acciones de respuesta", result.rows.filter(row => norm(row.action.linea) === "respuesta" && row.action.estado !== "Completada"), "Seguimiento operativo de respuesta"],
        ["Confirmar recursos y logística", result.rows.filter(row => !String(row.action.recursos || "").trim()), "No se han detallado medios de ejecución"],
        ["Revisar acciones bloqueadas", result.rows.filter(row => row.isBlocked), "Requieren articulación interinstitucional"]
      ]
    };

    return (config[role] || config.coordinacion)
      .filter(([, rows]) => rows.length)
      .map(([title, rows, reason]) => ({ title, reason, count: rows.length, rows }))
      .sort((a, b) => b.count - a.count);
  }

  SR.OperationalIntelligence = { TARGET_DATE, daysUntilTarget, evaluate, tasks };
})();
