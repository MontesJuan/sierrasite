import { AnimationMixer, Box3, Float32BufferAttribute, Group, LoopOnce, LoopRepeat, Vector3 } from 'three';
import { fetchBoundedAsset, validateTransform } from './splat-loader.js';

export const WORLD_ASSET_BUDGET = Object.freeze({ maxFileBytes: 18 * 1024 * 1024, maxTriangles: 120000, maxTexturePixels: 16 * 1024 * 1024 });

export async function verifyWorldAssetChecksum(bytes, expected) {
  if (expected === undefined) return; // Legacy fauna entries predate reviewed checksums.
  if (!/^[a-f0-9]{64}$/.test(expected) || !globalThis.crypto?.subtle) throw new Error('Cannot verify reviewed GLB checksum');
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  const actual = Array.from(new Uint8Array(digest), value => value.toString(16).padStart(2, '0')).join('');
  if (actual !== expected) throw new Error('GLB checksum does not match reviewed manifest');
}

/** Validate GLB before GLTFLoader can request any referenced resources. */
export function inspectGlb(bytes, budget = WORLD_ASSET_BUDGET) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 20) throw new Error('Truncated GLB');
  const data = new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength);
  if (data.getUint32(0, true) !== 0x46546c67 || data.getUint32(4, true) !== 2) throw new Error('A binary glTF 2.0 asset is required');
  if (data.getUint32(8, true) !== bytes.byteLength) throw new Error('GLB length mismatch');
  const jsonLength = data.getUint32(12, true);
  if (data.getUint32(16, true) !== 0x4e4f534a || 20 + jsonLength > bytes.length) throw new Error('Invalid GLB JSON chunk');
  const json = JSON.parse(new TextDecoder().decode(bytes.subarray(20, 20 + jsonLength)).trim());
  if (json.asset?.version !== '2.0') throw new Error('Unsupported glTF version');
  for (const resource of [...(json.buffers || []), ...(json.images || [])]) {
    if (resource.uri && !resource.uri.startsWith('data:')) throw new Error('Export a self-contained GLB with embedded textures and buffers');
  }
  let triangles = 0;
  for (const mesh of json.meshes || []) for (const primitive of mesh.primitives || []) {
    const accessor = json.accessors?.[primitive.indices ?? primitive.attributes?.POSITION];
    if (!accessor || !Number.isSafeInteger(accessor.count) || accessor.count < 0) throw new Error('Invalid mesh accessor');
    const mode = primitive.mode ?? 4;
    triangles += mode === 4 ? accessor.count / 3 : [5, 6].includes(mode) ? Math.max(0, accessor.count - 2) : 0;
  }
  if (triangles > budget.maxTriangles) throw new Error('GLB exceeds triangle budget');
  return { json, triangles: Math.ceil(triangles), animations: (json.animations || []).map((clip, index) => clip.name || `animation_${index}`) };
}

function disposeScene(root) {
  const geometry = new Set(), material = new Set(), texture = new Set(), images = new Set(), skeleton = new Set();
  root.traverse(object => {
    if (object.geometry) geometry.add(object.geometry);
    if (object.skeleton) skeleton.add(object.skeleton);
    for (const value of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!value) continue; material.add(value);
      for (const item of Object.values(value)) if (item?.isTexture) { texture.add(item); if (item.source?.data) images.add(item.source.data); }
    }
  });
  geometry.forEach(item => item.dispose()); material.forEach(item => item.dispose()); texture.forEach(item => item.dispose());
  images.forEach(item => item.close?.()); skeleton.forEach(item => item.dispose());
}

export class AnimatedWorldAsset {
  constructor(gltf, asset) {
    this.root = new Group(); this.root.name = asset.id || 'documentary-asset'; this.model = gltf.scene; this.root.add(this.model);
    this.clips = gltf.animations || []; this.mixer = new AnimationMixer(this.model); this.action = null; this.disposed = false;
    if (Number.isFinite(asset.heightMeters) && asset.heightMeters > 0) {
      this.model.updateMatrixWorld(true);
      const bounds = new Box3().setFromObject(this.model), size = bounds.getSize(new Vector3());
      if (size.y > .0001) { const scale = asset.heightMeters / size.y; this.model.scale.multiplyScalar(scale); this.model.position.y -= bounds.min.y * scale; }
    }
    this.root.position.fromArray(asset.position || [0, 0, 0]);
    this.root.rotation.fromArray([...(asset.rotation || [0, 0, 0]), 'XYZ']); this.root.scale.setScalar(asset.scale || 1);
    this.model.traverse(object => { if (object.isMesh) { object.castShadow = asset.castShadow !== false; object.receiveShadow = true; } });
    this.aliases = { ...(asset.animations || {}) };
  }
  /** Aliases map gameplay names to actual exported clip names. No invented animation. */
  play(name, { fade = .2, once = false, timeScale = 1 } = {}) {
    if (this.disposed) return false;
    const clipName = this.aliases[name] || name, clip = this.clips.find(value => value.name === clipName);
    if (!clip) return false;
    const next = this.mixer.clipAction(clip);
    if (next === this.action) { next.timeScale = timeScale; return true; }
    next.reset(); next.setLoop(once ? LoopOnce : LoopRepeat, once ? 1 : Infinity); next.clampWhenFinished = once; next.timeScale = timeScale;
    if (this.action) this.action.fadeOut(fade);
    next.fadeIn(fade).play(); this.action = next; return true;
  }
  update(dt) { if (!this.disposed && Number.isFinite(dt) && dt > 0) this.mixer.update(Math.min(dt, .1)); }
  getState() { return { animations: this.clips.map(clip => clip.name), playing: this.action?.getClip().name || null, disposed: this.disposed }; }
  dispose() { if (this.disposed) return; this.disposed = true; this.mixer.stopAllAction(); this.mixer.uncacheRoot(this.model); this.root.removeFromParent(); if(this.sharedResources){const skeletons=new Set();this.model.traverse(o=>{if(o.skeleton)skeletons.add(o.skeleton);});skeletons.forEach(s=>s.dispose());this.ownedGeometries?.forEach(g=>g.dispose());}else disposeScene(this.model); }
}

export async function loadWorldAsset(asset, { scene, renderer, signal, onProgress, budget = WORLD_ASSET_BUDGET, decoderPaths = {} } = {}) {
  if (!asset?.url || typeof asset.url !== 'string') throw new Error('Missing GLB asset URL');
  if (!Number.isSafeInteger(asset.bytes) || asset.bytes <= 0 || asset.bytes > budget.maxFileBytes) throw new Error('GLB byte count missing or above budget');
  validateTransform(asset);
  const bytes = await fetchBoundedAsset(asset.url, { maxBytes: budget.maxFileBytes, expectedBytes: asset.bytes, signal, onProgress });
  await verifyWorldAssetChecksum(bytes, asset.sha256);
  const metadata = inspectGlb(bytes, budget);
  const { GLTFLoader } = await import('three/addons/loaders/GLTFLoader.js');
  signal?.throwIfAborted();
  const loader = new GLTFLoader(); const decoders = []; let gltf;
  try {
    const extensions = new Set(metadata.json.extensionsUsed || []);
    if (extensions.has('EXT_meshopt_compression')) {
      const { MeshoptDecoder } = await import('three/addons/libs/meshopt_decoder.module.js'); loader.setMeshoptDecoder(MeshoptDecoder);
    }
    if (extensions.has('KHR_draco_mesh_compression')) {
      if (!decoderPaths.draco?.startsWith('/')) throw new Error('A self-hosted Draco decoder path is required');
      const { DRACOLoader } = await import('three/addons/loaders/DRACOLoader.js'); const draco = new DRACOLoader(); draco.setDecoderPath(decoderPaths.draco); draco.setWorkerLimit(1); loader.setDRACOLoader(draco); decoders.push(draco);
    }
    if (extensions.has('KHR_texture_basisu')) {
      if (!renderer || !decoderPaths.ktx2?.startsWith('/')) throw new Error('KTX2 textures require a renderer and self-hosted transcoder');
      const { KTX2Loader } = await import('three/addons/loaders/KTX2Loader.js'); const ktx2 = new KTX2Loader(); ktx2.setTranscoderPath(decoderPaths.ktx2); ktx2.setWorkerLimit(1); ktx2.detectSupport(renderer); loader.setKTX2Loader(ktx2); decoders.push(ktx2);
    }
    gltf = await loader.parseAsync(bytes.buffer, '');
    signal?.throwIfAborted();
    let pixels = 0; const textures = new Set();
    gltf.scene.traverse(object => { for (const material of Array.isArray(object.material) ? object.material : [object.material]) if (material) for (const value of Object.values(material)) if (value?.isTexture) textures.add(value); });
    for (const texture of textures) { const image = texture.source?.data; pixels += (image?.width || 0) * (image?.height || 0); }
    if (pixels > budget.maxTexturePixels) throw new Error('GLB exceeds texture memory budget');
    for (const clip of asset.requiredAnimations || []) {
      const actual = asset.animations?.[clip] || clip;
      if (!gltf.animations.some(animation => animation.name === actual)) throw new Error(`GLB is missing required animation: ${actual}`);
    }
    const actor = new AnimatedWorldAsset(gltf, asset); scene?.add(actor.root); return actor;
  } catch (error) { if (gltf?.scene) disposeScene(gltf.scene); throw error; }
  finally { decoders.forEach(value => value.dispose()); }
}

/**
 * Las pieles vienen de una fotografía proyectada: ya traen su propia luz. Se muestran
 * casi sin sombreado nuevo y con normales suavizadas, para que el relieve irregular de
 * la reconstrucción no manche el rostro. No cambia la malla ni la textura publicadas.
 */
export function tuneHumanSkin(root, { smoothing = 3 } = {}) {
  root.traverse(object => {
    if (!object.isMesh || object.userData.skinTuned) return; object.userData.skinTuned = true;
    const geometry = object.geometry, position = geometry.attributes.position, index = geometry.index;
    if (position && index && smoothing > 0) {
      // Vértices duplicados en las costuras de UV comparten posición: se promedian juntos.
      const weld = new Map(), group = new Uint32Array(position.count); let groups = 0;
      for (let i = 0; i < position.count; i++) { const key = `${Math.round(position.getX(i) * 4096)},${Math.round(position.getY(i) * 4096)},${Math.round(position.getZ(i) * 4096)}`; let id = weld.get(key); if (id === undefined) { id = groups++; weld.set(key, id); } group[i] = id; }
      geometry.computeVertexNormals(); const normal = geometry.attributes.normal;
      let current = new Float32Array(groups * 3);
      for (let i = 0; i < position.count; i++) { const g = group[i] * 3; current[g] += normal.getX(i); current[g + 1] += normal.getY(i); current[g + 2] += normal.getZ(i); }
      for (let pass = 0; pass < smoothing; pass++) {
        const next = Float32Array.from(current);
        for (let i = 0; i < index.count; i += 3) for (let k = 0; k < 3; k++) {
          const a = group[index.getX(i + k)] * 3, b = group[index.getX(i + (k + 1) % 3)] * 3;
          next[a] += current[b]; next[a + 1] += current[b + 1]; next[a + 2] += current[b + 2];
          next[b] += current[a]; next[b + 1] += current[a + 1]; next[b + 2] += current[a + 2];
        }
        for (let g = 0; g < next.length; g += 3) { const length = Math.hypot(next[g], next[g + 1], next[g + 2]) || 1; next[g] /= length; next[g + 1] /= length; next[g + 2] /= length; }
        current = next;
      }
      const smooth = new Float32Array(position.count * 3);
      for (let i = 0; i < position.count; i++) { const g = group[i] * 3, length = Math.hypot(current[g], current[g + 1], current[g + 2]) || 1; smooth[i * 3] = current[g] / length; smooth[i * 3 + 1] = current[g + 1] / length; smooth[i * 3 + 2] = current[g + 2] / length; }
      geometry.setAttribute('normal', new Float32BufferAttribute(smooth, 3));
    }
    for (const material of Array.isArray(object.material) ? object.material : [object.material]) {
      if (!material?.map) continue;
      material.emissiveMap = material.map; material.emissive.set('#ffffff'); material.emissiveIntensity = .4;
      material.color.setScalar(.4); material.roughness = 1; material.metalness = 0; material.envMapIntensity = 0; material.needsUpdate = true;
    }
  });
}

/** Independent bones/mixer; immutable mesh resources stay owned by the source actor. */
export async function cloneWorldAsset(source,asset){
  const {clone}=await import('three/addons/utils/SkeletonUtils.js');
  const result=new AnimatedWorldAsset({scene:clone(source.model),animations:source.clips},asset);result.sharedResources=true;
  if(asset.guideLightLoad){
    result.ownedGeometries=[];
    result.model.traverse(o=>{if(!o.isMesh)return;o.geometry=o.geometry.clone();result.ownedGeometries.push(o.geometry);const p=o.geometry.attributes.position;
      // The guide rides where the player's mule carries its pack. Only the pack (between the
      // withers and the croup) is lowered, onto a rounded back line that rises toward the
      // croup; the croup itself and everything in front keep their anatomy.
      // glTF +X forward / +Y up, before the 1.85m instance scale.
      const smooth=v=>{const t=Math.max(0,Math.min(1,v));return t*t*(3-2*t);};
      for(let i=0;i<p.count;i++){
        const x=p.getX(i),y=p.getY(i),z=p.getZ(i);if(x>=.30||x<=-.62||y<=1.29)continue;
        const t=smooth((.30-x)/.15)*smooth((x+.62)/.14),along=(x+.62)/.92;
        const back=1.46-along*.15-Math.sin(along*Math.PI)*.03;            // lomo: de la grupa a la cruz
        const across=Math.max(-1,Math.min(1,z/.62)),dome=Math.cos(across*Math.PI/2)**.7;
        const lowered=1.29+(back-1.29)*dome+(y-1.29)*.02,narrow=z*(1-.42*smooth((y-1.29)/.25));
        p.setXYZ(i,x,y+(lowered-y)*t,z+(narrow-z)*t);
      }
      p.needsUpdate=true;o.geometry.computeVertexNormals();o.geometry.computeBoundingBox();o.geometry.computeBoundingSphere();
    });
  }
  return result;
}
