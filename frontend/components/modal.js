(function () {
  "use strict";

  window.SmartRisk = window.SmartRisk || {};

  function close() {
    document.getElementById("app-modal-root").innerHTML = "";
    document.body.classList.remove("is-locked");
  }

  window.SmartRisk.Modal = {
    open({ title, body, confirmLabel = "Aceptar", onConfirm = null }) {
      const root = document.getElementById("app-modal-root");

      root.innerHTML = `
        <div class="modal-backdrop">
          <section class="modal" role="dialog" aria-modal="true">
            <header class="modal-header">
              <h2 class="section-title">${title}</h2>
              <button id="modal-close" class="icon-btn" type="button" aria-label="Cerrar">×</button>
            </header>
            <div class="modal-body">${body}</div>
            <footer class="modal-footer">
              <button id="modal-cancel" class="btn btn-secondary" type="button">Cancelar</button>
              <button id="modal-confirm" class="btn btn-primary" type="button">${confirmLabel}</button>
            </footer>
          </section>
        </div>`;

      document.body.classList.add("is-locked");
      document.getElementById("modal-close").addEventListener("click", close);
      document.getElementById("modal-cancel").addEventListener("click", close);
      document.getElementById("modal-confirm").addEventListener("click", () => {
        onConfirm?.();
        close();
      });
    },

    close
  };
})();
