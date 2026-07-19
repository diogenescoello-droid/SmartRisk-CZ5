window.SmartRisk = window.SmartRisk || {};

(function () {
  const STORAGE_KEY = "workspace.territory";

  function clean(value) {
    return String(value ?? "").trim();
  }

  function normalize(value) {
    return SmartRisk.Utils.normalizeText(clean(value));
  }

  function read() {
    const value = SmartRisk.Storage.get(STORAGE_KEY, {});
    return {
      provincia: clean(value?.provincia),
      canton: clean(value?.canton),
      updatedAt: value?.updatedAt || ""
    };
  }

  function set(context = {}) {
    const current = read();
    const next = {
      provincia: clean(context.provincia ?? current.provincia),
      canton: clean(context.canton ?? current.canton),
      updatedAt: new Date().toISOString()
    };

    if (!next.provincia) next.canton = "";
    SmartRisk.Storage.set(STORAGE_KEY, next);
    SmartRisk.Events?.emit("workspace:changed", next);
    return next;
  }

  function clear() {
    SmartRisk.Storage.remove(STORAGE_KEY);
    const empty = { provincia: "", canton: "", updatedAt: "" };
    SmartRisk.Events?.emit("workspace:changed", empty);
    return empty;
  }

  function matches(row, context = read()) {
    if (!row) return false;
    const provinceMatches = !context.provincia || normalize(row.provincia) === normalize(context.provincia);
    const cantonMatches = !context.canton || normalize(row.canton ?? row.capital) === normalize(context.canton);
    return provinceMatches && cantonMatches;
  }

  function filter(rows, context = read()) {
    return (rows || []).filter(row => matches(row, context));
  }

  SmartRisk.Workspace = { read, set, clear, matches, filter };
})();
