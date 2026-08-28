import fs from "node:fs";
import path from "node:path";
import vm from "node:vm";

const dist = path.resolve(process.argv[2] || "dist");
const read = file => fs.readFileSync(path.join(dist, file), "utf8");
const rootRead = file => fs.readFileSync(path.resolve(file), "utf8");
const expect = (condition, message) => {
  if (!condition) throw new Error(`HITO 2026-08-27: ${message}`);
};

// 1) Universo rector: 56 expedientes canónicos, sin huecos ni duplicados.
const masterSandbox = { window: {}, Object };
vm.runInNewContext(read("enos-gad-review-context.js"), masterSandbox, { filename: "enos-gad-review-context.js" });
const ctx = masterSandbox.window.SMART_RISK_GAD_REVIEW_CONTEXT;
expect(Boolean(ctx), "no se publicó el contexto maestro de GAD");
expect(ctx.rows.length === 56, `el universo rector debe ser 56 y es ${ctx.rows.length}`);
const ids = ctx.rows.map(row => Number(row.n)).sort((a, b) => a - b);
expect(ids.every((id, index) => id === index + 1), "la numeración canónica 1–56 tiene huecos o duplicados");
const distribution = {
  Guayas: ctx.scope("Guayas", "").length,
  "Los Ríos": ctx.scope("Los Ríos", "").length,
  "Bolívar": ctx.scope("Bolívar", "").length,
  "Santa Elena": ctx.scope("Santa Elena", "").length,
  "Galápagos": ctx.scope("Galápagos", "").length
};
expect(JSON.stringify(distribution) === JSON.stringify({ Guayas: 26, "Los Ríos": 14, "Bolívar": 8, "Santa Elena": 4, "Galápagos": 4 }), `distribución territorial inesperada: ${JSON.stringify(distribution)}`);
expect(Object.values(distribution).reduce((sum, value) => sum + value, 0) === 56, "la distribución provincial no suma 56");

// 2) Cargar el motor de estado documental sin arrancar la interfaz.
const entities = {
  monitoringReports: [], validations: [], coeSessions: [], institutions: [],
  decisions: [], breaches: [], actions: []
};
const auditSandbox = {
  window: {
    SMART_RISK_GAD_REVIEW_CONTEXT: ctx,
    SmartRiskV11App: { state: { filters: { provincia: "", canton: "" }, data: { entities } } },
    SmartRiskDeviceMode: { isSmart: () => false },
    addEventListener: () => {}
  },
  document: {
    readyState: "loading",
    addEventListener: () => {},
    documentElement: { dataset: {} },
    body: { classList: { toggle: () => {} } },
    querySelector: () => null
  },
  location: { hash: "" },
  MutationObserver: class { observe() {} },
  requestAnimationFrame: callback => callback(),
  setTimeout: () => 0,
  console,
  Object,
  Set,
  Array,
  String,
  Number,
  Boolean,
  Math,
  JSON,
  RegExp
};
vm.runInNewContext(read("desktop-home-audit-context.js"), auditSandbox, { filename: "desktop-home-audit-context.js" });
const audit = auditSandbox.window.SmartRiskDesktopHomeAuditContext;
expect(Boolean(audit?.stageData), "el motor documental no expone stageData para validación reproducible");
const allDocs = ctx.scope("", "");
expect(allDocs.length === 56, "scope global del maestro no devuelve 56 expedientes");

// 3) Caso adversarial que reproduce conceptualmente el error 58/56.
entities.validations = ctx.rows.map(doc => ({
  id: `val-${doc.n}`,
  province: doc.province,
  canton: doc.canton,
  title: doc.canton ? "Validación técnica" : `Validación técnica ${doc.gad}`
}));
entities.validations.push(
  { ...entities.validations[0], id: "duplicado-a" },
  { ...entities.validations[0], id: "duplicado-b" }
);
let stat = audit.stageData("validacion", allDocs);
expect(stat.records === 58, `el escenario de estrés debe contener 58 registros y contiene ${stat.records}`);
expect(stat.mappedRecords === 58, `los 58 registros del escenario deben ser atribuibles y se atribuyeron ${stat.mappedRecords}`);
expect(stat.gadIds.size === 56, `58 registros jamás pueden producir cobertura ${stat.gadIds.size}/56`);
expect(stat.unassigned === 0, "el escenario base no debe generar registros sin atribución");

// 4) Un registro fantasma se conserva, pero nunca incrementa cobertura.
entities.validations.push({ id: "fantasma", province: "Guayas", canton: "Cantón inexistente", title: "Validación técnica" });
stat = audit.stageData("validacion", allDocs);
expect(stat.records === 59, "el registro fantasma debe permanecer visible en el universo de registros");
expect(stat.gadIds.size === 56, "un cantón inexistente incrementó indebidamente la cobertura canónica");
expect(stat.unassigned === 1, `el registro fantasma debe quedar sin atribución y se obtuvieron ${stat.unassigned}`);

// 5) Los alias resuelven al mismo GAD canónico.
const guayasDocs = ctx.scope("Guayas", "");
const jujan = ctx.find("Guayas", "Alfredo Baquerizo Moreno");
expect(Boolean(jujan), "no se encontró el GAD canónico de Alfredo Baquerizo Moreno");
entities.validations = [{ id: "alias-jujan", province: "Guayas", canton: "Jujan", title: "Validación técnica" }];
stat = audit.stageData("validacion", guayasDocs);
expect(stat.gadIds.size === 1 && stat.gadIds.has(Number(jujan.n)), "Jujan no resolvió al identificador canónico de Alfredo Baquerizo Moreno");

// 6) Provincia sin cantón no equivale automáticamente a Prefectura.
entities.validations = [{ id: "provincia-generica", province: "Guayas", title: "Validación técnica general" }];
stat = audit.stageData("validacion", guayasDocs);
expect(stat.records === 1 && stat.gadIds.size === 0 && stat.unassigned === 1, "un registro provincial genérico fue atribuido automáticamente a la Prefectura");
entities.validations = [{ id: "provincia-explicita", province: "Guayas", title: "Validación técnica Prefectura del Guayas" }];
stat = audit.stageData("validacion", guayasDocs);
expect(stat.gadIds.size === 1 && stat.gadIds.has(13), "una referencia explícita a la Prefectura del Guayas no resolvió al expediente 13");

// 7) Las colecciones no funcionan como proxies semánticos automáticos.
entities.institutions = [{ id: "institucion-simple", province: "Guayas", canton: "Guayaquil", title: "Ministerio de Salud" }];
expect(audit.stageData("coordinacion", guayasDocs).records === 0, "la mera existencia de una institución fue contada como coordinación");
entities.institutions = [{ id: "coordinacion-explicita", province: "Guayas", canton: "Guayaquil", title: "Reunión de coordinación interinstitucional" }];
stat = audit.stageData("coordinacion", guayasDocs);
expect(stat.records === 1 && stat.gadIds.size === 1, "una coordinación explícita no fue reconocida");

entities.breaches = [{ id: "brecha-simple", province: "Guayas", canton: "Guayaquil", title: "Falta presupuesto" }];
expect(audit.stageData("escalamiento", guayasDocs).records === 0, "la mera existencia de una brecha fue contada como escalamiento");
entities.breaches = [{ id: "escalamiento-explicito", province: "Guayas", canton: "Guayaquil", title: "Se requiere elevar a Prefectura por falta de recursos" }];
stat = audit.stageData("escalamiento", guayasDocs);
expect(stat.records === 1 && stat.gadIds.size === 1, "un escalamiento explícito no fue reconocido");

entities.actions = [{ id: "cierre-explicito", province: "Guayas", canton: "Guayaquil", title: "Acción finalizada y cierre técnico" }];
stat = audit.stageData("mitigacion", guayasDocs);
expect(stat.records === 1 && stat.gadIds.size === 1, "un cierre/mitigación explícito no fue reconocido");

// 8) La interfaz conserva las advertencias metodológicas esenciales.
const auditSource = read("desktop-home-audit-context.js");
expect(!auditSource.includes("rawStageCount"), "regresó el conteo bruto de registros como base de cobertura");
expect(auditSource.includes("identificadores canónicos"), "la interfaz perdió la explicación de identificadores canónicos");
expect(auditSource.includes("No representa avance del Plan ni cumplimiento del GAD"), "la interfaz perdió la separación entre estado documental y cumplimiento");

// 9) El metadato de release debe coincidir con el activo F07 que realmente se publica.
const f07Text = read("f07-current-data.js");
const syncedAt = f07Text.match(/"syncedAt":"([^"]+)"/)?.[1];
const latestSubmissionAt = f07Text.match(/"latestSubmissionAt":"([^"]+)"/)?.[1];
const followups = Number(f07Text.match(/"summary":\{[^}]*"followups":(\d+)/)?.[1]);
expect(Boolean(syncedAt && latestSubmissionAt && Number.isFinite(followups)), "no se pudieron leer metadatos del activo F07 vigente");
const manifest = JSON.parse(rootRead("RELEASE_MANIFEST.json"));
const releaseConfig = rootRead("release-config.js");
expect(manifest.f07SyncedAt === syncedAt, `manifiesto F07 syncedAt ${manifest.f07SyncedAt} != activo ${syncedAt}`);
expect(manifest.latestF07SubmissionAt === latestSubmissionAt, `manifiesto latestSubmissionAt ${manifest.latestF07SubmissionAt} != activo ${latestSubmissionAt}`);
expect(Number(manifest.counts.followupsMinimum) === followups, `manifiesto followups ${manifest.counts.followupsMinimum} != activo ${followups}`);
expect(releaseConfig.includes(syncedAt) && releaseConfig.includes(latestSubmissionAt), "release-config no refleja el corte F07 publicado");
expect(Number(manifest.auditMilestone?.canonicalUniverse) === 56, "el manifiesto no registra el universo canónico del hito");
expect(manifest.auditMilestone?.id === "HITO-2026-08-27-AUDITORIA-INTEGRAL", "el manifiesto no registra el hito vigente");

// 10) Seguridad, bitácora y caché forman parte del cierre, no solo la presentación.
const rules = rootRead("firestore.rules");
expect(rules.includes("match /cambios/{changeId}") && rules.includes("allow update, delete: if false;"), "la bitácora segmentada dejó de ser append-only");
expect(/match \/plataforma\/datos[\s\S]*?allow create, update: if admin\(\);/.test(rules), "la escritura del documento global dejó de estar restringida a administrador");
const firebase = JSON.parse(rootRead("firebase.json"));
const noCacheSources = new Set(firebase.hosting.headers.filter(row => row.headers?.some(header => /no-cache/.test(header.value || ""))).map(row => row.source));
for (const source of ["/release-config.js", "/desktop-bootstrap.js", "/desktop-home-audit-context.js", "/enos-gad-review-context.js", "/f07-current-data.js"]) {
  expect(noCacheSources.has(source), `falta no-cache en activo crítico ${source}`);
}

// 11) El hito debe dejar documentación reproducible y preservar la línea base histórica.
for (const file of [
  ".github/docs/BASE_METODOLOGICA_HITOS.md",
  ".github/docs/HITO_2026-08-27_AUDITORIA_INTEGRAL.md",
  "AUDITORIA_50_CORRIDAS.md"
]) expect(fs.existsSync(path.resolve(file)), `falta evidencia documental ${file}`);

console.log("PASS HITO-2026-08-27: universo 56 protegido, 58 registros permanecen 56 GAD, atribución/semántica/corte/seguridad/caché verificados");
