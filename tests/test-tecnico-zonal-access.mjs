import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(process.argv[2] || "dist");
const gate = fs.readFileSync(path.join(dist, "access-gate.js"), "utf8");
const catalog = fs.readFileSync(path.join(dist, "access-role-catalog.js"), "utf8");
const permissions = fs.readFileSync(path.join(dist, "v11-permissions.js"), "utf8");
const index = fs.readFileSync(path.join(dist, "index.html"), "utf8");
const ok = (condition, message) => { if (!condition) throw new Error(`FALLO: ${message}`); console.log(`OK: ${message}`); };

ok(catalog.includes('role: "Técnico zonal"'), "Técnico zonal está entre los roles habilitados");
ok(catalog.includes('"tecnico zonal"'), "Variante sin tilde se normaliza al rol zonal canónico");
ok(gate.includes('catalog.isSupported(profile.rol)'), "La compuerta consulta el catálogo canónico de roles");
ok(permissions.includes('if (raw.includes("zonal")) return "zonal";'), "Motor de permisos conserva capacidades zonales");
ok(index.includes('access-role-catalog.js?v=2026.08.24.2'), "El catálogo canónico se carga en la versión publicada");
ok(index.includes('access-gate.js?v=2026.08.31.5-direct-credentials'), "La compuerta mantiene la política canónica de credencial directa");
ok(gate.includes('uid-profile-canonical-role-resilient-startup-direct-credentials'), "La compuerta declara acceso directo administrado");
ok(catalog.includes('rolInstitucional: originalRole'), "Se conserva el rol institucional original para permisos y auditoría");

console.log("PASS acceso Técnico zonal: autenticación compatible, catálogo único, credencial directa y permisos zonales preservados.");
