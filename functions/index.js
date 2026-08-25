"use strict";

const { onRequest } = require("firebase-functions/v2/https");
const { defineSecret } = require("firebase-functions/params");
const { initializeApp } = require("firebase-admin/app");
const { getAuth } = require("firebase-admin/auth");
const { getFirestore, FieldValue } = require("firebase-admin/firestore");
const crypto = require("node:crypto");

initializeApp();

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");
const db = getFirestore();
const WINDOW_MS = 15 * 60 * 1000;
const MAX_REQUESTS_PER_WINDOW = 20;
const MAX_CONTEXT_CHARS = 30000;
const MAX_QUESTION_CHARS = 4000;

function normalize(value) {
  return String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
}

function list(value) {
  return Array.isArray(value) ? value.filter(Boolean) : value ? [value] : [];
}

function profileScope(profile = {}) {
  const scopeKeys = [...new Set(list(profile.scopeKeys))];
  let scopeType = profile._smartRiskScopeType || profile.tipoAlcance || profile.alcance || "cantonal";
  if (scopeKeys.some(key => String(key).startsWith("ZONA:"))) scopeType = "zonal";
  else if (scopeKeys.some(key => String(key).startsWith("PROV:"))) scopeType = "provincial";
  else if (scopeKeys.some(key => String(key).startsWith("TER:"))) scopeType = "cantonal";
  return {
    role: profile.rolInstitucional || profile.rol || profile.codigoRol || "Usuario autorizado",
    mode: profile.modoAcceso || profile.modo || "Consulta",
    scopeType: String(scopeType || "cantonal"),
    scopeKeys,
    provinces: [...new Set([...list(profile.provincia), ...list(profile.provincias), ...list(profile.provinciaNombre)])],
    cantons: [...new Set([...list(profile.canton), ...list(profile.cantones), ...list(profile.cantonNombre)])]
  };
}

async function enforceRateLimit(uid) {
  const ref = db.collection("gptRateLimits").doc(uid);
  const now = Date.now();
  await db.runTransaction(async transaction => {
    const snap = await transaction.get(ref);
    const data = snap.exists ? snap.data() : {};
    const startedAt = Number(data.windowStartedAt || 0);
    const withinWindow = now - startedAt < WINDOW_MS;
    const count = withinWindow ? Number(data.count || 0) : 0;
    if (count >= MAX_REQUESTS_PER_WINDOW) {
      const error = new Error("RATE_LIMIT");
      error.retryAfter = Math.max(1, Math.ceil((WINDOW_MS - (now - startedAt)) / 1000));
      throw error;
    }
    transaction.set(ref, {
      windowStartedAt: withinWindow ? startedAt : now,
      count: count + 1,
      lastRequestAt: FieldValue.serverTimestamp()
    }, { merge: true });
  });
}

function extractOutputText(payload) {
  if (typeof payload?.output_text === "string" && payload.output_text.trim()) return payload.output_text.trim();
  const parts = [];
  for (const item of Array.isArray(payload?.output) ? payload.output : []) {
    for (const content of Array.isArray(item?.content) ? item.content : []) {
      if ((content?.type === "output_text" || content?.type === "text") && typeof content?.text === "string") parts.push(content.text);
    }
  }
  return parts.join("\n").trim();
}

function safetyIdentifier(uid) {
  return crypto.createHash("sha256").update(String(uid)).digest("hex").slice(0, 32);
}

exports.smartriskGpt = onRequest({
  region: "us-central1",
  memory: "256MiB",
  timeoutSeconds: 60,
  maxInstances: 10,
  secrets: [OPENAI_API_KEY]
}, async (req, res) => {
  res.set("Cache-Control", "no-store");
  res.set("X-Content-Type-Options", "nosniff");

  if (req.method !== "POST") {
    res.set("Allow", "POST");
    return res.status(405).json({ error: "METHOD_NOT_ALLOWED" });
  }

  try {
    const authHeader = String(req.headers.authorization || "");
    const match = authHeader.match(/^Bearer\s+(.+)$/i);
    if (!match) return res.status(401).json({ error: "AUTH_REQUIRED" });

    const decoded = await getAuth().verifyIdToken(match[1], true);
    const profileSnap = await db.collection("perfiles").doc(decoded.uid).get();
    if (!profileSnap.exists) return res.status(403).json({ error: "PROFILE_REQUIRED" });
    const profile = profileSnap.data() || {};
    if (normalize(profile.estado || "Activo") !== "activo") return res.status(403).json({ error: "PROFILE_INACTIVE" });
    if (profile.email && normalize(profile.email) !== normalize(decoded.email)) return res.status(403).json({ error: "PROFILE_MISMATCH" });

    const question = String(req.body?.question || "").trim().slice(0, MAX_QUESTION_CHARS);
    const context = String(req.body?.context || "").trim().slice(0, MAX_CONTEXT_CHARS);
    const route = String(req.body?.route || "SmartRisk").trim().slice(0, 100);
    if (!question) return res.status(400).json({ error: "QUESTION_REQUIRED" });
    if (!context) return res.status(400).json({ error: "CONTEXT_REQUIRED" });

    await enforceRateLimit(decoded.uid);
    const scope = profileScope(profile);
    const key = OPENAI_API_KEY.value();
    if (!key) return res.status(503).json({ error: "GPT_NOT_CONFIGURED" });

    const instructions = `Eres el Especialista GPT de SmartRisk CZ5 para gestión de riesgos en Ecuador.\n\nTu función es de apoyo técnico y lectura, no de autoridad institucional. No apruebes planes, no declares riesgos oficiales, no cambies estados, no ordenes actuaciones y no sustituyas competencias de GAD, SNGR, COE u otras entidades.\n\nResponde únicamente usando el contexto SmartRisk suministrado para esta consulta. Distingue claramente: (1) datos confirmados, (2) brechas o información faltante, (3) análisis o inferencias, y (4) recomendaciones. Si el contexto no permite responder, dilo expresamente. No inventes fuentes, cifras, evidencias ni conclusiones.\n\nMantén trazabilidad mencionando, cuando estén presentes en el contexto, los identificadores o fuentes F01–F07, plan, acción, sitio, evidencia o registro que sostienen la respuesta.\n\nEl usuario autenticado tiene rol ${scope.role}, modo ${scope.mode}, alcance ${scope.scopeType}, claves ${scope.scopeKeys.join(", ") || "sin clave explícita"}, provincias ${scope.provinces.join(", ") || "no declaradas"} y cantones ${scope.cantons.join(", ") || "no declarados"}. No sugieras ampliar el acceso fuera de ese alcance.\n\nRedacta en español claro, técnico y operativo.`;

    const input = `Módulo actual: ${route}\n\nCONTEXTO AUTORIZADO DE SMARTRISK:\n${context}\n\nPREGUNTA DEL USUARIO:\n${question}`;

    const response = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${key}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "gpt-5.6",
        instructions,
        input,
        max_output_tokens: 1800,
        store: false,
        safety_identifier: safetyIdentifier(decoded.uid)
      })
    });

    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      console.error("OpenAI error", response.status, payload?.error?.type || "unknown");
      return res.status(response.status === 429 ? 429 : 502).json({ error: response.status === 429 ? "OPENAI_RATE_LIMIT" : "OPENAI_UPSTREAM" });
    }

    const answer = extractOutputText(payload);
    if (!answer) return res.status(502).json({ error: "EMPTY_RESPONSE" });

    await db.collection("gptAudit").add({
      uid: decoded.uid,
      email: decoded.email || null,
      route,
      role: scope.role,
      scopeType: scope.scopeType,
      scopeKeys: scope.scopeKeys,
      createdAt: FieldValue.serverTimestamp(),
      responseId: payload.id || null,
      model: payload.model || "gpt-5.6"
    });

    return res.status(200).json({
      answer,
      responseId: payload.id || null,
      model: payload.model || "gpt-5.6",
      advisory: true
    });
  } catch (error) {
    if (error?.message === "RATE_LIMIT") {
      res.set("Retry-After", String(error.retryAfter || 60));
      return res.status(429).json({ error: "SMART_RISK_RATE_LIMIT" });
    }
    console.error("SmartRisk GPT error", error?.message || error);
    return res.status(500).json({ error: "INTERNAL_ERROR" });
  }
});
