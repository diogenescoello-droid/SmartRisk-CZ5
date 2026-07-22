import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'web-release');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const ok = (condition, message) => {
  if (!condition) throw new Error(`FALLO: ${message}`);
  console.log(`OK: ${message}`);
};

const routerCode = read('v11-router.js');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(routerCode, sandbox);
const router = sandbox.window.SmartRiskV11Router;

ok(router.routes.length === 11, 'Navegación consolidada de 11 accesos incluyendo Inicio');
ok(router.routes[0].id === 'inicio', 'Inicio es la pantalla inicial');
ok(router.normalizeRoute('') === 'inicio', 'Ruta vacía abre el dashboard');
ok(router.normalizeRoute('#/dashboard') === 'inicio', 'Alias dashboard conserva compatibilidad');
ok(router.routes.map(route => route.id).join('|') === 'inicio|respuesta-coe|coe|acciones|monitoreo|riesgos|mapas|instituciones|reportes|herramientas|configuracion', 'Orden lógico de módulos');
ok(router.routes.filter(route => route.group === 'Operación COE').map(route => route.id).join('|') === 'respuesta-coe|coe|acciones', 'Respuesta, COE y Acciones quedan juntos');
ok(router.routes.filter(route => route.group === 'Análisis y territorio').map(route => route.id).join('|') === 'monitoreo|riesgos|mapas', 'Monitoreo, Riesgos y Mapas quedan juntos');
ok(router.routes.filter(route => route.group === 'Administración').map(route => route.id).join('|') === 'herramientas|configuracion', 'Herramientas y Configuración quedan juntas');
ok(read('v11-permissions.js').includes('\"inicio\", \"respuesta-coe\"'), 'Inicio disponible para todos los perfiles');

const app = read('v11-app.js');
const css = read('v11.css');
const rollout = read('v11-rollout.js');
const index = read('index.html');

ok(app.includes('function renderDashboard()'), 'Dashboard interactivo presente');
ok(app.includes('Resumen ejecutivo territorial'), 'Encabezado ejecutivo presente');
ok(app.includes('Accesos operativos'), 'Accesos rápidos por módulo presentes');
ok(app.includes('Prioridades del territorio'), 'Prioridades de riesgos y acciones presentes');
ok(app.includes('Ciclo integrado de gestión'), 'Bloques funcionales agrupados presentes');
ok(app.includes('const navGroups = routes.reduce'), 'Sidebar agrupado sin eliminar módulos');
ok(app.includes('function renderResponseCOE()'), 'Respuesta COE se conserva');
ok(app.includes('function renderMonitoring()'), 'Monitoreo se conserva');
ok(app.includes('function renderCOE()'), 'COE se conserva');
ok(app.includes('function renderRisks()'), 'Riesgos se conserva');
ok(app.includes('function renderActions()'), 'Acciones se conserva');
ok(app.includes('function renderInstitutions()'), 'Instituciones se conserva');
ok(app.includes('function renderReports()'), 'Reportes se conserva');
ok(app.includes('function renderMaps()'), 'Mapas se conserva');
ok(app.includes('function renderTools()'), 'Herramientas se conserva');
ok(app.includes('function renderConfig()'), 'Configuración se conserva');
ok(app.includes('layoutNeuralConnectors'), 'Conectores neuronales dinámicos RC5 integrados');
ok(['Reporte de monitoreo','Validación técnica','Coordinación institucional','Decisión COE','Escalamiento','Mitigación'].every(label => app.includes(label)), 'Seis etapas del contrato visual conservadas');
ok(css.includes('.sr-dashboard-kpis'), 'Estilos del dashboard consolidados');
ok(css.includes('.sr-nav-group'), 'Estilos de grupos de navegación presentes');
ok(css.includes('.sr-neural-connectors'), 'Estilos de conectores neuronales conservados');
ok(rollout.includes('11.0.0-rc6') && index.includes('11.0.0-rc6'), 'Versión de caché RC6 consistente');
ok(!/\.collection\([^)]*\)\.(add|set|update|delete)\s*\(/.test(app) && !/\.doc\([^)]*\)\.(set|update|delete)\s*\(/.test(app), 'La interfaz V11 no introduce escrituras Firestore');

console.log('\nTodas las pruebas consolidadas RC6 pasaron.');
