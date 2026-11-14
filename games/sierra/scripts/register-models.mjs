// Registra en public/models/manifest.json la fauna v5 y los lugares v6 presentes en la carpeta.
// Mide el archivo real (bytes, SHA-256, triángulos, clips); no inventa datos de un modelo ausente.
// Uso: node scripts/register-models.mjs [carpeta con los .meta.json de los lugares]
// Sin esa carpeta sólo se actualiza la fauna: la huella de colisión de cada lugar sale de su .meta.json.
import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { join } from 'node:path';
import { inspectGlb } from '../src/world-assets.js';

const FAUNA = { cabra: 'v5-cabra.glb', 'cabra-estatica': 'v5-cabra-estatica.glb', zorro: 'v5-zorro.glb', puma: 'v5-puma.glb', lagarto: 'v5-lagarto.glb', condor: 'v5-condor.glb', pavo: 'v5-pavo.glb', gallina: 'v5-gallina.glb', culebra: 'v5-culebra.glb' };
const PLACES = { escuela: 'v6-escuela.glb', rancho: 'v6-rancho.glb', 'rancho-piedra': 'v6-rancho-piedra.glb', corral: 'v6-corral.glb' };
const metaDir = process.argv[2];
const manifestUrl = new URL('../public/models/manifest.json', import.meta.url);
const manifest = JSON.parse(await readFile(manifestUrl, 'utf8'));

async function measure(id, file) {
  let bytes;
  try { bytes = new Uint8Array(await readFile(new URL(`../public/models/${file}`, import.meta.url))); } catch { console.log(`${id}: falta ${file}; sin cambios`); return null; }
  const { json, animations, triangles } = inspectGlb(bytes);
  if (/\/Users\/|\/Volumes\/|[A-Z]:\\Users\\/.test(JSON.stringify(json))) throw new Error(`${file}: quitar rutas privadas de los metadatos`);
  console.log(`${id}: ${file} ${bytes.byteLength} bytes, ${triangles} triángulos, clips ${animations.join('/') || 'ninguno'}`);
  return { file, bytes: bytes.byteLength, sha256: createHash('sha256').update(bytes).digest('hex'), animations, triangles, skins: json.skins?.length || 0 };
}

for (const [id, file] of Object.entries(FAUNA)) {
  const model = await measure(id, file); if (!model) continue;
  const aliases = Object.fromEntries(model.animations.map(name => [name.toLowerCase(), name]));
  if (id === 'condor' && aliases.soar) aliases.idle = aliases.soar;
  manifest[id] = {
    file, bytes: model.bytes, sha256: model.sha256, animations: aliases, requiredAnimations: model.animations,
    geometry: { triangles: model.triangles, skins: model.skins, animationClips: model.animations },
    provenance: { kind: 'authored', tool: 'Blender 5.3', description: 'Modelo artístico con rig y animaciones; textura proyectada desde una imagen de referencia generada con IA. No es un escaneo documental.' },
  };
}

for (const [id, file] of Object.entries(metaDir ? PLACES : {})) {
  const model = await measure(id, file); if (!model) continue;
  const meta = JSON.parse(await readFile(join(metaDir, file.replace('.glb', '.meta.json')), 'utf8'));
  const footprint = meta.footprint.map(({ x, z, halfX, halfZ, height }) => ({ x, z, halfX, halfZ, height }));
  if (!footprint.every(box => Object.values(box).every(Number.isFinite))) throw new Error(`${file}: huella de colisión incompleta`);
  manifest[id] = {
    file, bytes: model.bytes, sha256: model.sha256, animations: {}, requiredAnimations: [],
    geometry: { triangles: model.triangles, skins: 0, animationClips: [] }, sizeMeters: meta.sizeMeters, footprint,
    provenance: { kind: 'authored', tool: 'Blender 5.3', description: 'Geometría sencilla modelada a escala sobre las tomas del documental, con texturas recortadas de esas mismas tomas. No es un escaneo ni un relevamiento de la construcción.' },
  };
}
// El manifiesto se guarda en ASCII, como el resto del archivo.
await writeFile(manifestUrl, JSON.stringify(manifest, null, 2).replace(/[\u0080-￿]/g, c => `\\u${c.charCodeAt(0).toString(16).padStart(4, '0')}`) + '\n');
