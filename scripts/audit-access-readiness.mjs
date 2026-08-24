import fs from 'node:fs';
import admin from 'firebase-admin';

const raw = process.env.FIREBASE_SERVICE_ACCOUNT_JSON;
if (!raw) throw new Error('FIREBASE_SERVICE_ACCOUNT_JSON missing');
admin.initializeApp({ credential: admin.credential.cert(JSON.parse(raw)), projectId: 'smartrisk-cz5-produccion' });
const auth = admin.auth();
const db = admin.firestore();

const normalize = value => String(value || '').normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().toLowerCase();
const list = value => Array.isArray(value) ? value.filter(Boolean).map(String) : value ? [String(value)] : [];
const maskEmail = value => {
  const [local = '', domain = ''] = String(value || '').split('@');
  return domain ? `${local.slice(0,1)}***@${domain}` : (local ? `${local.slice(0,1)}***` : '');
};
const canonical = value => ({
  'administrador':'Administrador','admin':'Administrador',
  'tecnico zonal':'Técnico zonal','tecnico provincial':'Técnico provincial','tecnico prefectura':'Técnico provincial',
  'tecnico territorial':'Técnico territorial','usuario territorial':'Técnico territorial','tecnico cantonal':'Técnico territorial','tecnico municipal':'Técnico territorial',
  'coordinador coe':'Coordinador COE','lider mtt/gt':'Líder MTT/GT','lider mtt':'Líder MTT/GT','lider gt':'Líder MTT/GT',
  'tomador de decision/control':'Tomador de decisión/control','tomador de decision':'Tomador de decisión/control',
  'visor provincial ame':'Visor provincial AME','visor zonal ame':'Visor zonal AME','consulta provincial ame':'Consulta provincial AME'
})[normalize(value)] || String(value || '').trim();
function roleFor(profile = {}) {
  let role = canonical(profile.rol || profile.codigoRol);
  if ((role === 'Visor provincial AME' || role === 'Consulta provincial AME') && normalize(profile.nivelAcceso).includes('zonal')) role = 'Visor zonal AME';
  return role;
}
const knownRoles = new Set(['Administrador','Técnico zonal','Técnico provincial','Técnico territorial','Coordinador COE','Líder MTT/GT','Tomador de decisión/control','Visor provincial AME','Visor zonal AME','Consulta provincial AME']);
const zonal = new Set(['Administrador','Técnico zonal','Coordinador COE','Visor zonal AME']);
const provincial = new Set(['Técnico provincial','Visor provincial AME','Consulta provincial AME']);
const cantonal = new Set(['Técnico territorial']);
function expectedScope(role, profile) {
  if (zonal.has(role)) return 'ZONA:';
  if (provincial.has(role)) return 'PROV:';
  if (cantonal.has(role)) return 'TER:';
  const level = normalize(profile.nivelAcceso);
  if (level.includes('zonal')) return 'ZONA:';
  if (level.includes('provinc')) return 'PROV:';
  if (level.includes('canton')) return 'TER:';
  return '';
}
function expectedLevel(role, profile) {
  if (role === 'Administrador') return 'administracion zonal';
  if (role === 'Visor zonal AME') return 'consulta zonal';
  if (zonal.has(role)) return 'zonal';
  if (provincial.has(role)) return 'provincial';
  if (cantonal.has(role)) return 'cantonal';
  return normalize(profile.nivelAcceso);
}

const users = [];
let token;
do {
  const page = await auth.listUsers(1000, token);
  users.push(...page.users);
  token = page.pageToken;
} while (token);
const authByUid = new Map(users.map(user => [user.uid, user]));
const profilesSnap = await db.collection('perfiles').get();
const profiles = profilesSnap.docs.map(doc => ({ uid: doc.id, ...doc.data() }));
const profileByUid = new Map(profiles.map(profile => [profile.uid, profile]));

const emailCounts = new Map();
for (const profile of profiles) {
  const email = normalize(profile.correo);
  if (email) emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
}
const duplicateEmails = new Set([...emailCounts].filter(([,count]) => count > 1).map(([email]) => email));
const findings = [];
const add = (severity, code, uid, email, detail, blocking = true) => findings.push({ severity, code, blocking, ref: String(uid || '').slice(0,8), email: maskEmail(email), detail });

for (const user of users) {
  const profile = profileByUid.get(user.uid);
  if (user.disabled) add('critical','AUTH_DISABLED',user.uid,user.email,'Cuenta Authentication deshabilitada.');
  if (!user.providerData.some(provider => provider.providerId === 'password')) add('critical','NO_PASSWORD_PROVIDER',user.uid,user.email,'La cuenta no admite correo + contraseña.');
  if (!profile) {
    add('critical','AUTH_WITHOUT_PROFILE',user.uid,user.email,'Existe Authentication sin perfiles/{UID}.');
    continue;
  }
  if (normalize(profile.correo) && normalize(profile.correo) !== normalize(user.email)) add('critical','EMAIL_MISMATCH',user.uid,user.email,'Correo Authentication no coincide con perfil.');
  if (normalize(profile.estado) !== 'activo') add('critical','PROFILE_NOT_ACTIVE',user.uid,user.email,`Estado=${profile.estado || 'vacío'}.`);
  const role = roleFor(profile);
  if (!knownRoles.has(role)) add('critical','UNSUPPORTED_ROLE',user.uid,user.email,`Rol=${profile.rol || profile.codigoRol || 'vacío'}.`);
  const scopes = list(profile.scopeKeys);
  const prefix = expectedScope(role, profile);
  if (prefix && !scopes.some(key => key.startsWith(prefix))) add('high','SCOPE_MISMATCH',user.uid,user.email,`Rol ${role} requiere ${prefix}`);
  if (role === 'Técnico provincial' && !String(profile.provincia || '').trim()) add('high','PROVINCE_MISSING',user.uid,user.email,'Técnico provincial sin provincia.');
  if (role === 'Técnico territorial' && !String(profile.canton || '').trim()) add('high','CANTON_MISSING',user.uid,user.email,'Técnico territorial sin cantón.');
  if (typeof profile.requiereCambioClave !== 'boolean') add('high','PASSWORD_FLAG_MISSING',user.uid,user.email,'requiereCambioClave no es booleano.');
  if (!String(profile.metodoActivacion || '').trim()) add('medium','ACTIVATION_METHOD_MISSING',user.uid,user.email,'Falta método de activación.',false);
  const targetLevel = expectedLevel(role, profile);
  if (targetLevel && normalize(profile.nivelAcceso) !== targetLevel) add('medium','ROLE_LEVEL_MISMATCH',user.uid,user.email,`Rol=${role}; nivel=${profile.nivelAcceso || 'vacío'}.`,false);
  const shouldReadOnly = ['Visor provincial AME','Visor zonal AME','Consulta provincial AME'].includes(role);
  if (shouldReadOnly && normalize(profile.modoAcceso) !== 'consulta') add('high','READ_ONLY_MODE_MISMATCH',user.uid,user.email,'Rol visor sin modo Consulta.');
  if (duplicateEmails.has(normalize(profile.correo))) add('critical','DUPLICATE_PROFILE_EMAIL',user.uid,user.email,'Correo duplicado entre perfiles.');
}
for (const profile of profiles) {
  if (!authByUid.has(profile.uid)) {
    const active = normalize(profile.estado) === 'activo';
    add(active ? 'critical' : 'info','ORPHAN_PROFILE',profile.uid,profile.correo,`Perfil sin Authentication; estado=${profile.estado || 'vacío'}.`,active);
  }
}

const blockingFindings = findings.filter(item => item.blocking && ['critical','high'].includes(item.severity));
const byCode = findings.reduce((acc,item) => (acc[item.code] = (acc[item.code] || 0) + 1, acc), {});
const bySeverity = findings.reduce((acc,item) => (acc[item.severity] = (acc[item.severity] || 0) + 1, acc), {});
const roles = profiles.reduce((acc,profile) => { const role = roleFor(profile); acc[role || 'Sin rol'] = (acc[role || 'Sin rol'] || 0) + 1; return acc; }, {});
const result = {
  generatedAt: new Date().toISOString(),
  projectId: 'smartrisk-cz5-produccion',
  readyForMassOnboarding: blockingFindings.length === 0,
  totals: {
    authenticationUsers: users.length,
    firestoreProfiles: profiles.length,
    activeProfiles: profiles.filter(profile => normalize(profile.estado) === 'activo').length,
    blockingFindings: blockingFindings.length,
    findings: findings.length,
    bySeverity,
    byCode,
    roles,
    emailVerifiedFalse: users.filter(user => !user.emailVerified).length,
    neverSignedIn: users.filter(user => !user.metadata?.lastSignInTime).length,
    disabledUsers: users.filter(user => user.disabled).length,
    passwordProviderMissing: users.filter(user => !user.providerData.some(provider => provider.providerId === 'password')).length
  },
  findings
};
fs.writeFileSync('ACCESS_READINESS_AUDIT.json', JSON.stringify(result, null, 2) + '\n');
console.log(JSON.stringify({ readyForMassOnboarding: result.readyForMassOnboarding, ...result.totals }, null, 2));
for (const [code,count] of Object.entries(byCode).sort()) console.log(`${code}: ${count}`);
if (!result.readyForMassOnboarding) process.exit(2);
