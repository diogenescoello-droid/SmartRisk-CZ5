(() => {
  "use strict";
  const BUILD_VERSION="14.3.2";
  const SUPPORT_SCRIPTS=["data.js","enos-data.js","enos-reviews.js","risk-locations.js","f03-data.js","cases-data.js","pilot-baseline-data.js","pilot-baseline-bridge.js"];
  const $=selector=>document.querySelector(selector);
  const normalizeEmail=value=>String(value||"").trim().toLowerCase();
  let loaded=false,loading=false;
  function loginMessage(message=""){if($("#loginError"))$("#loginError").textContent=message}
  function showLogin(message=""){
    $("#app")?.classList.add("hidden");$("#login")?.classList.remove("hidden");
    $("#guideHelp")?.classList.add("hidden");$("#riskAnalyst")?.classList.add("hidden");loginMessage(message);
  }
  function status(text,state="local"){if($("#syncStatus")){$("#syncStatus").textContent=text;$("#syncStatus").className=`sync-status ${state}`}}
  function loadScript(src){return new Promise((resolve,reject)=>{const script=document.createElement("script");script.src=`${src}?v=${BUILD_VERSION}`;script.async=false;script.onload=resolve;script.onerror=()=>reject(new Error(`No fue posible cargar ${src}`));document.body.appendChild(script)})}
  function recoveryErrorMessage(error){
    const code=String(error?.code||"");
    if(code==="auth/invalid-email")return "El formato del correo no es válido.";
    if(code==="auth/user-not-found")return "El correo no está registrado como usuario de SmartRisk.";
    if(code==="auth/too-many-requests")return "Se realizaron demasiadas solicitudes. Espere unos minutos antes de intentarlo nuevamente.";
    if(code==="auth/network-request-failed")return "No fue posible conectarse con el servicio de autenticación. Revise su conexión e intente nuevamente.";
    if(code==="auth/operation-not-allowed")return "La recuperación por correo no está habilitada en Firebase Authentication.";
    if(code==="auth/unauthorized-continue-uri")return "El dominio de retorno no está autorizado en Firebase Authentication.";
    console.error("Error al solicitar recuperación de contraseña",error);
    return "No fue posible generar el correo de recuperación. Informe esta novedad al administrador.";
  }
  async function requestPasswordReset(email){
    await auth.sendPasswordResetEmail(email);
  }
  async function readProfile(user){const snap=await db.collection("perfiles").doc(user.uid).get();return snap.exists?snap.data():null}
  async function loadApplication(user,profile){
    if(loaded||loading)return;loading=true;
    try{
      status("Preparando alcance territorial...","saving");
      window.SmartRiskScope.init({user,profile,db,auth});
      for(const src of SUPPORT_SCRIPTS)await loadScript(src);
      await window.SmartRiskScopeRepository.init({user,profile,db,auth});
      status(`Cargando ${window.SmartRiskScope.scopeLabel()}...`,"saving");
      await loadScript("app.js");loaded=true;
    }finally{loading=false}
  }
  async function handle(user){
    loginMessage("");
    try{
      const profile=await readProfile(user);
      if(!profile||profile.estado!=="Activo"){showLogin("Tu cuenta no tiene un perfil activo autorizado.");await auth.signOut();return}
      await loadApplication(user,profile);
    }catch(error){console.error(error);showLogin("No fue posible cargar la información autorizada.");await auth.signOut()}
  }
  $("#loginForm").onsubmit=async event=>{
    event.preventDefault();loginMessage("");
    try{await auth.signInWithEmailAndPassword(normalizeEmail($("#email").value),$("#password").value);$("#password").value=""}
    catch{loginMessage("Correo o contraseña incorrectos.")}
  };
  $("#showRecovery").onclick=async()=>{
    const email=normalizeEmail($("#email").value);
    if(!email){loginMessage("Escribe tu correo para recibir el enlace.");$("#email").focus();return}
    loginMessage("Generando correo de recuperación...");
    try{
      await requestPasswordReset(email);
      loginMessage("Correo generado correctamente. Revisa Recibidos, Spam, Correo no deseado y Promociones.");
    }catch(error){
      loginMessage(recoveryErrorMessage(error));
    }
  };
  $("#logout").onclick=()=>auth.signOut();
  $("#changePassword").onclick=async()=>{
    const email=normalizeEmail(auth.currentUser?.email);if(!email)return;
    try{
      await requestPasswordReset(email);
      alert("Correo de recuperación generado correctamente. Revisa también Spam o Correo no deseado.");
    }catch(error){
      alert(recoveryErrorMessage(error));
    }
  };
  auth.onAuthStateChanged(async user=>{
    if(user){await handle(user);return}
    if(loaded){localStorage.removeItem("smartrisk-cz5-data-v1");location.reload();return}
    showLogin();
  });
  window.SMART_RISK_ACCESS_GATE={version:"14.3.2",mode:"unified-application-by-scope",support:"diogenes.coello@gestionderiesgos.gob.ec"};
})();