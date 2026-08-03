import fs from "node:fs";
import path from "node:path";
import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const run = (command, args) => {
  const result = spawnSync(command, args, { cwd: root, stdio: "inherit" });
  if (result.status !== 0) process.exit(result.status || 1);
};

run(process.execPath, ["scripts/build-release.mjs"]);
for (const validator of [
  "scripts/validate-canonical-release.mjs",
  "scripts/validate-release.mjs",
  "scripts/validate-scientific-quality-fix.mjs",
  "scripts/validate-plan-receipt-status.mjs"
]) run(process.execPath, [validator]);

const tests = fs.readdirSync(path.join(root, "tests"))
  .filter(file => file.endsWith(".mjs"))
  .sort();
for (const test of tests) run(process.execPath, [path.join("tests", test), "dist"]);

const javascript = fs.readdirSync(path.join(root, "dist"), { recursive: true, withFileTypes: true })
  .filter(file => file.isFile() && file.name.endsWith(".js"))
  .map(file => path.relative(root, path.join(file.parentPath || file.path, file.name)))
  .sort();
for (const file of javascript) run(process.execPath, ["--check", file]);

const conflictPattern = /^(<<<<<<<|=======|>>>>>>>)/m;
for (const file of [...javascript, "firestore.rules", "firebase.json", "RELEASE_MANIFEST.json"]) {
  if (conflictPattern.test(fs.readFileSync(path.join(root, file), "utf8"))) {
    throw new Error(`Marcador de conflicto en ${file}`);
  }
}
console.log(`PASS suite estable: ${tests.length} pruebas y ${javascript.length} archivos JavaScript verificados`);
