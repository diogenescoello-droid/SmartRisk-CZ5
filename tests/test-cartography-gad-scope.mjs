import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(process.argv[2] || "dist");
const source = fs.readFileSync(path.join(dist,"v11-cartography-gad-scope.js"),"utf8");
const index = fs.readFileSync(path.join(dist,"index.html"),"utf8");
const ok=(c,m)=>{if(!c)throw new Error(`FALLO: ${m}`);console.log(`OK: ${m}`)};

ok(source.includes('level === "zona"'),"Zona muestra alcance completo");
ok(source.includes('level === "provincia"'),"Provincia mantiene todos los GAD provinciales");
ok(source.includes('level === "canton"'),"Cantón activa filtro exclusivo del GAD");
ok(source.includes("Zona 5 · Todos los GAD"),"Etiqueta didáctica para vista zonal");
ok(source.includes("Provincia de ${scope.province} · Todos los GAD"),"Etiqueta didáctica para vista provincial");
ok(source.includes("Solo el GAD seleccionado"),"Etiqueta didáctica para vista cantonal");
ok(source.includes("matchesScope"),"API explícita de filtrado jerárquico");
ok(source.includes("normalizeF03"),"Normalización territorial F03 evita variantes de nombres");
ok(source.includes("Santa Elena") && source.includes("Los Ríos") && source.includes("Galápagos"),"Provincias de Zona 5 canonizadas");
ok(source.includes("clearSelectionOnScopeChange"),"Cambio de alcance limpia selección cartográfica previa");
ok(index.includes("v11-cartography-gad-scope.js"),"Alcance cartográfico cargado en la aplicación");

console.log("PASS cartografía jerárquica Zona → Provincia → Cantón.");
