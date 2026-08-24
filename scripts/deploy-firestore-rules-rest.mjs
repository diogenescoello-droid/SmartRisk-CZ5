import fs from "node:fs";

const projectId = process.env.FIREBASE_PROJECT_ID || "smartrisk-cz5-produccion";
const accessToken = process.env.FIREBASE_RULES_ACCESS_TOKEN;
const rulesPath = process.env.FIRESTORE_RULES_FILE || "firestore.rules";

if (!accessToken) {
  throw new Error("FIREBASE_RULES_ACCESS_TOKEN es obligatorio.");
}
if (!fs.existsSync(rulesPath)) {
  throw new Error(`No existe el archivo de reglas: ${rulesPath}`);
}

const apiBase = "https://firebaserules.googleapis.com/v1";
const headers = {
  Authorization: `Bearer ${accessToken}`,
  "Content-Type": "application/json"
};

async function request(method, url, body) {
  const response = await fetch(url, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body)
  });
  const text = await response.text();
  let payload = {};
  try {
    payload = text ? JSON.parse(text) : {};
  } catch {
    payload = { raw: text };
  }
  if (!response.ok) {
    const error = new Error(`${method} ${url} -> ${response.status}: ${JSON.stringify(payload)}`);
    error.status = response.status;
    error.payload = payload;
    throw error;
  }
  return payload;
}

const source = fs.readFileSync(rulesPath, "utf8");
const ruleset = await request(
  "POST",
  `${apiBase}/projects/${projectId}/rulesets`,
  { source: { files: [{ name: "firestore.rules", content: source }] } }
);

if (!ruleset.name) {
  throw new Error("Firebase Rules API no devolvió el nombre del ruleset creado.");
}

const releaseName = `projects/${projectId}/releases/cloud.firestore`;
const releaseBody = {
  release: { name: releaseName, rulesetName: ruleset.name },
  updateMask: "rulesetName"
};

let release;
try {
  release = await request("PATCH", `${apiBase}/${releaseName}`, releaseBody);
} catch (error) {
  if (error.status !== 404) throw error;
  release = await request(
    "POST",
    `${apiBase}/projects/${projectId}/releases`,
    { name: releaseName, rulesetName: ruleset.name }
  );
}

if (release.rulesetName !== ruleset.name) {
  throw new Error("La release cloud.firestore no quedó vinculada al ruleset recién creado.");
}

console.log(JSON.stringify({
  ok: true,
  projectId,
  release: release.name,
  ruleset: release.rulesetName,
  deployedAt: new Date().toISOString(),
  mode: "Firebase Rules REST"
}));
