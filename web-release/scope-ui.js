(() => {
  "use strict";

  let scheduled = false;

  function updateText(element, value) {
    if (!element) return;
    if (element.textContent === value) return;
    element.textContent = value;
  }


  const normalizeScopeText = value =>
    String(value || "")
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .trim()
      .toLowerCase();

  function hideElement(selector) {
    document.querySelectorAll(selector).forEach(element => {
      element.hidden = true;
      element.style.display = "none";
      element.setAttribute("aria-hidden", "true");
    });
  }

  function lockSelect(id, expectedValue) {
    const select = document.getElementById(id);

    if (!select || !expectedValue) return;

    const expected =
      normalizeScopeText(expectedValue);

    const option = [...select.options].find(item => {
      return (
        normalizeScopeText(item.value) === expected ||
        normalizeScopeText(item.textContent) === expected
      );
    });

    if (!option) return;

    const changed =
      select.value !== option.value;

    select.value = option.value;
    select.disabled = true;
    select.setAttribute("aria-disabled", "true");
    select.title =
      "Alcance fijado por el perfil territorial";

    [...select.options].forEach(item => {
      item.hidden = item !== option;
    });

    if (
      changed &&
      select.dataset.smartRiskScopeValue !==
        option.value
    ) {
      select.dataset.smartRiskScopeValue =
        option.value;

      queueMicrotask(() => {
        select.dispatchEvent(
          new Event("change", {
            bubbles: true
          })
        );
      });
    }
  }

  function enforceTerritorialControls(scope, state) {
    if (state.administrator) return;

    hideElement("#addTerritory");

    document.querySelectorAll("button").forEach(button => {
      if (
        normalizeScopeText(button.textContent) ===
        "nuevo territorio"
      ) {
        button.hidden = true;
        button.style.display = "none";
      }
    });

    const territory =
      scope.currentTerritory();

    const available =
      scope.availableTerritories();

    const province =
      territory?.provincia ||
      available[0]?.provincia ||
      state.provinceNames?.[0] ||
      state.provinceIds?.[0];

    [
      "reviewProvince",
      "territoryProvince",
      "f03ProvinceFilter",
      "analystProvince"
    ].forEach(id => {
      lockSelect(id, province);
    });

    if (state.scopeType === "cantonal") {
      const canton =
        territory?.canton ||
        available[0]?.canton ||
        state.cantonNames?.[0];

      [
        "f03CantonFilter",
        "analystCanton",
        "territoryCanton"
      ].forEach(id => {
        lockSelect(id, canton);
      });
    }
  }

  function decorate() {
    scheduled = false;

    const scope = window.SmartRiskScope;
    const state = scope?.getState?.();

    if (!state) return;

    const label = scope.scopeLabel();

    updateText(
      document.querySelector(".brand span"),
      `CZ5 · RC13.2 · ${label}`
    );

    const currentUser =
      typeof auth !== "undefined"
        ? auth.currentUser
        : null;

    if (currentUser) {
      updateText(
        document.querySelector("#sessionUser"),
        `${
          currentUser.displayName ||
          currentUser.email
        } · ${state.role} · ${label}`
      );
    }

    enforceTerritorialControls(scope, state);

    document.documentElement.dataset.smartRiskUnifiedUi =
      "true";
  }

  function schedule() {
    if (scheduled) return;

    scheduled = true;
    requestAnimationFrame(decorate);
  }

  new MutationObserver(schedule).observe(
    document.documentElement,
    {
      childList: true,
      subtree: true,
      characterData: true
    }
  );

  window.addEventListener("load", schedule);
  schedule();

  window.SMART_RISK_SCOPE_UI = {
    version: "13.2.0",
    refresh: schedule
  };
})();