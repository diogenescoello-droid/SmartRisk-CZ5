import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dist=path.resolve(process.argv[2]||'dist');
const index=fs.readFileSync(path.join(dist,'vendor/smartrisk-consultoria/index.html'),'utf8');
const js=fs.readFileSync(path.join(dist,'vendor/smartrisk-consultoria/territorial-defaults.js'),'utf8');

assert.match(index,/territorial-defaults\.js/,'La plataforma debe cargar el catálogo territorial oficial');
assert.match(js,/urbanOfficialHa:\s*6060\.18/,'Loja debe precargar 6.060,18 ha como área urbana oficial');
assert.match(js,/expansionOfficialHa:\s*null/,'La expansión vigente de Loja no debe inventarse mientras no esté validada');
assert.match(js,/expansionHistoricalHa:\s*1278\.10/,'La referencia histórica debe conservarse únicamente como trazabilidad');
assert.match(js,/projectUrbanHa/,'Debe existir un área editable del proyecto separada del dato oficial');
assert.match(js,/Área urbana utilizada en este proyecto/,'La interfaz debe distinguir el área utilizada por el proyecto');
assert.match(js,/El valor oficial nunca se modifica/,'La interfaz debe explicar la regla de trazabilidad');
assert.match(js,/CANTONS_BY_PROVINCE/,'Debe existir catálogo dependiente de cantones');
console.log('PASS SmartRisk Consultoría: PDOT/PUGS oficial separado de ajustes del proyecto; Loja 6.060,18 ha validado.');
