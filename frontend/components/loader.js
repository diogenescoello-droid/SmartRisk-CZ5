(function () {
  "use strict";

  window.SmartRisk = window.SmartRisk || {};

  window.SmartRisk.Loader = {
    show(message = "Procesando…") {
      document.getElementById("app-loader-root").innerHTML = `
        <div class="global-loader" role="status">
          <div class="loader-card">
            <div class="spinner" aria-hidden="true"></div>
            <strong>${message}</strong>
          </div>
        </div>`;
    },

    hide() {
      document.getElementById("app-loader-root").innerHTML = "";
    }
  };
})();
