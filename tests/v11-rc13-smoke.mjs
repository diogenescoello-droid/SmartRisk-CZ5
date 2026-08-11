import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), "dist");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const ok = (condition, message) => {
  if (!condition) throw new Error(`FALLO: ${message}`);
  console.log(`OK: ${message}`);
};

const menu = read("rc13-menu.js");
const css = read("rc13-menu.css");
const rollout = read("v11-rollout.js");
const index = read("index.html");
const architecture = fs.readFileSync(path.resolve(process.cwd(), "docs/RC13_MENU_ARCHITECTURE.md"), "utf8");

new vm.Script(menu, { filename: "rc13-menu.js" });

const rolloutPosition = index.indexOf("v11-rollout.js?v=11.0.0-rc15");
const menuPosition = index.indexOf("rc13-menu.js?v=1.0.0-piloto-estable");
const gatePosition = index.indexOf("access-gate.js?v=11.0.0-rc15");

ok(rolloutPosition >= 0 && rolloutPosition < gatePosition, "Rollout V11 restaurado antes de la compuerta de acceso");
ok(menuPosition > rolloutPosition && menuPosition < gatePosition, "Capa RC13 cargada antes de iniciar la aplicación");
ok(index.includes("rc13-menu.css?v=1.0.0-piloto-estable"), "Hoja de estilos RC13 usa la caché de la versión estable");
ok(rollout.includes('BUILD_VERSION = "11.0.0-rc15"'), "RC13 preservada bajo la caché vigente RC15");
ok(menu.includes("supportedNavigationModes") && ["legacy", "scoped", "v11"].every(mode => menu.includes(`"${mode}"`)), "Tres modos de navegación compatibles");
ok(menu.includes('button[data-route]') && menu.includes("v11Navigation"), "Navegación V11 integrada por data-route");
ok(["inicio", "dashboard", "respuesta-coe", "coe", "acciones", "monitoreo", "riesgos", "mapas", "instituciones", "reportes", "herramientas", "configuracion"].every(route => menu.includes(`route: "${route}"`)), "Doce rutas V11 conservadas en RC13");
ok(menu.includes("prepareV11PageButton") && menu.includes('button.querySelector("span")'), "Iconos y etiquetas V11 conservados");
ok(menu.includes("MutationObserver") && menu.includes("document.body"), "RC13 detecta la sustitución dinámica del menú");
ok(["transversal", "planificacion", "analisis", "respuesta"].every(group => menu.includes(`id: "${group}"`)), "Arquitectura funcional agrupada");
ok(css.includes(".rc13-nav-item.active") && css.includes(".rc13-nav-item.nav-active"), "Estado activo compatible con V10 y V11");
ok(css.includes("#app.v11-shell.sidebar-collapsed"), "Menú RC13 compatible con la barra V11 contraída");
ok(architecture.includes("Mantener activo `v11-rollout.js`") && architecture.includes("`data-route`"), "Contrato de compatibilidad RC13 documentado");
ok(!/\.collection\([^)]*\)\.(add|set|update|delete)\s*\(/.test(menu), "RC13 no introduce escrituras Firestore");
ok(!/\.doc\([^)]*\)\.(set|update|delete)\s*\(/.test(menu), "RC13 conserva la capa de presentación sin escrituras");

console.log("\nTodas las pruebas consolidadas RC13 pasaron.");
