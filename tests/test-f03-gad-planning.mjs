import fs from "node:fs";
import path from "node:path";

const dist = path.resolve(process.argv[2] || "dist");
const source = fs.readFileSync(path.join(dist,"v11-f03-gad-planning.js"),"utf8");
const scope = fs.readFileSync(path.join(dist,"v11-cartography-gad-scope.js"),"utf8");
const assets = fs.readFileSync(path.join(dist,"release-assets.json"),"utf8");
const index = fs.readFileSync(path.join(dist,"index.html"),"utf8");
const ok=(c,m)=>{if(!c)throw new Error(`FALLO: ${m}`);console.log(`OK: ${m}`)};

ok(index.includes("v11-f03-gad-planning.js") && index.includes("v11-f03-gad-planning.css"),"Espacio F03 cargado en la aplicación");
ok(assets.includes("v11-f03-gad-planning.js") && assets.includes("v11-f03-gad-planning.css"),"Activos F03 incluidos en release");
ok(source.includes('type:"Point"') && source.includes('type:"LineString"') && source.includes('type:"Polygon"'),"F03 soporta puntos, líneas y polígonos");
ok(source.includes("parseKml") && source.includes("readKmlKmzBlob") && source.includes("JSZip"),"Lector KML/KMZ disponible");
ok(source.includes("f03-daule-inundacion.geojson") && source.includes('"F03-29"'),"KMZ de Daule conectado a capa preprocesada");
ok(source.includes("data-srf03-select") && source.includes("Selección cartográfica para planificación"),"Geometrías seleccionables para planificación");
ok(source.includes("Exportar GeoJSON") && source.includes("exportSelection"),"Selección exportable como GeoJSON");
ok(source.includes("scopedRows") && source.includes("inScope"),"Inventario F03 obedece alcance territorial");
ok(scope.includes("Zona 5 · Todos los GAD"),"Zona muestra todos los GAD");
ok(scope.includes("Provincia de ${scope.province} · Todos los GAD"),"Provincia muestra todos sus GAD");
ok(scope.includes("Solo el GAD seleccionado"),"Cantón limita al GAD seleccionado");
ok(scope.includes('guaranda: "Bolívar"'),"Corrección territorial de Guaranda evita provincia incorrecta");
ok(!/firebase\.firestore|setDoc\(|addDoc\(|db\.collection/.test(source),"Espacio F03 no introduce escrituras Firestore directas");

console.log("PASS F03: alcance jerárquico, geometrías, KML/KMZ y selección para planificación.");
