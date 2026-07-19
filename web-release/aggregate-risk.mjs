import fs from "node:fs";

const [input, output, province] = process.argv.slice(2);
const source = JSON.parse(fs.readFileSync(input, "utf8"));
const rank = { SIN: 0, BAJA: 1, MEDIA: 2, ALTA: 3, "MUY ALTA": 4 };
const cells = new Map();

for (const feature of source.features || []) {
  const points = feature.geometry?.type === "MultiPoint"
    ? feature.geometry.coordinates
    : feature.geometry?.type === "Point" ? [feature.geometry.coordinates] : [];
  for (const point of points) {
    if (!Number.isFinite(point?.[0]) || !Number.isFinite(point?.[1])) continue;
    const x = Math.round(point[0] * 100) / 100;
    const y = Math.round(point[1] * 100) / 100;
    const key = `${x}|${y}`;
    const props = feature.properties || {};
    const current = cells.get(key) || {
      x: 0, y: 0, count: 0, province,
      cantons: new Set(), places: new Set(), flood: "SIN", drought: "SIN", fire: "SIN"
    };
    current.x += point[0];
    current.y += point[1];
    current.count++;
    const canton = props.DPA_DESC_1 || props.DPA_DESCAN || props.dpa_descan;
    const place = props.n_loc || props.nom_edif;
    if (canton) current.cantons.add(String(canton));
    if (place && current.places.size < 8) current.places.add(String(place));
    for (const [target, value] of [["flood", props.sui], ["drought", props.susc_sequi], ["fire", props.Sus_Inc_fo]]) {
      const normalized = String(value || "SIN").toUpperCase();
      if ((rank[normalized] ?? 0) > (rank[current[target]] ?? 0)) current[target] = normalized;
    }
    cells.set(key, current);
  }
}

const features = [...cells.values()].map(cell => ({
  type: "Feature",
  properties: {
    provincia: cell.province,
    cantones: [...cell.cantons].join(", "),
    lugares_muestra: [...cell.places].join(", "),
    elementos: cell.count,
    susceptibilidad_inundacion: cell.flood,
    susceptibilidad_sequia: cell.drought,
    susceptibilidad_incendio: cell.fire,
    uso: "Tamizaje territorial agregado; requiere validación técnica"
  },
  geometry: { type: "Point", coordinates: [cell.x / cell.count, cell.y / cell.count] }
}));

fs.writeFileSync(output, JSON.stringify({ type: "FeatureCollection", features }));
console.log(JSON.stringify({ input: source.features?.length || 0, output: features.length }));
