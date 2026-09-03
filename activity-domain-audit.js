(() => {
  "use strict";

  const VERSION = "2026.09.02.1-domain-audit";
  const repository = window.SmartRiskScopeRepository;
  if (!repository?.saveRecord || repository.__activityAuditWrapped) return;

  const originalSaveRecord = repository.saveRecord.bind(repository);
  repository.saveRecord = async function auditedSaveRecord(type, payload, options = {}) {
    try {
      const result = await originalSaveRecord(type, payload, options);
      const revision = Number(result?.revision || 0);
      const action = revision <= 1 ? "RECORD_CREATE" : "RECORD_UPDATE";
      void window.SmartRiskActivityAudit?.track(action, {
        category: "data-write",
        module: String(result?.tipo || type || "registro"),
        result: "saved",
        metadata: {
          recordType: String(result?.tipo || type || ""),
          recordId: String(result?.recordId || ""),
          scopeKey: String(result?.scopeKey || ""),
          revision
        }
      });
      return result;
    } catch (error) {
      void window.SmartRiskActivityAudit?.track("RECORD_WRITE_ERROR", {
        category: "data-write",
        module: String(type || "registro"),
        result: "error",
        metadata: {
          recordType: String(type || ""),
          errorCode: String(error?.code || error?.message || "WRITE_ERROR").slice(0, 120)
        }
      });
      throw error;
    }
  };

  repository.__activityAuditWrapped = true;
  window.SmartRiskDomainAudit = { version: VERSION };
})();
