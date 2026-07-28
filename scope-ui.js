(() => {
  "use strict";
  let scheduled=false;
  function decorate(){
    scheduled=false;
    const scope=window.SmartRiskScope;
    const state=scope?.getState?.();
    if(!state)return;
    const brand=document.querySelector(".brand span");
    if(brand)brand.textContent=`CZ5 · RC13.2 · ${scope.scopeLabel()}`;
    const pill=document.querySelector("#sessionUser");
    const user=firebase?.auth?.()?.currentUser;
    if(pill&&user)pill.textContent=`${user.displayName||user.email} · ${state.role} · ${scope.scopeLabel()}`;
    document.documentElement.dataset.smartRiskUnifiedUi="true";
  }
  function schedule(){if(scheduled)return;scheduled=true;requestAnimationFrame(decorate)}
  new MutationObserver(schedule).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener("load",schedule);
  schedule();
  window.SMART_RISK_SCOPE_UI={version:"13.2.0",refresh:schedule};
})();