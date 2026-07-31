import fs from 'node:fs';
import path from 'node:path';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const fail=message=>{throw new Error(`VALIDACIÓN PANEL CIENTÍFICO RC7: ${message}`)};
const expect=(condition,message)=>{if(!condition)fail(message)};
const includes=(text,value,label)=>expect(text.includes(value),`${label}: falta ${value}`);

const manifest=JSON.parse(read('RELEASE_MANIFEST.json'));
const gate=read('preview-rc14.4.4/access-gate-preview.js');
const index=read('preview-rc14.4.4/index.html');
const fix=read('preview-rc14.4.4/scientific-quality-fix-20260731.js');

expect(manifest.release==='RC14.4.4 RC7','release incorrecto');
expect(manifest.build==='14.4.4-rc7','build incorrecto');
expect(manifest.scientificCorrectionVersion==='2026-07-31T00:05:00-05:00','versión de corrección científica incorrecta');
expect(manifest.counts.territories===56,'el universo debe ser 56 territorios');
expect(manifest.counts.plansAvailable===56,'deben existir 56 planes disponibles');
expect(manifest.counts.validatedPlans===52,'deben mantenerse 52 planes validados');
expect(manifest.acceptance.scientificIndicatorsDerivedFromCounts===true,'los porcentajes deben derivarse de conteos');
expect(manifest.acceptance.processedReviewedValidatedSeparated===true,'procesado, revisado y validado deben permanecer separados');

includes(gate,'scientific-quality-fix-20260731.js','compuerta de acceso');
includes(index,'access-gate-preview.js?v=14.4.4-rc7','control de caché');
includes(fix,'territorialCoverage:percent(plansReceived,canonical)','cobertura documental');
includes(fix,'reviewCompletion:percent(plansEvaluated,plansReceived)','extracción documental');
includes(fix,'validatedPlans','validación documental');
includes(fix,'Los Ríos cuenta como plan recibido y revisado al 68 %','tratamiento de Los Ríos');
includes(fix,'losRiosValidated:false','control de no validación de Los Ríos');

console.log(JSON.stringify({
  ok:true,
  release:manifest.release,
  scientificCorrectionVersion:manifest.scientificCorrectionVersion,
  territories:manifest.counts.territories,
  plansAvailable:manifest.counts.plansAvailable,
  validatedPlans:manifest.counts.validatedPlans,
  expectedCoverage:100,
  expectedExtraction:100,
  expectedValidation:Math.round(manifest.counts.validatedPlans/manifest.counts.territories*100),
  losRiosValidated:false
},null,2));
