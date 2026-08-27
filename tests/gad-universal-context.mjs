import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const dist = path.resolve(process.argv[2] || "dist");
const matrixPath = path.join(dist, "enos-matrix-preliminary.js");
const contextPath = path.join(dist, "desktop-home-plan-context.js");
const cleanupPath = path.join(dist, "user-facing-cleanup.js");

const expect = (condition, message) => {
  if (!condition) throw new Error(`GAD universal context: ${message}`);
};

const sandbox = { window: {} };
vm.runInNewContext(fs.readFileSync(matrixPath, "utf8"), sandbox, { filename: matrixPath });
const rows = sandbox.window.ENOS_MATRIX_PRELIMINARY?.gads || [];

expect(rows.length === 56, `se esperaban 56 expedientes y se encontraron ${rows.length}`);
const numbers = rows.map(row => Number(row.number)).sort((a,b) => a-b);
expect(numbers.every((value,index) => value === index + 1), "la numeración 1–56 tiene vacíos o duplicados");

const forms = ["F01","F02","F03","F04","F05","F06","F07"];
rows.forEach(row => {
  forms.forEach(form => expect(typeof row.statuses?.[form] === "string" && row.statuses[form].trim(), `${row.gad}: falta ${form}`));
});

function provinceFor(row) {
  const n = Number(row.number);
  if (n === 1 || n === 4 || n === 5 || n === 56) return "Santa Elena";
  if (n === 2 || n === 3 || (n >= 6 && n <= 11)) return "Bolívar";
  if (n === 12 || (n >= 15 && n <= 17)) return "Galápagos";
  if (n === 13 || (n >= 18 && n <= 42)) return "Guayas";
  if (n === 14 || (n >= 43 && n <= 55)) return "Los Ríos";
  return "";
}

const normalize = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, " ").trim().toLowerCase();
const aliases = {
  "jujan":"alfredo baquerizo moreno",
  "general antonio elizalde":"general antonio elizalde bucay",
  "coronel marcelino mariduena":"marcelino mariduena",
  "san jacinto de yaguachi":"yaguachi",
  "san miguel":"san miguel de bolivar"
};

function cantonFor(row) {
  const name = String(row.gad || "");
  if (!/^GAD Municipal de /i.test(name)) return "";
  const raw = normalize(name.replace(/^GAD Municipal de /i, ""));
  return aliases[raw] || raw;
}

const keys = new Set();
rows.forEach(row => {
  const province = provinceFor(row);
  expect(Boolean(province), `${row.number} ${row.gad}: provincia sin mapear`);
  if (/^GAD Municipal de /i.test(row.gad || "")) {
    const canton = cantonFor(row);
    expect(Boolean(canton), `${row.number} ${row.gad}: cantón sin mapear`);
    const key = `${normalize(province)}|${canton}`;
    expect(!keys.has(key), `${row.gad}: clave territorial municipal duplicada ${key}`);
    keys.add(key);
  }
});

const batches = [rows.slice(0,10), rows.slice(10,20), rows.slice(20,30), rows.slice(30,40), rows.slice(40,50), rows.slice(50,56)];
expect(JSON.stringify(batches.map(batch => batch.length)) === JSON.stringify([10,10,10,10,10,6]), "la partición de auditoría no es 10+10+10+10+10+6");

const context = fs.readFileSync(contextPath, "utf8");
expect(context.includes("matrixRowsForScope"), "el contexto de Inicio no usa la matriz de todos los GAD");
expect(context.includes("CANTON_ALIASES"), "faltan aliases territoriales para homologación de nombres");
expect(context.includes("provinceForRow"), "falta resolución provincial transversal");
expect(!context.includes('norm(f.provincia) !== "bolivar" || norm(f.canton) !== "caluma"'), "el contexto general sigue amarrado a Caluma");

const cleanup = fs.readFileSync(cleanupPath, "utf8");
expect(cleanup.includes("scopedRecords"), "la auditoría visible no filtra por alcance actual");
expect(cleanup.includes("currentScopeLabel"), "la auditoría visible no etiqueta el alcance seleccionado");
expect(cleanup.includes("replaceVisibleText"), "no existe limpieza transversal de nomenclaturas internas");

console.log(`PASS GAD universal context: ${rows.length} expedientes · bloques ${batches.map(batch => batch.length).join("+")} · ${keys.size} GAD municipales mapeados`);
