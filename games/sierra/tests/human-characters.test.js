import test from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { HUMAN_CHARACTERS, HUMAN_IDS, approvedHumanAsset, probeHumanAsset, humanEncounters, humanIdForSpeaker, humanEncounterAnimation } from '../src/human-characters.js';
import { measureHumanModel } from '../scripts/register-human-model.mjs';
import { verifyWorldAssetChecksum } from '../src/world-assets.js';
import { ROUTE_LENGTH } from '../src/trail-physics.js';

// Synthetic GLB header only for preflight unit tests; never a published character.
function fixture(extra = {}) {
  let text = JSON.stringify({ asset: { version: '2.0' }, accessors: [{ count: 3 }], meshes: [{ primitives: [{ attributes: { POSITION: 0 } }] }], ...extra });
  text += ' '.repeat((4 - text.length % 4) % 4);
  const json = new TextEncoder().encode(text), bytes = new Uint8Array(20 + json.length), view = new DataView(bytes.buffer);
  [0x46546c67, 2, bytes.length, json.length, 0x4e4f534a].forEach((n, i) => view.setUint32(i * 4, n, true)); bytes.set(json, 20); return bytes;
}
const options = { file: 'reyes.glb', kind: 'single-image-inference', tool: 'Test fixture' };
const entry = () => measureHumanModel('reyes', fixture(), options);

test('human slots never expose missing, unapproved or malformed resources', () => {
  assert.equal(approvedHumanAsset({}, 'reyes'), null);
  for (const patch of [{ available: false }, { approved: false }, { bytes: undefined }, { sha256: undefined }, { file: '../reyes.glb' }, { file: 'https://other/reyes.glb' }, { rotationY: NaN }, { heightMeters: 0 }]) {
    assert.equal(approvedHumanAsset({ reyes: { ...entry(), ...patch } }, 'reyes'), null);
  }
  assert.equal(approvedHumanAsset({ reyes: entry() }, 'reyes').url, '/jugar/models/reyes.glb');
});

test('3D availability hides 404s, HTML fallbacks, wrong lengths and interrupted requests', async () => {
  const asset = approvedHumanAsset({ reyes: entry() }, 'reyes');
  for (const response of [new Response(null, { status: 404 }), new Response(null, { headers: { 'content-type': 'text/html' } }), new Response(null, { headers: { 'content-length': '10' } })]) {
    assert.equal(await probeHumanAsset(asset, { fetchImpl: async () => response }), false);
  }
  assert.equal(await probeHumanAsset(asset, { fetchImpl: async () => { throw new DOMException('Abort', 'AbortError'); } }), false);
  assert.equal(await probeHumanAsset(asset, { fetchImpl: async () => new Response(null, { headers: { 'content-encoding': 'gzip', 'content-length': '10' } }) }), true);
  assert.equal(await probeHumanAsset(asset, { fetchImpl: async (url, request) => {
    assert.equal(url, asset.url); assert.equal(request.method, 'HEAD');
    return new Response(null, { headers: { 'content-type': 'model/gltf-binary', 'content-length': String(asset.bytes) } });
  } }), true);
});

test('encounters follow the school, artisan, poet and return chapters without invented speakers', () => {
  assert.deepEqual([0, 1, 2, 3, 4, 5].map(chapter => humanEncounters(chapter).map(p => p.id)), [[], [], ['rosalia', 'monica'], ['margarita'], ['reyes'], ['monica']]);
  assert.equal(humanIdForSpeaker('Ladislao Reyes'), 'reyes');
  assert.equal(humanIdForSpeaker('Mónica'), 'monica');
  assert.equal(humanIdForSpeaker('El equipo'), null);
  assert.equal(humanEncounterAnimation('monica', 'Mónica'), 'talk');
  assert.equal(humanEncounterAnimation('reyes', 'Mónica'), 'idle');
  assert.equal(humanEncounterAnimation('reyes', null), 'idle');
  for (const id of HUMAN_IDS) assert.ok(HUMAN_CHARACTERS[id].image);
});

test('los encuentros quedan visibles a dos o tres metros de la llegada de 96m', () => {
  assert.equal(ROUTE_LENGTH, 96);
  assert.deepEqual([2, 3, 4, 5].map(chapter => humanEncounters(chapter).map(p => p.distance)), [[98, 99], [98], [98], [98]]);
  for (let chapter = 0; chapter < 6; chapter++) {
    for (const person of humanEncounters(chapter)) {
      assert.ok(person.distance > ROUTE_LENGTH && person.distance <= ROUTE_LENGTH + 3);
      assert.ok(Math.abs(person.lateral) <= 2);
    }
  }
  const changed = humanEncounters(2); changed[0].distance = 10000;
  assert.equal(humanEncounters(2)[0].distance, 98, 'el llamador no cambia el roster global');
});

test('registration measures bytes and SHA, supports static meshes, and never invents clips', () => {
  const bytes = fixture(), model = measureHumanModel('reyes', bytes, options);
  assert.equal(model.bytes, bytes.length);
  assert.equal(model.sha256, createHash('sha256').update(bytes).digest('hex'));
  assert.equal(model.geometry.skins, 0);
  assert.deepEqual(model.animations, {});
  assert.deepEqual(model.requiredAnimations, []);
  assert.throws(() => measureHumanModel('reyes', bytes, { ...options, aliases: { walk: 'Walk' } }), /does not exist/);
  const animated = measureHumanModel('reyes', fixture({ animations: [{ name: 'Idle' }, { name: 'Talk' }, { name: 'Walk' }] }), options);
  assert.deepEqual(animated.animations, { idle: 'Idle', talk: 'Talk', walk: 'Walk' });
  assert.throws(() => measureHumanModel('unknown', bytes, options), /Unknown/);
  assert.throws(() => measureHumanModel('reyes', fixture({ extras: { source: '/Users/private/person/photo.jpg' } }), options), /private filesystem/);
});

test('Ruly registration preserves a real Ride clip without inventing Talk or Walk', () => {
  const bytes = fixture({ animations: [{ name: 'Idle' }, { name: 'Ride' }] });
  const options = { file: 'ruly.glb', kind: 'single-image-inference', tool: 'Test fixture' };
  const entry = measureHumanModel('ruly', bytes, options);
  assert.deepEqual(entry.animations, { idle: 'Idle', ride: 'Ride' });
  assert.deepEqual(entry.requiredAnimations, ['Idle', 'Ride']);
  assert.equal(approvedHumanAsset({ ruly: entry }, 'ruly').heightMeters, 1.72);
  assert.throws(() => measureHumanModel('ruly', bytes, { ...options, aliases: { ride: 'Missing' } }), /does not exist/);
  const renamed = measureHumanModel('ruly', fixture({ animations: [{ name: 'Mounted' }] }), { ...options, aliases: { ride: 'Mounted' } });
  assert.deepEqual(renamed.animations, { ride: 'Mounted' });
});

test('a same-sized replacement cannot load under a previously approved checksum', async () => {
  const bytes = fixture(), expected = entry().sha256;
  await verifyWorldAssetChecksum(bytes, expected);
  bytes[bytes.length - 1] ^= 1;
  await assert.rejects(verifyWorldAssetChecksum(bytes, expected), /checksum does not match/);
});

test('published human slots match real files only after explicit review', async () => {
  const manifest = JSON.parse(await readFile(new URL('../public/models/manifest.json', import.meta.url), 'utf8'));
  for (const id of HUMAN_IDS) {
    const slot = manifest[id]; assert.equal(slot.kind, 'human', id);
    if (!slot.available) {
      assert.equal(slot.approved, false, id);
      for (const field of ['file', 'bytes', 'sha256']) assert.equal(slot[field], undefined, `${id}: invented ${field}`);
      continue;
    }
    assert.ok(approvedHumanAsset(manifest, id), `${id}: unreviewed or invalid slot`);
    const bytes = new Uint8Array(await readFile(new URL(`../public/models/${slot.file}`, import.meta.url)));
    const measured = measureHumanModel(id, bytes, { ...slot, kind: slot.provenance.kind, tool: slot.provenance.tool, aliases: slot.animations });
    assert.equal(measured.bytes, slot.bytes, id); assert.equal(measured.sha256, slot.sha256, id);
  }
});
