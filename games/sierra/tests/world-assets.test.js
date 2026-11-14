import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { fetchBoundedAsset, inspectGaussianBytes, validateSplatAsset, SPLAT_BUDGETS } from '../src/splat-loader.js';
import { inspectGlb, AnimatedWorldAsset, cloneWorldAsset } from '../src/world-assets.js';
import { Group, AnimationClip, NumberKeyframeTrack, Bone, BufferGeometry, Float32BufferAttribute, Uint16BufferAttribute, SkinnedMesh, Skeleton, MeshStandardMaterial, Texture } from 'three';
const encoder = new TextEncoder();

test('rejects a plain point cloud instead of calling it Gaussian splatting', async () => {
  const ply = encoder.encode('ply\nformat binary_little_endian 1.0\nelement vertex 12\nproperty float x\nproperty float y\nproperty float z\nend_header\n');
  await assert.rejects(inspectGaussianBytes(ply, 'ply'), /point cloud/);
});
test('preflights actual Gaussian fields and count in a PLY header', async () => {
  const fields = ['x','y','z','scale_0','scale_1','scale_2','rot_0','rot_1','rot_2','rot_3','opacity','f_dc_0'];
  const bytes = encoder.encode('ply\nformat binary_little_endian 1.0\nelement vertex 32000\n' + fields.map(value => `property float ${value}`).join('\n') + '\nend_header\n');
  assert.equal((await inspectGaussianBytes(bytes, 'ply')).numSplats, 32000);
});
test('reads source counts from both gzip SPZ and plaintext v4 headers', async () => {
  const bytes = new Uint8Array(32), data = new DataView(bytes.buffer); data.setUint32(0,0x5053474e,true); data.setUint32(4,4,true); data.setUint32(8,40000,true);
  assert.equal((await inspectGaussianBytes(bytes,'spz')).numSplats,40000);
  data.setUint32(4,3,true);
  assert.equal((await inspectGaussianBytes(new Uint8Array(gzipSync(bytes)),'spz')).numSplats,40000);
});
test('manifest enforces measured budgets and identifies generated worlds separately', () => {
  const asset = {url:'/jugar/scenes/test.spz',bytes:1000,numSplats:100,provenance:{kind:'generated-world'}};
  assert.equal(validateSplatAsset(asset).provenance.kind,'generated-world');
  assert.throws(()=>validateSplatAsset({...asset,numSplats:SPLAT_BUDGETS.auto.maxSourceSplats+1}),/budget/);
  assert.throws(()=>validateSplatAsset({...asset,provenance:{kind:'photo-extrusion'}}),/provenance/);
});
test('download cap works without Content-Length and rejects mismatched manifests', async () => {
  const options = {maxBytes:16,fetchImpl:async()=>new Response(new Uint8Array(24))};
  await assert.rejects(fetchBoundedAsset('/asset',options),/budget/);
  await assert.rejects(fetchBoundedAsset('/asset',{...options,maxBytes:64,expectedBytes:20}),/manifest/);
});
function glb(json) { let data = JSON.stringify(json); data += ' '.repeat((4-data.length%4)%4); const text=encoder.encode(data),bytes=new Uint8Array(text.length+20),view=new DataView(bytes.buffer);view.setUint32(0,0x46546c67,true);view.setUint32(4,2,true);view.setUint32(8,bytes.length,true);view.setUint32(12,text.length,true);view.setUint32(16,0x4e4f534a,true);bytes.set(text,20);return bytes; }
test('GLB validation rejects external texture requests and excessive geometry', () => {
  assert.throws(()=>inspectGlb(glb({asset:{version:'2.0'},images:[{uri:'https://external.test/image.jpg'}]})),/self-contained/);
  assert.throws(()=>inspectGlb(glb({asset:{version:'2.0'},accessors:[{count:600000}],meshes:[{primitives:[{attributes:{POSITION:0}}]}]})),/triangle budget/);
});
test('GLB exposes only actual named animations', () => {
  const result=inspectGlb(glb({asset:{version:'2.0'},animations:[{name:'Walk'},{name:'Idle'}]}));
  assert.deepEqual(result.animations,['Walk','Idle']);
});

test('a change in ground speed updates an active walk without restarting its phase', () => {
  const model = new Group();
  const walk = new AnimationClip('Walk', 1, [new NumberKeyframeTrack('.position[x]', [0, 1], [0, 1])]);
  const actor = new AnimatedWorldAsset({ scene: model, animations: [walk] }, { animations: { walk: 'Walk' } });
  actor.play('walk', { timeScale: 1 });
  actor.update(.1);
  const phase = actor.action.time;
  actor.play('walk', { timeScale: 1.6 });
  assert.equal(actor.action.time, phase);
  assert.equal(actor.action.timeScale, 1.6);
  actor.update(.1);
  assert.ok(Math.abs(actor.action.time - phase - .16) < 1e-8);
  actor.dispose();
});

function riggedMuleFixture() {
  const geometry = new BufferGeometry();
  geometry.setAttribute('position', new Float32BufferAttribute([-.3, 2, 0, -.3, 1.7, .3, .5, 2, 0, .5, .5, .3], 3));
  geometry.setIndex([0, 1, 2, 1, 3, 2]); geometry.computeVertexNormals();
  geometry.setAttribute('skinIndex', new Uint16BufferAttribute(Array(16).fill(0), 4));
  geometry.setAttribute('skinWeight', new Float32BufferAttribute([1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0], 4));
  const image = { width: 2, height: 2, closes: 0, close() { this.closes++; } };
  const texture = new Texture(image), material = new MeshStandardMaterial({ map: texture });
  const mesh = new SkinnedMesh(geometry, material), pelvis = new Bone(), head = new Bone();
  pelvis.name = 'pelvis'; head.name = 'head'; head.position.y = 1; pelvis.add(head); mesh.add(pelvis);
  mesh.bind(new Skeleton([pelvis, head]));
  const model = new Group(); model.add(mesh);
  const walk = new AnimationClip('Walk', 1, [new NumberKeyframeTrack('head.rotation[z]', [0, 1], [0, .4])]);
  const source = new AnimatedWorldAsset({ scene: model, animations: [walk] }, { id: 'mule', animations: { walk: 'Walk' } });
  return { source, mesh, geometry, material, texture, image, head };
}

test('the guide folds only its cloned load and keeps bones and animation clocks independent', async () => {
  const fixture = riggedMuleFixture(), { source, mesh, geometry, material, head } = fixture;
  const originalPositions = [...geometry.attributes.position.array], originalNormals = [...geometry.attributes.normal.array];
  const guide = await cloneWorldAsset(source, { id: 'guide-mule', guideLightLoad: true, animations: { walk: 'Walk' } });
  const copy = guide.model.children[0];
  assert.notEqual(copy.geometry, geometry);
  assert.equal(copy.material, material, 'immutable materials and maps stay shared');
  assert.notEqual(copy.skeleton, mesh.skeleton);
  assert.notEqual(copy.skeleton.bones[1], head);
  assert.deepEqual([...geometry.attributes.position.array], originalPositions);
  assert.deepEqual([...geometry.attributes.normal.array], originalNormals);
  assert.ok(copy.geometry.attributes.position.getY(0) < geometry.attributes.position.getY(0), 'pack above the guide seat is folded');
  assert.equal(copy.geometry.attributes.position.getY(2), geometry.attributes.position.getY(2), 'front anatomy is unchanged');
  assert.deepEqual([...copy.geometry.attributes.skinIndex.array], [...geometry.attributes.skinIndex.array]);
  assert.deepEqual([...copy.geometry.attributes.skinWeight.array], [...geometry.attributes.skinWeight.array]);
  source.play('walk', { fade: 0 }); source.update(.1);
  const sourcePhase = source.action.time, sourceHead = head.rotation.z;
  guide.play('walk', { fade: 0, timeScale: 2 }); guide.update(.1);
  assert.equal(source.action.time, sourcePhase);
  assert.equal(head.rotation.z, sourceHead, 'advancing guide cannot animate the player mule');
  assert.ok(Math.abs(copy.skeleton.bones[1].rotation.z - sourceHead) > .001);
  guide.dispose(); source.dispose();
});

test('disposing a guide releases its own geometry and skeleton once without closing shared textures', async () => {
  const { source, mesh, geometry, material, texture, image } = riggedMuleFixture();
  const guide = await cloneWorldAsset(source, { id: 'guide-mule', guideLightLoad: true });
  const copy = guide.model.children[0], counts = { ownGeometry: 0, sourceGeometry: 0, material: 0, texture: 0, guideBones: 0, sourceBones: 0 };
  copy.geometry.addEventListener('dispose', () => counts.ownGeometry++);
  geometry.addEventListener('dispose', () => counts.sourceGeometry++);
  material.addEventListener('dispose', () => counts.material++);
  texture.addEventListener('dispose', () => counts.texture++);
  copy.skeleton.computeBoneTexture(); mesh.skeleton.computeBoneTexture();
  copy.skeleton.boneTexture.addEventListener('dispose', () => counts.guideBones++);
  mesh.skeleton.boneTexture.addEventListener('dispose', () => counts.sourceBones++);
  const stage = new Group(); stage.add(source.root, guide.root);
  guide.dispose(); guide.dispose();
  assert.deepEqual(counts, { ownGeometry: 1, sourceGeometry: 0, material: 0, texture: 0, guideBones: 1, sourceBones: 0 });
  assert.equal(image.closes, 0);
  assert.equal(guide.root.parent, null); assert.equal(source.root.parent, stage);
  assert.equal(source.play('walk', { fade: 0 }), true); source.update(.1);
  source.dispose(); source.dispose();
  assert.deepEqual(counts, { ownGeometry: 1, sourceGeometry: 1, material: 1, texture: 1, guideBones: 1, sourceBones: 1 });
  assert.equal(image.closes, 1);
});

test('disposing an unmodified clone preserves all source mesh resources', async () => {
  const { source, geometry, material, texture, image } = riggedMuleFixture();
  const clone = await cloneWorldAsset(source, { id: 'shared-clone' });
  let disposal = 0;
  for (const resource of [geometry, material, texture]) resource.addEventListener('dispose', () => disposal++);
  assert.equal(clone.model.children[0].geometry, geometry);
  clone.dispose();
  assert.equal(disposal, 0); assert.equal(image.closes, 0);
  source.dispose();
  assert.equal(disposal, 3); assert.equal(image.closes, 1);
});

test('the published Gaussian manifest matches the actual reconstructed artifact', async () => {
  const { readFile } = await import('node:fs/promises');
  const { createHash } = await import('node:crypto');
  const manifest = JSON.parse(await readFile(new URL('../public/scenes/sierra-observatory.json', import.meta.url), 'utf8'));
  const fileName = manifest.url.split('/').pop();
  const bytes = new Uint8Array(await readFile(new URL(`../public/scenes/${fileName}`, import.meta.url)));
  assert.equal(bytes.length, manifest.bytes);
  assert.equal((await inspectGaussianBytes(bytes, manifest.format)).numSplats, manifest.numSplats);
  assert.equal(createHash('sha256').update(bytes).digest('hex'), manifest.sha256);
  assert.equal(manifest.provenance.kind, 'multiview-reconstruction');
  assert.equal(manifest.camera.frames.length, manifest.provenance.sourceFrames);
});

test('released Blender assets contain only their own scene, embedded media and animated rigs', async () => {
  const { readFile } = await import('node:fs/promises');
  const manifest = JSON.parse(await readFile(new URL('../public/models/manifest.json', import.meta.url), 'utf8'));
  const fauna = ['chicken', 'goat', 'iguana', 'mule', 'truck'];
  for (const id of fauna) {
    const asset = manifest[id]; assert.ok(asset, `${id}: existing animal or vehicle removed`);
    const bytes = new Uint8Array(await readFile(new URL(`../public/models/${asset.file}`, import.meta.url)));
    assert.equal(bytes.length, asset.bytes, id);
    const { json, animations } = inspectGlb(bytes);
    assert.equal(json.scenes.length, 1, `${id}: cross-scene export`);
    assert.equal(json.skins.length, 1, `${id}: expected one rig`);
    assert.ok(!json.nodes.some(node => node.name === 'Cube'), `${id}: unrelated default scene`);
    assert.ok(!JSON.stringify(json).match(/\/Users\/|\/Volumes\//), `${id}: private metadata`);
    for (const name of asset.requiredAnimations) assert.ok(animations.includes(name), `${id}: ${name}`);
    for (const clip of json.animations) {
      assert.ok(clip.channels.length > 0, `${id}: empty animation`);
      assert.ok(clip.samplers.every(sampler => json.accessors[sampler.input].count > 1));
    }
  }
});
