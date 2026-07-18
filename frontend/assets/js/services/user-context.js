window.SmartRisk=window.SmartRisk||{};
(function(){
  const SESSION_KEY="workspace.session";
  const USERS_KEY="workspace.users";
  function seedUsers(){
    const stored=SmartRisk.Storage.get(USERS_KEY,null);
    if(Array.isArray(stored)&&stored.length)return stored;
    const seeded=(SmartRisk.UsersDemo||[]).map(user=>({...user}));
    SmartRisk.Storage.set(USERS_KEY,seeded);
    return seeded;
  }
  function users(){return seedUsers();}
  function saveUsers(nextUsers){SmartRisk.Storage.set(USERS_KEY,nextUsers);return nextUsers;}
  function updateUser(userId,changes){
    const next=users().map(user=>user.id===userId?{...user,...changes}:user);
    saveUsers(next);
    return next.find(user=>user.id===userId)||null;
  }
  function current(){const session=SmartRisk.Storage.get(SESSION_KEY,null);if(!session?.userId)return null;return users().find(u=>u.id===session.userId)||null;}
  function normalize(value){return String(value||"").trim().toLocaleLowerCase("es");}
  function allowed(record,user=current()){
    if(!user)return false;
    const territory=user.territory||{};
    if(territory.scope==="zonal")return true;
    const province=normalize(record.provincia||record.province);
    if(territory.provinces?.length&&!territory.provinces.some(p=>normalize(p)===province))return false;
    if(territory.scope==="provincial")return true;
    const canton=normalize(record.canton||record.capital||record.territorio);
    return !territory.cantons?.length||territory.cantons.some(c=>normalize(c)===canton);
  }
  SmartRisk.UserContext={
    users,
    saveUsers,
    updateUser,
    current,
    isAuthenticated(){return Boolean(current());},
    setSession(user){SmartRisk.Storage.set(SESSION_KEY,{userId:user.id,startedAt:new Date().toISOString()});},
    clearSession(){SmartRisk.Storage.remove(SESSION_KEY);},
    filterRecords(records,user=current()){return (records||[]).filter(item=>allowed(item,user));},
    canAccessRecord:allowed,
    territoryLabel(user=current()){
      if(!user)return "Sin sesión";
      const t=user.territory||{};
      if(t.scope==="zonal")return "Zona 5";
      if(t.scope==="provincial")return t.provinces?.join(", ")||"Ámbito provincial";
      return t.cantons?.join(", ")||t.provinces?.join(", ")||"Ámbito cantonal";
    },
    requireSession(){if(!this.isAuthenticated()){const target=encodeURIComponent(location.href);location.replace(`login.html?next=${target}`);return false}return true;}
  };
})();
