window.SmartRisk=window.SmartRisk||{};
(function(){
  const normalize=value=>String(value||"").trim().toLocaleLowerCase("es");
  const uid=()=>`USR-${Date.now().toString(36).toUpperCase()}-${Math.random().toString(36).slice(2,6).toUpperCase()}`;
  const initials=name=>String(name||"U").split(/\s+/).filter(Boolean).slice(0,2).map(x=>x[0]).join("").toUpperCase();
  const cleanList=value=>Array.isArray(value)?value.map(x=>String(x).trim()).filter(Boolean):String(value||"").split(",").map(x=>x.trim()).filter(Boolean);
  function actor(){return SmartRisk.UserContext.current();}
  function canManage(target=null){
    const current=actor();
    if(!current||!SmartRisk.PermissionService.can("user.manage",current))return false;
    if(current.role==="Administrador")return true;
    return target?.role!=="Administrador";
  }
  function visibleUsers(){
    const current=actor(),users=SmartRisk.UserContext.users();
    if(current?.role==="Administrador")return users;
    return users.filter(user=>user.role!=="Administrador");
  }
  function validate(input,existing=null){
    const name=String(input.name||"").trim(),email=normalize(input.email),role=String(input.role||"").trim();
    if(!name)return {ok:false,message:"El nombre completo es obligatorio."};
    if(!email||!/^\S+@\S+\.\S+$/.test(email))return {ok:false,message:"Ingresa un correo válido."};
    if(!role)return {ok:false,message:"Selecciona un rol."};
    if(SmartRisk.UserContext.users().some(user=>user.id!==existing?.id&&normalize(user.email)===email))return {ok:false,message:"Ya existe un usuario con ese correo."};
    if(actor()?.role!=="Administrador"&&role==="Administrador")return {ok:false,message:"Solo un administrador puede asignar ese rol."};
    return {ok:true};
  }
  function payload(input,existing={}){
    const scope=input.scope||"zonal";
    return {...existing,id:existing.id||uid(),name:String(input.name||"").trim(),email:normalize(input.email),institution:String(input.institution||"").trim()||"Sin institución",position:String(input.position||input.cargo||"").trim(),role:String(input.role||"Consulta").trim(),status:String(input.status||"active"),initials:initials(input.name),territory:{scope,provinces:cleanList(input.provinces),cantons:scope==="cantonal"?cleanList(input.cantons):[]},updatedAt:new Date().toISOString(),updatedBy:actor()?.id||null};
  }
  SmartRisk.UserManagementService={
    list:visibleUsers,canManage,
    create(input){if(!canManage(input))return {ok:false,message:"No tienes permiso para crear usuarios."};const check=validate(input);if(!check.ok)return check;const user=payload(input,{password:"1234",mustChangePassword:true,createdAt:new Date().toISOString(),createdBy:actor()?.id||null});SmartRisk.UserContext.saveUsers([user,...SmartRisk.UserContext.users()]);return {ok:true,user};},
    update(userId,input){const existing=SmartRisk.UserContext.users().find(user=>user.id===userId);if(!existing)return {ok:false,message:"Usuario no encontrado."};if(!canManage(existing))return {ok:false,message:"No tienes permiso para editar este usuario."};const check=validate(input,existing);if(!check.ok)return check;const user=payload(input,existing);SmartRisk.UserContext.updateUser(userId,user);return {ok:true,user};},
    setStatus(userId,status){const existing=SmartRisk.UserContext.users().find(user=>user.id===userId),current=actor();if(!existing)return {ok:false,message:"Usuario no encontrado."};if(existing.id===current?.id)return {ok:false,message:"No puedes suspender o bloquear tu propia cuenta."};if(!canManage(existing))return {ok:false,message:"No tienes permiso para modificar esta cuenta."};SmartRisk.UserContext.updateUser(userId,{status,updatedAt:new Date().toISOString(),updatedBy:current?.id||null});return {ok:true};},
    resetPassword(userId){const existing=SmartRisk.UserContext.users().find(user=>user.id===userId);if(!existing||!canManage(existing))return {ok:false,message:"No tienes permiso para restablecer esta cuenta."};SmartRisk.UserContext.updateUser(userId,{password:"1234",mustChangePassword:true,passwordChangedAt:null,updatedAt:new Date().toISOString(),updatedBy:actor()?.id||null});return {ok:true,password:"1234"};},
    remove(userId){const existing=SmartRisk.UserContext.users().find(user=>user.id===userId),current=actor();if(!existing)return {ok:false,message:"Usuario no encontrado."};if(existing.id===current?.id)return {ok:false,message:"No puedes eliminar tu propia cuenta."};if(!canManage(existing))return {ok:false,message:"No tienes permiso para eliminar esta cuenta."};SmartRisk.UserContext.saveUsers(SmartRisk.UserContext.users().filter(user=>user.id!==userId));return {ok:true};}
  };
})();
