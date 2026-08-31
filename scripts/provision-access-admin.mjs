#!/usr/bin/env node

/**
 * SmartRisk CZ5 - authoritative access provisioner.
 *
 * SECURITY:
 * - Reads the provisioning JSON only from a local/private path supplied with --file.
 * - Never writes or prints passwords.
 * - Never stores passwords in Firestore.
 * - Uses Firebase Admin SDK, so existing Authentication users can receive the exact
 *   password from the batch without recovery/activation email.
 *
 * Required runtime:
 *   npm install firebase-admin
 *   GOOGLE_APPLICATION_CREDENTIALS=/private/service-account.json \
 *     node scripts/provision-access-admin.mjs --file /private/access-batch.json \
 *     --project smartrisk-cz5-produccion
 */

import fs from 'node:fs/promises';
import process from 'node:process';
import { initializeApp, applicationDefault } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';
import { getFirestore, FieldValue } from 'firebase-admin/firestore';

function arg(name) {
  const i = process.argv.indexOf(name);
  return i >= 0 ? process.argv[i + 1] : null;
}

const file = arg('--file');
const projectId = arg('--project') || process.env.FIREBASE_PROJECT_ID || 'smartrisk-cz5-produccion';
const dryRun = process.argv.includes('--dry-run');

if (!file) {
  console.error('Uso: node scripts/provision-access-admin.mjs --file /ruta/privada/lote.json [--project ID] [--dry-run]');
  process.exit(2);
}

const normalizeEmail = value => String(value || '').trim().toLowerCase();
const clean = value => String(value || '').trim();
const unique = values => [...new Set((Array.isArray(values) ? values : []).map(clean).filter(Boolean))];

function validate(raw, index) {
  const correo = normalizeEmail(raw?.correo || raw?.email);
  const password = clean(raw?.password || raw?.claveInicial);
  const nombre = clean(raw?.nombre);
  const rol = clean(raw?.rol);
  const provincia = clean(raw?.provincia);
  const canton = clean(raw?.canton || raw?.cantón);
  const nivelAcceso = clean(raw?.nivelAcceso || raw?.nivel);
  const scopeKeys = unique(raw?.scopeKeys);
  const issues = [];

  if (!correo || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(correo)) issues.push('correo inválido');
  if (!password) issues.push('clave inicial faltante');
  if (password && password.length < 6) issues.push('clave inferior al mínimo de Firebase');
  if (!rol) issues.push('rol faltante');
  if (!nivelAcceso) issues.push('nivelAcceso faltante');
  if (!scopeKeys.length) issues.push('scopeKeys faltante');

  const level = nivelAcceso.toLowerCase();
  if (level.includes('zonal') && !(scopeKeys.length === 1 && scopeKeys[0] === 'ZONA:CZ5')) {
    issues.push('alcance zonal debe ser exactamente ZONA:CZ5');
  }
  if (level.includes('provinc') && !scopeKeys.every(key => key.startsWith('PROV:'))) {
    issues.push('alcance provincial inválido');
  }
  if ((level.includes('canton') || level.includes('territ')) && !scopeKeys.every(key => key.startsWith('TER:'))) {
    issues.push('alcance territorial inválido');
  }

  return { index, correo, password, nombre, rol, provincia, canton, nivelAcceso, scopeKeys, issues };
}

const parsed = JSON.parse(await fs.readFile(file, 'utf8'));
const rawUsers = Array.isArray(parsed) ? parsed : parsed?.users;
if (!Array.isArray(rawUsers)) throw new Error('El JSON debe ser un arreglo o contener users[].');

const users = rawUsers.map(validate);
const duplicateEmails = new Set();
const seen = new Set();
for (const user of users) {
  if (seen.has(user.correo)) duplicateEmails.add(user.correo);
  seen.add(user.correo);
}
for (const user of users) if (duplicateEmails.has(user.correo)) user.issues.push('correo duplicado en lote');

const invalid = users.filter(user => user.issues.length);
if (invalid.length) {
  for (const user of invalid) console.error(`INVALID #${user.index + 1} ${user.correo || '(sin correo)'}: ${user.issues.join('; ')}`);
  throw new Error(`Lote rechazado: ${invalid.length} registro(s) inválido(s). No se modificó Firebase.`);
}

initializeApp({ credential: applicationDefault(), projectId });
const auth = getAuth();
const db = getFirestore();

const report = { projectId, dryRun, processed: 0, created: 0, existing: 0, profileCreated: 0, profileUpdated: 0, incidents: [] };

for (const user of users) {
  let authUser;
  let existed = true;
  try {
    authUser = await auth.getUserByEmail(user.correo);
  } catch (error) {
    if (error?.code !== 'auth/user-not-found') throw error;
    existed = false;
  }

  if (dryRun) {
    console.log(`${user.correo}: ${existed ? 'EXISTING_AUTH' : 'NEW_AUTH'} / DRY_RUN`);
    report.processed += 1;
    report[existed ? 'existing' : 'created'] += 1;
    continue;
  }

  if (existed) {
    authUser = await auth.updateUser(authUser.uid, {
      password: user.password,
      disabled: false
    });
    report.existing += 1;
  } else {
    authUser = await auth.createUser({
      email: user.correo,
      password: user.password,
      disabled: false,
      emailVerified: false
    });
    report.created += 1;
  }

  const profileRef = db.collection('perfiles').doc(authUser.uid);
  const before = await profileRef.get();
  const payload = {
    correo: user.correo,
    nombre: user.nombre,
    rol: user.rol,
    codigoRol: user.rol,
    provincia: user.provincia || null,
    canton: user.canton || null,
    nivelAcceso: user.nivelAcceso,
    scopeKeys: user.scopeKeys,
    estado: 'Activo',
    requiereCambioClave: false,
    metodoActivacion: 'Credencial inicial administrada',
    actualizadoEn: FieldValue.serverTimestamp(),
    actualizadoPor: 'Firebase Admin provisioner'
  };
  await profileRef.set(payload, { merge: true });
  report[before.exists ? 'profileUpdated' : 'profileCreated'] += 1;
  report.processed += 1;
  console.log(`${user.correo}: ${existed ? 'UPDATED_AUTH' : 'CREATED_AUTH'} / PROFILE_OK`);
}

console.log('SUMMARY', JSON.stringify(report));
