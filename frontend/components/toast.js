(function () {
  "use strict";

  window.SmartRisk = window.SmartRisk || {};

  window.SmartRisk.Toast = {
    show(message, type = "info", duration = 3200) {
      const region = document.getElementById("app-toast-region");
      const toast = document.createElement("div");

      toast.className = `toast toast-${type}`;
      toast.textContent = message;
      region.appendChild(toast);

      setTimeout(() => toast.remove(), duration);
    }
  };
})();
