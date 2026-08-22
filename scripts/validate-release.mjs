import fs from 'node:fs';
import path from 'node:path';
import zlib from 'node:zlib';
import {createHash} from 'node:crypto';

const root=process.cwd();
const read=file=>fs.readFileSync(path.join(root,file),'utf8');
const expect=(condition,message)=>{if(!condition)throw new Error(`VALIDACIÓN V1.0.0 PILOTO ESTABLE: ${message}`)};
const includes=(text,value,label)=>expect(text.includes(value),`${label}: falta ${value}`);
const sha256=value=>createHash('sha256').update(value).digest('hex');

function decodePayload(text,label){
  const match=text.match(/const PAYLOAD="([A-Za-z0-9+/=]+)";/);
  expect(match,`${label}: no se encontró PAYLOAD`);
  const raw=zlib.gunzipSync(Buffer.from(match[1],'base64'));
  return {raw,data:JSON.parse(raw.toString('utf8'))};
}

const manifest=JSON.parse(read('RELEASE_MANIFEST.json'));
expect(manifest.product==='SmartRisk CZ5','producto incorrecto');
expect(manifest.release==='V1.0.0 PILOTO ESTABLE','release incorrecto');
expect(manifest.build==='1.0.0-piloto-estable','build incorrecto');
expect(manifest.tag==='v1.0.0-piloto-estable','tag incorrecto');
expect(manifest.status==='stable','release no estable');
expect(manifest.counts.territories===56,'universo territorial incorrecto');
expect(manifest.counts.plansAvailable===56,'conteo de planes incorrecto');
expect(manifest.counts.riskReportsIndexed===6,'conteo inicial de informes de riesgo incorrecto');
expect(manifest.riskReportsWindowYears===5,'ventana temporal de informes incorrecta');
expect(manifest.acceptance.territorialGlobalsFiltered===true,'falta aceptación de paquetes globales filtrados');
expect(manifest.acceptance.territorialRenderGuard===true,'falta guardián de render territorial');
expect(manifest.acceptance.scopeUiIdempotent===true,'falta interfaz de alcance idempotente');
expect(manifest.acceptance.riskReportsRollingWindow===true,'falta ventana móvil de informes');
expect(manifest.acceptance.riskReportsFilteredByTerritory===true,'falta filtro cantonal de informes');
expect(manifest.acceptance.riskReportConsultationAudited===true,'falta trazabilidad de consultas');
for(const file of manifest.requiredFiles)expect(fs.existsSync(path.join(root,file)),`archivo obligatorio inexistente: ${file}`);

const index=read('index.html');
const gate=read('access-gate.js');
const guard=read('preview-rc14.4.4/territorial-scope-guard-20260731.js');
const scopeUi=read('scope-ui.js');
const receipt=read('preview-rc14.4.4/plan-receipt-status-fix-20260731.js');
const performance=read('preview-rc14.4.4/review-performance-fix-20260731.js');
const reportData=read('preview-rc14.4.4/risk-reports-5y-data.js');
const reportUi=read('preview-rc14.4.4/risk-reports-5y-ui.js');
const principal=read('preview-rc14.4.4/latest-data-update.js');
const completion=read('preview-rc14.4.4/followup-completion-20260730.js');

includes(index,'V1.0.0 PILOTO ESTABLE','index');
includes(index,'release-config.js?v=1.0.0-piloto-estable','index');
includes(index,'access-gate.js?v=11.0.0-rc16.6','index');
includes(gate,'const BUILD_VERSION = RELEASE.build','compuerta');
includes(gate,'uid-profile-scope-canonical-artifact','compuerta');
includes(gate,'risk-reports-5y-data.js','compuerta');
includes(gate,'risk-reports-5y-ui.js','compuerta');

for(const value of [
  'filterReviews(index)',
  'filterRiskLocations(index)',
  'window.F03_CARTOGRAPHY=window.F03_CARTOGRAPHY.filter',
  'window.ENOS_IMPORT.sites=window.ENOS_IMPORT.sites.filter',
  'data=window.SmartRiskScope.filterData(data)',
  'window.render=function(...args)',
  'missingPlans:missing',
  'scopeFiltered:true',
  'V1.0.0 PILOTO ESTABLE'
])includes(guard,value,'guardián territorial');

includes(scopeUi,'if(element&&element.textContent!==value)','interfaz de alcance');
includes(scopeUi,'observer.disconnect()','interfaz de alcance');
includes(scopeUi,'SMART_RISK_RELEASE?.release','interfaz de alcance');

for(const value of ['observer.disconnect()','note.textContent!==desiredNote','requestAnimationFrame(applyLabels)'])includes(receipt,value,'reconciliación documental');
for(const value of ['CHECKLIST_BATCH=25','requestAnimationFrame','buildIndex(reviews)'])includes(performance,value,'rendimiento documental');

for(const value of [
  'rollingWindowYears:5',
  'IR-GYE-CIUDAD-OLIMPO-2026',
  'IR-GYE-LEONIDAS-GARCIA-2026',
  'IR-DURAN-ESTERO-LA-MONA-2026',
  'IR-NOBOL-LA-PRIMAVERA-2026',
  'IR-GYE-CRISTO-REY-2025',
  'IR-SANTA-ELENA-SANTUARIO-OLON-2022'
])includes(reportData,value,'índice de informes');
expect((reportData.match(/id:"IR-/g)||[]).length===6,'el índice no contiene seis informes únicos');
for(const value of [
  'date.setFullYear(date.getFullYear()-Number(pack.rollingWindowYears||5))',
  'reportsForTerritory',
  'scopeAllows(territory)',
  'openReportDetail',
  'openReportList',
  'CONSULTAR_FICHA_INFORME_RIESGO',
  'ABRIR_INFORME_RIESGO',
  'Existen ${reports.length}',
  'últimos 5 años'
])includes(reportUi,value,'interfaz de informes');

const principalDecoded=decodePayload(principal,'actualización principal');
const completionDecoded=decodePayload(completion,'complemento de seguimientos');
expect(sha256(principalDecoded.raw)===manifest.packageHashes.principalRawSha256,'hash principal distinto');
expect(sha256(completionDecoded.raw)===manifest.packageHashes.completionRawSha256,'hash complemento distinto');
expect(principalDecoded.data?.config?.version===manifest.dataVersion,'versión principal distinta');
expect(completionDecoded.data?.version===manifest.completionVersion,'versión de complemento distinta');
expect(Array.isArray(principalDecoded.data?.entityPatches),'entityPatches principal inválido');
expect(Array.isArray(principalDecoded.data?.followups),'followups principal inválido');
expect(Array.isArray(completionDecoded.data?.followups),'followups complemento inválido');
expect(completionDecoded.data.followups.length===3,'complemento territorial distinto de 3 registros');

console.log(JSON.stringify({
  ok:true,
  release:manifest.release,
  build:manifest.build,
  territories:manifest.counts.territories,
  plansAvailable:manifest.counts.plansAvailable,
  riskReportsIndexed:manifest.counts.riskReportsIndexed,
  riskReportsWindowYears:manifest.riskReportsWindowYears,
  territorialScopeVersion:manifest.territorialScopeVersion,
  riskReportsVersion:manifest.riskReportsVersion,
  scopeGuard:true,
  riskReportsByCanton:true,
  reviewObserverIdempotent:true,
  packageHashesVerified:true
},null,2));
