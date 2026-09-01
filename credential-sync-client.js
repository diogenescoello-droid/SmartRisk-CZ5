(() => {
  "use strict";

  const VERSION = "2026.09.01.3-rsa-envelope";
  const JOB_REF = () => db.collection("migraciones").doc("credential-sync-current");
  const PUBLIC_KEY_URL = "CREDENTIAL_SYNC_PUBLIC_KEY.json";
  const $ = selector => document.querySelector(selector);
  const normalizeEmail = value => String(value || "").trim().toLowerCase();
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
  const bytesToBase64 = bytes => {
    let binary = "";
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (let i = 0; i < view.length; i += 0x8000) binary += String.fromCharCode(...view.subarray(i, i + 0x8000));
    return btoa(binary);
  };
  const base64ToBytes = value => Uint8Array.from(atob(String(value || "")), char => char.charCodeAt(0));

  function validateBatch(parsed) {
    const users = Array.isArray(parsed) ? parsed : parsed?.users;
    if (!Array.isArray(users)) throw new Error("El archivo debe contener un arreglo users.");
    if (users.length !== 46) throw new Error(`Se esperaban 46 usuarios y el archivo contiene ${users.length}.`);
    const seen = new Set();
    for (const user of users) {
      const email = normalizeEmail(user?.correo);
      const password = String(user?.claveInicial || user?.password || "").trim();
      if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email)) throw new Error("Existe un correo vacío o inválido.");
      if (seen.has(email)) throw new Error(`Correo duplicado en el lote: ${email}`);
      seen.add(email);
      if (password.length < 12) throw new Error(`La clave preparada para ${email} no cumple la longitud mínima.`);
      if (!String(user?.rol || "").trim()) throw new Error(`Falta el rol para ${email}.`);
      if (!Array.isArray(user?.scopeKeys) || !user.scopeKeys.length) throw new Error(`Falta el alcance para ${email}.`);
    }
    return users;
  }

  function pemToDer(pem) {
    const clean = String(pem || "")
      .replace(/-----BEGIN PUBLIC KEY-----/g, "")
      .replace(/-----END PUBLIC KEY-----/g, "")
      .replace(/\s+/g, "");
    if (!clean) throw new Error("La llave pública de sincronización está vacía.");
    return base64ToBytes(clean);
  }

  async function loadCurrentPublicKey() {
    const separator = PUBLIC_KEY_URL.includes("?") ? "&" : "?";
    const response = await fetch(`${PUBLIC_KEY_URL}${separator}t=${Date.now()}`, {
      cache: "no-store",
      headers: { "Cache-Control": "no-cache" }
    });
    if (!response.ok) throw new Error(`No se pudo obtener la llave pública vigente (HTTP ${response.status}).`);
    const keyDoc = await response.json();
    if (!keyDoc?.active || !keyDoc?.keyId || !keyDoc?.publicKey) throw new Error("La llave pública vigente no está activa o está incompleta.");
    const expiresAt = Date.parse(keyDoc.expiresAt || "");
    if (!Number.isFinite(expiresAt) || expiresAt <= Date.now()) throw new Error("La llave pública de sincronización expiró. Genere una nueva antes de cargar el lote.");
    if (!String(keyDoc.algorithm || "").includes("RSA-OAEP-3072-SHA256")) throw new Error("La llave pública usa un algoritmo no compatible.");
    return keyDoc;
  }

  async function importRsaPublicKey(publicKeyPem) {
    return crypto.subtle.importKey(
      "spki",
      pemToDer(publicKeyPem),
      { name: "RSA-OAEP", hash: "SHA-256" },
      false,
      ["encrypt"]
    );
  }

  async function encryptBatch(clearText, keyDoc) {
    const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
    const rawAes = await crypto.subtle.exportKey("raw", aesKey);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const clearBytes = new TextEncoder().encode(clearText);
    const ciphertextWithTag = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, clearBytes);
    const rsaKey = await importRsaPublicKey(keyDoc.publicKey);
    const encryptedKey = await crypto.subtle.encrypt({ name: "RSA-OAEP" }, rsaKey, rawAes);
    return {
      keyId: String(keyDoc.keyId),
      algorithm: "RSA-OAEP-3072-SHA256 + AES-256-GCM(WebCrypto-tag-appended)",
      encryptedKey: bytesToBase64(encryptedKey),
      iv: bytesToBase64(iv),
      ciphertext: bytesToBase64(ciphertextWithTag)
    };
  }

  async function queueBatch(event) {
    event.preventDefault();
    const box = $("#secureSyncMessage");
    const button = $("#secureSyncSubmit");
    const file = $("#secureSyncFile")?.files?.[0];
    box.className = "message";
    box.textContent = "";
    if (!auth.currentUser) {
      box.classList.add("bad");
      box.textContent = "Debe iniciar sesión como administrador.";
      return;
    }
    if (!file) {
      box.classList.add("bad");
      box.textContent = "Seleccione el JSON privado de las 46 credenciales.";
      return;
    }
    button.disabled = true;
    try {
      box.classList.add("warn");
      box.textContent = "Validando lote y obteniendo la llave pública vigente…";
      const clearText = await file.text();
      const parsed = JSON.parse(clearText);
      const users = validateBatch(parsed);
      const keyDoc = await loadCurrentPublicKey();
      const envelope = await encryptBatch(clearText, keyDoc);
      await JOB_REF().set({
        schemaVersion: "2026.09.01.3",
        type: "credential-sync-46",
        status: "pending",
        recordCount: users.length,
        requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
        requestedBy: normalizeEmail(auth.currentUser.email),
        clientVersion: VERSION,
        ...envelope
      });
      $("#secureSyncFile").value = "";
      box.className = "message ok";
      box.innerHTML = `<b>Lote cifrado recibido.</b> Las 46 credenciales se cifraron localmente con AES-256-GCM y la clave de sesión quedó protegida con RSA-OAEP. Llave de un solo uso: <code>${escapeHtml(String(keyDoc.keyId).slice(0, 8))}…</code>`;
      await refreshStatus();
    } catch (error) {
      console.error("Secure credential queue failed", error?.message || error);
      box.className = "message bad";
      box.textContent = error?.message || "No se pudo enviar el lote cifrado.";
    } finally {
      button.disabled = false;
    }
  }

  async function refreshStatus() {
    const target = $("#secureSyncStatus");
    if (!target || !auth.currentUser) return;
    try {
      const snap = await JOB_REF().get();
      if (!snap.exists) {
        target.innerHTML = '<span class="badge">Sin lote pendiente</span>';
        return;
      }
      const data = snap.data() || {};
      const status = String(data.status || "unknown");
      const badgeClass = status === "success" ? "ok" : status === "failed" ? "bad" : "warn";
      const detail = status === "success"
        ? `${Number(data.verified || 0)} de ${Number(data.recordCount || 46)} verificados · ${Number(data.created || 0)} creados · ${Number(data.updated || 0)} actualizados`
        : status === "failed"
          ? `Error de sincronización. Fallos: ${Number(data.failureCount || 0)}`
          : `Lote cifrado pendiente de procesamiento · ${Number(data.recordCount || 46)} registros`;
      target.innerHTML = `<span class="badge ${badgeClass}">${escapeHtml(status.toUpperCase())}</span><span class="small">${escapeHtml(detail)}</span>`;
    } catch (error) {
      target.innerHTML = '<span class="badge bad">No se pudo consultar el estado</span>';
    }
  }

  function hydrate() {
    const adminArea = $("#adminArea");
    if (!adminArea || $("#secureCredentialSyncPanel")) return;
    const section = document.createElement("section");
    section.id = "secureCredentialSyncPanel";
    section.className = "panel";
    section.innerHTML = `
      <div class="top">
        <div>
          <h2>Sincronización segura de las 46 credenciales</h2>
          <p class="muted">Deja Firebase Authentication exactamente con las claves de la matriz privada, incluyendo cuentas existentes y faltantes.</p>
        </div>
        <button id="secureSyncRefresh" type="button" class="secondary">Actualizar estado</button>
      </div>
      <p class="risk-note"><b>Privacidad:</b> el archivo se cifra localmente con AES-256-GCM; la clave AES se protege con RSA-OAEP usando una llave pública temporal. Las contraseñas no se publican en GitHub ni se guardan en texto claro en Firestore.</p>
      <form id="secureSyncForm" class="grid">
        <label class="full">JSON privado consolidado de 46 usuarios<input id="secureSyncFile" type="file" accept="application/json,.json" required></label>
        <div class="full actions"><button id="secureSyncSubmit" type="submit">Cifrar y enviar sincronización</button></div>
      </form>
      <div id="secureSyncMessage" class="message hidden"></div>
      <div id="secureSyncStatus" class="status-row" style="margin-top:12px"></div>`;
    adminArea.prepend(section);
    $("#secureSyncForm").addEventListener("submit", queueBatch);
    $("#secureSyncRefresh").addEventListener("click", refreshStatus);
    auth.onAuthStateChanged(user => { if (user) setTimeout(refreshStatus, 0); });
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", hydrate, { once: true });
  else hydrate();
})();
