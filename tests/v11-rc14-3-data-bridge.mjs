import fs from 'node:fs';
import vm from 'node:vm';
import assert from 'node:assert/strict';
const context={window:{}};context.window.window=context.window;vm.createContext(context);
for(const file of ['web-release/data.js','web-release/pilot-baseline-data.js','web-release/pilot-baseline-bridge.js']){
  vm.runInContext(fs.readFileSync(file,'utf8'),context,{filename:file});
}
const data=context.window.SEED_DATA;
assert.equal(data.territorios.length,51);
assert.equal(data.entidadesSeguimiento.length,56);
assert.equal(data.seguimientos.length,100);
assert.equal(data.entidadesSeguimiento.filter(item=>item.level==='Cantonal'&&item.territorioId).length,51);
assert.ok(data.territorios.some(item=>item.provincia==='Galápagos'&&item.canton==='Santa Cruz'));
console.log('PASS RC14.3 puente de datos: 51 cantones, 56 entidades y 100 seguimientos');
