import * as THREE from 'three';
import { cliffSection } from './trail-physics.js';
import { WORDS } from './rewards.js';
import { loadWorldAsset } from './world-assets.js';

const base = import.meta.env?.BASE_URL || '/jugar/';
const seeded = seed => { let n = seed >>> 0; return () => { n = (n * 1664525 + 1013904223) >>> 0; return n / 4294967296; }; };
const TEXTILE = ['#d6336c', '#c62828', '#e8891d', '#3f9b57', '#2c8f8a', '#e8dcc0', '#e3b23c', '#b0235a'];

/** Dónde flota cada palabra del capítulo. Lógica pura para poder probarla. */
export function wordLayout(chapter) {
  const distances = [7, 16, 23, 31, 53, 61, 69, 87], laterals = [0, -.9, .6, -.4, -.8, -.2, -1, .5];
  return distances.map((distance, index) => {
    let lateral = laterals[index];
    if (chapter === 1 && distance < 17) lateral = -1.8; // sobre las piedras del río
    const cliff = cliffSection(distance, chapter);
    if (cliff.strength > .2) lateral = Math.min(lateral, cliff.edge - 1.9); // del lado de la montaña
    return { index, distance, lateral, high: index === 2 || index === 7 };
  });
}

/** Majadas en las laderas: centro (distancia, lateral) y cantidad. Nunca sobre el precipicio. */
export function herdLayout(chapter) {
  const random = seeded(4801 + chapter * 131), herds = [];
  for (const [distance, side] of [[12, -1], [34, 1], [58, -1], [82, 1], [106, -1], [124, 1]]) {
    const lateral = side * (15 + random() * 16), count = 14 + Math.floor(random() * 13);
    herds.push({ distance: distance + random() * 6, lateral: side > 0 && distance > 38 && distance < 78 ? -lateral : lateral, count });
  }
  return herds;
}

function stripeCanvas(threads = false) {
  const canvas = document.createElement('canvas'); canvas.width = 256; canvas.height = 64;
  const ctx = canvas.getContext('2d'), random = seeded(77);
  for (let x = 0; x < 256;) { const width = 6 + Math.floor(random() * 22); ctx.fillStyle = TEXTILE[Math.floor(random() * TEXTILE.length)]; ctx.fillRect(x, 0, width, 64); x += width; }
  // Trama: líneas finas que cruzan el tejido.
  ctx.globalAlpha = .16; ctx.fillStyle = '#2b1d12'; for (let y = 0; y < 64; y += 3) ctx.fillRect(0, y, 256, 1); ctx.globalAlpha = 1;
  if (threads) for (let x = 0; x < 256; x += 4) ctx.clearRect(x + 2, 0, 2, 64); // hilos sueltos de la urdimbre
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.anisotropy = 4;
  return texture;
}

/** Pared de piedra del lugar: piedras irregulares asentadas en barro. */
export function stoneTexture() {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d'), random = seeded(913), tones = [[178, 160, 130], [170, 152, 136], [160, 154, 142], [186, 170, 140], [152, 140, 122]];
  ctx.fillStyle = '#8a7a62'; ctx.fillRect(0, 0, 512, 512); // barro entre las piedras
  for (let y = -10; y < 512;) {
    const height = 34 + random() * 30;
    for (let x = -random() * 50; x < 512;) {
      const width = 40 + random() * 62, [r, g, b] = tones[Math.floor(random() * tones.length)], shade = .9 + random() * .18;
      const cx = x + width / 2, cy = y + height / 2, gradient = ctx.createRadialGradient(cx - width * .15, cy - height * .2, 2, cx, cy, width * .7);
      gradient.addColorStop(0, `rgb(${r * shade + 16},${g * shade + 14},${b * shade + 10})`); gradient.addColorStop(1, `rgb(${r * shade * .88},${g * shade * .87},${b * shade * .85})`);
      ctx.fillStyle = gradient; ctx.beginPath();
      // Contorno irregular: ocho puntos alrededor de una elipse.
      for (let k = 0; k <= 8; k++) { const angle = k / 8 * Math.PI * 2, wobble = k === 8 ? 1 : .86 + random() * .16, px = cx + Math.cos(angle) * (width / 2 - 2) * wobble, py = cy + Math.sin(angle) * (height / 2 - 2) * wobble; if (k) ctx.lineTo(px, py); else ctx.moveTo(px, py); }
      ctx.closePath(); ctx.fill();
      x += width - 3;
    }
    y += height - 3;
  }
  const pixels = ctx.getImageData(0, 0, 512, 512); // grano fino para que no se vea plano
  for (let i = 0; i < pixels.data.length; i += 4) { const grain = (random() - .5) * 26; pixels.data[i] += grain; pixels.data[i + 1] += grain; pixels.data[i + 2] += grain; }
  ctx.putImageData(pixels, 0, 0);
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; texture.wrapS = texture.wrapT = THREE.RepeatWrapping; texture.repeat.set(2.5, 1.2); texture.anisotropy = 4;
  return texture;
}

function letterTexture(letter, glow) {
  const canvas = document.createElement('canvas'); canvas.width = canvas.height = 128;
  const ctx = canvas.getContext('2d');
  const halo = ctx.createRadialGradient(64, 64, 8, 64, 64, 62);
  halo.addColorStop(0, 'rgba(255,236,170,.95)'); halo.addColorStop(.45, 'rgba(246,205,110,.55)'); halo.addColorStop(1, 'rgba(246,205,110,0)');
  ctx.fillStyle = halo; ctx.fillRect(0, 0, 128, 128);
  if (!glow) {
    ctx.fillStyle = '#fff6d8'; ctx.beginPath(); ctx.arc(64, 64, 36, 0, Math.PI * 2); ctx.fill();
    ctx.lineWidth = 4; ctx.strokeStyle = '#c58b2c'; ctx.stroke();
    ctx.fillStyle = '#4a3212'; ctx.font = 'italic 600 52px Georgia, serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText(letter, 64, 67);
  }
  const texture = new THREE.CanvasTexture(canvas); texture.colorSpace = THREE.SRGBColorSpace; return texture;
}

function dispose(root) {
  const textures = new Set();
  root.traverse(object => {
    if (object.userData.shared) return; // recursos de la majada: se liberan una sola vez, en destroy()
    object.geometry?.dispose();
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) { if (!material) continue; if (material.map) textures.add(material.map); material.dispose(); }
  });
  textures.forEach(texture => texture.dispose());
}

/** Palabras para recoger, destellos, majadas y el telar de palos. Recreación para jugar. */
export class JourneyExtras {
  constructor(world) {
    this.world = world; this.group = new THREE.Group(); world.scene.add(this.group);
    this.generation = 0; this.words = []; this.herds = []; this.known = 0; this.combo = 0; this.comboClock = 0; this.elapsed = 0;
    const count = 120, geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3).fill(-9999), 3));
    this.sparkles = new THREE.Points(geometry, new THREE.PointsMaterial({ color: '#ffe19a', size: .11, transparent: true, opacity: .95, blending: THREE.AdditiveBlending, depthWrite: false }));
    this.sparkles.frustumCulled = false; this.sparkleState = Array.from({ length: count }, () => ({ life: 0, velocity: new THREE.Vector3() })); this.sparkleNext = 0;
    world.scene.add(this.sparkles);
  }

  ground(distance, lateral = 0) { const x = this.world.pathX(distance) + lateral; return new THREE.Vector3(x, this.world.terrainHeight(x, -distance), -distance); }

  reset(chapter) {
    const generation = ++this.generation; this.loadAbort?.abort(); this.loadAbort = new AbortController();
    dispose(this.group); this.group.clear(); this.words = []; this.herds = []; this.herdMeshes = null; this.combo = 0; this.loom = null;
    const glow = letterTexture('', true);
    for (const slot of wordLayout(chapter)) {
      const entry = WORDS[chapter][slot.index], position = this.ground(slot.distance, slot.lateral);
      const sprite = new THREE.Sprite(new THREE.SpriteMaterial({ map: letterTexture(entry.word[0].toUpperCase(), false), transparent: true, depthWrite: false }));
      const halo = new THREE.Sprite(new THREE.SpriteMaterial({ map: glow, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, opacity: .6 }));
      halo.scale.setScalar(1.5); sprite.add(halo); sprite.scale.setScalar(.62);
      const height = slot.high ? 3.05 : 1.3; sprite.position.copy(position); sprite.position.y += height;
      this.group.add(sprite); this.words.push({ ...slot, ...entry, sprite, baseY: position.y + height, taken: false });
    }
    this.setKnown(this.known);
    if (chapter === 3) this.createLoom();
    this.loadHerds(chapter, generation);
  }

  /** En calidad liviana se dibuja la mitad de cada majada. */
  setLight(light) { this.light = Boolean(light); this.herdMeshes?.forEach((mesh, i) => { mesh.count = this.light ? Math.ceil(this.herdCounts[i] / 2) : this.herdCounts[i]; }); }

  /** Las palabras que ya están en el diccionario se ven más tenues. */
  setKnown(mask) { this.known = Number(mask) || 0; for (const item of this.words) item.sprite.material.opacity = this.known & (1 << item.index) ? .42 : 1; }

  burst(position, amount = 16) {
    const positions = this.sparkles.geometry.attributes.position;
    for (let i = 0; i < amount; i++) {
      const index = this.sparkleNext = (this.sparkleNext + 1) % this.sparkleState.length, state = this.sparkleState[index];
      state.life = .55 + Math.random() * .35; state.velocity.set((Math.random() - .5) * 2.6, 1.2 + Math.random() * 2.2, (Math.random() - .5) * 2.6);
      positions.setXYZ(index, position.x, position.y, position.z);
    }
    positions.needsUpdate = true;
  }

  createLoom() {
    // Telar criollo de palos: cuatro horcones, travesaños, lizos, peine y la urdimbre tensada.
    const loom = new THREE.Group(), world = this.world;
    const wood = new THREE.MeshStandardMaterial({ color: '#7a6247', roughness: 1 }), pale = new THREE.MeshStandardMaterial({ color: '#9c8566', roughness: 1 });
    const cord = new THREE.MeshStandardMaterial({ color: '#d9cfb6', roughness: 1 });
    const stick = (from, to, radius, material = wood) => {
      const a = new THREE.Vector3(...from), b = new THREE.Vector3(...to), mesh = new THREE.Mesh(new THREE.CylinderGeometry(radius * .82, radius, a.distanceTo(b), 7), material);
      mesh.position.copy(a).add(b).multiplyScalar(.5); mesh.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), b.clone().sub(a).normalize());
      mesh.castShadow = true; mesh.receiveShadow = true; loom.add(mesh); return mesh;
    };
    for (const x of [-1.15, 1.15]) for (const z of [-.66, .66]) {
      stick([x, 0, z], [x + (x > 0 ? .03 : -.02), 1.78, z], .062); // horcón
      stick([x, 1.7, z], [x - .13, 1.95, z], .03); stick([x, 1.7, z], [x + .13, 1.95, z], .03); // horqueta
    }
    for (const z of [-.66, .66]) { stick([-1.32, 1.8, z], [1.32, 1.8, z], .036); stick([-1.15, .46, z], [1.15, .46, z], .03, pale); }
    for (const x of [-.52, -.08, .12]) stick([x, 1.86, -.8], [x, 1.86, .8], .03);
    stick([-1.0, .86, -.72], [-1.0, .86, .72], .05); stick([1.0, .86, -.72], [1.0, .86, .72], .05); // envolvedores
    const cloth = stripeCanvas(false), threads = stripeCanvas(true);
    const plane = (width, depth, texture, x, y, options = {}) => {
      const mesh = new THREE.Mesh(new THREE.PlaneGeometry(width, depth), new THREE.MeshStandardMaterial({ map: texture, roughness: 1, side: THREE.DoubleSide, ...options }));
      mesh.rotation.x = -Math.PI / 2; mesh.rotation.z = Math.PI / 2; mesh.position.set(x, y, 0); mesh.receiveShadow = true; loom.add(mesh); return mesh;
    };
    plane(1.06, .62, cloth, -.69, .905);                           // tejido terminado
    plane(1.06, 1.38, threads, .31, .9, { alphaTest: .5 });        // urdimbre sin tejer
    const roll = new THREE.Mesh(new THREE.CylinderGeometry(.085, .085, 1.06, 14), new THREE.MeshStandardMaterial({ map: cloth, roughness: 1 }));
    roll.rotation.x = Math.PI / 2; roll.position.set(-1.0, .86, 0); roll.castShadow = true; loom.add(roll);
    const yarn = new THREE.Mesh(new THREE.CylinderGeometry(.1, .1, 1.06, 14), new THREE.MeshStandardMaterial({ map: threads, roughness: 1 }));
    yarn.rotation.x = Math.PI / 2; yarn.position.set(1.0, .86, 0); yarn.castShadow = true; loom.add(yarn);
    // Lizos: dos pares de varillas con sus hilos, colgados del travesaño.
    this.heddles = [];
    for (const [x, lift] of [[-.08, .06], [.12, -.06]]) {
      const heddle = new THREE.Group(); heddle.position.set(x, lift, 0); loom.add(heddle); this.heddles.push(heddle);
      for (const y of [1.08, .74]) { const bar = new THREE.Mesh(new THREE.CylinderGeometry(.016, .016, 1.14, 6), pale); bar.rotation.x = Math.PI / 2; bar.position.y = y; heddle.add(bar); }
      const strings = new THREE.Mesh(new THREE.PlaneGeometry(1.08, .34), new THREE.MeshStandardMaterial({ map: threads, alphaTest: .5, side: THREE.DoubleSide, color: '#e9e2cf', roughness: 1 }));
      strings.rotation.y = Math.PI / 2; strings.position.y = .91; heddle.add(strings);
      for (const z of [-.5, .5]) { const line = new THREE.Mesh(new THREE.CylinderGeometry(.007, .007, .78, 4), cord); line.position.set(0, 1.47, z); heddle.add(line); }
    }
    // Peine: marco que aprieta la trama, colgado por dos cuerdas.
    this.beater = new THREE.Group(); this.beater.position.set(-.52, 0, 0); loom.add(this.beater);
    for (const y of [1.0, .8]) { const bar = new THREE.Mesh(new THREE.BoxGeometry(.05, .04, 1.2), wood); bar.position.y = y; bar.castShadow = true; this.beater.add(bar); }
    const reed = new THREE.Mesh(new THREE.PlaneGeometry(1.14, .17), new THREE.MeshStandardMaterial({ map: threads, alphaTest: .5, side: THREE.DoubleSide, color: '#b9a585', roughness: 1 }));
    reed.rotation.y = Math.PI / 2; reed.position.y = .9; this.beater.add(reed);
    for (const z of [-.56, .56]) { const line = new THREE.Mesh(new THREE.CylinderGeometry(.008, .008, .86, 4), cord); line.position.set(0, 1.43, z); this.beater.add(line); }
    for (const z of [-.16, .16]) stick([-.75, .07, z], [.25, .11, z], .022, pale); // pedales
    // Banquito y canasto con ovillos.
    for (const [x, z] of [[-1.62, -.2], [-1.62, .2], [-1.38, -.2], [-1.38, .2]]) stick([x, 0, z], [x, .42, z], .025);
    const seat = new THREE.Mesh(new THREE.BoxGeometry(.34, .05, .52), wood); seat.position.set(-1.5, .44, 0); seat.castShadow = true; loom.add(seat);
    const basket = new THREE.Mesh(new THREE.CylinderGeometry(.24, .18, .2, 14, 1, true), new THREE.MeshStandardMaterial({ color: '#a8875a', roughness: 1, side: THREE.DoubleSide }));
    basket.position.set(-1.35, .1, .95); loom.add(basket);
    TEXTILE.slice(0, 6).forEach((color, i) => { const ball = new THREE.Mesh(new THREE.SphereGeometry(.085, 12, 8), new THREE.MeshStandardMaterial({ color, roughness: 1 })); ball.position.set(-1.35 + Math.cos(i * 1.05) * .11, .17 + (i % 2) * .08, .95 + Math.sin(i * 1.05) * .11); ball.castShadow = true; loom.add(ball); });
    // Frente a quien llega, a la izquierda de la huella, de costado para que se vea la urdimbre.
    const position = this.ground(100.2, -3.2); loom.position.copy(position); loom.rotation.y = Math.atan2(world.pathX(103) - world.pathX(99), 4) + .25;
    this.group.add(loom); this.loom = loom;
    world.colliders.push({ id: 'telar', x: position.x, z: position.z, radius: 1.5, height: 1.9, baseY: position.y });
  }

  async loadHerds(chapter, generation) {
    try {
      if (!this.herdSource) {
        const manifest = await this.world.details.manifest, entry = manifest['cabra-estatica'];
        if (!entry || generation !== this.generation) return;
        const asset = await loadWorldAsset({ ...entry, id: 'cabra-estatica', url: `${base}models/${entry.file}` }, { renderer: this.world.renderer, signal: this.loadAbort.signal });
        asset.model.updateMatrixWorld(true); const poses = []; let material = null;
        asset.model.traverse(object => { if (!object.isMesh) return; poses.push(object.geometry.clone().applyMatrix4(object.matrixWorld)); material ||= object.material; });
        this.herdSource = { poses, material: new THREE.MeshStandardMaterial({ map: material.map, roughness: .95 }), asset };
      }
      if (generation !== this.generation || !this.herdSource.poses.length) return;
      const { poses, material } = this.herdSource, random = seeded(9157 + chapter * 53), layout = herdLayout(chapter);
      const total = layout.reduce((sum, herd) => sum + herd.count, 0), tints = ['#ffffff', '#efe2cc', '#c9a67d', '#9a9a94', '#74573f', '#4a3c30'];
      const meshes = poses.map(geometry => { const mesh = new THREE.InstancedMesh(geometry, material, total); mesh.count = 0; mesh.userData.shared = true; mesh.castShadow = true; mesh.receiveShadow = true; mesh.frustumCulled = false; this.group.add(mesh); return mesh; });
      const dummy = new THREE.Object3D(), color = new THREE.Color();
      for (const herd of layout) {
        const goats = [];
        for (let i = 0; i < herd.count; i++) {
          const angle = random() * Math.PI * 2, radius = Math.sqrt(random()) * 8.5, lateral = herd.lateral + Math.cos(angle) * radius, distance = herd.distance + Math.sin(angle) * radius;
          const mesh = meshes[Math.floor(random() * meshes.length)], goat = { mesh, index: mesh.count++, distance, lateral, yaw: random() * Math.PI * 2, scale: random() < .22 ? .55 + random() * .12 : .88 + random() * .26, walker: i < 4, target: null };
          mesh.setColorAt(goat.index, color.set(tints[Math.floor(random() ** 1.6 * tints.length)])); goats.push(goat); this.placeGoat(goat, dummy);
        }
        this.herds.push({ ...herd, goats });
      }
      for (const mesh of meshes) { mesh.instanceMatrix.needsUpdate = true; if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true; }
      this.herdMeshes = meshes; this.herdCounts = meshes.map(mesh => mesh.count); this.setLight(this.light);
    } catch (error) { if (error.name !== 'AbortError') console.warn('SIERRA: no se pudieron cargar las majadas', error.message); }
  }

  placeGoat(goat, dummy) {
    const position = this.ground(goat.distance, goat.lateral);
    dummy.position.copy(position); dummy.rotation.set(0, goat.yaw, 0); dummy.scale.setScalar(goat.scale); dummy.updateMatrix(); goat.mesh.setMatrixAt(goat.index, dummy.matrix); goat.position = position;
  }

  /** Animales de las majadas que se pueden fotografiar: el más cercano de cada una. */
  subjects() {
    const camera = this.world.camera.position, list = [];
    for (const herd of this.herds) { let best = null, bestDistance = Infinity; for (const goat of herd.goats) { const d = goat.position.distanceToSquared(camera); if (d < bestDistance) { bestDistance = d; best = goat; } } if (best) list.push({ id: 'cabra', position: best.position.clone().setY(best.position.y + .5) }); }
    return list;
  }
  nearestHerdDistance() { let best = Infinity; const camera = this.world.camera.position; for (const herd of this.herds) for (const goat of herd.goats) best = Math.min(best, goat.position.distanceTo(camera)); return best; }

  update(dt) {
    this.elapsed += dt; const world = this.world, still = world.reducedMotion;
    this.comboClock = Math.max(0, this.comboClock - dt); if (!this.comboClock) this.combo = 0;
    for (const item of this.words) {
      if (item.taken) continue;
      item.sprite.position.y = item.baseY + (still ? 0 : Math.sin(this.elapsed * 2.4 + item.index) * .1);
      if (!world.running) continue;
      const reach = Math.hypot(world.distance - item.distance, world.lateral - item.lateral) < 1.35;
      if (reach && (!item.high || world.jumpY > .3)) {
        item.taken = true; item.sprite.visible = false; this.burst(item.sprite.position); this.combo++; this.comboClock = 6;
        world.callbacks.onWord?.({ index: item.index, word: item.word, meaning: item.meaning, fresh: !(this.known & (1 << item.index)), combo: this.combo, taken: this.words.filter(word => word.taken).length, total: this.words.length });
      }
    }
    const positions = this.sparkles.geometry.attributes.position; let moved = false;
    this.sparkleState.forEach((state, index) => {
      if (state.life <= 0) return;
      state.life -= dt; state.velocity.y -= 5.5 * dt; moved = true;
      if (state.life <= 0) positions.setXYZ(index, 0, -9999, 0); else positions.setXYZ(index, positions.getX(index) + state.velocity.x * dt, positions.getY(index) + state.velocity.y * dt, positions.getZ(index) + state.velocity.z * dt);
    });
    if (moved) positions.needsUpdate = true;
    if (this.loom && !still) { // Margarita teje: los lizos suben y bajan, el peine aprieta.
      const phase = this.elapsed * 1.6;
      this.heddles.forEach((heddle, i) => { heddle.position.y = Math.sin(phase + i * Math.PI) * .06; });
      this.beater.position.x = -.52 + Math.max(0, Math.sin(phase * 2 + 1)) * .09;
    }
    if (this.herdMeshes && !still) {
      const dummy = this.dummy ||= new THREE.Object3D(), touched = new Set();
      for (const herd of this.herds) for (const goat of herd.goats) {
        if (!goat.walker) continue;
        if (!goat.target || Math.hypot(goat.target[0] - goat.distance, goat.target[1] - goat.lateral) < .4) goat.target = [herd.distance + (Math.random() - .5) * 14, herd.lateral + (Math.random() - .5) * 14];
        const dd = goat.target[0] - goat.distance, dl = goat.target[1] - goat.lateral, length = Math.hypot(dd, dl) || 1, step = dt * .32;
        goat.distance += dd / length * step; goat.lateral += dl / length * step;
        const wanted = Math.atan2(dd, dl * 1 + (world.pathX(goat.distance + 1) - world.pathX(goat.distance)) * dd); // +X del modelo mira hacia donde camina
        goat.yaw += Math.atan2(Math.sin(wanted - goat.yaw), Math.cos(wanted - goat.yaw)) * Math.min(1, dt * 2);
        this.placeGoat(goat, dummy); touched.add(goat.mesh);
      }
      touched.forEach(mesh => { mesh.instanceMatrix.needsUpdate = true; });
    }
  }

  destroy() {
    this.generation++; this.loadAbort?.abort(); dispose(this.group); this.group.removeFromParent();
    this.sparkles.geometry.dispose(); this.sparkles.material.dispose(); this.sparkles.removeFromParent();
    this.herdSource?.poses.forEach(geometry => geometry.dispose()); this.herdSource?.material.dispose(); this.herdSource?.asset.dispose();
  }
}
