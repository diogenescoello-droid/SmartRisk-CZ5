(() => {
  "use strict";

  if (window.__SMART_RISK_STORAGE_SAFETY__) return;
  const memory = new Map();

  try {
    const proto = window.Storage?.prototype;
    if (!proto) throw new Error("Storage API unavailable");
    const nativeGet = proto.getItem;
    const nativeSet = proto.setItem;
    const nativeRemove = proto.removeItem;

    proto.getItem = function (key) {
      try {
        const value = nativeGet.call(this, key);
        return value == null && memory.has(String(key)) ? memory.get(String(key)) : value;
      } catch (error) {
        console.warn(`SmartRisk: almacenamiento no disponible para leer ${key}`, error);
        return memory.get(String(key)) ?? null;
      }
    };

    proto.setItem = function (key, value) {
      memory.set(String(key), String(value));
      try {
        return nativeSet.call(this, key, value);
      } catch (error) {
        console.warn(`SmartRisk: almacenamiento persistente no disponible para ${key}; se usará memoria temporal`, error);
        return undefined;
      }
    };

    proto.removeItem = function (key) {
      memory.delete(String(key));
      try {
        return nativeRemove.call(this, key);
      } catch (error) {
        console.warn(`SmartRisk: no fue posible limpiar ${key} del almacenamiento persistente`, error);
        return undefined;
      }
    };
  } catch (error) {
    console.warn("SmartRisk: Storage API protegida en modo degradado", error);
  }

  window.__SMART_RISK_STORAGE_SAFETY__ = {
    version: "2026.08.24.1",
    behavior: "storage-errors-never-abort-authenticated-startup"
  };
})();
