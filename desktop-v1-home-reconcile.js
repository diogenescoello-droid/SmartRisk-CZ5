(() => {
  "use strict";

  const VERSION = "2026.08.26.2";
  const SITE_PATH = /sitio\s*critico|punto\s*critico|sector\s*critico/i;
  const SITE_LANGUAGE = /\b(punto\s+critico|sitio\s+critico|sector|recinto|rcto\.?|barrio|ciudadela|cdla\.?|parroquia|rio|estero|quebrada|canal|alcantarill|puente|mercado|cauce|talud|deslizamiento|socav|desbord|inundacion)\b/i;
  const NON_SITE_REFERENCE = /^(no[_\s-]*encontrad[oa]|sin[_\s-]*sitio|ningun[oa]?|ninguno|n\/a|na|null|undefined)$/i;
  let pending = false;
  let observer = null;
  let auditScheduled = false;
  let lastAudit = null;

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
    if (hash) return hash;
    const stateRoute = window.SmartRiskV11App?.state?.route;
    return stateRoute ? String(stateRoute) : "inicio";
  }

  function appState() {
    return window.SmartRiskV11App?.state || {};
  }

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

  function entity(name) {
    return appState().data?.entities?.[name] || [];
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
    if (["c2", "c4", "c9"].includes(criterion) && SITE_LANGUAGE.test(text)) return true;
    return false;
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
    const location = `${norm(candidate.province)}|${norm(candidate.canton)}`;
    return { location, label: norm(candidate.label) };
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
    found.sources = [...new Set([...(found.sources || [found.source]), candidate.source])];
  }

  function consolidatedSiteMetrics() {
    const candidates = [];

    entity("criticalSites").filter(matchesCurrentScope).forEach(item => {
      const scope = scopeOf(item);
      addCandidate(candidates, {
        province: scope.province,
        canton: scope.canton,
        label: siteLabelFromRecord(item),
        status: "consolidated",
        source: "SmartRisk"
      });
    });

    entity("risks").filter(matchesCurrentScope).filter(item => {
      const sourcePath = item?.sourcePath || item?.payload?.sourcePath || "";
      return SITE_PATH.test(norm(sourcePath));
    }).forEach(item => {
      const scope = scopeOf(item);
      addCandidate(candidates, {
        province: scope.province,
        canton: scope.canton,
        label: siteLabelFromRecord(item),
        status: "consolidated",
        source: "Plan"
      });
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

    const consolidated = candidates.filter(item => item.status !== "pending").length;
    const pendingReferences = candidates.filter(item => item.status === "pending").length;
    return {
      total: candidates.length,
      consolidated,
      pendingReferences,
      candidates
    };
  }

  function actualF07Cut() {
    const raw = window.SMART_RISK_F07_CURRENT?.config?.latestSubmissionAt || window.SMART_RISK_F07_CURRENT?.config?.syncedAt;
    if (!raw) return "";
    const date = new Date(raw);
    if (Number.isNaN(date.getTime())) return "";
    const months = ["ene", "feb", "mar", "abr", "may", "jun", "jul", "ago", "sep", "oct", "nov", "dic"];
    return `${date.getDate()} ${months[date.getMonth()]} ${date.getFullYear()}`;
  }

  function allowedRouteSet() {
    return new Set([...document.querySelectorAll("#nav button[data-route]")].map(button => button.dataset.route).filter(Boolean));
  }

  function auditRoleButton() {
    const role = document.querySelector(".v1-role-badge[data-v1-lock-route]");
    if (!role) return;
    const allowed = allowedRouteSet();
    const target = allowed.has("herramientas") ? "herramientas" : allowed.has("configuracion") ? "configuracion" : "";
    if (target && role.dataset.v1LockRoute !== target) role.dataset.v1LockRoute = target;
    if (!target) role.removeAttribute("data-v1-lock-route");
  }

  function auditButtons(content) {
    const allowed = allowedRouteSet();
    const invalid = [];
    content.querySelectorAll("[data-v1-route]").forEach(button => {
      const route = button.dataset.v1Route;
      if (!route || allowed.has(route)) return;
      invalid.push(route || "sin-ruta");
      button.remove();
    });

    const leadTerritory = content.querySelector(".v1-ref-risk-lead > button[data-v1-route='dashboard']");
    if (leadTerritory) leadTerritory.remove();

    const cards = [...content.querySelectorAll(".v1-ref-card")];
    const budgetCard = cards.find(card => /presupuesto/i.test(card.querySelector(":scope > span")?.textContent || ""));
    budgetCard?.querySelector("button[data-v1-route]")?.remove();

    const destinations = {};
    content.querySelectorAll("[data-v1-route]").forEach(button => {
      const route = button.dataset.v1Route;
      destinations[route] = (destinations[route] || 0) + 1;
    });
    return { invalid, destinations, visibleButtons: content.querySelectorAll("button").length };
  }

  function updateSiteCard(content) {
    const cards = [...content.querySelectorAll(".v1-ref-card")];
    const card = cards.find(item => /sitios reportados|sitios \/ puntos reportados/i.test(item.querySelector(":scope > span")?.textContent || ""));
    if (!card) return null;
    const data = consolidatedSiteMetrics();
    const label = card.querySelector(":scope > span");
    const value = card.querySelector(":scope > strong");
    const detail = card.querySelector(":scope > small");
    if (label && label.textContent !== "Sitios / puntos reportados") label.textContent = "Sitios / puntos reportados";
    if (value && value.textContent !== String(data.total)) value.textContent = String(data.total);
    const detailText = `${data.consolidated} consolidados · ${data.pendingReferences} referencias F07 por homologar`;
    if (detail && detail.textContent !== detailText) detail.textContent = detailText;
    card.dataset.siteMetric = "territorial-consolidated";
    return data;
  }

  function updateCutLabels(content) {
    const cut = actualF07Cut();
    if (!cut) return;
    const sourceNote = content.querySelector(".v1-ref-source-note");
    if (sourceNote) sourceNote.innerHTML = `<b>Corte vigente:</b> F07 · ${cut}. Zona = provincias + cantones; provincia = Prefectura + sus cantones; cantón = registros propios. Los datos respetan el perfil y alcance autorizado.`;
    const headerCut = document.querySelector(".v1-header-meta .v1-meta-badge:not(.v1-role-badge)");
    if (headerCut && headerCut.textContent !== `Corte F07 · ${cut}`) headerCut.textContent = `Corte F07 · ${cut}`;
  }

  function auditHome(content) {
    const siteMetrics = updateSiteCard(content);
    updateCutLabels(content);
    auditRoleButton();
    const buttonAudit = auditButtons(content);
    content.dataset.v1HomeAudit = VERSION;
    lastAudit = {
      version: VERSION,
      scope: {
        provincia: appState().filters?.provincia || null,
        canton: appState().filters?.canton || null
      },
      hierarchy: "Zona = provincial + cantonal; Provincia = Prefectura + cantones; Cantón = propio",
      sites: siteMetrics ? {
        total: siteMetrics.total,
        consolidated: siteMetrics.consolidated,
        pendingReferences: siteMetrics.pendingReferences
      } : null,
      buttons: buttonAudit,
      auditedAt: new Date().toISOString()
    };
    window.SmartRiskV1HomeAudit = lastAudit;
  }

  function v1ViewIsPresent(content, route = currentRoute()) {
    if (!content) return false;
    if (route === "inicio") {
      return Boolean(
        content.classList.contains("v1-operational-home") &&
        content.querySelector(".v1-lead") &&
        content.querySelector(".v1-kpis") &&
        content.querySelector(".v1-workspace-grid")
      );
    }
    if (route === "dashboard") {
      return Boolean(
        content.classList.contains("v1-operational-territory") &&
        content.querySelector(".v1-territory-intro") &&
        content.querySelector(".v1-territory-grid") &&
        content.querySelector(".v1-territory-summary")
      );
    }
    return true;
  }

  function requestV1Reapply() {
    const route = currentRoute();
    if (pending || !isDesktop() || !["inicio", "dashboard"].includes(route)) return;
    const content = document.querySelector("#content");
    if (!content || v1ViewIsPresent(content, route)) return;

    pending = true;
    delete content.dataset.v1Operational;
    const marker = document.createComment(`v1-view-reconcile-${route}-${VERSION}`);
    content.appendChild(marker);
    requestAnimationFrame(() => {
      marker.remove();
      pending = false;
    });
  }

  function reconcileAndAudit() {
    if (auditScheduled) return;
    auditScheduled = true;
    requestAnimationFrame(() => {
      auditScheduled = false;
      if (!isDesktop()) return;
      const route = currentRoute();
      const content = document.querySelector("#content");
      if (!content) return;
      if (!v1ViewIsPresent(content, route)) {
        requestV1Reapply();
        return;
      }
      if (route === "inicio") auditHome(content);
      else auditRoleButton();
    });
  }

  function start() {
    if (observer) return;
    observer = new MutationObserver(reconcileAndAudit);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("hashchange", () => setTimeout(reconcileAndAudit, 20));
    window.addEventListener("smartrisk:desktop-reference-ready", reconcileAndAudit);
    setTimeout(reconcileAndAudit, 0);
    setTimeout(reconcileAndAudit, 150);
    setTimeout(reconcileAndAudit, 500);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start, { once: true });
  else start();

  window.SmartRiskV1HomeReconcile = {
    VERSION,
    requestV1Reapply,
    reconcileAndAudit,
    v1ViewIsPresent,
    siteMetrics: consolidatedSiteMetrics,
    getLastAudit: () => lastAudit
  };
})();