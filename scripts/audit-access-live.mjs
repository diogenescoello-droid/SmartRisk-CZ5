import fs from 'node:fs';
import admin from 'firebase-admin';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON missing');
const serviceAccount = JSON.parse(raw);
admin.initializeApp({ credential: admin.credential.cert(serviceAccount), projectId: 'smartrisk-cz5-produccion' });
const auth = admin.auth();
const db = admin.firestore();

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const maskEmail = value => {
  const email = String(value || '');
  const [local, domain] = email.split('@');
  if (!domain) return email ? `${email.slice(0,1)}***` : '';
  return `${local.slice(0,1)}***@${domain}`;
};
const countBy = (rows, getter) => rows.reduce((acc, row) => {
  const key = String(getter(row) || 'Sin definir');
  acc[key] = (acc[key] || 0) + 1;
  return acc;
}, {});
const supportedRoles = new Set([
  'administrador','tecnico zonal','tecnico territorial','coordinador coe','lider mtt/gt',
  'tomador de decision/control','visor provincial ame','visor zonal ame','consulta provincial ame'
]);
const legacyRoles = new Set(['visor provincial ame','visor zonal ame','consulta provincial ame']);
const expectedLevel = role => {
  if (role === 'tecnico zonal' || role === 'visor zonal ame') return 'zonal';
  if (role === 'tecnico provincial' || role === 'visor provincial ame' || role === 'consulta provincial ame') return 'provincial';
  if (role === 'tecnico territorial') return 'cantonal';
  return '';
};
const expectedScopePrefix = role => {
  if (role === 'tecnico provincial' || role === 'visor provincial ame' || role === 'consulta provincial ame') return 'PROV:';
  if (role === 'tecnico territorial') return 'TER:';
  return '';
};

const users = [];
let pageToken;
do {
  const page = await auth.listUsers(1000, pageToken);
  users.push(...page.users);
  pageToken = page.pageToken;
} while (pageToken);

const profileSnap = await db.collection('perfiles').get();
const profiles = profileSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
const authByUid = new Map(users.map(user => [user.uid, user]));
const profileByUid = new Map(profiles.map(profile => [profile.uid, profile]));
const emailCounts = new Map();
for (const profile of profiles) {
  const email = normalize(profile.correo);
  if (email) emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
}
const duplicateEmails = new Set([...emailCounts.entries()].filter(([,count]) => count > 1).map(([email]) => email));

const findings = [];
const add = (severity, code, uid, email, detail) => findings.push({ severity, code, ref: String(uid || '').slice(0,8), email: maskEmail(email), detail });

for (const user of users) {
  const profile = profileByUid.get(user.uid);
  const email = normalize(user.email);
  if (user.disabled) add('critical','AUTH_DISABLED',user.uid,user.email,'Cuenta deshabilitada en Firebase Authentication.');
  if (!user.providerData.some(p => p.providerId === 'password')) add('critical','NO_PASSWORD_PROVIDER',user.uid,user.email,'La cuenta no tiene proveedor password; signInWithEmailAndPassword no funcionará.');
  if (!profile) {
    add('critical','AUTH_WITHOUT_PROFILE',user.uid,user.email,'Authentication existe pero no hay perfiles/{UID}.');
    continue;
  }
  const profileEmail = normalize(profile.correo);
  if (profileEmail && profileEmail !== email) add('critical','EMAIL_MISMATCH',user.uid,user.email,`Correo Auth no coincide con perfil (${maskEmail(profile.correo)}).`);
  if (normalize(profile.estado) !== 'activo') add('critical','PROFILE_NOT_ACTIVE',user.uid,user.email,`Estado de perfil: ${profile.estado ?? 'vacío'}.`);
  const role = normalize(profile.rol || profile.codigoRol);
  if (!supportedRoles.has(role)) add('critical','UNSUPPORTED_ROLE',user.uid,user.email,`Rol no reconocido por catálogo canónico: ${profile.rol || profile.codigoRol || 'vacío'}.`);
  if (legacyRoles.has(role)) add('medium','LEGACY_ROLE_ALIAS',user.uid,user.email,'Rol legado funciona por alias, pero debe migrarse al catálogo canónico.');
  const scopes = Array.isArray(profile.scopeKeys) ? profile.scopeKeys.filter(Boolean) : [];
  if (role !== 'administrador' && !scopes.length && !profile.canton && !profile.provincia) {
    add('critical','NO_SCOPE',user.uid,user.email,'Perfil no tiene scopeKeys, provincia ni cantón.');
  } else if (role !== 'administrador' && !scopes.length && (profile.canton || profile.provincia)) {
    add('high','LEGACY_SCOPE_WITHOUT_KEYS',user.uid,user.email,'El gate acepta provincia/cantón, pero las reglas Firestore autorizan alcances mediante scopeKeys.');
  }
  if (!Array.isArray(profile.scopeKeys) && profile.scopeKeys != null) add('high','SCOPEKEYS_NOT_ARRAY',user.uid,user.email,'scopeKeys existe pero no es una lista.');
  const prefix = expectedScopePrefix(role);
  if (prefix && scopes.length && !scopes.some(key => String(key).startsWith(prefix))) {
    add('high','ROLE_SCOPE_PREFIX_MISMATCH',user.uid,user.email,`El rol requiere al menos un scopeKey ${prefix} y no lo tiene.`);
  }
  const level = normalize(profile.nivelAcceso);
  const expected = expectedLevel(role);
  if (expected && level && !level.includes(expected)) {
    add('medium','ROLE_LEVEL_MISMATCH',user.uid,user.email,`nivelAcceso “${profile.nivelAcceso}” no coincide con el rol ${profile.rol || profile.codigoRol}.`);
  }
  if (typeof profile.requiereCambioClave !== 'boolean') add('medium','PASSWORD_CHANGE_FLAG_MISSING',user.uid,user.email,'Falta indicador booleano requiereCambioClave.');
  if (duplicateEmails.has(profileEmail)) add('critical','DUPLICATE_PROFILE_EMAIL',user.uid,user.email,'El mismo correo aparece en más de un perfil Firestore.');
}

for (const profile of profiles) {
  if (!authByUid.has(profile.uid)) add('high','ORPHAN_PROFILE',profile.uid,profile.correo,'Existe perfil Firestore sin usuario Authentication con el mismo UID.');
}

const bySeverity = findings.reduce((acc,row) => { acc[row.severity] = (acc[row.severity] || 0) + 1; return acc; }, {});
const byCode = findings.reduce((acc,row) => { acc[row.code] = (acc[row.code] || 0) + 1; return acc; }, {});
const passwordFlag = {
  true: profiles.filter(p => p.requiereCambioClave === true).length,
  false: profiles.filter(p => p.requiereCambioClave === false).length,
  missing: profiles.filter(p => typeof p.requiereCambioClave !== 'boolean').length
};
const scopeStats = {
  withScopeKeys: profiles.filter(p => Array.isArray(p.scopeKeys) && p.scopeKeys.filter(Boolean).length).length,
  withoutScopeKeys: profiles.filter(p => !Array.isArray(p.scopeKeys) || !p.scopeKeys.filter(Boolean).length).length,
  terKeys: profiles.filter(p => Array.isArray(p.scopeKeys) && p.scopeKeys.some(k => String(k).startsWith('TER:'))).length,
  provKeys: profiles.filter(p => Array.isArray(p.scopeKeys) && p.scopeKeys.some(k => String(k).startsWith('PROV:'))).length,
  zonaKeys: profiles.filter(p => Array.isArray(p.scopeKeys) && p.scopeKeys.some(k => String(k).startsWith('ZONA:'))).length
};
const result = {
  generatedAt: new Date().toISOString(),
  projectId: 'smartrisk-cz5-produccion',
  totals: {
    authenticationUsers: users.length,
    firestoreProfiles: profiles.length,
    findings: findings.length,
    bySeverity,
    byCode,
    emailVerifiedFalse: users.filter(u => !u.emailVerified).length,
    neverSignedIn: users.filter(u => !u.metadata?.lastSignInTime).length,
    disabledUsers: users.filter(u => u.disabled).length,
    passwordProviderMissing: users.filter(u => !u.providerData.some(p => p.providerId === 'password')).length,
    passwordFlag,
    scopeStats,
    roles: countBy(profiles, p => p.rol || p.codigoRol || 'Sin rol'),
    nivelesAcceso: countBy(profiles, p => p.nivelAcceso || 'Sin nivel'),
    estadosPerfil: countBy(profiles, p => p.estado || 'Sin estado')
  },
  findings
};
fs.writeFileSync('ACCESS_AUDIT_LIVE.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.totals, null, 2));
for (const [code,count] of Object.entries(byCode).sort()) console.log(`${code}: ${count}`);
