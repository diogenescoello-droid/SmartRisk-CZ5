import fs from "node:fs";

const read = file => fs.readFileSync(new URL(`../${file}`, import.meta.url), "utf8");
const rollout = read("v11-rollout.js");
const script = read("v11-mobile-rc15.js");
const styles = read("v11-mobile-rc15.css");
const layout = read("v11-layout-rc15-1.css");
const index = read("index.html");
const assets = JSON.parse(read("release-assets.json"));

const checks = [
  ["RC15 cargada por rollout", rollout.includes('loadScript("v11-mobile-rc15.js")') && rollout.includes('loadStyles("v11-mobile-rc15.css")')],
  ["Caché del index actualizada", index.includes("v11-rollout.js?v=11.0.0-rc16.1")],
  ["Navegación móvil de cinco accesos", ["Inicio", "Territorio", "Mapa", "Acciones", "Más"].every(label => script.includes(`label: "${label}"`))],
  ["Menú completo preservado detrás de Más", script.includes('classList.toggle("sr15-menu-open")')],
  ["Jerarquía Zona, provincia y cantón", script.includes("Zona 5") && script.includes("Elegir zona, provincia o cantón")],
  ["Brechas ubicadas en Territorio", script.includes("Planes, sitios críticos, acciones, presupuesto y brechas")],
  ["Formulario Kobo de sitios conectado", script.includes("https://ee.kobotoolbox.org/x/aEcQSdRP")],
  ["Formulario Kobo F07 de acciones conectado", script.includes("https://ee.kobotoolbox.org/x/0pXtskTZ")],
  ["Flujos de sitio y acción diferenciados", script.includes("Registrar nuevo sitio") && script.includes("Actualizar una acción")],
  ["Diseño móvil adaptable", styles.includes("@media (max-width: 820px)") && styles.includes("sr15-bottom-nav")],
  ["Compactación de escritorio validada", layout.includes("#srHeader") && layout.includes(".sr10-viewbar") && layout.includes(".sr-brand div")],
  ["Archivos RC15 incluidos en publicación", assets.files.includes("v11-mobile-rc15.css") && assets.files.includes("v11-mobile-rc15.js") && assets.files.includes("v11-layout-rc15-1.css")],
  ["RC15 no introduce escrituras Firestore", !/firestore\(\)|\.collection\(|setDoc|addDoc|updateDoc|deleteDoc|writeBatch/.test(script)]
];

let failed = 0;
for (const [label, pass] of checks) {
  console.log(`${pass ? "OK" : "FAIL"}: ${label}`);
  if (!pass) failed += 1;
}
if (failed) process.exit(1);
console.log("\nTodas las pruebas RC15 pasaron.");
