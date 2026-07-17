(function () {
  "use strict";

  window.SmartRisk = window.SmartRisk || {};

  function apply(theme) {
    document.documentElement.dataset.theme = theme;
    window.SmartRisk.Storage.set("theme", theme);
  }

  window.SmartRisk.Theme = {
    init() {
      const saved = window.SmartRisk.Storage.get("theme", "light");
      apply(saved);
    },

    toggle() {
      const current = document.documentElement.dataset.theme || "light";
      apply(current === "light" ? "dark" : "light");
    }
  };
})();
