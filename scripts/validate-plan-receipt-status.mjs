import fs from 'node:fs';

const read=file=>fs.readFileSync(file,'utf8');
const fail=message=>{throw new Error(`VALIDACIÓN RECEPCIÓN DE PLANES RC7: ${message}`)};
const expect=(condition,message)=>{if(!condition)fail(message)};

const moduleText=read('preview-rc14.4.4/plan-receipt-status-fix-20260731.js');
const performanceText=read('preview-rc14.4.4/review-performance-fix-20260731.js');
const gate=read('preview-rc14.4.4/access-gate-preview.js');
const index=read('preview-rc14.4.4/index.html');
const manifest=JSON.parse(read('RELEASE_MANIFEST.json'));

for(const value of [
  'TER-REG-ESPECIAL-GALAPAGOS',
  'TER-GALAPAGOS-SAN-CRISTOBAL',
  'TER-PROV-LOS-RIOS',
  'Recibido · devuelto',
  'score:null',
  'planReceived:true',
  'received-independent-from-signature-link-review-validation'
]) expect(moduleText.includes(value),`falta ${value}`);

for(const value of [
  '1M79_NXC7Q3oZsXTS8ZJnd5XTUaRfjtIp',
  '1VtlXrd5qoL2jW-2UUw-6GD8dduyQedzn',
  '1OORaykZcWJHJe3zPWB9dXn_pCc84RKDT',
  '11cWFIu56jVBp-VWVB_gyeBumfrF4u1_I'
]) expect(moduleText.includes(value),`falta evidencia Drive ${value}`);

expect(moduleText.includes('score:84'),'Galápagos provincial no conserva 84 %');
expect(moduleText.includes('score:68'),'Los Ríos provincial no conserva 68 %');
expect(moduleText.includes('observer.disconnect()'),'el observador no se desconecta antes de escribir');
expect(moduleText.includes('note.textContent!==desiredNote'),'la corrección no es idempotente');
expect(moduleText.includes('observerStrategy:"idempotent-disconnect-write-reconnect"'),'falta declarar la estrategia segura');
expect(performanceText.includes('CHECKLIST_BATCH=25'),'el checklist no está paginado');
expect(performanceText.includes('requestAnimationFrame'),'falta renderizado diferido');
expect(gate.includes('plan-receipt-status-fix-20260731.js'),'la compuerta no carga la reconciliación');
expect(gate.includes('review-performance-fix-20260731.js'),'la compuerta no carga el optimizador');
expect(gate.includes('BUILD="14.4.4-rc7"'),'la compuerta no está en RC7');
expect(index.includes('access-gate-preview.js?v=14.4.4-rc7'),'no se actualizó la caché RC7');
expect(index.includes('VERSIÓN ESTABLE · RC14.4.4 RC7'),'la interfaz no identifica RC7');
expect(manifest.planReceiptCorrectionVersion==='2026-07-31T12:15:00-05:00','versión documental incorrecta');
expect(manifest.reviewPerformanceVersion==='14.4.4-rc7','versión de rendimiento incorrecta');
expect(manifest.counts.plansAvailable===56,'el manifiesto no conserva 56 planes');
expect(manifest.acceptance.receiptIndependentFromSignature===true,'falta política de firma');
expect(manifest.acceptance.receiptIndependentFromFileLink===true,'falta política de enlace');
expect(manifest.acceptance.receiptIndependentFromTechnicalValidation===true,'falta política de validación');
expect(manifest.acceptance.reviewObserverIdempotent===true,'falta aceptación del observador idempotente');
expect(manifest.acceptance.reviewChecklistPaginated===true,'falta aceptación del checklist paginado');

console.log(JSON.stringify({
  ok:true,
  release:manifest.release,
  plansAvailable:56,
  galapagosScore:84,
  sanCristobalStatus:'Recibido y devuelto',
  losRiosScore:68,
  observer:'idempotent-disconnect-write-reconnect',
  checklistBatch:25
},null,2));
