(() => {
  "use strict";

  const VERSION = "1.0.1-cartography-planning";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").trim().toLowerCase();
  const finite = value => Number.isFinite(Number(value)) ? Number(value) : null;

  const STATIC_LAYERS = Object.freeze({
    bolivar: { label: "Tamizaje territorial · Bolívar", url: "geo/riesgo-bolivar-web.geojson", province: "Bolívar" },
    santaElena: { label: "Tamizaje territorial · Santa Elena", url: "geo/riesgo-santa-elena-web.geojson", province: "Santa Elena" }
  });

  const runtime = {
    map: null,
    quickMap: null,
    overlays: new Map(),
    selected: new Map(),
    catalog: new Map(),
    geoCache: new Map(),
    observer: null,
    bound: false,
    renderTimer: null,
    lastScopeKey: ""
  };

  const baseMaps = () => ({
    calles: L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 19, attribution: "© OpenStreetMap" }),
    satelite: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Esri World Imagery" }),
    topo: L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}", { maxZoom: 19, attribution: "Esri World Topographic Map" })
  });

  function state() { return window.SmartRiskV11App?.state || {}; }

  function scope() {
    const level = $("#sr16Level")?.value || (state().filters?.canton ? "canton" : state().filters?.provincia ? "provincia" : "zona");
    const province = level === "zona" ? "" : ($("#sr16Province")?.value || state().filters?.provincia || "");
    const canton = level === "canton" ? ($("#sr16Canton")?.value || state().filters?.canton || "") : "";
    return { level, province, canton, key: `${level}|${norm(province)}|${norm(canton)}` };
  }

  function sameScope(item, current = scope()) {
    const province = item?.provincia || item?.province || item?.payload?.provincia || item?.payload?.province || "";
    const canton = item?.canton || item?.cantón || item?.territory || item?.payload?.canton || item?.payload?.territorioNombre || "";
    return (!current.province || norm(province) === norm(current.province)) && (!current.canton || norm(canton) === norm(current.canton));
  }

  function entities() { return state().data?.entities || {}; }
  function f03() { return Array.isArray(window.F03_CARTOGRAPHY) ? window.F03_CARTOGRAPHY : []; }

  function orientPair(a, b, preferLonLat = false) {
    if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
    const aLooksEcuadorLng = a >= -83 && a <= -74;
    const bLooksEcuadorLng = b >= -83 && b <= -74;
    const aLooksEcuadorLat = a >= -6 && a <= 3;
    const bLooksEcuadorLat = b >= -6 && b <= 3;
    if (aLooksEcuadorLng && bLooksEcuadorLat) return [b, a];
    if (bLooksEcuadorLng && aLooksEcuadorLat) return [a, b];
    if (preferLonLat && Math.abs(b) <= 90 && Math.abs(a) <= 180) return [b, a];
    if (Math.abs(a) <= 90 && Math.abs(b) <= 180) return [a, b];
    if (Math.abs(b) <= 90 && Math.abs(a) <= 180) return [b, a];
    return null;
  }

  function parsePoint(value) {
    if (!value) return null;
    if (Array.isArray(value) && value.length >= 2) {
      const a = finite(value[0]), b = finite(value[1]);
      return a !== null && b !== null ? orientPair(a, b) : null;
    }
    if (typeof value === "object") {
      const lat = finite(value.lat ?? value.latitude ?? value.y), lng = finite(value.lng ?? value.lon ?? value.longitude ?? value.x);
      if (lat !== null && lng !== null) return [lat, lng];
    }
    const raw = String(value);
    const nums = raw.match(/-?\d+(?:[.,]\d+)?/g)?.map(v => Number(v.replace(",", "."))) || [];
    if (nums.length < 2) return null;
    return orientPair(nums[0], nums[1], /\bPOINT|\bPOLYGON|\bLINESTRING/i.test(raw));
  }

  function parsePolygon(value) {
    if (!value) return [];
    const out = [];
    if (Array.isArray(value)) {
      const pairs = value.flat(Infinity).filter(v => typeof v === "number");
      for (let i = 0; i + 1 < pairs.length; i += 2) {
        const p = orientPair(pairs[i], pairs[i + 1]);
        if (p) out.push(p);
      }
      return out;
    }
    const raw = String(value);
    const nums = raw.match(/-?\d+(?:[.,]\d+)?/g)?.map(v => Number(v.replace(",", "."))) || [];
    const preferLonLat = /\bPOLYGON|\bLINESTRING/i.test(raw);
    for (let i = 0; i + 1 < nums.length; i += 2) {
      const p = orientPair(nums[i], nums[i + 1], preferLonLat);
      if (p) out.push(p);
    }
    return out;
  }

  function threatText(item) {
    return norm([
      item?.amenaza, item?.evento, item?.tipo, item?.nombre, item?.title, item?.detail,
      item?.payload?.amenaza, item?.payload?.evento, item?.payload?.descripcion,
      item?.properties?.susceptibilidad_inundacion, item?.properties?.susceptibilidad_sequia,
      item?.properties?.susceptibilidad_incendio
    ].filter(Boolean).join(" "));
  }

  function threatMatches(item, threat) {
    if (!threat) return true;
    const text = threatText(item);
    if (threat === "inundacion") return /inund|desbord|aneg/.test(text);
    if (threat === "movimiento") return /desliz|movimiento|masa|ladera/.test(text);
    if (threat === "sequia") return /sequia|deficit hidri/.test(text);
    if (threat === "incendio") return /incend/.test(text);
    if (threat === "sismo") return /sism|terrem/.test(text);
    return true;
  }

  function f03Geometry(item) {
    const polygon = parsePolygon(item.poligono || item.geometria);
    if (polygon.length >= 3) return { type: "Polygon", latlngs: polygon };
    const point = parsePoint(item.punto || item.geometria);
    if (point) return { type: "Point", latlng: point };
    return null;
  }

  function f03Usability(item) {
    const geom = f03Geometry(item);
    const hasSource = Boolean(item.fuente || item.institucion);
    const hasTrace = Boolean(item.codigoCaso || item.id);
    const hasSupport = Boolean(item.archivoUrl || item.mapaUrl || item.archivo);
    const hasMetadata = /escala|epsg|crs|fecha|cobertura/i.test(String(item.limitaciones || ""));
    if (geom && hasSource && hasTrace && (hasSupport || hasMetadata)) return "Proyectable con trazabilidad";
    if (geom) return "Proyectable con observaciones";
    return "Referencia documental";
  }

  function pointFromRecord(record) {
    const lat = finite(record?.lat ?? record?.latitud ?? record?.payload?.lat ?? record?.payload?.latitud);
    const lng = finite(record?.lng ?? record?.lon ?? record?.longitud ?? record?.payload?.lng ?? record?.payload?.lon ?? record?.payload?.longitud);
    return lat !== null && lng !== null && Math.abs(lat) <= 90 && Math.abs(lng) <= 180 ? [lat, lng] : null;
  }

  function geometryFromRecord(record) {
    const raw = record?.geometry || record?.geometria || record?.payload?.geometry || record?.payload?.geometria || record?.payload?.geojson;
    if (raw && typeof raw === "object" && raw.type && raw.coordinates) return raw;
    if (record?.payload?.features?.type === "FeatureCollection") return record.payload.features;
    if (record?.payload?.features?.features) return { type: "FeatureCollection", features: record.payload.features.features };
    if (Array.isArray(record?.payload?.features)) return { type: "FeatureCollection", features: record.payload.features };
    const point = pointFromRecord(record);
    return point ? { type: "Point", coordinates: [point[1], point[0]] } : null;
  }

  function recordLabel(record) {
    return record?.title || record?.nombre || record?.payload?.nombre || record?.payload?.titulo || record?.tipo || "Elemento cartográfico";
  }

  function recordSource(record) {
    return record?.institucion || record?.payload?.fuente || record?.payload?.institucion || record?.fuente || "SmartRisk";
  }

  function itemKey(source, id) { return `${source}:${String(id || "sin-id")}`; }

  function registerItem(source, item, extra = {}) {
    const id = item?.id || item?.sourceId || item?.codigoCaso || extra.id || `${source}-${runtime.catalog.size + 1}`;
    const key = itemKey(source, id);
    const descriptor = {
      key, source, id,
      label: extra.label || recordLabel(item),
      type: extra.type || source,
      province: extra.province || item?.provincia || item?.province || item?.properties?.provincia || "",
      canton: extra.canton || item?.canton || item?.properties?.cantones || "",
      threat: extra.threat || item?.amenaza || item?.payload?.amenaza || "",
      status: extra.status || item?.estado || item?.prioridad || "",
      sourceLabel: extra.sourceLabel || recordSource(item),
      detail: extra.detail || item?.detail || item?.descripcion || item?.payload?.descripcion || "",
      url: extra.url || item?.archivoUrl || item?.mapaUrl || item?.url || item?.sourceUrl || item?.payload?.url || item?.payload?.archivo || "",
      geometry: extra.geometry || null,
      raw: item
    };
    runtime.catalog.set(key, descriptor);
    return descriptor;
  }

  function popupHtml(descriptor, note = "") {
    const selected = runtime.selected.has(descriptor.key);
    return `<div class="sr-carto-popup"><small>${esc(descriptor.type)}</small><b>${esc(descriptor.label)}</b><span>${esc([descriptor.canton, descriptor.province].filter(Boolean).join(" · ") || descriptor.sourceLabel)}</span>${descriptor.threat ? `<p><strong>Amenaza:</strong> ${esc(descriptor.threat)}</p>` : ""}${descriptor.status ? `<p><strong>Estado:</strong> ${esc(descriptor.status)}</p>` : ""}${descriptor.detail ? `<p>${esc(String(descriptor.detail).slice(0, 240))}</p>` : ""}${note ? `<em>${esc(note)}</em>` : ""}<div><button type="button" data-sr-carto-select="${esc(descriptor.key)}">${selected ? "Quitar de planificación" : "Añadir a planificación"}</button>${descriptor.url && /^https?:/i.test(descriptor.url) ? `<a href="${esc(descriptor.url)}" target="_blank" rel="noopener">Abrir fuente ↗</a>` : ""}</div></div>`;
  }

  async function loadGeo(url) {
    if (runtime.geoCache.has(url)) return runtime.geoCache.get(url);
    const promise = fetch(url).then(response => {
      if (!response.ok) throw new Error(`No fue posible cargar ${url}`);
      return response.json();
    });
    runtime.geoCache.set(url, promise);
    return promise;
  }

  function filters() {
    const root = $("#srCartoPlanner");
    return {
      threat: $("#srCartoThreat", root)?.value || "",
      base: $("#srCartoBase", root)?.value || "calles",
      layers: new Set($$("[data-sr-carto-layer]:checked", root).map(input => input.dataset.srCartoLayer))
    };
  }

  function addLayer(name, layer, map = runtime.map) {
    if (!map || !layer) return;
    runtime.overlays.set(name, layer);
    layer.addTo(map);
  }

  function layerMarkerStyle(kind) {
    const styles = {
      f03: { radius: 8, color: "#fff", weight: 2, fillColor: "#0f766e", fillOpacity: .95 },
      sites: { radius: 8, color: "#fff", weight: 2, fillColor: "#b91c1c", fillOpacity: .95 },
      risks: { radius: 7, color: "#fff", weight: 2, fillColor: "#f97316", fillOpacity: .95 },
      actions: { radius: 7, color: "#fff", weight: 2, fillColor: "#2563eb", fillOpacity: .95 },
      reports: { radius: 7, color: "#fff", weight: 2, fillColor: "#7c3aed", fillOpacity: .95 },
      operational: { radius: 7, color: "#fff", weight: 2, fillColor: "#0891b2", fillOpacity: .95 }
    };
    return styles[kind] || styles.operational;
  }

  function bindFeatureLayer(layer, descriptor, note = "") {
    layer.bindTooltip(descriptor.label, { sticky: true });
    layer.bindPopup(() => popupHtml(descriptor, note), { maxWidth: 360 });
    layer.on("click", () => renderInspector(descriptor));
    return layer;
  }

  async function paintBoundaries(map, current, layers) {
    if (!layers.has("boundaries")) return;
    const geo = await loadGeo("geo/cantones-zonal5.geojson");
    const filtered = { ...geo, features: (geo.features || []).filter(feature => {
      const p = feature.properties || {};
      return sameScope({ provincia: p.DPA_DESPRO || p.PROVINCIA || p.provincia, canton: p.DPA_DESCAN || p.CANTON || p.canton }, current);
    }) };
    const layer = L.geoJSON(filtered, {
      style: { color: "#475569", weight: 1.3, fillColor: "#94a3b8", fillOpacity: .08 },
      onEachFeature: (feature, polygon) => {
        const p = feature.properties || {};
        const province = p.DPA_DESPRO || p.PROVINCIA || p.provincia || "";
        const canton = p.DPA_DESCAN || p.CANTON || p.canton || "Cantón";
        polygon.bindTooltip(`${canton} · ${province}`, { sticky: true });
        polygon.bindPopup(`<div class="sr-carto-popup"><small>Límite administrativo</small><b>${esc(canton)}</b><span>${esc(province)}</span><div><button type="button" data-sr-carto-scope-canton="${esc(canton)}" data-sr-carto-scope-province="${esc(province)}">Filtrar este cantón</button></div></div>`);
      }
    });
    addLayer("boundaries", layer, map);
  }

  function paintF03(map, current, layers, threat) {
    if (!layers.has("f03")) return;
    const group = L.featureGroup();
    f03().filter(item => sameScope(item, current) && threatMatches(item, threat)).forEach(item => {
      const geom = f03Geometry(item);
      if (!geom) return;
      const geometry = geom.type === "Point"
        ? { type: "Point", coordinates: [geom.latlng[1], geom.latlng[0]] }
        : { type: "Polygon", coordinates: [[...geom.latlngs.map(([lat,lng]) => [lng,lat]), [geom.latlngs[0][1], geom.latlngs[0][0]]]] };
      const descriptor = registerItem("F03", item, {
        label: item.nombre || "Aporte cartográfico F03",
        type: "F03 · aporte cartográfico",
        threat: item.amenaza || "",
        status: f03Usability(item),
        sourceLabel: item.fuente || item.institucion || "F03",
        detail: item.limitaciones || item.descripcion || "",
        geometry
      });
      const layer = geom.type === "Point" ? L.circleMarker(geom.latlng, layerMarkerStyle("f03")) : L.polygon(geom.latlngs, { color: "#0f766e", weight: 2.5, fillColor: "#14b8a6", fillOpacity: .23 });
      bindFeatureLayer(layer, descriptor, f03Usability(item)).addTo(group);
    });
    addLayer("f03", group, map);
  }

  function paintEntityPoints(map, current, layers, threat, entityKey, layerName, label) {
    if (!layers.has(layerName)) return;
    const group = L.featureGroup();
    (entities()[entityKey] || []).filter(item => sameScope(item, current) && threatMatches(item, threat)).forEach(item => {
      const geometry = geometryFromRecord(item);
      if (!geometry) return;
      const descriptor = registerItem(entityKey, item, { type: label, geometry });
      if (geometry.type === "Point") {
        const latlng = [geometry.coordinates[1], geometry.coordinates[0]];
        bindFeatureLayer(L.circleMarker(latlng, layerMarkerStyle(layerName)), descriptor).addTo(group);
      } else {
        try {
          const geoLayer = L.geoJSON(geometry.type === "FeatureCollection" ? geometry : { type: "Feature", properties: {}, geometry }, {
            style: { color: layerMarkerStyle(layerName).fillColor, weight: 2.5, fillOpacity: .22 },
            pointToLayer: (_f, latlng) => L.circleMarker(latlng, layerMarkerStyle(layerName)),
            onEachFeature: (_f, l) => bindFeatureLayer(l, descriptor)
          });
          geoLayer.addTo(group);
        } catch (_) {}
      }
    });
    addLayer(layerName, group, map);
  }

  async function paintStaticRisk(map, current, layers, threat, key) {
    if (!layers.has(key)) return;
    const config = STATIC_LAYERS[key];
    if (!config || (current.province && norm(current.province) !== norm(config.province))) return;
    const geo = await loadGeo(config.url);
    const filtered = { type: "FeatureCollection", features: (geo.features || []).filter(feature => {
      const p = feature.properties || {};
      return sameScope({ provincia: p.provincia || config.province, canton: p.cantones || p.canton }, current) && threatMatches({ properties: p }, threat);
    }) };
    const layer = L.geoJSON(filtered, {
      pointToLayer: (_feature, latlng) => L.circleMarker(latlng, { radius: 5, color: "#fff", weight: 1.5, fillColor: "#64748b", fillOpacity: .8 }),
      onEachFeature: (feature, featureLayer) => {
        const p = feature.properties || {};
        const id = `${key}-${feature.geometry?.coordinates?.join("-")}-${p.lugares_muestra || p.cantones || "punto"}`;
        const descriptor = registerItem(key, feature, {
          id,
          label: p.lugares_muestra || `${config.label} · ${p.cantones || "territorio"}`,
          type: config.label,
          province: p.provincia || config.province,
          canton: p.cantones || "",
          threat: [p.susceptibilidad_inundacion && `Inundación ${p.susceptibilidad_inundacion}`, p.susceptibilidad_sequia && `Sequía ${p.susceptibilidad_sequia}`, p.susceptibilidad_incendio && `Incendio ${p.susceptibilidad_incendio}`].filter(Boolean).join(" · "),
          status: "Referencia para tamizaje; requiere validación técnica",
          sourceLabel: "Capa agregada SmartRisk",
          detail: p.uso || "Tamizaje territorial agregado",
          geometry: feature.geometry
        });
        bindFeatureLayer(featureLayer, descriptor, "No usar como declaración oficial de riesgo sin validación técnica.");
      }
    });
    addLayer(key, layer, map);
  }

  function projectedCount(current = scope()) {
    const f03Count = f03().filter(item => sameScope(item, current) && f03Geometry(item)).length;
    const keys = ["criticalSites", "risks", "actions", "reports", "monitoringReports", "mapLayers"];
    const entityCount = keys.reduce((sum, key) => sum + (entities()[key] || []).filter(item => sameScope(item, current) && geometryFromRecord(item)).length, 0);
    return f03Count + entityCount;
  }

  function documentaryF03(current = scope(), threat = "") {
    return f03().filter(item => sameScope(item, current) && !f03Geometry(item) && threatMatches(item, threat));
  }

  function renderInspector(descriptor) {
    const target = $("#srCartoInspector");
    if (!target || !descriptor) return;
    target.innerHTML = `<small>Elemento seleccionado</small><h4>${esc(descriptor.label)}</h4><dl><div><dt>Tipo</dt><dd>${esc(descriptor.type)}</dd></div><div><dt>Territorio</dt><dd>${esc([descriptor.canton, descriptor.province].filter(Boolean).join(" · ") || "No indicado")}</dd></div><div><dt>Fuente</dt><dd>${esc(descriptor.sourceLabel)}</dd></div>${descriptor.threat ? `<div><dt>Amenaza</dt><dd>${esc(descriptor.threat)}</dd></div>` : ""}${descriptor.status ? `<div><dt>Uso / estado</dt><dd>${esc(descriptor.status)}</dd></div>` : ""}</dl>${descriptor.detail ? `<p>${esc(String(descriptor.detail).slice(0, 400))}</p>` : ""}<div class="sr-carto-inspector-actions"><button type="button" data-sr-carto-select="${esc(descriptor.key)}">${runtime.selected.has(descriptor.key) ? "Quitar de planificación" : "Añadir a planificación"}</button>${descriptor.url && /^https?:/i.test(descriptor.url) ? `<a href="${esc(descriptor.url)}" target="_blank" rel="noopener">Abrir fuente ↗</a>` : ""}</div>`;
  }

  function renderSelection() {
    const target = $("#srCartoSelection");
    if (!target) return;
    const items = [...runtime.selected.values()];
    const groups = items.reduce((acc, item) => { acc[item.type] = (acc[item.type] || 0) + 1; return acc; }, {});
    target.innerHTML = `<div class="sr-carto-selection-head"><div><small>Selección de planificación</small><b>${items.length} elementos</b></div><span>Temporal · no altera fuentes</span></div>${items.length ? `<div class="sr-carto-selection-summary">${Object.entries(groups).map(([name,count]) => `<span>${esc(name)} <b>${count}</b></span>`).join("")}</div><div class="sr-carto-selection-list">${items.map(item => `<button type="button" data-sr-carto-inspect="${esc(item.key)}"><b>${esc(item.label)}</b><small>${esc([item.canton,item.province].filter(Boolean).join(" · ") || item.type)}</small><em>×</em></button>`).join("")}</div><div class="sr-carto-selection-actions"><button type="button" data-sr-carto-zoom>Zoom a selección</button><button type="button" class="secondary" data-sr-carto-export>Exportar GeoJSON</button><button type="button" class="secondary" data-sr-carto-actions>Abrir acciones</button><button type="button" class="secondary" data-sr-carto-clear>Limpiar</button></div>` : `<p>Selecciona sitios, riesgos, capas F03, acciones o elementos de tamizaje que quieras revisar conjuntamente para priorizar la planificación.</p>`}`;
  }

  function planningHtml() {
    const current = scope();
    const docs = documentaryF03(current);
    const e = entities();
    const count = key => (e[key] || []).filter(item => sameScope(item, current)).length;
    return `<section id="srCartoPlanner" class="sr-carto-planner">
      <div class="sr-carto-lead"><div><small>Visor operativo de planificación</small><h2>Cartografía para decidir qué priorizar y dónde actuar</h2><p>Active capas, filtre la amenaza, seleccione elementos y contraste fuentes antes de convertir la lectura territorial en acciones.</p></div><div class="sr-carto-kpis"><span><b>${f03().filter(item => sameScope(item,current)).length}</b> F03</span><span><b>${projectedCount(current)}</b> proyectables</span><span><b>${count("criticalSites") + count("risks")}</b> sitios/riesgos</span><span><b>${docs.length}</b> F03 documentales</span></div></div>
      <div class="sr-carto-controls"><label>Mapa base<select id="srCartoBase"><option value="calles">Calles</option><option value="satelite">Imagen satelital</option><option value="topo">Topográfico</option></select></label><label>Amenaza<select id="srCartoThreat"><option value="">Todas las amenazas</option><option value="inundacion">Inundación</option><option value="movimiento">Movimiento en masa / deslizamiento</option><option value="sequia">Sequía</option><option value="incendio">Incendio forestal</option><option value="sismo">Sismo</option></select></label><button type="button" data-sr-carto-fit>Ajustar a datos</button></div>
      <div class="sr-carto-layout"><aside class="sr-carto-layers"><h3>Capas visibles</h3>
        <label><input type="checkbox" data-sr-carto-layer="boundaries" checked> Límites cantonales</label>
        <label><input type="checkbox" data-sr-carto-layer="f03" checked> F03 con geometría</label>
        <label><input type="checkbox" data-sr-carto-layer="sites" checked> Sitios críticos</label>
        <label><input type="checkbox" data-sr-carto-layer="risks" checked> Riesgos / amenazas</label>
        <label><input type="checkbox" data-sr-carto-layer="actions" checked> Acciones georreferenciadas</label>
        <label><input type="checkbox" data-sr-carto-layer="operational" checked> Cartografía operativa</label>
        <label><input type="checkbox" data-sr-carto-layer="reports"> Informes / monitoreo georreferenciado</label>
        <hr><label><input type="checkbox" data-sr-carto-layer="bolivar"> Tamizaje Bolívar</label><label><input type="checkbox" data-sr-carto-layer="santaElena"> Tamizaje Santa Elena</label>
        <p><b>Importante:</b> las capas de tamizaje son referencias agregadas y requieren validación técnica antes de sustentar una decisión oficial.</p>
      </aside><div class="sr-carto-map-wrap"><div id="srCartoMap" aria-label="Mapa cartográfico para planificación"></div><div class="sr-carto-legend"><span class="site">Sitio crítico</span><span class="risk">Riesgo</span><span class="f03">F03</span><span class="action">Acción</span><span class="operational">Capa operativa</span></div></div><aside id="srCartoInspector" class="sr-carto-inspector"><small>Cómo usar el visor</small><h4>Seleccione una geometría</h4><p>Al hacer clic verá fuente, territorio, amenaza y condición de uso. Puede añadir varios elementos a una selección temporal para planificar.</p></aside></div>
      <div id="srCartoSelection" class="sr-carto-selection"></div>
      <section class="sr-carto-docs"><div><h3>Fuentes F03 sin geometría proyectable</h3><p>Siguen siendo útiles como evidencia documental, pero no deben aparecer falsamente como puntos en el mapa.</p></div><div id="srCartoDocuments"></div></section>
    </section>`;
  }

  function renderDocuments() {
    const target = $("#srCartoDocuments");
    if (!target) return;
    const threat = $("#srCartoThreat")?.value || "";
    const items = documentaryF03(scope(), threat).slice(0, 30);
    target.innerHTML = items.length ? items.map(item => {
      const descriptor = registerItem("F03-doc", item, { label: item.nombre || "Aporte F03", type: "F03 · referencia documental", status: "Sin geometría proyectable", sourceLabel: item.fuente || item.institucion || "F03", detail: item.limitaciones || item.descripcion || "" });
      return `<article><div><b>${esc(descriptor.label)}</b><small>${esc([item.canton,item.provincia].filter(Boolean).join(" · "))}</small><span>${esc(item.tipo || item.formato || "Documento")}</span></div><div><button type="button" data-sr-carto-select="${esc(descriptor.key)}">${runtime.selected.has(descriptor.key) ? "Quitar" : "Añadir a planificación"}</button>${descriptor.url && /^https?:/i.test(descriptor.url) ? `<a href="${esc(descriptor.url)}" target="_blank" rel="noopener">Fuente ↗</a>` : ""}</div></article>`;
    }).join("") : `<p class="sr-carto-empty">No hay fuentes documentales F03 para el filtro territorial y de amenaza seleccionado.</p>`;
  }

  async function paintPlannerMap() {
    const container = $("#srCartoMap");
    if (!container || typeof window.L === "undefined") return;
    runtime.map?.remove();
    runtime.map = L.map(container, { zoomControl: true, preferCanvas: true }).setView([-1.65, -79.55], 7);
    runtime.catalog.clear();
    runtime.overlays.clear();
    const current = scope();
    const chosen = filters();
    const bases = baseMaps();
    bases[chosen.base].addTo(runtime.map);
    runtime.map._srBases = bases;
    try {
      await paintBoundaries(runtime.map, current, chosen.layers);
      paintF03(runtime.map, current, chosen.layers, chosen.threat);
      paintEntityPoints(runtime.map, current, chosen.layers, chosen.threat, "criticalSites", "sites", "Sitio crítico");
      paintEntityPoints(runtime.map, current, chosen.layers, chosen.threat, "risks", "risks", "Riesgo / amenaza");
      paintEntityPoints(runtime.map, current, chosen.layers, chosen.threat, "actions", "actions", "Acción georreferenciada");
      paintEntityPoints(runtime.map, current, chosen.layers, chosen.threat, "mapLayers", "operational", "Cartografía operativa");
      paintEntityPoints(runtime.map, current, chosen.layers, chosen.threat, "reports", "reports", "Informe georreferenciado");
      paintEntityPoints(runtime.map, current, chosen.layers, chosen.threat, "monitoringReports", "reports", "Monitoreo georreferenciado");
      await paintStaticRisk(runtime.map, current, chosen.layers, chosen.threat, "bolivar");
      await paintStaticRisk(runtime.map, current, chosen.layers, chosen.threat, "santaElena");
    } catch (error) { console.error("Cartografía SmartRisk", error); }
    fitPlannerMap();
    setTimeout(() => runtime.map?.invalidateSize(), 100);
    renderDocuments();
    renderSelection();
  }

  function fitPlannerMap() {
    if (!runtime.map) return;
    const layers = [...runtime.overlays.values()].filter(layer => typeof layer.getBounds === "function");
    const validBounds = layers.map(layer => { try { return layer.getBounds(); } catch (_) { return null; } }).filter(bounds => bounds?.isValid?.());
    if (!validBounds.length) { runtime.map.setView([-1.65,-79.55], 7); return; }
    const combined = validBounds.slice(1).reduce((bounds, next) => bounds.extend(next), validBounds[0]);
    runtime.map.fitBounds(combined, { padding: [22, 22], maxZoom: scope().canton ? 15 : scope().province ? 11 : 8 });
  }

  function replaceBase(value) {
    if (!runtime.map?._srBases) return;
    Object.values(runtime.map._srBases).forEach(layer => { if (runtime.map.hasLayer(layer)) runtime.map.removeLayer(layer); });
    runtime.map._srBases[value]?.addTo(runtime.map);
  }

  function addOrRemoveSelection(key) {
    const descriptor = runtime.catalog.get(key) || runtime.selected.get(key);
    if (!descriptor) return;
    if (runtime.selected.has(key)) runtime.selected.delete(key); else runtime.selected.set(key, descriptor);
    renderSelection();
    renderDocuments();
    renderInspector(descriptor);
  }

  function zoomSelection() {
    if (!runtime.map) return;
    const features = [...runtime.selected.values()].map(item => item.geometry).filter(Boolean).map(geometry => ({ type: "Feature", properties: {}, geometry }));
    if (!features.length) return;
    try {
      const layer = L.geoJSON({ type: "FeatureCollection", features });
      const bounds = layer.getBounds();
      if (bounds.isValid()) runtime.map.fitBounds(bounds, { padding: [35,35], maxZoom: 15 });
    } catch (_) {}
  }

  function exportSelection() {
    const features = [...runtime.selected.values()].filter(item => item.geometry).map(item => ({ type: "Feature", properties: { source: item.source, id: item.id, label: item.label, type: item.type, province: item.province, canton: item.canton, threat: item.threat, status: item.status, sourceLabel: item.sourceLabel }, geometry: item.geometry }));
    if (!features.length) return alert("La selección no contiene geometrías exportables.");
    const blob = new Blob([JSON.stringify({ type: "FeatureCollection", features }, null, 2)], { type: "application/geo+json" });
    const url = URL.createObjectURL(blob), link = document.createElement("a");
    link.href = url; link.download = `smartrisk-seleccion-planificacion-${new Date().toISOString().slice(0,10)}.geojson`; link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function setScopeToCanton(province, canton) {
    const level = $("#sr16Level"), provinceSelect = $("#sr16Province"), cantonSelect = $("#sr16Canton");
    if (level) level.value = "canton";
    if (provinceSelect) { provinceSelect.value = province; provinceSelect.dispatchEvent(new Event("change", { bubbles: true })); }
    setTimeout(() => {
      if (cantonSelect) { cantonSelect.value = canton; cantonSelect.dispatchEvent(new Event("change", { bubbles: true })); }
      scheduleRefresh();
    }, 30);
  }

  function openActions() { $("[data-sr16-full=\"acciones\"]")?.click(); }

  function renderFullPlanner() {
    const module = $("#sr16Module");
    if (!module) return false;
    const heading = $(".sr16-module-head h1", module)?.textContent || "";
    if (norm(heading) !== "cartografia") return false;
    const head = $(".sr16-module-head", module);
    if (!head) return false;
    if (!$("#srCartoPlanner", module)) module.innerHTML = head.outerHTML + planningHtml();
    paintPlannerMap();
    return true;
  }

  function renderQuickMap() {
    const view = $('[data-sr16-view="mapa"]');
    if (!view) return;
    let host = $("#srCartoQuickHost", view);
    const legacy = $(".sr16-map", view);
    if (!host) {
      host = document.createElement("div");
      host.id = "srCartoQuickHost";
      host.className = "sr-carto-quick";
      host.innerHTML = `<div class="sr-carto-quick-head"><div><b>Mapa territorial operativo</b><small>Capas disponibles para lectura y planificación</small></div><button type="button" data-sr-carto-open-full>Abrir visor completo</button></div><div id="srCartoQuickMap"></div><div class="sr-carto-quick-foot"><span>F03, sitios, riesgos, acciones y límites</span><b>${projectedCount()} elementos proyectables en el alcance actual</b></div>`;
      if (legacy) legacy.replaceWith(host); else view.insertBefore(host, $(".sr16-field", view));
    } else {
      $(".sr-carto-quick-foot b", host).textContent = `${projectedCount()} elementos proyectables en el alcance actual`;
    }
    if (!view.classList.contains("active") || typeof window.L === "undefined") return;
    runtime.quickMap?.remove();
    runtime.quickMap = L.map($("#srCartoQuickMap"), { zoomControl: true, attributionControl: false, preferCanvas: true }).setView([-1.65,-79.55], 7);
    L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", { maxZoom: 18 }).addTo(runtime.quickMap);
    const current = scope();
    loadGeo("geo/cantones-zonal5.geojson").then(geo => {
      if (!runtime.quickMap) return;
      const layer = L.geoJSON({ ...geo, features: (geo.features || []).filter(feature => {
        const p = feature.properties || {};
        return sameScope({ provincia: p.DPA_DESPRO || p.PROVINCIA || p.provincia, canton: p.DPA_DESCAN || p.CANTON || p.canton }, current);
      }) }, { style: { color: "#64748b", weight: 1, fillColor: "#94a3b8", fillOpacity: .08 } }).addTo(runtime.quickMap);
      const points = L.featureGroup().addTo(runtime.quickMap);
      const addPoint = (latlng, fill, title) => L.circleMarker(latlng, { radius: 6, color: "#fff", weight: 1.5, fillColor: fill, fillOpacity: .95 }).bindTooltip(title, { sticky: true }).addTo(points);
      f03().filter(item => sameScope(item,current) && f03Geometry(item)?.type === "Point").slice(0,250).forEach(item => addPoint(f03Geometry(item).latlng, "#0f766e", item.nombre || "F03"));
      ["criticalSites","risks","actions"].forEach((key,index) => (entities()[key] || []).filter(item => sameScope(item,current) && pointFromRecord(item)).slice(0,250).forEach(item => addPoint(pointFromRecord(item), ["#b91c1c","#f97316","#2563eb"][index], recordLabel(item))));
      const all = L.featureGroup([layer, points]);
      if (all.getBounds().isValid()) runtime.quickMap.fitBounds(all.getBounds(), { padding: [15,15], maxZoom: current.canton ? 13 : current.province ? 10 : 8 });
      setTimeout(() => runtime.quickMap?.invalidateSize(), 80);
    }).catch(() => {});
  }

  function scheduleRefresh() {
    clearTimeout(runtime.renderTimer);
    runtime.renderTimer = setTimeout(() => {
      renderQuickMap();
      renderFullPlanner();
      runtime.lastScopeKey = scope().key;
    }, 60);
  }

  function bind() {
    if (runtime.bound) return;
    runtime.bound = true;
    document.addEventListener("click", event => {
      const select = event.target.closest("[data-sr-carto-select]");
      if (select) { addOrRemoveSelection(select.dataset.srCartoSelect); return; }
      const inspect = event.target.closest("[data-sr-carto-inspect]");
      if (inspect) {
        const key = inspect.dataset.srCartoInspect;
        const item = runtime.selected.get(key) || runtime.catalog.get(key);
        if (runtime.selected.has(key)) runtime.selected.delete(key);
        if (item) renderInspector(item);
        renderSelection();
        return;
      }
      const canton = event.target.closest("[data-sr-carto-scope-canton]");
      if (canton) { setScopeToCanton(canton.dataset.srCartoScopeProvince, canton.dataset.srCartoScopeCanton); return; }
      if (event.target.closest("[data-sr-carto-fit]")) { fitPlannerMap(); return; }
      if (event.target.closest("[data-sr-carto-zoom]")) { zoomSelection(); return; }
      if (event.target.closest("[data-sr-carto-export]")) { exportSelection(); return; }
      if (event.target.closest("[data-sr-carto-actions]")) { openActions(); return; }
      if (event.target.closest("[data-sr-carto-clear]")) { runtime.selected.clear(); renderSelection(); renderDocuments(); return; }
      if (event.target.closest("[data-sr-carto-open-full]")) { $("[data-sr16-full=\"mapas\"]")?.click(); setTimeout(renderFullPlanner, 30); return; }
      if (event.target.closest('[data-sr16-tab="mapa"]')) setTimeout(renderQuickMap, 30);
      if (event.target.closest('[data-sr16-full="mapas"]')) setTimeout(renderFullPlanner, 30);
    });
    document.addEventListener("change", event => {
      if (event.target.matches("#srCartoBase")) { replaceBase(event.target.value); return; }
      if (event.target.matches("#srCartoThreat,[data-sr-carto-layer]")) { paintPlannerMap(); return; }
      if (event.target.matches("#sr16Level,#sr16Province,#sr16Canton")) scheduleRefresh();
    });
    runtime.observer = new MutationObserver(() => {
      if ($('[data-sr16-view="mapa"].active') && !$("#srCartoQuickHost")) renderQuickMap();
      const heading = $("#sr16Module .sr16-module-head h1")?.textContent;
      if (norm(heading) === "cartografia" && !$("#srCartoPlanner")) renderFullPlanner();
    });
    runtime.observer.observe(document.body, { childList: true, subtree: true });
  }

  function afterAppStart() {
    bind();
    scheduleRefresh();
  }

  window.SmartRiskCartographyPlanning = { VERSION, afterAppStart, renderFullPlanner, renderQuickMap, paintPlannerMap, scope, projectedCount, parsePoint, parsePolygon };
})();
