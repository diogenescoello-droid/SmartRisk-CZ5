import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(process.argv[2] || "dist");
const read = name => fs.readFileSync(path.join(dist, name), "utf8");
const expect = (condition, message) => { if (!condition) throw new Error(`Decision KPIs: ${message}`); };

const js = read("desktop-home-decision-kpis.js");
const css = read("desktop-home-decision-kpis.css");
const bootstrap = read("desktop-bootstrap.js");
const assets = JSON.parse(read("release-assets.json"));

for (const phrase of [
  "Sitios / territorios identificados",
  "Territorios priorizados",
  "Acciones vinculadas a sitios",
  "Presupuesto asignado a acciones",
  "No cuantificado",
  "Sin vínculo",
  "Referencial",
  "Seguimiento secundario"
]) expect(js.includes(phrase), `falta el contrato visible “${phrase}”`);

expect(js.includes("actionLinkState") && js.includes("siteLinkState"), "no distingue acción homologada de vínculo territorial");
expect(js.includes("presupuestoAsignado") && js.includes("montoAsignado"), "no busca montos presupuestarios por acción");
expect(js.includes("territoryInfo") && js.includes("actionCountFromDoc"), "no conserva lectura documental cuando falta homologación estructurada");
expect(js.includes("no se suman") || js.includes("No se suman"), "no advierte sobre agregación de montos o escalas no comparables");
expect(css.includes("v1-decision-card") && css.includes("is-textual"), "faltan estilos para indicadores textuales sin falsos ceros");
expect(bootstrap.includes('loadStyle("desktop-home-decision-kpis.css")'), "bootstrap no carga estilos de decisión");
expect(bootstrap.includes('loadScript("desktop-home-decision-kpis.js")'), "bootstrap no carga lógica de decisión");
expect(assets.files.includes("desktop-home-decision-kpis.js") && assets.files.includes("desktop-home-decision-kpis.css"), "activos de decisión fuera del release canónico");

console.log("PASS Inicio de decisión: territorio, prioridad, acción, presupuesto y brechas de vinculación visibles sin falsos ceros.");
