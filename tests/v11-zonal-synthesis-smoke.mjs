import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(process.argv[2] || "dist");
const synthesisPath = path.join(dist, "v11-zonal-synthesis.js");
const rolloutPath = path.join(dist, "v11-rollout.js");

function ok(condition, message) {
  if (!condition) throw new Error(`FALLO: ${message}`);
  console.log(`OK: ${message}`);
}

ok(fs.existsSync(synthesisPath), "Capa de síntesis zonal incluida en publicación");
const synthesis = fs.readFileSync(synthesisPath, "utf8");
const rollout = fs.readFileSync(rolloutPath, "utf8");

ok(synthesis.includes("Síntesis zonal ENOS 2026–2027"), "Síntesis zonal visible");
ok(synthesis.includes("ENOS_MATRIX_PRELIMINARY"), "Matriz ENOS utilizada como fuente derivada");
ok(synthesis.includes("SMART_RISK_F07_CURRENT"), "Seguimiento F07 utilizado como fuente derivada");
ok(synthesis.includes("No constituye un plan oficial independiente"), "Límite institucional explícito");
ok(synthesis.includes("no se crean registros territoriales nuevos"), "No se fabrican datos territoriales");
for (let i = 1; i <= 7; i += 1) {
  ok(synthesis.includes(`F0${i}`), `Formulario F0${i} cubierto en síntesis zonal`);
}
ok(rollout.includes('loadScript("v11-zonal-synthesis.js")'), "Rollout carga síntesis zonal");
ok(rollout.includes("SmartRiskZonalSynthesis?.afterAppStart?.()"), "Rollout inicia síntesis zonal");
const directWritePattern = /firebase\.firestore|\bfirestore\.(collection|doc|set|update|delete)|\bdb\.(collection|doc|set|update|delete)\s*\(|\.collection\s*\(/;
ok(!directWritePattern.test(synthesis), "Síntesis zonal es capa de lectura sin escrituras directas");

console.log("PASS síntesis zonal derivada: cobertura F01–F07, trazabilidad y límite institucional.");
