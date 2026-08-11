(() => {
  "use strict";
  const baseline = window.SMART_RISK_PILOT_BASELINE;
  const seed = window.SEED_DATA;
  if (!baseline || !seed) return;
  const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
  const samePlace = (a,b) => {
    const left=normalize(a),right=normalize(b);
    return left===right || (left.length>4 && right.includes(left)) || (right.length>4 && left.includes(right));
  };
  seed.territorios = seed.territorios || [];
  (baseline.entities || []).filter(item=>String(item.level||'').toLowerCase()==='cantonal').forEach(item=>{
    const province=item.province||'',canton=item.shortName||item.canton||item.name||'';
    const exists=seed.territorios.some(row=>normalize(row.provincia)===normalize(province)&&samePlace(row.canton,canton));
    if(!exists)seed.territorios.push({id:item.entityId,provincia:province,canton,estado:'Activo',origen:'Línea base piloto'});
  });
  const territories = seed.territorios;
  const resolveTerritory = item => {
    if (!item || String(item.level || '').toLowerCase() !== 'cantonal') return null;
    const province = normalize(item.province);
    return territories.find(row => normalize(row.provincia)===province && samePlace(row.canton,item.shortName || item.canton || item.name)) || null;
  };
  const entityMap = new Map();
  const entities = (baseline.entities || []).map(item => {
    const territory = resolveTerritory(item);
    const record = {...item, territorioId: territory?.id || '', canton: territory?.canton || item.shortName || '', provincia: territory?.provincia || item.province || ''};
    entityMap.set(item.entityId, record);
    return record;
  });
  const currentF07 = window.SMART_RISK_F07_CURRENT;
  const followupSource = currentF07?.followups?.length ? currentF07.followups : (baseline.followups || []);
  const followups = followupSource.map(item => {
    const entity = entityMap.get(item.entityId);
    const evidence = item.evidenceUrl || item.evidenceFile || item.evidenceDescription || '';
    return {
      ...item,
      tipo: 'Acción · seguimiento F07',
      title: item.actionTitle || item.actionCode || 'Seguimiento F07 sin título',
      detail: item.progressDescription || item.nextStep || item.criticalGap || 'Seguimiento territorial recibido',
      estado: item.status || 'Sin estado',
      avance: item.declaredProgress,
      responsable: item.responsible || '',
      evidencia: evidence,
      updatedAt: item.submissionTime || '',
      territorioId: entity?.territorioId || '',
      provincia: entity?.provincia || item.province || '',
      canton: entity?.canton || item.canton || '',
      accionId: item.actionId || item.accionId || '',
      sitioId: item.siteId || item.sitioId || '',
      payload: {
        origen: 'F07',
        formato: item.sourceFormat || '',
        periodo: item.period || '',
        codigoAccion: item.actionCode || '',
        accion: item.actionTitle || '',
        estado: item.status || '',
        avance: item.declaredProgress,
        descripcionAvance: item.progressDescription || '',
        brechaCritica: item.criticalGap || '',
        proximoPaso: item.nextStep || '',
        responsable: item.responsible || '',
        proximaFechaReporte: item.nextReportDate || '',
        evidencia: evidence,
        estadoEvidencia: item.evidenceState || '',
        observaciones: item.observations || '',
        fechaEnvio: item.submissionTime || '',
        vinculacionAccion: item.actionLinkState || '',
        vinculacionSitio: item.siteLinkState || ''
      }
    };
  });
  const mergeBy = (base, incoming, key) => {
    const map = new Map((base || []).map(item => [item?.[key], item]));
    incoming.forEach(item => map.set(item?.[key], {...(map.get(item?.[key]) || {}), ...item}));
    return [...map.values()];
  };
  seed.entidadesSeguimiento = mergeBy(seed.entidadesSeguimiento || [], entities, 'entityId');
  seed.seguimientos = mergeBy(seed.seguimientos || [], followups, 'followupId');
  seed._pilotFollowup = currentF07
    ? {config: currentF07.config, summary: currentF07.summary}
    : {config: baseline.config, summary: baseline.summary};
  window.SMART_RISK_PILOT_BRIDGE = Object.freeze({version:'14.3.0', mode:'current-interface-data-bridge'});
})();
