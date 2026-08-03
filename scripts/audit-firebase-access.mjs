#!/usr/bin/env node
import { readFile, writeFile, chmod } from "node:fs/promises";
import { randomBytes } from "node:crypto";
import process from "node:process";
import { applicationDefault, getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { FieldValue, getFirestore } from "firebase-admin/firestore";

const PROJECT_ID = process.env.FIREBASE_PROJECT_ID || "smartrisk-cz5-produccion";
const SUPPORTED_ROLES = new Set([
  "Administrador",
  "Técnico territorial",
  "Coordinador COE",
  "Líder MTT/GT",
  "Tomador de decisión/control",
  "Visor provincial AME"
]);
const argv = process.argv.slice(2);
const applyIndex = argv.indexOf("--apply");
const manifestPath = applyIndex >= 0 ? argv[applyIndex + 1] : null;

if (!getApps().length) {
  initializeApp({ credential: applicationDefault(), projectId: PROJECT_ID });
}
const auth = getAuth();
const db = getFirestore();

const normalizeEmail = value => String(value || "").trim().toLowerCase();
const safeTimestamp = () => new Date().toISOString().replace(/[:.]/g, "-");
const randomPassword = () => {
  const raw = randomBytes(18).toString("base64url");
  return `CZ5!${raw}aA7`;
};

async function listAllUsers() {
  const users = [];
  let pageToken;
  do {
    const page = await auth.listUsers(1000, pageToken);
    users.push(...page.users);
    pageToken = page.pageToken;
  } while (pageToken);
  return users;
}

async function listProfiles() {
  const snapshot = await db.collection("perfiles").get();
  return snapshot.docs.map(document => ({ uid: document.id, ...document.data() }));
}

function audit(users, profiles) {
  const authByUid = new Map(users.map(user => [user.uid, user]));
  const profileByUid = new Map(profiles.map(profile => [profile.uid, profile]));
  const emailCounts = new Map();
  profiles.forEach(profile => {
    const email = normalizeEmail(profile.correo);
    if (email) emailCounts.set(email, (emailCounts.get(email) || 0) + 1);
  });
  const duplicateEmails = new Set([...emailCounts.entries()]
    .filter(([, count]) => count > 1)
    .map(([email]) => email));

  const findings = [];
  users.forEach(user => {
    const profile = profileByUid.get(user.uid);
    if (!profile) {
      findings.push({ severity: "critical", type: "AUTH_WITHOUT_PROFILE", uid: user.uid, email: user.email || "" });
      return;
    }
    const authEmail = normalizeEmail(user.email);
    const profileEmail = normalizeEmail(profile.correo);
    if (authEmail !== profileEmail) {
      findings.push({ severity: "critical", type: "EMAIL_MISMATCH", uid: user.uid, authEmail, profileEmail });
    }
    if (profile.estado !== "Activo") {
      findings.push({ severity: "high", type: "PROFILE_NOT_ACTIVE", uid: user.uid, email: authEmail, estado: profile.estado });
    }
    if (!SUPPORTED_ROLES.has(profile.rol)) {
      findings.push({ severity: "high", type: "UNSUPPORTED_ROLE", uid: user.uid, email: authEmail, rol: profile.rol });
    }
    if (profile.rol !== "Administrador"
      && !Array.isArray(profile.scopeKeys)
      && !profile.provincia
      && !profile.canton) {
      findings.push({ severity: "high", type: "MISSING_SCOPE", uid: user.uid, email: authEmail });
    }
    if (duplicateEmails.has(profileEmail)) {
      findings.push({ severity: "high", type: "DUPLICATE_PROFILE_EMAIL", uid: user.uid, email: profileEmail });
    }
    if (user.disabled) {
      findings.push({ severity: "high", type: "AUTH_DISABLED", uid: user.uid, email: authEmail });
    }
  });

  profiles.forEach(profile => {
    if (!authByUid.has(profile.uid)) {
      findings.push({
        severity: "critical",
        type: "PROFILE_WITHOUT_AUTH",
        uid: profile.uid,
        email: normalizeEmail(profile.correo)
      });
    }
  });

  return {
    projectId: PROJECT_ID,
    generatedAt: new Date().toISOString(),
    totals: {
      authUsers: users.length,
      profiles: profiles.length,
      findings: findings.length,
      critical: findings.filter(item => item.severity === "critical").length,
      high: findings.filter(item => item.severity === "high").length
    },
    findings
  };
}

async function loadManifest(path) {
  if (!path) return [];
  const parsed = JSON.parse(await readFile(path, "utf8"));
  if (!Array.isArray(parsed.users)) throw new Error("El manifiesto debe contener users: []");
  return parsed.users;
}

async function upsertPilotUsers(entries) {
  const credentials = [];
  for (const entry of entries) {
    const email = normalizeEmail(entry.email || entry.correo);
    if (!email) throw new Error("Cada usuario del manifiesto debe tener email");
    let user;
    let created = false;
    let temporaryPassword = "";
    try {
      user = await auth.getUserByEmail(email);
    } catch (error) {
      if (error.code !== "auth/user-not-found") throw error;
      temporaryPassword = randomPassword();
      user = await auth.createUser({
        email,
        displayName: entry.nombre || entry.name || email,
        password: temporaryPassword,
        emailVerified: false,
        disabled: false
      });
      created = true;
    }

    if (entry.resetTemporaryPassword === true && !created) {
      temporaryPassword = randomPassword();
      user = await auth.updateUser(user.uid, { password: temporaryPassword, disabled: false });
    }

    const role = entry.rol || entry.role || "Técnico territorial";
    if (!SUPPORTED_ROLES.has(role)) throw new Error(`Rol no permitido para ${email}: ${role}`);
    const scopeKeys = Array.isArray(entry.scopeKeys) ? [...new Set(entry.scopeKeys.filter(Boolean))] : [];
    if (role !== "Administrador" && !scopeKeys.length && !entry.provincia && !entry.canton) {
      throw new Error(`Usuario sin alcance: ${email}`);
    }

    await db.collection("perfiles").doc(user.uid).set({
      correo: email,
      nombre: entry.nombre || entry.name || user.displayName || email,
      rol: role,
      codigoRol: role === "Visor provincial AME" ? "AME" : role,
      provincia: entry.provincia || "",
      canton: entry.canton || "",
      nivelAcceso: entry.nivelAcceso || (role === "Administrador" ? "Zonal" : "Cantonal"),
      scopeKeys,
      estado: entry.estado || "Activo",
      modoAcceso: role === "Visor provincial AME" ? "Consulta" : "Operación",
      invitacionEstado: "PilotoActivo",
      requiereCambioClave: temporaryPassword ? true : Boolean(entry.requiereCambioClave),
      actualizadoEn: FieldValue.serverTimestamp(),
      actualizadoPor: "Firebase Admin SDK"
    }, { merge: true });

    const resetLink = await auth.generatePasswordResetLink(email);
    credentials.push({
      uid: user.uid,
      email,
      nombre: entry.nombre || entry.name || user.displayName || "",
      created,
      temporaryPassword: temporaryPassword || null,
      resetLink,
      scopeKeys,
      role
    });
  }

  const path = `pilot-credentials-${safeTimestamp()}.json`;
  await writeFile(path, JSON.stringify({
    warning: "ARCHIVO CONFIDENCIAL. Envíe cada enlace o contraseña únicamente a su titular y elimine este archivo al finalizar.",
    generatedAt: new Date().toISOString(),
    users: credentials
  }, null, 2), { mode: 0o600 });
  await chmod(path, 0o600);
  return path;
}

async function main() {
  console.log(`Proyecto: ${PROJECT_ID}`);
  if (manifestPath) {
    const entries = await loadManifest(manifestPath);
    const credentialPath = await upsertPilotUsers(entries);
    console.log(`Credenciales y enlaces generados en: ${credentialPath}`);
    console.log("No suba ese archivo a GitHub y elimínelo después de entregar las credenciales.");
  }

  const [users, profiles] = await Promise.all([listAllUsers(), listProfiles()]);
  const report = audit(users, profiles);
  const reportPath = `firebase-access-audit-${safeTimestamp()}.json`;
  await writeFile(reportPath, JSON.stringify(report, null, 2));
  console.log(JSON.stringify(report.totals, null, 2));
  console.log(`Informe completo: ${reportPath}`);
  if (report.totals.critical || report.totals.high) process.exitCode = 2;
}

main().catch(error => {
  console.error(error);
  process.exitCode = 1;
});
