(() => {
  "use strict";

  const VERSION = "1.0.0-f03-geometry-planning";
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const esc = value => String(value ?? "").replace(/[&<>"']/g, c => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"})[c]);
  const norm = value => String(value || "").normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/_/g," ").replace(/^\s*cant[oó]n\s+/i,"").replace(/\s+/g," ").trim().toLowerCase();
  const runtime = {
    map: null,
    observer: null,
    activeView: "all",
    catalog: new Map(),
    selected: new Map(),
    loadedFiles: new Map(),
    layerGroups: new Map(),
    lastPlanner: null,
    renderTimer: null
  };

  const PREPROCESSED = Object.freeze({
    "F03-29": {
      url: "f03-daule-inundacion.geojson",
      label: "KMZ completo · Zona de Inundación",
      note: "Capa vectorial preprocesada del KMZ RIESGOS_ayuda_humanitaria del GAD Municipal de Daule."
    }
  });

  function rows() { return Array.isArray(window.F03_CARTOGRAPHY) ? window.F03_CARTOGRAPHY : []; }
  function scopeApi() { return window.SmartRiskCartographyScope || window.SmartRiskCartographyGadScope; }
  function currentScope() { return scopeApi()?.currentScope?.() || { level:"zona", province:"", canton:"", key:"zona||" }; }
  function inScope(item) { return scopeApi()?.matchesScope ? scopeApi().matchesScope(item, currentScope()) : true; }

  function excelDate(value) {
    if (typeof value === "number" && value > 30000 && value < 70000) {
      const date = new Date(Date.UTC(1899,11,30) + value * 86400000);
      return date.toISOString().slice(0,10);
    }
    return String(value || "");
  }

  function sourceIsKmlKmz(item) {
    const text = `${item?.formato || ""} ${item?.archivo || ""} ${item?.tipo || ""}`;
    return /\bkml\b|\bkmz\b|kml_kmz/i.test(text);
  }

  function sourceIsShp(item) {
    const text = `${item?.formato || ""} ${item?.archivo || ""}`;
    return /shp|\.zip$/i.test(text);
  }

  function point(value) {
    return window.SmartRiskCartographyPlanning?.parsePoint?.(value) || null;
  }

  function sequence(value) {
    if (!value) return [];
    const raw = String(value).trim();
    if (!raw) return [];
    if (raw.includes(";")) return raw.split(";").map(part => point(part)).filter(Boolean);
    const nums = raw.match(/-?\d+(?:[.,]\d+)?/g)?.map(v => Number(v.replace(",","."))) || [];
    const result = [];
    const lonLat = /LINESTRING|POLYGON/i.test(raw);
    for (let i=0;i+1<nums.length;i+=2) {
      const a=nums[i],b=nums[i+1];
      let latlng = null;
      if (lonLat) latlng=[b,a];
      else if (a >= -6 && a <= 3 && b >= -83 && b <= -74) latlng=[a,b];
      else if (b >= -6 && b <= 3 && a >= -83 && a <= -74) latlng=[b,a];
      else if (Math.abs(a)<=90 && Math.abs(b)<=180) latlng=[a,b];
      if (latlng) result.push(latlng);
    }
    return result;
  }

  function directGeometry(item) {
    const geoType = norm(item?.geometria);
    const rawLine = item?.linea || item?.línea || item?.line || "";
    if (rawLine || /linea|line string|linestring/.test(geoType)) {
      const coords = sequence(rawLine || item.geometria);
      if (coords.length >= 2) return { type:"LineString", coordinates:coords.map(([lat,lng])=>[lng,lat]) };
    }
    const polygon = sequence(item?.poligono || (/polygon|poligono/.test(geoType) ? item.geometria : ""));
    if (polygon.length >= 3) {
      const ring = polygon.map(([lat,lng])=>[lng,lat]);
      if (ring[0][0] !== ring.at(-1)[0] || ring[0][1] !== ring.at(-1)[1]) ring.push([...ring[0]]);
      return { type:"Polygon", coordinates:[ring] };
    }
    const p = point(item?.punto || (/punto|point/.test(geoType) ? item.geometria : ""));
    if (p) return { type:"Point", coordinates:[p[1],p[0]] };
    return null;
  }

  function geometryKind(item) {
    const geometry = directGeometry(item);
    if (geometry?.type === "Point") return "point";
    if (geometry?.type === "LineString" || geometry?.type === "MultiLineString") return "line";
    if (geometry?.type === "Polygon" || geometry?.type === "MultiPolygon") return "polygon";
    return "document";
  }

  function kindLabel(kind) {
    return ({point:"Punto",line:"Línea",polygon:"Polígono",document:"Sin geometría"})[kind] || "Cartografía";
  }

  function scopeLabel(scope = currentScope()) {
    if (scope.level === "zona") return "Zona 5 · todos los GAD";
    if (scope.level === "provincia") return `${scope.province} · todos los GAD`;
    return `${scope.canton} · solo el GAD cantonal`;
  }

  function scopedRows() { return rows().filter(inScope); }

  function counts(records = scopedRows()) {
    const result = { point:0, line:0, polygon:0, document:0, kmz:0, shp:0 };
    records.forEach(item => {
      result[geometryKind(item)]++;
      if (sourceIsKmlKmz(item)) result.kmz++;
      if (sourceIsShp(item)) result.shp++;
    });
    return result;
  }

  function descriptorFromRecord(item) {
    const geometry = directGeometry(item);
    return {
      key:`record:${item.id || item.codigoCaso || Math.random()}`,
      recordId:item.id || item.codigoCaso || "",
      label:item.nombre || "Elemento F03",
      province:item.provincia || "",
      canton:item.canton || "",
      type:kindLabel(geometryKind(item)),
      sourceType:sourceIsKmlKmz(item)?"KML/KMZ":sourceIsShp(item)?"SHP/ZIP":item.formato || item.tipo || "F03",
      source:item.fuente || item.institucion || "F03",
      priority:item.prioridad || "",
      sector:item.comunidadSector || "",
      date:excelDate(item.fechaRegistro),
      limitations:item.limitaciones || "",
      description:item.descripcion || "",
      file:item.archivo || "",
      url:item.archivoUrl || item.mapaUrl || "",
      geometry,
      raw:item
    };
  }

  function featureDescriptor(feature, sourceRecord, index, labelPrefix="KML/KMZ") {
    const properties = feature.properties || {};
    const label = properties.name || properties.Name || properties.NOMBRE || properties.nombre || `${labelPrefix} · elemento ${index+1}`;
    return {
      key:`feature:${sourceRecord?.id || "local"}:${index}:${label}`,
      recordId:sourceRecord?.id || "local",
      label,
      province:sourceRecord?.provincia || currentScope().province || "",
      canton:sourceRecord?.canton || currentScope().canton || "",
      type:feature.geometry?.type || "Geometría",
      sourceType:labelPrefix,
      source:sourceRecord?.fuente || sourceRecord?.institucion || "Archivo cargado",
      priority:sourceRecord?.prioridad || "",
      sector:sourceRecord?.comunidadSector || "",
      date:excelDate(sourceRecord?.fechaRegistro),
      limitations:sourceRecord?.limitaciones || "",
      description:sourceRecord?.descripcion || "",
      file:sourceRecord?.archivo || labelPrefix,
      url:sourceRecord?.archivoUrl || "",
      geometry:feature.geometry,
      properties,
      raw:sourceRecord || feature
    };
  }

  function register(descriptor) {
    runtime.catalog.set(descriptor.key, descriptor);
    return descriptor;
  }

  function popup(descriptor) {
    const selected = runtime.selected.has(descriptor.key);
    return `<div class="sr-f03-popup"><small>${esc(descriptor.sourceType)} · ${esc(descriptor.type)}</small><b>${esc(descriptor.label)}</b><span>${esc([descriptor.canton,descriptor.province].filter(Boolean).join(" · "))}</span>${descriptor.sector?`<p><strong>Sector:</strong> ${esc(descriptor.sector)}</p>`:""}${descriptor.priority?`<p><strong>Prioridad:</strong> ${esc(descriptor.priority)}</p>`:""}${descriptor.description?`<p>${esc(String(descriptor.description).slice(0,240))}</p>`:""}<button type="button" data-srf03-select="${esc(descriptor.key)}">${selected?"Quitar de planificación":"Añadir a planificación"}</button></div>`;
  }

  function layerFromFeature(feature, descriptor) {
    const style = { color:"#0f766e", weight:3, fillColor:"#14b8a6", fillOpacity:.25 };
    const layer = L.geoJSON({type:"Feature",properties:feature.properties||{},geometry:feature.geometry},{
      style,
      pointToLayer:(_f,latlng)=>L.circleMarker(latlng,{radius:8,color:"#fff",weight:2,fillColor:"#0f766e",fillOpacity:.95}),
      onEachFeature:(_f,l)=>{
        l.bindTooltip(descriptor.label,{sticky:true});
        l.bindPopup(()=>popup(descriptor),{maxWidth:360});
        l.on("click",()=>renderInspector(descriptor));
      }
    });
    return layer;
  }

  function featureFromDescriptor(descriptor) {
    return descriptor.geometry ? {type:"Feature",properties:{label:descriptor.label,source:descriptor.source,recordId:descriptor.recordId,province:descriptor.province,canton:descriptor.canton,priority:descriptor.priority,sector:descriptor.sector},geometry:descriptor.geometry} : null;
  }

  function baseMaps() {
    return {
      calles:L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:"© OpenStreetMap"}),
      satelite:L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"Esri World Imagery"}),
      topo:L.tileLayer("https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}",{maxZoom:19,attribution:"Esri World Topographic Map"})
    };
  }

  function filteredRecords() {
    const records = scopedRows();
    if (runtime.activeView === "all") return records;
    if (runtime.activeView === "kmz") return records.filter(sourceIsKmlKmz);
    return records.filter(item => geometryKind(item) === runtime.activeView);
  }

  function buildMap() {
    const container = $("#srF03GeometryMap");
    if (!container || typeof window.L === "undefined") return;
    runtime.map?.remove();
    runtime.map = L.map(container,{preferCanvas:true}).setView([-1.65,-79.55],7);
    runtime.catalog.clear();
    runtime.layerGroups.clear();
    const bases=baseMaps();
    const baseValue=$("#srF03Base")?.value || "calles";
    (bases[baseValue]||bases.calles).addTo(runtime.map);
    runtime.map._srF03Bases=bases;

    const directGroup=L.featureGroup().addTo(runtime.map);
    filteredRecords().forEach(item=>{
      const descriptor=register(descriptorFromRecord(item));
      if (!descriptor.geometry) return;
      const feature=featureFromDescriptor(descriptor);
      layerFromFeature(feature,descriptor).addTo(directGroup);
    });
    runtime.layerGroups.set("direct",directGroup);

    for (const [loadKey,loaded] of runtime.loadedFiles) {
      if (loaded.sourceRecord && !inScope(loaded.sourceRecord)) continue;
      const group=L.featureGroup().addTo(runtime.map);
      loaded.features.forEach((feature,index)=>{
        if (!feature?.geometry) return;
        const descriptor=register(featureDescriptor(feature,loaded.sourceRecord,index,loaded.label));
        layerFromFeature(feature,descriptor).addTo(group);
      });
      runtime.layerGroups.set(loadKey,group);
    }

    fitMap();
    renderSelection();
    setTimeout(()=>runtime.map?.invalidateSize(),80);
  }

  function fitMap() {
    if (!runtime.map) return;
    const groups=[...runtime.layerGroups.values()];
    const bounds=groups.map(group=>{try{return group.getBounds()}catch{return null}}).filter(b=>b?.isValid?.());
    if (!bounds.length) { runtime.map.setView([-1.65,-79.55],7); return; }
    const combined=bounds.slice(1).reduce((acc,b)=>acc.extend(b),bounds[0]);
    runtime.map.fitBounds(combined,{padding:[22,22],maxZoom:currentScope().level==="canton"?15:currentScope().level==="provincia"?11:8});
  }

  function replaceBase(value) {
    if (!runtime.map?._srF03Bases) return;
    Object.values(runtime.map._srF03Bases).forEach(layer=>runtime.map.hasLayer(layer)&&runtime.map.removeLayer(layer));
    runtime.map._srF03Bases[value]?.addTo(runtime.map);
  }

  function renderInspector(descriptor) {
    const target=$("#srF03Inspector");
    if (!target||!descriptor) return;
    target.innerHTML=`<small>Elemento F03 seleccionado</small><h4>${esc(descriptor.label)}</h4><dl><div><dt>Representación</dt><dd>${esc(descriptor.type)}</dd></div><div><dt>Formato / fuente</dt><dd>${esc(descriptor.sourceType)}</dd></div><div><dt>GAD</dt><dd>${esc(descriptor.canton||"No indicado")}</dd></div><div><dt>Provincia</dt><dd>${esc(descriptor.province||"No indicada")}</dd></div><div><dt>Fuente</dt><dd>${esc(descriptor.source)}</dd></div>${descriptor.date?`<div><dt>Fecha</dt><dd>${esc(descriptor.date)}</dd></div>`:""}${descriptor.priority?`<div><dt>Prioridad</dt><dd>${esc(descriptor.priority)}</dd></div>`:""}${descriptor.sector?`<div><dt>Sector</dt><dd>${esc(descriptor.sector)}</dd></div>`:""}${descriptor.file?`<div><dt>Archivo</dt><dd>${esc(descriptor.file)}</dd></div>`:""}</dl>${descriptor.description?`<p>${esc(descriptor.description)}</p>`:""}${descriptor.limitations?`<p><strong>Limitaciones:</strong> ${esc(descriptor.limitations)}</p>`:""}<div class="sr-f03-inspector-actions"><button type="button" data-srf03-select="${esc(descriptor.key)}">${runtime.selected.has(descriptor.key)?"Quitar de planificación":"Añadir a planificación"}</button>${descriptor.url&&/^https?:/i.test(descriptor.url)?`<a href="${esc(descriptor.url)}" target="_blank" rel="noopener">Abrir archivo ↗</a>`:""}</div>`;
  }

  function toggleSelection(key) {
    const descriptor=runtime.catalog.get(key)||runtime.selected.get(key);
    if (!descriptor) return;
    if (runtime.selected.has(key)) runtime.selected.delete(key); else runtime.selected.set(key,descriptor);
    renderSelection();
    renderInspector(descriptor);
  }

  function renderSelection() {
    const target=$("#srF03PlanningSelection");
    if (!target) return;
    const items=[...runtime.selected.values()];
    target.innerHTML=`<div class="sr-f03-selection-head"><div><small>Selección cartográfica para planificación</small><b>${items.length} elementos</b></div><span>Temporal · no modifica F03</span></div>${items.length?`<div class="sr-f03-selection-list">${items.map(item=>`<button type="button" data-srf03-inspect="${esc(item.key)}"><b>${esc(item.label)}</b><small>${esc(item.type)} · ${esc(item.canton||item.province||"Zona 5")}</small><em>×</em></button>`).join("")}</div><div class="sr-f03-selection-actions"><button type="button" data-srf03-zoom>Zoom a selección</button><button type="button" class="secondary" data-srf03-export>Exportar GeoJSON</button><button type="button" class="secondary" data-srf03-clear>Limpiar</button></div>`:`<p>Haz clic en un punto, línea, polígono o elemento de una capa KML/KMZ y agrégalo aquí para construir la selección de planificación.</p>`}`;
  }

  function zoomSelection() {
    if (!runtime.map) return;
    const features=[...runtime.selected.values()].map(featureFromDescriptor).filter(Boolean);
    if (!features.length) return;
    const layer=L.geoJSON({type:"FeatureCollection",features});
    const bounds=layer.getBounds();
    if (bounds.isValid()) runtime.map.fitBounds(bounds,{padding:[35,35],maxZoom:15});
  }

  function exportSelection() {
    const features=[...runtime.selected.values()].map(featureFromDescriptor).filter(Boolean);
    if (!features.length) return alert("La selección no contiene geometrías exportables.");
    const blob=new Blob([JSON.stringify({type:"FeatureCollection",features},null,2)],{type:"application/geo+json"});
    const url=URL.createObjectURL(blob),a=document.createElement("a");
    a.href=url;a.download=`f03-seleccion-planificacion-${new Date().toISOString().slice(0,10)}.geojson`;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }

  function parseCoordinates(text) {
    return String(text||"").trim().split(/\s+/).map(token=>token.split(",").map(Number)).filter(values=>values.length>=2&&Number.isFinite(values[0])&&Number.isFinite(values[1])).map(([lng,lat])=>[lng,lat]);
  }

  function parseKml(text, sourceName="KML/KMZ") {
    const xml=new DOMParser().parseFromString(text,"application/xml");
    if (xml.querySelector("parsererror")) throw new Error("El KML no pudo interpretarse.");
    const features=[];
    [...xml.querySelectorAll("Placemark")].forEach((placemark,pIndex)=>{
      const name=placemark.querySelector(":scope > name")?.textContent?.trim() || `${sourceName} · ${pIndex+1}`;
      const base={name};
      [...placemark.querySelectorAll("Point")].forEach(node=>{
        const coords=parseCoordinates(node.querySelector("coordinates")?.textContent||"");
        if(coords[0])features.push({type:"Feature",properties:base,geometry:{type:"Point",coordinates:coords[0]}});
      });
      [...placemark.querySelectorAll("LineString")].forEach(node=>{
        const coords=parseCoordinates(node.querySelector("coordinates")?.textContent||"");
        if(coords.length>=2)features.push({type:"Feature",properties:base,geometry:{type:"LineString",coordinates:coords}});
      });
      [...placemark.querySelectorAll("Polygon")].forEach(node=>{
        const coordNode=node.querySelector("outerBoundaryIs LinearRing coordinates")||node.querySelector("LinearRing coordinates");
        const coords=parseCoordinates(coordNode?.textContent||"");
        if(coords.length>=3){if(coords[0][0]!==coords.at(-1)[0]||coords[0][1]!==coords.at(-1)[1])coords.push([...coords[0]]);features.push({type:"Feature",properties:base,geometry:{type:"Polygon",coordinates:[coords]}})}
      });
    });
    return features;
  }

  async function readKmlKmzBlob(blob,name="archivo.kmz") {
    if (/\.kmz$/i.test(name) || blob.type === "application/vnd.google-earth.kmz") {
      if (typeof JSZip === "undefined") throw new Error("No está disponible el lector KMZ.");
      const zip=await JSZip.loadAsync(await blob.arrayBuffer());
      const kmlEntry=Object.values(zip.files).find(entry=>/\.kml$/i.test(entry.name)&&!entry.dir);
      if(!kmlEntry)throw new Error("El KMZ no contiene un archivo KML.");
      return parseKml(await kmlEntry.async("text"),name);
    }
    return parseKml(await blob.text(),name);
  }

  async function loadExistingRecord(item) {
    const key=`source:${item.id}`;
    if(runtime.loadedFiles.has(key)){runtime.loadedFiles.delete(key);buildMap();renderTable();return}
    const pre=PREPROCESSED[item.id];
    try{
      let features=[];
      let label=`KML/KMZ · ${item.nombre||item.archivo||item.id}`;
      if(pre){
        const response=await fetch(pre.url);if(!response.ok)throw new Error("No se pudo cargar la capa preprocesada.");
        const geo=await response.json();features=geo.type==="FeatureCollection"?geo.features:[];label=pre.label;
      }else{
        if(!item.archivoUrl)throw new Error("El registro no tiene un archivo KML/KMZ descargable.");
        const response=await fetch(item.archivoUrl,{credentials:"omit"});if(!response.ok)throw new Error(`No se pudo descargar el archivo (${response.status}).`);
        features=await readKmlKmzBlob(await response.blob(),item.archivo||"archivo.kmz");
      }
      if(!features.length)throw new Error("El archivo no contiene puntos, líneas o polígonos utilizables.");
      runtime.loadedFiles.set(key,{features,sourceRecord:item,label});
      buildMap();renderTable();
    }catch(error){
      alert(`${error.message}\n\nSi el servidor de origen no permite lectura directa, descarga el KML/KMZ y usa “Cargar KML/KMZ”.`);
    }
  }

  async function loadLocalFile(file) {
    if(!file)return;
    try{
      const features=await readKmlKmzBlob(file,file.name);
      if(!features.length)throw new Error("El archivo no contiene geometrías utilizables.");
      const scope=currentScope();
      const sourceRecord={id:`local-${Date.now()}`,nombre:file.name,provincia:scope.province,canton:scope.canton,fuente:"Archivo cargado temporalmente",archivo:file.name,limitaciones:"Archivo temporal incorporado al alcance cartográfico actual."};
      runtime.loadedFiles.set(`local:${sourceRecord.id}`,{features,sourceRecord,label:`Archivo temporal · ${file.name}`});
      buildMap();renderTable();
    }catch(error){alert(error.message)}
  }

  function inventoryRow(item) {
    const descriptor=descriptorFromRecord(item),kind=geometryKind(item),pre=PREPROCESSED[item.id],loadable=sourceIsKmlKmz(item)&&(pre||item.archivoUrl);
    return `<tr><td><b>${esc(item.nombre||"Sin nombre")}</b><small>${esc(item.codigoCaso||item.id||"")}</small></td><td>${esc(item.canton||"—")}</td><td><span class="sr-f03-kind kind-${kind}">${esc(kindLabel(kind))}</span></td><td>${esc(item.formato||item.tipo||"—")}${sourceIsKmlKmz(item)?`<small>KML/KMZ declarado</small>`:""}</td><td>${esc(item.fuente||item.institucion||"—")}</td><td>${esc(item.archivo||"—")}</td><td>${esc(item.prioridad||"—")}</td><td><div class="sr-f03-row-actions">${descriptor.geometry?`<button type="button" data-srf03-focus-record="${esc(item.id)}">Ver geometría</button>`:""}${loadable?`<button type="button" class="secondary" data-srf03-load-record="${esc(item.id)}">${runtime.loadedFiles.has(`source:${item.id}`)?"Ocultar KML/KMZ":"Graficar KML/KMZ"}</button>`:""}${item.archivoUrl&&/^https?:/i.test(item.archivoUrl)?`<a href="${esc(item.archivoUrl)}" target="_blank" rel="noopener">Archivo ↗</a>`:""}</div></td></tr>`;
  }

  function renderTable() {
    const target=$("#srF03InventoryTable");
    if(!target)return;
    const records=filteredRecords();
    target.innerHTML=records.length?`<div class="sr-f03-table-wrap"><table><thead><tr><th>Elemento F03</th><th>GAD</th><th>Representación</th><th>Formato</th><th>Fuente</th><th>Archivo</th><th>Prioridad</th><th>Acciones</th></tr></thead><tbody>${records.map(inventoryRow).join("")}</tbody></table></div>`:`<div class="sr-f03-empty">No hay registros F03 para este filtro y alcance territorial.</div>`;
  }

  function focusRecord(id) {
    const item=scopedRows().find(row=>String(row.id)===String(id));
    if(!item)return;
    const descriptor=register(descriptorFromRecord(item));
    if(!descriptor.geometry)return;
    const layer=L.geoJSON({type:"Feature",properties:{},geometry:descriptor.geometry});
    const bounds=layer.getBounds();
    if(bounds.isValid())runtime.map?.fitBounds(bounds,{padding:[40,40],maxZoom:16});
    renderInspector(descriptor);
  }

  function panelHtml() {
    const records=scopedRows(),c=counts(records),scope=currentScope();
    return `<section id="srF03Workspace" class="sr-f03-workspace"><div class="sr-f03-head"><div><small>F03 · Mapas e información cartográfica</small><h3>Elementos cartográficos para planificación</h3><p>Alcance: <b>${esc(scopeLabel(scope))}</b>. Puntos, líneas y polígonos se dibujan cuando tienen geometría. Los KML/KMZ pueden abrirse como capas y sus elementos pueden seleccionarse para planificación.</p></div><label class="sr-f03-upload">Cargar KML/KMZ<input id="srF03File" type="file" accept=".kml,.kmz"></label></div><div class="sr-f03-kpis"><button data-srf03-view="all" class="active"><small>F03 del alcance</small><b>${records.length}</b></button><button data-srf03-view="point"><small>Puntos</small><b>${c.point}</b></button><button data-srf03-view="line"><small>Líneas</small><b>${c.line}</b></button><button data-srf03-view="polygon"><small>Polígonos</small><b>${c.polygon}</b></button><button data-srf03-view="kmz"><small>Archivos KML/KMZ</small><b>${c.kmz}</b></button><button data-srf03-view="document"><small>Sin geometría</small><b>${c.document}</b></button></div><div class="sr-f03-map-controls"><label>Fondo<select id="srF03Base"><option value="calles">Calles</option><option value="satelite">Satélite</option><option value="topo">Topográfico</option></select></label><button type="button" data-srf03-fit>Ajustar a datos</button><span>Los archivos cargados aquí son temporales hasta que se incorporen formalmente a la fuente cartográfica.</span></div><div class="sr-f03-layout"><div class="sr-f03-map-wrap"><div id="srF03GeometryMap"></div></div><aside id="srF03Inspector" class="sr-f03-inspector"><small>Cómo usar F03</small><h4>Selecciona una geometría</h4><p>Haz clic en un punto, línea o polígono para revisar fuente, archivo, prioridad, sector y limitaciones. Luego puedes añadirlo a la planificación.</p></aside></div><div id="srF03PlanningSelection" class="sr-f03-selection"></div><div class="sr-f03-inventory"><div class="sr-f03-inventory-head"><div><h4>Inventario F03 del alcance</h4><p>Incluye también documentos sin geometría para conservar la trazabilidad.</p></div></div><div id="srF03InventoryTable"></div></div></section>`;
  }

  function render() {
    clearTimeout(runtime.renderTimer);
    runtime.renderTimer=setTimeout(()=>{
      scopeApi()?.normalizeF03?.();
      const planner=$("#srCartoPlanner");
      if(!planner)return;
      let panel=$("#srF03Workspace",planner);
      if(!panel){
        panel=document.createElement("div");
        panel.innerHTML=panelHtml();
        panel=panel.firstElementChild;
        const scopeCard=$("#srCartoScopeContext",planner);
        const controls=$(".sr-carto-controls",planner);
        (scopeCard||controls)?.insertAdjacentElement("afterend",panel);
      }else{
        const head=$(".sr-f03-head p",panel),records=scopedRows(),c=counts(records);
        if(head)head.innerHTML=`Alcance: <b>${esc(scopeLabel())}</b>. Puntos, líneas y polígonos se dibujan cuando tienen geometría. Los KML/KMZ pueden abrirse como capas y sus elementos pueden seleccionarse para planificación.`;
        const buttons=$$("[data-srf03-view]",panel);buttons.forEach(btn=>{const view=btn.dataset.srf03View;const value=view==="all"?records.length:view==="kmz"?c.kmz:c[view]||0;$("b",btn).textContent=value;btn.classList.toggle("active",view===runtime.activeView)});
      }
      buildMap();renderTable();renderSelection();
    },50);
  }

  function bind() {
    document.addEventListener("click",event=>{
      const view=event.target.closest("[data-srf03-view]");
      if(view){runtime.activeView=view.dataset.srf03View;render();return}
      const select=event.target.closest("[data-srf03-select]");
      if(select){toggleSelection(select.dataset.srf03Select);return}
      const inspect=event.target.closest("[data-srf03-inspect]");
      if(inspect){const key=inspect.dataset.srf03Inspect,item=runtime.selected.get(key)||runtime.catalog.get(key);if(runtime.selected.has(key))runtime.selected.delete(key);if(item)renderInspector(item);renderSelection();return}
      const load=event.target.closest("[data-srf03-load-record]");
      if(load){const item=scopedRows().find(row=>String(row.id)===String(load.dataset.srf03LoadRecord));if(item)loadExistingRecord(item);return}
      const focus=event.target.closest("[data-srf03-focus-record]");if(focus){focusRecord(focus.dataset.srf03FocusRecord);return}
      if(event.target.closest("[data-srf03-fit]")){fitMap();return}
      if(event.target.closest("[data-srf03-zoom]")){zoomSelection();return}
      if(event.target.closest("[data-srf03-export]")){exportSelection();return}
      if(event.target.closest("[data-srf03-clear]")){runtime.selected.clear();renderSelection();return}
    });
    document.addEventListener("change",event=>{
      if(event.target.matches("#srF03Base")){replaceBase(event.target.value);return}
      if(event.target.matches("#srF03File")){loadLocalFile(event.target.files?.[0]);event.target.value="";return}
    });
    document.addEventListener("smartrisk:cartography-scope-change",()=>{
      runtime.selected.clear();
      [...runtime.loadedFiles.entries()].forEach(([key,value])=>{if(value.sourceRecord&&!inScope(value.sourceRecord))runtime.loadedFiles.delete(key)});
      render();
    });
    runtime.observer=new MutationObserver(()=>{
      const planner=$("#srCartoPlanner");
      if(planner&&planner!==runtime.lastPlanner){runtime.lastPlanner=planner;render()}
      else if(planner&&!$("#srF03Workspace",planner))render();
    });
    runtime.observer.observe(document.body,{childList:true,subtree:true});
  }

  function start(){bind();setTimeout(render,900)}
  start();
  window.SmartRiskF03Planning={VERSION,render,geometryKind,directGeometry,parseKml,readKmlKmzBlob,loadExistingRecord,scopedRows,selected:runtime.selected};
})();
