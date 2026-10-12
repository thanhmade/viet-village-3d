(function(global){
 'use strict';
 // Narrative progress only. No grades, currency, items or Firebase writes.
 global.createVillageQuestJournal=function({quests,getIdentity,storage,onSaveError=()=>{}}){
  const definitions=new Map(quests.filter(q=>q.enabled).map(q=>[q.id,q]));
  let uid=null,states={};
  function sync(){
   let next;try{next=getIdentity();}catch(_){next=null;}const nextUid=next?.authenticated&&typeof next.uid==='string'&&next.uid.length>0&&next.uid.length<=128?next.uid:null;
   if(nextUid===uid)return;
   uid=nextUid;states={};if(!uid)return;
   try{const data=JSON.parse(storage?.getItem('viet-village:quests:lang-viet:v1:'+encodeURIComponent(uid))||'null');
    for(const id of definitions.keys())if(['active','ready','completed'].includes(data?.[id]))states[id]=data[id];
   }catch(_){/* Corrupt progress cannot grant completion. */}
  }
  function save(){try{storage?.setItem('viet-village:quests:lang-viet:v1:'+encodeURIComponent(uid),JSON.stringify(states));}catch(_){onSaveError();}}
  function status(id){sync();return states[id]||'available';}
  function allowed(id){const q=definitions.get(id);return !!uid&&!!q&&q.dependsOn.every(dep=>states[dep]==='completed');}
  return Object.freeze({
   status,
   snapshot(){sync();return Object.freeze({...states});},
   canAccept(id,npc){sync();return allowed(id)&&definitions.get(id).giverNpc===npc&&!states[id];},
   accept(id,npc){sync();if(!allowed(id)||definitions.get(id).giverNpc!==npc||states[id])return false;states[id]='active';save();return true;},
   record(type,target){sync();if(!uid)return false;let changed=false;
    for(const [id,q] of definitions)if(states[id]==='active'&&q.objective.type===type&&(q.objective.npcId||q.objective.propId)===target){states[id]='ready';changed=true;}
    if(changed)save();return changed;
   },
   turnIn(id,npc){sync();if(!uid||states[id]!=='ready'||definitions.get(id)?.turnInNpc!==npc)return false;states[id]='completed';save();return true;},
   lock(){uid=null;states={};}
  });
 };
})(window);
