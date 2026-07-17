(function () {
  "use strict";

  window.SmartRisk = window.SmartRisk || {};

  function badgeForStatus(status) {
    const normalized = window.SmartRisk.Utils.normalizeText(status);
    const cls = normalized.includes("ajuste") ? "badge-warning" : "badge-success";
    return `<span class="badge ${cls}">${status}</span>`;
  }

  window.SmartRisk.Table = {
    create({ containerId, columns, rows, searchable = true }) {
      const state = {
        query: "",
        sortKey: columns[0]?.key || "",
        sortDirection: "asc"
      };

      function renderRows() {
        const root = document.getElementById(containerId);
        if (!root) return;

        let filtered = rows.filter(row => {
          const haystack = columns.map(column => row[column.key]).join(" ");
          return window.SmartRisk.Utils.normalizeText(haystack)
            .includes(window.SmartRisk.Utils.normalizeText(state.query));
        });

        filtered = filtered.sort((a, b) => {
          const av = a[state.sortKey];
          const bv = b[state.sortKey];
          const result = String(av).localeCompare(String(bv), "es", { numeric: true });
          return state.sortDirection === "asc" ? result : -result;
        });

        const body = filtered.map(row => `
          <tr>
            ${columns.map(column => {
              const value = row[column.key];
              if (column.type === "status") return `<td>${badgeForStatus(value)}</td>`;
              if (column.type === "percent") return `<td><strong>${value}%</strong></td>`;
              return `<td>${window.SmartRisk.Utils.escapeHtml(value)}</td>`;
            }).join("")}
          </tr>`).join("");

        root.querySelector("tbody").innerHTML = body || `
          <tr><td colspan="${columns.length}" class="muted">No se encontraron registros.</td></tr>`;
      }

      const root = document.getElementById(containerId);
      root.innerHTML = `
        ${searchable ? `
          <div class="toolbar">
            <div class="search-wrap">
              <span class="search-icon">${window.SmartRisk.Icon.render("search", 18)}</span>
              <input id="${containerId}-search" class="search-input" type="search" placeholder="Buscar en la tabla…">
            </div>
            <span class="badge">${rows.length} registros</span>
          </div>` : ""}
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                ${columns.map(column => `
                  <th>
                    <button class="table-sort" type="button" data-sort="${column.key}">
                      ${column.label}
                    </button>
                  </th>`).join("")}
              </tr>
            </thead>
            <tbody></tbody>
          </table>
        </div>`;

      root.querySelectorAll("[data-sort]").forEach(button => {
        button.addEventListener("click", () => {
          const key = button.dataset.sort;
          state.sortDirection = state.sortKey === key && state.sortDirection === "asc" ? "desc" : "asc";
          state.sortKey = key;
          renderRows();
        });
      });

      root.querySelector(`#${containerId}-search`)?.addEventListener("input", event => {
        state.query = event.target.value;
        renderRows();
      });

      renderRows();
    }
  };
})();
