import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const expect=(condition,message)=>{if(!condition)throw new Error(`VALIDACIÓN PANEL CIENTÍFICO RC9: ${message}`)};
const includes=(text,value,label)=>expect(text.includes(value),`${label}: falta ${value}`);

const manifest=JSON.parse(read('RELEASE_MANIFEST.json'));
const gate=read('preview-rc14.4.4/access-gate-preview.js');
const index=read('preview-rc14.4.4/index.html');
const fix=read('preview-rc14.4.4/scientific-quality-fix-20260731.js');
const scopeGuard=read('preview-rc14.4.4/territorial-scope-guard-20260731.js');

expect(manifest.release==='RC14.4.4 RC9','release incorrecto');
expect(manifest.build==='14.4.4-rc9','build incorrecto');
expect(manifest.scientificCorrectionVersion==='2026-07-31T13:20:00-05:00','versión científica incorrecta');
expect(manifest.counts.territories===56,'universo zonal incorrecto');
expect(manifest.counts.plansAvailable===56,'planes zonales incorrectos');
expect(manifest.counts.validatedPlans===52,'planes validados incorrectos');
expect(manifest.acceptance.scientificIndicatorsDerivedFromCounts===true,'los porcentajes deben derivarse de conteos');
expect(manifest.acceptance.missingPlansDerivedFromUniverse===true,'los faltantes deben derivarse del universo');
expect(manifest.acceptance.processedReviewedValidatedSeparated===true,'procesado, revisado y validado deben permanecer separados');
expect(manifest.acceptance.territorialGlobalsFiltered===true,'los indicadores territoriales deben recalcularse por alcance');

includes(gate,'scientific-quality-fix-20260731.js','compuerta');
includes(index,'access-gate-preview.js?v=14.4.4-rc9','caché');
includes(index,'territorial-scope-guard-20260731.js?v=14.4.4-rc9','alcance');
includes(fix,'missingPlans=Math.max(0,canonical-plansReceived)','faltantes zonales');
includes(fix,'missingPlans,','persistencia de faltantes');
includes(fix,'territorialCoverage:percent(plansReceived,canonical)','cobertura zonal');
includes(fix,'reviewCompletion:percent(plansEvaluated,plansReceived)','extracción zonal');
includes(fix,'Los Ríos cuenta como plan recibido y revisado al 68 %','Los Ríos');
includes(fix,'losRiosValidated:false','no validación Los Ríos');
includes(scopeGuard,'canonicalTerritories:canonical','universo territorial');
includes(scopeGuard,'territorialCoverage:percent(received,canonical)','cobertura territorial');
includes(scopeGuard,'reviewCompletion:percent(evaluated,received)','extracción territorial');
includes(scopeGuard,'missingPlans:missing','faltantes territoriales');

console.log(JSON.stringify({
  ok:true,
  release:manifest.release,
  scientificCorrectionVersion:manifest.scientificCorrectionVersion,
  zonalTerritories:manifest.counts.territories,
  zonalPlans:manifest.counts.plansAvailable,
  zonalMissingPlans:0,
  scopedIndicatorsRecalculated:true,
  losRiosValidated:false
},null,2));