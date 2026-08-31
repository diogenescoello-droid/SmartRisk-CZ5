import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const targetRoot = process.argv[2] ? path.resolve(root, process.argv[2]) : root;
const file = path.join(targetRoot, "user-experience-stability.js");

if (!fs.existsSync(file)) throw new Error("Falta user-experience-stability.js en el artefacto");
const source = fs.readFileSync(file, "utf8");

const expectations = [
  ["route del escenario", /escenario-cuenca-media/],
  ["corte del ciclo de render sin hashchange", /history\.replaceState/],
  ["salida segura hacia navegación legacy", /data-page/],
  ["mapeo de cartografía legacy", /mapas:\s*"herramientas"/],
  ["mapeo de riesgos legacy", /riesgos:\s*"sitios"/],
  ["explicación de límite administrativo", /límite administrativo de referencia/],
  ["advertencia de que límite no es nivel de riesgo", /no representa por sí solo un sitio crítico ni un nivel de riesgo/],
  ["acción hacia sitios críticos", /data-sr-open-critical-sites/],
  ["guía para información incompleta", /Información todavía incompleta/]
];

for (const [label, pattern] of expectations) {
  if (!pattern.test(source)) throw new Error(`Falla UX stability: ${label}`);
}

console.log("PASS user-experience-stability: navegación del escenario y guía cartográfica protegidas");
