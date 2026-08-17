(() => {
  "use strict";
  const $ = s => document.querySelector(s);
  const login = $("#login");
  const app = $("#app");
  const error = $("#loginError");
  const tipbox = $("#tooltip");
  let currentData = null;

  function pct(n,d){ return d ? Math.round((n/d)*1000)/10 : 0; }
  function fmt(n){ return new Intl.NumberFormat("es-EC").format(n); }
  function showApp(){ login.classList.add("hidden"); app.classList.remove("hidden"); }
  function showLogin(){ app.classList.add("hidden"); login.classList.remove("hidden"); }

  async function loadData(){
    const res = await fetch(`data.json?v=${Date.now()}`, {cache:"no-store"});
    if(!res.ok) throw new Error("No fue posible cargar el corte operativo");
    return res.json();
  }

  function renderCoordinator(data, selectedName="TODOS"){
    const pf=data.planFamiliaFisico;
    if(!pf) return;
    const select=$("#coordinatorSelect");
    if(!select.dataset.ready){
      select.innerHTML=[`<option value="TODOS">Todos los coordinadores</option>`]
        .concat(pf.coordinators.map(c=>`<option value="${c.name}">${c.name}</option>`)).join("");
      select.dataset.ready="1";
    }
    if(select.value!==selectedName) select.value=selectedName;

    const selected = selectedName === "TODOS" ? null : pf.coordinators.find(c=>c.name===selectedName);
    const responses = selected ? selected.responses : pf.totalResponses;
    const assigned = selected ? selected.assignedRoster : null;
    const share = pct(responses,pf.totalResponses);
    const assignmentLabel = selectedName === "SIN ASIGNAR" ? "Requiere depuración" : selected ? "Asignación identificada" : "Vista consolidada";

    $("#coordinatorSource").textContent = `${fmt(pf.totalResponses)} respuestas · ${fmt(pf.assignedResponses)} asignadas`;
    $("#coordinatorKpis").innerHTML = [
      [fmt(responses), selected ? "Respuestas del coordinador" : "Respuestas totales", `${share}% del archivo recibido`],
      [selected && assigned ? fmt(assigned) : "—", selected && assigned ? "Participantes asignados en matriz" : "Base asignada", selected && assigned ? "Dato de referencia; no se interpreta aquí como cumplimiento" : "Selecciona un coordinador para ver su base"],
      [selectedName === "SIN ASIGNAR" ? fmt(pf.unassignedResponses) : fmt(pf.assignedResponses), selectedName === "SIN ASIGNAR" ? "Sin asignación inequívoca" : "Cruces asignados", selectedName === "SIN ASIGNAR" ? "No forzar responsable hasta depurar" : "Cédula o coincidencia única de respaldo"],
      [assignmentLabel, "Estado de lectura", selectedName === "TODOS" ? "Compara sin mezclar datos nominales" : "Filtro activo en este módulo"]
    ].map(([v,l,s])=>`<article class="mini-kpi"><strong>${v}</strong><span>${l}</span><small>${s}</small></article>`).join("");

    $("#coordinatorList").innerHTML=pf.coordinators.map(c=>{
      const active = selectedName===c.name ? " active" : "";
      const roster = c.assignedRoster ? `<small>Base asignada: ${fmt(c.assignedRoster)}</small>` : `<small>Pendiente de asignación</small>`;
      return `<button class="coord-row${active}" data-coordinator="${c.name}"><span><b>${c.name}</b>${roster}</span><strong>${fmt(c.responses)}</strong><em>respuestas</em></button>`;
    }).join("");

    const mm=pf.matchMethods;
    $("#matchMethods").innerHTML=[
      ["Cédula",mm.cedula], ["Correo",mm.correo], ["Teléfono",mm.telefono], ["Nombre",mm.nombre], ["Sin coincidencia",mm.sinCoincidencia]
    ].map(([l,v])=>`<div class="match-row"><span>${l}</span><b>${fmt(v)}</b></div>`).join("");
    $("#coordNote").textContent=pf.note;
  }

  function render(data){
    currentData=data;
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

    renderCoordinator(data,"TODOS");
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
  $("#coordinatorSelect").addEventListener("change",e=>currentData&&renderCoordinator(currentData,e.target.value));
  $("#coordinatorList").addEventListener("click",e=>{
    const row=e.target.closest("[data-coordinator]");
    if(row&&currentData) renderCoordinator(currentData,row.dataset.coordinator);
  });

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
