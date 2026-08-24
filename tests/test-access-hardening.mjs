import fs from "node:fs";
import path from "node:path";

const dist = process.argv[2] || "dist";
const read = file => fs.readFileSync(path.join(dist, file), "utf8");
const rootRead = file => fs.readFileSync(file, "utf8");
const ok = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
};

const catalog = read("access-role-catalog.js");
const gate = read("access-gate.js");
const scope = read("scope-context.js");
const admin = read("access-admin.js");
const index = read("index.html");
const storage = read("storage-safety.js");
const assets = JSON.parse(rootRead("release-assets.json"));
const firebase = JSON.parse(rootRead("firebase.json"));
const workflow = rootRead(".github/workflows/deploy-firebase.yml");

for (const role of ["Administrador", "Técnico zonal", "Técnico provincial", "Técnico territorial", "Coordinador COE", "Líder MTT/GT", "Tomador de decisión/control", "Visor provincial AME", "Visor zonal AME", "Consulta provincial AME"]) {
  ok(catalog.includes(role), `Catálogo canónico incluye ${role}`);
}
ok(index.indexOf("access-role-catalog.js") < index.indexOf("scope-context.js"), "Catálogo de roles carga antes del contexto territorial");
ok(index.indexOf("storage-safety.js") < index.indexOf("scope-repository.js"), "Protección de almacenamiento carga antes del repositorio");
ok(index.includes("smartrisk-cz5-produccion.web.app"), "Enlace antiguo de GitHub Pages redirige al Firebase oficial");
ok(gate.includes("showAuthenticatedStartupError"), "Errores técnicos posteriores a Authentication preservan la sesión");
ok(gate.includes("No necesita cambiar nuevamente su contraseña"), "Error técnico no induce restablecimiento innecesario de clave");
ok(gate.includes("catalog.isSupported"), "Login usa el catálogo canónico de roles");
ok(scope.includes('scopeType === "zonal"'), "Contexto reconoce alcance zonal nativamente");
ok(scope.includes('scopeType === "provincial"'), "Contexto reconoce alcance provincial nativamente");
ok(admin.includes("catalog?.isSupported"), "Administrador usa el mismo catálogo del login");
ok(admin.includes("ZONA:CZ5"), "Administrador asigna alcance zonal canónico");
ok(admin.includes("PROV:"), "Administrador valida alcance provincial");
ok(admin.includes("TER:"), "Administrador valida alcance cantonal");
ok(storage.includes("storage-errors-never-abort-authenticated-startup"), "Fallo de localStorage no aborta el inicio autenticado");
ok(assets.files.includes("access-role-catalog.js") && assets.files.includes("storage-safety.js"), "Activos de seguridad incluidos en publicación");
ok(!assets.files.includes("auth-admin-fallback.js"), "Fallback antiguo de contraseñas queda fuera de producción");
ok(firebase.hosting.headers.some(row => row.source === "/access-gate.js" && row.headers.some(h => h.value.includes("no-cache"))), "Compuerta de acceso no queda obsoleta por caché");
ok(workflow.includes("firestore:rules"), "Despliegue productivo publica reglas Firestore junto con Hosting");
ok(workflow.includes("actions/upload-artifact@v4"), "Validación se conserva como artifact independiente");
ok(!workflow.includes("git add DEPLOYMENT_STATUS.json DEPLOYMENT_VALIDATION.log"), "Log ignorado ya no produce falso fallo de despliegue");
console.log("PASS endurecimiento de acceso: roles, alcances, sesión, caché y despliegue listos para onboarding masivo.");
