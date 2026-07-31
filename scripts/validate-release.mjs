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
  expect(match, 'corrección Los Ríos: no se encontró el objeto CORRECTION');
  try {
    return JSON.parse(match[1]);
  } catch (error) {
    fail(`corrección Los Ríos ilegible: ${error.message}`);
  }
}

const manifest = JSON.parse(read('RELEASE_MANIFEST.json'));
expect(manifest.product === 'SmartRisk CZ5', 'producto incorrecto en el manifiesto');
expect(manifest.release === 'RC14.4.4 RC5', 'release incorrecto en el manifiesto');
expect(manifest.build === '14.4.4-rc5', 'build incorrecto en el manifiesto');
expect(manifest.dataCut === '2026-07-30', 'corte de datos incorrecto');
expect(manifest.status === 'stable', 'la versión no está declarada como estable');

for (const file of manifest.requiredFiles) {
  expect(fs.existsSync(path.join(root, file)), `archivo obligatorio inexistente: ${file}`);
}

const index = read('preview-rc14.4.4/index.html');
const gate = read('preview-rc14.4.4/access-gate-preview.js');
const updateText = read('preview-rc14.4.4/latest-data-update.js');
const completionText = read('preview-rc14.4.4/followup-completion-20260730.js');
const correctionText = read('preview-rc14.4.4/los-rios-plan-correction-20260730.js');
const baselineText = read('pilot-baseline-data.js');
const workflow = read('.github/workflows/deploy-pages.yml');
const rules = read('firestore.rules');

includes(index, 'VERSIÓN ESTABLE · RC14.4.4 · DATOS 30-07-2026', 'index');
includes(index, '14.4.4-rc5', 'index');
includes(gate, 'BUILD="14.4.4-rc5"', 'compuerta de acceso');
includes(gate, 'latest-data-update.js', 'compuerta de acceso');
includes(gate, 'followup-completion-20260730.js', 'compuerta de acceso');
includes(gate, 'los-rios-plan-correction-20260730.js', 'compuerta de acceso');
includes(gate, 'mode:"stable-r023-latest-data"', 'compuerta de acceso');
includes(gate, 'diogenes.coello@gestionderiesgos.gob.ec', 'administración institucional');
includes(updateText, 'value.entidadesSeguimiento.length===56', 'migración base');
includes(updateText, 'value.seguimientos.length>=106', 'migración base');
includes(updateText, 'plansReceived:55', 'línea base documental antes de la corrección');
includes(updateText, 'dataCut:delta.config.cutDate', 'trazabilidad del corte');
includes(completionText, 'SMART_RISK_FOLLOWUP_COMPLETION', 'complemento de seguimientos');
includes(completionText, 'Sincronizado · 106 seguimientos', 'persistencia del complemento');
includes(correctionText, 'TER-PROV-LOS-RIOS', 'corrección Los Ríos');
includes(correctionText, 'planReviewScore":68', 'valoración Los Ríos');
includes(correctionText, 'plan funcional parcial (68 %)', 'estado Los Ríos');
includes(correctionText, 'corrección progresiva', 'mejora progresiva Los Ríos');
includes(correctionText, 'Sincronizado · 56 planes', 'persistencia documental');
includes(rules, "'diogenes.coello@gestionderiesgos.gob.ec'", 'reglas Firestore');
includes(rules, "profile().rol == 'Administrador'", 'reglas Firestore');
includes(workflow, 'node scripts/validate-release.mjs', 'workflow de despliegue');
includes(workflow, 'RELEASE_MANIFEST.json', 'workflow de despliegue');
includes(workflow, 'los-rios-plan-correction-20260730.js', 'workflow de despliegue');

const principalDecoded = decodePayload(updateText, 'actualización principal');
const completionDecoded = decodePayload(completionText, 'complemento de seguimientos');
const correction = decodeCorrection(correctionText);
const delta = principalDecoded.data;
const completion = completionDecoded.data;

expect(sha256(principalDecoded.raw) === manifest.packageHashes.principalRawSha256, 'hash del paquete principal distinto del manifiesto');
expect(sha256(completionDecoded.raw) === manifest.packageHashes.completionRawSha256, 'hash del complemento distinto del manifiesto');
expect(
  delta?.config?.version === manifest.dataVersion,
  `versión de datos principal distinta: paquete=${delta?.config?.version || 'sin versión'}, manifiesto=${manifest.dataVersion || 'sin dataVersion'}`
);
expect(delta?.config?.cutDate === manifest.dataCut, 'corte principal distinto del manifiesto');
expect(completion?.version === manifest.completionVersion, 'versión del complemento distinta del manifiesto');
expect(completion?.cutDate === manifest.dataCut, 'corte del complemento distinto del manifiesto');
expect(correction?.version === manifest.correctionVersion, 'versión de la corrección Los Ríos distinta del manifiesto');
expect(correction?.cutDate === manifest.dataCut, 'corte de la corrección Los Ríos distinto del manifiesto');
expect(correction?.entityId === 'TER-PROV-LOS-RIOS', 'entityId incorrecto para Los Ríos provincial');
expect(correction?.planDocumentAvailable === true, 'el plan de Los Ríos no está marcado como disponible');
expect(correction?.formalPlanDelivery === false, 'la formalización institucional de Los Ríos debe permanecer pendiente');
expect(Number(correction?.planReviewScore) === 68, 'la valoración de Los Ríos debe ser 68 %');
expect(correction?.planReviewClassification === 'Plan funcional parcial', 'clasificación técnica incorrecta para Los Ríos');
expect(correction?.planCorrectionStatus === 'En corrección progresiva', 'estado progresivo incorrecto para Los Ríos');
expect(String(correction?.planFinalUrl || '').includes('1OORaykZcWJHJe3zPWB9dXn_pCc84RKDT'), 'enlace del plan firmado de Los Ríos incorrecto');
expect(String(correction?.planReviewReportUrl || '').includes('11cWFIu56jVBp-VWVB_gyeBumfrF4u1_I'), 'enlace del informe de revisión de Los Ríos incorrecto');
expect(Array.isArray(delta.entityPatches), 'entityPatches principal no es una lista');
expect(Array.isArray(delta.followups), 'followups principal no es una lista');
expect(Array.isArray(delta.planPatches), 'planPatches principal no es una lista');
expect(Array.isArray(completion.entityPatches), 'entityPatches del complemento no es una lista');
expect(Array.isArray(completion.followups), 'followups del complemento no es una lista');
expect(completion.followups.length === 3, `el complemento debe contener 3 seguimientos y contiene ${completion.followups.length}`);
expect(completion.entityPatches.length === 3, `el complemento debe contener 3 entidades y contiene ${completion.entityPatches.length}`);

const expectedCompletionKeys = new Set([
  'GUAYAS 2.0|F07-SEG-1',
  'GUAYAS-MTT6-2026-001|F07-SEG-1',
  'OTLR-MPCEI-2026-005|F07-SEG-1'
]);
for (const item of completion.followups) {
  expect(expectedCompletionKeys.delete(String(item.followupId || item.id || '')), `seguimiento inesperado o duplicado en el complemento: ${item.followupId || item.id || 'sin id'}`);
}
expect(expectedCompletionKeys.size === 0, `faltan seguimientos del complemento: ${[...expectedCompletionKeys].join(', ')}`);

for (const [summaryKey, manifestKey] of [
  ['universe', 'territories'],
  ['formalPlanDeliveries', 'formalPlanDeliveries'],
  ['validatedPlans', 'validatedPlans'],
  ['returnedPlans', 'returnedPlans'],
  ['territorialFollowups', 'followupsMinimum']
]) {
  expect(
    Number(delta?.summary?.[summaryKey]) === Number(manifest.counts[manifestKey]),
    `resumen ${summaryKey}=${delta?.summary?.[summaryKey]} no coincide con ${manifestKey}=${manifest.counts[manifestKey]}`
  );
}
expect(
  Number(delta?.summary?.planDocumentsAvailable) + 1 === Number(manifest.counts.plansAvailable),
  `la línea base documental (${delta?.summary?.planDocumentsAvailable}) más la corrección de Los Ríos no coincide con plansAvailable=${manifest.counts.plansAvailable}`
);

const baselineMatch = baselineText.match(/const DATA = (\{[\s\S]*\});\s*window\.SMART_RISK_PILOT_BASELINE/);
expect(baselineMatch, 'no se pudo interpretar la línea base piloto');
let baseline;
try {
  baseline = JSON.parse(baselineMatch[1]);
} catch (error) {
  fail(`línea base ilegible: ${error.message}`);
}

const followupKey = item => String(
  item?.followupId || item?.id || `${item?.submissionId || ''}|${item?.actionOrCommitment || item?.accion_o_compromiso || item?.description || ''}`
);
const entities = new Map((baseline.entities || []).map(item => [item.entityId, { ...item }]));
for (const patch of delta.entityPatches) entities.set(patch.entityId, { ...(entities.get(patch.entityId) || {}), ...patch });
for (const patch of completion.entityPatches) entities.set(patch.entityId, { ...(entities.get(patch.entityId) || {}), ...patch });
entities.set(correction.entityId, { ...(entities.get(correction.entityId) || {}), ...correction });
expect(entities.size === manifest.counts.territories, `se esperaban ${manifest.counts.territories} territorios y se obtuvieron ${entities.size}`);
const losRios = entities.get('TER-PROV-LOS-RIOS');
expect(losRios?.planDocumentAvailable === true, 'la reconstrucción limpia no conserva el plan de Los Ríos');
expect(Number(losRios?.planReviewScore) === 68, 'la reconstrucción limpia no conserva la valoración 68 % de Los Ríos');
expect(losRios?.planCorrectionStatus === 'En corrección progresiva', 'la reconstrucción limpia no conserva el estado progresivo de Los Ríos');

const followups = new Map((baseline.followups || []).map(item => [followupKey(item), item]));
for (const item of delta.followups) followups.set(followupKey(item), { ...(followups.get(followupKey(item)) || {}), ...item });
for (const item of completion.followups) followups.set(followupKey(item), { ...(followups.get(followupKey(item)) || {}), ...item });
expect(followups.size >= manifest.counts.followupsMinimum, `se esperaban al menos ${manifest.counts.followupsMinimum} seguimientos y se obtuvieron ${followups.size}`);

const planEntityIds = new Set();
for (const item of delta.planPatches) {
  expect(item.entityId, 'parche documental sin entityId');
  expect(!planEntityIds.has(item.entityId), `parche documental duplicado por entityId: ${item.entityId}`);
  planEntityIds.add(item.entityId);
}
expect(planEntityIds.has('TER-PROV-LOS-RIOS'), 'la línea base documental no contiene la entidad provincial de Los Ríos');

console.log(JSON.stringify({
  ok: true,
  release: manifest.release,
  build: manifest.build,
  dataVersion: manifest.dataVersion,
  completionVersion: manifest.completionVersion,
  correctionVersion: manifest.correctionVersion,
  dataCut: manifest.dataCut,
  territories: entities.size,
  plansAvailable: manifest.counts.plansAvailable,
  formalPlanDeliveries: delta.summary.formalPlanDeliveries,
  validatedPlans: delta.summary.validatedPlans,
  returnedPlans: delta.summary.returnedPlans,
  losRiosPlanScore: losRios.planReviewScore,
  losRiosPlanState: losRios.planCorrectionStatus,
  followups: followups.size,
  principalFollowups: delta.followups.length,
  completionFollowups: completion.followups.length,
  planPatches: delta.planPatches.length,
  packageHashesVerified: true
}, null, 2));
