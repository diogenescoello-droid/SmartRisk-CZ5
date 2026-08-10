import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const dist=path.resolve(process.argv[2]||"dist");
const app=fs.readFileSync(path.join(dist,"app.js"),"utf8");
const optimized=fs.readFileSync(path.join(dist,"modules/review-performance-fix-20260731.js"),"utf8");

assert.match(app,/function reviewOriginalPlanUrl\(/,"Debe resolver la fuente original del plan");
assert.match(app,/url\.protocol==='https:'/,'Debe aceptar únicamente documentos HTTPS');
assert.match(app,/CONSULTAR_PLAN_ORIGINAL/,'Debe auditar la consulta del documento original');
assert.match(app,/Abrir PDF original/,'Debe ofrecer acceso al PDF cuando existe una fuente');
assert.match(app,/PDF original no vinculado/,'Debe informar cuando no existe una fuente verificable');
assert.match(optimized,/SmartRiskPlanSource/,'La vista optimizada debe conservar el acceso al documento original');

console.log("PASS acceso seguro y auditable al documento original del plan");
