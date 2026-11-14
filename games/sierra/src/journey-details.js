import * as THREE from 'three';
import {loadWorldAsset} from './world-assets.js';
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
    this.group.clear();this.gate=null;this.key=null;this.truck=null;this.packMule=null;
  }
  reset(chapter,era=this.era){
    const generation=++this.generation;this.disposeProps();this.era=era;
    this.state=createExpedition({chapter,era});this.elapsed=0;this.parkedTruck={distance:7,lateral:-4};
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
    const d=72, pos=this.ground(d), fence=new THREE.Group();fence.position.set(...pos);this.group.add(fence);
    for(const x of [-7,-3,3,7])box(fence,[.18,1.9,.21],[x,.92,0],wood);
    for(const x of [-5,5])for(const y of [.52,1.1,1.6])box(fence,[4,.12,.12],[x,y,0],wood);
    const hinge=new THREE.Group();hinge.position.set(-3,0,0);fence.add(hinge);this.gate=hinge;
    for(const y of [.35,.85,1.35,1.72])box(hinge,[6,.13,.12],[3,y,0],wood);
    for(const x of [.1,2,4,5.9])box(hinge,[.12,1.75,.14],[x,.9,0],wood);
    const brace=box(hinge,[6.2,.1,.1],[3,1,0],wood);brace.rotation.z=.22;
    box(hinge,[.2,.25,.15],[5.7,1.16,.15],gold);
    const shackle=new THREE.Mesh(new THREE.TorusGeometry(.09,.025,8,16,Math.PI),iron);shackle.position.set(5.7,1.32,.15);hinge.add(shackle);
    const keyPosition=expeditionPositions(this.state).key;
    const key=new THREE.Group();key.position.set(...this.ground(keyPosition.distance,keyPosition.lateral));key.position.y+=.65;this.group.add(key);this.key=key;
    const ring=new THREE.Mesh(new THREE.TorusGeometry(.13,.035,8,20),gold);key.add(ring);
    box(key,[.055,.35,.05],[0,-.27,0],gold);box(key,[.15,.055,.05],[.05,-.41,0],gold);
    const marker=new THREE.Mesh(new THREE.TorusGeometry(.55,.014,6,40),new THREE.MeshBasicMaterial({color:'#ead7a6',transparent:true,opacity:.7}));marker.rotation.x=Math.PI/2;marker.position.y=-.57;key.add(marker);
    // The key lies at a deliberately readable landmark, off the walking line.
    box(this.group,[.6,.5,.6],this.ground(keyPosition.distance,keyPosition.lateral).map((v,i)=>i===1?v+.2:v),material('#88816b'));
  }
  async loadActors(chapter,generation){
    const manifests=await this.manifest;if(generation!==this.generation)return;
    const add=async(id,d,l,height,clip='idle',rotation=0)=>{
      const entry=manifests[id];if(!entry)return;
      try{
        const actor=await loadWorldAsset({...entry,id,url:`${base}models/${entry.file}`,heightMeters:height,position:this.ground(d,l),rotation:[0,rotation,0]},{renderer:this.world.renderer});
        if(generation!==this.generation){actor.dispose();return;}
        this.group.add(actor.root);this.actors.push(actor);actor.play(clip);actor.travel={id,d,l,clip};
        if(id==='mule')this.packMule=actor;
        if(id==='truck')this.truck=actor;
      }catch(error){console.warn(`SIERRA: no se pudo cargar ${id}`,error.message);}
    };
    if(this.era===2024){await add('truck',7,-4,2.1,'idle',this.vehicleRotation(7));}
    else await add('mule',6,-2.8,1.85,'idle',this.vehicleRotation(6));
    if(generation!==this.generation)return;
    const entries=chapter===2?[
      ['goat',22,4.6,.8,'idle',-.7],['goat',29,5.5,.58,'walk',.9],['goat',47,-4.8,.7,'idle',2.6],
      ['chicken',46,3.8,.35,'idle',.2],['chicken',50,4.7,.31,'walk',1.1],['chicken',141,-4,.38,'idle',.4],
    ]:[['iguana',29,-4.5,.22,'idle',1.1],['goat',148,5,.7,'idle',2.2]];
    for(const entry of entries){if(generation!==this.generation)return;await add(...entry);}
  }
  interaction(){return interactionAt(this.state,{distance:this.world.distance,lateral:this.world.lateral});}
  interact(){const result=interactExpedition(this.state,{distance:this.world.distance,lateral:this.world.lateral});this.state=result.state;return result;}
  constrain(from,to){return constrainExpeditionMovement(this.state,from,to);}
  setMounted(value){this.mounted=value;}
  update(dt){
    this.elapsed+=dt;if(this.world.running)this.state=advanceExpedition(this.state,dt);
    if(this.gate)this.gate.rotation.y=-gateOpenness(this.state)*Math.PI*.55;
    if(this.key){this.key.visible=!this.state.keyFound;this.key.rotation.y=this.world.reducedMotion?0:this.elapsed*.6;}
    const moving=this.world.running&&Math.abs(this.world.input.forward)>.05;
    if(this.era===2024&&this.mounted)this.parkedTruck={distance:this.world.distance,lateral:THREE.MathUtils.clamp(this.world.lateral+3.2,-5.5,5.5)};
    for(const actor of this.actors){
      if(!this.world.reducedMotion)actor.update(dt);
      const {id,d,l}=actor.travel;
      if(id==='mule'){
        actor.root.visible=true;
        const follow=this.mounted?this.world.distance+.6:Math.max(d,this.world.distance-1.5);actor.root.position.set(...this.ground(follow,this.mounted?this.world.lateral:l));
        actor.root.rotation.y=this.vehicleRotation(follow);
        actor.play(moving?'walk':'idle');
      }
      if(id==='truck'){
        actor.root.position.set(...this.ground(this.parkedTruck.distance,this.parkedTruck.lateral));
        actor.root.rotation.y=this.vehicleRotation(this.parkedTruck.distance);
        actor.root.visible=!this.mounted;
      }
    }
  }
  destroy(){this.generation++;this.disposeProps();this.group.removeFromParent();}
}
