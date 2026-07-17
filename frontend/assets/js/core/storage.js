(function () {
  "use strict";

  window.SmartRisk = window.SmartRisk || {};

  const prefix = window.SmartRisk.Constants.STORAGE_PREFIX;
  const makeKey = name => `${prefix}.${name}`;

  window.SmartRisk.Storage = {
    get(name, fallback = null) {
      try {
        const raw = localStorage.getItem(makeKey(name));
        return raw === null ? fallback : JSON.parse(raw);
      } catch {
        return fallback;
      }
    },

    set(name, value) {
      try {
        localStorage.setItem(makeKey(name), JSON.stringify(value));
        return true;
      } catch {
        return false;
      }
    }
  };
})();
