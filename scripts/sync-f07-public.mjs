import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ASSET_UID = "aGBMqM63bGK9fLADxYfe4w";
const API_URL = `https://kf.kobotoolbox.org/api/v2/assets/${ASSET_UID}/data/?format=json&limit=30000`;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "f07-current-data.js");
const manifestPath = path.join(root, "RELEASE_MANIFEST.json");
const releaseConfigPath = path.join(root, "release-config.js");

const clean = value => String(value ?? "").trim();
const slug = value => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toUpperCase();
const label = value => clean(value).replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase());
const monthNumber = value => {
  const raw = clean(value).toLowerCase();
  const names = { enero:1, febrero:2, marzo:3, abril:4, mayo:5, junio:6, julio:7, agosto:8, septiembre:9, setiembre:9, octubre:10, noviembre:11, diciembre:12 };
  return names[raw] || Number(raw) || null;
};
const pick = (source, keys) => {
  for (const key of keys) {
    const value = source?.[key];
    if (value !== undefined && value !== null && clean(value) !== "") return value;
  }
  return null;
};
const repeatValue = (item, names) => pick(item, names.flatMap(name => [`seguimiento_mensual/${name}`, `seguimientos_mensuales/${name}`, name]));

function repeatsOf(form) {
  for (const key of ["seguimiento_mensual", "seguimientos_mensuales"]) {
    if (Array.isArray(form[key]) && form[key].length) return form[key];
  }
  const flattened = Object.fromEntries(Object.entries(form).filter(([key]) => key.startsWith("seguimiento_mensual/") || key.startsWith("seguimientos_mensuales/")));
  return Object.keys(flattened).length ? [flattened] : [];
}

function attachmentFor(form, filename) {
  if (!filename) return null;
  const target = clean(filename).split("/").pop();
  return (form._attachments || []).find(file => clean(file.media_file_basename) === target || clean(file.filename).endsWith(`/${target}`))?.download_url || null;
}

function readPublishedF07() {
  if (!fs.existsSync(output)) return null;
  const text = fs.readFileSync(output, "utf8");
  const marker = "Object.freeze(";
  const start = text.indexOf(marker);
  const end = text.lastIndexOf(");");
  if (start < 0 || end < 0 || end <= start) return null;
  try {
    return JSON.parse(text.slice(start + marker.length, end));
  } catch {
    return null;
  }
}

function canonicalSnapshot(value) {
  const followups = [...(value?.followups || [])].sort((a, b) => {
    const left = `${a.followupId || ""}|${a.formId || ""}|${a.period || ""}|${a.actionCode || ""}`;
    const right = `${b.followupId || ""}|${b.formId || ""}|${b.period || ""}|${b.actionCode || ""}`;
    return left.localeCompare(right);
  });
  return JSON.stringify({
    latestSubmissionAt: value?.config?.latestSubmissionAt || null,
    summary: value?.summary || {},
    followups
  });
}

function writeIfChanged(file, content) {
  const previous = fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
  if (previous === content) return false;
  fs.writeFileSync(file, content);
  return true;
}

function updateReleaseMetadata(current) {
  if (!fs.existsSync(manifestPath)) throw new Error("Falta RELEASE_MANIFEST.json; no se puede sincronizar F07 sin metadatos de release.");
  const manifest = JSON.parse(fs.readFileSync(manifestPath, "utf8"));
  const syncedAt = current.config.syncedAt;
  const latestSubmissionAt = current.config.latestSubmissionAt;
  const f07Cut = latestSubmissionAt?.slice(0, 10) || syncedAt.slice(0, 10);
  const existingCut = clean(manifest.dataCut);
  const platformCut = [existingCut, f07Cut].filter(Boolean).sort().at(-1) || f07Cut;

  manifest.dataCut = platformCut;
  manifest.f07SyncedAt = syncedAt;
  manifest.latestF07SubmissionAt = latestSubmissionAt;
  manifest.counts = { ...(manifest.counts || {}), followupsMinimum: Number(current.summary.followups || 0) };

  const koboSource = (manifest.sources || []).find(source => /Kobo F07 ENOS CZ5/i.test(String(source?.name || "")));
  if (!koboSource) throw new Error("RELEASE_MANIFEST.json no contiene la fuente Kobo F07 ENOS CZ5.");
  Object.assign(koboSource, {
    cut: f07Cut,
    syncedAt,
    latestSubmissionAt,
    followups: Number(current.summary.followups || 0)
  });

  const manifestChanged = writeIfChanged(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
  const auditMilestone = clean(manifest.auditMilestone?.id);
  const releaseConfig = `(() => {\n  "use strict";\n\n  window.SMART_RISK_RELEASE = Object.freeze({\n    product: ${JSON.stringify(manifest.product || "SmartRisk CZ5")},\n    release: ${JSON.stringify(manifest.release || "V1.0.0 PILOTO ESTABLE")},\n    build: ${JSON.stringify(manifest.build || "1.0.0-piloto-estable")},\n    tag: ${JSON.stringify(manifest.tag || "v1.0.0-piloto-estable")},\n    dataCut: ${JSON.stringify(platformCut)},\n    platformUpdatedAt: ${JSON.stringify(platformCut)},\n    f07SyncedAt: ${JSON.stringify(syncedAt)},\n    f07LatestSubmissionAt: ${JSON.stringify(latestSubmissionAt)},\n    auditMilestone: ${JSON.stringify(auditMilestone || null)},\n    channel: "production"\n  });\n})();\n`;
  const releaseConfigChanged = writeIfChanged(releaseConfigPath, releaseConfig);
  return { manifestChanged, releaseConfigChanged, f07Cut, platformCut };
}

const response = await fetch(API_URL, { headers: { Accept: "application/json" } });
if (!response.ok) throw new Error(`Kobo F07 respondió ${response.status}`);
const body = await response.json();
const forms = Array.isArray(body) ? body : (body.results || []);

const followups = forms.flatMap(form => {
  const province = label(pick(form, ["provincia", "control_caso/provincia"]));
  const canton = label(pick(form, ["canton", "control_caso/canton"]));
  const level = clean(pick(form, ["nivel_cobertura", "control_caso/tipo_usuario"])).toLowerCase();
  const year0 = pick(form, ["anio_seguimiento"]);
  const month0 = pick(form, ["mes_seguimiento"]);
  const formUuid = pick(form, ["uuid_registro", "_uuid", "meta/instanceID"]);
  return repeatsOf(form).map((item, index) => {
    const actionTitle = repeatValue(item, ["observacion_accion_no_encontrada", "accion_o_compromiso", "accion_correctiva", "descripcion_accion"]);
    const actionCode = repeatValue(item, ["id_accion_ref", "codigo_accion_referencia", "codigo_accion"]);
    const siteReference = repeatValue(item, ["id_sitio_critico_ref", "sitio_critico", "sitio_referencia"]);
    const year = repeatValue(item, ["anio_seguimiento"]) || year0;
    const month = monthNumber(repeatValue(item, ["mes_seguimiento"]) || month0);
    const evidenceFile = repeatValue(item, ["medio_verificacion_mensual", "medio_verificacion"]);
    const evidenceUrl = attachmentFor(form, evidenceFile);
    const actionMissing = !actionCode || /NO_ENCONTRAD|SIN.CODIGO/i.test(clean(actionCode));
    const siteMissing = !siteReference || /NO_ENCONTRAD|SIN.SITIO/i.test(clean(siteReference));
    return {
      followupId: clean(repeatValue(item, ["id_seguimiento_preliminar", "id_seguimiento_registro"])) || `${formUuid}|F07-${index + 1}`,
      formId: String(form._id || formUuid),
      entityId: province && canton ? `TER-${slug(province)}-${slug(canton)}` : null,
      province: province || null,
      canton: canton || null,
      level: canton ? "Cantonal" : level.includes("prov") ? "Provincial" : "Zonal",
      period: year && month ? `${year}-${String(month).padStart(2, "0")}` : null,
      sourceFormat: "F07 Kobo · API pública",
      sourceType: "Sincronización automática",
      actionCode: clean(actionCode) || null,
      actionTitle: clean(actionTitle) || "Acción sin descripción homologada",
      actionLinkState: actionMissing ? "Pendiente de homologación" : "Vinculada",
      siteReference: clean(siteReference) || null,
      siteLinkState: siteMissing ? "Pendiente de vinculación" : "Vinculado",
      criterion: clean(repeatValue(item, ["criterio_asociado"])) || null,
      status: clean(repeatValue(item, ["estado_seguimiento", "estado_actual"])) || "Sin estado",
      declaredProgress: Number(repeatValue(item, ["avance_mensual_pct", "avance_porcentaje"])) || 0,
      progressDescription: clean(repeatValue(item, ["descripcion_avance", "avance_descriptivo"])) || null,
      criticalGap: clean(repeatValue(item, ["nudo_critico_brecha", "nudos_criticos"])) || null,
      nextStep: clean(repeatValue(item, ["siguiente_paso", "accion_correctiva"])) || null,
      responsible: clean(repeatValue(item, ["responsable_seguimiento"])) || clean(pick(form, ["nombre_contacto"])) || null,
      nextReportDate: clean(repeatValue(item, ["fecha_compromiso", "fecha_proximo_reporte"])) || null,
      evidenceDescription: clean(evidenceFile) || null,
      evidenceFile: clean(evidenceFile) || null,
      evidenceUrl,
      evidenceState: evidenceUrl ? "Adjunto disponible" : evidenceFile ? "Declarada sin adjunto accesible" : "Sin evidencia",
      requiresEscalation: /^(si|yes|true|1)$/i.test(clean(repeatValue(item, ["requiere_escalamiento"]))),
      observations: clean(repeatValue(item, ["observaciones"])) || null,
      qualityScore: Number(repeatValue(item, ["calidad_f07_pct"])) || null,
      qualityState: clean(repeatValue(item, ["estado_calidad_f07"])) || null,
      submissionUuid: clean(form._uuid || formUuid),
      submissionTime: form._submission_time || null,
      eligibleTerritorial: Boolean(province && canton)
    };
  });
});

const submissionTimes = forms.map(form => form._submission_time).filter(Boolean).sort();
const previous = readPublishedF07();
const candidateBase = {
  config: {
    version: "f07-public-v1",
    assetUid: ASSET_UID,
    source: API_URL,
    latestSubmissionAt: submissionTimes.at(-1) || null,
    mode: "Kobo API pública · copia verificable del repositorio"
  },
  summary: {
    forms: forms.length,
    followups: followups.length,
    linkedActions: followups.filter(item => item.actionLinkState === "Vinculada").length,
    linkedSites: followups.filter(item => item.siteLinkState === "Vinculado").length,
    evidenceAttached: followups.filter(item => item.evidenceUrl).length
  },
  followups
};

const sourceChanged = !previous || canonicalSnapshot(candidateBase) !== canonicalSnapshot(previous);
const syncedAt = sourceChanged ? new Date().toISOString() : (previous?.config?.syncedAt || new Date().toISOString());
const current = sourceChanged ? {
  ...candidateBase,
  config: { ...candidateBase.config, syncedAt }
} : previous;

let f07Changed = false;
if (sourceChanged || !fs.existsSync(output)) {
  f07Changed = writeIfChanged(output, `(() => {\n  "use strict";\n  window.SMART_RISK_F07_CURRENT = Object.freeze(${JSON.stringify(current)});\n})();\n`);
}
const metadata = updateReleaseMetadata(current);

console.log(JSON.stringify({
  ...current.summary,
  sourceChanged,
  f07Changed,
  manifestChanged: metadata.manifestChanged,
  releaseConfigChanged: metadata.releaseConfigChanged,
  syncedAt: current.config.syncedAt,
  latestSubmissionAt: current.config.latestSubmissionAt,
  f07Cut: metadata.f07Cut,
  platformCut: metadata.platformCut
}));
