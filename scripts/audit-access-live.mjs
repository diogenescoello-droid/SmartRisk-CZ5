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
const supportedRoles = new Set([
  'administrador','tecnico zonal','tecnico territorial','coordinador coe','lider mtt/gt',
  'tomador de decision/control','visor provincial ame','visor zonal ame','consulta provincial ame'
]);
const legacyRoles = new Set(['visor provincial ame','visor zonal ame','consulta provincial ame']);

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
  if (typeof profile.requiereCambioClave !== 'boolean') add('medium','PASSWORD_CHANGE_FLAG_MISSING',user.uid,user.email,'Falta indicador booleano requiereCambioClave.');
  if (duplicateEmails.has(profileEmail)) add('critical','DUPLICATE_PROFILE_EMAIL',user.uid,user.email,'El mismo correo aparece en más de un perfil Firestore.');
}

for (const profile of profiles) {
  if (!authByUid.has(profile.uid)) add('high','ORPHAN_PROFILE',profile.uid,profile.correo,'Existe perfil Firestore sin usuario Authentication con el mismo UID.');
}

const bySeverity = findings.reduce((acc,row) => { acc[row.severity] = (acc[row.severity] || 0) + 1; return acc; }, {});
const byCode = findings.reduce((acc,row) => { acc[row.code] = (acc[row.code] || 0) + 1; return acc; }, {});
const result = {
  generatedAt: new Date().toISOString(),
  projectId: 'smartrisk-cz5-produccion',
  totals: {
    authenticationUsers: users.length,
    firestoreProfiles: profiles.length,
    findings: findings.length,
    bySeverity,
    byCode,
    emailVerifiedFalse: users.filter(u => !u.emailVerified).length
  },
  findings
};
fs.writeFileSync('ACCESS_AUDIT_LIVE.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify(result.totals, null, 2));
for (const [code,count] of Object.entries(byCode).sort()) console.log(`${code}: ${count}`);
