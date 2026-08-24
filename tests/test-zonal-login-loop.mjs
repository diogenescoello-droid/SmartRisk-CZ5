import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const dist = path.resolve(process.argv[2] || "dist");
const scopeSource = fs.readFileSync(path.join(dist, "zonal-role-scope-bridge.js"), "utf8");
const safetySource = fs.readFileSync(path.join(dist, "v11-rollout-safety.js"), "utf8");
const index = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const ok = (condition, message) => { if (!condition) throw new Error(`FALLO: ${message}`); console.log(`OK: ${message}`); };

ok(index.includes("zonal-role-scope-bridge.js?v=1.0.0-zonal-scope-fix"), "Bridge de alcance zonal cargado");
ok(index.includes("v11-rollout-safety.js?v=1.0.0-zonal-startup-fix"), "Protección de arranque V11 cargada");
ok(index.indexOf("scope-context.js") < index.indexOf("zonal-role-scope-bridge.js"), "Bridge zonal se instala después del contexto base");
ok(index.indexOf("zonal-role-scope-bridge.js") < index.indexOf("scope-repository.js"), "Alcance zonal se corrige antes de cargar repositorio");
ok(index.indexOf("v11-rollout.js") < index.indexOf("v11-rollout-safety.js"), "Protección envuelve el rollout existente");
ok(index.indexOf("v11-rollout-safety.js") < index.indexOf("access-gate.js"), "Protección está activa antes de autenticar");

const baseScope = {
  init: () => baseScope,
  filterData: input => ({ ...input, territorios: [] }),
  scopeLabel: () => "Cantón sin asignar",
  canWrite: () => false,
  scopeKeys: () => [],
  availableTerritories: () => [],
  currentTerritory: () => null,
  getState: () => ({ scopeType: "cantonal", administrator: false }),
  getAppProfile: () => ({ rol: "Técnico zonal" }),
  isAdministrator: () => false,
  isReadOnly: () => false,
  canAdminUsers: () => false,
  canRead: () => true
};
const scopeSandbox = {
  window: { SmartRiskScope: baseScope },
  document: { documentElement: { dataset: {} } },
  structuredClone: globalThis.structuredClone,
  JSON, String, Array, Boolean, Date, Set, Object, console
};
vm.runInNewContext(scopeSource, scopeSandbox);
scopeSandbox.window.SmartRiskScope.init({ user: { email: "tecnico@ejemplo.gob.ec" }, profile: { rol: "Técnico zonal", modoAcceso: "Operación" } });
const filtered = scopeSandbox.window.SmartRiskScope.filterData({
  territorios: [{ id: "TER-GUAYAS-DAULE" }, { id: "TER-BOLIVAR-GUARANDA" }],
  acciones: [{ id: "A-1" }, { id: "A-2" }]
});
ok(filtered.territorios.length === 2 && filtered.acciones.length === 2, "Técnico zonal conserva todos los datos de Zona 5");
ok(scopeSandbox.window.SmartRiskScope.getState().scopeType === "zonal", "Técnico zonal obtiene scopeType zonal");
ok(scopeSandbox.window.SmartRiskScope.scopeLabel() === "Coordinación Zonal 5", "Etiqueta del alcance zonal correcta");
ok(scopeSandbox.window.SmartRiskScope.canWrite("acciones") === true, "Técnico zonal puede operar módulos permitidos");
ok(scopeSandbox.window.SmartRiskScope.canWrite("usuarios") === false, "Técnico zonal no recibe privilegios administrativos");

function safetySandbox({ failAfterStart }) {
  const store = JSON.stringify({
    territorios: [{ id: "TER-GUAYAS-DAULE", canton: "Daule", provincia: "Guayas" }],
    acciones: [{ id: "ACC-1", accion: "Limpieza de drenajes", canton: "Daule", provincia: "Guayas", avance: 40 }]
  });
  const adapter = {
    ENTITY_KEYS: ["territories", "actions", "other"],
    normalizeRecord(record) {
      const payload = record.payload || {};
      const type = record.tipo === "territorio" ? "territories" : record.tipo === "accion" ? "actions" : "other";
      return {
        id: record.id,
        sourceId: record.id,
        entityType: type,
        title: payload.accion || payload.canton || record.id,
        provincia: payload.provincia || null,
        canton: payload.canton || null,
        institucion: null,
        unidad: null,
        evento: null,
        payload
      };
    }
  };
  const app = {
    state: { user: failAfterStart ? { email: "tecnico@ejemplo.gob.ec" } : null, filters: {} },
    renderCalls: 0,
    render() { this.renderCalls += 1; }
  };
  const rollout = {
    async decide() { throw new Error("fallo visual simulado"); }
  };
  const sandbox = {
    window: { SmartRiskV11Rollout: rollout, SmartRiskV11DataAdapter: adapter, SmartRiskV11App: app },
    localStorage: { getItem: key => key === "smartrisk-cz5-data-v1" ? store : null },
    location: { hash: "#/inicio" },
    console,
    JSON, String, Array, Boolean, Date, Set, Object, Error, Math
  };
  vm.runInNewContext(safetySource, sandbox);
  return sandbox;
}

const afterStart = safetySandbox({ failAfterStart: true });
const preserved = await afterStart.window.SmartRiskV11Rollout.decide(
  { email: "tecnico@ejemplo.gob.ec" },
  { rol: "Técnico zonal" }
);
ok(preserved === true, "Un fallo visual posterior al inicio no expulsa la sesión autenticada");
ok(afterStart.window.SmartRiskV11App.state.data?.blocked === false, "La vista zonal se repara con datos de runtime");
ok(afterStart.window.SmartRiskV11App.state.data?.records?.length === 2, "La reparación zonal reconstruye registros visibles");

const beforeStart = safetySandbox({ failAfterStart: false });
const fallback = await beforeStart.window.SmartRiskV11Rollout.decide(
  { email: "tecnico@ejemplo.gob.ec" },
  { rol: "Técnico zonal" }
);
ok(fallback === false, "Un fallo previo al inicio permite usar la interfaz compatible sin cerrar Authentication");
ok(!/signOut\s*\(/.test(safetySource), "La protección V11 no cierra Authentication por errores de render");

console.log("PASS ciclo de acceso zonal: sesión preservada, alcance Zona 5 y fallback seguro.");
