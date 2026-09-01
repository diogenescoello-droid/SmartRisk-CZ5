(() => {
  "use strict";

  const VERSION = "2026.09.01.4-selective-repair";
  const JOB_REF = () => db.collection("migraciones").doc("credential-sync-current");
  const PUBLIC_KEY_URL = "CREDENTIAL_SYNC_PUBLIC_KEY.json";
  const FIREBASE_WEB_API_KEY = "AIzaSyCAgRRrJMKe0RBhVJxjeblkark8jnMhbIY";
  const $ = selector => document.querySelector(selector);
  const normalizeEmail = value => String(value || "").trim().toLowerCase();
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
  const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
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

  async function credentialWorks(user) {
    const email = normalizeEmail(user?.correo);
    const password = String(user?.claveInicial || user?.password || "").trim();
    const url = `https://identitytoolkit.googleapis.com/v1/accounts:signInWithPassword?key=${FIREBASE_WEB_API_KEY}`;
    const response = await fetch(url, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true })
    });
    if (response.ok) return true;
    const body = await response.json().catch(() => ({}));
    const code = String(body?.error?.message || `HTTP_${response.status}`);
    if (["INVALID_LOGIN_CREDENTIALS", "INVALID_PASSWORD", "EMAIL_NOT_FOUND", "USER_DISABLED"].includes(code)) return false;
    throw new Error(`No se pudo validar ${email}: ${code}`);
  }

  async function splitWorkingAndPending(users, onProgress) {
    const working = [];
    const pending = [];
    for (let i = 0; i < users.length; i++) {
      const user = users[i];
      onProgress?.(i + 1, users.length);
      const ok = await credentialWorks(user);
      (ok ? working : pending).push(user);
      await sleep(120);
    }
    return { working, pending };
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
      const sourceText = await file.text();
      const parsed = JSON.parse(sourceText);
      const users = validateBatch(parsed);
      box.classList.add("warn");
      box.textContent = "Comprobando las 46 credenciales contra Firebase sin modificar ninguna cuenta…";
      const { working, pending } = await splitWorkingAndPending(users, (current, total) => {
        box.textContent = `Comprobando credenciales ${current}/${total}…`;
      });
      if (!pending.length) {
        $("#secureSyncFile").value = "";
        box.className = "message ok";
        box.innerHTML = `<b>No hay credenciales por reparar.</b> Las ${working.length} credenciales del archivo ya ingresan correctamente.`;
        return;
      }
      box.textContent = `${working.length} credenciales funcionan. Preparando reparación segura solo para ${pending.length} pendientes…`;
      const keyDoc = await loadCurrentPublicKey();
      const clearText = JSON.stringify({ users: pending });
      const envelope = await encryptBatch(clearText, keyDoc);
      await JOB_REF().set({
        schemaVersion: "2026.09.01.4",
        type: "credential-sync-subset",
        status: "pending",
        recordCount: pending.length,
        sourceRecordCount: users.length,
        knownGoodCount: working.length,
        requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
        requestedBy: normalizeEmail(auth.currentUser.email),
        clientVersion: VERSION,
        ...envelope
      });
      $("#secureSyncFile").value = "";
      box.className = "message ok";
      box.innerHTML = `<b>Reparación selectiva enviada.</b> ${working.length} credenciales que ya funcionaban quedaron intactas; solo ${pending.length} fueron cifradas y enviadas a reparación. Llave: <code>${escapeHtml(String(keyDoc.keyId).slice(0, 8))}…</code>`;
      await refreshStatus();
    } catch (error) {
      console.error("Secure credential queue failed", error?.message || error);
      box.className = "message bad";
      box.textContent = error?.message || "No se pudo enviar la reparación cifrada.";
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
      const count = Number(data.recordCount || 0);
      const badgeClass = status === "success" ? "ok" : status === "failed" ? "bad" : "warn";
      const detail = status === "success"
        ? `${Number(data.verified || 0)} de ${count} reparados y verificados · ${Number(data.created || 0)} creados · ${Number(data.updated || 0)} actualizados`
        : status === "failed"
          ? `Error de sincronización. Fallos: ${Number(data.failureCount || 0)}`
          : `Reparación cifrada pendiente de procesamiento · ${count} registros`;
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
          <h2>Reparación selectiva de credenciales</h2>
          <p class="muted">Carga la matriz privada de 46 usuarios. SmartRisk comprueba primero cuáles ya funcionan y solo repara las credenciales rechazadas.</p>
        </div>
        <button id="secureSyncRefresh" type="button" class="secondary">Actualizar estado</button>
      </div>
      <p class="risk-note"><b>Protección:</b> las cuentas que ya ingresan no se modifican. Solo las credenciales fallidas se cifran localmente con AES-256-GCM y se envían protegidas con RSA-OAEP.</p>
      <form id="secureSyncForm" class="grid">
        <label class="full">JSON privado consolidado de 46 usuarios<input id="secureSyncFile" type="file" accept="application/json,.json" required></label>
        <div class="full actions"><button id="secureSyncSubmit" type="submit">Comprobar y reparar pendientes</button></div>
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
