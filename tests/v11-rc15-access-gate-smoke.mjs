import fs from "node:fs";

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const gate = read("access-gate.js");
const index = read("index.html");

const checks = [
  ["Compuerta invoca el rollout V11", gate.includes("SmartRiskV11Rollout.decide(user, profile)")],
  ["RC15 detiene la carga de la aplicación heredada", gate.includes("if (v11Enabled)") && gate.includes("loaded = true")],
  ["Modo heredado permanece como alternativa", gate.includes('await loadScript("app.js")')],
  ["Compuerta usa caché RC15", index.includes("access-gate.js?v=11.0.0-rc16.1")]
];

let failed = 0;
for (const [label, pass] of checks) {
  console.log(`${pass ? "OK" : "FAIL"}: ${label}`);
  if (!pass) failed += 1;
}
if (failed) process.exit(1);
console.log("\nTodas las pruebas de activación RC15 pasaron.");
