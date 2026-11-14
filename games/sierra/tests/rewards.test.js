import test from 'node:test';
import assert from 'node:assert/strict';
import { WORDS, WORDS_PER_CHAPTER, TOTAL_WORDS, FAUNA, FAUNA_IDS, photoRating, wordCount, chapterStars, totalStars, sanitizeName, formatTime } from '../src/rewards.js';
import { SAVE_KEY, PHOTO_KEY, freshSave, readSave, readPhotos, writePhoto, completeChapter } from '../src/state.js';
import { wordLayout, herdLayout } from '../src/journey-extras.js';
import { cliffSection, ROUTE_LENGTH } from '../src/trail-physics.js';

const storage = initial => { const values = new Map(Object.entries(initial || {})); return { getItem: key => values.get(key) ?? null, setItem: (key, value) => values.set(key, value), removeItem: key => values.delete(key) }; };

test('hay ocho palabras distintas por capítulo, con definición y sin repetirse en todo el juego', () => {
  assert.equal(WORDS.length, 6); assert.equal(TOTAL_WORDS, 48);
  const all = WORDS.flat().map(entry => entry.word);
  assert.equal(new Set(all).size, 48);
  for (const list of WORDS) { assert.equal(list.length, WORDS_PER_CHAPTER); for (const entry of list) { assert.match(entry.word, /^[a-záéíóúñ]+$/); assert.ok(entry.meaning.length > 12 && entry.meaning.endsWith('.')); } }
});

test('la foto no vale si se invade el espacio del animal y mejora con distancia y encuadre', () => {
  for (const id of FAUNA_IDS) {
    const species = FAUNA[id];
    assert.equal(photoRating(id, species.min - .01, 1), 0, `${id}: demasiado cerca`);
    assert.equal(photoRating(id, species.min, 1), 3);
    assert.equal(photoRating(id, species.ideal, .9), 2, `${id}: descentrada`);
    assert.equal(photoRating(id, species.ideal * 1.5, 1), 2);
    assert.equal(photoRating(id, species.ideal * 3, 1), 1);
    assert.equal(photoRating(id, species.ideal * 3, .9), 1, 'nunca baja de una estrella si respeta la distancia');
  }
  assert.equal(photoRating('dragon', 10, 1), 0); assert.equal(photoRating('cabra', NaN, 1), 0); assert.equal(photoRating('cabra', -1, 1), 0);
  assert.ok(FAUNA.puma.min > FAUNA.zorro.min && FAUNA.zorro.min > FAUNA.cabra.min, 'los animales silvestres piden más espacio');
});

test('las estrellas premian llegar, los tres hallazgos y una foto de fauna', () => {
  let save = freshSave();
  assert.deepEqual(chapterStars(save, 0), [false, false, false]); assert.equal(totalStars(save), 0);
  save = completeChapter(save, 0); save.finds[0] = 2;
  assert.deepEqual(chapterStars(save, 0), [true, false, false]);
  save.finds[0] = 3; save.wild[0] = 1;
  assert.deepEqual(chapterStars(save, 0), [true, true, true]); assert.equal(totalStars(save), 3);
  assert.deepEqual(chapterStars(save, 1), [false, false, false]);
});

test('cuenta palabras por máscara y da formato al tiempo', () => {
  assert.equal(wordCount(0), 0); assert.equal(wordCount(0b10110), 3); assert.equal(wordCount(255), 8); assert.equal(wordCount(1023), 8); assert.equal(wordCount('x'), 0);
  assert.equal(formatTime(0), '—'); assert.equal(formatTime(41.2), '0:41'); assert.equal(formatTime(125), '2:05'); assert.equal(formatTime(NaN), '—');
});

test('el nombre del libro se limpia de etiquetas y se acota', () => {
  assert.equal(sanitizeName('  Sofi   y  Tomás '), 'Sofi y Tomás');
  assert.equal(sanitizeName('<b onclick="x">Ana</b>'), 'b onclick=xAna/b', 'sin < > ni comillas no queda HTML ejecutable');
  assert.equal(sanitizeName('a'.repeat(60)).length, 24);
  assert.equal(sanitizeName(42), ''); assert.equal(sanitizeName('linea\nnueva'), 'lineanueva');
});

test('el guardado conserva palabras, fauna, marcas y nombre, y descarta valores inválidos', () => {
  const stored = storage({ [SAVE_KEY]: JSON.stringify({ version: 1, chapter: 2, completed: [0, 1], words: [255, 999, -3, 'x', 7], wild: [3, 9, 1], fauna: { cabra: 3, condor: 7, dragon: 2, puma: '2' }, best: [41.2, 0, 99999, 'x', 30], name: ' <b>Equipo Río</b> ', sound: false }) });
  const save = readSave(stored);
  assert.deepEqual(save.words, [255, 255, 0, 0, 7, 0]);
  assert.deepEqual(save.wild, [3, 3, 1, 0, 0, 0]);
  assert.deepEqual(save.fauna, { cabra: 3 });
  assert.deepEqual(save.best, [41.2, null, null, null, 30, null]);
  assert.equal(save.name, 'bEquipo Río/b');
  assert.equal(save.sound, false, 'una partida nueva respeta el sonido apagado');
});

test('el sonido empieza activado y las partidas anteriores lo reciben una sola vez', () => {
  assert.equal(freshSave().sound, true);
  const legacy = storage({ [SAVE_KEY]: JSON.stringify({ version: 1, chapter: 1, completed: [0], sound: false, finds: [3, 0, 0, 0, 0, 0] }) });
  assert.equal(readSave(legacy).sound, true);
  assert.deepEqual(readSave(legacy).words, [0, 0, 0, 0, 0, 0]);
});

test('las fotos de quien juega aceptan sólo JPEG pequeños con identificadores conocidos', () => {
  const stored = storage(), jpeg = 'data:image/jpeg;base64,' + 'A'.repeat(200);
  let photos = writePhoto(stored, {}, 'cabra', jpeg);
  photos = writePhoto(stored, photos, 'paisaje-3', jpeg);
  photos = writePhoto(stored, photos, 'paisaje-9', jpeg);
  photos = writePhoto(stored, photos, 'dragon', jpeg);
  photos = writePhoto(stored, photos, 'zorro', 'data:image/png;base64,AAAA');
  photos = writePhoto(stored, photos, 'puma', 'data:image/jpeg;base64,' + 'A'.repeat(100000));
  assert.deepEqual(Object.keys(photos).sort(), ['cabra', 'paisaje-3']);
  assert.deepEqual(readPhotos(stored), photos);
  assert.deepEqual(readPhotos(storage({ [PHOTO_KEY]: '{"cabra":"javascript:alert(1)","x":1}' })), {});
  assert.deepEqual(readPhotos(storage({ [PHOTO_KEY]: 'no-json' })), {});
  assert.deepEqual(readPhotos(undefined), {});
});

test('las ocho letras de cada tramo quedan en la huella y nunca del lado del precipicio', () => {
  for (let chapter = 0; chapter < 6; chapter++) {
    const layout = wordLayout(chapter);
    assert.equal(layout.length, WORDS_PER_CHAPTER);
    assert.equal(layout.filter(slot => slot.high).length, 2, 'dos letras piden saltar');
    for (const slot of layout) {
      assert.ok(slot.distance > 3 && slot.distance < ROUTE_LENGTH - 3);
      const cliff = cliffSection(slot.distance, chapter);
      if (cliff.strength > .2) assert.ok(slot.lateral <= cliff.edge - 1.9, `capítulo ${chapter}, letra ${slot.index}`);
      assert.ok(Math.abs(slot.lateral) <= 1.9);
    }
    assert.deepEqual(layout.map(slot => slot.index), [0, 1, 2, 3, 4, 5, 6, 7]);
  }
  for (const slot of wordLayout(1).filter(slot => slot.distance < 17)) assert.equal(slot.lateral, -1.8, 'en el río van sobre las piedras');
});

test('las majadas se reparten en las laderas, lejos de la huella y fuera del precipicio', () => {
  for (let chapter = 0; chapter < 6; chapter++) {
    const herds = herdLayout(chapter);
    assert.equal(herds.length, 6);
    assert.ok(herds.reduce((sum, herd) => sum + herd.count, 0) >= 60, 'muchas cabras a la vista');
    for (const herd of herds) {
      assert.ok(Math.abs(herd.lateral) >= 15 && herd.count >= 10);
      if (herd.distance > 40 && herd.distance < 78) assert.ok(herd.lateral < 0, 'del lado de la montaña en la cornisa');
    }
    assert.deepEqual(herdLayout(chapter), herds, 'la disposición es estable entre partidas');
  }
});
