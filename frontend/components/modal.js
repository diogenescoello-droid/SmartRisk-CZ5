SmartRisk.Modal={
  open({title,body,confirmLabel="Guardar",onConfirm,showConfirm=true}){
    const root=document.getElementById("app-modal-root"),previousFocus=document.activeElement;
    const close=()=>{document.removeEventListener("keydown",onKeydown);root.innerHTML="";document.body.classList.remove("is-locked");previousFocus?.focus?.();};
    const onKeydown=event=>{
      if(event.key==="Escape")close();
      if(event.key!=="Tab")return;
      const focusable=[...root.querySelectorAll('button,[href],input,select,textarea,[tabindex]:not([tabindex="-1"])')].filter(el=>!el.disabled);
      if(!focusable.length)return;
      const first=focusable[0],last=focusable[focusable.length-1];
      if(event.shiftKey&&document.activeElement===first){event.preventDefault();last.focus();}
      else if(!event.shiftKey&&document.activeElement===last){event.preventDefault();first.focus();}
    };
    root.innerHTML=`<div class="modal-backdrop"><section class="modal" role="dialog" aria-modal="true" aria-labelledby="modal-title"><header class="modal-header"><h2 id="modal-title" class="section-title">${title}</h2><button id="modal-close" class="icon-btn" type="button" aria-label="Cerrar ventana">×</button></header><div class="modal-body">${body}</div><footer class="modal-footer"><button id="modal-cancel" class="btn btn-secondary" type="button">Cerrar</button>${showConfirm?`<button id="modal-confirm" class="btn btn-primary" type="button">${confirmLabel}</button>`:""}</footer></section></div>`;
    document.body.classList.add("is-locked");
    document.addEventListener("keydown",onKeydown);
    root.querySelector(".modal-backdrop").addEventListener("mousedown",event=>{if(event.target===event.currentTarget)close();});
    document.getElementById("modal-close").onclick=close;
    document.getElementById("modal-cancel").onclick=close;
    if(showConfirm)document.getElementById("modal-confirm").onclick=()=>{const result=onConfirm?.();if(result!==false)close();};
    document.getElementById("modal-close").focus();
  }
};
