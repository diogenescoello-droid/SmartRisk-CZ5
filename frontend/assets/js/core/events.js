(function () {
  "use strict";

  window.SmartRisk = window.SmartRisk || {};

  const bus = new EventTarget();

  window.SmartRisk.Events = {
    on(eventName, listener) {
      bus.addEventListener(eventName, listener);
      return () => bus.removeEventListener(eventName, listener);
    },

    emit(eventName, detail) {
      bus.dispatchEvent(new CustomEvent(eventName, { detail }));
    }
  };
})();
