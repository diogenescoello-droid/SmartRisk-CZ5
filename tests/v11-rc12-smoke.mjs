import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), "web-release");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const ok = (condition, message) => { if (!condition) throw new Error(`FALLO: ${message}`); console.log(`OK: ${message}`); };

const governance = read("v11-governance-rc12.js");
const css = read("v11-governance-rc12.css");
const intelligence = read("v11-intelligence-rc11.js");
const rollout = read("v11-rollout.js");
const index = read("index.html");

new vm.Script(governance, { filename: "v11-governance-rc12.js" });
new vm.Script(intelligence, { filename: "v11-intelligence-rc11.js" });

ok(governance.includes('ROUTE_ID = "documentos"'), "Ruta Fuentes y documentos definida");
ok(["Gestión documental", "Monitoreo", "Análisis", "Respuesta", "Acciones", "Verificación"].every(text => governance.includes(text)), "Ciclo organizacional completo");
ok(["Estado", "Responsables", "Última actualización", "Fuentes identificadas", "Con evidencia", "Próximo control"].every(text => governance.includes(text)), "Monitoreo transversal con seis controles");
ok(governance.includes("Repositorio lógico") && governance.includes("no crea copias"), "Gestión documental conserva identidad de la fuente");
ok(governance.includes("Los reportes son productos del ciclo"), "Reportes diferenciados de las fuentes");
ok(governance.includes("documentRecords") && governance.includes("canonical"), "Inventario documental derivado de registros existentes");
ok(css.includes(".sr12-monitor-strip") && css.includes(".sr12-cycle") && css.includes(".sr12-doc-table"), "Estilos de arquitectura y documentos presentes");
ok(css.includes(".sr11-weather") && css.includes(".sr11-cantons"), "Corrección visual RC11 incluida");
ok(rollout.includes('11.0.0-rc12') && index.includes('11.0.0-rc12'), "Caché RC12 consistente");
ok(rollout.includes("v11-governance-rc12.css") && rollout.includes("v11-governance-rc12.js"), "Capa RC12 cargada por rollout");
ok(rollout.includes("v11-intelligence-rc11.js"), "RC11 se conserva bajo RC12");
ok(!/\.collection\([^)]*\)\.(add|set|update|delete)\s*\(/.test(governance), "RC12 no introduce escrituras Firestore");
ok(!/\.doc\([^)]*\)\.(set|update|delete)\s*\(/.test(governance), "RC12 conserva solo lectura");

console.log("\nTodas las pruebas consolidadas RC12 pasaron.");
