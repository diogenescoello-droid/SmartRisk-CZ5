import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const dist = path.resolve(process.argv[2] || "dist");
const jsPath = path.join(dist, "v11-cartography-planning.js");
const cssPath = path.join(dist, "v11-cartography-planning.css");
const rolloutPath = path.join(dist, "v11-rollout.js");

function ok(condition, message) {
  if (!condition) throw new Error(`FALLO: ${message}`);
  console.log(`OK: ${message}`);
}

ok(fs.existsSync(jsPath), "Visor cartográfico incluido en publicación");
ok(fs.existsSync(cssPath), "Estilos del visor cartográfico incluidos");
ok(fs.existsSync(path.join(dist, "geo/cantones-zonal5.geojson")), "Límites cantonales disponibles");
ok(fs.existsSync(path.join(dist, "geo/riesgo-bolivar-web.geojson")), "Tamizaje de Bolívar disponible");
ok(fs.existsSync(path.join(dist, "geo/riesgo-santa-elena-web.geojson")), "Tamizaje de Santa Elena disponible");

const source = fs.readFileSync(jsPath, "utf8");
const rollout = fs.readFileSync(rolloutPath, "utf8");
const context = { window: {}, document: {}, console, Map, Set, URL, Blob, Date, Number, String, Array, Object, Math, JSON };
vm.runInNewContext(source, context, { filename: "v11-cartography-planning.js" });
const api = context.window.SmartRiskCartographyPlanning;

ok(Boolean(api), "API cartográfica disponible");
ok(api.parsePoint("-2.1000 -79.9000 0 5").join(",") === "-2.1,-79.9", "Geopunto Kobo latitud-longitud interpretado correctamente");
ok(api.parsePoint("POINT (-79.9000 -2.1000)").join(",") === "-2.1,-79.9", "WKT longitud-latitud interpretado correctamente");
ok(api.parsePolygon("POLYGON((-79.9 -2.1,-79.8 -2.2,-79.7 -2.1))").length === 3, "Polígono WKT interpretado");
ok(source.includes("F03 con geometría"), "Capa F03 seleccionable");
ok(source.includes("Sitios críticos"), "Capa de sitios críticos seleccionable");
ok(source.includes("Acciones georreferenciadas"), "Capa de acciones georreferenciadas seleccionable");
ok(source.includes("Imagen satelital") && source.includes("Topográfico"), "Mapas base satelital y topográfico disponibles");
ok(source.includes("Añadir a planificación") && source.includes("Exportar GeoJSON"), "Selección operativa y exportación para planificación disponibles");
ok(source.includes("requieren validación técnica antes de sustentar una decisión oficial"), "Límite técnico del tamizaje explícito");
ok(source.includes("Fuentes F03 sin geometría proyectable"), "F03 documental separado de geometrías");
ok(!/\bdb\.|firebase\.firestore|runTransaction\s*\(|\.collection\s*\(/.test(source), "Visor cartográfico no escribe directamente en Firestore");
ok(rollout.includes('loadStyles("v11-cartography-planning.css")'), "Rollout carga estilos cartográficos");
ok(rollout.includes('loadScript("v11-cartography-planning.js")'), "Rollout carga visor cartográfico");
ok(rollout.includes("SmartRiskCartographyPlanning?.afterAppStart?.()"), "Rollout inicia visor cartográfico");

console.log("PASS visor cartográfico de planificación: capas, selección, F03, coordenadas, exportación y límites técnicos.");
