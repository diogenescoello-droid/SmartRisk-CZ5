import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dist = path.join(root, "dist");
const manifest = JSON.parse(fs.readFileSync(path.join(root, "RELEASE_MANIFEST.json"), "utf8"));
const assets = JSON.parse(fs.readFileSync(path.join(root, "release-assets.json"), "utf8"));
const fail = message => { throw new Error(`FALLO CANÓNICO: ${message}`); };
const read = relative => fs.readFileSync(path.join(dist, relative), "utf8");

if (!fs.existsSync(path.join(dist, "index.html"))) fail("ejecute primero node scripts/build-release.mjs");
for (const file of assets.files) if (!fs.existsSync(path.join(dist, file))) fail(`falta ${file}`);
for (const moduleName of assets.featureModules) if (!fs.existsSync(path.join(dist, "modules", moduleName))) fail(`falta modules/${moduleName}`);
for (const forbidden of ["web-release", "preview-rc14.4.4", ".git", ".github", "firestore.rules", "firebase.json"]) {
  if (fs.existsSync(path.join(dist, forbidden))) fail(`el artefacto contiene ${forbidden}`);
}

const releaseContext = { window: {} };
vm.createContext(releaseContext);
vm.runInContext(read("release-config.js"), releaseContext, { filename: "release-config.js" });
const release = releaseContext.window.SMART_RISK_RELEASE;
if (release.release !== manifest.release || release.build !== manifest.build || release.tag !== manifest.tag) {
  fail("release-config.js y RELEASE_MANIFEST.json no coinciden");
}

const index = read("index.html");
const gate = read("access-gate.js");
for (const token of ["release-config.js", "scope-context.js", "scope-repository.js", "access-gate.js"]) {
  if (!index.includes(token)) fail(`index.html no carga ${token}`);
}
if (/14\.4\.0-security|RC14\.4\.4 RC\d/.test(index)) fail("index.html conserva una versión pública anterior");
if (!gate.includes("modules/")) fail("la compuerta no usa el directorio canónico de módulos");
if (!gate.includes("territorial-scope-guard-20260731.js")) fail("falta el refuerzo territorial");
if (!gate.includes("risk-reports-map-layer-20260803.js")) fail("falta la capa cartográfica de informes");
if (!read("app.js").includes("diogenes.coello@gestionderiesgos.gob.ec")) fail("administrador institucional no unificado");

const health = JSON.parse(read("HEALTH.json"));
if (health.release !== manifest.release || health.build !== manifest.build || health.status !== "stable") fail("HEALTH.json no representa el manifiesto estable");
console.log(`PASS artefacto canónico ${manifest.release} (${health.artifactFiles} activos)`);
