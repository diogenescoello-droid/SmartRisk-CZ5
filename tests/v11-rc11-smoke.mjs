import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), "web-release");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const ok = (condition, message) => { if (!condition) throw new Error(`FALLO: ${message}`); console.log(`OK: ${message}`); };

const intelligence = read("v11-intelligence-rc11.js");
const css = read("v11-intelligence-rc11.css");
const rollout = read("v11-rollout.js");
const index = read("index.html");
new vm.Script(intelligence, { filename: "v11-intelligence-rc11.js" });

ok(intelligence.includes('ROUTE_ID = "inteligencia"'), "Ruta de Inteligencia territorial definida");
ok(intelligence.includes("Bitácora de Turno de Monitoreo No. 0281"), "Bitácora UMEVA piloto incorporada");
ok(intelligence.includes("Pronóstico y vigilancia") && intelligence.includes("Cantones bajo atención"), "Lectura meteorológica y territorial disponible");
ok(["Preparación", "Análisis", "Respuesta"].every(text => intelligence.includes(text)), "Uso diferenciado en las tres fases");
ok(intelligence.includes("2021") && intelligence.includes("2026") && intelligence.includes("Pendiente de indexación"), "Inventario histórico 2021-2026 visible");
ok(intelligence.includes("No activar ni escalar únicamente por este pronóstico"), "Evita escalamiento automático por pronóstico");
ok(intelligence.includes("sin acceso de Gmail desde el navegador") || intelligence.includes("no se leen desde GitHub Pages"), "Límite seguro del conector Gmail comunicado");
ok(rollout.includes('11.0.0-rc11') && index.includes('11.0.0-rc11'), "Caché RC11 consistente");
ok(rollout.includes("v11-intelligence-rc11.css") && rollout.includes("v11-intelligence-rc11.js"), "Capa RC11 cargada por rollout");
ok(css.includes(".sr11-hero") && css.includes(".sr11-history") && css.includes(".sr11-pipeline"), "Estilos de inteligencia territorial presentes");
ok(!/\.collection\([^)]*\)\.(add|set|update|delete)\s*\(/.test(intelligence), "RC11 no introduce escrituras Firestore");
ok(!/\.doc\([^)]*\)\.(set|update|delete)\s*\(/.test(intelligence), "RC11 conserva solo lectura");
console.log("\nTodas las pruebas consolidadas RC11 pasaron.");

