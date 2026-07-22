import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), "web-release");
const read = name => fs.readFileSync(path.join(root, name), "utf8");
const ok = (condition, message) => { if (!condition) throw new Error(`FALLO: ${message}`); console.log(`OK: ${message}`); };

const admin = read("v11-admin-rc10.js");
const css = read("v11-admin-rc10.css");
const rollout = read("v11-rollout.js");
const index = read("index.html");
new vm.Script(admin, { filename: "v11-admin-rc10.js" });

ok(admin.includes('PRINCIPAL_EMAIL = "dcoellom2@unemi.edu.ec"'), "Cuenta de Administrador principal definida");
ok(admin.includes('roleLabel = "Administrador principal"'), "Etiqueta de rol principal aplicada");
ok(admin.includes("Administrador principal") && admin.includes("Coordinación Zonal 5 completa"), "Identidad y alcance completo visibles");
ok(["principal","zonal","provincial","cantonal","institucion","unidad"].every(value => admin.includes(`["${value}"`) || admin.includes(`${value}:`)), "Selector incluye todas las perspectivas administrativas");
ok(["Reporte de monitoreo","Validación técnica","Coordinación institucional","Decisión COE","Escalamiento operativo","Mitigación y cierre"].every(text => admin.includes(text)), "Auditoría cubre las seis etapas");
ok(admin.includes("registros consolidados leídos") && admin.includes("registros virtuales derivados de planes"), "Conciliación entre fuente consolidada y derivados RC9");
ok(admin.includes("campos faltantes") && admin.includes("Sugerencia:"), "Brechas y sugerencias operativas visibles");
ok(admin.includes("data-sr10-route"), "Acceso directo al módulo relacionado");
ok(rollout.includes('11.0.0-rc10') && index.includes('11.0.0-rc10'), "Caché RC10 consistente");
ok(rollout.includes("v11-admin-rc10.css") && rollout.includes("v11-admin-rc10.js"), "Capa RC10 cargada por rollout");
ok(css.includes(".sr10-viewbar") && css.includes(".sr10-drawer") && css.includes(".sr10-stage-list"), "Estilos administrativos y de auditoría presentes");
ok(!/\.collection\([^)]*\)\.(add|set|update|delete)\s*\(/.test(admin), "RC10 no introduce escrituras Firestore");
ok(!/\.doc\([^)]*\)\.(set|update|delete)\s*\(/.test(admin), "RC10 conserva solo lectura");
console.log("\nTodas las pruebas consolidadas RC10 pasaron.");
