(function () {
  "use strict";

  window.SmartRisk = window.SmartRisk || {};

  window.SmartRisk.Utils = {
    formatDate(date = new Date()) {
      return new Intl.DateTimeFormat("es-EC", {
        dateStyle: "long"
      }).format(date);
    },

    setTitle(title) {
      document.title = `${title} | ${window.SmartRisk.Constants.APP_NAME}`;
    },

    normalizeText(value) {
      return String(value ?? "")
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase()
        .trim();
    },

    escapeHtml(value) {
      return String(value)
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#039;");
    }
  };
})();
