import * as THREE from 'three';
import { ENERGY, energyRate, hazardPlan, rockAt, gustAt, rockHits, snakeAt, snakeSpooks } from './hazards.js';

const clamp = THREE.MathUtils.clamp;

/** Dificultades visibles del tramo y energía de la mula. Las reglas están en hazards.js. */
export class TrailHazards {
  constructor(world) {
    this.world = world; this.group = new THREE.Group(); world.scene.add(this.group);
    this.plan = []; this.time = 0; this.cooldown = 0; this.max = ENERGY.full; this.energy = ENERGY.full; this.state = { slow: 1, push: 0, fast: false };
  }

  ground(distance, lateral = 0) { const x = this.world.pathX(distance) + lateral; return new THREE.Vector3(x, this.world.terrainHeight(x, -distance), -distance); }

  setEnergy(max) { this.max = clamp(Number(max) || ENERGY.full, ENERGY.floor, ENERGY.full); this.energy = this.max; }

  reset(chapter) {
    this.group.traverse(object => { object.geometry?.dispose(); object.material?.dispose?.(); }); this.group.clear();
    this.plan = hazardPlan(chapter).map(item => ({ ...item })); this.time = 0; this.cooldown = 0; this.energy = this.max;
    const stone = new THREE.MeshStandardMaterial({ color: '#948a76', roughness: 1 }), rockGeometry = new THREE.IcosahedronGeometry(.6, 1);
    for (const item of this.plan) {
      if (item.type === 'water') {
        // Bebedero: ronda de piedras con agua de vertiente.
        const base = this.ground(item.distance, item.lateral), group = new THREE.Group(); group.position.copy(base);
        for (let i = 0; i < 9; i++) { const rock = new THREE.Mesh(rockGeometry, stone); const angle = i / 9 * Math.PI * 2; rock.scale.set(.45, .3, .38); rock.position.set(Math.cos(angle) * .95, .1, Math.sin(angle) * .95); rock.rotation.y = angle; rock.castShadow = true; rock.receiveShadow = true; group.add(rock); }
        const water = new THREE.Mesh(new THREE.CircleGeometry(.9, 20), new THREE.MeshStandardMaterial({ color: '#4d8f96', roughness: .15, metalness: .3, transparent: true, opacity: .92 }));
        water.rotation.x = -Math.PI / 2; water.position.y = .14; group.add(water); this.group.add(group);
        this.world.colliders.push({ id: `agua-${item.distance}`, x: base.x, z: base.z, radius: .9, height: .5, baseY: base.y });
      }
      if (item.type === 'thorns') {
        // Mata espinosa al borde de la huella.
        const base = this.ground(item.distance, item.lateral), bush = new THREE.Group(); bush.position.copy(base);
        const green = new THREE.MeshStandardMaterial({ color: '#6f7d3c', roughness: 1 }), tip = new THREE.MeshStandardMaterial({ color: '#cdbf8c', roughness: 1 });
        for (let i = 0; i < 11; i++) {
          const angle = i * 2.399, tilt = .25 + (i % 4) * .22, length = .7 + (i % 3) * .22;
          const stem = new THREE.Mesh(new THREE.ConeGeometry(.07, length, 5), green); stem.position.set(Math.cos(angle) * tilt * .55, length / 2 * Math.cos(tilt), Math.sin(angle) * tilt * .55);
          stem.rotation.set(Math.sin(angle) * tilt, 0, -Math.cos(angle) * tilt); stem.castShadow = true; bush.add(stem);
          const thorn = new THREE.Mesh(new THREE.ConeGeometry(.018, .16, 4), tip); thorn.position.copy(stem.position).multiplyScalar(1.5); thorn.position.y += length * .32; thorn.rotation.copy(stem.rotation); bush.add(thorn);
        }
        this.group.add(bush);
      }
      if (item.type === 'mud') {
        // Barro sobre la huella, siguiendo la pendiente.
        const geometry = new THREE.CircleGeometry(1, 28); geometry.rotateX(-Math.PI / 2);   // charco ovalado, no un rectángulo
        const position = geometry.attributes.position, mid = item.distance + item.length / 2;
        for (let i = 0; i < position.count; i++) { const wobble = 1 + Math.sin(i * 2.7) * .08, distance = mid - position.getZ(i) * item.length / 2 * wobble, lateral = position.getX(i) * item.half * wobble, point = this.ground(distance, lateral); position.setXYZ(i, point.x, point.y + .07, point.z); }
        geometry.computeVertexNormals();
        const mud = new THREE.Mesh(geometry, new THREE.MeshStandardMaterial({ color: '#4d3d2c', roughness: .3, metalness: .05, polygonOffset: true, polygonOffsetFactor: -2 })); mud.receiveShadow = true; this.group.add(mud);
      }
      if (item.type === 'rockfall') {
        item.mesh = new THREE.Mesh(rockGeometry, stone); item.mesh.castShadow = true; item.mesh.visible = false; this.group.add(item.mesh);
      }
    }
  }

  /** Avanza un cuadro. Devuelve cuánto frena el terreno, cuánto empuja el viento y si se puede trotar. */
  step(dt) {
    const world = this.world; this.time += dt; this.cooldown = Math.max(0, this.cooldown - dt);
    let slow = 1, push = 0, mud = false, drinking = false, wind = false, nearWater = false;
    for (const item of this.plan) {
      if (item.type === 'rockfall') {
        const rock = rockAt(item, this.time); item.mesh.visible = rock.active;
        if (rock.active) { const point = this.ground(item.distance, rock.lateral); item.mesh.position.set(point.x, point.y + .55, point.z); item.mesh.rotation.z = -rock.spin; }
        const close = Math.abs(world.distance - item.distance) < 15 && world.distance < item.distance + 2;
        if (rock.warning && close && !item.warned) { item.warned = true; world.callbacks.onWarning?.('rock'); } else if (!rock.warning) item.warned = false;
        if (this.cooldown === 0 && rockHits(item, rock, world.distance, world.lateral, world.jumpY)) {
          this.cooldown = 2.4; this.energy = Math.max(1, this.energy - 10);
          world.callbacks.onHazard?.({ type: 'rockfall', message: 'Una piedra rodó desde la ladera y golpeó la carga. Cuando oigas el aviso, frená y dejala pasar.' });
        }
      }
      if (item.type === 'snake') {
        // La culebra del tramo (modelo animado) cruza la huella; darle paso es la respuesta correcta.
        const snake = snakeAt(item, this.time), actor = world.details?.actors.find(a => a.travel.species === 'culebra' && Math.abs(a.travel.d - item.distance) < 1);
        if (actor) { const point = this.ground(item.distance, snake.lateral); actor.root.position.copy(point); actor.root.rotation.set(0, 0, 0); if (!actor.play(snake.crossing ? 'slither' : 'idle')) actor.play('idle'); }
        if (actor && this.cooldown === 0 && snakeSpooks(item, snake, world.distance, world.lateral, world.jumpY)) {
          this.cooldown = 2.4; this.energy = Math.max(1, this.energy - 15); world.callbacks.onSpook?.();
        }
      }
      if (item.type === 'gust') {
        const gust = gustAt(item, this.time, world.distance); push += gust.push; wind ||= gust.push > 0;
        if (gust.warning && !item.warned) { item.warned = true; world.callbacks.onWarning?.('wind'); } else if (!gust.warning) item.warned = false;
      }
      if (item.type === 'thorns') {
        const inside = Math.hypot(world.distance - item.distance, world.lateral - item.lateral) < item.radius + .35;
        if (inside) { slow = Math.min(slow, .55); if (!item.inside) { this.energy = Math.max(1, this.energy - 12); world.callbacks.onSting?.(); } }
        item.inside = inside;
      }
      if (item.type === 'mud' && world.distance > item.distance && world.distance < item.distance + item.length && Math.abs(world.lateral) < item.half && world.jumpY < .2) {
        slow = Math.min(slow, .5); mud = true; if (!item.told) { item.told = true; world.callbacks.onNotice?.('Barro: la mula avanza lento y se cansa más. Por los bordes de la huella está seco.'); }
      }
      if (item.type === 'water' && Math.hypot(world.distance - item.distance, world.lateral - item.lateral) < 2.4) { nearWater = true; drinking ||= Math.abs(world.travelSpeed || 0) < .6; }
    }
    const direction = Math.sign(world.travelSpeed || 1), grade = (world.baseHeight(world.distance + 1) - world.baseHeight(world.distance - 1)) / 2 * direction;
    const fast = (world.speedMultiplier || 1) === 2 && this.energy > ENERGY.low;
    this.energy = clamp(this.energy + energyRate({ speed: world.travelSpeed, mounted: world.mounted, fast, grade, mud, drinking, era: world.details?.era }) * dt, 0, this.max);
    if (this.energy <= 0) { this.energy = Math.min(this.max, ENERGY.afterCollapse); world.callbacks.onExhausted?.(); }
    return this.state = { slow, push, fast, wind, drinking, nearWater, energy: this.energy, max: this.max };
  }

  destroy() { this.group.traverse(object => { object.geometry?.dispose(); object.material?.dispose?.(); }); this.group.removeFromParent(); }
}
