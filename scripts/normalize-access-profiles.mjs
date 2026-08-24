import fs from 'node:fs';
import admin from 'firebase-admin';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON missing');
const apply = process.argv.includes('--apply');
const serviceAccount = JSON.parse(raw);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: 'smartrisk-cz5-produccion' });
const auth = admin.auth();
const db = admin.firestore();

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const slug = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-|-$/g, '');
const maskEmail = value => {
  const [local = '', domain = ''] = String(value || '').split('@');
  return domain ? `${local.slice(0,1)}***@${domain}` : (local ? `${local.slice(0,1)}***` : '');
};
const list = value => Array.isArray(value) ? value.filter(Boolean).map(String) : value ? [String(value)] : [];
const unique = values => [...new Set(values.filter(Boolean))];

const ROLE_MAP = new Map([
  ['administrador','Administrador'], ['admin','Administrador'],
  ['tecnico zonal','Técnico zonal'],
  ['tecnico provincial','Técnico provincial'], ['tecnico prefectura','Técnico provincial'],
  ['tecnico territorial','Técnico territorial'], ['usuario territorial','Técnico territorial'], ['tecnico cantonal','Técnico territorial'], ['tecnico municipal','Técnico territorial'],
  ['coordinador coe','Coordinador COE'],
  ['lider mtt/gt','Líder MTT/GT'], ['lider mtt','Líder MTT/GT'], ['lider gt','Líder MTT/GT'],
  ['tomador de decision/control','Tomador de decisión/control'], ['tomador de decision','Tomador de decisión/control'],
  ['visor provincial ame','Visor provincial AME'], ['visor zonal ame','Visor zonal AME'], ['consulta provincial ame','Consulta provincial AME']
]);
const canonicalRole = value => ROLE_MAP.get(normalize(value)) || String(value || '').trim();
const readOnlyRoles = new Set(['Visor provincial AME','Visor zonal AME','Consulta provincial AME']);
const zonalRoles = new Set(['Administrador','Técnico zonal','Coordinador COE','Visor zonal AME']);
const provincialRoles = new Set(['Técnico provincial','Visor provincial AME','Consulta provincial AME']);
const cantonalRoles = new Set(['Técnico territorial']);
const knownRoles = new Set([...ROLE_MAP.values()]);

function scopeTypeFor(role, profile) {
  if (zonalRoles.has(role)) return 'zonal';
  if (provincialRoles.has(role)) return 'provincial';
  if (cantonalRoles.has(role)) return 'cantonal';
  const scopes = list(profile.scopeKeys);
  if (scopes.some(key => key.startsWith('ZONA:'))) return 'zonal';
  if (scopes.some(key => key.startsWith('PROV:'))) return 'provincial';
  if (scopes.some(key => key.startsWith('TER:'))) return 'cantonal';
  const level = normalize(profile.nivelAcceso);
  if (level.includes('zonal')) return 'zonal';
  if (level.includes('provinc')) return 'provincial';
  return 'cantonal';
}

function levelFor(role, scopeType, current) {
  if (role === 'Administrador') return 'Administración zonal';
  if (role === 'Visor zonal AME') return 'Consulta zonal';
  if (scopeType === 'zonal') return 'Zonal';
  if (scopeType === 'provincial') return 'Provincial';
  if (scopeType === 'cantonal') return 'Cantonal';
  return current || 'Según alcance';
}

const users = [];
let pageToken;
do {
  const page = await auth.listUsers(1000, pageToken);
  users.push(...page.users);
  pageToken = page.pageToken;
} while (pageToken);
const authByUid = new Map(users.map(user => [user.uid, user]));

const profileSnap = await db.collection('perfiles').get();
const profiles = profileSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));

let territories = [];
try {
  const platform = await db.doc('plataforma/datos').get();
  territories = platform.exists && Array.isArray(platform.data()?.territorios) ? platform.data().territorios : [];
} catch (error) {
  console.warn('No fue posible leer plataforma/datos para derivar alcances', error.message);
}

const territoryByCanton = new Map();
for (const territory of territories) {
  const canton = normalize(territory?.canton || territory?.nombre || territory?.territorioNombre);
  if (canton && territory?.id && !territoryByCanton.has(canton)) territoryByCanton.set(canton, territory);
}
const profileTerritoryScope = new Map();
const profileProvinceScopes = new Map();
for (const profile of profiles) {
  const scopes = list(profile.scopeKeys);
  const canton = normalize(profile.canton);
  const province = normalize(profile.provincia);
  const ter = scopes.find(key => key.startsWith('TER:'));
  const prov = scopes.find(key => key.startsWith('PROV:'));
  if (canton && ter && !profileTerritoryScope.has(canton)) profileTerritoryScope.set(canton, ter);
  if (province && prov) {
    const values = profileProvinceScopes.get(province) || [];
    values.push(prov);
    profileProvinceScopes.set(province, values);
  }
}
function mostCommon(values = []) {
  const counts = new Map();
  values.forEach(value => counts.set(value, (counts.get(value) || 0) + 1));
  return [...counts].sort((a,b) => b[1]-a[1])[0]?.[0] || null;
}

function deriveProvScope(profile) {
  const existing = list(profile.scopeKeys).find(key => key.startsWith('PROV:'));
  if (existing) return existing;
  const province = normalize(profile.provincia);
  if (!province) return null;
  const known = mostCommon(profileProvinceScopes.get(province));
  if (known) return known;
  return `PROV:PROV-${slug(profile.provincia)}`;
}
function deriveTerScope(profile) {
  const existing = list(profile.scopeKeys).find(key => key.startsWith('TER:'));
  if (existing) return existing;
  const canton = normalize(profile.canton);
  if (!canton) return null;
  if (profileTerritoryScope.has(canton)) return profileTerritoryScope.get(canton);
  const territory = territoryByCanton.get(canton);
  if (territory?.id) return String(territory.id).startsWith('TER:') ? String(territory.id) : `TER:${territory.id}`;
  return null;
}

const proposals = [];
const unresolved = [];
for (const profile of profiles) {
  const authUser = authByUid.get(profile.uid);
  const role = canonicalRole(profile.rol || profile.codigoRol);
  const active = normalize(profile.estado) === 'activo';
  if (!knownRoles.has(role)) {
    if (active) unresolved.push({ ref: profile.uid.slice(0,8), email: maskEmail(profile.correo), code: 'UNKNOWN_ROLE', detail: profile.rol || profile.codigoRol || '' });
    continue;
  }
  if (active && !authUser) {
    unresolved.push({ ref: profile.uid.slice(0,8), email: maskEmail(profile.correo), code: 'ACTIVE_PROFILE_WITHOUT_AUTH', detail: 'No se creará Authentication automáticamente.' });
    continue;
  }
  if (!active) continue;

  const scopeType = scopeTypeFor(role, profile);
  const existingScopes = list(profile.scopeKeys);
  const auxiliary = existingScopes.filter(key => key.startsWith('UNI:') || key.startsWith('INST:'));
  let scopeKeys = [];
  if (scopeType === 'zonal') scopeKeys = ['ZONA:CZ5', ...auxiliary];
  else if (scopeType === 'provincial') {
    const key = deriveProvScope(profile);
    if (!key || !profile.provincia) {
      unresolved.push({ ref: profile.uid.slice(0,8), email: maskEmail(profile.correo), code: 'PROV_SCOPE_UNRESOLVED', detail: `Provincia=${profile.provincia || 'vacía'}` });
      continue;
    }
    scopeKeys = [key, ...auxiliary];
  } else if (scopeType === 'cantonal') {
    const key = deriveTerScope(profile);
    if (!key || !profile.canton) {
      unresolved.push({ ref: profile.uid.slice(0,8), email: maskEmail(profile.correo), code: 'TER_SCOPE_UNRESOLVED', detail: `Cantón=${profile.canton || 'vacío'}` });
      continue;
    }
    scopeKeys = [key, ...auxiliary];
  } else scopeKeys = existingScopes;
  scopeKeys = unique(scopeKeys);

  const readOnly = readOnlyRoles.has(role) || normalize(profile.modoAcceso) === 'consulta';
  const explicitTemporary = normalize(profile.metodoActivacion) === 'credencial temporal';
  const requiereCambioClave = explicitTemporary ? Boolean(profile.requiereCambioClave) : false;
  const metodoActivacion = explicitTemporary ? 'Credencial temporal' : 'Recuperación por correo';
  const patch = {
    rol: role,
    codigoRol: role,
    rolInstitucional: profile.rolInstitucional || profile.rol || profile.codigoRol || role,
    nivelAcceso: levelFor(role, scopeType, profile.nivelAcceso),
    modoAcceso: readOnly ? 'Consulta' : 'Operación',
    scopeKeys,
    requiereCambioClave,
    metodoActivacion,
    accesoNormalizadoVersion: '2026.08.24.1',
    accesoNormalizadoEn: admin.firestore.FieldValue.serverTimestamp()
  };
  const changes = {};
  for (const [key, value] of Object.entries(patch)) {
    if (key === 'accesoNormalizadoEn') continue;
    const before = profile[key];
    const same = Array.isArray(value) ? JSON.stringify(list(before)) === JSON.stringify(value) : before === value;
    if (!same) changes[key] = { before: Array.isArray(before) ? before : (before ?? null), after: value };
  }
  proposals.push({ uid: profile.uid, email: profile.correo, patch, changes, role, scopeType });
}

const report = {
  generatedAt: new Date().toISOString(),
  projectId: 'smartrisk-cz5-produccion',
  mode: apply ? 'apply' : 'dry-run',
  totals: {
    authUsers: users.length,
    firestoreProfiles: profiles.length,
    activeProfiles: profiles.filter(p => normalize(p.estado) === 'activo').length,
    proposals: proposals.length,
    profilesWithChanges: proposals.filter(p => Object.keys(p.changes).length).length,
    unresolvedActiveProfiles: unresolved.length
  },
  unresolved,
  proposedChanges: proposals.map(item => ({
    ref: item.uid.slice(0,8), email: maskEmail(item.email), role: item.role, scopeType: item.scopeType,
    changedFields: Object.keys(item.changes), changes: item.changes
  }))
};
fs.writeFileSync('ACCESS_NORMALIZATION_REPORT.json', JSON.stringify(report, null, 2) + '\n');
console.log(JSON.stringify(report.totals, null, 2));
for (const row of unresolved) console.log(`UNRESOLVED ${row.code} ${row.ref} ${row.email}: ${row.detail}`);

if (unresolved.length) {
  console.error(`Normalization aborted: ${unresolved.length} active profile(s) unresolved. No writes performed.`);
  process.exit(2);
}
if (!apply) {
  console.log('Dry-run complete. No writes performed.');
  process.exit(0);
}

const changed = proposals.filter(item => Object.keys(item.changes).length);
if (changed.length) {
  const batch = db.batch();
  changed.forEach(item => batch.set(db.collection('perfiles').doc(item.uid), item.patch, { merge: true }));
  await batch.commit();
}

const verifySnap = await db.collection('perfiles').get();
const verifyProfiles = verifySnap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
const verifyIssues = [];
for (const profile of verifyProfiles) {
  if (normalize(profile.estado) !== 'activo') continue;
  const role = canonicalRole(profile.rol || profile.codigoRol);
  if (!knownRoles.has(role)) verifyIssues.push({ ref: profile.uid.slice(0,8), code: 'ROLE' });
  const type = scopeTypeFor(role, profile);
  const scopes = list(profile.scopeKeys);
  const prefix = type === 'zonal' ? 'ZONA:' : type === 'provincial' ? 'PROV:' : type === 'cantonal' ? 'TER:' : '';
  if (prefix && !scopes.some(key => key.startsWith(prefix))) verifyIssues.push({ ref: profile.uid.slice(0,8), code: `SCOPE_${type.toUpperCase()}` });
  if (typeof profile.requiereCambioClave !== 'boolean') verifyIssues.push({ ref: profile.uid.slice(0,8), code: 'PASSWORD_FLAG' });
}
report.applied = changed.length;
report.verificationIssues = verifyIssues;
report.verifiedAt = new Date().toISOString();
fs.writeFileSync('ACCESS_NORMALIZATION_REPORT.json', JSON.stringify(report, null, 2) + '\n');
console.log(`Applied profile updates: ${changed.length}`);
console.log(`Verification issues: ${verifyIssues.length}`);
if (verifyIssues.length) process.exit(3);
