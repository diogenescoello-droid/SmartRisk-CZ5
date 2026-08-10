import fs from "node:fs";
import path from "node:path";
import assert from "node:assert/strict";

const dist=path.resolve(process.argv[2]||"dist");
const app=fs.readFileSync(path.join(dist,"app.js"),"utf8");
const optimized=fs.readFileSync(path.join(dist,"modules/review-performance-fix-20260731.js"),"utf8");
const sources=fs.readFileSync(path.join(dist,"plan-sources.js"),"utf8");

assert.match(app,/function reviewOriginalPlanUrl\(/,"Debe resolver la fuente original del plan");
assert.match(app,/url\.protocol==='https:'/,'Debe aceptar únicamente documentos HTTPS');
assert.match(app,/CONSULTAR_PLAN_ORIGINAL/,'Debe auditar la consulta del documento original');
assert.match(app,/Abrir PDF original/,'Debe ofrecer acceso al PDF cuando existe una fuente');
assert.match(app,/PDF original no vinculado/,'Debe informar cuando no existe una fuente verificable');
assert.match(optimized,/SmartRiskPlanSource/,'La vista optimizada debe conservar el acceso al documento original');
assert.match(app,/SMART_RISK_PLAN_SOURCES/,'Debe consultar el catálogo institucional de documentos');
assert.match(sources,/1QnrVSNXHdz8uTSZ0VRAR-efC_b2qkYUB/,'Debe vincular el plan provincial firmado de Guayas');
assert.match(sources,/1azf3vR1zhlpXpcgX0ag64xGTZuhWevYy/,'Debe vincular el plan oficial cantonal de Daule');
assert.match(sources,/1QmyQ4eLj-6gfxgMEEKgdQ4rWpd-lPlU-/,'Debe vincular la versión validada del plan provincial de Bolívar');
assert.match(sources,/1Pel8lEhcurc3yxLuUmAAwSp1QtRQ_yyA/,'Debe vincular el plan provincial de Santa Elena');
assert.match(sources,/1PB2E0JxMh-XCHYlSOUuvs7CiUzPZ2W2B/,'Debe vincular el plan cantonal de La Libertad');

console.log("PASS acceso seguro y auditable al documento original del plan");
