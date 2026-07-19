window.SmartRisk=window.SmartRisk||{};
(function(){
 const USERS_KEY="auth.users",SESSION_KEY="auth.session";
 const clone=value=>JSON.parse(JSON.stringify(value));
 const normalizeUser=user=>({...user,password:user.password||user.pin||"1234",status:user.status||"active",territory:user.territory||{scope:"zonal",provinces:[],cantons:[]}});
 function seed(){let users=SmartRisk.Storage.get(USERS_KEY,null);if(!Array.isArray(users)||!users.length){users=(SmartRisk.UsersDemo||[]).map(normalizeUser);SmartRisk.Storage.set(USERS_KEY,users)}return users}
 function session(){const value=SmartRisk.Storage.get(SESSION_KEY,null);if(!value)return null;const user=seed().find(item=>item.id===value.userId);return user?clone(user):null}
 SmartRisk.UserContext={
  users(){return clone(seed())},
  saveUsers(users){SmartRisk.Storage.set(USERS_KEY,(users||[]).map(normalizeUser));return this.users()},
  updateUser(id,changes){const users=seed();const index=users.findIndex(user=>user.id===id);if(index<0)return null;const next={...users[index],...changes,territory:changes.territory?{...users[index].territory,...changes.territory}:users[index].territory};Object.keys(next).forEach(key=>next[key]===undefined&&delete next[key]);users[index]=next;SmartRisk.Storage.set(USERS_KEY,users);return clone(next)},
  current:session,
  setSession(user){SmartRisk.Storage.set(SESSION_KEY,{userId:user.id,createdAt:new Date().toISOString()});return session()},
  clearSession(){SmartRisk.Storage.remove(SESSION_KEY)},
  requireSession(){if(session())return true;location.replace("login.html");return false},
  territoryLabel(user=session()){if(!user)return "Sin territorio";const t=user.territory||{};if(t.scope==="cantonal")return (t.cantons||[]).join(", ")||"Cantonal";if(t.scope==="provincial")return (t.provinces||[]).join(", ")||"Provincial";return "Zona 5"},
  allowsProvince(province,user=session()){if(!user)return false;const t=user.territory||{};return t.scope==="zonal"||!(t.provinces||[]).length||(t.provinces||[]).includes(province)},
  allowsCanton(canton,province,user=session()){if(!this.allowsProvince(province,user))return false;const t=user?.territory||{};return t.scope!=="cantonal"||!(t.cantons||[]).length||(t.cantons||[]).includes(canton)},
  filterTerritories(items,user=session()){return (items||[]).filter(item=>this.allowsProvince(item.provincia||item.province,user))},
  filterRecords(items,user=session()){return (items||[]).filter(item=>this.allowsCanton(item.canton||item.cantón,item.provincia||item.province,user))},
  resetDemo(){SmartRisk.Storage.remove(USERS_KEY);SmartRisk.Storage.remove(SESSION_KEY);return seed()}
 };
})();
