window.CZ5_CASES = {
  updatedAt: '2026-07-18T21:00:00-05:00',
  scope: 'Coordinación Zonal 5',
  methodology: {
    rule: 'Un caso representa un evento territorial, no cada correo o boletín que lo menciona.',
    hierarchy: [
      'SITREP consolidado para acumulados, comparación territorial y recurrencia.',
      'Reporte de monitoreo o bitácora para estado, cambios, fuentes y acciones del turno.',
      'EVIN, acta, ficha territorial o evidencia de campo para confirmar afectaciones y cierre.'
    ],
    integralCriteria: [
      'amenaza y desencadenante',
      'localización y recurrencia',
      'población, bienes y servicios expuestos',
      'vulnerabilidades que explican el daño',
      'capacidades disponibles y brechas',
      'respuesta ejecutada y coordinación',
      'resultado, evidencia y condición de cierre',
      'lección transferible y riesgo residual'
    ]
  },
  sources: [
    {
      id: 'SITREP-GYE-30',
      title: 'SITREP Nro. 30 Lluvias – Guayas',
      cutoff: '2026-06-15T19:00:00-05:00',
      coverage: '01/01/2026–15/06/2026',
      status: 'Consolidado provincial revisado',
      note: 'Cifras acumuladas sujetas a actualización institucional.'
    },
    {
      id: 'RMEP-GYE-0238',
      title: 'Reporte de Monitoreo de Amenazas y Eventos Peligrosos No. 0238',
      cutoff: '2026-07-18T20:51:00-05:00',
      coverage: 'Turno 18–19/07/2026',
      status: 'Reporte operativo revisado',
      note: 'Distingue eventos activos, finalizados y en levantamiento EVIN.'
    }
  ],
  summaries: [
    {
      province: 'Guayas',
      period: '01/01/2026–15/06/2026',
      events: 550,
      eventProfile: { inundaciones: 399, lluviasIntensas: 95, vendavales: 20, erosionHidrica: 13, deslizamientos: 8 },
      impacts: {
        peopleImpacted: 63897,
        peopleAffected: 3139,
        homesAffected: 13449,
        homesDestroyed: 12,
        agriculturalHectares: 23465.53,
        educationFacilitiesImpacted: 239,
        healthFacilitiesAffected: 4
      },
      source: 'SITREP-GYE-30',
      interpretation: 'La inundación representa 72,55 % de los eventos. Marzo concentró el máximo de eventos e impacto humano.'
    }
  ],
  cases: [
    {
      id: 'CASO-GYE-DAULE-LLUVIAS-2026',
      province: 'Guayas',
      canton: 'Daule',
      hazard: 'Inundaciones y lluvias intensas',
      status: 'Antecedente acumulado; requiere desagregación por sitio',
      facts: { events: 67, floods: 47, intenseRain: 18, peopleImpacted: 3916, homesAffected: 1247, animalsAffected: 52, animalsDead: 423 },
      exposure: 'Población, viviendas, establecimientos educativos y medios de vida pecuarios.',
      vulnerability: 'El consolidado evidencia daño recurrente, pero no identifica por sí solo drenajes, cotas, asentamientos ni fragilidades por sitio.',
      response: 'Asistencia registrada: 180 kits SNGR para 180 familias y 270 kits del sistema para 270 familias.',
      gap: 'Faltan geometrías de afectación, sitios, profundidad/duración del agua, hogares únicos atendidos y vínculo entre ayuda y reducción del riesgo.',
      criterion: 'Priorizar levantamiento georreferenciado por sitio y recurrencia; no asignar nivel cantonal únicamente por el acumulado.',
      source: 'SITREP-GYE-30',
      confidence: 'Alta para acumulados; media-baja para explicación causal por sitio.'
    },
    {
      id: 'CASO-GYE-SALITRE-LLUVIAS-2026',
      province: 'Guayas',
      canton: 'Salitre',
      hazard: 'Inundaciones y lluvias intensas',
      status: 'Antecedente prioritario',
      facts: { events: 31, peopleImpacted: 18100, homesAffected: 2407, peopleAffected: 36 },
      exposure: 'Concentración más alta de impacto humano reportado en el consolidado.',
      vulnerability: 'Debe comprobarse si el impacto se concentra en localidades recurrentes, sistemas de drenaje, riberas o accesos.',
      response: 'Respuesta institucional y asistencia humanitaria registradas en el SITREP.',
      gap: 'No confundir población impactada acumulada con población única actualmente expuesta.',
      criterion: 'Prioridad alta para verificación territorial, trazabilidad de localidades y medidas estructurales/no estructurales.',
      source: 'SITREP-GYE-30',
      confidence: 'Alta para el acumulado provincial.'
    },
    {
      id: 'CASO-GYE-DURAN-VENDAVAL-20260609',
      province: 'Guayas',
      canton: 'Durán',
      sector: 'Cooperativa 1 de Mayo',
      hazard: 'Lluvia y vientos fuertes',
      status: 'Finalizado operativamente; riesgo residual por validar',
      facts: { familiesAffected: 1, peopleAffected: 5, homesAffected: 1 },
      exposure: 'Familia en vivienda de caña de una planta.',
      vulnerability: 'Fragilidad constructiva y riesgo de colapso.',
      response: 'Levantamiento GAD, asistencia, reubicación familiar y seguimiento SNGR.',
      gap: 'El cierre de la emergencia no confirma rehabilitación segura ni reducción de vulnerabilidad.',
      criterion: 'Separar “evento finalizado” de “riesgo mitigado”; exigir evidencia de solución habitacional o condición segura.',
      source: 'SITREP-GYE-30',
      confidence: 'Alta para respuesta reportada.'
    },
    {
      id: 'CASO-GYE-GYE-PLEAMAR-20260718',
      province: 'Guayas',
      canton: 'Guayaquil',
      sector: 'Febres Cordero, Cooperativa 24 de Julio',
      hazard: 'Desbordamiento del Estero Salado por pleamar',
      status: 'Finalizado en el turno; antecedente recurrente',
      facts: { roadsWithWaterAccumulation: true, peopleImpactPending: true },
      exposure: 'Calles, avenidas, movilidad y población del sector; afectación humana no cuantificada.',
      vulnerability: 'Posible exposición recurrente a pleamar y limitación de drenaje, pendiente de comprobación.',
      response: 'Monitoreo por cámaras de Segura EP, ECU 911 Samborondón y SNGR.',
      gap: 'Faltan cota, extensión y duración de anegamiento, población afectada y umbral de activación.',
      criterion: 'Vincular pronóstico de mareas, polígonos históricos, cámaras y protocolo de alerta/acción.',
      source: 'RMEP-GYE-0238',
      confidence: 'Alta para ocurrencia; baja para impactos no levantados.'
    },
    {
      id: 'CASO-GYE-GYE-INCENDIO-ESTRUCTURAL-20260718',
      province: 'Guayas',
      canton: 'Guayaquil',
      sector: 'Tarqui, Monte Sinaí, Coop. Monte Lindo',
      hazard: 'Incendio estructural',
      status: 'Liquidado; EVIN pendiente',
      facts: { familiesUnderAssessment: 1, homesUnderAssessment: 1, totalLossReported: true },
      exposure: 'Familia y vivienda de construcción de caña.',
      vulnerability: 'Material combustible y posible acceso/servicios limitados; debe validarse.',
      response: 'Extinción por Cuerpo de Bomberos; GAD debe levantar información; seguimiento SNGR.',
      gap: 'No cerrar afectaciones mientras el EVIN esté pendiente.',
      criterion: 'Escalar automáticamente fichas con pérdida total y EVIN pendiente; definir alojamiento, asistencia y recuperación.',
      source: 'RMEP-GYE-0238',
      confidence: 'Alta para incendio y pérdida; provisional para afectaciones.'
    }
  ],
  warnings: [
    'No sumar reportes de turno como si fueran eventos diferentes.',
    '“Finalizado” describe el estado operativo del evento, no necesariamente la mitigación del riesgo residual.',
    '“En levantamiento” y “por evaluar” son datos provisionales y deben conservar esa etiqueta.',
    'Los acumulados cantonales orientan prioridad, pero una decisión requiere desagregación territorial y temporal.',
    'La base revisada todavía no permite afirmar cobertura equivalente para todas las provincias de la Zona 5.'
  ]
};
