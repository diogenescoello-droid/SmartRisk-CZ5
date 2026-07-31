(() => {
  "use strict";

  const RELEASE="RC14.4.4 RC8";
  let scheduled=false;
  let observer=null;

  function setText(element,value){
    if(element&&element.textContent!==value)element.textContent=value;
  }

  function decorate(){
    scheduled=false;
    const scope=window.SmartRiskScope;
    const state=scope?.getState?.();
    if(!state)return;

    if(observer)observer.disconnect();
    try{
      setText(document.querySelector(".brand span"),`CZ5 · ${RELEASE} · ${scope.scopeLabel()}`);
      const pill=document.querySelector("#sessionUser");
      const user=window.firebase?.auth?.()?.currentUser;
      if(pill&&user){
        setText(pill,`${user.displayName||user.email} · ${state.role} · ${scope.scopeLabel()}`);
      }
      document.documentElement.dataset.smartRiskUnifiedUi="true";
      document.documentElement.dataset.smartRiskRelease=RELEASE;
    }finally{
      if(observer){
        observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
      }
    }
  }

  function schedule(){
    if(scheduled)return;
    scheduled=true;
    requestAnimationFrame(decorate);
  }

  observer=new MutationObserver(schedule);
  observer.observe(document.documentElement,{childList:true,subtree:true,characterData:true});
  window.addEventListener("load",schedule);
  schedule();

  window.SMART_RISK_SCOPE_UI={version:"14.4.4-rc8",release:RELEASE,refresh:schedule};
})();