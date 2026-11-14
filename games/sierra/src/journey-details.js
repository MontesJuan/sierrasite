import * as THREE from 'three';
import {loadWorldAsset,cloneWorldAsset,tuneHumanSkin} from './world-assets.js';
import {approvedHumanAsset, humanEncounters, humanEncounterAnimation} from './human-characters.js';
import {ROUTE_LENGTH,resolveMovement,cliffSection} from './trail-physics.js';
import {createExpedition, expeditionPositions, gateOpenness, interactionAt, interactExpedition, advanceExpedition, constrainExpeditionMovement} from './expedition.js';

const base = import.meta.env?.BASE_URL || '/jugar/';
const material = (color, metalness=0) => new THREE.MeshStandardMaterial({color, roughness:metalness ? .38 : .85, metalness});
const box = (group, size, pos, mat) => {const m=new THREE.Mesh(new THREE.BoxGeometry(...size),mat);m.position.set(...pos);m.castShadow=true;m.receiveShadow=true;group.add(m);return m;};

// Fauna del camino. Cada especie usa su modelo nuevo si está en el manifiesto y, si no, el anterior.
const FAUNA_ASSETS={cabra:['cabra','goat'],gallina:['gallina','chicken'],lagarto:['lagarto','iguana'],pavo:['pavo'],culebra:['culebra'],puma:['puma'],condor:['condor']};
const LEGACY_HEIGHT={cabra:.75,gallina:.35,lagarto:.22};
const BODY={cabra:[.32,.8],gallina:[.15,.4],pavo:[.25,.8],lagarto:[.15,.3]}; // radio y altura de colisión
const animal=(species,d,l,scale=1,clip='idle',rotation=0,behavior='graze')=>({species,d,l,scale,clip,rotation,behavior});
const FAUNA_PLACEMENTS=[
  [animal('lagarto',29,-4.5,1,'idle',1.1),animal('cabra',87,5,1,'idle',2.2),animal('cabra',90,6.4,.8,'graze',.6),animal('culebra',72,-3.4,1.7,'idle',0,'still')],
  [animal('lagarto',33,-4.2,1,'idle',2),animal('cabra',86,4.6,1,'graze',2.6),animal('cabra',89,-4.5,.78,'idle',1),animal('cabra',91,5.6,.9,'idle',-.6)],
  [animal('cabra',22,4.6,1,'idle',-.7),animal('cabra',29,5.5,.74,'walk',.9),animal('cabra',26,6.3,.92,'graze',2),animal('cabra',91,-4.8,.95,'idle',2.6),animal('cabra',88,-5.9,.7,'graze',.3),animal('cabra',93,-6.4,1.05,'idle',1.4),
   animal('gallina',35,3.8,1,'idle',.2),animal('gallina',39,4.7,.9,'walk',1.1),animal('gallina',86,-4,1.05,'peck',.4),animal('gallina',90,3.6,1,'idle',2.4)],
  [animal('pavo',90,-4.6,1,'idle',.8),animal('pavo',93,4.4,.92,'walk',2.6),animal('pavo',95,-5.6,1.05,'peck',-.5),animal('gallina',91,3.4,1,'peck',1.2),animal('gallina',94,-3.9,.9,'idle',2.2),
   animal('cabra',86,5.4,1,'graze',2.1),animal('cabra',84,-5,.75,'idle',.4),animal('lagarto',30,-4.4,1,'idle',1.3)],
  [animal('cabra',101,-12,1,'idle',1.9,'still'),animal('cabra',104.5,-15,.72,'graze',.2,'still'),animal('cabra',99,-13.5,.95,'idle',-1,'still'),animal('cabra',105,-18,.6,'idle',2.8,'still'),animal('cabra',86,5.2,1.05,'graze',2.4),animal('cabra',89,6.2,.8,'idle',.9),animal('cabra',93,5.1,.9,'walk',-2),
   animal('culebra',37,-3.4,1.7,'idle',0,'still'),animal('lagarto',76,-4.2,1,'idle',2.6),animal('puma',58,-30,1.1,'idle',-1.2,'still')],
  [animal('cabra',87,5,1,'graze',2.2),animal('cabra',90,-5.2,.8,'idle',.5),animal('gallina',88,3.6,1,'peck',.4),animal('gallina',92,-3.8,.95,'idle',2),animal('gallina',94,4.2,.9,'walk',1.4)],
];

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
    this.world.colliders=this.world.colliders.filter(c=>!c.detail);this.group.clear();this.gate=null;this.key=null;this.truck=null;this.packMule=null;this.guideMule=null;this.rider=null;this.saddle=null;
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
        if(humanAsset)tuneHumanSkin(actor.model);
        this.group.add(actor.root);this.actors.push(actor);actor.play(clip,{fade:this.world.reducedMotion?0:.2});if(this.world.reducedMotion)actor.update(.001);actor.travel={id,d,l,clip,human:Boolean(humanAsset)&&id!=='ruly'};
        if(id==='mule'){this.packMule=actor;actor.walkSpeedMps=entry.motion?.walkSpeedMps||1;}
        if(id==='truck')this.truck=actor;if(id==='ruly'){this.rider=actor;actor.model.position.y-=.515*1.72;}
        return actor;
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
      this.saddle=createSaddle();guide.root.add(this.saddle);
      const ruly=approvedHumanAsset(manifests,'ruly',base);if(ruly)await add('ruly',8,-1,1.72,'ride',0,ruly);
    }
    if(generation!==this.generation)return;
    for(const encounter of humanEncounters(chapter)){
      const asset=approvedHumanAsset(manifests,encounter.id,base);
      if(asset)await add(encounter.id,encounter.distance,encounter.lateral,asset.heightMeters,'idle',asset.rotation[1],asset);
      if(generation!==this.generation)return;
    }
    // Fauna: modelos realistas nuevos cuando existen; si faltan, los anteriores o nada.
    const place=async(item)=>{
      const id=(FAUNA_ASSETS[item.species]||[]).find(name=>manifests[name]&&manifests[name].available!==false);if(!id)return null;
      const modern=id===item.species,height=modern?undefined:LEGACY_HEIGHT[item.species]*item.scale;
      const actor=await add(id,item.d,item.l,height,item.clip,item.rotation);if(!actor)return null;
      if(modern)actor.root.scale.setScalar(item.scale);
      actor.travel={...actor.travel,species:item.species,behavior:item.behavior,rotation:item.rotation,clip:item.clip};if(!actor.play(item.clip))actor.play('idle');return actor;
    };
    for(const item of FAUNA_PLACEMENTS[chapter]||[]){if(generation!==this.generation)return;await place(item);}
    // Escuela y ranchos modelados desde las tomas reales, cuando están publicados.
    const house={2:'escuela',5:'escuela',3:manifests['rancho-piedra']?'rancho-piedra':'rancho',4:'rancho'}[chapter];
    if(house&&manifests[house]&&manifests[house].available!==false){
      const building=await add(house,ROUTE_LENGTH+8,house==='escuela'?0:5,undefined,'idle',0);if(generation!==this.generation)return;
      if(building){building.travel.behavior='building';this.world.replaceBuilding(building.root.position,manifests[house].footprint);}
    }
    // Corral de pirca de lo de Reyes, trazado sobre la toma cenital real. La tranquera mira a la huella.
    if(chapter===4&&manifests.corral&&manifests.corral.available!==false){
      const pen=await add('corral',103,-7,undefined,'idle',Math.PI/2);if(generation!==this.generation)return;
      if(pen){pen.travel.behavior='building';this.world.addFootprint('corral',pen.root.position,manifests.corral.footprint,true);}
    }
    // Dos cóndores planeando muy alto; reemplazan a las siluetas simples.
    for(const [index,center] of [[0,58],[1,112]]){
      if(generation!==this.generation)return;
      const condor=await place(animal('condor',center,0,1,'soar',0,'soar'));if(!condor)break;
      condor.model.traverse(o=>{if(o.isMesh)o.frustumCulled=false;}); // al aletear las alas salen de la caja de la pose de reposo
      condor.travel.phase=index*2.4;condor.travel.radius=26+index*16;condor.travel.altitude=23+index*20;this.world.birds.forEach(bird=>{bird.visible=false;});
    }
    // El zorro que cruza la huella usa el modelo nuevo dentro del mismo actor del obstáculo.
    if(manifests.zorro)for(const obstacle of this.world.obstacles){
      if(!obstacle.actor||generation!==this.generation)continue;
      try{
        const fox=await loadWorldAsset({...manifests.zorro,id:'zorro',url:`${base}models/${manifests.zorro.file}`,rotation:[0,Math.PI,0],scale:1/obstacle.actor.scale.x},{renderer:this.world.renderer,signal});
        if(generation!==this.generation){fox.dispose();return;}
        obstacle.actor.children.forEach(child=>{child.visible=false;});obstacle.actor.add(fox.root);fox.travel={id:'zorro',d:obstacle.distance,l:obstacle.lateral,obstacle};fox.play('idle');this.actors.push(fox);
      }catch(error){if(error.name!=='AbortError')console.warn('SIERRA: no se pudo cargar el zorro',error.message);}
    }
  }
  actorColliders(){return this.actors.filter(a=>a.travel.human||a.travel.id==='guide-mule'||(a.travel.id==='mule'&&!this.mounted)||BODY[a.travel.species]).map(a=>{const body=BODY[a.travel.species];return{id:'actor-'+a.travel.id+'-'+a.travel.d,x:a.root.position.x,z:a.root.position.z,radius:['guide-mule','mule'].includes(a.travel.id)?.65:a.travel.human?.3:body[0],height:a.root.position.y+(['guide-mule','mule'].includes(a.travel.id)?2:a.travel.human?1.7:body[1])};});}
  /** Fauna que se puede fotografiar: especie y posición. */
  subjects(){return this.actors.filter(a=>a.travel.species).map(a=>({id:a.travel.species,position:a.root.position.clone().setY(a.root.position.y+(a.travel.species==='condor'?0:.35))}));}
  /** Distancia al animal más cercano de una especie, para el sonido. */
  nearest(species){let best=Infinity;const camera=this.world.camera.position;for(const a of this.actors)if(a.travel.species===species)best=Math.min(best,a.root.position.distanceTo(camera));return best;}
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
      if(actor.travel.behavior==='soar'){
        // Planeo en círculos amplios sobre la quebrada, con un aleteo lento cada tanto.
        const t=actor.travel,angle=this.elapsed*.11+t.phase,cx=this.world.pathX(d),cy=this.world.baseHeight(d)+t.altitude;
        actor.root.position.set(cx+Math.cos(angle)*t.radius,cy+Math.sin(this.elapsed*.2+t.phase)*3,-d+Math.sin(angle)*t.radius);
        actor.root.rotation.order='YXZ';actor.root.rotation.set(-.3,Math.atan2(-Math.cos(angle),-Math.sin(angle)),0);
        if(!actor.play(Math.sin(this.elapsed*.23+t.phase)>.86?'flap':'soar',{fade:.6}))actor.play('idle');
      }
      if(actor.travel.obstacle){const o=actor.travel.obstacle,moved=Math.abs(o.lateral-(actor.travel.last??o.lateral))>.0005;actor.travel.last=o.lateral;actor.play(moved?'walk':'idle');}
      if(actor.travel.behavior==='graze'){
        const near=Math.hypot(this.world.distance-d,this.world.lateral-l)<4.2;
        const side=l<0?-1:1,target=l+(near?side*1.2:Math.sin(this.elapsed*.7+d)*.5),current=actor.root.position.x-this.world.pathX(d);
        const shift=this.world.running?THREE.MathUtils.clamp(target-current,-dt*.8,dt*.8):0;
        const px=this.world.pathX(d)+current,pz=-d;
        const resolved=resolveMovement({x:px,z:pz,dx:shift,dz:0,radius:(BODY[actor.travel.species]||[.2])[0]*.9,feet:this.world.terrainHeight(px,pz),colliders:this.world.solidColliders()});
        actor.root.position.set(resolved.x,this.world.terrainHeight(resolved.x,resolved.z),resolved.z);
        // Al apartarse camina; si no, vuelve a lo que estaba haciendo (pastar, picotear, mirar).
        if(Math.abs(shift)>.003){actor.root.rotation.y=side>0?-Math.PI/2:Math.PI/2;actor.play('walk');}else{actor.root.rotation.y+=Math.atan2(Math.sin(actor.travel.rotation-actor.root.rotation.y),Math.cos(actor.travel.rotation-actor.root.rotation.y))*Math.min(1,dt*2);if(actor.travel.clip==='walk'||!actor.play(actor.travel.clip))actor.play('idle');}
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

/** Montura del baqueano: pelero tejido y recado sobre el lomo de la mula guía. Recreación artística. */
function createSaddle(){
  const group=new THREE.Group(),canvas=document.createElement('canvas');canvas.width=64;canvas.height=16;
  const ctx=canvas.getContext('2d');['#8f2f2a','#d9c9a3','#3c5a4a','#c9852f','#8f2f2a','#2f2a26','#d9c9a3','#8f2f2a'].forEach((color,i)=>{ctx.fillStyle=color;ctx.fillRect(i*8,0,8,16);});
  const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;
  const blanket=new THREE.Mesh(new THREE.CylinderGeometry(.33,.33,.86,18,1,true,Math.PI*.5-1.75,3.5),new THREE.MeshStandardMaterial({map:texture,roughness:1,side:THREE.DoubleSide}));
  blanket.rotation.z=Math.PI/2;blanket.scale.set(1.12,1,1.12);blanket.castShadow=true;blanket.receiveShadow=true;group.add(blanket);
  const leather=new THREE.MeshStandardMaterial({color:'#4a3524',roughness:.8});
  const seat=new THREE.Mesh(new THREE.CylinderGeometry(.345,.345,.5,18,1,true,Math.PI*.5-.95,1.9),leather);seat.rotation.z=Math.PI/2;seat.scale.set(1.14,1,1.14);seat.castShadow=true;group.add(seat);
  for(const x of [-.27,.27]){const roll=new THREE.Mesh(new THREE.CapsuleGeometry(.07,.36,4,10),leather);roll.rotation.x=Math.PI/2;roll.position.set(x,.44,0);roll.castShadow=true;group.add(roll);}
  group.position.set(-.1,1.07,0);return group;
}
