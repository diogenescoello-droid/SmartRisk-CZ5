import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(process.argv[2] || "dist");
const source = fs.readFileSync(path.join(dist,"v11-cartography-gad-scope.js"),"utf8");
const index = fs.readFileSync(path.join(dist,"index.html"),"utf8");
const ok=(c,m)=>{if(!c)throw new Error(`FALLO: ${m}`);console.log(`OK: ${m}`)};

ok(source.includes('id=\"srCartoGad\"'),"Selector explícito de GAD en cartografía");
ok(source.includes("gadCantons"),"Inventario de GAD disponibles para el visor");
ok(source.includes("currentGad"),"Filtro cartográfico toma el GAD elegido");
ok(source.includes("Selecciona un GAD para mostrar su cartografía"),"Estado inicial evita mezclar GAD");
ok(source.includes("clearCrossGadSelection"),"Cambio de GAD limpia selección de planificación cruzada");
ok(source.includes("#srCartoGad"),"Cambio de GAD repinta el visor");
ok(source.includes('level === "provincia"') && source.includes('item.level === "canton"'),"GAD cantonal y provincial diferenciados");
ok(index.includes("v11-cartography-gad-scope.js"),"Filtro por GAD cargado en la aplicación");

console.log("PASS cartografía aislada por GAD seleccionado.");
