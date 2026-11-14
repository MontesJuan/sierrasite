import { WORLD_ASSET_BUDGET } from './world-assets.js';

/** Documentary references and authored encounter positions, not measured body dimensions. */
export const HUMAN_CHARACTERS = Object.freeze({
  ruly: Object.freeze({name:'Ruly Chávez',label:'Ruly',role:'El baqueano que acompaña el viaje',image:'ruly-reference',heightMeters:1.72,text:'Conoce la huella y acompaña al equipo montado. En esta aventura nos guía y espera en los pasos difíciles; es una adaptación del viaje documental.'}),
  reyes: Object.freeze({ name: 'Ladislao Reyes', label: 'Reyes', role: 'El poeta de Vallecito', image: 'reyes-reference', video: 'reyes', heightMeters: 1.65, text: 'Su voz y sus cuadernos son el corazón de este viaje. El libro nace de sus palabras y del trabajo de la comunidad.' }),
  rosalia: Object.freeze({ name: 'Rosalía', label: 'Rosalía', role: 'La vida junto al monte', image: 'rosalia-goats', video: 'rosalia', heightMeters: 1.55, text: 'La huerta, el hilado, las cabritas. Cada encuentro nos enseña a mirar el tiempo y los saberes de la sierra.' }),
  margarita: Object.freeze({ name: 'Margarita Chávez', label: 'Margarita', role: 'Los saberes del telar', image: 'margarita', heightMeters: 1.60, text: 'La lana, los colores y el telar guardan un oficio que aprendió de su madre. Sus tejidos también cuentan la historia del lugar.' }),
  monica: Object.freeze({ name: 'Mónica Speso', label: 'Mónica', role: 'La directora de la escuela', image: 'monica', video: 'monica', heightMeters: 1.62, text: 'La escuela reúne a chicos y docentes para que los cuadernos puedan transformarse en un libro compartido.' }),
});
export const HUMAN_IDS = Object.freeze(Object.keys(HUMAN_CHARACTERS));
export const HUMAN_PROVENANCE_KINDS = Object.freeze(['single-image-inference', 'multiview-reconstruction', 'authored']);

const encounters = Object.freeze({
  2: [{ id: 'rosalia', distance: 98, lateral: -1.8 }, { id: 'monica', distance: 99, lateral: 1.8 }],
  3: [{ id: 'margarita', distance: 98, lateral: 1.8 }],
  4: [{ id: 'reyes', distance: 98, lateral: 1.8 }],
  5: [{ id: 'monica', distance: 98, lateral: 1.8 }],
});
export function humanEncounters(chapter) { return (encounters[chapter] || []).map(value => ({ ...value })); }
export function humanIdForSpeaker(speaker) {
  return HUMAN_IDS.find(id => speaker === HUMAN_CHARACTERS[id].name || speaker === HUMAN_CHARACTERS[id].label) || null;
}
export function humanEncounterAnimation(id, speaker) { return id === humanIdForSpeaker(speaker) ? 'talk' : 'idle'; }

/** Pending slots deliberately omit a file, byte count and checksum. */
export function approvedHumanAsset(manifest, id, base = '/jugar/') {
  const person = HUMAN_CHARACTERS[id], entry = manifest?.[id];
  if (!person || entry?.available !== true || entry?.approved !== true || entry?.kind !== 'human') return null;
  if (!/^[a-z0-9][a-z0-9._-]*\.glb$/i.test(entry.file || '') || entry.file.includes('..')) return null;
  if (!Number.isSafeInteger(entry.bytes) || entry.bytes <= 0 || entry.bytes > WORLD_ASSET_BUDGET.maxFileBytes) return null;
  if (!/^[a-f0-9]{64}$/.test(entry.sha256 || '') || !HUMAN_PROVENANCE_KINDS.includes(entry.provenance?.kind)) return null;
  if (entry.rotationY !== undefined && !Number.isFinite(entry.rotationY)) return null;
  if (entry.heightMeters !== undefined && (!Number.isFinite(entry.heightMeters) || entry.heightMeters < 1 || entry.heightMeters > 2.2)) return null;
  return { ...entry, id, url: `${base}models/${entry.file}`, heightMeters: entry.heightMeters || person.heightMeters, rotation: [0, entry.rotationY || 0, 0] };
}

/** A stale manifest must not expose a 3D switch for a missing file or SPA fallback. */
export async function probeHumanAsset(asset, { fetchImpl = fetch, signal } = {}) {
  if (!asset) return false;
  try {
    const response = await fetchImpl(asset.url, { method: 'HEAD', signal });
    if (!response.ok || /text\/html/i.test(response.headers.get('content-type') || '')) return false;
    const length = response.headers.get('content-length');
    const encoding = response.headers.get('content-encoding');
    // A CDN's compressed representation has a different byte length. The GLB loader
    // validates the actual decoded response before handing it to Three.js.
    return (encoding && encoding.toLowerCase() !== 'identity') || length === null || Number(length) === asset.bytes;
  } catch { return false; }
}
