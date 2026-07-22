import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), "web-release");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const ok = (condition, message) => {
  if (!condition) throw new Error(`FALLO: ${message}`);
  console.log(`OK: ${message}`);
};

const adapterCode = read("v11-data-adapter.js");
const app = read("v11-app.js");
const dashboard = read("v11-dashboard-rc8.js");
const rollout = read("v11-rollout.js");
const index = read("index.html");
const css = read("v11-normalizer-rc9.css");

const sandbox = { window: {}, console, Date, Set, Map, Math, JSON };
vm.createContext(sandbox);
vm.runInContext(adapterCode, sandbox);
const adapter = sandbox.window.SmartRiskV11DataAdapter;

const plan = adapter.normalizeRecord({
  id: "PLAN-BABAHOYO",
  tipo: "Plan de acción",
  provincia: "Los Ríos",
  canton: "Babahoyo",
  nombre: "Plan ENOS Babahoyo",
  acciones: [
    { actividad: "Limpieza preventiva de drenajes", responsable: "Obras Públicas", estado: "En ejecución", avance: "45%", fecha_fin: "2026-10-30" },
    { accion: "Actualizar rutas de evacuación", institucion: "GAD Babahoyo", prioridad: "Alta", progreso: 20 }
  ],
  brechas: [{ brecha: "Cartografía de inundación desactualizada", prioridad: "Alta" }],
  contactos: [{ nombre: "Responsable UGR", institucion: "GAD Babahoyo", cargo: "Técnico de riesgos", correo: "riesgos@example.gob.ec" }]
}, "TER:LOS-RIOS-BABAHOYO");

const expansion = adapter.expandPlanRecords([plan]);
const actions = expansion.records.filter(item => item.entityType === "actions");
const breaches = expansion.records.filter(item => item.entityType === "breaches");
const contacts = expansion.records.filter(item => item.entityType === "institutions");

ok(actions.length === 2, "Dos acciones derivadas de una matriz de plan");
ok(breaches.length === 1, "Brecha derivada del plan");
ok(contacts.length === 1, "Contacto institucional derivado del plan");
ok(actions.every(item => item.canton === "Babahoyo" && item.provincia === "Los Ríos"), "Herencia territorial del plan");
ok(actions.every(item => item.sourcePlanId === "PLAN-BABAHOYO" && item.normalizedFromPlan), "Trazabilidad al plan de origen");
ok(actions.some(item => item.avance === 45), "Porcentajes con símbolo normalizados");
ok(expansion.summary.actions === 2 && expansion.summary.generated === 4, "Resumen de normalización calculado");
ok(adapter.ENTITY_KEYS.includes("breaches"), "Entidad de brechas incorporada");
ok(adapterCode.includes("structuredPayload(record)"), "Campos planos de Firestore integrados con payload");
ok(app.includes("Plan localizado; acciones aún no estructuradas"), "Estado vacío distingue plan existente de cero acciones");
ok(app.includes("sr9-plan-source"), "Tabla muestra plan de origen");
ok(dashboard.includes("recuperadas de planes"), "Dashboard informa acciones recuperadas");
ok(rollout.includes("11.0.0-rc10") && index.includes("11.0.0-rc10"), "Caché RC9 consistente");
ok(rollout.includes("v11-normalizer-rc9.css"), "Estilos RC9 cargados");
ok(css.includes(".sr9-normalization") && css.includes(".sr9-plan-empty"), "Estados visuales RC9 presentes");
ok(!/\.collection\([^)]*\)\.(add|set|update|delete)\s*\(/.test(adapterCode), "RC9 no introduce escrituras Firestore");
ok(!/\.doc\([^)]*\)\.(set|update|delete)\s*\(/.test(adapterCode), "RC9 mantiene solo lectura");

console.log("\nTodas las pruebas consolidadas RC9 pasaron.");
