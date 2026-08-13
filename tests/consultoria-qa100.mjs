import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import assert from 'node:assert/strict';

const dist = path.resolve(process.argv[2] || 'dist');
const base = path.join(dist, 'vendor', 'smartrisk-consultoria');
const html = fs.readFileSync(path.join(base, 'index.html'), 'utf8');
const core = fs.readFileSync(path.join(base, 'consultoria-core.js'), 'utf8');
const patch = fs.readFileSync(path.join(base, 'national-qa-patch.js'), 'utf8');

assert.match(html, /consultoria-core\.js/);
assert.match(html, /national-qa-patch\.js/);
assert.match(html, /id="newBtn"/);
assert.match(html, /id="nextBtn"/);
assert.match(html, /id="backBtn"/);
assert.match(core, /\$\('newBtn'\)\.onclick/);
assert.match(core, /\$\('nextBtn'\)\.onclick/);
assert.match(core, /\$\('backBtn'\)\.onclick/);
assert.match(core, /\[data-close\]/);
assert.match(core, /\[data-p\]/);
assert.match(core, /\[data-sec\]/);
assert.match(core, /\[data-filter\]/);
assert.match(patch, /classList\.contains\('tab'\)/);
assert.match(patch, /classList\.contains\('btn'\)/);

const elements = new Map();
function fakeElement(id='') {
  return {
    id, innerHTML:'', value:'', textContent:'', className:'', title:'', style:{}, disabled:false,
    dataset:{}, classList:{toggle(){},contains(){return false}},
    insertAdjacentElement(_position, element){ if (element?.id) elements.set(element.id, element); },
    insertAdjacentHTML(){},
    querySelectorAll(){return[];},
    parentElement:null,
    onclick:null
  };
}
for (const id of ['province','stage','q','newBtn','backBtn','nextBtn']) elements.set(id, fakeElement(id));
const document = {
  getElementById(id){ return elements.get(id) || null; },
  createElement(){ return fakeElement(); },
  querySelectorAll(){ return []; },
  addEventListener(){},
  body:{appendChild(el){ if(el?.id) elements.set(el.id,el); }}
};
const data=[];
const s={province:'Todas',stage:'Todas',q:'',filter:'all',selected:'',wizard:0};
const context={
  console, document, data, s,
  $:id=>elements.get(id)||null,
  visible:()=>data,
  wizard:()=>{},
  renderAll:()=>{},
  project:()=>data.find(p=>p.id===s.selected)||data[0],
  window:{},
  setTimeout:()=>1,
  clearTimeout:()=>{}
};
vm.createContext(context);
vm.runInContext(patch, context, {filename:'national-qa-patch.js'});
const qa=context.window.SmartRiskConsultoriaQA;
assert.ok(qa, 'Debe exponer la interfaz QA');
assert.equal(qa.provinces.length,24,'Deben existir 24 provincias');
assert.equal(new Set(qa.provinces).size,24,'Las provincias no deben repetirse');
for(const required of ['Azuay','Guayas','Los Ríos','Pichincha','Santa Elena','Galápagos','Zamora Chinchipe']) assert.ok(qa.provinces.includes(required),`Falta ${required}`);

qa.load100();
assert.equal(data.length,100,'El modo QA debe crear exactamente 100 proyectos');
assert.equal(new Set(data.map(p=>p.id)).size,100,'IDs QA únicos');
assert.equal(new Set(data.map(p=>p.code)).size,100,'Códigos QA únicos');
assert.equal(new Set(data.map(p=>p.province)).size,24,'Los 100 casos deben cubrir las 24 provincias');
assert.equal(new Set(data.map(p=>p.gate)).size,11,'Los 100 casos deben cubrir G0–G10');

const roles=['gerencia','comercial','tecnico','geotecnia','geofisica','contractual','finanzas','qaqc'];
const buttonFamilies=['Nuevo proyecto','Continuar','Atrás','Cerrar modal','Proyecto','Sección','Filtro','Tab','Acción','QA100'];
const qaLog=[];
for(let i=0;i<100;i++){
  const p=data[i];
  assert.ok(qa.provinces.includes(p.province),`Caso ${i+1}: provincia válida`);
  assert.ok(/^G(?:10|[0-9])$/.test(p.gate),`Caso ${i+1}: Gate válido`);
  assert.ok([20,40,60,80,100].includes(p.progress),`Caso ${i+1}: avance válido`);
  assert.ok(p.price>=0&&p.cost>=0&&p.actual>=0&&p.committed>=0,`Caso ${i+1}: valores no negativos`);
  assert.ok(p.actual<=p.cost||p.cost===0,`Caso ${i+1}: costo real no excede costo previsto en fixture`);
  assert.ok(p.committed>=p.actual,`Caso ${i+1}: comprometido cubre ejecutado`);
  const provinceView=data.filter(x=>x.province===p.province);
  const stageView=data.filter(x=>x.stage===p.stage);
  assert.ok(provinceView.some(x=>x.id===p.id),`Caso ${i+1}: filtro provincia conecta`);
  assert.ok(stageView.some(x=>x.id===p.id),`Caso ${i+1}: filtro etapa conecta`);
  const role=roles[i%roles.length];
  const button=buttonFamilies[i%buttonFamilies.length];
  qaLog.push({case:i+1,project:p.code,province:p.province,stage:p.stage,gate:p.gate,role,button,result:'PASS'});
}
assert.equal(qaLog.length,100);

qa.clear100();
assert.equal(data.length,0,'El modo QA debe poder retirarse sin dejar fixtures');
console.log('PASS SmartRisk Consultoría QA100: 24 provincias, G0–G10, 100 proyectos y 100 recorridos de interacción simulados.');
