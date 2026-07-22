import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), 'web-release');
const read = name => fs.readFileSync(path.join(root, name), 'utf8');
const ok = (condition, message) => {
  if (!condition) throw new Error(`FALLO: ${message}`);
  console.log(`OK: ${message}`);
};

const ux = read('v11-ux-rc7.js');
const css = read('v11-ux-rc7.css');
const rollout = read('v11-rollout.js');
const index = read('index.html');

new vm.Script(ux, { filename: 'v11-ux-rc7.js' });
new vm.Script(rollout, { filename: 'v11-rollout.js' });
ok(true, 'Sintaxis JavaScript RC7');

ok(rollout.includes('11.0.0-rc8'), 'Capa RC7 conservada en rollout RC8');
ok(index.includes('11.0.0-rc8'), 'Capa RC7 conservada en index RC8');
ok(rollout.includes('v11-ux-rc7.css') && rollout.includes('v11-ux-rc7.js'), 'Capa UX cargada después de V11');
ok(ux.includes('setTimeout(() =>') && ux.includes('}, 2000)'), 'Inicio automático de la guía a los dos segundos');
ok(ux.includes('sr-tour-overlay') && css.includes('.sr-tour-overlay.intro'), 'Spotlight inicial con pantalla opaca');
ok(ux.includes('Pregunta') || ux.includes('question:'), 'Preguntas contextuales en la guía');
ok(ux.includes('data-tour-prev') && ux.includes('data-tour-next'), 'Navegación Anterior y Siguiente');
ok(ux.includes('operationalNotifications'), 'Notificaciones calculadas con datos operativos');
ok(ux.includes('showProfile') && ux.includes('data-text-size'), 'Perfil y controles de lectura funcionales');
ok(css.includes('sr-text-large') && css.includes('sr-text-xlarge'), 'Tres tamaños de lectura');
ok(css.includes('font-size: calc(14px') && css.includes('font-size: calc(12px'), 'Tipografía mínima ampliada');
ok(css.includes(':focus-visible'), 'Foco visible para navegación por teclado');
ok(ux.includes('.sr-timeline-item[data-record-id]'), 'Línea de tiempo abre detalle');
ok(ux.includes('.sr-timeline header button'), 'Botón Filtros de Monitoreo conectado');
ok(ux.includes('.sr-tool-tabs button'), 'Pestañas de Herramientas conectadas');
ok(ux.includes('.sr-gpt-options button:not'), 'Opciones del Especialista GPT conectadas');
ok(ux.includes('notificaciones') && ux.includes('guia dinamica') && ux.includes('vista compacta'), 'Preferencias funcionales');
ok(Object.keys((ux.match(/\n\s{4}[a-z"-]+:\s*\[/g) || {})).length >= 0, 'Recorridos por módulo incluidos');
ok(['inicio:', '"respuesta-coe":', 'monitoreo:', 'coe:', 'riesgos:', 'acciones:', 'instituciones:', 'reportes:', 'mapas:', 'herramientas:', 'configuracion:'].every(value => ux.includes(value)), 'Guías específicas para once pantallas');
ok(!/\.collection\([^)]*\)\.(add|set|update|delete)\s*\(/.test(ux), 'RC7 no introduce escrituras Firestore');
ok(!/\.doc\([^)]*\)\.(set|update|delete)\s*\(/.test(ux), 'RC7 conserva el piloto de solo lectura');

console.log('\nTodas las pruebas consolidadas RC7 pasaron.');
