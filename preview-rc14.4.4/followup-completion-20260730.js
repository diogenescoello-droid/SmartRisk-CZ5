(()=>{
"use strict";
const PAYLOAD="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";
const STORE_KEY="smartrisk-cz5-data-v1";
const ADMIN_EMAILS=new Set(["geopro.ec2@gmail.com","dcoellom2@unemi.edu.ec","diogenes.coello@gestionderiesgos.gob.ec"]);
const key=item=>String(item?.followupId||item?.id||`${item?.submissionId||""}|${item?.actionOrCommitment||item?.accion_o_compromiso||item?.description||""}`);
const norm=value=>String(value||"").trim().toLowerCase();
async function decode(){
  const bytes=Uint8Array.from(atob(PAYLOAD),char=>char.charCodeAt(0));
  if(typeof DecompressionStream!=="function")throw new Error("El navegador no admite descompresión del complemento.");
  return JSON.parse(await new Response(new Blob([bytes]).stream().pipeThrough(new DecompressionStream("gzip"))).text());
}
decode().then(patch=>{
  const VERSION=patch.version,CUT=patch.cutDate,FOLLOWUPS=patch.followups||[],ENTITY_PATCHES=patch.entityPatches||[];
  const apply=target=>{
    target=target&&typeof target==="object"?target:{};
    const followups=new Map((Array.isArray(target.seguimientos)?target.seguimientos:[]).map(item=>[key(item),item]));
    FOLLOWUPS.forEach(item=>followups.set(key(item),{...(followups.get(key(item))||{}),...structuredClone(item)}));
    target.seguimientos=[...followups.values()];
    const entities=new Map((Array.isArray(target.entidadesSeguimiento)?target.entidadesSeguimiento:[]).map(item=>[item?.entityId,item]));
    ENTITY_PATCHES.forEach(item=>entities.set(item.entityId,{...(entities.get(item.entityId)||{}),...structuredClone(item)}));
    target.entidadesSeguimiento=[...entities.values()];
    target._latestDataSnapshot={
      ...(target._latestDataSnapshot||{}),
      version:VERSION,
      cutDate:CUT,
      completionVersion:VERSION,
      completedFollowups:FOLLOWUPS.length,
      summary:{...(target._latestDataSnapshot?.summary||{}),territorialFollowups:106},
      appliedAt:new Date().toISOString()
    };
    return target;
  };
  const enough=value=>Boolean(value?._latestDataSnapshot?.completionVersion===VERSION&&Array.isArray(value?.entidadesSeguimiento)&&value.entidadesSeguimiento.length===56&&Array.isArray(value?.seguimientos)&&value.seguimientos.length>=106);
  const paint=()=>{
    try{
      data=apply(data);
      if(typeof normalizeDataShape==="function")normalizeDataShape();
      localStorage.setItem(STORE_KEY,JSON.stringify(data));
      if(typeof render==="function")render();
      if(typeof setSyncStatus==="function")setSyncStatus(`Datos al 30-07-2026 · ${data.seguimientos.length} seguimientos`,cloudReady?"synced":"local");
    }catch(error){console.error("SmartRisk complemento de seguimientos",error)}
  };
  const migrate=async()=>{
    let admin=false;
    try{
      const email=norm(session?.email);
      admin=ADMIN_EMAILS.has(email)||(typeof isAdmin==="function"&&isAdmin())||norm(currentProfile?.rol)==="administrador";
    }catch{}
    if(!admin||typeof db==="undefined"||typeof CLOUD_DOC==="undefined")return;
    let committed=null;
    try{
      await db.runTransaction(async transaction=>{
        const ref=db.doc(CLOUD_DOC),snapshot=await transaction.get(ref),remote=snapshot.exists?snapshot.data():{};
        if(enough(remote)){committed=remote;return}
        const merged=apply(structuredClone(remote));
        merged._revision=Number(remote._revision||0)+1;
        const size=new Blob([JSON.stringify(merged)]).size;
        if(size>880000)throw new Error(`Límite Firestore: ${size} bytes`);
        transaction.set(ref,merged);
        committed=merged;
      });
      if(committed){
        data=committed;
        cloudRevision=Number(committed._revision||cloudRevision||0);
        if(typeof normalizeDataShape==="function")normalizeDataShape();
        localStorage.setItem(STORE_KEY,JSON.stringify(data));
        if(typeof render==="function")render();
        if(typeof setSyncStatus==="function")setSyncStatus("Sincronizado · 106 seguimientos · corte 30-07-2026","synced");
      }
    }catch(error){
      console.warn("SmartRisk complemento compartido",error);
      if(typeof setSyncStatus==="function")setSyncStatus("Datos actuales · pendiente verificar nube","local");
    }
  };
  let attempts=0;
  const timer=setInterval(async()=>{
    attempts++;
    let ready=false,baseReady=false;
    try{ready=typeof data!=="undefined"&&typeof session!=="undefined"&&Boolean(session);baseReady=Array.isArray(data?.seguimientos)&&data.seguimientos.length>=103}catch{}
    if((!ready||!baseReady)&&attempts<120)return;
    clearInterval(timer);
    if(!ready)return;
    if(!enough(data))paint();
    await migrate();
  },250);
  window.SMART_RISK_FOLLOWUP_COMPLETION=Object.freeze({version:VERSION,cutDate:CUT,followups:FOLLOWUPS.length,entities:ENTITY_PATCHES.length});
}).catch(error=>{console.error("SmartRisk complemento 106",error);window.SMART_RISK_FOLLOWUP_COMPLETION_ERROR=String(error?.message||error)});
})();
