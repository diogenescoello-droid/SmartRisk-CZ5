(() => {
  "use strict";

  const VERSION = "2026.09.01.2-secure-admin-queue";
  const JOB_REF = () => db.collection("migraciones").doc("credential-sync-current");
  const $ = selector => document.querySelector(selector);
  const normalizeEmail = value => String(value || "").trim().toLowerCase();
  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({ "&":"&amp;", "<":"&lt;", ">":"&gt;", '"':"&quot;", "'":"&#39;" })[char]);
  const bytesToBase64 = bytes => {
    let binary = "";
    const view = bytes instanceof Uint8Array ? bytes : new Uint8Array(bytes);
    for (let i = 0; i < view.length; i += 0x8000) binary += String.fromCharCode(...view.subarray(i, i + 0x8000));
    return btoa(binary);
  };

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

  async function encryptBatch(clearText) {
    const aesKey = await crypto.subtle.generateKey({ name: "AES-GCM", length: 256 }, true, ["encrypt"]);
    const rawAes = await crypto.subtle.exportKey("raw", aesKey);
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const clearBytes = new TextEncoder().encode(clearText);
    const ciphertextWithTag = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, aesKey, clearBytes);
    return {
      algorithm: "AES-256-GCM(WebCrypto-tag-appended)",
      sessionKey: bytesToBase64(rawAes),
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
      const clearText = await file.text();
      const parsed = JSON.parse(clearText);
      const users = validateBatch(parsed);
      const envelope = await encryptBatch(clearText);
      await JOB_REF().set({
        schemaVersion: "2026.09.01.2",
        type: "credential-sync-46",
        status: "pending",
        recordCount: users.length,
        requestedAt: firebase.firestore.FieldValue.serverTimestamp(),
        requestedBy: normalizeEmail(auth.currentUser.email),
        clientVersion: VERSION,
        ...envelope
      });
      $("#secureSyncFile").value = "";
      box.classList.add("ok");
      box.innerHTML = "<b>Lote cifrado recibido.</b> Las 46 credenciales se cifraron localmente antes de guardarse en el área administrativa de migración. El proceso con Admin SDK reemplazará las claves existentes y creará las cuentas faltantes.";
      await refreshStatus();
    } catch (error) {
      console.error("Secure credential queue failed", error?.message || error);
      box.classList.add("bad");
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
      <p class="risk-note"><b>Privacidad:</b> el archivo se cifra localmente con AES-256-GCM antes de guardarse temporalmente en el área administrativa de migración. No se publica en GitHub y, al completar la sincronización, el proceso elimina la carga cifrada y conserva solo el resultado resumido.</p>
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
