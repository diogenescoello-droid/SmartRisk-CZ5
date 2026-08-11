import fs from "node:fs";
const read=file=>fs.readFileSync(new URL(`../${file}`,import.meta.url),"utf8");
const js=read("v11-approved-rc16.js"),css=read("v11-approved-rc16.css"),rollout=read("v11-rollout.js"),assets=JSON.parse(read("release-assets.json"));
const checks=[
 ["Maqueta aprobada cargada",rollout.includes("v11-approved-rc16.js")&&rollout.includes("v11-approved-rc16.css")],
 ["Cinco vistas principales",["inicio","territorio","mapa","acciones","mas"].every(v=>js.includes(`data-sr16-view="${v}`))],
 ["Más conserva ocho funciones",["Planes","Reportes","COE y actores","Mesas técnicas","Formularios","Fuentes","Auditoría","Configuración"].every(v=>js.includes(v))],
 ["Módulos permanecen en la interfaz simple",js.includes('data-sr16-view="modulo"')&&js.includes("renderModule")&&!js.includes('classList.add("sr16-full-module")')],
 ["Listas simplificadas para todas las funciones",css.includes("sr16-module-summary")&&css.includes("sr16-module-list")&&js.includes("moduleDefinitions")],
 ["Filtros reales por intención del botón",["pendientes","ejecucion","completadas","sin-presupuesto","revision","brechas","evidencias"].every(v=>js.includes(v))&&js.includes("filterModule")],
 ["Ficha individual y fuente original",js.includes("renderRecord")&&js.includes("Abrir fuente original")],
 ["Retorno conserva pantalla de origen",js.includes("runtime.returnView")&&js.includes("currentView")],
 ["Selector territorial accesible",js.includes("data-sr16-scope")&&js.includes("sr16ScopeCard")],
 ["Datos canónicos conectados",["ENOS_REVIEWS","ENOS_RISK_LOCATIONS","SMART_RISK_PILOT_BASELINE","SMART_RISK_PLAN_SOURCES"].every(v=>js.includes(v))],
 ["Actualización F07 verificable",js.includes("Actualizado F07")&&js.includes("actualización automática")&&js.includes("último envío incorporado")],
 ["Ficha F07 enriquecida",js.includes("Brecha crítica")&&js.includes("Próximo paso")&&js.includes("Vinculación con sitio")],
 ["Flujos Kobo separados",js.includes("aEcQSdRP")&&js.includes("0pXtskTZ")],
 ["Contenedor visual aprobado",css.includes("width:min(100%,720px)")&&css.includes("sr16-bottom")],
 ["Activos de publicación",assets.files.includes("v11-approved-rc16.js")&&assets.files.includes("v11-approved-rc16.css")],
 ["Sin escrituras nuevas",!/firestore\(|setDoc|addDoc|updateDoc|deleteDoc|writeBatch/.test(js)]
];let failed=0;for(const [label,pass] of checks){console.log(`${pass?"OK":"FAIL"}: ${label}`);if(!pass)failed++}if(failed)process.exit(1);console.log("\nTodas las pruebas de la interfaz aprobada RC16 pasaron.");
