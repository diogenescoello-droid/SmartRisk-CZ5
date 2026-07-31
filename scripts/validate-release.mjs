import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';

const root = process.cwd();
const read = file => fs.readFileSync(path.join(root, file), 'utf8');
const fail = message => { throw new Error(`VALIDACIÓN RC14.4.4 RC5: ${message}`); };
const expect = (condition, message) => { if (!condition) fail(message); };
const includes = (text, value, label) => expect(text.includes(value), `${label}: falta ${value}`);

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
const update = read('preview-rc14.4.4/latest-data-update.js');
const baselineText = read('pilot-baseline-data.js');
const workflow = read('.github/workflows/deploy-pages.yml');
const rules = read('firestore.rules');

includes(index, 'VERSIÓN ESTABLE · RC14.4.4 · DATOS 30-07-2026', 'index');
includes(index, '14.4.4-rc5', 'index');
includes(gate, 'BUILD="14.4.4-rc5"', 'compuerta de acceso');
includes(gate, 'latest-data-update.js', 'compuerta de acceso');
includes(gate, 'mode:"stable-r023-latest-data"', 'compuerta de acceso');
includes(gate, 'diogenes.coello@gestionderiesgos.gob.ec', 'administración institucional');
includes(update, 'value.entidadesSeguimiento.length===56', 'migración compartida');
includes(update, 'value.seguimientos.length>=106', 'migración compartida');
includes(update, 'plansReceived:55', 'actualización documental');
includes(update, 'dataCut:delta.config.cutDate', 'trazabilidad del corte');
includes(rules, "'diogenes.coello@gestionderiesgos.gob.ec'", 'reglas Firestore');
includes(rules, "profile().rol == 'Administrador'", 'reglas Firestore');
includes(workflow, 'node scripts/validate-release.mjs', 'workflow de despliegue');
includes(workflow, 'RELEASE_MANIFEST.json', 'workflow de despliegue');

const payloadMatch = update.match(/const PAYLOAD="([A-Za-z0-9+/=]+)";/);
expect(payloadMatch, 'no se pudo localizar el paquete comprimido de actualización');
let delta;
try {
  delta = JSON.parse(zlib.gunzipSync(Buffer.from(payloadMatch[1], 'base64')).toString('utf8'));
} catch (error) {
  fail(`paquete de datos ilegible: ${error.message}`);
}
expect(
  delta?.config?.version === manifest.dataVersion,
  `la versión del paquete de datos no coincide: paquete=${delta?.config?.version || 'sin versión'}, manifiesto=${manifest.dataVersion || 'sin dataVersion'}`
);
expect(delta?.config?.cutDate === manifest.dataCut, 'el corte del paquete de datos no coincide con el manifiesto');
expect(Array.isArray(delta.entityPatches), 'entityPatches no es una lista');
expect(Array.isArray(delta.followups), 'followups no es una lista');
expect(Array.isArray(delta.planPatches), 'planPatches no es una lista');
expect(delta.followups.length > 0, 'el paquete no contiene seguimientos nuevos');

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
expect(entities.size === manifest.counts.territories, `se esperaban ${manifest.counts.territories} territorios y se obtuvieron ${entities.size}`);

const followups = new Map((baseline.followups || []).map(item => [followupKey(item), item]));
for (const item of delta.followups) followups.set(followupKey(item), { ...(followups.get(followupKey(item)) || {}), ...item });
expect(followups.size >= manifest.counts.followupsMinimum, `se esperaban al menos ${manifest.counts.followupsMinimum} seguimientos y se obtuvieron ${followups.size}`);

const availableValues = new Set(['true', 'si', 'sí', 'disponible', '1']);
const plansAvailable = [...entities.values()].filter(item => item.planDocumentAvailable === true || availableValues.has(normalize(item.planDocumentAvailable))).length;
expect(plansAvailable === manifest.counts.plansAvailable, `se esperaban ${manifest.counts.plansAvailable} planes disponibles y se obtuvieron ${plansAvailable}`);

const planKeys = new Set(delta.planPatches.map(item => `${normalize(item.province)}|${normalize(item.territory)}`));
expect(planKeys.size === delta.planPatches.length, 'existen parches documentales duplicados por provincia y territorio');

console.log(JSON.stringify({
  ok: true,
  release: manifest.release,
  build: manifest.build,
  dataVersion: manifest.dataVersion,
  dataCut: manifest.dataCut,
  territories: entities.size,
  plansAvailable,
  followups: followups.size,
  deltaFollowups: delta.followups.length,
  planPatches: delta.planPatches.length
}, null, 2));
