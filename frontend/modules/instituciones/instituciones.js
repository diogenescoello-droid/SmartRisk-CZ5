(function () {
  "use strict";

  window.SmartRisk = window.SmartRisk || {};
  const SR = window.SmartRisk;

  function render() {
    return `
      <section class="page-header">
        <div>
          <span class="kicker">Módulo preparado</span>
          <h1 class="page-title">Instituciones</h1>
          <p class="page-subtitle">Catálogo de actores, competencias y responsabilidades.</p>
        </div>
      </section>

      ${SR.Card.panel({
        title: "Instituciones",
        body: `
          <div class="module-placeholder">
            <div>
              <span class="badge">Próximo sprint funcional</span>
              <h2>La interfaz y navegación ya están listas.</h2>
              <p class="muted">Los datos, filtros y operaciones se incorporarán en el sprint correspondiente.</p>
              <a class="btn btn-primary" href="#/dashboard">Volver al dashboard</a>
            </div>
          </div>`
      })}
    `;
  }

  SR.InstitucionesModule = {
    route: {
      path: "/instituciones",
      title: "Instituciones",
      render
    }
  };
})();
