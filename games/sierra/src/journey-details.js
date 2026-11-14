import * as THREE from 'three';
import {loadWorldAsset,cloneWorldAsset} from './world-assets.js';
import {approvedHumanAsset, humanEncounters, humanEncounterAnimation} from './human-characters.js';
import {ROUTE_LENGTH,resolveMovement,cliffSection} from './trail-physics.js';
import {createExpedition, expeditionPositions, gateOpenness, interactionAt, interactExpedition, advanceExpedition, constrainExpeditionMovement} from './expedition.js';

const base = import.meta.env?.BASE_URL || '/jugar/';
const material = (color, metalness=0) => new THREE.MeshStandardMaterial({color, roughness:metalness ? .38 : .85, metalness});
const box = (group, size, pos, mat) => {const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};

/** Authored props and animated Blender assets. These are not photogrammetry. */
export class JourneyDetails {
  constructor(world) {
    this.world=world;this.group=new THREE.Group();world.scene.add(this.group);
    this.actors=[];this.generation=0;this.era=2019;this.mounted=false;
    this.manifest=fetch(`${base}models/manifest.json`).then(r=>r.ok?r.json():{}).catch(()=>({}));
    this.reset(world.chapter);
  }
  disposeProps(){
    this.actors.forEach(a=>a.dispose());this.actors=[];
    this.group.traverse(o=>{o.geometry?.dispose();for(const m of Array.isArray(o.material)?o.material:[o.material])m?.dispose();});
    this.world.colliders=this.world.colliders.filter(c=>!c.detail);this.group.clear();this.gate=null;this.key=null;this.truck=null;this.packMule=null;this.guideMule=null;this.rider=null;
  }
  reset(chapter,era=this.era){
    this.loadAbort?.abort();this.loadAbort=new AbortController();
    const generation=++this.generation;this.disposeProps();this.era=era;
    this.state=createExpedition({chapter,era});this.speaker=null;this.elapsed=0;this.parkedTruck={distance:7,lateral:-4};this.guide={distance:8,lateral:chapter===1?-1.8:-1,speed:0};
    if(chapter===0)this.createGate();
    this.loadActors(chapter,generation);
  }
  ground(d,l=0){const x=this.world.pathX(d)+l;return [x,this.world.terrainHeight(x,-d),-d];}
  vehicleRotation(distance){
    // Blender exports the vehicle's nose along local +X. Rotate it into the trail tangent.
    const pathYaw=Math.atan2(this.world.pathX(distance+2)-this.world.pathX(distance),2);
    return Math.PI/2-pathYaw;
  }
  createGate(){
    const wood=material('#796244'),iron=material('#494942',.55),gold=material('#d7ac5f',.65);
    const d=expeditionPositions(this.state).gate.distance, pos=this.ground(d), fence=new THREE.Group();fence.position.set(...pos);this.group.add(fence);
    for(const x of [-12,-3,3,12]){this.world.colliders.push({id:`gate-post-${x}`,x:pos[0]+x,z:-d,radius:.16,height:1.9,baseY:pos[1],detail:true});}
    for(const x of [-7.5,7.5])this.world.colliders.push({id:`fence-${x}`,x:pos[0]+x,z:-d,halfX:4.5,halfZ:.1,height:1.8,baseY:pos[1],detail:true});
    for(const x of [-12,-3,3,12])box(fence,[.18,1.9,.21],[x,.92,0],wood);
    for(const x of [-7.5,7.5])for(const y of [.52,1.1,1.6])box(fence,[9,.12,.12],[x,y,0],wood);
    const hinge=new THREE.Group();hinge.position.set(-3,0,0);fence.add(hinge);this.gate=hinge;
    for(const y of [.35,.85,1.35,1.72])box(hinge,[6,.13,.12],[3,y,0],wood);
    for(const x of [.1,2,4,5.9])box(hinge,[.12,1.75,.14],[x,.9,0],wood);
    const brace=box(hinge,[6.2,.1,.1],[3,1,0],wood);brace.rotation.z=.22;
    box(hinge,[.2,.25,.15],[5.7,1.16,.15],gold);
    const shackle=new THREE.Mesh(new THREE.TorusGeometry(.09,.025,8,16,Math.PI),iron);shackle.position.set(5.7,1.32,.15);hinge.add(shackle);
    const keyPosition=expeditionPositions(this.state).key;const keyGround=this.ground(keyPosition.distance,keyPosition.lateral);this.world.colliders.push({id:'key-stone',x:keyGround[0],z:keyGround[2],halfX:.3,halfZ:.3,height:.45,baseY:keyGround[1],detail:true});
    const key=new THREE.Group();key.position.set(...this.ground(keyPosition.distance,keyPosition.lateral));key.position.y+=.65;this.group.add(key);this.key=key;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.13,.035,8,20),gold);key.add(ring);
    box(key,[.055,.35,.05],[0,-.27,0],gold);box(key,[.15,.055,.05],[.05,-.41,0],gold);
    const marker=new THREE.Mesh(new THREE.TorusGeometry(.55,.014,6,40),new THREE.MeshBasicMaterial({color:'#ead7a6',transparent:true,opacity:.7}));marker.rotation.x=Math.PI/2;marker.position.y=-.57;key.add(marker);
    // The key lies at a deliberately readable landmark, off the walking line.
    box(this.group,[.6,.5,.6],this.ground(keyPosition.distance,keyPosition.lateral).map((v,i)=>i===1?v+.2:v),material('#88816b'));
  }
  async loadActors(chapter,generation){
    const manifests=await this.manifest;if(generation!==this.generation)return;
    const signal=this.loadAbort.signal;
    const add=async(id,d,l,height,clip='idle',rotation=0,humanAsset=null)=>{
      const entry=humanAsset||manifests[id];if(!entry||entry.available===false)return;
      try{
        const actor=await loadWorldAsset({...entry,id,url:`${base}models/${entry.file}`,heightMeters:height,position:this.ground(d,l),rotation:[0,rotation,0]},{renderer:this.world.renderer,signal});
        if(generation!==this.generation){actor.dispose();return;}
        this.group.add(actor.root);this.actors.push(actor);actor.play(clip,{fade:this.world.reducedMotion?0:.2});if(this.world.reducedMotion)actor.update(.001);actor.travel={id,d,l,clip,human:Boolean(humanAsset)&&id!=='ruly'};
        if(id==='mule'){this.packMule=actor;actor.walkSpeedMps=entry.motion?.walkSpeedMps||1;}
        if(id==='truck')this.truck=actor;if(id==='ruly'){this.rider=actor;actor.model.position.y-=.515*1.72;}
      }catch(error){if(error.name!=='AbortError')console.warn(`SIERRA: no se pudo cargar ${id}`,error.message);}
    };
    if(this.era===2024){await add('truck',7,-4,2.1,'idle',this.vehicleRotation(7));}
    else await add('mule',6,-2.8,1.85,'idle',this.vehicleRotation(6));
    if(generation!==this.generation)return;
    // One shared mesh/texture set, two independent skeletons and animation clocks.
    let guideSource=this.packMule;
    if(!guideSource&&this.era===2024){await add('mule',8,-1,1.85,'idle',this.vehicleRotation(8));if(generation!==this.generation)return;guideSource=this.packMule;this.packMule=null;}
    if(guideSource){
      if(this.era===2024){guideSource.root.visible=false;guideSource.travel.id='guide-source';}
      const guide=await cloneWorldAsset(guideSource,{...manifests.mule,id:'guide-mule',guideLightLoad:true,position:this.ground(8,-1),rotation:[0,this.vehicleRotation(8),0]});if(generation!==this.generation){guide.dispose();return;}guide.travel={id:'guide-mule',d:8,l:-1};guide.walkSpeedMps=guideSource.walkSpeedMps;this.actors.push(guide);this.group.add(guide.root);this.guideMule=guide;
      const ruly=approvedHumanAsset(manifests,'ruly',base);if(ruly)await add('ruly',8,-1,1.72,'ride',0,ruly);
    }
    if(generation!==this.generation)return;
    for(const encounter of humanEncounters(chapter)){
      const asset=approvedHumanAsset(manifests,encounter.id,base);
      if(asset)await add(encounter.id,encounter.distance,encounter.lateral,asset.heightMeters,'idle',asset.rotation[1],asset);
      if(generation!==this.generation)return;
    }
    const entries=chapter===2?[
      ['goat',22,4.6,.8,'idle',-.7],['goat',29,5.5,.58,'walk',.9],['goat',91,-4.8,.7,'idle',2.6],
      ['chicken',35,3.8,.35,'idle',.2],['chicken',39,4.7,.31,'walk',1.1],['chicken',86,-4,.38,'idle',.4],
    ]:[['iguana',29,-4.5,.22,'idle',1.1],['goat',87,5,.7,'idle',2.2]];
    for(const entry of entries){if(generation!==this.generation)return;await add(...entry);}
  }
  actorColliders(){return this.actors.filter(a=>a.travel.human||a.travel.id==='guide-mule'||(a.travel.id==='mule'&&!this.mounted)||['goat','chicken','iguana'].includes(a.travel.id)).map(a=>({id:'actor-'+a.travel.id+'-'+a.travel.d,x:a.root.position.x,z:a.root.position.z,radius:['guide-mule','mule'].includes(a.travel.id)?.65:a.travel.human?.3:a.travel.id==='goat'?.32:.15,height:a.root.position.y+(['guide-mule','mule'].includes(a.travel.id)?2:a.travel.human?1.7:a.travel.id==='goat'?.8:.4)}));}
  guideState(){return{...this.guide,loaded:Boolean(this.guideMule&&this.rider),name:'Ruly Chávez'};}
  slopeRotation(actor,d,l){
    const angle=actor.root.rotation.y,dx=Math.cos(angle)*.65,dz=-Math.sin(angle)*.65;
    const x=this.world.pathX(d)+l;
    const rise=this.world.terrainHeight(x+dx,-d+dz)-this.world.terrainHeight(x-dx,-d-dz);
    actor.root.rotation.order='YXZ';actor.root.rotation.z=THREE.MathUtils.clamp(Math.atan2(rise,1.3),-.7,.7);
  }
  updateGuide(dt){
    if(!this.guideMule)return;
    const g=this.guide,oldX=this.world.pathX(g.distance)+g.lateral,oldD=g.distance;
    const target=Math.min(ROUTE_LENGTH+2,this.world.distance+8);
    let lane=-1;
    // Stay on the mountain side of fixed obstacles and use the river stepping stones.
    if(this.world.chapter===1&&g.distance>2&&g.distance<19)lane=-1.8;
    for(const o of this.world.obstacles)if(o.type==='rock'&&Math.abs(o.distance-g.distance)<5)lane=Math.min(lane,o.lateral-o.radius-.95);
    const advance=this.world.running?THREE.MathUtils.clamp(target-g.distance,0,dt*Math.max(5,Math.abs(this.world.travelSpeed||0)+3)):0;
    const intended=this.constrain(g.distance,g.distance+advance),newLane=THREE.MathUtils.lerp(g.lateral,lane,Math.min(1,dt*3));
    const result=resolveMovement({x:oldX,z:-oldD,dx:this.world.pathX(intended)+newLane-oldX,dz:oldD-intended,radius:.55,feet:this.world.terrainHeight(oldX,-oldD),colliders:this.world.solidColliders()});
    g.distance=-result.z;g.lateral=result.x-this.world.pathX(g.distance);g.speed=dt>0?Math.hypot(result.x-oldX,g.distance-oldD)/dt:0;
    const mule=this.guideMule;mule.root.position.set(...this.ground(g.distance,g.lateral));mule.root.rotation.y=this.vehicleRotation(g.distance);this.slopeRotation(mule,g.distance,g.lateral);
    mule.play(g.speed>.04?'walk':'idle',{timeScale:g.speed>.04?g.speed/(mule.walkSpeedMps||1):1});
    if(this.rider){
      this.rider.root.position.copy(mule.root.position);
      // Mounted export has its seat/pelvis at the local origin. Front is glTF +Z.
      const saddle=new THREE.Vector3(-.08,1.5,0).applyEuler(mule.root.rotation);this.rider.root.position.add(saddle);
      this.rider.root.rotation.order='YXZ';this.rider.root.rotation.set(0,mule.root.rotation.y+Math.PI/2,0);
      this.rider.root.rotation.x=-mule.root.rotation.z*.45;
      this.rider.play(g.speed>.04?'ride':'idle',{timeScale:Math.max(.7,g.speed)});
    }
  }
  interaction(){return interactionAt(this.state,{distance:this.world.distance,lateral:this.world.lateral});}
  interact(){const result=interactExpedition(this.state,{distance:this.world.distance,lateral:this.world.lateral});this.state=result.state;return result;}
  constrain(from,to){return constrainExpeditionMovement(this.state,from,to);}
  setMounted(value){this.mounted=value;}
  setSpeaker(speaker){this.speaker=speaker;}
  update(dt){
    this.elapsed+=dt;if(this.world.running)this.state=advanceExpedition(this.state,dt);
    if(this.gate)this.gate.rotation.y=-gateOpenness(this.state)*Math.PI*.55;
    if(this.key){this.key.visible=!this.state.keyFound;this.key.rotation.y=this.world.reducedMotion?0:this.elapsed*.6;}
    if(this.era===2024&&this.mounted)this.parkedTruck={distance:this.world.distance,lateral:THREE.MathUtils.clamp(this.world.lateral+3.2,-5.5,5.5)};
    this.updateGuide(this.world.running?dt:0);
    for(const actor of this.actors){
      if(actor.travel.human){const clip=humanEncounterAnimation(actor.travel.id,this.speaker);if(!actor.play(clip))actor.play('idle');}
      const {id,d,l}=actor.travel;
      if(id==='mule'){
        actor.root.visible=true;
        const follow=this.mounted?this.world.distance+.6:Math.max(d,this.world.distance-1.5);
        const position=this.ground(follow,this.mounted?this.world.lateral:l);
        const dx=position[0]-actor.root.position.x,dz=position[2]-actor.root.position.z;
        // A load or mount transition relocates the model; it is not a footstep.
        // An unmounted mule may also remain parked while the player moves.
        const continuous=actor.travel.followMounted===this.mounted;
        const groundSpeed=continuous&&this.world.running&&dt>0?Math.hypot(dx,dz)/dt:0;
        const moving=groundSpeed>.05,direction=dz>1e-6?-1:1;
        actor.root.position.set(...position);
        if(!continuous)actor.root.rotation.y=this.vehicleRotation(follow);
        else if(moving){
          // +X is the model's front. Face the actual path (including strafing),
          // retaining forward orientation and reversing the clip when retreating.
          const heading=Math.atan2(-dz*direction,dx*direction);
          const turn=Math.atan2(Math.sin(heading-actor.root.rotation.y),Math.cos(heading-actor.root.rotation.y));
          actor.root.rotation.y+=turn*Math.min(1,dt*10);
        }
        this.slopeRotation(actor,follow,this.mounted?this.world.lateral:l);actor.travel.followMounted=this.mounted;
        actor.play(moving?'walk':'idle',{timeScale:moving?direction*groundSpeed/actor.walkSpeedMps:1});
      }
      if(['goat','chicken','iguana'].includes(id)){
        const near=Math.hypot(this.world.distance-d,this.world.lateral-l)<4.2;
        const side=l<0?-1:1,target=l+(near?side*1.2:Math.sin(this.elapsed*.7+d)*.5),current=actor.root.position.x-this.world.pathX(d);
        const shift=this.world.running?THREE.MathUtils.clamp(target-current,-dt*.8,dt*.8):0;
        const px=this.world.pathX(d)+current,pz=-d;
        const resolved=resolveMovement({x:px,z:pz,dx:shift,dz:0,radius:id==='goat'?.28:.13,feet:this.world.terrainHeight(px,pz),colliders:this.world.solidColliders()});
        actor.root.position.set(resolved.x,this.world.terrainHeight(resolved.x,resolved.z),resolved.z);
        if(Math.abs(shift)>.003){actor.root.rotation.y=side>0?-Math.PI/2:Math.PI/2;actor.play('walk');}else actor.play('idle');
      }
      if(id==='truck'){
        actor.root.position.set(...this.ground(this.parkedTruck.distance,this.parkedTruck.lateral));
        actor.root.rotation.y=this.vehicleRotation(this.parkedTruck.distance);
        actor.root.visible=!this.mounted;
      }
      if(!this.world.reducedMotion)actor.update(dt);
    }
  }
  destroy(){this.generation++;this.loadAbort?.abort();this.disposeProps();this.group.removeFromParent();}
}
