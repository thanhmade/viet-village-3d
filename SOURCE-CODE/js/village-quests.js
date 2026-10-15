(function(global){
 'use strict';
 // Narrative progress; EXP reconciles only after durable completion. No Firebase writes.
 // canStart(id,phases) adds the shared requirement check (LV, any-of); the
 // default keeps the original rule: every dependsOn quest is turned in.
 global.createVillageQuestJournal=function({quests,getIdentity,storage,onSaveError=()=>{},canStart=null}){
  const definitions=new Map(quests.filter(q=>q.enabled).map(q=>[q.id,q]));
  const phases=['active','ready','completed'];
  const base=()=> 'viet-village:quests:lang-viet:v1:'+encodeURIComponent(uid);
  let uid=null,states={},raw=null,readFailed=false;
  function sync(){
   let next;try{next=getIdentity();}catch(_){next=null;}const nextUid=next?.authenticated&&typeof next.uid==='string'&&next.uid.length>0&&next.uid.length<=128?next.uid:null;
   uid=nextUid;states={};readFailed=false;raw=null;if(!uid)return;
   try{raw=storage?.getItem('viet-village:quests:lang-viet:v1:'+encodeURIComponent(uid));const data=JSON.parse(raw||'null');
    if(data!==null&&(typeof data!=='object'||Array.isArray(data)))throw new Error('Invalid journal');
    for(const id of definitions.keys()){
     let rank=phases.indexOf(data?.[id]);
     for(let i=0;i<phases.length;i++){
      const marker=storage?.getItem(base()+':'+id+':'+phases[i]);
      if(marker!=null&&marker!=='1')throw new Error('Invalid quest marker');
      if(marker==='1')rank=Math.max(rank,i);
     }
     if(rank>=0)states[id]=phases[rank];
    }
   }catch(_){readFailed=true;/* Preserve corrupt progress; never overwrite it. */}
  }
  function save(){try{if(readFailed||!storage?.setItem)throw new Error('Unavailable journal');
   // Append-only phase markers are a monotonic union across tabs. No stale tab
   // can turn completed back into active or overwrite another quest's progress.
   // Keep the original dictionary byte-for-byte for existing/unknown fields.
   for(const [id,state] of Object.entries(states)){
    const key=base()+':'+id+':'+state;
    if(storage.getItem(key)!=='1')storage.setItem(key,'1');
    if(storage.getItem(key)!=='1')throw new Error('Quest save not verified');
   }
   return true;
  }catch(_){sync();onSaveError();return false;}}
  function status(id){sync();return states[id]||'available';}
  function allowed(id){const q=definitions.get(id);if(readFailed||!uid||!q)return false;
  try{return typeof canStart==='function'?canStart(id,Object.freeze({...states}))===true:q.dependsOn.every(dep=>states[dep]==='completed');}catch(_){return false;}}
  return Object.freeze({
   status,
   snapshot(){sync();return Object.freeze({...states});},
   // undefined = not started, null = unreadable (never treated as "not started").
   phaseOf(id){sync();return readFailed||!uid?null:states[id];},
   get readable(){sync();return !!uid&&!readFailed;},
   canAccept(id,npc){sync();return allowed(id)&&definitions.get(id).giverNpc===npc&&!states[id];},
   accept(id,npc){sync();if(!allowed(id)||definitions.get(id).giverNpc!==npc||states[id])return false;states[id]='active';return save();},
   record(type,target){sync();if(!uid)return false;let changed=false;
    for(const [id,q] of definitions)if(states[id]==='active'&&q.objective.type===type&&(q.objective.npcId||q.objective.propId)===target){states[id]='ready';changed=true;}
    return changed?save():false;
   },
   turnIn(id,npc){sync();if(readFailed||!uid||states[id]!=='ready'||definitions.get(id)?.turnInNpc!==npc)return false;states[id]='completed';return save();},
   lock(){uid=null;states={};}
  });
 };
})(window);
