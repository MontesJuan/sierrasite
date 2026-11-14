import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { basename, dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { inspectGlb, WORLD_ASSET_BUDGET } from '../src/world-assets.js';
import { HUMAN_IDS, HUMAN_CHARACTERS, HUMAN_PROVENANCE_KINDS } from '../src/human-characters.js';

/** Measures a reviewed GLB. Does not create geometry, rig or animation claims. */
export function measureHumanModel(id, bytes, { file, kind, tool, heightMeters, rotationY = 0, aliases = {} } = {}) {
  if (!HUMAN_IDS.includes(id)) throw new Error('Unknown human character');
  if (!/^[a-z0-9][a-z0-9._-]*\.glb$/i.test(file || '') || file.includes('..')) throw new Error('Use a GLB filename inside public/models');
  if (!HUMAN_PROVENANCE_KINDS.includes(kind) || !tool?.trim()) throw new Error('Specify the actual provenance kind and tool');
  if (!Number.isFinite(rotationY)) throw new Error('rotationY must be finite radians');
  const height = heightMeters ?? HUMAN_CHARACTERS[id].heightMeters;
  if (!Number.isFinite(height) || height < 1 || height > 2.2) throw new Error('Use a plausible gameplay height in metres');
  if (bytes.byteLength > WORLD_ASSET_BUDGET.maxFileBytes) throw new Error('GLB exceeds byte budget');
  const { json, animations, triangles } = inspectGlb(bytes);
  if (!json.meshes?.length || triangles <= 0) throw new Error('GLB must contain real mesh geometry');
  if (/\/Users\/|\/Volumes\/|[A-Z]:\\Users\\/.test(JSON.stringify(json))) throw new Error('Remove private filesystem paths from GLB metadata');
  const mapped = {};
  for (const alias of ['idle', 'talk', 'walk', 'ride']) {
    const clip = aliases[alias] || animations.find(name => name.toLowerCase() === alias);
    if (clip && !animations.includes(clip)) throw new Error(`Animation does not exist: ${clip}`);
    if (clip) mapped[alias] = clip;
  }
  return {
    kind: 'human', available: true, approved: true, file, bytes: bytes.byteLength,
    sha256: createHash('sha256').update(bytes).digest('hex'), heightMeters: height, rotationY,
    animations: mapped, requiredAnimations: Object.values(mapped),
    geometry: { triangles, skins: json.skins?.length || 0, animationClips: animations },
    provenance: { kind, tool: tool.trim(), description: kind === 'single-image-inference'
      ? 'Adaptación tridimensional inferida desde una referencia basada en el archivo; no es un escaneo de la persona.'
      : kind === 'multiview-reconstruction' ? 'Geometría reconstruida desde varias vistas documentadas.' : 'Adaptación tridimensional modelada a partir de referencias del archivo.' },
  };
}

async function main() {
  const args = process.argv.slice(2), id = args[0];
  const option = name => { const i = args.indexOf(name); return i < 0 ? undefined : args[i + 1]; };
  if (!args.includes('--approved')) throw new Error('Review likeness, geometry, rights and rendering first; then pass --approved.');
  const models = resolve(dirname(fileURLToPath(import.meta.url)), '../public/models');
  const file = option('--file') || `${id}.glb`;
  if (basename(file) !== file) throw new Error('--file must be a filename already in public/models');
  const bytes = new Uint8Array(await readFile(resolve(models, file)));
  const entry = measureHumanModel(id, bytes, { file, kind: option('--kind'), tool: option('--tool'), heightMeters: option('--height') === undefined ? undefined : Number(option('--height')), rotationY: Number(option('--yaw') || 0), aliases: { idle: option('--idle'), talk: option('--talk'), walk: option('--walk'), ride: option('--ride') } });
  const path = resolve(models, 'manifest.json'), manifest = JSON.parse(await readFile(path, 'utf8'));
  await writeFile(path, JSON.stringify({ ...manifest, [id]: entry }, null, 2) + '\n');
  console.log(`${id}: registered ${entry.bytes} measured bytes, ${entry.geometry.triangles} triangles, ${entry.geometry.animationClips.length} real clips.`);
}
if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) main().catch(error => { console.error(error.message); process.exitCode = 1; });
