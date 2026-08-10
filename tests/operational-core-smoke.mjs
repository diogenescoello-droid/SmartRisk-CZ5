import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";
import assert from "node:assert/strict";

const root = path.resolve(process.argv[2] || ".");
const context = { window: {} };
vm.runInNewContext(fs.readFileSync(path.join(root, "smartrisk-operational-core.js"), "utf8"), context);
const core = context.window.SmartRiskOperational;
const result = core.aggregate({
  territorios: [{ id: "T1", provincia: "Guayas", canton: "Daule" }],
  sitios: [
    { id: "S1", territorio: "T1", estado: "Identificado", brechaPrincipal: "Financiera", estadoBrecha: "Activa" },
    { id: "S2", territorio: "T1", estado: "En seguimiento", brechaPrincipal: "Técnica", estadoBrecha: "Solventada" },
    { id: "S3", territorio: "T1", estado: "Pendiente de validación territorial", estadoBrecha: "Activa" }
  ],
  acciones: [
    { id: "A1", sitioId: "S1", estado: "En ejecución", presupuestoAsignado: 1000, presupuestoEjecutado: 400 },
    { id: "A2", sitioId: "S2", estado: "Completada", presupuestoAsignado: 500, presupuestoEjecutado: 500 },
    { id: "A3", sitioId: "S3", estado: "Planificada", presupuestoAsignado: 900 }
  ]
});

assert.equal(result.sites, 2);
assert.equal(result.actions, 2);
assert.equal(result.assignedBudget, 1500);
assert.equal(result.executedBudget, 900);
assert.equal(result.activeGapPct, 50);
assert.equal(result.solvedGapPct, 50);
assert.equal(result.rows[0].canton, "Daule");
assert.equal(core.validateActionBudget({ presupuestoAsignado: 10, presupuestoEjecutado: 11 }).length > 0, true);
console.log("PASS núcleo operativo sitio–acción–presupuesto–brecha");
