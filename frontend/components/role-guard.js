window.SmartRisk=window.SmartRisk||{};
SmartRisk.RoleGuard={
 can(permission){return SmartRisk.PermissionService.can(permission)},
 apply(root=document){root.querySelectorAll?.("[data-permission]").forEach(el=>{const allowed=SmartRisk.PermissionService.can(el.dataset.permission);el.hidden=!allowed;el.setAttribute("aria-hidden",String(!allowed))})}
};
