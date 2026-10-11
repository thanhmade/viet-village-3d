export function latestPeerPose(connections, allowedConnections, time) {
  return Object.entries(connections || {}).filter(([id, p]) => allowedConnections?.[id]
    && p.updatedAt > time - 60000 && p.updatedAt <= time + 5000)
    .sort((a,b)=>b[1].updatedAt-a[1].updatedAt)[0]?.[1] || null;
}
export function createRemotePlayers({THREE, game}) {
  const peers = new Map(), colors = {'villager-default':0x269991,'villager-blue':0x407cc2,'villager-rose':0xc96788};
  let state = null;
  function remove(uid) {
    const item = peers.get(uid); if (!item) return;
    game.scene().remove(item.root); item.materials.forEach(m=>m.dispose());
    item.label.material.map.dispose();item.label.material.dispose();peers.delete(uid);
  }
  function create(member) {
    const root = game.avatarTemplate().clone(true), materials=[];
    root.userData.uid = member.uid;
    root.traverse(mesh=>{if(mesh.isMesh){mesh.material=mesh.material.clone();materials.push(mesh.material);
      if(mesh.material.color.getHex()===0x269991) mesh.material.color.setHex(colors[member.avatarId] || colors['villager-default']);}});
    const canvas=document.createElement('canvas');canvas.width=512;canvas.height=80;
    const context=canvas.getContext('2d');context.fillStyle='#fffcf2';context.fillRect(0,0,512,80);
    context.font='bold 28px Arial';context.fillStyle='#194b3a';context.textAlign='center';context.fillText(member.nickname,256,52,480);
    const texture=new THREE.CanvasTexture(canvas), material=new THREE.SpriteMaterial({map:texture,depthTest:false});
    const label=new THREE.Sprite(material);label.position.set(0,3,0);label.scale.set(3.4,.53,1);root.add(label);
    root.visible=false;game.scene().add(root);
    const item={root,label,materials,member,target:new THREE.Vector3(),yaw:0,initialized:false};peers.set(member.uid,item);return item;
  }
  function update(value) {
    state=value;
    const keep=new Set((value?.members || []).filter(m=>m.uid!==value.uid).slice(0,7).map(m=>m.uid));
    for(const uid of peers.keys())if(!keep.has(uid))remove(uid);
  }
  function tick(dt, time) {
    if (!state || !game.isReady()) return;
    const local=game.getPose();
    for(const member of state.members.filter(m=>m.uid!==state.uid).slice(0,7)) {
      let item=peers.get(member.uid);
      if(item && (item.member.nickname!==member.nickname || item.member.avatarId!==member.avatarId)){remove(member.uid);item=null;}
      item ||= create(member);
      const pose=latestPeerPose(state.poses?.[member.uid],state.connections?.[member.uid],time);
      item.root.visible=!!pose && pose.mapId===local?.mapId && game.canRenderPeers();
      if(!pose)continue; item.target.set(pose.x,pose.y,pose.z); item.yaw=pose.yaw;
      if(!item.initialized){item.root.position.copy(item.target);item.initialized=true;}
      item.root.position.lerp(item.target,1-Math.exp(-dt*12));
      const body=item.root.children[0];body.rotation.y+=Math.atan2(Math.sin(item.yaw-body.rotation.y),Math.cos(item.yaw-body.rotation.y))*Math.min(1,dt*12);
    }
  }
  return {update,tick,clear:()=>{state=null;for(const uid of [...peers.keys()])remove(uid);}};
}
