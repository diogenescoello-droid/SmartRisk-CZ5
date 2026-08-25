(() => {
  "use strict";

  const VERSION = "2026.08.24.1";
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  function routeTitle() {
    const state = window.SmartRiskV11App?.state;
    const route = state?.route || "inicio";
    return window.SmartRiskV11Router?.getRoute?.(route)?.title || route;
  }

  function currentGeneratedContext() {
    const dialog = document.querySelector("#srUxPromptDialog");
    return String(dialog?._prompt || dialog?.querySelector("textarea")?.value || "").trim();
  }

  function removeDialog() {
    document.querySelector("#srGptDialog")?.remove();
  }

  function renderMessage(container, role, text) {
    const node = document.createElement("article");
    node.className = `sr-gpt-message ${role}`;
    node.innerHTML = `<b>${role === "user" ? "Consulta" : "Especialista GPT"}</b><div>${esc(text).replace(/\n/g, "<br>")}</div>`;
    container.appendChild(node);
    container.scrollTop = container.scrollHeight;
  }

  function statusText(error, response) {
    if (error === "GPT_NOT_CONFIGURED") return "El Especialista GPT todavía no tiene habilitada su credencial de servidor.";
    if (error === "SMART_RISK_RATE_LIMIT") return "Se alcanzó el límite temporal de consultas. Intenta nuevamente en unos minutos.";
    if (error === "OPENAI_RATE_LIMIT") return "OpenAI informó un límite temporal de servicio. Intenta nuevamente más tarde.";
    if (error === "AUTH_REQUIRED" || response?.status === 401) return "La sesión expiró. Vuelve a ingresar a SmartRisk.";
    if (response?.status === 403) return "Tu perfil no está habilitado para esta consulta.";
    return "No fue posible completar la consulta en este momento.";
  }

  async function ask(question, context) {
    const user = window.auth?.currentUser || (typeof auth !== "undefined" ? auth.currentUser : null);
    if (!user) throw Object.assign(new Error("AUTH_REQUIRED"), { code: "AUTH_REQUIRED", status: 401 });
    const token = await user.getIdToken();
    const response = await fetch("/api/gpt", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        question,
        context,
        route: routeTitle()
      })
    });
    const payload = await response.json().catch(() => ({}));
    if (!response.ok) {
      const error = new Error(payload.error || `HTTP_${response.status}`);
      error.code = payload.error;
      error.status = response.status;
      error.response = response;
      throw error;
    }
    return payload;
  }

  function openInternalGpt() {
    const context = currentGeneratedContext();
    if (!context) return;
    document.querySelector("#srUxPromptDialog")?.remove();
    removeDialog();

    const dialog = document.createElement("section");
    dialog.id = "srGptDialog";
    dialog.className = "sr-gpt-modal";
    dialog.setAttribute("role", "dialog");
    dialog.setAttribute("aria-modal", "true");
    dialog.setAttribute("aria-label", "Especialista GPT SmartRisk");
    dialog.innerHTML = `
      <div class="sr-gpt-card">
        <header>
          <div><span class="sr-gpt-badge">IA</span><div><h2>Especialista GPT</h2><small>Consulta técnica dentro de tu alcance SmartRisk</small></div></div>
          <button type="button" data-gpt-close aria-label="Cerrar">×</button>
        </header>
        <div class="sr-gpt-notice">Apoyo técnico de solo lectura. La respuesta no constituye validación, aprobación ni pronunciamiento oficial.</div>
        <div class="sr-gpt-conversation" aria-live="polite"></div>
        <form class="sr-gpt-form">
          <label for="srGptQuestion">¿Qué necesitas analizar?</label>
          <textarea id="srGptQuestion" maxlength="4000" rows="4" placeholder="Ej.: Resume las brechas del F07 y dime qué información falta para cerrar el seguimiento." required></textarea>
          <footer>
            <button type="button" class="secondary" data-gpt-context>Ver contexto utilizado</button>
            <button type="submit" class="primary" data-gpt-send>Consultar</button>
          </footer>
        </form>
        <details class="sr-gpt-context"><summary>Contexto SmartRisk</summary><pre>${esc(context)}</pre></details>
      </div>`;
    document.body.appendChild(dialog);
    dialog._context = context;

    const conversation = dialog.querySelector(".sr-gpt-conversation");
    renderMessage(conversation, "assistant", "Estoy conectado al contexto de esta pantalla. Formula una pregunta sobre los datos visibles, brechas, F01–F07, acciones, evidencias o seguimiento.");
    dialog.querySelector("#srGptQuestion")?.focus();
  }

  async function submit(dialog, form) {
    const input = form.querySelector("#srGptQuestion");
    const send = form.querySelector("[data-gpt-send]");
    const conversation = dialog.querySelector(".sr-gpt-conversation");
    const question = String(input?.value || "").trim();
    if (!question || !dialog._context) return;

    renderMessage(conversation, "user", question);
    input.value = "";
    input.disabled = true;
    send.disabled = true;
    send.textContent = "Analizando…";

    const pending = document.createElement("article");
    pending.className = "sr-gpt-message assistant pending";
    pending.innerHTML = "<b>Especialista GPT</b><div>Analizando el contexto autorizado…</div>";
    conversation.appendChild(pending);
    conversation.scrollTop = conversation.scrollHeight;

    try {
      const payload = await ask(question, dialog._context);
      pending.remove();
      renderMessage(conversation, "assistant", payload.answer || "No se recibió contenido.");
    } catch (error) {
      pending.remove();
      renderMessage(conversation, "assistant", statusText(error.code, error.response || { status: error.status }));
    } finally {
      input.disabled = false;
      send.disabled = false;
      send.textContent = "Consultar";
      input.focus();
    }
  }

  document.addEventListener("click", event => {
    const open = event.target.closest?.("[data-ux-open-gpt]");
    if (open) {
      event.preventDefault();
      event.stopImmediatePropagation();
      openInternalGpt();
      return;
    }
    if (event.target.closest?.("[data-gpt-close]")) {
      removeDialog();
      return;
    }
    const contextButton = event.target.closest?.("[data-gpt-context]");
    if (contextButton) {
      const details = contextButton.closest(".sr-gpt-card")?.querySelector(".sr-gpt-context");
      if (details) details.open = !details.open;
    }
  }, true);

  document.addEventListener("submit", event => {
    const form = event.target.closest?.(".sr-gpt-form");
    if (!form) return;
    event.preventDefault();
    const dialog = form.closest("#srGptDialog");
    if (dialog) submit(dialog, form);
  });

  document.addEventListener("keydown", event => {
    if (event.key === "Escape" && document.querySelector("#srGptDialog")) removeDialog();
  });

  window.SmartRiskGPT = Object.freeze({ version: VERSION, open: openInternalGpt });
})();
