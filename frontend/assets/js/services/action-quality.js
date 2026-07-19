window.SmartRisk = window.SmartRisk || {};

(function () {
  const SR = SmartRisk;
  const TARGET_DATE = "2026-07-23";

  const text = value => String(value ?? "").trim();
  const has = value => Boolean(text(value));
  const list = value => Array.isArray(value) ? value.filter(Boolean) : [];

  function criterion(id, label, ok, recommendation, weight = 10) {
    return { id, label, ok: Boolean(ok), recommendation, weight };
  }

  function evaluate(action = {}) {
    const evidence = list(action.evidencias);
    const criteria = [
      criterion("descripcion", "Descripción operativa clara", text(action.descripcion).length >= 35, "Precisar qué se ejecutará, alcance y resultado esperado."),
      criterion("ubicacion", "Ubicación o cobertura definida", has(action.sitio) && !/sin relación|sin definir/i.test(text(action.sitio)), "Vincular un sitio, tramo, área o cobertura territorial concreta."),
      criterion("responsable", "Responsable operativo identificado", has(action.responsable) && !/sin responsable/i.test(text(action.responsable)), "Asignar unidad o persona responsable de la ejecución."),
      criterion("plazo", "Fechas de inicio y fin", has(action.fechaInicio) && has(action.fechaFin), "Registrar fechas de inicio y cumplimiento."),
      criterion("recursos", "Recursos o logística definidos", text(action.recursos).length >= 12, "Detallar personal, equipos, insumos, presupuesto o logística requerida."),
      criterion("producto", "Producto verificable esperado", text(action.productoEsperado).length >= 12, "Definir el producto concreto que demostrará la ejecución."),
      criterion("indicador", "Indicador de cumplimiento", text(action.indicador).length >= 8, "Incorporar un indicador medible con unidad o meta."),
      criterion("evidencia", "Verificables registrados", evidence.length > 0, "Adjuntar o describir al menos un verificable documental, fotográfico o geográfico."),
      criterion("articulacion", "Articulación institucional", text(action.articulacion).length >= 8, "Identificar instituciones o áreas que deben coordinar la acción."),
      criterion("viabilidad", "Siguiente paso y compromiso", text(action.compromisoProximaActualizacion).length >= 12, "Registrar qué se ejecutará antes de la próxima actualización."),
    ];

    const totalWeight = criteria.reduce((sum, item) => sum + item.weight, 0);
    const earned = criteria.filter(item => item.ok).reduce((sum, item) => sum + item.weight, 0);
    const score = Math.round((earned / totalWeight) * 100);
    const gaps = criteria.filter(item => !item.ok);

    let level = "No ejecutable";
    let className = "critical";
    if (score >= 80) { level = "Operativamente viable"; className = "good"; }
    else if (score >= 60) { level = "Requiere ajustes"; className = "warning"; }
    else if (score >= 40) { level = "Brecha importante"; className = "high"; }

    return { score, level, className, criteria, gaps };
  }

  function reviewState(action = {}) {
    return action.estadoRevision || "Borrador";
  }

  function isReadyForReview(action = {}) {
    const quality = evaluate(action);
    return quality.score >= 60 && list(action.evidencias).length > 0 && has(action.compromisoProximaActualizacion);
  }

  function deadlineInfo(now = new Date()) {
    const target = new Date(`${TARGET_DATE}T23:59:59`);
    const current = new Date(now);
    current.setHours(0, 0, 0, 0);
    const days = Math.ceil((target - current) / 86400000);
    return {
      date: TARGET_DATE,
      label: "23 de julio de 2026",
      days,
      message: days > 1 ? `Faltan ${days} días` : days === 1 ? "Falta 1 día" : days === 0 ? "Actualización hoy" : `Vencida hace ${Math.abs(days)} días`
    };
  }

  function normalize(action = {}) {
    return {
      ...action,
      estadoRevision: reviewState(action),
      recursos: action.recursos || "",
      productoEsperado: action.productoEsperado || "",
      indicador: action.indicador || "",
      articulacion: action.articulacion || "",
      compromisoProximaActualizacion: action.compromisoProximaActualizacion || "",
      fechaCompromiso: action.fechaCompromiso || TARGET_DATE,
      tipoVerificable: action.tipoVerificable || "Documental",
      solicitudAsistencia: action.solicitudAsistencia || "",
      ultimaActualizacion: action.ultimaActualizacion || "",
      actualizadoPor: action.actualizadoPor || "",
      historial: Array.isArray(action.historial) ? action.historial : []
    };
  }

  function withAudit(previous, next, actor) {
    const normalized = normalize(next);
    const changes = [];
    ["estado", "avance", "estadoRevision", "responsable", "fechaFin"].forEach(key => {
      if (String(previous?.[key] ?? "") !== String(normalized[key] ?? "")) {
        changes.push(`${key}: ${previous?.[key] ?? "sin dato"} → ${normalized[key] ?? "sin dato"}`);
      }
    });
    const previousEvidence = list(previous?.evidencias).length;
    const nextEvidence = list(normalized.evidencias).length;
    if (nextEvidence !== previousEvidence) changes.push(`verificables: ${previousEvidence} → ${nextEvidence}`);

    const timestamp = new Date().toISOString();
    return {
      ...normalized,
      ultimaActualizacion: timestamp,
      actualizadoPor: actor || SR.Config?.currentUser?.name || "Usuario SmartRisk",
      historial: [
        {
          fecha: timestamp,
          usuario: actor || SR.Config?.currentUser?.name || "Usuario SmartRisk",
          cambios: changes.length ? changes : ["Actualización de ficha operativa"]
        },
        ...normalize(previous || {}).historial
      ].slice(0, 30)
    };
  }

  SR.ActionQuality = { TARGET_DATE, evaluate, reviewState, isReadyForReview, deadlineInfo, normalize, withAudit };
})();
