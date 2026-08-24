import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(process.argv[2] || "dist");
const gate = fs.readFileSync(path.join(dist, "access-gate.js"), "utf8");
const permissions = fs.readFileSync(path.join(dist, "v11-permissions.js"), "utf8");
const index = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const ok = (condition, message) => { if (!condition) throw new Error(`FALLO: ${message}`); console.log(`OK: ${message}`); };

ok(gate.includes('"Técnico zonal"'), "Técnico zonal está entre los roles habilitados");
ok(gate.includes('["tecnico zonal", "Técnico zonal"]'), "Variante sin tilde se normaliza al rol zonal canónico");
ok(permissions.includes('if (raw.includes("zonal")) return "zonal";'), "Motor de permisos conserva capacidades zonales");
ok(index.includes('access-gate.js?v=11.0.0-rc16.7'), "La compuerta mantiene la versión canónica estable");
ok(gate.includes('rolInstitucional: originalRole'), "Se conserva el rol institucional original para permisos y auditoría");

console.log("PASS acceso Técnico zonal: autenticación compatible, rol habilitado y permisos zonales preservados.");
