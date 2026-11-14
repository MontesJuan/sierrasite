import test from 'node:test';
import assert from 'node:assert/strict';
import { ENERGY, startEnergy, energyRate, hazardPlan, rockAt, gustAt, rockHits, snakeAt, snakeSpooks } from '../src/hazards.js';
import { cliffSection, ROUTE_LENGTH } from '../src/trail-physics.js';
import { wordLayout } from '../src/journey-extras.js';
import { freshSave, readSave, SAVE_KEY } from '../src/state.js';

test('cada intento perdido cansa a la mula hasta un piso y nunca la deja sin energía', () => {
  assert.equal(startEnergy(0), 100); assert.equal(startEnergy(1), 88); assert.equal(startEnergy(2), 76); assert.equal(startEnergy(3), 64);
  assert.equal(startEnergy(9), ENERGY.floor); assert.equal(startEnergy(-2), 100); assert.equal(startEnergy('x'), 100);
  assert.ok(ENERGY.floor > ENERGY.afterCollapse && ENERGY.afterCollapse > ENERGY.low);
});

test('la mula se cansa al andar montada y se repone al descansar, caminar a la par o tomar agua', () => {
  const walk = energyRate({ speed: 2, mounted: true }), trot = energyRate({ speed: 4, mounted: true, fast: true });
  assert.ok(walk < 0 && trot < walk, 'al trote se cansa más');
  assert.ok(energyRate({ speed: 2, mounted: true, grade: .6 }) < walk, 'cuesta arriba se cansa más');
  assert.equal(energyRate({ speed: 2, mounted: true, grade: -.6 }), walk, 'bajar no cansa de más');
  assert.ok(energyRate({ speed: 2, mounted: true, mud: true }) < walk);
  assert.ok(energyRate({ speed: 0, mounted: true }) > 0 && energyRate({ speed: 0, mounted: false }) > energyRate({ speed: 0, mounted: true }));
  assert.ok(energyRate({ speed: 2, mounted: false }) > 0, 'caminar a la par la alivia');
  assert.ok(energyRate({ speed: 3.8, mounted: false, fast: true }) < 0, 'correr a pie también cansa');
  assert.ok(energyRate({ drinking: true, speed: 0, mounted: true }) > 15);
  assert.equal(energyRate({ speed: 5, mounted: true, fast: true, era: 2024 }), 0, 'la camioneta no se cansa');
  // Un tramo entero al paso (unos 48 s) o al trote (unos 24 s) se puede terminar sin agua desde energía llena.
  assert.ok(100 + 48 * energyRate({ speed: 2, mounted: true, grade: .25 }) > ENERGY.low);
  assert.ok(100 + 24 * energyRate({ speed: 4, mounted: true, fast: true, grade: .25 }) > ENERGY.low);
});

test('cada tramo tiene agua y la dificultad crece sin tapar la huella ni las letras', () => {
  let previous = 0;
  for (let chapter = 0; chapter < 6; chapter++) {
    const plan = hazardPlan(chapter), kinds = type => plan.filter(item => item.type === type);
    assert.equal(kinds('water').length, 2, 'dos bebederos por tramo');
    const danger = kinds('rockfall').length + kinds('gust').length + kinds('thorns').length + kinds('mud').length;
    assert.ok(danger >= previous, `el capítulo ${chapter + 1} no es más fácil que el anterior`); previous = danger;
    for (const item of plan) {
      const distance = item.distance ?? item.from;
      assert.ok(distance > 5 && distance < ROUTE_LENGTH - 4);
      if (item.type === 'water' || item.type === 'thorns') {
        assert.ok(Math.abs(item.lateral) >= 2.3, 'fuera del centro de la huella');
        const cliff = cliffSection(item.distance, chapter);
        if (cliff.strength > .2) assert.ok(item.lateral < 0, 'del lado de la montaña en la cornisa');
        for (const word of wordLayout(chapter)) assert.ok(Math.hypot(word.distance - item.distance, word.lateral - item.lateral) > 1.2, 'no pisa una letra');
      }
      if (item.type === 'gust') assert.ok(cliffSection(item.from, chapter).strength > .9 && cliffSection(item.to, chapter).strength > .9, 'el viento sopla sólo en la cornisa');
    }
  }
  assert.equal(hazardPlan(0).filter(item => item.type === 'rockfall' || item.type === 'gust').length, 0, 'el primer tramo enseña sin derrumbes ni viento');
  assert.deepEqual(hazardPlan(9), hazardPlan(5)); assert.deepEqual(hazardPlan('x'), hazardPlan(0));
});

test('las piedras avisan antes de cruzar, pasan de la ladera al precipicio y se pueden saltar', () => {
  const hazard = { type: 'rockfall', distance: 30, period: 7, phase: 0 };
  assert.equal(rockAt(hazard, 6.2).warning, true); assert.equal(rockAt(hazard, 6.2).active, false);
  const start = rockAt(hazard, 0), middle = rockAt(hazard, 1.2), end = rockAt(hazard, 2.39);
  assert.ok(start.active && start.lateral < -8 && end.lateral > 7 && middle.lateral > start.lateral);
  assert.equal(rockAt(hazard, 3).active, false);
  const crossing = rockAt(hazard, (9 - .6) / 17 * 2.4); // la piedra pasa por lateral -0,6
  assert.equal(rockHits(hazard, crossing, 30, -.6), true);
  assert.equal(rockHits(hazard, crossing, 30, -.6, .8), false, 'saltando se la pasa');
  assert.equal(rockHits(hazard, crossing, 32, -.6), false, 'lejos de su línea no alcanza');
  assert.equal(rockHits(hazard, rockAt(hazard, 4), 30, -.6), false, 'entre piedras el paso está libre');
});

test('el viento empuja hacia el precipicio sólo en su tramo, con aviso, y menos que la velocidad de la mula', () => {
  const gust = { type: 'gust', from: 50, to: 68, period: 7, strength: 1.3 };
  assert.deepEqual(gustAt(gust, 1, 40), { push: 0, warning: false });
  assert.ok(gustAt(gust, 1.1, 60).push > 1.2 && gustAt(gust, 1.1, 60).push <= 1.3);
  assert.equal(gustAt(gust, 3, 60).push, 0); assert.equal(gustAt(gust, 6.2, 60).warning, true);
  for (let chapter = 0; chapter < 6; chapter++) for (const item of hazardPlan(chapter)) if (item.type === 'gust') assert.ok(item.strength < 1.9, 'se puede contrarrestar caminando hacia la montaña');
});

test('la culebra cruza despacio, no hace perder carga y se evita frenando o saltando', () => {
  const snake = { type: 'snake', distance: 37, period: 9, phase: 0 };
  assert.equal(snakeAt(snake, 6).crossing, false); assert.equal(snakeAt(snake, 6).lateral, -3.4, 'fuera de la huella mientras espera');
  const start = snakeAt(snake, 0), end = snakeAt(snake, 4.99);
  assert.ok(start.crossing && start.lateral <= -3.39 && end.lateral > 1.5);
  const middle = snakeAt(snake, (3.4 - .6) / 5 * 5); // pasa por lateral -0,6
  assert.equal(snakeSpooks(snake, middle, 37, -.6), true);
  assert.equal(snakeSpooks(snake, middle, 37, -.6, .5), false, 'saltando no la pisa');
  assert.equal(snakeSpooks(snake, middle, 39, -.6), false);
  assert.equal(snakeSpooks(snake, snakeAt(snake, 7), 37, -3.4), false, 'quieta no asusta');
  assert.equal(hazardPlan(0).filter(item => item.type === 'snake').length, 1); assert.equal(hazardPlan(4).filter(item => item.type === 'snake').length, 1);
});

test('el cansancio acumulado se guarda acotado', () => {
  assert.deepEqual(freshSave().fatigue, [0, 0, 0, 0, 0, 0]);
  const storage = { getItem: () => JSON.stringify({ version: 1, chapter: 0, completed: [], words: [0, 0, 0, 0, 0, 0], fatigue: [2, 9, -1, 'x', 1.5] }) };
  assert.deepEqual(readSave(storage).fatigue, [2, 3, 0, 0, 0, 0]);
  assert.equal(SAVE_KEY, 'sierra-juego-v1');
});
