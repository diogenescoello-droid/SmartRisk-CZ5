import fs from "node:fs";

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const permissions = read("v11-permissions.js");
const repository = read("scope-repository.js");
const rules = read("firestore.rules");
const rollout = read("v11-rollout.js");

const checks = [
  ["V11 ya no fuerza solo lectura universal", !permissions.includes("pilotReadOnly: true")],
  ["Permisos distinguen modo Consulta", permissions.includes("isReadOnly") && permissions.includes('mode === "consulta"')],
  ["Roles operativos pueden crear y editar", permissions.includes("WRITER_ROLES") && permissions.includes("canCreate: entity => writer") && permissions.includes("canEdit: entity => writer")],
  ["Validación y cierre quedan restringidos", permissions.includes("VALIDATE_ROLES") && permissions.includes("canValidate: entity => validator") && permissions.includes("canClose: entity => validator")],
  ["Repositorio expone escritura granular", repository.includes("async function saveRecord") && repository.includes("saveRecord,")],
  ["Registros se guardan por alcance", repository.includes('.collection("alcances")') && repository.includes('.collection("registros")')],
  ["Cada cambio incrementa revisión", repository.includes("revision = Number(previous?.revision || 0) + 1")],
  ["Cada escritura crea bitácora append-only", repository.includes('.collection("cambios")') && repository.includes('operation: existing.exists ? "update" : "create"')],
  ["Los tipos operativos están acotados", repository.includes("OPERATIONAL_TYPES") && rules.includes("allowedOperationalType")],
  ["Firestore permite create/update territorial validado", rules.includes("scopedOperationalWriter(scopeKey) && validScopedRecordCreate(scopeKey)") && rules.includes("scopedOperationalWriter(scopeKey) && validScopedRecordUpdate(scopeKey)")],
  ["Usuario territorial no elimina historia", rules.includes("allow delete: if admin();")],
  ["Bitácora no puede reescribirse", rules.includes("allow update, delete: if false;")],
  ["Escritura global sigue siendo administrativa", rules.includes("allow create, update: if admin();")],
  ["Cache V11 identifica el bloque operativo", rollout.includes("11.0.0-rc17-operativo-p0")]
];

let failed = 0;
for (const [label, pass] of checks) {
  console.log(`${pass ? "OK" : "FAIL"}: ${label}`);
  if (!pass) failed += 1;
}
if (failed) process.exit(1);
console.log("\nPASS SmartRisk Operativo P0: permisos, persistencia granular y reglas consistentes.");
