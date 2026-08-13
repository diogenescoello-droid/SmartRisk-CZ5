import fs from 'node:fs';
import path from 'node:path';
import assert from 'node:assert/strict';

const dist=path.resolve(process.argv[2]||'dist');
const file=path.join(dist,'vendor','smartrisk-consultoria','national-qa-patch.js');
const src=fs.readFileSync(file,'utf8');

assert.doesNotMatch(src,/QA · cargar 100 casos/,'La plataforma publicada no debe mostrar controles para cargar los 100 casos QA');
assert.doesNotMatch(src,/100 casos cargados/,'La plataforma publicada no debe mostrar que existen 100 casos cargados');
assert.doesNotMatch(src,/installQaButton\(\)/,'La batería QA no debe instalar botones visibles en producción');
assert.match(src,/SmartRiskConsultoriaQA/,'Se conserva el catálogo auxiliar requerido por el asistente territorial');
console.log('PASS Consultoría: los 100 casos quedan como QA interno y no como contenido visible.');
