import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import { execFileSync } from 'node:child_process';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { throw new Error(`VALIDACIÓN RC14.4.4 RC5: ${message}`); };
const expect = (condition, message) => { if (!condition) fail(message); };
const includes = (text, value, label) => expect(text.includes(value), `${label}: falta ${value}`);

function decodePayload(text, label) {
  const match = text.match(/const PAYLOAD="([A-Za-z0-9+/=]+)";/);
  expect(match, `${label}: no se encontró PAYLOAD`);
  try {
    return JSON.parse(zlib.gunzipSync(Buffer.from(match[1], 'base64')).toString('utf8'));
  } catch (error) {
    fail(`${label}: paquete ilegible: ${error.message}`);
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
const baselineText = read('pilot-baseline-data.js');
const workflow = read('.github/workflows/deploy-pages.yml');
const rules = read('firestore.rules');

includes(index, 'VERSIÓN ESTABLE · RC14.4.4 · DATOS 30-07-2026', 'index');
includes(index, '14.4.4-rc5', 'index');
includes(gate, 'BUILD="14.4.4-rc5"', 'compuerta de acceso');
includes(gate, 'latest-data-update.js', 'compuerta de acceso');
includes(gate, 'followup-completion-20260730.js', 'compuerta de acceso');
includes(gate, 'mode:"stable-r023-latest-data"', 'compuerta de acceso');
includes(gate, 'diogenes.coello@gestionderiesgos.gob.ec', 'administración institucional');
includes(updateText, 'value.entidadesSeguimiento.length===56', 'migración base');
includes(updateText, 'value.seguimientos.length>=106', 'migración base');
includes(updateText, 'plansReceived:55', 'actualización documental');
includes(updateText, 'dataCut:delta.config.cutDate', 'trazabilidad del corte');
includes(completionText, 'SMART_RISK_FOLLOWUP_COMPLETION', 'complemento de seguimientos');
includes(completionText, 'Sincronizado · 106 seguimientos', 'persistencia del complemento');
includes(rules, "'diogenes.coello@gestionderiesgos.gob.ec'", 'reglas Firestore');
includes(rules, "profile().rol == 'Administrador'", 'reglas Firestore');
includes(workflow, 'node scripts/validate-release.mjs', 'workflow de despliegue');
includes(workflow, 'RELEASE_MANIFEST.json', 'workflow de despliegue');

const delta = decodePayload(updateText, 'actualización principal');
const completion = decodePayload(completionText, 'complemento de seguimientos');

expect(
  delta?.config?.version === manifest.dataVersion,
  `versión de datos principal distinta: paquete=${delta?.config?.version || 'sin versión'}, manifiesto=${manifest.dataVersion || 'sin dataVersion'}`
);
expect(delta?.config?.cutDate === manifest.dataCut, 'corte principal distinto del manifiesto');
expect(completion?.version === manifest.completionVersion, 'versión del complemento distinta del manifiesto');
expect(completion?.cutDate === manifest.dataCut, 'corte del complemento distinto del manifiesto');
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

const baselineMatch = baselineText.match(/const DATA = (\{[\s\S]*\});\s*window\.SMART_RISK_PILOT_BASELINE/);
expect(baselineMatch, 'no se pudo interpretar la línea base piloto');
let baseline;
try {
  baseline = JSON.parse(baselineMatch[1]);
} catch (error) {
  fail(`línea base ilegible: ${error.message}`);
}

const normalize = value => String(value ?? '')
  .normalize('NFD')
  .replace(/[\u0300-\u036f]/g, '')
  .replace(/[^a-zA-Z0-9]+/g, ' ')
  .trim()
  .toLowerCase();
const followupKey = item => String(
  item?.followupId || item?.id || `${item?.submissionId || ''}|${item?.actionOrCommitment || item?.accion_o_compromiso || item?.description || ''}`
);

const entities = new Map((baseline.entities || []).map(item => [item.entityId, { ...item }]));
for (const patch of delta.entityPatches) entities.set(patch.entityId, { ...(entities.get(patch.entityId) || {}), ...patch });
for (const patch of completion.entityPatches) entities.set(patch.entityId, { ...(entities.get(patch.entityId) || {}), ...patch });
expect(entities.size === manifest.counts.territories, `se esperaban ${manifest.counts.territories} territorios y se obtuvieron ${entities.size}`);

const followups = new Map((baseline.followups || []).map(item => [followupKey(item), item]));
for (const item of delta.followups) followups.set(followupKey(item), { ...(followups.get(followupKey(item)) || {}), ...item });
for (const item of completion.followups) followups.set(followupKey(item), { ...(followups.get(followupKey(item)) || {}), ...item });
expect(followups.size >= manifest.counts.followupsMinimum, `se esperaban al menos ${manifest.counts.followupsMinimum} seguimientos y se obtuvieron ${followups.size}`);

let baseReviewText;
try {
  baseReviewText = execFileSync('unzip', ['-p', 'smartrisk-site-rc14.4.3.zip', 'enos-reviews.js'], {
    encoding: 'utf8',
    maxBuffer: 20 * 1024 * 1024
  });
} catch (error) {
  fail(`no se pudo leer enos-reviews.js del paquete base: ${error.message}`);
}
const reviewMatch = baseReviewText.match(/window\.ENOS_REVIEWS=(\{[\s\S]*\});?\s*$/);
expect(reviewMatch, 'no se pudo interpretar enos-reviews.js del paquete base');
let baseReviews;
try {
  baseReviews = JSON.parse(reviewMatch[1]);
} catch (error) {
  fail(`enos-reviews.js del paquete base es ilegible: ${error.message}`);
}

const planKey = item => `${normalize(item.province)}|${normalize(item.territory)}`;
const availablePlans = new Set((baseReviews.reviews || []).map(planKey));
const planPatchKeys = new Set();
for (const item of delta.planPatches) {
  const key = planKey(item);
  expect(!planPatchKeys.has(key), `parche documental duplicado: ${key}`);
  planPatchKeys.add(key);
  if (item.planDocumentAvailable === true) availablePlans.add(key);
  else if (item.planDocumentAvailable === false) availablePlans.delete(key);
}
const plansAvailable = availablePlans.size;
expect(plansAvailable === manifest.counts.plansAvailable, `se esperaban ${manifest.counts.plansAvailable} planes disponibles y se obtuvieron ${plansAvailable}`);

console.log(JSON.stringify({
  ok: true,
  release: manifest.release,
  build: manifest.build,
  dataVersion: manifest.dataVersion,
  completionVersion: manifest.completionVersion,
  dataCut: manifest.dataCut,
  territories: entities.size,
  plansAvailable,
  followups: followups.size,
  principalFollowups: delta.followups.length,
  completionFollowups: completion.followups.length,
  planPatches: delta.planPatches.length
}, null, 2));
