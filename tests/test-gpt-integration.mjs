import fs from "node:fs";
import path from "node:path";

const root = process.argv[2] ? path.resolve(process.argv[2]) : path.resolve(process.cwd(), "dist");
const repoRoot = process.argv[2] ? path.resolve(process.argv[2], "..") : process.cwd();
const readDist = file => fs.readFileSync(path.join(root, file), "utf8");
const readRoot = file => fs.readFileSync(path.join(repoRoot, file), "utf8");
const ok = (condition, message) => {
  if (!condition) throw new Error(`FAIL: ${message}`);
  console.log(`OK: ${message}`);
};

const index = readDist("index.html");
const client = readDist("smartrisk-gpt-client.js");
const css = readDist("smartrisk-gpt.css");
const firebase = JSON.parse(readRoot("firebase.json"));
const backend = readRoot("functions/index.js");
const workflow = readRoot(".github/workflows/deploy-gpt-backend.yml");

ok(index.includes("smartrisk-gpt-client.js") && index.includes("smartrisk-gpt.css"), "Cliente GPT incluido en interfaz publicada");
ok(client.includes('fetch("/api/gpt"') && client.includes("getIdToken"), "Cliente consulta endpoint propio con Firebase ID token");
ok(client.includes("data-ux-open-gpt") && client.includes("stopImmediatePropagation"), "Botón anterior de ChatGPT se convierte en consulta interna");
ok(client.includes("Apoyo técnico de solo lectura"), "Interfaz explicita carácter no vinculante");
ok(css.includes("sr-gpt-modal") && css.includes("@media"), "Interfaz GPT adaptable incluida");
ok(firebase.functions?.source === "functions", "Firebase Functions configurado");
ok(firebase.hosting?.rewrites?.some(row => row.source === "/api/gpt" && row.function?.functionId === "smartriskGpt"), "Hosting enruta /api/gpt a función autenticada");
ok(backend.includes("verifyIdToken") && backend.includes('collection("perfiles")'), "Backend verifica Authentication y perfil SmartRisk");
ok(backend.includes('defineSecret("OPENAI_API_KEY")') && backend.includes("OPENAI_API_KEY.value()"), "Clave OpenAI solo se obtiene desde secreto de servidor");
ok(backend.includes("https://api.openai.com/v1/responses") && backend.includes('model: "gpt-5.6"'), "Backend usa Responses API y modelo configurado");
ok(backend.includes("store: false") && backend.includes("safety_identifier"), "Solicitud OpenAI minimiza persistencia y agrega identificador seguro");
ok(backend.includes("MAX_CONTEXT_CHARS") && backend.includes("MAX_REQUESTS_PER_WINDOW"), "Backend limita contexto y frecuencia de consultas");
ok(backend.includes("No apruebes planes") && backend.includes("No inventes fuentes"), "Instrucciones preservan límites institucionales y trazabilidad");
ok(!client.includes("OPENAI_API_KEY") && !index.includes("OPENAI_API_KEY"), "Credencial OpenAI no aparece en activos del navegador");
ok(workflow.includes("secrets.OPENAI_API_KEY") && workflow.includes("functions:secrets:set OPENAI_API_KEY"), "Despliegue transfiere credencial mediante secreto, no código");

console.log("PASS Especialista GPT: frontend autenticado, backend seguro, alcance y secreto protegidos.");
