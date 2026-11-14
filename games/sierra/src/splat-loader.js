/** Real Gaussian rendering only. No image-to-plane or synthetic point conversion. */
const MiB = 1024 * 1024;
export const SPLAT_BUDGETS = Object.freeze({
  low: { maxFileBytes: 16 * MiB, maxSourceSplats: 350000, renderSplats: 180000, sortMs: 55, pixelRatio: 1 },
  auto: { maxFileBytes: 32 * MiB, maxSourceSplats: 800000, renderSplats: 400000, sortMs: 35, pixelRatio: 1.25 },
  high: { maxFileBytes: 64 * MiB, maxSourceSplats: 1500000, renderSplats: 900000, sortMs: 20, pixelRatio: 1.5 },
});
const decoder = new TextDecoder();
const abortError = () => new DOMException('Asset loading cancelled', 'AbortError');

export function validateTransform(asset = {}) {
  for (const key of ['position', 'rotation']) {
    if (asset[key] !== undefined && (!Array.isArray(asset[key]) || asset[key].length !== 3 || !asset[key].every(Number.isFinite))) throw new Error(`${key} must contain three finite numbers`);
  }
  if (asset.scale !== undefined && (!Number.isFinite(asset.scale) || asset.scale <= 0)) throw new Error('scale must be a positive uniform number');
}

export function validateSplatAsset(asset, budget = SPLAT_BUDGETS.auto) {
  if (!asset || typeof asset.url !== 'string' || !asset.url.trim()) throw new Error('Missing Gaussian asset URL');
  const format = (asset.format || asset.url.split(/[?#]/)[0].split('.').pop()).toLowerCase();
  if (!['ply', 'spz', 'splat'].includes(format)) throw new Error('Supported Gaussian formats: .spz, .ply, .splat');
  if (!Number.isSafeInteger(asset.bytes) || asset.bytes < 16 || asset.bytes > budget.maxFileBytes) throw new Error('Gaussian file exceeds the download budget or has no verified byte count');
  if (!Number.isSafeInteger(asset.numSplats) || asset.numSplats < 1 || asset.numSplats > budget.maxSourceSplats) throw new Error('Gaussian count exceeds the source budget or has not been measured');
  if (!['multiview-reconstruction', 'generated-world'].includes(asset.provenance?.kind)) throw new Error('Gaussian provenance must distinguish multiview reconstruction from a generated world');
  validateTransform(asset);
  return { ...asset, format };
}

/** Streams are bounded even when Content-Length is absent or incorrect. */
export async function fetchBoundedAsset(url, { maxBytes, expectedBytes, signal, onProgress, fetchImpl = fetch } = {}) {
  if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('A positive asset byte budget is required');
  signal?.throwIfAborted();
  const response = await fetchImpl(url, { signal, credentials: 'same-origin' });
  if (!response.ok) throw new Error(`Asset request failed (${response.status})`);
  const declared = Number(response.headers.get('content-length'));
  if (declared > maxBytes) { await response.body?.cancel(); throw new Error('Asset exceeds download budget'); }
  // A streaming body lets us enforce the cap before retaining the entire download.
  if (!response.body?.getReader) throw new Error('This browser cannot load assets with a bounded stream');
  const reader = response.body.getReader(), chunks = []; let received = 0;
  try {
    for (;;) {
      signal?.throwIfAborted();
      const { done, value } = await reader.read(); if (done) break;
      received += value.byteLength;
      if (received > maxBytes) throw new Error('Asset exceeds download budget');
      chunks.push(value); onProgress?.({ loaded: received, total: expectedBytes || declared || null });
    }
  } catch (error) { await reader.cancel().catch(() => {}); throw error; }
  finally { reader.releaseLock(); }
  if (expectedBytes && received !== expectedBytes) throw new Error('Asset size differs from its verified manifest');
  const bytes = new Uint8Array(received); let offset = 0;
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength; }
  return bytes;
}

export async function inspectGaussianBytes(bytes, format) {
  if (!(bytes instanceof Uint8Array) || bytes.length < 16) throw new Error('Truncated Gaussian asset');
  if (format === 'splat') {
    if (bytes.length % 32 !== 0) throw new Error('Invalid .splat record length');
    return { numSplats: bytes.length / 32, format };
  }
  if (format === 'ply') {
    const header = decoder.decode(bytes.subarray(0, Math.min(bytes.length, 65536)));
    const end = header.indexOf('end_header');
    if (!header.startsWith('ply\n') && !header.startsWith('ply\r\n')) throw new Error('Not a PLY asset');
    if (end < 0) throw new Error('PLY header is absent or too large');
    const text = header.slice(0, end), count = Number(text.match(/element vertex (\d+)/)?.[1]);
    const gaussian = ['scale_0', 'scale_1', 'scale_2', 'rot_0', 'rot_1', 'rot_2', 'rot_3', 'opacity', 'f_dc_0'].every(name => new RegExp(`property \\w+ ${name}(?:\\r?\\n|$)`).test(text));
    const compressed = /element chunk \d+/.test(text) && ['packed_position', 'packed_rotation', 'packed_scale', 'packed_color'].every(name => text.includes(` ${name}`));
    if (!gaussian && !compressed) throw new Error('This PLY is a point cloud, not a trained Gaussian asset');
    if (!Number.isSafeInteger(count) || count < 1) throw new Error('Invalid PLY Gaussian count');
    return { numSplats: count, format };
  }
  if (format === 'spz') {
    let header = bytes;
    if (bytes[0] === 0x1f && bytes[1] === 0x8b) {
      if (typeof DecompressionStream === 'undefined') throw new Error('This browser cannot preflight compressed SPZ');
      const reader = new Blob([bytes]).stream().pipeThrough(new DecompressionStream('gzip')).getReader();
      const first = new Uint8Array(16); let offset = 0;
      try { while (offset < 16) { const { value, done } = await reader.read(); if (done) break; const count = Math.min(16 - offset, value.length); first.set(value.subarray(0, count), offset); offset += count; } }
      finally { await reader.cancel().catch(() => {}); reader.releaseLock(); }
      if (offset < 16) throw new Error('Truncated SPZ header');
      header = first;
    }
    const view = new DataView(header.buffer, header.byteOffset, header.byteLength);
    if (view.getUint32(0, true) !== 0x5053474e) throw new Error('Not an SPZ Gaussian asset');
    const version = view.getUint32(4, true), numSplats = view.getUint32(8, true);
    if (version < 1 || version > 4 || !numSplats) throw new Error('Unsupported or empty SPZ asset');
    return { numSplats, format, version };
  }
  throw new Error('Unknown Gaussian format');
}

export function webglSplatSupport(renderer) {
  const gl = renderer?.getContext?.();
  if (!gl || typeof gl.texImage3D !== 'function') return { supported: false, reason: 'webgl2-unavailable' };
  if (gl.isContextLost?.()) return { supported: false, reason: 'webgl-context-lost' };
  if (gl.getParameter(gl.MAX_TEXTURE_SIZE) < 4096) return { supported: false, reason: 'gpu-texture-limit' };
  return { supported: true };
}

/** One bounded Gaussian environment at a time, sharing the game's WebGL renderer. */
export class SierraSplatLayer {
  constructor({ scene, renderer, quality = 'auto', onStatus = () => {}, onFallback = () => {} }) {
    if (!scene?.add || !renderer?.render) throw new Error('A Three scene and WebGLRenderer are required');
    this.scene = scene; this.renderer = renderer; this.quality = SPLAT_BUDGETS[quality] ? quality : 'auto';
    this.onStatus = onStatus; this.onFallback = onFallback; this.spark = null; this.mesh = null;
    this.controller = null; this.generation = 0; this.destroyed = false; this.slowSeconds = 0; this.warmup = 3;
    this.state = { status: 'empty' }; this.pixelRatioBefore = null;
    this.contextLost = () => this.fallback('webgl-context-lost');
    renderer.domElement?.addEventListener('webglcontextlost', this.contextLost);
  }
  get budget() { return SPLAT_BUDGETS[this.quality]; }
  setState(state) { this.state = state; this.onStatus({ ...state }); return { ...state }; }
  getState() { return { ...this.state, quality: this.quality }; }

  async load(asset, { signal } = {}) {
    this.unload();
    if (this.destroyed) return { status: 'disposed' };
    const generation = this.generation, controller = new AbortController(); this.controller = controller;
    const deadline = setTimeout(() => controller.abort(new DOMException('Asset load timed out', 'TimeoutError')), 45000);
    const cancel = () => controller.abort(); signal?.addEventListener('abort', cancel, { once: true });
    if (signal?.aborted) controller.abort();
    let pendingMesh = null;
    try {
      const support = webglSplatSupport(this.renderer); if (!support.supported) return this.fallback(support.reason);
      const manifest = validateSplatAsset(asset, this.budget);
      this.setState({ status: 'loading', id: manifest.id, provenance: manifest.provenance.kind });
      const bytes = await fetchBoundedAsset(manifest.url, { maxBytes: this.budget.maxFileBytes, expectedBytes: manifest.bytes, signal: controller.signal, onProgress: progress => this.setState({ status: 'loading', id: manifest.id, ...progress }) });
      const header = await inspectGaussianBytes(bytes, manifest.format);
      if (header.numSplats !== manifest.numSplats || header.numSplats > this.budget.maxSourceSplats) throw new Error('Gaussian count differs from manifest or exceeds budget');
      controller.signal.throwIfAborted();
      const { SparkRenderer, SplatMesh } = await import('@sparkjsdev/spark');
      controller.signal.throwIfAborted();
      if (generation !== this.generation || this.destroyed) throw abortError();
      // Spark's default paged allocation is deliberately capped for school devices.
      if (!this.spark) { this.spark = new SparkRenderer({ renderer: this.renderer, enableLod: true, lodSplatCount: this.budget.renderSplats, maxPagedSplats: 1048576, numLodFetchers: 1, minSortIntervalMs: this.budget.sortMs, maxStdDev: Math.sqrt(5), maxPixelRadius: 256 }); this.scene.add(this.spark); }
      this.setState({ status: 'decoding', id: manifest.id, numSplats: header.numSplats });
      pendingMesh = new SplatMesh({ fileBytes: bytes, fileType: manifest.format, fileName: manifest.url, lod: true, raycastable: false });
      await pendingMesh.initialized;
      controller.signal.throwIfAborted();
      if (generation !== this.generation || this.destroyed) throw abortError();
      // LoD adds hierarchy splats: the verified source count is the header count.
      pendingMesh.position.fromArray(manifest.position || [0, 0, 0]);
      pendingMesh.rotation.fromArray([...(manifest.rotation || [0, 0, 0]), 'XYZ']);
      pendingMesh.scale.setScalar(manifest.scale || 1);
      this.mesh = pendingMesh; pendingMesh = null; this.scene.add(this.mesh);
      this.pixelRatioBefore = this.renderer.getPixelRatio();
      this.renderer.setPixelRatio(Math.min(this.pixelRatioBefore, this.budget.pixelRatio));
      this.warmup = 3; this.slowSeconds = 0;
      return this.setState({ status: 'ready', id: manifest.id, numSplats: header.numSplats, provenance: manifest.provenance.kind });
    } catch (error) {
      pendingMesh?.dispose();
      if (generation !== this.generation || error.name === 'AbortError') return { status: 'cancelled' };
      return this.fallback('asset-unavailable', error.message);
    } finally { clearTimeout(deadline); signal?.removeEventListener('abort', cancel); }
  }

  /** Pass raw rAF elapsed seconds, before the gameplay dt clamp. Ignore hidden tabs. */
  update(deltaSeconds, { visible = typeof document === 'undefined' || !document.hidden } = {}) {
    if (!this.mesh || !visible || !Number.isFinite(deltaSeconds) || deltaSeconds <= 0 || deltaSeconds > .5) return;
    if (this.warmup > 0) { this.warmup -= deltaSeconds; return; }
    this.slowSeconds = deltaSeconds > 1 / 23 ? this.slowSeconds + deltaSeconds : Math.max(0, this.slowSeconds - deltaSeconds * 2);
    if (this.slowSeconds > 5) {
      if (this.quality !== 'low') { this.setQuality('low'); this.slowSeconds = 0; this.warmup = 2; this.onStatus({ status: 'quality-reduced', reason: 'sustained-low-fps' }); }
      else this.fallback('sustained-low-fps');
    }
  }
  setQuality(value) {
    if (!SPLAT_BUDGETS[value]) return;
    this.quality = value;
    if (this.spark) { this.spark.lodSplatCount = this.budget.renderSplats; this.spark.minSortIntervalMs = this.budget.sortMs; }
    if (this.mesh) this.renderer.setPixelRatio(Math.min(this.pixelRatioBefore || 1, this.budget.pixelRatio));
  }
  fallback(reason, detail) { this.unload(); const state = this.setState({ status: 'fallback', reason, ...(detail ? { detail } : {}) }); this.onFallback(state); return state; }
  unload() {
    this.generation++; this.controller?.abort(); this.controller = null;
    if (this.mesh) { this.scene.remove(this.mesh); this.mesh.dispose(); this.mesh = null; }
    if (this.spark) { this.scene.remove(this.spark); this.spark.dispose(); this.spark = null; }
    if (this.pixelRatioBefore !== null) { this.renderer.setPixelRatio(this.pixelRatioBefore); this.pixelRatioBefore = null; }
    this.state = { status: 'empty' };
  }
  destroy() { this.destroyed = true; this.unload(); this.renderer.domElement?.removeEventListener('webglcontextlost', this.contextLost); }
}
