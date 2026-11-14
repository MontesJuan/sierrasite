import test from 'node:test';
import assert from 'node:assert/strict';
import { gzipSync } from 'node:zlib';
import { fetchBoundedAsset, inspectGaussianBytes, validateSplatAsset, SPLAT_BUDGETS } from '../src/splat-loader.js';
import { inspectGlb } from '../src/world-assets.js';
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
  assert.deepEqual(Object.keys(manifest).sort(), ['chicken', 'goat', 'iguana', 'mule', 'truck']);
  for (const [id, asset] of Object.entries(manifest)) {
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
