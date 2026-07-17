(function () {
  "use strict";

  window.SmartRisk = window.SmartRisk || {};

  window.SmartRisk.Button = {
    render({ id = "", label, variant = "primary", icon = "", title = "" }) {
      return `
        <button ${id ? `id="${id}"` : ""} class="btn btn-${variant}" type="button" ${title ? `title="${title}"` : ""}>
          ${icon ? window.SmartRisk.Icon.render(icon, 18) : ""}
          <span>${label}</span>
        </button>`;
    }
  };
})();
