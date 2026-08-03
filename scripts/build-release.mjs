import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "dist");
const config = JSON.parse(fs.readFileSync(path.join(root, "release-assets.json"), "utf8"));
const manifest = JSON.parse(fs.readFileSync(path.join(root, "RELEASE_MANIFEST.json"), "utf8"));

if (path.dirname(output) !== root || path.basename(output) !== "dist") {
  throw new Error(`Directorio de salida inseguro: ${output}`);
}

function requirePath(source) {
  if (!fs.existsSync(source)) throw new Error(`Activo requerido inexistente: ${path.relative(root, source)}`);
}

function copyFile(sourceRelative, destinationRelative = sourceRelative) {
  const source = path.join(root, sourceRelative);
  const destination = path.join(output, destinationRelative);
  requirePath(source);
  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);
}

fs.rmSync(output, { recursive: true, force: true });
fs.mkdirSync(output, { recursive: true });

for (const file of config.files) copyFile(file);
for (const directory of config.directories) {
  const source = path.join(root, directory);
  requirePath(source);
  fs.cpSync(source, path.join(output, directory), { recursive: true });
}
for (const [source, destination] of Object.entries(config.mappedFiles)) copyFile(source, destination);
for (const moduleName of config.featureModules) {
  copyFile(path.join("preview-rc14.4.4", moduleName), path.join("modules", moduleName));
}

const commit = execFileSync("git", ["rev-parse", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const committedAt = execFileSync("git", ["show", "-s", "--format=%cI", "HEAD"], { cwd: root, encoding: "utf8" }).trim();
const fileHashes = {};
for (const file of fs.readdirSync(output, { recursive: true, withFileTypes: true })) {
  if (!file.isFile()) continue;
  const absolute = path.join(file.parentPath || file.path, file.name);
  const relative = path.relative(output, absolute).split(path.sep).join("/");
  fileHashes[relative] = crypto.createHash("sha256").update(fs.readFileSync(absolute)).digest("hex");
}

const health = {
  product: manifest.product,
  release: manifest.release,
  build: manifest.build,
  status: manifest.status,
  dataCut: manifest.dataCut,
  commit,
  committedAt,
  artifactFiles: Object.keys(fileHashes).length,
  artifactSha256: crypto.createHash("sha256").update(JSON.stringify(fileHashes)).digest("hex")
};
fs.writeFileSync(path.join(output, "HEALTH.json"), `${JSON.stringify(health, null, 2)}\n`);
console.log(`SmartRisk ${health.release}: ${health.artifactFiles} activos → dist (${health.artifactSha256.slice(0, 12)})`);
