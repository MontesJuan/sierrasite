import test from 'node:test';
import assert from 'node:assert/strict';
import { SAVE_KEY, freshSave, readSave, writeSave, completeChapter, timingScore } from '../src/state.js';

function memoryStorage(initial) {
  const values = new Map(initial === undefined ? [] : [[SAVE_KEY, initial]]);
  return {
    getItem: key => values.get(key) ?? null,
    setItem: (key, value) => values.set(key, value),
    value: () => values.get(SAVE_KEY),
  };
}

const stored = value => memoryStorage(JSON.stringify(value));

test('una partida nueva empieza desbloqueando sólo el primer capítulo y no comparte colecciones', () => {
  const first = freshSave();
  const second = freshSave();
  assert.equal(first.chapter, 0);
  assert.equal(first.finished, false);
  assert.deepEqual(first.completed, []);
  first.completed.push(0);
  first.photos.push(0);
  assert.deepEqual(second.completed, []);
  assert.deepEqual(second.photos, []);
});

test('JSON corrupto, ausencia de partida y versiones incompatibles permiten volver a empezar', () => {
  for (const raw of [undefined, '{"chapter":', 'null', 'false', '[]', '{"version":2,"completed":[0,1,2,3,4,5]}']) {
    assert.deepEqual(readSave(memoryStorage(raw)), freshSave(), `entrada ${String(raw)}`);
  }
});

test('un capítulo futuro y una victoria declarada no desbloquean niveles sin evidencia contigua', () => {
  const result = readSave(stored({ version: 1, chapter: 5, completed: [2, 3, 4, 5], finished: true }));
  assert.equal(result.chapter, 0);
  assert.deepEqual(result.completed, []);
  assert.equal(result.finished, false);
});

test('el guardado recupera sólo el tramo contiguo y descarta duplicados, negativos y tipos inválidos', () => {
  const result = readSave(stored({
    version: 1,
    chapter: 5,
    completed: [5, 1, 0, 1, -1, 2.5, '2', 100, null, 4],
    photos: [2, 2, -1, 5, 6, '1', null],
    finished: true,
  }));
  assert.deepEqual(result.completed, [0, 1]);
  assert.equal(result.chapter, 2);
  assert.equal(result.finished, false);
  assert.deepEqual(result.photos, [2, 5]);
});

test('un hueco intermedio no permite conservar progreso posterior al hueco', () => {
  const result = readSave(stored({ version: 1, chapter: 4, completed: [0, 1, 3, 4] }));
  assert.deepEqual(result.completed, [0, 1]);
  assert.equal(result.chapter, 2);
});

test('campos malformados y preferencias no admitidas no se trasladan a la partida', () => {
  const result = readSave(stored({
    version: 1, chapter: '5', completed: 'todos', photos: {}, attempts: -5,
    finished: 'true', sound: 'true', quality: 'ultra', reducedMotion: 1,
  }));
  assert.deepEqual(result, freshSave());
  const oversized = readSave(stored({ version: 1, attempts: 50000 }));
  assert.equal(oversized.attempts, 9999);
});

test('reabrir un capítulo completado conserva el progreso y las preferencias', () => {
  const result = readSave(stored({
    ...freshSave(), chapter: 1, completed: [0, 1, 2, 3], photos: [0, 2],
    sound: true, quality: 'low', reducedMotion: true, attempts: 8,
  }));
  assert.equal(result.chapter, 1);
  assert.deepEqual(result.completed, [0, 1, 2, 3]);
  assert.deepEqual(result.photos, [0, 2]);
  assert.equal(result.sound, true);
  assert.equal(result.quality, 'low');
  assert.equal(result.reducedMotion, true);
  assert.equal(result.attempts, 8);
});

test('no se pueden completar capítulos bloqueados ni repetirlos para avanzar dos veces', () => {
  const first = freshSave();
  for (const invalid of [-1, 1, 5, 6, 0.5, '0', NaN]) {
    assert.strictEqual(completeChapter(first, invalid), first);
  }
  const completed = completeChapter(first, 0);
  assert.deepEqual(completed.completed, [0]);
  assert.equal(completed.chapter, 1);
  assert.strictEqual(completeChapter(completed, 0), completed);
  assert.strictEqual(completeChapter(completed, 2), completed);
  assert.deepEqual(first.completed, [], 'completar no modifica el estado anterior');
});

test('la aventura sólo termina al completar los seis capítulos en orden', () => {
  let save = { ...freshSave(), photos: [0, 2], sound: true, attempts: 7 };
  for (let chapter = 0; chapter < 6; chapter++) {
    save = completeChapter(save, chapter);
    assert.equal(save.completed.length, chapter + 1);
    assert.equal(save.finished, chapter === 5);
    assert.equal(save.chapter, Math.min(chapter + 1, 5));
  }
  assert.deepEqual(save.completed, [0, 1, 2, 3, 4, 5]);
  assert.deepEqual(save.photos, [0, 2]);
  assert.equal(save.attempts, 7);
  assert.equal(save.sound, true);
});

test('repetir un capítulo después del final no borra el libro ni duplica sellos', () => {
  let complete = freshSave();
  for (let i = 0; i < 6; i++) complete = completeChapter(complete, i);
  const replay = { ...complete, chapter: 2 };
  const result = completeChapter(replay, 2);
  assert.strictEqual(result, replay);
  assert.equal(result.finished, true);
  assert.deepEqual(result.completed, [0, 1, 2, 3, 4, 5]);
  const restored = readSave(stored(result));
  assert.equal(restored.finished, true);
  assert.equal(restored.chapter, 2);
  assert.deepEqual(restored.completed, [0, 1, 2, 3, 4, 5]);
});

test('una partida completa antigua recupera el final aun si falta la bandera finished', () => {
  const result = readSave(stored({ version: 1, chapter: 5, completed: [5, 4, 3, 2, 1, 0], finished: false }));
  assert.equal(result.finished, true);
  assert.deepEqual(result.completed, [0, 1, 2, 3, 4, 5]);
});

test('guardar y recuperar mantiene el progreso y la configuración de accesibilidad', () => {
  const storage = memoryStorage();
  const save = { ...completeChapter(freshSave(), 0), photos: [0], quality: 'low', reducedMotion: true, sound: true, attempts: 2 };
  assert.equal(writeSave(storage, save), true);
  assert.equal(typeof storage.value(), 'string');
  assert.deepEqual(readSave(storage), save);
});

test('bloqueo de lectura del almacenamiento y almacenamiento ausente no impiden una partida nueva', () => {
  const blocked = { getItem() { throw new Error('SecurityError: storage blocked'); } };
  assert.deepEqual(readSave(blocked), freshSave());
  assert.deepEqual(readSave(undefined), freshSave());
});

test('fallo de escritura avisa sin mutar ni perder el estado de la sesión', () => {
  const save = completeChapter(freshSave(), 0);
  const snapshot = structuredClone(save);
  const full = { setItem() { throw new Error('QuotaExceededError'); } };
  assert.equal(writeSave(full, save), false);
  assert.equal(writeSave(undefined, save), false);
  assert.deepEqual(save, snapshot);
});

test('la zona segura del río acepta sus bordes y rechaza puntos externos', () => {
  for (const point of [0.32, 0.5, 0.68]) assert.equal(timingScore(point), true);
  for (const point of [0, 0.31999, 0.68001, 1, NaN]) assert.equal(timingScore(point), false);
});
