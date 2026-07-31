import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { createHash } from 'node:crypto';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { throw new Error(`VALIDACIÓN RC14.4.4 RC5: ${message}`); };
const expect = (condition, message) => { if (!condition) fail(message); };
const includes = (text, value, label) => expect(text.includes(value), `${label}: falta ${value}`);
const sha256 = value => createHash('sha256').update(value).digest('hex');

function decodePayload(text, label) {
  const match = text.match(/const PAYLOAD="([A-Za-z0-9+/=]+)";/);
  expect(match, `${label}: no se encontró PAYLOAD`);
  try {
    const raw = zlib.gunzipSync(Buffer.from(match[1], 'base64'));
    return { raw, data: JSON.parse(raw.toString('utf8')) };
  } catch (error) {
    fail(`${label}: paquete ilegible: ${error.message}`);
  }
}

function decodeCorrection(text) {
  const match = text.match(/const CORRECTION=(\{[^\n]+\});\nconst STORE_KEY/);
  expect(match, 'corrección Los Ríos: no se encontró CORRECTION');
  try { return JSON.parse(match[1]); }
  catch (error) { fail(`corrección Los Ríos ilegible: ${error.message}`); }
}

const manifest = JSON.parse(read('RELEASE_MANIFEST.json'));
expect(manifest.product === 'SmartRisk CZ5', 'producto incorrecto');
expect(manifest.release === 'RC14.4.4 RC5', 'release incorrecto');
expect(manifest.build === '14.4.4-rc5', 'build incorrecto');
expect(manifest.dataCut === '2026-07-30', 'corte incorrecto');
expect(manifest.status === 'stable', 'release no estable');
for (const file of manifest.requiredFiles) expect(fs.existsSync(path.join(root, file)), `archivo obligatorio inexistente: ${file}`);

const index = read('preview-rc14.4.4/index.html');
const gate = read('preview-rc14.4.4/access-gate-preview.js');
const principalText = read('preview-rc14.4.4/latest-data-update.js');
const completionText = read('preview-rc14.4.4/followup-completion-20260730.js');
const correctionText = read('preview-rc14.4.4/los-rios-plan-correction-20260730.js');
const baselineText = read('pilot-baseline-data.js');
const workflow = read('.github/workflows/deploy-pages.yml');
const rules = read('firestore.rules');

includes(index, 'VERSIÓN ESTABLE · RC14.4.4 · DATOS 30-07-2026', 'index');
includes(index, '14.4.4-rc5', 'index');
for (const file of ['latest-data-update.js','followup-completion-20260730.js','los-rios-plan-correction-20260730.js']) includes(gate, file, 'compuerta');
includes(gate, 'mode:"stable-r023-latest-data"', 'compuerta');
includes(gate, 'diogenes.coello@gestionderiesgos.gob.ec', 'administración institucional');
includes(principalText, 'value.entidadesSeguimiento.length===56', 'migración principal');
includes(principalText, 'value.seguimientos.length>=106', 'migración principal');
includes(principalText, 'plansReceived:55', 'línea base documental');
includes(completionText, 'SMART_RISK_FOLLOWUP_COMPLETION', 'complemento');
includes(completionText, 'Sincronizado · 106 seguimientos', 'complemento');
includes(correctionText, 'TER-PROV-LOS-RIOS', 'corrección Los Ríos');
includes(correctionText, 'planReviewScore":68', 'valoración Los Ríos');
includes(correctionText, 'corrección progresiva', 'estado Los Ríos');
includes(correctionText, 'Sincronizado · 56 planes', 'persistencia documental');
includes(rules, "'diogenes.coello@gestionderiesgos.gob.ec'", 'reglas Firestore');
includes(rules, "profile().rol == 'Administrador'", 'reglas Firestore');
includes(workflow, 'node scripts/validate-release.mjs', 'despliegue');
includes(workflow, 'los-rios-plan-correction-20260730.js', 'despliegue');

const principalDecoded = decodePayload(principalText, 'actualización principal');
const completionDecoded = decodePayload(completionText, 'complemento de seguimientos');
const delta = principalDecoded.data;
const completion = completionDecoded.data;
const correction = decodeCorrection(correctionText);

expect(sha256(principalDecoded.raw) === manifest.packageHashes.principalRawSha256, 'hash principal distinto');
expect(sha256(completionDecoded.raw) === manifest.packageHashes.completionRawSha256, 'hash complemento distinto');
expect(delta?.config?.version === manifest.dataVersion, 'versión principal distinta');
expect(delta?.config?.cutDate === manifest.dataCut, 'corte principal distinto');
expect(completion?.version === manifest.completionVersion, 'versión complemento distinta');
expect(completion?.cutDate === manifest.dataCut, 'corte complemento distinto');
expect(correction?.version === manifest.correctionVersion, 'versión corrección distinta');
expect(correction?.cutDate === manifest.dataCut, 'corte corrección distinto');

expect(Array.isArray(delta.entityPatches), 'entityPatches principal inválido');
expect(Array.isArray(delta.followups), 'followups principal inválido');
expect(Array.isArray(delta.planPatches), 'planPatches principal inválido');
expect(Array.isArray(completion.entityPatches), 'entityPatches complemento inválido');
expect(Array.isArray(completion.followups), 'followups complemento inválido');
expect(completion.followups.length === 3, `complemento con ${completion.followups.length} seguimientos, se esperaban 3`);
expect(completion.entityPatches.length === 3, `complemento con ${completion.entityPatches.length} entidades, se esperaban 3`);

for (const [summaryKey, manifestKey] of [
  ['universe','territories'],
  ['formalPlanDeliveries','formalPlanDeliveries'],
  ['validatedPlans','validatedPlans'],
  ['returnedPlans','returnedPlans'],
  ['territorialFollowups','followupsMinimum']
]) expect(Number(delta?.summary?.[summaryKey]) === Number(manifest.counts[manifestKey]), `${summaryKey} no coincide con ${manifestKey}`);
expect(Number(delta?.summary?.planDocumentsAvailable) === 55, 'la línea base debe conservar 55 planes antes de la corrección');
expect(Number(delta.summary.planDocumentsAvailable) + 1 === Number(manifest.counts.plansAvailable), 'la corrección no completa los 56 planes');

expect(correction.entityId === 'TER-PROV-LOS-RIOS', 'entityId Los Ríos incorrecto');
expect(correction.planDocumentAvailable === true, 'plan Los Ríos no disponible');
expect(correction.formalPlanDelivery === false, 'formalización Los Ríos debe seguir pendiente');
expect(Number(correction.planReviewScore) === 68, 'valoración Los Ríos distinta de 68');
expect(correction.planReviewClassification === 'Plan funcional parcial', 'clasificación Los Ríos incorrecta');
expect(correction.planCorrectionStatus === 'En corrección progresiva', 'estado Los Ríos incorrecto');
expect(correction.planFinalUrl.includes('1OORaykZcWJHJe3zPWB9dXn_pCc84RKDT'), 'URL plan Los Ríos incorrecta');
expect(correction.planReviewReportUrl.includes('11cWFIu56jVBp-VWVB_gyeBumfrF4u1_I'), 'URL revisión Los Ríos incorrecta');
expect(correction.planParticularities.includes('información parcial'), 'no se declara la visibilidad de información parcial');

const baselineMatch = baselineText.match(/const DATA = (\{[\s\S]*\});\s*window\.SMART_RISK_PILOT_BASELINE/);
expect(baselineMatch, 'línea base piloto no interpretable');
let baseline;
try { baseline = JSON.parse(baselineMatch[1]); }
catch (error) { fail(`línea base ilegible: ${error.message}`); }

const entities = new Map((baseline.entities || []).map(item => [item.entityId, { ...item }]));
for (const patch of delta.entityPatches) entities.set(patch.entityId, { ...(entities.get(patch.entityId) || {}), ...patch });
for (const patch of completion.entityPatches) entities.set(patch.entityId, { ...(entities.get(patch.entityId) || {}), ...patch });
entities.set(correction.entityId, { ...(entities.get(correction.entityId) || {}), ...correction });
expect(entities.size === manifest.counts.territories, `territorios reconstruidos=${entities.size}`);
const losRios = entities.get('TER-PROV-LOS-RIOS');
expect(losRios?.planDocumentAvailable === true, 'reconstrucción no incorpora plan Los Ríos');
expect(Number(losRios?.planReviewScore) === 68, 'reconstrucción no conserva 68 %');
expect(losRios?.planCorrectionStatus === 'En corrección progresiva', 'reconstrucción no conserva estado progresivo');

const followupKey = item => String(item?.followupId || item?.id || `${item?.submissionId || ''}|${item?.actionOrCommitment || item?.accion_o_compromiso || item?.description || ''}`);
const followups = new Map((baseline.followups || []).map(item => [followupKey(item), item]));
for (const item of delta.followups) followups.set(followupKey(item), { ...(followups.get(followupKey(item)) || {}), ...item });
for (const item of completion.followups) followups.set(followupKey(item), { ...(followups.get(followupKey(item)) || {}), ...item });
expect(followups.size >= manifest.counts.followupsMinimum, `seguimientos reconstruidos=${followups.size}`);

const planEntityIds = new Set();
for (const item of delta.planPatches) {
  expect(item.entityId, 'parche documental sin entityId');
  expect(!planEntityIds.has(item.entityId), `parche documental duplicado: ${item.entityId}`);
  planEntityIds.add(item.entityId);
}

console.log(JSON.stringify({
  ok:true,
  release:manifest.release,
  build:manifest.build,
  dataVersion:manifest.dataVersion,
  completionVersion:manifest.completionVersion,
  correctionVersion:manifest.correctionVersion,
  dataCut:manifest.dataCut,
  territories:entities.size,
  plansAvailable:manifest.counts.plansAvailable,
  formalPlanDeliveries:delta.summary.formalPlanDeliveries,
  validatedPlans:delta.summary.validatedPlans,
  returnedPlans:delta.summary.returnedPlans,
  losRiosPlanScore:losRios.planReviewScore,
  losRiosPlanState:losRios.planCorrectionStatus,
  followups:followups.size,
  planPatches:delta.planPatches.length,
  packageHashesVerified:true
},null,2));
