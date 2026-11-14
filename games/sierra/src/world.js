import * as THREE from 'three';
import {JourneyDetails} from './journey-details.js';
import {ROUTE_LENGTH, trailHeight, cliffSection, movementDelta, resolveMovement} from './trail-physics.js';

// Authored playable landscape. Documentary Gaussian reconstruction is a separate bounded view.
const LENGTH = ROUTE_LENGTH;
const UP = new THREE.Vector3(0, 1, 0);
const clamp = THREE.MathUtils.clamp;
const smooth = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
const fract = n => n - Math.floor(n);
function hash(x, z = 0) { return fract(Math.sin(x * 127.1 + z * 311.7) * 43758.5453123); }
function noise(x, z) {
  const ix = Math.floor(x), iz = Math.floor(z), fx = x - ix, fz = z - iz;
  const u = fx * fx * (3 - 2 * fx), v = fz * fz * (3 - 2 * fz);
  return THREE.MathUtils.lerp(THREE.MathUtils.lerp(hash(ix, iz), hash(ix + 1, iz), u), THREE.MathUtils.lerp(hash(ix, iz + 1), hash(ix + 1, iz + 1), u), v);
}
function fbm(x, z) { return noise(x, z) * .55 + noise(x * 2.07, z * 2.07) * .27 + noise(x * 4.1, z * 4.1) * .13 + noise(x * 8.23, z * 8.23) * .05; }
function seeded(seed) { let n = seed; return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; }; }
function disposeObject(root) {
  const geometries = new Set(), materials = new Set(), textures = new Set();
  root.traverse(obj => { if (obj.geometry) geometries.add(obj.geometry); for (const m of Array.isArray(obj.material) ? obj.material : [obj.material]) { if (!m) continue; materials.add(m); if (m.map) textures.add(m.map); if (m.normalMap) textures.add(m.normalMap); if(m.bumpMap) textures.add(m.bumpMap); if(m.roughnessMap) textures.add(m.roughnessMap); } });
  geometries.forEach(g => g.dispose()); materials.forEach(m => m.dispose()); textures.forEach(t => t.dispose());
}

export class SierraWorld {
  constructor(container, callbacks = {}) {
    this.container = container;
    this.callbacks = callbacks;
    this.chapter = 0;
    this.running = false;
    this.mounted = false;
    this.distance = 0;
    this.lateral = 0;
    this.yaw = 0;
    this.pitch = 0;
    this.jumpY = 0;
    this.jumpVelocity = 0;
    this.input = { forward: 0, strafe: 0, turn: 0, jump: false };
    this.arrived = false;
    this.hazardCooldown = 0;
    this.clock = new THREE.Clock();
    this.elapsed = 0;
    this.reportAt = 0;
    this.quality = 'auto';
    this.reducedMotion = false;
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color('#a3b9bc');
    this.scene.fog = new THREE.FogExp2('#b7c2bb', .0038);
    this.camera = new THREE.PerspectiveCamera(65, 1, .09, 1500);
    this.scene.add(this.camera);
    this.renderer = new THREE.WebGLRenderer({ antialias: false, powerPreference: 'high-performance', alpha: false });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 1.75));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.06;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    this.renderer.domElement.setAttribute('aria-label', 'Paisaje tridimensional de las sierras de Valle Fértil');
    this.renderer.domElement.setAttribute('role', 'img');
    this.renderer.domElement.style.cssText = 'width:100%;height:100%;display:block;touch-action:none';
    container.appendChild(this.renderer.domElement);
    this.world = new THREE.Group();
    this.scene.add(this.world);
    this.sun = new THREE.DirectionalLight('#fff0cf', 3.5);
    this.sun.position.set(-95, 125, -100);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    this.sun.shadow.camera.left = -55; this.sun.shadow.camera.right = 55;
    this.sun.shadow.camera.top = 55; this.sun.shadow.camera.bottom = -55;
    this.sun.shadow.camera.near = 1; this.sun.shadow.camera.far = 320;
    this.sun.shadow.bias = -.0003; this.sun.shadow.normalBias = .08;
    this.scene.add(this.sun, this.sun.target);
    this.scene.add(new THREE.HemisphereLight('#b6d6e3', '#6c5c41', 2.15));
    this.createSky();
    this.createMule();
    this.createTruckCabin();
    this.resize = () => {
      const width = container.clientWidth || window.innerWidth, height = container.clientHeight || window.innerHeight;
      this.renderer.setSize(width, height, false); this.camera.aspect = width / height; this.camera.updateProjectionMatrix();
    };
    this.resizeObserver = new ResizeObserver(this.resize);
    this.resizeObserver.observe(container);
    this.resize();
    this.onContextLost = e => { e.preventDefault(); this.running = false; this.callbacks.onError?.('La vista 3D se interrumpió. Recargá la página para continuar desde tu capítulo guardado.'); };
    this.renderer.domElement.addEventListener('webglcontextlost', this.onContextLost);
    this.setChapter(0);
    this.details=new JourneyDetails(this);
    this.animate = this.animate.bind(this);
    this.frame = requestAnimationFrame(this.animate);
    requestAnimationFrame(() => this.callbacks.onReady?.());
  }

  pathX(distance) { return Math.sin(distance * .025) * 8 + Math.sin(distance * .057) * 2.3; }
  baseHeight(distance) { return trailHeight(distance,this.chapter) + Math.sin(distance * .018) * 1.7 + Math.sin(distance * .049) * .55; }
  terrainHeight(x, z) {
    const d = -z, offset = Math.abs(x - this.pathX(d));
    const local = this.baseHeight(d) + (fbm(x * .12, z * .12) - .5) * 1.7 * smooth(2.6, 12, offset);
    const rising = Math.max(0, offset - 17);
    const ridge = rising * (.30 + fbm(x * .017, z * .017) * .87);
    const strata = Math.sin(z * .022 + x * .041) * .17 + .84;
    const cliff=cliffSection(d,this.chapter),lateral=x-this.pathX(d);
    const drop=cliff.depth*smooth(cliff.edge,cliff.edge+.12,lateral);
    return local + ridge * strata + smooth(10, 80, offset) * (fbm(x * .054, z * .054) - .38) * 24 - drop;
  }

  createSky() {
    const uniforms = { time: { value: 0 }, sunDir: { value: new THREE.Vector3(-.45, .48, -.65).normalize() } };
    const skyMaterial = new THREE.ShaderMaterial({ side: THREE.BackSide, depthWrite: false, uniforms,
      vertexShader: `varying vec3 vPos; void main(){vPos=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);}`,
      fragmentShader: `varying vec3 vPos; uniform float time; uniform vec3 sunDir;
      float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
      float n(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
      void main(){vec3 d=normalize(vPos);float h=max(d.y,0.);vec3 sky=mix(vec3(.77,.81,.77),vec3(.25,.48,.62),pow(h,.55));float sun=max(dot(d,sunDir),0.);sky+=vec3(1.,.79,.47)*pow(sun,18.)*.35;sky+=vec3(1.,.91,.7)*pow(sun,700.)*2.;
      vec2 uv=d.xz/(max(d.y,.07))*.8+vec2(time*.001,0.);float cloud=n(uv*2.)*.52+n(uv*4.1)*.28+n(uv*8.3)*.13+n(uv*16.2)*.07;float c=smoothstep(.58,.78,cloud)*smoothstep(.02,.18,d.y);sky=mix(sky,vec3(.94,.93,.85),c*.72);gl_FragColor=vec4(sky,1.);}` });
    this.sky = new THREE.Mesh(new THREE.SphereGeometry(1100, 32, 16), skyMaterial);
    this.sky.frustumCulled = false;
    this.scene.add(this.sky);
  }

  makeGroundTexture() {
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
    const ctx = canvas.getContext('2d');
    const image = ctx.createImageData(512, 512);
    const random = seeded(7103);
    for (let y = 0; y < 512; y++) for (let x = 0; x < 512; x++) {
      const i = (y * 512 + x) * 4, n = fbm(x * .055, y * .055), grain = (random() - .5) * 37;
      image.data[i] = 109 + n * 78 + grain; image.data[i + 1] = 94 + n * 61 + grain; image.data[i + 2] = 68 + n * 47 + grain; image.data[i + 3] = 255;
    }
    ctx.putImageData(image, 0, 0);
    for (let i = 0; i < 750; i++) { const x = random() * 512, y = random() * 512, r = random() * 2.5 + .3; ctx.fillStyle = i % 3 === 0 ? '#7c705b' : '#b4a386'; ctx.beginPath(); ctx.ellipse(x, y, r, r * .6, random() * 6, 0, Math.PI * 2); ctx.fill(); }
    const texture = new THREE.CanvasTexture(canvas); texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(90, 130); texture.colorSpace = THREE.SRGBColorSpace; texture.anisotropy = Math.min(8, this.renderer.capabilities.getMaxAnisotropy());
    const chapter=this.chapter;
    new THREE.ImageLoader().load(`${import.meta.env.BASE_URL}textures/ground-color.webp`,img=>{if(this.chapter!==chapter||this.destroyed)return;texture.image=img;texture.needsUpdate=true;});
    return texture;
  }

  createTerrain() {
    const geo=new THREE.BufferGeometry(),points=[],faces=[],tex=[];
    const rows=[];for(let d=-195;d<-10;d+=5)rows.push(d);for(let d=-10;d<=125;d+=.65)rows.push(d);for(let d=130;d<=455;d+=5)rows.push(d);
    const columns=31;
    rows.forEach((d,row)=>{
      const edge=cliffSection(d,this.chapter).edge;
      const bands=[-230,-180,-130,-90,-65,-45,-30,-20,-14,-10,-7,-5,-3.5,-2.5,-1.5,-.5,.5,edge-.28,edge,edge+.04,edge+.12,edge+.5,edge+2,edge+5,edge+10,25,40,65,100,160,230];
      bands.forEach((l,col)=>{points.push(this.pathX(d)+l,0,-d);tex.push((this.pathX(d)+l+230)/460,(d+195)/650);if(row<rows.length-1&&col<columns-1){const i=row*columns+col;faces.push(i,i+1,i+columns,i+1,i+columns+1,i+columns);}});
    });
    geo.setAttribute('position',new THREE.Float32BufferAttribute(points,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(tex,2));geo.setIndex(faces);
    const positions = geo.attributes.position, colors = new Float32Array(positions.count * 3), c = new THREE.Color();
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i), z = positions.getZ(i), h = this.terrainHeight(x, z); positions.setY(i, h);
      const offset = Math.abs(x - this.pathX(-z));
      const grain = fbm(x * .11, z * .11), stratum = Math.sin(h * 1.6 + x * .12 + z * .07) * .035;
      const olive = smooth(.32,.68,fbm(x*.038+7,z*.038));
      c.setRGB(.83 + grain*.20 - olive*.25 + stratum, .79 + grain*.18 + olive*.16 + stratum, .60 + grain*.12 - olive*.19);
      if(offset>38)c.lerp(new THREE.Color('#a59a82'),smooth(.6,.82,grain)*.35);
      if (offset < 5) c.multiplyScalar(1.11);
      colors.set([c.r, c.g, c.b], i * 3);
    }
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3)); geo.computeVertexNormals();
    const normal=new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/ground-normal.webp`);normal.wrapS=normal.wrapT=THREE.RepeatWrapping;normal.repeat.copy(this.groundTexture.repeat);
    const roughness=new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/ground-roughness.webp`);roughness.wrapS=roughness.wrapT=THREE.RepeatWrapping;roughness.repeat.copy(this.groundTexture.repeat);
    const mat = new THREE.MeshStandardMaterial({ map: this.groundTexture, normalMap:normal,normalScale:new THREE.Vector2(.8,.8),roughnessMap:roughness, vertexColors: true, roughness: .94, metalness: 0 });
    const terrain = new THREE.Mesh(geo, mat); terrain.receiveShadow = true; this.world.add(terrain);
    // A continuous worn trail, with irregular feathered edges.
    const roadPositions = [], roadColors = [], uv = [], indices = [];
    for (let i = 0; i <= 210; i++) {
      const d = -20 + i * 1.1, x = this.pathX(d), y = this.baseHeight(d) + .055;
      const cliff=cliffSection(d,this.chapter);const width=THREE.MathUtils.lerp(2.55+Math.sin(d*.2)*.17,cliff.edge-.35,cliff.strength);
      for (const side of [-1, 1]) { roadPositions.push(x + width * side, y, -d); roadColors.push(.91, .85, .71); uv.push(side < 0 ? 0 : 1, d * .07); }
      if (i < 210) { const a = i * 2; indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2); }
    }
    const roadGeo = new THREE.BufferGeometry(); roadGeo.setAttribute('position', new THREE.Float32BufferAttribute(roadPositions, 3)); roadGeo.setAttribute('color', new THREE.Float32BufferAttribute(roadColors, 3)); roadGeo.setAttribute('uv', new THREE.Float32BufferAttribute(uv, 2)); roadGeo.setIndex(indices); roadGeo.computeVertexNormals();
    const roadTexture = new THREE.TextureLoader().load(`${import.meta.env.BASE_URL}textures/ground-color.webp`); roadTexture.colorSpace=THREE.SRGBColorSpace; roadTexture.wrapS=roadTexture.wrapT=THREE.RepeatWrapping; roadTexture.repeat.set(1, 1); roadTexture.anisotropy=this.groundTexture.anisotropy;
    const road = new THREE.Mesh(roadGeo, new THREE.MeshStandardMaterial({ map: roadTexture, roughness: 1, vertexColors: true, polygonOffset: true, polygonOffsetFactor: -1 })); road.receiveShadow = true; this.world.add(road);
    this.createMountains();
  }

  createMountains() {
    const random = seeded(650);
    for (let layer = 0; layer < 3; layer++) {
      const g = new THREE.PlaneGeometry(1500, 230, 140, 16); const p = g.attributes.position;
      for (let i = 0; i < p.count; i++) {
        const x = p.getX(i), y = p.getY(i), t = (y + 115) / 230;
        const peak = 90 + fbm(x * .007 + layer * 3, layer * 17) * 230 + Math.sin(x * .019 + layer) * 30;
        p.setY(i, t * peak - 22); p.setZ(i, Math.sin(x * .006) * 30 + noise(x * .04, t * 4) * 12);
      }
      g.computeVertexNormals();
      const colors = ['#7e837a', '#899690', '#9baaa3'];
      const m = new THREE.MeshStandardMaterial({ color: colors[layer], roughness: 1, flatShading: false });
      const ridge = new THREE.Mesh(g, m); ridge.position.set(layer * 30 - 20, -4, -430 - layer * 100); this.world.add(ridge);
    }
  }

  createVegetation() {
    const random = seeded(2391 + this.chapter * 19), dummy = new THREE.Object3D();
    const rockGeo = new THREE.SphereGeometry(1, 18, 12), rockPos = rockGeo.attributes.position;
    for (let i = 0; i < rockPos.count; i++) { const x = rockPos.getX(i), y = rockPos.getY(i), z = rockPos.getZ(i), scale = .8 + noise(x * 3 + 3, z * 3 + y) * .4; rockPos.setXYZ(i, x * scale, y * scale, z * scale); }
    rockGeo.computeVertexNormals();
    this.rockDetail=this.makeRockDetail();
    const rockMat = new THREE.MeshStandardMaterial({ color: '#a39b85', roughness: .98, bumpMap:this.rockDetail, bumpScale:.22 });
    const rocks = new THREE.InstancedMesh(rockGeo, rockMat, 450); rocks.castShadow = true; rocks.receiveShadow = true;
    const color = new THREE.Color();
    for (let i = 0; i < 450; i++) { const d = random() * 340 - 30, side = random() > .5 ? 1 : -1, offset = 4 + random() * 100, x = this.pathX(d) + offset * side, size = .3 + random() ** 3 * 5; dummy.position.set(x, this.terrainHeight(x, -d) + size * .27, -d); dummy.rotation.set(random(), random() * 6, random()); dummy.scale.set(size * (1 + random()), size * .7, size);
      if(d>=-2&&d<=LENGTH+5&&offset-dummy.scale.x<4.5){dummy.position.x=this.pathX(d)+side*(4.5+dummy.scale.x);dummy.position.y=this.terrainHeight(dummy.position.x,-d)+size*.27;}
      if(d>=-3&&d<=LENGTH+5&&Math.abs(dummy.position.x-this.pathX(d))-dummy.scale.x<13)this.colliders.push({id:`stone-${i}`,x:dummy.position.x,z:-d,radius:Math.max(dummy.scale.x,dummy.scale.z)*1.02,height:size*1.25,baseY:this.terrainHeight(dummy.position.x,-d)});
      dummy.updateMatrix(); rocks.setMatrixAt(i, dummy.matrix); color.setHSL(.09 + random() * .035, .12 + random() * .13, .34 + random() * .18); rocks.setColorAt(i, color); }
    this.world.add(rocks); this.rocks = rocks;
    // Multi-stem bunchgrass instead of single upright billboard planes.
    const grassPositions = [], grassColors = [], grassIndices = [];
    for (let blade = 0; blade < 7; blade++) {
      const angle = blade * 2.399, bx = Math.cos(angle) * .16, bz = Math.sin(angle) * .16, h = .4 + hash(blade) * .45, w = .035;
      const base = grassPositions.length / 3;
      grassPositions.push(bx - w, 0, bz, bx + w, 0, bz, bx + Math.cos(angle) * .29, h, bz + Math.sin(angle) * .25);
      grassColors.push(.39,.39,.2,.39,.39,.2,.64,.6,.34); grassIndices.push(base, base + 1, base + 2);
    }
    const grassGeo = new THREE.BufferGeometry(); grassGeo.setAttribute('position', new THREE.Float32BufferAttribute(grassPositions, 3)); grassGeo.setAttribute('color', new THREE.Float32BufferAttribute(grassColors, 3)); grassGeo.setIndex(grassIndices); grassGeo.computeVertexNormals();
    const grassMat = new THREE.MeshStandardMaterial({ color: '#c3bb85', vertexColors: true, side: THREE.DoubleSide, roughness: 1 });
    const grass = new THREE.InstancedMesh(grassGeo, grassMat, 4200);
    for (let i = 0; i < 4200; i++) { const d = random() * 300 - 25, offset = (3.2 + random() ** 1.8 * 95) * (random() > .5 ? 1 : -1), x = this.pathX(d) + offset, scale = .6 + random() * 1.2; dummy.position.set(x, this.terrainHeight(x, -d), -d); dummy.rotation.set(0, random() * 6, 0); dummy.scale.setScalar(scale); dummy.updateMatrix(); grass.setMatrixAt(i, dummy.matrix); }
    this.world.add(grass); this.grass = grass;
    this.foliageTexture=this.makeFoliageTexture();
    const scrubGeo=this.makeFoliageGeometry();
    const scrubMat=new THREE.MeshStandardMaterial({map:this.foliageTexture,alphaTest:.42,side:THREE.DoubleSide,roughness:1,color:'#e2dfb7'});
    const shrubs = new THREE.InstancedMesh(scrubGeo,scrubMat,2200); shrubs.castShadow=true;shrubs.receiveShadow=true;
    for(let i=0;i<2200;i++){
      const d=random()*330-25,offset=(4.6+random()**1.3*96)*(random()>.5?1:-1),x=this.pathX(d)+offset,size=.6+random()*1.15;
      dummy.position.set(x,this.terrainHeight(x,-d),-d);dummy.rotation.set(0,random()*6,0);dummy.scale.set(size*(.8+random()*.6),size,size);dummy.updateMatrix();shrubs.setMatrixAt(i,dummy.matrix);
      color.setHSL(.14+random()*.065,.12+random()*.18,.57+random()*.22);shrubs.setColorAt(i,color);
    }
    this.world.add(shrubs);this.shrubs=shrubs;
    // Open, irregular monte along the valley, with visible branches and leaf gaps.
    for(const [offset,d,size] of [[-11,20,.8],[17,38,1],[-22,64,1.1],[13,99,.85],[-18,126,1],[23,152,1.15],[-12,172,.9],[19,190,1.1]])this.createTree(this.pathX(d)+offset,-d,size);
    if([2,4,5].includes(this.chapter))for(const [x,d]of[[-14,165],[18,155]])this.createTree(this.pathX(d)+x,-d,1.2);
  }

  makeRockDetail(){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),pixels=ctx.createImageData(256,256);
    for(let y=0;y<256;y++)for(let x=0;x<256;x++){const i=(y*256+x)*4;const n=fbm(x*.12,y*.12)*.7+noise(x*.8,y*.8)*.3;const v=50+n*175;pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=v;pixels.data[i+3]=255;}
    ctx.putImageData(pixels,0,0);const texture=new THREE.CanvasTexture(canvas);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.repeat.set(2,2);return texture;
  }

  makeFoliageTexture(){
    const canvas=document.createElement('canvas');canvas.width=canvas.height=256;const ctx=canvas.getContext('2d'),random=seeded(949);
    ctx.lineCap='round';
    for(let branch=0;branch<18;branch++){
      const a=-Math.PI*.91+branch/17*Math.PI*.82,length=55+random()*120,endX=128+Math.cos(a)*length,endY=250+Math.sin(a)*length;
      ctx.strokeStyle='#756541';ctx.lineWidth=1+random()*2;ctx.beginPath();ctx.moveTo(128,252);ctx.quadraticCurveTo(128+(endX-128)*.35,endY+45,endX,endY);ctx.stroke();
      for(let leaf=0;leaf<36;leaf++){
        const t=.15+random()*.85,x=128+(endX-128)*t+(random()-.5)*57*t,y=250+(endY-250)*t+(random()-.5)*41*t;
        const colors=['#7f8c4b','#8a924f','#6d8046','#9d9c60','#b1a367','#5d703e'];ctx.fillStyle=colors[Math.floor(random()*colors.length)];ctx.beginPath();ctx.ellipse(x,y,2+random()*4,1+random()*2,random()*Math.PI,0,Math.PI*2);ctx.fill();
      }
    }
    const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;texture.anisotropy=Math.min(4,this.renderer.capabilities.getMaxAnisotropy());return texture;
  }

  makeFoliageGeometry(){
    const positions=[],uvs=[],indices=[];
    for(let i=0;i<3;i++){const angle=i*Math.PI/3,x=Math.cos(angle)*.9,z=Math.sin(angle)*.9,base=positions.length/3;positions.push(-x,0,-z,x,0,z,x,1.9,z,-x,1.9,-z);uvs.push(0,0,1,0,1,1,0,1);indices.push(base,base+1,base+2,base,base+2,base+3);}
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));geo.setIndex(indices);geo.computeVertexNormals();return geo;
  }

  createTree(x,z,scale=1){
    this.colliders.push({id:`tree-${x}-${z}`,x,z,radius:.25*scale,height:3.6*scale,baseY:this.terrainHeight(x,z)});
    const group=new THREE.Group(),wood=new THREE.MeshStandardMaterial({color:'#6d624b',roughness:1,bumpMap:this.rockDetail,bumpScale:.12}),leaf=new THREE.MeshStandardMaterial({map:this.foliageTexture,color:'#cccfa4',alphaTest:.42,side:THREE.DoubleSide,roughness:1});
    const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.07,.22,3.6,9),wood);trunk.position.y=1.8;trunk.rotation.z=.07;trunk.castShadow=true;group.add(trunk);
    const foliage=this.makeFoliageGeometry();
    for(let i=0;i<7;i++){const a=i*2.399,y=1.6+hash(i,3)*1.6;const branch=new THREE.Mesh(new THREE.CylinderGeometry(.024,.075,2,7),wood);branch.position.set(Math.cos(a)*.6,y+.7,Math.sin(a)*.6);branch.rotation.z=Math.cos(a)*.8;branch.rotation.x=Math.sin(a)*.8;branch.castShadow=true;group.add(branch);const crown=new THREE.Mesh(foliage,leaf);crown.position.set(Math.cos(a)*1.2,y,Math.sin(a)*1.2);crown.rotation.y=a;crown.scale.set(1.2,1.1,1.2);crown.castShadow=true;group.add(crown);}
    group.position.set(x,this.terrainHeight(x,z),z);group.scale.setScalar(scale);this.world.add(group);
  }

  createRiver() {
    const d = 10, y = this.baseHeight(d) + .075;
    const waterGeo = new THREE.PlaneGeometry(100, 13, 80, 16); waterGeo.rotateX(-Math.PI / 2);
    const waterMat = new THREE.MeshStandardMaterial({ color: '#487c79', roughness: .25, metalness: .34, transparent: true, opacity: .9 });
    const water = new THREE.Mesh(waterGeo, waterMat); water.position.set(this.pathX(d), y, -d); water.receiveShadow = true;
    this.world.add(water); this.water = water;
    const foamPositions=[];
    for(let i=0;i<120;i++){const x=hash(i,4)*96-48,z=hash(i,5)*12-6;foamPositions.push(x,y+.1,z,x+.3+hash(i,6)*1.1,y+.1,z+.04);}
    const foamGeo=new THREE.BufferGeometry();foamGeo.setAttribute('position',new THREE.Float32BufferAttribute(foamPositions,3));this.foam=new THREE.LineSegments(foamGeo,new THREE.LineBasicMaterial({color:'#c2d4c3',transparent:true,opacity:.35}));this.foam.position.set(this.pathX(d),0,-d);this.world.add(this.foam);
    const rockMat = new THREE.MeshStandardMaterial({ color: '#9b917d', roughness: .92 });
    for (let i = 0; i < 9; i++) { const dist = d - 6 + i * 1.5, x = this.pathX(dist) - 1.8 + Math.sin(i * .7) * .25; const stone = new THREE.Mesh(new THREE.SphereGeometry(1, 12, 8), rockMat); stone.scale.set(1.0,.28,.7); stone.position.set(x,y+.05,-dist); stone.castShadow=true; stone.receiveShadow=true; this.world.add(stone); }
  }

  mesh(geometry, material, x, y, z, parent = this.world) { const mesh = new THREE.Mesh(geometry, material); mesh.position.set(x,y,z); mesh.castShadow=true; mesh.receiveShadow=true; parent.add(mesh); return mesh; }

  createBuilding(school = false) {
    const d = LENGTH+8, x = this.pathX(d) + 5, y = this.baseHeight(d), group = new THREE.Group();
    const wall = new THREE.MeshStandardMaterial({ color: school ? '#e1d8bf' : '#bfa67f', roughness: .95 });
    const roof = new THREE.MeshStandardMaterial({ color: '#6d675e', roughness: .8, metalness: .12 });
    const dark = new THREE.MeshStandardMaterial({ color: '#343c39', roughness: .9 });
    const wood = new THREE.MeshStandardMaterial({ color: '#79664b', roughness: .95 });
    this.mesh(new THREE.BoxGeometry(12,4.7,7),wall,0,2.35,0,group);
    const roofMesh=this.mesh(new THREE.BoxGeometry(13.3,.3,8.2),roof,0,4.8,0,group);roofMesh.rotation.z=.035;
    for(let i=0;i<17;i++)this.mesh(new THREE.BoxGeometry(.055,.07,8.3),roof,-6.5+i*.8,5,0,group);
    this.mesh(new THREE.BoxGeometry(1.6,3,.1),dark,-.7,1.5,3.56,group);
    this.mesh(new THREE.BoxGeometry(1.5,2.9,.12),wood,-1,1.45,3.67,group).rotation.y=.35;
    for(const wx of [-4,3.5]){this.mesh(new THREE.BoxGeometry(2.1,1.7,.13),wood,wx,2.6,3.58,group);this.mesh(new THREE.BoxGeometry(1.85,1.45,.14),dark,wx,2.6,3.66,group);this.mesh(new THREE.BoxGeometry(.075,1.5,.19),wood,wx,2.6,3.75,group);}
    const porch=this.mesh(new THREE.BoxGeometry(13,.15,2.5),roof,0,3.7,4.5,group);porch.rotation.x=.07;
    for(const px of [-5.5,5.5])this.mesh(new THREE.CylinderGeometry(.1,.12,3.8,8),wood,px,1.9,5.4,group);
    this.mesh(new THREE.BoxGeometry(13,.15,3),wall,0,.06,4.8,group);
    if(school){
      const canvas=document.createElement('canvas');canvas.width=512;canvas.height=96;const ctx=canvas.getContext('2d');ctx.fillStyle='#e8e2cf';ctx.fillRect(0,0,512,96);ctx.fillStyle='#3b4640';ctx.font='bold 29px sans-serif';ctx.textAlign='center';ctx.fillText('ESCUELA DE LA SIERRA',256,59);const texture=new THREE.CanvasTexture(canvas);texture.colorSpace=THREE.SRGBColorSpace;const sign=new THREE.Mesh(new THREE.PlaneGeometry(4,.75),new THREE.MeshStandardMaterial({map:texture,roughness:1}));sign.position.set(0,4.2,3.61);group.add(sign);
      const pole=this.mesh(new THREE.CylinderGeometry(.045,.06,8,8),new THREE.MeshStandardMaterial({color:'#a2a49c',metalness:.6,roughness:.5}),-10,4,7,group);
      const flagGeo=new THREE.PlaneGeometry(2.3,1.35,14,8);const flagColors=[];for(let i=0;i<flagGeo.attributes.position.count;i++){const py=flagGeo.attributes.position.getY(i),c=new THREE.Color(Math.abs(py)<.24?'#eee9d6':'#75afca');flagColors.push(c.r,c.g,c.b);}flagGeo.setAttribute('color',new THREE.Float32BufferAttribute(flagColors,3));this.flag=new THREE.Mesh(flagGeo,new THREE.MeshStandardMaterial({vertexColors:true,side:THREE.DoubleSide,roughness:1}));this.flag.position.set(-8.83,7.1,7);group.add(this.flag);
    } else {
      const table=this.mesh(new THREE.BoxGeometry(2.8,.14,1.1),wood,3,1.15,5,group);for(const tx of [1.9,4.1])for(const tz of [4.6,5.4])this.mesh(new THREE.BoxGeometry(.12,1.1,.12),wood,tx,.55,tz,group);
      const bookMat=new THREE.MeshStandardMaterial({color:'#efe6c9',roughness:1});this.mesh(new THREE.BoxGeometry(.48,.1,.65),bookMat,3,1.28,5,group);
    }
    group.position.set(x,y,-d);this.world.add(group);this.colliders.push({id:"building",x,z:-d,halfX:6.5,halfZ:5.5,height:5,baseY:y});
  }

  createAnimal(type, d, offset) {
    const group=new THREE.Group(), tawny=new THREE.MeshStandardMaterial({color:type==='fox'?'#9d6c43':'#8e8066',roughness:1}), dark=new THREE.MeshStandardMaterial({color:'#393b30',roughness:1});
    const body=this.mesh(new THREE.SphereGeometry(1,14,9),tawny,0,.7,0,group);body.scale.set(.8,.35,.27);
    const neck=this.mesh(new THREE.SphereGeometry(1,12,8),tawny,-.6,.9,0,group);neck.scale.set(.3,.38,.24);
    const head=this.mesh(new THREE.SphereGeometry(1,12,8),tawny,-.86,1.1,0,group);head.scale.set(.33,.22,.21);
    const snout=this.mesh(new THREE.SphereGeometry(1,10,6),tawny,-1.1,1.04,0,group);snout.scale.set(.2,.12,.13);
    for(const ez of [-.13,.13]){const ear=this.mesh(new THREE.ConeGeometry(.1,.22,8),tawny,-.78,1.32,ez,group);ear.rotation.z=.18;}
    group.userData.legs=[];for(const lx of [-.53,.52])for(const lz of [-.17,.17])group.userData.legs.push(this.mesh(new THREE.CylinderGeometry(.065,.055,.65,8),tawny,lx,.35,lz,group));
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(.7,.8,0),new THREE.Vector3(1.2,.62,0),new THREE.Vector3(1.7,.42,.15)]);this.mesh(new THREE.TubeGeometry(curve,12,type==='fox'?.12:.05,6,false),tawny,0,0,0,group);
    if(type==='fox')group.scale.setScalar(.8);else group.scale.setScalar(1.25);
    const x=this.pathX(d)+offset;group.position.set(x,this.terrainHeight(x,-d),-d);group.rotation.y=.25;this.world.add(group);
    return group;
  }

  createBirds() {
    this.birds=[];
    const mat=new THREE.MeshStandardMaterial({color:'#383b33',roughness:1,side:THREE.DoubleSide});
    for(let i=0;i<4;i++){
      const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([-3,0,.1,-1.5,.15,-.2,0,0,0,3,0,.1,1.5,.15,-.2,0,0,0,-.2,0,.5,.2,0,.5,0,0,-.5],3));geo.computeVertexNormals();const bird=new THREE.Mesh(geo,mat);bird.position.set(i*30-50,30+i*9,-90-i*35);bird.scale.setScalar(.65+i*.12);this.world.add(bird);this.birds.push(bird);
    }
  }

  createMule() {
    this.mule = new THREE.Group();
    const coat=new THREE.MeshStandardMaterial({color:'#756c5b',roughness:.95}), mane=new THREE.MeshStandardMaterial({color:'#35362f',roughness:1}), leather=new THREE.MeshStandardMaterial({color:'#463725',roughness:.8});
    const neck=this.mesh(new THREE.SphereGeometry(1,20,14),coat,0,-.13,-.27,this.mule);neck.scale.set(.28,.55,.48);
    const head=this.mesh(new THREE.SphereGeometry(1,20,14),coat,0,.16,-.6,this.mule);head.scale.set(.25,.32,.51);head.rotation.x=.3;
    const muzzle=this.mesh(new THREE.SphereGeometry(1,16,12),coat,0,.01,-1,this.mule);muzzle.scale.set(.24,.19,.23);
    for(const side of [-1,1]){const ear=this.mesh(new THREE.SphereGeometry(1,12,10),coat,side*.17,.58,-.49,this.mule);ear.scale.set(.052,.33,.062);ear.rotation.z=-side*.15;const inner=this.mesh(new THREE.SphereGeometry(1,10,8),mane,side*.17,.59,-.424,this.mule);inner.scale.set(.023,.24,.01);inner.rotation.z=-side*.15;const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(side*.25,.17,-.9),new THREE.Vector3(side*.31,-.12,-.6),new THREE.Vector3(side*.45,-.3,.2)]);this.mesh(new THREE.TubeGeometry(curve,14,.016,5,false),leather,0,0,0,this.mule);}
    for(let i=0;i<12;i++){const hair=this.mesh(new THREE.BoxGeometry(.045,.12,.045),mane,0,.25-i*.032,-.25+i*.05,this.mule);hair.rotation.x=-.4;}
    this.mule.scale.setScalar(.62);this.mule.position.set(0,-.83,-.55);this.mule.visible=false;this.camera.add(this.mule);
  }

  createTruckCabin(){
    const g=new THREE.Group();this.truckCabin=g;this.camera.add(g);g.visible=false;
    const paint=new THREE.MeshStandardMaterial({color:'#deddd1',metalness:.22,roughness:.42});
    const dark=new THREE.MeshStandardMaterial({color:'#252a26',roughness:.8});
    const hood=this.mesh(new THREE.BoxGeometry(1.85,.15,1.25),paint,0,-.94,-1.45,g);hood.rotation.x=-.12;
    this.mesh(new THREE.BoxGeometry(2,.28,.38),dark,0,-.82,-.45,g);
    for(const x of [-.89,.89]){const pillar=this.mesh(new THREE.BoxGeometry(.055,1.75,.055),paint,x,.07,-.7,g);pillar.rotation.x=.14;}
    const wheel=this.mesh(new THREE.TorusGeometry(.24,.022,8,32),dark,-.42,-.65,-.34,g);wheel.rotation.x=-.25;
    for(const angle of [0,Math.PI*2/3,Math.PI*4/3]){const spoke=this.mesh(new THREE.BoxGeometry(.02,.23,.018),dark,-.42,-.65,-.34,g);spoke.rotation.z=angle;}
    this.mesh(new THREE.BoxGeometry(.23,.025,.018),paint,-.42,-.6,-.40,g);
    this.mesh(new THREE.BoxGeometry(.27,.1,.055),dark,.08,.65,-.78,g);
  }

  createObstacles() {
    const configs = [
      [{type:'rock',distance:28,lateral:0,radius:1.35}],
      [{type:'river',distance:10,lateral:0,radius:9}],
      [{type:'rock',distance:27,lateral:1,radius:1.25}],
      [{type:'wildlife',distance:25,lateral:-.3,radius:1.8},{type:'rock',distance:82,lateral:1.3,radius:1.35}],
      [{type:'rock',distance:27,lateral:-.9,radius:1.35}],
      [{type:'wildlife',distance:26,lateral:.7,radius:1.5}],
    ];
    this.obstacles=configs[this.chapter].map(o=>({...o,hit:false,passed:false}));
    const mat=new THREE.MeshStandardMaterial({color:'#9c927a',roughness:1,bumpMap:this.rockDetail,bumpScale:.22});
    for(const o of this.obstacles){
      if(o.type==='rock'){const x=this.pathX(o.distance)+o.lateral;const rock=this.mesh(new THREE.SphereGeometry(1,20,14),mat,x,this.baseHeight(o.distance)+.23,-o.distance);rock.scale.set(o.radius,.65,.82);rock.rotation.set(.3,.7,.15);this.colliders.push({id:'obstacle-'+o.distance,x,z:-o.distance,radius:o.radius,height:.95,baseY:this.baseHeight(o.distance),hazard:true});}
      if(o.type==='wildlife'){o.actor=this.createAnimal(this.chapter===3?'puma':'fox',o.distance,o.lateral);o.originLateral=o.lateral;}
    }
    if(this.chapter===1)this.createRiver();
  }

  createFinds(){
    const labels=['Una huella del camino','Un sonido para recordar','Una palabra para el libro'];
    this.finds=[12,46,81].map((distance,id)=>{
      const lateral=[0,-.6,-1.1][id],g=new THREE.Group(),paper=new THREE.MeshStandardMaterial({color:'#f1ddaa',roughness:.9}),cover=new THREE.MeshStandardMaterial({color:'#6e754d',roughness:.85});
      this.mesh(new THREE.BoxGeometry(.48,.06,.37),cover,0,0,0,g);this.mesh(new THREE.BoxGeometry(.43,.075,.32),paper,0,.025,0,g);
      const ring=new THREE.Mesh(new THREE.TorusGeometry(.42,.018,6,36),new THREE.MeshBasicMaterial({color:'#ebd39a'}));ring.rotation.x=Math.PI/2;ring.position.y=-.17;g.add(ring);
      g.position.set(this.pathX(distance)+lateral,this.baseHeight(distance)+1.05,-distance);this.world.add(g);return{id,distance,lateral,label:labels[id],mesh:g,found:false};
    });
  }
  createCliffMarkers(){
    const mat=new THREE.MeshStandardMaterial({color:'#8c7e62',roughness:1,bumpMap:this.rockDetail,bumpScale:.15});
    for(let d=47;d<=73;d+=2){const edge=cliffSection(d,this.chapter).edge;for(const lateral of [edge-.08,-2.8]){const x=this.pathX(d)+lateral;const m=this.mesh(new THREE.SphereGeometry(1,10,7),mat,x,this.baseHeight(d)-.06,-d);m.scale.set(.12,.12,.28);}}
  }

  setChapter(index) {
    this.chapter=Number.isFinite(Number(index))?clamp(Math.floor(Number(index)),0,5):0;
    this.running=false;this.distance=0;this.lateral=0;this.travelSpeed=0;this.yaw=0;this.pitch=0;this.jumpY=0;this.jumpVelocity=0;this.arrived=false;this.hazardCooldown=0;this.reportAt=0;this.colliders=[];this.fallTime=0;this.fallStart=0;this.warnedCornice=false;this.found=[];
    this.input={forward:0,strafe:0,turn:0,jump:false};
    disposeObject(this.world);this.world.clear();this.water=null;this.foam=null;this.flag=null;
    this.groundTexture=this.makeGroundTexture();this.createTerrain();this.createVegetation();this.createObstacles();this.createBirds();this.createFinds();this.createCliffMarkers();
    if([2,5].includes(this.chapter))this.createBuilding(true);
    if(this.chapter===4)this.createBuilding(false);
    const postMat=new THREE.MeshStandardMaterial({color:'#6d5940',roughness:1});
    for(const side of [-1,1])this.mesh(new THREE.CylinderGeometry(.07,.11,1.5,8),postMat,this.pathX(LENGTH)+side*3.1,this.baseHeight(LENGTH)+.7,-LENGTH);
    this.details?.reset(this.chapter);
    this.setQuality(this.quality);this.updateCamera(0);this.callbacks.onProgress?.({progress:0,distance:0,speed:0});
  }

  solidColliders(){return this.colliders.map(c=>({...c,height:(c.baseY||0)+c.height}));}
  setRunning(value) { this.running=Boolean(value); if(!value)this.input={forward:0,strafe:0,turn:0,jump:false}; }
  setMounted(value) { this.mounted=Boolean(value);this.mule.visible=this.mounted&&this.details?.era!==2024&&!this.details?.packMule;this.truckCabin.visible=this.mounted&&this.details?.era===2024;this.details?.setMounted(this.mounted); }
  setEra(era) { this.details.reset(this.chapter,era===2024?2024:2019);this.setMounted(this.mounted); }
  setSpeaker(speaker) { this.details?.setSpeaker(speaker); }
  interact() { return this.details.interact(); }
  getInteraction() { return this.details.interaction(); }
  setSuspended(value) { this.suspended=Boolean(value); }
  setInput(input) { this.input={...this.input,...input}; }
  setLook(dx,dy) { this.yaw=THREE.MathUtils.euclideanModulo(this.yaw-(Number(dx)||0)*.003+Math.PI,Math.PI*2)-Math.PI;this.pitch=clamp(this.pitch-(Number(dy)||0)*.002,-1.15,.9); }
  setSpeed(value) { this.speedMultiplier=value===2?2:1; }
  setQuality(quality) {
    this.quality=['auto','low','high'].includes(quality)?quality:'auto';
    const low=this.quality==='low';
    this.renderer.setPixelRatio(low?1:Math.min(window.devicePixelRatio||1,this.quality==='high'?2:1.75));
    this.renderer.shadowMap.enabled=!low;
    if(this.grass)this.grass.count=low?1800:4200;
    if(this.shrubs)this.shrubs.count=low?850:2200;
    if(this.rocks)this.rocks.count=450;
    this.resize();
  }
  setReducedMotion(value) { this.reducedMotion=Boolean(value); }
  reset() { this.setChapter(this.chapter); }
  getState() { return { expedition:{...this.details?.state},assets:this.details?.actors.map(a=>({id:a.travel.id,...a.getState()})), chapter:this.chapter,progress:this.distance/LENGTH,distance:this.distance,lateral:this.lateral,mounted:this.mounted,running:this.running,arrived:this.arrived,jumping:this.jumpY>.15,speedMultiplier:this.speedMultiplier||1,finds:[...this.found],elevation:this.baseHeight(this.distance),cliff:cliffSection(this.distance,this.chapter),falling:this.fallTime>0,guide:this.details?.guideState(),obstacles:this.obstacles.map(({actor,...o})=>({...o})),quality:this.quality,reducedMotion:this.reducedMotion }; }

  updateCamera(dt) {
    const d=this.distance,x=this.pathX(d)+this.lateral,y=this.terrainHeight(x,-d);
    const moving=this.running&&Math.abs(this.travelSpeed||0)>.02;
    const animateMotion=!this.reducedMotion;
    const bob=animateMotion?(moving?Math.sin(this.elapsed*(this.mounted?9:11))*(this.mounted?.065:.034):Math.sin(this.elapsed*.7)*.007):0;
    const surface=this.fallTime?this.fallStart-8*this.fallTime*this.fallTime:y;
    this.camera.position.set(x,surface+(this.mounted?(this.details?.era===2024?2.05:2.5):1.72)+this.jumpY+bob,-d);
    const ahead=this.pathX(d+2),direction=new THREE.Vector3(ahead-this.pathX(d),0,-2).normalize();
    const pathYaw=Math.atan2(-direction.x,-direction.z);
    this.camera.rotation.order='YXZ';const grade=Math.atan2(this.baseHeight(d+2)-this.baseHeight(d),2);this.camera.rotation.set(this.pitch-.055+grade*.48,pathYaw+this.yaw,this.fallTime&&!this.reducedMotion?Math.sin(this.fallTime*3)*.04:0);
    this.mule.rotation.z=moving&&animateMotion?Math.sin(this.elapsed*5)*.018:0;
    this.mule.position.y=-.83+(moving&&animateMotion?Math.sin(this.elapsed*9)*.018:0);
    this.sky.position.copy(this.camera.position);
    this.sun.position.set(x-95,125,-d-100);this.sun.target.position.set(x,0,-d-22);
  }

  animate() {
    if(this.destroyed)return;
    this.frame=requestAnimationFrame(this.animate);
    const dt=Math.min(this.clock.getDelta(),.05);if(this.suspended)return;this.elapsed+=dt;
    const previousDistance=this.distance,previousX=this.pathX(this.distance)+this.lateral;
    let speed=0;
    if(this.running&&!this.arrived){
      if(this.fallTime>0){
        this.fallTime+=dt;
        if(this.fallTime>.65){this.running=false;this.callbacks.onHazard?.({type:'fall',fatal:true,message:'Nos salimos de la cornisa. Sigamos la huella por el lado de la montaña.'});}
      }else{
        this.yaw=THREE.MathUtils.euclideanModulo(this.yaw-(Number(this.input.turn)||0)*dt*1.7+Math.PI,Math.PI*2)-Math.PI;
        const pathYaw=-Math.atan2(this.pathX(this.distance+2)-this.pathX(this.distance),2);
        const grade=(this.baseHeight(this.distance+1)-this.baseHeight(this.distance-1))/2;
        const pace=(this.mounted?(this.details?.era===2024?5:1.85):1.6)*(this.speedMultiplier||1)/Math.sqrt(1+grade*grade);
        const delta=movementDelta({...this.input,yaw:pathYaw+this.yaw,speed:pace,dt});
        const x=this.pathX(this.distance)+this.lateral;
        const collision=resolveMovement({x,z:-this.distance,dx:delta.dx,dz:delta.dz,radius:this.mounted?.52:.3,feet:this.terrainHeight(x,-this.distance)+this.jumpY,colliders:[...this.solidColliders(),...(this.details?.actorColliders()||[]),...this.obstacles.filter(o=>o.actor).map(o=>({id:'fauna-'+o.distance,x:o.actor.position.x,z:o.actor.position.z,radius:.65,height:o.actor.position.y+1.3}))]});
        const nextDistance=clamp(this.details.constrain(this.distance,-collision.z),0,LENGTH);
        const nextLateral=clamp(collision.x-this.pathX(nextDistance),-12,12);
        const nextHeight=this.terrainHeight(this.pathX(nextDistance)+nextLateral,-nextDistance),oldHeight=this.terrainHeight(x,-this.distance);
        const stride=Math.hypot(collision.x-x,nextDistance-this.distance);
        // Climb the authored trail; rock walls cannot be scaled sideways.
        if(nextHeight-oldHeight<=Math.max(.08,stride*1.3)){this.distance=nextDistance;this.lateral=nextLateral;}
        if(this.input.jump&&this.jumpY===0&&this.jumpVelocity===0){this.jumpVelocity=this.mounted?5.4:6.6;this.input.jump=false;}
        if(this.jumpVelocity!==0||this.jumpY>0){this.jumpVelocity-=17*dt;this.jumpY+=this.jumpVelocity*dt;if(this.jumpY<=0){this.jumpY=0;this.jumpVelocity=0;}}
        this.hazardCooldown=Math.max(0,this.hazardCooldown-dt);
        const cliff=cliffSection(this.distance,this.chapter);
        if(this.distance>42&&!this.warnedCornice){this.warnedCornice=true;this.callbacks.onNotice?.('Cornisa: quedate del lado de la montaña. Podés volver al paso normal con ×2.');}
        if(cliff.strength>.5&&this.lateral>cliff.edge-.1){this.fallTime=.001;this.fallStart=oldHeight;this.jumpY=0;}
        const contact=collision.contacts.find(c=>this.colliders.find(s=>s.id===(typeof c==='string'?c:c.id))?.hazard);
        if(contact&&this.hazardCooldown===0){this.hazardCooldown=2.2;this.callbacks.onHazard?.({type:'rock',message:'La roca es sólida. Rodeala por la izquierda o saltá por encima.'});}
        for(const obstacle of this.obstacles){
          if(obstacle.actor){
            const near=Math.abs(this.distance-obstacle.distance)<7;
            const target=near?4.2:obstacle.originLateral+Math.sin(this.elapsed*.7)*1.8;
            const step=clamp(target-obstacle.lateral,-dt*1.6,dt*1.6);obstacle.lateral+=step;
            obstacle.actor.position.set(this.pathX(obstacle.distance)+obstacle.lateral,this.baseHeight(obstacle.distance),-obstacle.distance);
            obstacle.actor.rotation.y=step<0?0:Math.PI;
            obstacle.actor.userData.legs.forEach((leg,i)=>leg.rotation.z=Math.abs(step)>.001?Math.sin(this.elapsed*8+i*Math.PI)*.4:0);
          }
          if(!obstacle.passed&&this.distance>obstacle.distance+3){obstacle.passed=true;if(!obstacle.hit)this.callbacks.onNotice?.(obstacle.type==='wildlife'?'¡Buen paso! Le diste espacio a la fauna.':'¡Paso superado! Seguimos juntos.');}
          if(obstacle.hit||obstacle.passed||this.hazardCooldown>0)continue;
          let hit=obstacle.type==='river'&&Math.abs(this.distance-obstacle.distance)<5.5&&Math.abs(this.lateral+1.8)>1.1&&this.jumpY<.5;
          if(obstacle.type==='wildlife')hit=Math.hypot(this.distance-obstacle.distance,this.lateral-obstacle.lateral)<1.25;
          if(hit){obstacle.hit=true;this.hazardCooldown=2.2;this.callbacks.onHazard?.({type:obstacle.type,message:obstacle.type==='river'?'La corriente nos desequilibró. Buscá las piedras de la izquierda.':'Dale espacio a la fauna. Esperá a que se aparte.'});}
        }
        for(const item of this.finds){
          if(item.found)continue;
          item.mesh.rotation.y=this.elapsed*.7;item.mesh.position.y=this.baseHeight(item.distance)+1.05+(this.reducedMotion?0:Math.sin(this.elapsed*2+item.id)*.12);
          if(Math.hypot(this.distance-item.distance,this.lateral-item.lateral)<1.65){item.found=true;item.mesh.visible=false;this.found.push(item.id);this.callbacks.onFind?.({count:this.found.length,total:this.finds.length,label:item.label});}
        }
      }
      if(this.distance>=LENGTH){this.arrived=true;this.running=false;this.callbacks.onArrive?.();}
    }
    // Drive footsteps and camera motion from actual travel, after the gate and
    // route limits. Include lateral travel and curvature instead of input intent.
    const distanceDelta=this.distance-previousDistance;
    const xDelta=this.pathX(this.distance)+this.lateral-previousX;
    speed=dt>0?Math.hypot(xDelta,distanceDelta)/dt*(distanceDelta<0?-1:1):0;
    this.travelSpeed=speed;
    this.details?.update(dt);
    this.mule.visible=this.mounted&&this.details?.era!==2024&&!this.details?.packMule;
    this.updateCamera(dt);
    if(this.water&&!this.reducedMotion){const p=this.water.geometry.attributes.position;for(let i=0;i<p.count;i++){const x=p.getX(i),z=p.getZ(i);p.setY(i,Math.sin(x*.8+this.elapsed*2.1)*.035+Math.cos(z*1.5+this.elapsed*2.8)*.025);}p.needsUpdate=true;this.water.geometry.computeVertexNormals();if(this.foam)this.foam.position.x=this.pathX(10)+Math.sin(this.elapsed*.5)*.55;}
    if(this.flag&&!this.reducedMotion){const p=this.flag.geometry.attributes.position;for(let i=0;i<p.count;i++)p.setZ(i,Math.sin(p.getX(i)*4+this.elapsed*4+p.getY(i))*.12*(p.getX(i)+1.15)/2.3);p.needsUpdate=true;}
    for(let i=0;!this.reducedMotion&&i<this.birds.length;i++){const bird=this.birds[i],angle=this.elapsed*.06+i*1.5;bird.position.x=Math.sin(angle)*55;bird.position.z=-100-i*28+Math.cos(angle)*30;bird.rotation.y=-angle;bird.rotation.z=Math.sin(angle)*.15;}
    if(!this.reducedMotion)this.sky.material.uniforms.time.value=this.elapsed;
    if(this.elapsed-this.reportAt>.1){this.reportAt=this.elapsed;this.callbacks.onProgress?.({progress:this.distance/LENGTH,distance:this.distance,speed});}
    this.renderer.render(this.scene,this.camera);
  }

  destroy() {
    this.details?.destroy();this.destroyed=true;cancelAnimationFrame(this.frame);this.resizeObserver.disconnect();this.renderer.domElement.removeEventListener('webglcontextlost',this.onContextLost);disposeObject(this.scene);this.renderer.dispose();this.renderer.domElement.remove();
  }
}
