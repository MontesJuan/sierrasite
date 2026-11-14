import test from 'node:test';
import assert from 'node:assert/strict';
import {
  EXPEDITION_RULES, EXPEDITION_ERAS, createExpedition, expeditionPositions, interactionAt,
  interactExpedition, advanceExpedition, gateOpenness, constrainExpeditionMovement,
  retryExpedition, startEpilogue,
} from '../src/expedition.js';
import { ROUTE_LENGTH } from '../src/trail-physics.js';

const keyPosition = { distance: 18, lateral: -4 };
const gatePosition = { distance: 36, lateral: 0 };
const withKey = () => interactExpedition(createExpedition(), keyPosition).state;

test('la ruta corta conserva la llave antes del candado y ambos antes de la cornisa', () => {
  assert.equal(ROUTE_LENGTH, 96);
  assert.equal(EXPEDITION_RULES.keyDistance, 18);
  assert.equal(EXPEDITION_RULES.gateDistance, 38);
  assert.ok(EXPEDITION_RULES.keyDistance + EXPEDITION_RULES.keyReach < EXPEDITION_RULES.gateDistance - EXPEDITION_RULES.gateReach);
  assert.ok(EXPEDITION_RULES.gateDistance + EXPEDITION_RULES.gateClearance < 44);
});

test('la llave exige acercarse fuera del centro del sendero y no se recoge a distancia', () => {
  const state = Object.freeze(createExpedition());
  for (const position of [{ distance: 0, lateral: -4 }, { distance: 18, lateral: 0 },
    { distance: 18, lateral: 4 }, { distance: NaN, lateral: -4 }, {}]) {
    assert.equal(interactionAt(state, position), null);
    assert.deepEqual(interactExpedition(state, position), { state, event: 'out-of-range', target: null });
  }
  assert.equal(interactionAt(state, keyPosition).label, 'Recoger la llave');
  const result = interactExpedition(state, keyPosition);
  assert.equal(result.event, 'key-found');
  assert.equal(result.state.keyFound, true);
  assert.equal(state.keyFound, false);
  assert.equal(interactionAt(result.state, keyPosition), null, 'la llave no reaparece tras recogerla');
});

test('la tranquera con candado informa qué falta y bloquea el paso completo', () => {
  const state = Object.freeze(createExpedition());
  const result = interactExpedition(state, gatePosition);
  assert.equal(result.event, 'key-required');
  assert.strictEqual(result.state, state);
  assert.equal(interactionAt(state, gatePosition).enabled, false);
  for (const requested of [37, 38, 39, 96, 10000]) {
    assert.equal(constrainExpeditionMovement(state, 35, requested), 36);
  }
  assert.equal(constrainExpeditionMovement(state, 0, 96), 36, 'un salto desde el inicio no atraviesa el candado');
  assert.equal(constrainExpeditionMovement(state, 36, 26), 26, 'se puede retroceder a buscar la llave');
  assert.equal(constrainExpeditionMovement(state, 60, 10), 40, 'también bloquea un cruce en sentido inverso');
});

test('tener la llave no abre a distancia y requiere una interacción junto al candado', () => {
  const state = Object.freeze(withKey());
  assert.equal(constrainExpeditionMovement(state, 35, 46), 36);
  for (const position of [keyPosition, { distance: 36, lateral: 7 }, { distance: 26, lateral: 0 }]) {
    const result = interactExpedition(state, position);
    assert.equal(result.event, 'out-of-range');
    assert.strictEqual(result.state, state);
  }
  const result = interactExpedition(state, gatePosition);
  assert.equal(result.event, 'gate-opening');
  assert.equal(result.state.gateOpening, true);
  assert.equal(result.state.gateProgress, 0);
  assert.equal(state.gateOpening, false);
});

test('la animación abre de forma gradual y mantiene la colisión hasta terminar', () => {
  const opening = Object.freeze(interactExpedition(withKey(), gatePosition).state);
  const quarter = advanceExpedition(opening, EXPEDITION_RULES.gateOpeningSeconds / 4);
  const half = advanceExpedition(quarter, EXPEDITION_RULES.gateOpeningSeconds / 4);
  assert.equal(quarter.gateProgress, 0.25);
  assert.equal(gateOpenness(quarter), 0.15625);
  assert.equal(gateOpenness(half), 0.5);
  assert.equal(constrainExpeditionMovement(half, 36, 46), 36);
  assert.equal(interactExpedition(half, gatePosition).event, 'gate-busy');
  const open = advanceExpedition(half, 5);
  assert.equal(open.gateProgress, 1);
  assert.equal(open.gateOpening, false);
  assert.equal(gateOpenness(open), 1);
  assert.equal(constrainExpeditionMovement(open, 36, 96), 96);
  const repeated = interactExpedition(open, gatePosition);
  assert.equal(repeated.event, 'gate-already-open');
  assert.strictEqual(repeated.state, open);
  assert.equal(opening.gateProgress, 0);
});

test('tiempos inválidos y avances antes de desbloquear no alteran la tranquera', () => {
  const closed = createExpedition();
  assert.strictEqual(advanceExpedition(closed, 100), closed);
  const opening = interactExpedition(withKey(), gatePosition).state;
  for (const delta of [0, -1, NaN, Infinity, '1']) assert.strictEqual(advanceExpedition(opening, delta), opening);
  assert.equal(constrainExpeditionMovement(closed, 35, NaN), 35);
});

test('reintentar restablece la búsqueda y el candado sin cambiar la época', () => {
  const state = advanceExpedition(interactExpedition(withKey(), gatePosition).state, 3);
  assert.deepEqual(retryExpedition(state), createExpedition());
  const later = createExpedition({ era: 2024 });
  const found = interactExpedition(later, keyPosition).state;
  const retry = retryExpedition(found);
  assert.equal(retry.era, 2024);
  assert.equal(retry.vehicle, 'truck');
  assert.equal(retry.keyFound, false);
  assert.equal(retry.gateProgress, 0);
  assert.equal(found.keyFound, true);
});

test('el candado sólo se repite en capítulo cero salvo configuración expresa', () => {
  for (const era of [2019, 2024]) {
    for (let chapter = 1; chapter < 6; chapter++) {
      const state = createExpedition({ chapter, era });
      assert.equal(state.enabled, false);
      assert.equal(interactionAt(state, gatePosition), null);
      assert.equal(constrainExpeditionMovement(state, 0, 96), 96);
      assert.equal(retryExpedition(state).enabled, false);
    }
    assert.equal(createExpedition({ era }).enabled, true);
  }
  const configured = createExpedition({ chapter: 1, enabled: true });
  assert.deepEqual(expeditionPositions(configured).key, { distance: 18, lateral: 4 });
  assert.equal(interactExpedition(configured, { distance: 18, lateral: 4 }).event, 'key-found');
});

test('el epílogo requiere seis capítulos, cambia a camioneta y conserva el recorrido', () => {
  const initial = Object.freeze(createExpedition({ chapter: 5 }));
  for (const completedChapters of [undefined, 0, 1, 5, 7, '6']) {
    const result = startEpilogue(initial, { completedChapters });
    assert.equal(result.event, 'epilogue-locked');
    assert.strictEqual(result.state, initial);
  }
  const result = startEpilogue(initial, { completedChapters: 6 });
  assert.equal(result.event, 'epilogue-started');
  assert.equal(result.state.era, 2024);
  assert.equal(result.state.vehicle, 'truck');
  assert.equal(result.state.routeId, initial.routeId);
  assert.equal(result.state.chapter, 0);
  assert.equal(result.state.enabled, true);
  assert.equal(EXPEDITION_ERAS[result.state.era].yearsLater, 5);
  assert.deepEqual(expeditionPositions(result.state), expeditionPositions(createExpedition()));
  const repeated = startEpilogue(result.state, { completedChapters: 6 });
  assert.equal(repeated.event, 'epilogue-already-started');
  assert.strictEqual(repeated.state, result.state);
  assert.equal(initial.era, 2019);
  assert.equal(initial.vehicle, 'mule');
});
