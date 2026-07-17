(function () {
  "use strict";

  window.SmartRisk = window.SmartRisk || {};

  window.SmartRisk.MockData = Object.freeze({
    metrics: [
      { label: "Cantones priorizados", value: 49, note: "Cobertura referencial de Zona 5", icon: "map", trend: "+6 este mes" },
      { label: "Planes en seguimiento", value: 32, note: "Planes con revisión activa", icon: "document", trend: "+4 actualizados" },
      { label: "Acciones registradas", value: 186, note: "Acciones preparatorias y operativas", icon: "check", trend: "+18 verificadas" },
      { label: "Alertas operativas", value: 7, note: "Requieren atención prioritaria", icon: "alert", trend: "3 críticas" }
    ],

    progress: [
      { label: "Análisis de riesgos", value: 78 },
      { label: "Fortalecimiento", value: 64 },
      { label: "Preparación y respuesta", value: 71 },
      { label: "Seguimiento documental", value: 83 }
    ],

    trend: [
      { label: "Ene", value: 42 },
      { label: "Feb", value: 48 },
      { label: "Mar", value: 55 },
      { label: "Abr", value: 61 },
      { label: "May", value: 68 },
      { label: "Jun", value: 76 },
      { label: "Jul", value: 82 }
    ],

    territories: [
      { provincia: "Guayas", cantones: 25, planes: 16, avance: 86, estado: "Seguimiento" },
      { provincia: "Los Ríos", cantones: 13, planes: 8, avance: 72, estado: "Seguimiento" },
      { provincia: "Santa Elena", cantones: 3, planes: 3, avance: 61, estado: "Ajustes" },
      { provincia: "Bolívar", cantones: 7, planes: 4, avance: 55, estado: "Ajustes" },
      { provincia: "Galápagos", cantones: 3, planes: 1, avance: 68, estado: "Seguimiento" }
    ],

    activities: [
      { text: "Se actualizó el seguimiento documental de Guayas.", time: "Hace 18 minutos" },
      { text: "Se registraron nuevas acciones para Los Ríos.", time: "Hace 1 hora" },
      { text: "Se identificaron ajustes pendientes en Santa Elena.", time: "Hace 3 horas" },
      { text: "El núcleo visual del Sprint 1.2A fue instalado.", time: "Hoy" }
    ]
  });
})();
