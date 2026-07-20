(() => {
  "use strict";

  const $ = selector => document.querySelector(selector);

  const escapeHtml = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;",
    "<": "&lt;",
    ">": "&gt;",
    '"': "&quot;",
    "'": "&#39;"
  })[char]);

  function unique(values) {
    return [...new Set(values.filter(Boolean))];
  }

  function scopeKeys(profile) {
    return unique([
      ...(Array.isArray(profile.scopeKeys) ? profile.scopeKeys : []),
      ...(profile.provinciaIds || []).map(id => `PROV:${id}`),
      ...(profile.territorioIds || []).map(id => `TER:${id}`),
      ...(profile.unidadIds || []).map(id => `UNI:${id}`),
      ...(profile.institucionIds || []).map(id => `INST:${id}`)
    ]);
  }

  function title(record) {
    const item = record.payload || {};
    return item.nombre || item.titulo || item.accion || item.descripcion
      || item.canton || item.institucion || record.sourceId || record.tipo;
  }

  function detail(record) {
    const item = record.payload || {};
    return item.estado || item.status || item.responsable || item.provincia
      || item.canton || item.unidad || "Registro autorizado";
  }

  async function loadRecords(db, keys) {
    const documents = new Map();

    for (const scopeKey of keys) {
      const snapshot = await db
        .collection("alcances")
        .doc(scopeKey)
        .collection("registros")
        .get();

      snapshot.forEach(document => {
        documents.set(document.id, {
          id: document.id,
          ...document.data()
        });
      });
    }

    return [...documents.values()];
  }

  function table(records) {
    if (!records.length) {
      return `<section class="card">
        <h3>Sin registros</h3>
        <p>No existen datos autorizados para este componente.</p>
      </section>`;
    }

    return `<section class="card">
      <div class="table-wrap">
        <table>
          <thead>
            <tr><th>Tipo</th><th>Registro</th><th>Detalle</th></tr>
          </thead>
          <tbody>
            ${records.map(record => `<tr>
              <td>${escapeHtml(record.tipo)}</td>
              <td><b>${escapeHtml(title(record))}</b></td>
              <td>${escapeHtml(detail(record))}</td>
            </tr>`).join("")}
          </tbody>
        </table>
      </div>
    </section>`;
  }

  function renderDashboard(records, profile) {
    const counts = {};
    records.forEach(record => {
      counts[record.tipo] = (counts[record.tipo] || 0) + 1;
    });

    $("#pageTitle").textContent = "Panel territorial";
    $("#pageSubtitle").textContent = "Información limitada al alcance autorizado";

    $("#content").innerHTML = `
      <section class="stats">
        <article><span>Registros autorizados</span><strong>${records.length}</strong></article>
        <article><span>Componentes con datos</span><strong>${Object.keys(counts).length}</strong></article>
        <article><span>Perfil</span><strong>${escapeHtml(profile.rol || profile.codigoRol)}</strong></article>
      </section>
      <section class="card">
        <h3>Resumen por componente</h3>
        <div class="table-wrap">
          <table>
            <thead><tr><th>Componente</th><th>Registros</th></tr></thead>
            <tbody>
              ${Object.entries(counts)
                .sort((a, b) => b[1] - a[1])
                .map(([type, count]) =>
                  `<tr><td>${escapeHtml(type)}</td><td>${count}</td></tr>`
                ).join("")
                || '<tr><td colspan="2">Sin información migrada.</td></tr>'}
            </tbody>
          </table>
        </div>
      </section>
      <section class="card">
        <h3>Acceso de solo lectura</h3>
        <p>Durante el piloto puedes consultar únicamente los registros asociados a tus territorios, provincias, instituciones o unidades.</p>
        <p><b>Soporte:</b>
          <a href="mailto:diogenes.coello@gestionderiesgos.gob.ec">
            diogenes.coello@gestionderiesgos.gob.ec
          </a>
        </p>
      </section>`;
  }

  function configureNavigation(records, profile) {
    const types = [...new Set(records.map(item => item.tipo))]
      .sort((a, b) => a.localeCompare(b, "es"));

    const pages = [
      { id: "dashboard", label: "Panel" },
      { id: "all", label: "Todos los registros" },
      ...types.slice(0, 12).map(type => ({
        id: `type:${type}`,
        label: type
      }))
    ];

    $("#nav").innerHTML = pages
      .map(page =>
        `<button data-scope-page="${escapeHtml(page.id)}">
          ${escapeHtml(page.label)}
        </button>`
      ).join("");

    const show = pageId => {
      $("#nav").querySelectorAll("button").forEach(button => {
        button.classList.toggle(
          "nav-active",
          button.dataset.scopePage === pageId
        );
      });

      if (pageId === "dashboard") {
        renderDashboard(records, profile);
        return;
      }

      const filtered = pageId === "all"
        ? records
        : records.filter(record => record.tipo === pageId.slice(5));

      $("#pageTitle").textContent =
        pageId === "all" ? "Registros autorizados" : pageId.slice(5);
      $("#pageSubtitle").textContent = "Consulta segura de solo lectura";
      $("#content").innerHTML = table(filtered);
    };

    $("#nav").onclick = event => {
      const button = event.target.closest("[data-scope-page]");
      if (button) show(button.dataset.scopePage);
    };

    show("dashboard");
  }

  async function start({ user, profile, db }) {
    const keys = scopeKeys(profile);
    if (!keys.length) {
      throw new Error("El perfil no tiene alcance asignado.");
    }

    $("#login").classList.add("hidden");
    $("#app").classList.remove("hidden");
    $("#guideHelp").classList.add("hidden");
    $("#riskAnalyst").classList.add("hidden");

    $("#sessionUser").textContent =
      `${user.displayName || user.email} · ${profile.rol || profile.codigoRol}`;

    $("#syncStatus").textContent = "Consultando alcance autorizado...";
    $("#syncStatus").className = "sync-status saving";

    const records = await loadRecords(db, keys);

    $("#syncStatus").textContent = "Datos segregados · solo lectura";
    $("#syncStatus").className = "sync-status cloud";

    configureNavigation(records, profile);
  }

  window.SmartRiskScoped = {
    start,
    version: "10.3.3",
    architecture: "scope-paths"
  };
})();
