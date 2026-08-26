(() => {
  "use strict";

  const VERSION = "2026.08.26.2";
  const SITE_PATH = /sitio\s*critico|punto\s*critico|sector\s*critico/i;
  const SITE_LANGUAGE = /\b(punto\s+critico|sitio\s+critico|sector|recinto|rcto\.?|barrio|ciudadela|cdla\.?|parroquia|rio|estero|quebrada|canal|alcantarill|puente|mercado|cauce|talud|deslizamiento|socav|desbord|inundacion)\b/i;
  const NON_SITE_REFERENCE = /^(no[_\s-]*encontrad[oa]|sin[_\s-]*sitio|ningun[oa]?|ninguno|n\/a|na|null|undefined)$/i;
  let scheduled = false;
  let observer = null;

  const norm = value => String(value || "")
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, " ")
    .trim()
    .toLowerCase();

  function isDesktop() {
    if (window.SmartRiskDeviceMode?.isSmart) return window.SmartRiskDeviceMode.isSmart() !== true;
    return document.documentElement.dataset.smartRiskDevice !== "smart";
  }

  function currentRoute() {
    const hash = String(location.hash || "").replace(/^#\/?/, "").split(/[?&]/)[0];
    return hash || String(window.SmartRiskV11App?.state?.route || "inicio");
  }

  function appState() { return window.SmartRiskV11App?.state || {}; }
  function entity(name) { return appState().data?.entities?.[name] || []; }

  function scopeOf(item) {
    return {
      province: item?.provincia ?? item?.province ?? item?.payload?.provincia ?? item?.payload?.province ?? "",
      canton: item?.canton ?? item?.payload?.canton ?? "",
      level: item?.level ?? item?.nivel ?? item?.payload?.level ?? item?.payload?.nivel ?? ""
    };
  }

  function isProvincialOrCantonal(item) {
    const scope = scopeOf(item);
    const level = norm(scope.level);
    if (level && /zonal|nacional|institucional|regimen especial/.test(level)) return false;
    return Boolean(scope.province);
  }

  function matchesCurrentScope(item) {
    if (!isProvincialOrCantonal(item)) return false;
    const filters = appState().filters || {};
    const scope = scopeOf(item);
    if (filters.provincia && norm(scope.province) !== norm(filters.provincia)) return false;
    if (filters.canton && norm(scope.canton) !== norm(filters.canton)) return false;
    return true;
  }

  function cleanSiteReference(value) {
    const text = String(value || "").trim();
    if (!text || NON_SITE_REFERENCE.test(norm(text).replace(/ /g, "_"))) return "";
    return text;
  }

  function siteLabelFromRecord(item) {
    const payload = item?.payload || {};
    return String(
      payload.ubicacion || payload.ubicación || payload.sitio || payload.sector || payload.nombre || payload.titulo ||
      item?.title || item?.sourceId || item?.id || "Sitio reportado"
    ).trim();
  }

  function looksLikeF07Site(item) {
    const title = String(item?.actionTitle || "").trim();
    const gap = String(item?.criticalGap || "").trim();
    const progress = String(item?.progressDescription || "").trim();
    if (!title || /^(ninguno|ninguna|sin novedad|accion sin descripcion homologada)$/i.test(title)) return false;
    const text = norm(`${title} ${gap} ${progress}`);
    if (/punto critico|sitio critico/.test(text)) return true;
    const criterion = norm(item?.criterion);
    return ["c2", "c4", "c9"].includes(criterion) && SITE_LANGUAGE.test(text);
  }

  function f07CandidateLabel(item) {
    const linked = cleanSiteReference(item?.siteReference);
    if (linked) return linked;
    const title = String(item?.actionTitle || "").trim();
    const gap = String(item?.criticalGap || "").trim();
    if (title && title.length <= 180) return title;
    if (gap && gap.length <= 180) return gap;
    return title || gap || "Referencia territorial F07";
  }

  function candidateIdentity(candidate) {
    return { location: `${norm(candidate.province)}|${norm(candidate.canton)}`, label: norm(candidate.label) };
  }

  function labelsOverlap(left, right) {
    if (!left || !right) return false;
    if (left === right) return true;
    const shorter = left.length <= right.length ? left : right;
    const longer = left.length > right.length ? left : right;
    if (shorter.length >= 8 && longer.includes(shorter)) return true;
    const stop = new Set(["de", "del", "la", "las", "el", "los", "en", "y", "con", "para", "por", "un", "una", "rio", "sector", "recinto", "rcto", "punto", "critico"]);
    const a = new Set(left.split(" ").filter(token => token.length >= 4 && !stop.has(token)));
    const b = new Set(right.split(" ").filter(token => token.length >= 4 && !stop.has(token)));
    if (!a.size || !b.size) return false;
    let shared = 0;
    a.forEach(token => { if (b.has(token)) shared += 1; });
    return shared >= 2 && shared / Math.min(a.size, b.size) >= 0.65;
  }

  function addCandidate(list, candidate) {
    const incoming = candidateIdentity(candidate);
    if (!incoming.label) return;
    const found = list.find(existing => {
      const current = candidateIdentity(existing);
      return current.location === incoming.location && labelsOverlap(current.label, incoming.label);
    });
    if (!found) {
      list.push(candidate);
      return;
    }
    if (found.status === "pending" && candidate.status !== "pending") {
      found.status = candidate.status;
      found.source = candidate.source;
      found.label = candidate.label;
    }
  }

  function consolidatedSiteMetrics() {
    const candidates = [];
    entity("criticalSites").filter(matchesCurrentScope).forEach(item => {
      const scope = scopeOf(item);
      addCandidate(candidates, { province: scope.province, canton: scope.canton, label: siteLabelFromRecord(item), status: "consolidated", source: "SmartRisk" });
    });
    entity("risks").filter(matchesCurrentScope).filter(item => {
      const sourcePath = item?.sourcePath || item?.payload?.sourcePath || "";
      return SITE_PATH.test(norm(sourcePath));
    }).forEach(item => {
      const scope = scopeOf(item);
      addCandidate(candidates, { province: scope.province, canton: scope.canton, label: siteLabelFromRecord(item), status: "consolidated", source: "Plan" });
    });
    const followups = Array.isArray(window.SMART_RISK_F07_CURRENT?.followups) ? window.SMART_RISK_F07_CURRENT.followups : [];
    followups.filter(matchesCurrentScope).forEach(item => {
      const linkedReference = cleanSiteReference(item?.siteReference);
      if (!linkedReference && !looksLikeF07Site(item)) return;
      const scope = scopeOf(item);
      addCandidate(candidates, {
        province: scope.province,
        canton: scope.canton,
        label: f07CandidateLabel(item),
        status: linkedReference ? "linked" : "pending",
        source: linkedReference ? "F07 vinculado" : "F07 por homologar"
      });
    });
    return {
      consolidated: candidates.filter(item => item.status !== "pending").length,
      pendingReferences: candidates.filter(item => item.status === "pending").length
    };
  }

  function f07Metrics() {
    const followups = Array.isArray(window.SMART_RISK_F07_CURRENT?.followups) ? window.SMART_RISK_F07_CURRENT.followups.filter(matchesCurrentScope) : [];
    return {
      followups: followups.length,
      linkedActions: followups.filter(item => item.actionLinkState === "Vinculada").length,
      linkedSites: followups.filter(item => item.siteLinkState === "Vinculado").length,
      evidenceAttached: followups.filter(item => Boolean(item.evidenceUrl)).length
    };
  }

  function correctScopeSelectors(content) {
    const level = content.querySelector("#v1Level");
    const province = content.querySelector("#v1Province");
    const canton = content.querySelector("#v1Canton");
    if (!level || !province || !canton) return;

    if (level.value === "zona") {
      if (province.options.length !== 1 || province.options[0]?.value !== "") province.innerHTML = '<option value="">Todas las provincias</option>';
      if (canton.options.length !== 1 || canton.options[0]?.value !== "") canton.innerHTML = '<option value="">Todos los cantones</option>';
      province.disabled = true;
      canton.disabled = true;
    } else if (level.value === "provincia") {
      if (canton.options.length !== 1 || canton.options[0]?.value !== "") canton.innerHTML = '<option value="">Todos los cantones</option>';
      province.disabled = false;
      canton.disabled = true;
    } else {
      province.disabled = false;
      canton.disabled = false;
    }
  }

  function updateQuestion(content) {
    const lead = content.querySelector(".v1-ref-risk-lead");
    if (!lead) return;
    const eyebrow = lead.querySelector(".v1-eyebrow");
    const title = lead.querySelector("h3");
    const detail = lead.querySelector("p");
    if (eyebrow && eyebrow.textContent !== "Pregunta ejecutiva") eyebrow.textContent = "Pregunta ejecutiva";
    const question = "De los sitios reportados, ¿cuáles tienen una acción verificable y cuáles siguen pendientes?";
    if (title && title.textContent !== question) title.textContent = question;
    if (detail && detail.textContent !== "Sitio → acción → seguimiento → evidencia.") detail.textContent = "Sitio → acción → seguimiento → evidencia.";
    lead.querySelector("button")?.remove();
  }

  function updateCards(content, sites, f07) {
    const cards = content.querySelector(".v1-ref-cards");
    if (!cards) return;
    cards.innerHTML = `
      <article class="v1-ref-card v1-exec-card" data-exec-kpi="sites"><span>Sitios consolidados</span><strong>${sites.consolidated}</strong><small>+${sites.pendingReferences} referencias F07 por homologar</small><button data-v1-route="riesgos">Ver sitios →</button></article>
      <article class="v1-ref-card v1-exec-card" data-exec-kpi="linked"><span>Sitios con acción vinculada</span><strong>${f07.linkedSites}</strong><small>${f07.linkedActions} acciones vinculadas estructuradamente</small><button data-v1-route="acciones">Ver acciones →</button></article>
      <article class="v1-ref-card v1-exec-card" data-exec-kpi="followups"><span>Seguimientos reportados</span><strong>${f07.followups}</strong><small>Registros F07 dentro del alcance seleccionado</small><button data-v1-route="acciones">Ver seguimiento →</button></article>
      <article class="v1-ref-card v1-exec-card" data-exec-kpi="evidence"><span>Evidencia disponible</span><strong>${f07.evidenceAttached}</strong><small>Adjuntos accesibles y verificables en F07</small><button data-v1-route="monitoreo">Ver evidencia →</button></article>`;

    const source = content.querySelector(".v1-ref-source-note");
    if (source) source.innerHTML = `<b>Lectura ejecutiva:</b> ${sites.consolidated} sitios consolidados · ${f07.linkedSites} con vinculación a sitio · ${f07.linkedActions} acciones vinculadas · ${f07.evidenceAttached} evidencias · ${f07.followups} seguimientos. Las ${sites.pendingReferences} referencias F07 por homologar no se suman a los sitios consolidados.`;
  }

  function apply() {
    scheduled = false;
    if (!isDesktop() || currentRoute() !== "inicio") return;
    const content = document.querySelector("#content.v1-baseline-contract.v1-operational-home");
    if (!content || !content.querySelector(".v1-ref-cards")) return;
    const sites = consolidatedSiteMetrics();
    const f07 = f07Metrics();
    const filters = appState().filters || {};
    const signature = [VERSION, norm(filters.provincia), norm(filters.canton), sites.consolidated, sites.pendingReferences, f07.followups, f07.linkedActions, f07.linkedSites, f07.evidenceAttached].join("|");
    if (content.dataset.executiveHomeSignature === signature) return;

    correctScopeSelectors(content);
    updateQuestion(content);
    updateCards(content, sites, f07);
    content.dataset.executiveHome = VERSION;
    content.dataset.executiveHomeSignature = signature;
  }

  function schedule() {
    if (scheduled) return;
    scheduled = true;
    requestAnimationFrame(apply);
  }

  function start() {
    if (observer) return;
    observer = new MutationObserver(schedule);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("hashchange", () => setTimeout(schedule, 30));
    window.addEventListener("smartrisk:desktop-reference-ready", schedule);
    setTimeout(schedule, 0);
    setTimeout(schedule, 120);
    setTimeout(schedule, 400);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.SmartRiskDesktopExecutiveHome = { VERSION, apply, consolidatedSiteMetrics, f07Metrics };
})();