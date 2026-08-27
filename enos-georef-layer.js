(() => {
  "use strict";

  const VERSION = "2026.08.27.1-enos-georef";
  const DATA_URL = `geo/enos-sitios-2026-2027.geojson?v=${VERSION}`;
  const SUMMARY = Object.freeze({ total: 122, georeferenced: 95, high: 87, medium: 8, pending: 27 });
  const runtime = {
    data: null,
    dataPromise: null,
    plannerMap: null,
    quickMap: null,
    plannerLayer: null,
    quickLayer: null,
    observer: null,
    leafletHooked: false
  };

  const norm = value => String(value || "")
    .normalize("NFD").replace(/[\u0300-\u036f]/g, "")
    .replace(/^\s*cant[oó]n\s+/i, "")
    .replace(/\s+/g, " ").trim().toLowerCase();
  const esc = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;"
  })[char]);

  function scope() {
    const appFilters = window.SmartRiskV11App?.state?.filters || {};
    const level = document.querySelector("#sr16Level")?.value || (appFilters.canton ? "canton" : appFilters.provincia ? "provincia" : "zona");
    const province = level === "zona" ? "" : (document.querySelector("#sr16Province")?.value || appFilters.provincia || "");
    const canton = level === "canton" ? (document.querySelector("#sr16Canton")?.value || appFilters.canton || "") : "";
    return { level, province, canton };
  }

  function threat() {
    return document.querySelector("#srCartoThreat")?.value || "";
  }

  function threatMatches(feature, selectedThreat = threat()) {
    if (!selectedThreat) return true;
    const text = norm(feature?.properties?.amenaza || "");
    if (selectedThreat === "inundacion") return /inund|desbord|aneg/.test(text);
    if (selectedThreat === "movimiento") return /desliz|movimiento|masa|ladera/.test(text);
    if (selectedThreat === "sequia") return /sequia|deficit hidri/.test(text);
    if (selectedThreat === "incendio") return /incend/.test(text);
    if (selectedThreat === "sismo") return /sism|terrem/.test(text);
    return true;
  }

  function sameScope(feature, current = scope()) {
    const p = feature?.properties || {};
    if (current.province && norm(p.provincia) !== norm(current.province)) return false;
    if (current.canton && norm(p.canton) !== norm(current.canton)) return false;
    return true;
  }

  function layerEnabled() {
    const input = document.querySelector('[data-sr-carto-layer="enos"]');
    return input ? input.checked : true;
  }

  async function data() {
    if (runtime.data) return runtime.data;
    if (!runtime.dataPromise) {
      runtime.dataPromise = fetch(DATA_URL, { cache: "no-store" }).then(response => {
        if (!response.ok) throw new Error(`No fue posible cargar la capa ENOS (${response.status})`);
        return response.json();
      }).then(geo => {
        runtime.data = geo;
        return geo;
      }).catch(error => {
        runtime.dataPromise = null;
        console.error("SmartRisk ENOS georreferenciación", error);
        throw error;
      });
    }
    return runtime.dataPromise;
  }

  function styleFor(feature, quick = false) {
    const confidence = norm(feature?.properties?.confianza_geo);
    return confidence === "media"
      ? { radius: quick ? 5 : 7, color: "#ffffff", weight: 1.5, fillColor: "#d97706", fillOpacity: .92 }
      : { radius: quick ? 5 : 7, color: "#ffffff", weight: 1.5, fillColor: "#15803d", fillOpacity: .92 };
  }

  function popup(feature) {
    const p = feature?.properties || {};
    const source = p.source_url && /^https?:/i.test(p.source_url)
      ? `<a href="${esc(p.source_url)}" target="_blank" rel="noopener">Abrir fuente ↗</a>` : "";
    const metric = (label, value) => value === undefined || value === null || value === "" ? "" : `<div><dt>${esc(label)}</dt><dd>${esc(value)}</dd></div>`;
    return `<div class="sr-carto-popup sr-enos-popup">
      <small>ENOS 2026–2027 · sitio georreferenciado</small>
      <b>${esc(p.sitio || p.id || "Sitio ENOS")}</b>
      <span>${esc([p.parroquia_zona, p.canton, p.provincia].filter(Boolean).join(" · "))}</span>
      <dl>
        ${metric("GAD", p.gad)}
        ${metric("Amenaza", p.amenaza)}
        ${metric("Prioridad técnica", p.prioridad_tecnica)}
        ${metric("Puntaje técnico", p.puntaje_tecnico)}
        ${metric("Confianza geográfica", p.confianza_geo)}
        ${metric("Fuente geográfica", p.fuente_geo)}
        ${metric("Método", p.metodo_asignacion)}
      </dl>
      ${p.observacion_geo ? `<p>${esc(p.observacion_geo)}</p>` : ""}
      ${source ? `<div>${source}</div>` : ""}
    </div>`;
  }

  function tooltip(feature) {
    const p = feature?.properties || {};
    return `${p.sitio || p.id || "Sitio ENOS"} · ${p.confianza_geo || "confianza no indicada"}`;
  }

  function filteredData(geo, current = scope(), selectedThreat = threat()) {
    return {
      type: "FeatureCollection",
      features: (geo?.features || []).filter(feature => sameScope(feature, current) && threatMatches(feature, selectedThreat))
    };
  }

  function removeLayer(map, key) {
    const layer = runtime[key];
    if (layer && map?.hasLayer?.(layer)) map.removeLayer(layer);
    runtime[key] = null;
  }

  async function paintPlanner(map) {
    if (!map || runtime.plannerMap !== map) return;
    removeLayer(map, "plannerLayer");
    updateUi();
    if (!layerEnabled()) return;
    try {
      const geo = filteredData(await data());
      if (runtime.plannerMap !== map || !layerEnabled()) return;
      const layer = L.geoJSON(geo, {
        pointToLayer: (feature, latlng) => L.circleMarker(latlng, styleFor(feature, false)),
        onEachFeature: (feature, marker) => {
          marker.bindTooltip(tooltip(feature), { sticky: true });
          marker.bindPopup(() => popup(feature), { maxWidth: 390 });
        }
      });
      runtime.plannerLayer = layer.addTo(map);
      updateUi(geo.features.length);
    } catch (_) {
      updateUi(0, true);
    }
  }

  async function paintQuick(map) {
    if (!map || runtime.quickMap !== map) return;
    removeLayer(map, "quickLayer");
    if (!layerEnabled()) return;
    try {
      const geo = filteredData(await data(), scope(), "");
      if (runtime.quickMap !== map || !layerEnabled()) return;
      const layer = L.geoJSON(geo, {
        pointToLayer: (feature, latlng) => L.circleMarker(latlng, styleFor(feature, true)),
        onEachFeature: (feature, marker) => marker.bindTooltip(tooltip(feature), { sticky: true })
      });
      runtime.quickLayer = layer.addTo(map);
    } catch (_) {}
  }

  function schedulePlanner(map) {
    setTimeout(() => paintPlanner(map), 450);
    setTimeout(() => {
      if (runtime.plannerMap === map && !runtime.plannerLayer && layerEnabled()) paintPlanner(map);
    }, 1300);
  }

  function scheduleQuick(map) {
    setTimeout(() => paintQuick(map), 450);
    setTimeout(() => {
      if (runtime.quickMap === map && !runtime.quickLayer && layerEnabled()) paintQuick(map);
    }, 1300);
  }

  function hookLeaflet() {
    if (runtime.leafletHooked || !window.L?.map) return false;
    runtime.leafletHooked = true;
    const originalMapFactory = window.L.map;
    const hooked = function(target, options) {
      const map = originalMapFactory.call(this, target, options);
      const element = typeof target === "string" ? document.getElementById(target) : target;
      if (element?.id === "srCartoMap") {
        runtime.plannerMap = map;
        runtime.plannerLayer = null;
        schedulePlanner(map);
      } else if (element?.id === "srCartoQuickMap") {
        runtime.quickMap = map;
        runtime.quickLayer = null;
        scheduleQuick(map);
      }
      return map;
    };
    Object.setPrototypeOf(hooked, Object.getPrototypeOf(originalMapFactory));
    Object.keys(originalMapFactory).forEach(key => { try { hooked[key] = originalMapFactory[key]; } catch (_) {} });
    window.L.map = hooked;
    return true;
  }

  function updateUi(visibleCount = null, failed = false) {
    const badge = document.querySelector("[data-sr-enos-count]");
    if (badge) {
      if (failed) badge.textContent = "error";
      else if (Number.isFinite(visibleCount)) badge.textContent = `${visibleCount} visibles`;
      else badge.textContent = `${SUMMARY.georeferenced} puntos`;
    }
  }

  function decoratePlanner() {
    const list = document.querySelector("#srCartoPlanner .sr-carto-layers");
    if (!list || list.querySelector('[data-sr-carto-layer="enos"]')) return;
    const label = document.createElement("label");
    label.dataset.srEnosLayerControl = "1";
    label.innerHTML = `<input type="checkbox" data-sr-carto-layer="enos" checked> Sitios ENOS 2026–2027 <small data-sr-enos-count>${SUMMARY.georeferenced} puntos</small>`;
    const sites = list.querySelector('[data-sr-carto-layer="sites"]')?.closest("label");
    (sites || list.querySelector("label"))?.insertAdjacentElement("afterend", label);

    const note = document.createElement("p");
    note.dataset.srEnosNote = "1";
    note.innerHTML = `<b>ENOS georreferenciado:</b> ${SUMMARY.high} alta confianza · ${SUMMARY.medium} media · ${SUMMARY.pending} pendientes sin coordenada verificable.`;
    const hr = list.querySelector("hr");
    if (hr) hr.insertAdjacentElement("beforebegin", note); else list.appendChild(note);

    const legend = document.querySelector("#srCartoPlanner .sr-carto-legend");
    if (legend && !legend.querySelector("[data-sr-enos-legend]")) {
      const item = document.createElement("span");
      item.dataset.srEnosLegend = "1";
      item.innerHTML = `<i style="display:inline-block;width:.7em;height:.7em;border-radius:50%;background:#15803d;margin-right:.35em"></i>ENOS`;
      legend.appendChild(item);
    }
  }

  function fitAllVisible() {
    const map = runtime.plannerMap;
    if (!map) return;
    setTimeout(() => {
      if (!runtime.plannerMap || runtime.plannerMap !== map) return;
      let bounds = null;
      map.eachLayer(layer => {
        if (layer instanceof L.TileLayer) return;
        try {
          const next = typeof layer.getBounds === "function" ? layer.getBounds() : null;
          if (next?.isValid?.()) bounds = bounds ? bounds.extend(next) : next;
          else if (typeof layer.getLatLng === "function") {
            const ll = layer.getLatLng();
            if (ll) bounds = bounds ? bounds.extend(ll) : L.latLngBounds(ll, ll);
          }
        } catch (_) {}
      });
      if (bounds?.isValid?.()) map.fitBounds(bounds, { padding: [22, 22], maxZoom: scope().canton ? 15 : scope().province ? 11 : 8 });
    }, 80);
  }

  function bind() {
    document.addEventListener("click", event => {
      if (event.target.closest("[data-sr-carto-fit]")) fitAllVisible();
    });
    document.addEventListener("change", event => {
      if (event.target.matches('[data-sr-carto-layer="enos"]')) {
        setTimeout(() => {
          if (runtime.plannerMap) paintPlanner(runtime.plannerMap);
          if (runtime.quickMap) paintQuick(runtime.quickMap);
        }, 50);
      }
    });
    runtime.observer = new MutationObserver(() => {
      hookLeaflet();
      decoratePlanner();
    });
    runtime.observer.observe(document.body, { childList: true, subtree: true });
  }

  function start() {
    hookLeaflet();
    bind();
    decoratePlanner();
    data().catch(() => {});
  }

  start();
  window.SmartRiskEnosGeoref = { VERSION, SUMMARY, scope, refresh: () => {
    decoratePlanner();
    if (runtime.plannerMap) paintPlanner(runtime.plannerMap);
    if (runtime.quickMap) paintQuick(runtime.quickMap);
  }};
})();
