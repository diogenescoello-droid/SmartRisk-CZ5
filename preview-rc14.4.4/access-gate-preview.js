(() => {
  "use strict";
  const BUILD_VERSION="14.4.4-rc2";
  const APP_BASE="/SmartRisk-CZ5/";
  const PREVIEW_BASE=`${APP_BASE}preview-rc14.4.4/`;
  const ADMIN_EMAILS=new Set(["geopro.ec2@gmail.com","dcoellom2@unemi.edu.ec"]);
  const SUPPORT_SCRIPTS=["data.js","enos-data.js","enos-reviews.js","risk-locations.js","f03-data.js","cases-data.js","pilot-baseline-data.js","pilot-baseline-bridge.js"];
  const ACCESS_SCRIPTS=["access-core.js","access-ui.js","access-form.js"];
  const $=selector=>document.querySelector(selector);
  const normalizeEmail=value=>String(value||"").trim().toLowerCase();
  let loaded=false,loading=false,handlingUid="",lastError="";

  function loginMessage(message=""){
    const element=$("#loginError");
    if(element)element.textContent=message;
  }
  function setBusy(busy,label="Ingresar"){
    const button=$("#loginForm button");
    if(!button)return;
    button.disabled=busy;
    button.textContent=busy?label:"Ingresar";
  }
  function showLogin(message=""){
    $("#app")?.classList.add("hidden");
    $("#login")?.classList.remove("hidden");
    $("#guideHelp")?.classList.add("hidden");
    $("#riskAnalyst")?.classList.add("hidden");
    loginMessage(message);
    setBusy(false);
  }
  function status(text,state="local"){
    const element=$("#syncStatus");
    if(!element)return;
    element.textContent=text;
    element.className=`sync-status ${state}`;
  }
  function authMessage(error){
    const messages={
      "auth/invalid-email":"El correo no es válido.",
      "auth/user-not-found":"Correo o contraseña incorrectos.",
      "auth/wrong-password":"Correo o contraseña incorrectos.",
      "auth/invalid-credential":"Correo o contraseña incorrectos.",
      "auth/user-disabled":"Esta cuenta fue deshabilitada.",
      "auth/too-many-requests":"Demasiados intentos. Espera unos minutos y vuelve a intentar.",
      "auth/network-request-failed":"No fue posible conectar con Firebase. Revisa la conexión a internet."
    };
    return messages[error?.code]||"No fue posible validar el acceso.";
  }
  function loadScript(src,local=false){
    const base=local?PREVIEW_BASE:APP_BASE;
    const url=`${base}${src}?v=${BUILD_VERSION}`;
    const existing=document.querySelector(`script[data-smartrisk-src="${src}"]`);
    if(existing)return Promise.resolve();
    return new Promise((resolve,reject)=>{
      const script=document.createElement("script");
      const timeout=setTimeout(()=>reject(new Error(`tiempo agotado al cargar ${src}`)),20000);
      script.src=url;
      script.dataset.smartriskSrc=src;
      script.async=false;
      script.onload=()=>{clearTimeout(timeout);resolve()};
      script.onerror=()=>{clearTimeout(timeout);reject(new Error(`no se encontró ${src}`))};
      document.body.appendChild(script);
    });
  }
  async function readProfile(user){
    const snap=await db.collection("perfiles").doc(user.uid).get();
    if(snap.exists)return snap.data();
    if(ADMIN_EMAILS.has(normalizeEmail(user.email))){
      return {correo:normalizeEmail(user.email),nombre:user.displayName||"Administrador SmartRisk",rol:"Administrador",estado:"Activo"};
    }
    return null;
  }
  async function loadApplication(user,profile){
    if(loaded)return;
    if(loading)return;
    loading=true;
    try{
      status("Preparando alcance territorial...","saving");
      window.SmartRiskScope.init({user,profile,db,auth});
      for(const src of SUPPORT_SCRIPTS){
        status(`Cargando ${src}...`,"saving");
        await loadScript(src,false);
      }
      await window.SmartRiskScopeRepository.init({user,profile,db,auth});
      status(`Cargando ${window.SmartRiskScope.scopeLabel()}...`,"saving");
      await loadScript("app.js",false);
      for(const src of ACCESS_SCRIPTS)await loadScript(src,true);
      loaded=true;
      lastError="";
      setBusy(false);
    }finally{
      loading=false;
    }
  }
  async function handle(user){
    if(!user)return;
    if(loaded)return;
    if(handlingUid===user.uid&&loading)return;
    handlingUid=user.uid;
    loginMessage("Credenciales válidas. Verificando perfil autorizado...");
    setBusy(true,"Verificando perfil...");
    try{
      const profile=await readProfile(user);
      if(!profile){
        lastError="La contraseña es correcta, pero esta cuenta no tiene un perfil autorizado en SmartRisk. Solicita al administrador que vincule el correo con un rol y territorio.";
        await auth.signOut();
        showLogin(lastError);
        return;
      }
      if(profile.estado!=="Activo"){
        lastError=`La contraseña es correcta, pero el perfil está ${profile.estado||"inactivo"}. Solicita la reactivación al administrador.`;
        await auth.signOut();
        showLogin(lastError);
        return;
      }
      loginMessage("Perfil autorizado. Cargando SmartRisk RC14.4.4...");
      setBusy(true,"Cargando SmartRisk...");
      await loadApplication(user,profile);
    }catch(error){
      console.error("SmartRisk preview login error",error);
      lastError=`Las credenciales fueron aceptadas, pero la plataforma no terminó de cargar: ${error?.message||"error desconocido"}. Actualiza con Ctrl + Shift + R e intenta nuevamente.`;
      try{await auth.signOut()}catch{}
      showLogin(lastError);
    }finally{
      handlingUid="";
      if(!loading)setBusy(false);
    }
  }

  $("#loginForm").onsubmit=async event=>{
    event.preventDefault();
    lastError="";
    loginMessage("Validando correo y contraseña...");
    setBusy(true,"Validando...");
    try{
      const credential=await auth.signInWithEmailAndPassword(normalizeEmail($("#email").value),$("#password").value);
      $("#password").value="";
      await handle(credential.user);
    }catch(error){
      lastError=authMessage(error);
      showLogin(lastError);
    }
  };
  $("#showRecovery").onclick=async()=>{
    const email=normalizeEmail($("#email").value);
    if(!email){loginMessage("Escribe tu correo para recibir el enlace.");$("#email").focus();return}
    try{await auth.sendPasswordResetEmail(email,{url:location.origin+location.pathname})}catch{}
    loginMessage("Si el correo está registrado, recibirás un enlace para definir una nueva contraseña.");
  };
  $("#logout").onclick=()=>auth.signOut();
  $("#changePassword").onclick=async()=>{
    const email=normalizeEmail(auth.currentUser?.email);if(!email)return;
    try{await auth.sendPasswordResetEmail(email,{url:location.origin+location.pathname})}catch{}
    alert("Se solicitó un enlace para definir una nueva contraseña.");
  };
  auth.onAuthStateChanged(async user=>{
    if(user){await handle(user);return}
    if(loaded){localStorage.removeItem("smartrisk-cz5-data-v1");location.reload();return}
    showLogin(lastError);
  });
  window.SMART_RISK_ACCESS_GATE={version:BUILD_VERSION,mode:"preview-unified-application-by-scope",accessModule:"personal-invitations-and-login-trace",support:"diogenes.coello@gestionderiesgos.gob.ec"};
})();
