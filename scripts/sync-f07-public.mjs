import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const ASSET_UID = "aGBMqM63bGK9fLADxYfe4w";
const API_URL = `https://kf.kobotoolbox.org/api/v2/assets/${ASSET_UID}/data/?format=json&limit=30000`;
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const output = path.join(root, "f07-current-data.js");
const response = await fetch(API_URL, { headers: { Accept: "application/json" } });
if (!response.ok) throw new Error(`Kobo F07 respondió ${response.status}`);
const body = await response.json();
const forms = Array.isArray(body) ? body : (body.results || []);
const clean = value => String(value ?? "").trim();
const slug = value => clean(value).normalize("NFD").replace(/[\u0300-\u036f]/g, "").replace(/[^a-zA-Z0-9]+/g, "-").replace(/^-|-$/g, "").toUpperCase();
const label = value => clean(value).replace(/_/g, " ").toLowerCase().replace(/(^|\s)\S/g, letter => letter.toUpperCase());
const monthNumber = value => {
  const raw=clean(value).toLowerCase();
  const names={enero:1,febrero:2,marzo:3,abril:4,mayo:5,junio:6,julio:7,agosto:8,septiembre:9,setiembre:9,octubre:10,noviembre:11,diciembre:12};
  return names[raw] || Number(raw) || null;
};
const pick = (source, keys) => { for (const key of keys) { const value=source?.[key]; if (value!==undefined&&value!==null&&clean(value)!=="") return value; } return null; };
const repeatValue = (item, names) => pick(item, names.flatMap(name => [`seguimiento_mensual/${name}`, `seguimientos_mensuales/${name}`, name]));
function repeatsOf(form) {
  for (const key of ["seguimiento_mensual", "seguimientos_mensuales"]) if (Array.isArray(form[key]) && form[key].length) return form[key];
  const flattened=Object.fromEntries(Object.entries(form).filter(([key])=>key.startsWith("seguimiento_mensual/")||key.startsWith("seguimientos_mensuales/")));
  return Object.keys(flattened).length ? [flattened] : [];
}
function attachmentFor(form, filename) {
  if (!filename) return null;
  const target=clean(filename).split("/").pop();
  return (form._attachments||[]).find(file=>clean(file.media_file_basename)===target||clean(file.filename).endsWith(`/${target}`))?.download_url||null;
}
const followups=forms.flatMap(form=>{
  const province=label(pick(form,["provincia","control_caso/provincia"])),canton=label(pick(form,["canton","control_caso/canton"]));
  const level=clean(pick(form,["nivel_cobertura","control_caso/tipo_usuario"])).toLowerCase(),year0=pick(form,["anio_seguimiento"]),month0=pick(form,["mes_seguimiento"]),formUuid=pick(form,["uuid_registro","_uuid","meta/instanceID"]);
  return repeatsOf(form).map((item,index)=>{
    const actionTitle=repeatValue(item,["observacion_accion_no_encontrada","accion_o_compromiso","accion_correctiva","descripcion_accion"]),actionCode=repeatValue(item,["id_accion_ref","codigo_accion_referencia","codigo_accion"]),siteReference=repeatValue(item,["id_sitio_critico_ref","sitio_critico","sitio_referencia"]);
    const year=repeatValue(item,["anio_seguimiento"])||year0,month=monthNumber(repeatValue(item,["mes_seguimiento"])||month0),evidenceFile=repeatValue(item,["medio_verificacion_mensual","medio_verificacion"]),evidenceUrl=attachmentFor(form,evidenceFile);
    const actionMissing=!actionCode||/NO_ENCONTRAD|SIN.CODIGO/i.test(clean(actionCode)),siteMissing=!siteReference||/NO_ENCONTRAD|SIN.SITIO/i.test(clean(siteReference));
    return {followupId:clean(repeatValue(item,["id_seguimiento_preliminar","id_seguimiento_registro"]))||`${formUuid}|F07-${index+1}`,formId:String(form._id||formUuid),entityId:province&&canton?`TER-${slug(province)}-${slug(canton)}`:null,province:province||null,canton:canton||null,level:canton?"Cantonal":level.includes("prov")?"Provincial":"Zonal",period:year&&month?`${year}-${String(month).padStart(2,"0")}`:null,sourceFormat:"F07 Kobo · API pública",sourceType:"Sincronización automática",actionCode:clean(actionCode)||null,actionTitle:clean(actionTitle)||"Acción sin descripción homologada",actionLinkState:actionMissing?"Pendiente de homologación":"Vinculada",siteReference:clean(siteReference)||null,siteLinkState:siteMissing?"Pendiente de vinculación":"Vinculado",criterion:clean(repeatValue(item,["criterio_asociado"]))||null,status:clean(repeatValue(item,["estado_seguimiento","estado_actual"]))||"Sin estado",declaredProgress:Number(repeatValue(item,["avance_mensual_pct","avance_porcentaje"]))||0,progressDescription:clean(repeatValue(item,["descripcion_avance","avance_descriptivo"]))||null,criticalGap:clean(repeatValue(item,["nudo_critico_brecha","nudos_criticos"]))||null,nextStep:clean(repeatValue(item,["siguiente_paso","accion_correctiva"]))||null,responsible:clean(repeatValue(item,["responsable_seguimiento"]))||clean(pick(form,["nombre_contacto"]))||null,nextReportDate:clean(repeatValue(item,["fecha_compromiso","fecha_proximo_reporte"]))||null,evidenceDescription:clean(evidenceFile)||null,evidenceFile:clean(evidenceFile)||null,evidenceUrl,evidenceState:evidenceUrl?"Adjunto disponible":evidenceFile?"Declarada sin adjunto accesible":"Sin evidencia",requiresEscalation:/^(si|yes|true|1)$/i.test(clean(repeatValue(item,["requiere_escalamiento"]))),observations:clean(repeatValue(item,["observaciones"]))||null,qualityScore:Number(repeatValue(item,["calidad_f07_pct"]))||null,qualityState:clean(repeatValue(item,["estado_calidad_f07"]))||null,submissionUuid:clean(form._uuid||formUuid),submissionTime:form._submission_time||null,eligibleTerritorial:Boolean(province&&canton)};
  });
});
const submissionTimes=forms.map(form=>form._submission_time).filter(Boolean).sort();
const current={config:{version:"f07-public-v1",assetUid:ASSET_UID,source:API_URL,syncedAt:new Date().toISOString(),latestSubmissionAt:submissionTimes.at(-1)||null,mode:"Kobo API pública · copia verificable del repositorio"},summary:{forms:forms.length,followups:followups.length,linkedActions:followups.filter(item=>item.actionLinkState==="Vinculada").length,linkedSites:followups.filter(item=>item.siteLinkState==="Vinculado").length,evidenceAttached:followups.filter(item=>item.evidenceUrl).length},followups};
fs.writeFileSync(output,`(() => {\n  "use strict";\n  window.SMART_RISK_F07_CURRENT = Object.freeze(${JSON.stringify(current)});\n})();\n`);
console.log(JSON.stringify(current.summary));
