import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const dist = path.resolve(process.argv[2] || "dist");
const read = name => fs.readFileSync(path.join(dist, name), "utf8");
const expect = (condition, message) => { if (!condition) throw new Error(`GAD batch semantics: ${message}`); };
const sandbox = { window: {}, Object };
vm.runInNewContext(read("enos-matrix-preliminary.js"), sandbox, { filename: "enos-matrix-preliminary.js" });
vm.runInNewContext(read("f07-current-data.js"), sandbox, { filename: "f07-current-data.js" });

const rows = sandbox.window.ENOS_MATRIX_PRELIMINARY?.gads || [];
const current = sandbox.window.SMART_RISK_F07_CURRENT || {};
const followups = current.followups || [];
const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
const aliases = {
  "jujan":"alfredo baquerizo moreno",
  "general antonio elizalde":"general antonio elizalde bucay",
  "coronel marcelino mariduena":"marcelino mariduena",
  "san jacinto de yaguachi":"yaguachi",
  "san miguel":"san miguel de bolivar"
};
const f07CantonAliases = {
  "bucay":"general antonio elizalde bucay",
  "general antonio elizalde":"general antonio elizalde bucay",
  "general antonio elizalde bucay":"general antonio elizalde bucay",
  "san miguel de bolivar":"san miguel de bolivar",
  "san miguel":"san miguel de bolivar",
  "alfredo baquerizo moreno jujan":"alfredo baquerizo moreno",
  "alfredo baquerizo moreno":"alfredo baquerizo moreno",
  "jujan":"alfredo baquerizo moreno",
  "coronel marcelino mariduena":"marcelino mariduena",
  "marcelino mariduena":"marcelino mariduena",
  "san jacinto de yaguachi":"yaguachi",
  "yaguachi":"yaguachi"
};

function provinceFor(row) {
  const n = Number(row.number);
  if (n === 1 || n === 4 || n === 5 || n === 56) return "Santa Elena";
  if (n === 2 || n === 3 || (n >= 6 && n <= 11)) return "Bolívar";
  if (n === 12 || (n >= 15 && n <= 17)) return "Galápagos";
  if (n === 13 || (n >= 18 && n <= 42)) return "Guayas";
  if (n === 14 || (n >= 43 && n <= 55)) return "Los Ríos";
  return "";
}
function cantonFor(row) {
  const name = String(row.gad || "");
  if (!/^GAD Municipal de /i.test(name)) return "";
  const raw = norm(name.replace(/^GAD Municipal de /i, ""));
  return aliases[raw] || raw;
}
function isProvincial(row) { return /Prefectura/i.test(row.gad || ""); }
function matrixStatus(row, form) { return String(row?.statuses?.[form] || "Sin registro").trim(); }
function hasSignal(value) { return norm(value) !== "sin registro"; }
function normalizedF07Canton(value) { const n = norm(value); return f07CantonAliases[n] || n; }
function matchesRow(item, row) {
  if (norm(item.province) !== norm(provinceFor(row))) return false;
  if (isProvincial(row)) return norm(item.level).includes("provinc");
  const canton = cantonFor(row);
  if (!canton) return false;
  return normalizedF07Canton(item.canton) === canton;
}

expect(rows.length === 56, `se esperaban 56 expedientes y se encontraron ${rows.length}`);
const audited = rows.map(row => {
  const scoped = followups.filter(item => matchesRow(item, row));
  const linkedActions = scoped.filter(item => norm(item.actionLinkState) === "vinculada").length;
  const linkedSites = scoped.filter(item => norm(item.siteLinkState) === "vinculado").length;
  const evidence = scoped.filter(item => Boolean(item.evidenceUrl)).length;
  const f01 = matrixStatus(row, "F01"), f04 = matrixStatus(row, "F04"), f07 = matrixStatus(row, "F07");
  const issues = [];
  if (scoped.length && !hasSignal(f07)) issues.push("F07_ACTUAL_POSTERIOR_AL_CORTE_MATRIZ");
  if (!scoped.length && hasSignal(f07)) issues.push("F07_DOCUMENTAL_SIN_REGISTRO_EN_CORTE_ACTUAL");
  if (hasSignal(f04) && linkedActions === 0) issues.push("ACCIONES_DOCUMENTALES_SIN_HOMOLOGAR");
  if (hasSignal(f01) && linkedSites === 0) issues.push("SITIOS_DOCUMENTALES_SIN_HOMOLOGAR");
  return { number:Number(row.number), gad:row.gad, province:provinceFor(row), canton:cantonFor(row), f01,f04,f07, actualF07:scoped.length, linkedActions,linkedSites,evidence,issues };
});

const blocks = [audited.slice(0,10),audited.slice(10,20),audited.slice(20,30),audited.slice(30,40),audited.slice(40,50),audited.slice(50,56)];
expect(JSON.stringify(blocks.map(block => block.length)) === JSON.stringify([10,10,10,10,10,6]), "partición de revisión distinta de 10+10+10+10+10+6");
for (let i=0;i<blocks.length;i++) {
  const block=blocks[i], issueCounts={};
  block.flatMap(item=>item.issues).forEach(issue=>issueCounts[issue]=(issueCounts[issue]||0)+1);
  console.log(`BLOQUE ${i+1} · GAD ${block[0].number}-${block[block.length-1].number}: ${JSON.stringify(issueCounts)}`);
}

const totals = audited.reduce((acc,item)=>{acc.f07+=item.actualF07;acc.linkedActions+=item.linkedActions;acc.linkedSites+=item.linkedSites;acc.evidence+=item.evidence;return acc;},{f07:0,linkedActions:0,linkedSites:0,evidence:0});
const outsideGadUniverse = followups.filter(item => !rows.some(row => matchesRow(item,row)));
const zonal = outsideGadUniverse.filter(item => norm(item.level).includes("zonal") && !String(item.province||"").trim() && !String(item.canton||"").trim());
const unresolved = outsideGadUniverse.filter(item => !zonal.includes(item));
const zonalMetrics = {
  f07:zonal.length,
  linkedActions:zonal.filter(item=>norm(item.actionLinkState)==="vinculada").length,
  linkedSites:zonal.filter(item=>norm(item.siteLinkState)==="vinculado").length,
  evidence:zonal.filter(item=>Boolean(item.evidenceUrl)).length
};

expect(unresolved.length === 0, `${unresolved.length} F07 territoriales quedaron sin expediente homologado`);
expect(totals.f07 + zonalMetrics.f07 === followups.length, "la suma territorial + zonal no coincide con el total F07");
const summary = current.summary || {};
if (Number.isFinite(Number(summary.followups))) expect(followups.length === Number(summary.followups), "followups no coincide con summary.followups");
if (Number.isFinite(Number(summary.linkedActions))) expect(totals.linkedActions + zonalMetrics.linkedActions === Number(summary.linkedActions), "acciones vinculadas territorial+zonal no coincide con summary");
if (Number.isFinite(Number(summary.linkedSites))) expect(totals.linkedSites + zonalMetrics.linkedSites === Number(summary.linkedSites), "sitios vinculados territorial+zonal no coincide con summary");
if (Number.isFinite(Number(summary.evidenceAttached))) expect(totals.evidence + zonalMetrics.evidence === Number(summary.evidenceAttached), "evidencias territorial+zonal no coincide con summary");

console.log(`TOTAL TERRITORIAL 56 GAD: ${JSON.stringify(totals)}`);
console.log(`REGISTROS INSTITUCIONALES ZONALES: ${JSON.stringify(zonalMetrics)}`);
console.log(`PASS auditoría semántica: ${followups.length} F07 = ${totals.f07} territoriales + ${zonalMetrics.f07} zonales; 56 expedientes procesados`);
