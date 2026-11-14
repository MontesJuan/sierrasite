import test from 'node:test';
import assert from 'node:assert/strict';
import { ROUTE_LENGTH, trailHeight, cliffSection, movementDelta, resolveMovement } from '../src/trail-physics.js';

function near(actual, expected, tolerance = 1e-6) {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} ≈ ${expected}`);
}
const wall = { id: 'wall', x: 0, z: 0, halfX: .1, halfZ: 30, height: 3 };

test('las seis rutas de 96m suben y descienden con pendiente continua y limitada', () => {
  assert.equal(ROUTE_LENGTH, 96);
  for (let chapter = 0; chapter < 6; chapter++) {
    near(trailHeight(0, chapter), 0);
    near(trailHeight(48, chapter), 18);
    near(trailHeight(96, chapter), 10);
    for (let d = 0; d < ROUTE_LENGTH; d += .1) {
      const grade = (trailHeight(d + .001, chapter) - trailHeight(d, chapter)) / .001;
      assert.ok(Number.isFinite(grade));
      assert.ok(Math.abs(grade) <= Math.tan(35 * Math.PI / 180), `pendiente excesiva en ${d}`);
    }
    for (const join of [18, 22, 44, 48, 74, 78, 90, 94]) {
      const left = (trailHeight(join, chapter) - trailHeight(join - .001, chapter)) / .001;
      const right = (trailHeight(join + .001, chapter) - trailHeight(join, chapter)) / .001;
      near(left, right, .001);
    }
  }
});

test('cornisa derecha en cada capítulo con entrada y salida suaves, libre por izquierda', () => {
  for (let chapter = 0; chapter < 6; chapter++) {
    for (const d of [-1, 0, 44, 76, 96]) {
      assert.equal(cliffSection(d, chapter).active, false);
      assert.equal(cliffSection(d, chapter).depth, 0);
    }
    const full = cliffSection(60, chapter);
    assert.equal(full.active, true); assert.equal(full.depth, 32);
    assert.ok(full.edge >= 1.6, 'siempre queda paso a la izquierda');
    assert.equal(full.edge, chapter >= 1 && chapter <= 3 ? 1.6 : 2.5);
    assert.ok(cliffSection(46, chapter).strength > 0 && cliffSection(46, chapter).strength < 1);
    near(cliffSection(46, chapter).depth, cliffSection(74, chapter).depth);
    near(cliffSection(48 - .001, chapter).depth, full.depth, .001);
  }
});

test('avance, retroceso y strafe siguen la cámara en los cuatro puntos cardinales', () => {
  const expected = [[0, -3], [-3, 0], [0, 3], [3, 0]];
  for (let quarter = 0; quarter < 4; quarter++) {
    const yaw = quarter * Math.PI / 2;
    const f = movementDelta({ forward: 1, yaw, speed: 3, dt: 1 });
    const b = movementDelta({ forward: -1, yaw, speed: 3, dt: 1 });
    const s = movementDelta({ strafe: 1, yaw, speed: 3, dt: 1 });
    near(f.dx, expected[quarter][0]); near(f.dz, expected[quarter][1]);
    near(b.dx, -f.dx); near(b.dz, -f.dz);
    near(f.dx * s.dx + f.dz * s.dz, 0);
    near(s.dx, -f.dz); near(s.dz, f.dx);
  }
});

test('360 grados y diagonales mantienen velocidad; el control analógico mantiene intensidad', () => {
  for (let yaw = -Math.PI * 2; yaw < Math.PI * 2; yaw += .17) {
    for (const forward of [-1, 1]) for (const strafe of [-1, 1]) {
      const move = movementDelta({ forward, strafe, yaw, speed: 4, dt: .25 });
      near(Math.hypot(move.dx, move.dz), 1);
    }
  }
  near(Math.hypot(...Object.values(movementDelta({ forward: .3, strafe: .4, speed: 2, dt: 1 }))), 1);
  assert.deepEqual(movementDelta({ forward: 1, speed: 3, dt: -1 }), { dx: 0, dz: -0 });
  const safe = movementDelta({ forward: NaN, strafe: Infinity, yaw: NaN, speed: 4, dt: .1 });
  assert.ok(Number.isFinite(safe.dx) && Number.isFinite(safe.dz));
});

test('el desplazamiento libre es mundial y no atrae al centro de ningún sendero', () => {
  const result = resolveMovement({ x: 25, z: -50, dx: -3, dz: 7, colliders: [] });
  assert.deepEqual(result, { x: 22, z: -43, contacts: [] });
});

test('una pared fina bloquea incluso un salto temporal de 200m', () => {
  const result = resolveMovement({ x: -100, z: 0, dx: 200, dz: 0, radius: .4, colliders: [wall] });
  near(result.x, -.5, .0001); near(result.z, 0);
  assert.deepEqual(result.contacts, ['wall']);
  const opposite = resolveMovement({ x: 100, z: 0, dx: -200, radius: .4, colliders: [wall] });
  near(opposite.x, .5, .0001);
});

test('el jugador se desliza por una pared sin penetrarla ni perder avance paralelo', () => {
  const result = resolveMovement({ x: -2, z: -4, dx: 4, dz: 8, radius: .4, colliders: [wall] });
  near(result.x, -.5, .0001); near(result.z, 4, .0001);
  const away = resolveMovement({ ...result, dx: -2, dz: 0, radius: .4, colliders: [wall] });
  near(away.x, result.x - 2); assert.deepEqual(away.contacts, []);
});

test('esquinas de dos paredes son sólidas en ambos órdenes de colisionadores', () => {
  const cross = { id: 'cross', x: 0, z: 0, halfX: 30, halfZ: .1, height: 3 };
  for (const colliders of [[wall, cross], [cross, wall]]) {
    const result = resolveMovement({ x: -2, z: -2, dx: 5, dz: 5, radius: .4, colliders });
    assert.ok(result.x <= -.5 + .0001 && result.z <= -.5 + .0001);
    assert.deepEqual(new Set(result.contacts), new Set(['wall', 'cross']));
  }
});

test('rocas circulares bloquean desde ambos lados y permiten rodearlas', () => {
  const rock = Object.freeze({ id: 'rock', x: 0, z: 0, radius: 1, height: 1.5 });
  for (const sign of [-1, 1]) {
    const result = resolveMovement({ x: 0, z: 5 * sign, dz: -10 * sign, radius: .4, colliders: [rock] });
    near(result.z, sign * 1.4, .0001); assert.deepEqual(result.contacts, ['rock']);
  }
  const result = resolveMovement({ x: -.9, z: 3, dz: -6, radius: .4, colliders: [rock] });
  assert.ok(result.z < -1 && result.x < -1.3, 'recorre la tangente y supera la roca');
  assert.ok(Math.hypot(result.x, result.z) >= 1.4 - .0001);
});

test('las esquinas redondas de las cajas no bloquean un paso exterior libre', () => {
  const box = { id: 'box', x: 0, z: 0, halfX: 1, halfZ: 1, height: 2 };
  const result = resolveMovement({ x: 1.48, z: 1.49, dx: .01, dz: -.01, radius: .5, colliders: [box] });
  near(result.x, 1.49); near(result.z, 1.48); assert.deepEqual(result.contacts, []);
  const hit = resolveMovement({ x: 3, z: 3, dx: -4, dz: -4, radius: .5, colliders: [box] });
  assert.ok(Math.hypot(hit.x - 1, hit.z - 1) >= .5 - .0001);
  assert.deepEqual(hit.contacts, ['box']);
});

test('pies por encima del obstáculo permiten saltar; una pared sin altura siempre bloquea', () => {
  const low = { ...wall, height: .5 };
  const options = { x: -2, z: 0, dx: 4, radius: .4, colliders: [low] };
  assert.ok(resolveMovement({ ...options, feet: .49 }).x < 0);
  near(resolveMovement({ ...options, feet: .5 }).x, 2);
  assert.ok(resolveMovement({ ...options, feet: 10, colliders: [{ ...wall, height: undefined }] }).x < 0);
});

test('recupera una posición superpuesta sin NaN ni mutar los obstáculos', () => {
  const circle = Object.freeze({ id: 'circle', x: 0, z: 0, radius: 1, height: 2 });
  const box = Object.freeze({ id: 'box', x: 0, z: 0, halfX: 1, halfZ: 2, height: 2 });
  const circleResult = resolveMovement({ x: 0, z: 0, radius: .4, colliders: Object.freeze([circle]) });
  assert.ok(Math.hypot(circleResult.x, circleResult.z) >= 1.4);
  const boxResult = resolveMovement({ x: 0, z: 0, radius: .4, colliders: Object.freeze([box]) });
  assert.ok(boxResult.x >= 1.4); near(boxResult.z, 0);
});

test('la resolución por fotograma conserva el resultado al dividir un movimiento contra pared', () => {
  const options = { x: -2, z: -4, dx: 4, dz: 8, radius: .4, colliders: [wall] };
  const single = resolveMovement(options);
  let split = { x: options.x, z: options.z };
  for (let i = 0; i < 60; i++) split = resolveMovement({ ...options, ...split, dx: 4 / 60, dz: 8 / 60 });
  near(split.x, single.x, .0001); near(split.z, single.z, .001);
});
