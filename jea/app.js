(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const login = $("#login");
  const app = $("#app");
  const error = $("#loginError");
  const tipbox = $("#tooltip");

  function pct(n,d){ return d ? Math.round((n/d)*1000)/10 : 0; }
  function fmt(n){ return new Intl.NumberFormat("es-EC").format(n); }
  function showApp(){ login.classList.add("hidden"); app.classList.remove("hidden"); }
  function showLogin(){ app.classList.add("hidden"); login.classList.remove("hidden"); }

  async function loadData(){
    const res = await fetch(`data.json?v=${Date.now()}`, {cache:"no-store"});
    if(!res.ok) throw new Error("No fue posible cargar el corte operativo");
    return res.json();
  }

  function render(data){
    const m=data.metrics, total=data.cohort;
    const cut = new Date(data.cut);
    $("#cutLabel").textContent = `Corte operativo: ${cut.toLocaleString("es-EC", {dateStyle:"long", timeStyle:"short"})}`;
    $("#kpis").innerHTML = [
      [fmt(total),"Cohorte oficial","Base maestra vigente"],
      [fmt(m.interacted),"Con interacción identificada",`${pct(m.interacted,total)}% de la cohorte`],
      [fmt(m.progress),"Con avance o producto",`${pct(m.progress,total)}% de la cohorte`],
      [fmt(m.families5),"Reportaron 5 familias",`${pct(m.families5,total)}% de la cohorte`],
      [fmt(m.noInteraction),"Sin interacción Kobo",`${pct(m.noInteraction,total)}% · requiere segmentación`]
    ].map(([v,l,s])=>`<article class="kpi"><strong>${v}</strong><span>${l}</span><small>${s}</small></article>`).join("");

    $("#actions").innerHTML=data.actions.map(a=>`<div class="action"><span class="priority p${Math.min(a.priority,3)}">P${a.priority}</span><div><b>${a.label}</b><small>${a.detail}</small></div><span class="count">${fmt(a.count)}</span></div>`).join("");
    $("#sources").innerHTML=data.sources.map(s=>`<div class="source"><b>${s.name}</b><span class="badge soft"><span class="dot"></span>${s.status}</span><small>${s.detail}</small></div>`).join("");
    const funnel=[
      ["Cohorte",total],
      ["Interacción",m.interacted],
      ["Avance",m.progress],
      ["5 familias",m.families5]
    ];
    $("#funnel").innerHTML=funnel.map(([l,v])=>`<div class="funnel-row"><span>${l}</span><div class="bar"><span style="width:${Math.max(2,pct(v,total))}%"></span></div><strong>${fmt(v)}</strong></div>`).join("");
    $("#method").innerHTML=data.method.map(x=>`<div class="method-item"><b>${x.title}</b><p>${x.text}</p></div>`).join("");
  }

  async function boot(){
    try { render(await loadData()); }
    catch(e){ $("#syncBadge").textContent="Corte no disponible"; $("#syncBadge").style.background="#fff0ef"; }
  }

  $("#loginForm").addEventListener("submit", async e=>{
    e.preventDefault(); error.textContent="";
    try{
      await auth.signInWithEmailAndPassword($("#email").value.trim(), $("#password").value);
    }catch(err){ error.textContent="No fue posible ingresar. Verifica correo y contraseña."; }
  });
  $("#logout").addEventListener("click",()=>auth.signOut());

  auth.onAuthStateChanged(async user=>{
    if(user){ showApp(); await boot(); }
    else showLogin();
  });

  document.addEventListener("click",e=>{
    const btn=e.target.closest(".tip");
    if(!btn){ if(!e.target.closest("#tooltip")) tipbox.classList.add("hidden"); return; }
    const r=btn.getBoundingClientRect();
    tipbox.textContent=btn.dataset.tip||"";
    tipbox.style.left=`${Math.min(window.innerWidth-360,Math.max(15,r.left-12))}px`;
    tipbox.style.top=`${Math.min(window.innerHeight-120,r.bottom+10)}px`;
    tipbox.classList.remove("hidden");
  });
})();
