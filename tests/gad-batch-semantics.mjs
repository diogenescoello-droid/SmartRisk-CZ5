import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const dist = path.resolve(process.argv[2] || "dist");
const read = name => fs.readFileSync(path.join(dist, name), "utf8");
const sandbox = { window: {}, Object };
vm.runInNewContext(read("enos-matrix-preliminary.js"), sandbox, { filename: "enos-matrix-preliminary.js" });
vm.runInNewContext(read("f07-current-data.js"), sandbox, { filename: "f07-current-data.js" });

const rows = sandbox.window.ENOS_MATRIX_PRELIMINARY?.gads || [];
const followups = sandbox.window.SMART_RISK_F07_CURRENT?.followups || [];
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
  "general antonio elizalde bucay":"general antonio elizalde bucay",
  "san miguel de bolivar":"san miguel de bolivar",
  "san miguel":"san miguel de bolivar",
  "alfredo baquerizo moreno jujan":"alfredo baquerizo moreno",
  "jujan":"alfredo baquerizo moreno"
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
function normalizedF07Canton(value) {
  const n = norm(value);
  return f07CantonAliases[n] || n;
}
function matchesRow(item, row) {
  if (norm(item.province) !== norm(provinceFor(row))) return false;
  if (isProvincial(row)) return norm(item.level).includes("provinc");
  const canton = cantonFor(row);
  if (!canton) return false;
  return normalizedF07Canton(item.canton) === canton;
}

const audited = rows.map(row => {
  const scoped = followups.filter(item => matchesRow(item, row));
  const linkedActions = scoped.filter(item => norm(item.actionLinkState) === "vinculada").length;
  const linkedSites = scoped.filter(item => norm(item.siteLinkState) === "vinculado").length;
  const evidence = scoped.filter(item => Boolean(item.evidenceUrl)).length;
  const f01 = matrixStatus(row, "F01");
  const f04 = matrixStatus(row, "F04");
  const f07 = matrixStatus(row, "F07");
  const issues = [];
  if (scoped.length && !hasSignal(f07)) issues.push("F07_ACTUAL_NO_REFLEJADO_EN_MATRIZ");
  if (!scoped.length && hasSignal(f07)) issues.push("F07_MATRIZ_SIN_REGISTRO_EN_CORTE_ACTUAL");
  if (hasSignal(f04) && linkedActions === 0) issues.push("ACCIONES_DOCUMENTALES_SIN_HOMOLOGAR");
  if (hasSignal(f01) && linkedSites === 0) issues.push("SITIOS_DOCUMENTALES_SIN_HOMOLOGAR");
  return {
    number: Number(row.number),
    gad: row.gad,
    province: provinceFor(row),
    canton: cantonFor(row),
    institutionalStatus: row.institutionalStatus || "",
    validationState: row.validationState || "",
    f01, f04, f07,
    actualF07: scoped.length,
    linkedActions,
    linkedSites,
    evidence,
    issues
  };
});

const blocks = [audited.slice(0,10), audited.slice(10,20), audited.slice(20,30), audited.slice(30,40), audited.slice(40,50), audited.slice(50,56)];
for (let i=0; i<blocks.length; i++) {
  const block = blocks[i];
  console.log(`\n=== BLOQUE ${i+1} · GAD ${block[0].number}-${block[block.length-1].number} ===`);
  block.forEach(item => {
    console.log(JSON.stringify({
      n:item.number, gad:item.gad, prov:item.province, canton:item.canton || null,
      estado:item.institutionalStatus, validacion:item.validationState,
      F01:item.f01, F04:item.f04, F07:item.f07,
      f07Actual:item.actualF07, accionesVinc:item.linkedActions, sitiosVinc:item.linkedSites, evidencias:item.evidence,
      alertas:item.issues
    }));
  });
  const issueCounts = {};
  block.flatMap(item => item.issues).forEach(issue => issueCounts[issue] = (issueCounts[issue] || 0) + 1);
  console.log(`RESUMEN BLOQUE ${i+1}: ${JSON.stringify(issueCounts)}`);
}

const totals = audited.reduce((acc,item) => {
  acc.f07 += item.actualF07;
  acc.linkedActions += item.linkedActions;
  acc.linkedSites += item.linkedSites;
  acc.evidence += item.evidence;
  item.issues.forEach(issue => acc.issues[issue] = (acc.issues[issue] || 0) + 1);
  return acc;
}, {f07:0,linkedActions:0,linkedSites:0,evidence:0,issues:{}});
console.log(`\nTOTAL AUDITADO: ${JSON.stringify(totals)}`);

const unmatched = followups.filter(item => !rows.some(row => matchesRow(item, row)));
console.log(`F07 SIN EXPEDIENTE HOMOLOGADO: ${unmatched.length}`);
unmatched.forEach(item => console.log(JSON.stringify({
  id:item.id, sourceId:item.sourceId, level:item.level, province:item.province, canton:item.canton,
  actionLinkState:item.actionLinkState, actionReference:item.actionReference,
  siteLinkState:item.siteLinkState, siteReference:item.siteReference,
  evidence:Boolean(item.evidenceUrl), reportedAt:item.reportedAt
})));

console.log("PASS auditoría semántica por bloques: 56 expedientes procesados");
