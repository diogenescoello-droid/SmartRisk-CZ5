window.SmartRisk=window.SmartRisk||{};
(function(){
  const RECOVERY_KEY="workspace.passwordRecovery";
  const now=()=>Date.now();
  const normalize=value=>String(value||"").trim().toLowerCase();
  const validPassword=password=>String(password||"").length>=8;

  const findUser=identity=>{
    const value=normalize(identity);
    return SmartRisk.UserContext.users().find(user=>
      normalize(user.id)===value ||
      normalize(user.email)===value ||
      normalize(user.name)===value
    );
  };

  SmartRisk.AuthService={
    login(identity,password){
      const user=findUser(identity);
      if(!user||String(user.password||user.pin)!==String(password||"")){
        return {ok:false,message:"Funcionario o contraseña incorrectos."};
      }
      if(user.status==="blocked")return {ok:false,message:"La cuenta está bloqueada. Contacta al administrador."};
      if(user.status==="suspended"||user.status==="inactive")return {ok:false,message:"La cuenta está suspendida. Contacta al administrador."};
      SmartRisk.UserContext.setSession(user);
      SmartRisk.UserContext.updateUser(user.id,{lastAccessAt:new Date().toISOString()});
      return {ok:true,user:SmartRisk.UserContext.current(),mustChangePassword:Boolean(user.mustChangePassword)};
    },
    changePassword({currentPassword,newPassword,confirmPassword}){
      const user=SmartRisk.UserContext.current();
      if(!user)return {ok:false,message:"No existe una sesión activa."};
      if(String(user.password||user.pin)!==String(currentPassword||""))return {ok:false,message:"La contraseña actual no es correcta."};
      if(!validPassword(newPassword))return {ok:false,message:"La nueva contraseña debe tener al menos 8 caracteres."};
      if(newPassword!==confirmPassword)return {ok:false,message:"La confirmación no coincide."};
      if(newPassword===currentPassword)return {ok:false,message:"La nueva contraseña debe ser diferente."};
      SmartRisk.UserContext.updateUser(user.id,{password:newPassword,pin:undefined,mustChangePassword:false,passwordChangedAt:new Date().toISOString()});
      return {ok:true};
    },
    requestRecovery(email){
      const user=SmartRisk.UserContext.users().find(u=>normalize(u.email)===normalize(email));
      if(!user)return {ok:true,message:"Si el correo está registrado, se generó una solicitud de recuperación."};
      const code=String(Math.floor(100000+Math.random()*900000));
      SmartRisk.Storage.set(RECOVERY_KEY,{userId:user.id,code,expiresAt:now()+10*60*1000});
      return {ok:true,message:"Código de verificación generado.",demoCode:code};
    },
    resetPassword({email,code,newPassword,confirmPassword}){
      const user=SmartRisk.UserContext.users().find(u=>normalize(u.email)===normalize(email));
      const request=SmartRisk.Storage.get(RECOVERY_KEY,null);
      if(!user||!request||request.userId!==user.id||String(request.code)!==String(code||"")||request.expiresAt<now())return {ok:false,message:"El código es inválido o ha caducado."};
      if(!validPassword(newPassword))return {ok:false,message:"La nueva contraseña debe tener al menos 8 caracteres."};
      if(newPassword!==confirmPassword)return {ok:false,message:"La confirmación no coincide."};
      SmartRisk.UserContext.updateUser(user.id,{password:newPassword,pin:undefined,mustChangePassword:false,passwordChangedAt:new Date().toISOString()});
      SmartRisk.Storage.remove(RECOVERY_KEY);
      return {ok:true};
    },
    logout(){SmartRisk.UserContext.clearSession();location.replace("login.html");}
  };
})();
