import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'web-release');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const ok = (condition, message) => {
  if (!condition) throw new Error(`FALLO: ${message}`);
  console.log(`OK: ${message}`);
};

const routerCode = read('v11-router.js');
const permissions = read('v11-permissions.js');
const rollout = read('v11-rollout.js');
const index = read('index.html');
const dashboard = read('v11-dashboard-rc8.js');
const css = read('v11-dashboard-rc8.css');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(routerCode, sandbox);
const router = sandbox.window.SmartRiskV11Router;

new vm.Script(dashboard, { filename: 'v11-dashboard-rc8.js' });
new vm.Script(rollout, { filename: 'v11-rollout.js' });
ok(true, 'Sintaxis JavaScript RC8');
ok(router.routes.length === 12, 'Navegación con 12 módulos');
ok(router.routes[0].id === 'inicio' && router.routes[1].id === 'dashboard', 'Dashboard ubicado inmediatamente después de Inicio');
ok(router.normalizeRoute('#/dashboard') === 'dashboard', 'Ruta Dashboard independiente');
ok(permissions.includes('"inicio", "dashboard", "respuesta-coe"'), 'Dashboard disponible para todos los perfiles');
ok(rollout.includes('11.0.0-rc9') && index.includes('11.0.0-rc9'), 'Versión de caché RC8 consistente');
ok(rollout.includes('v11-dashboard-rc8.css') && rollout.includes('v11-dashboard-rc8.js'), 'Capa Dashboard RC8 cargada');
ok(dashboard.includes('geo/cantones-zonal5.geojson'), 'Mapa cantonal usa el GeoJSON existente');
ok(dashboard.includes('¿Con qué información cuento?'), 'Inventario territorial presente');
ok(dashboard.includes('Comparación del avance'), 'Comparación cantonal frente a la Zona 5 presente');
ok(dashboard.includes('data-rc8-route="acciones"') && dashboard.includes('data-rc8-panel="planes"') && dashboard.includes('data-rc8-route="instituciones"'), 'Accesos contextuales a Acciones, Planes y Contactos');
ok(dashboard.includes('data-rc8-scroll="indicadores"') && dashboard.includes('data-rc8-panel="detalle"'), 'Accesos a Indicadores y Detalle territorial');
ok(dashboard.includes('state.filters.provincia') && dashboard.includes('state.filters.canton'), 'Filtros territoriales persistentes');
ok(dashboard.includes('Pregunta sugerente'), 'Pregunta contextual por cantón');
ok(css.includes('overflow-x: hidden') && css.includes('overflow-y: auto'), 'Menú lateral corregido para zoom 100 %');
ok(css.includes('.sr8-map') && css.includes('.sr8-territory-panel') && css.includes('.sr8-inventory'), 'Diseño de mapa, panel e inventario presente');
ok(dashboard.includes('Guayas') && dashboard.includes('Los Ríos') && dashboard.includes('Santa Elena') && dashboard.includes('Bolívar') && dashboard.includes('Galápagos'), 'Alcance explícito de las cinco provincias de la Zona 5');
ok(!/\.collection\([^)]*\)\.(add|set|update|delete)\s*\(/.test(dashboard), 'RC8 no introduce escrituras Firestore');
ok(!/\.doc\([^)]*\)\.(set|update|delete)\s*\(/.test(dashboard), 'RC8 conserva el piloto de solo lectura');

console.log('\nTodas las pruebas consolidadas RC8 pasaron.');
