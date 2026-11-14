// Reduce el peso de un GLB recomprimiendo sus texturas embebidas a JPEG, sin tocar
// geometría, huesos ni animaciones. Requiere ImageMagick (`magick`).
// Uso: node scripts/compress-glb-textures.mjs entrada.glb salida.glb [lado=1024] [calidad=86]
import { readFileSync, writeFileSync, mkdtempSync, rmSync } from 'node:fs';
import { execFileSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const [input, output, side = '1024', quality = '86'] = process.argv.slice(2);
if (!input || !output) { console.error('Uso: compress-glb-textures.mjs entrada.glb salida.glb [lado] [calidad]'); process.exit(1); }
const glb = readFileSync(input), jsonLength = glb.readUInt32LE(12);
const json = JSON.parse(glb.subarray(20, 20 + jsonLength).toString('utf8'));
const binStart = 20 + jsonLength + 8, bin = glb.subarray(binStart, binStart + glb.readUInt32LE(20 + jsonLength));
if (json.buffers.length !== 1) throw new Error('Se espera un GLB con un solo buffer');
const work = mkdtempSync(join(tmpdir(), 'glb-tex-')), replaced = new Map();
for (const image of json.images || []) {
  if (image.bufferView === undefined || replaced.has(image.bufferView)) continue;
  const view = json.bufferViews[image.bufferView], source = join(work, 'in'), target = join(work, 'out.jpg');
  writeFileSync(source, bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength));
  execFileSync('magick', [source, '-resize', `${side}x${side}>`, '-background', 'white', '-alpha', 'remove', '-quality', quality, target]);
  replaced.set(image.bufferView, readFileSync(target)); image.mimeType = 'image/jpeg';
}
const parts = []; let offset = 0;
json.bufferViews.forEach((view, index) => {
  const data = replaced.get(index) || bin.subarray(view.byteOffset || 0, (view.byteOffset || 0) + view.byteLength);
  const padding = (4 - offset % 4) % 4; if (padding) { parts.push(Buffer.alloc(padding)); offset += padding; }
  view.byteOffset = offset; view.byteLength = data.length; parts.push(data); offset += data.length;
});
const tail = (4 - offset % 4) % 4; if (tail) { parts.push(Buffer.alloc(tail)); offset += tail; }
json.buffers[0].byteLength = offset;
let text = Buffer.from(JSON.stringify(json), 'utf8'); if (text.length % 4) text = Buffer.concat([text, Buffer.alloc(4 - text.length % 4, 0x20)]);
const header = Buffer.alloc(12); header.writeUInt32LE(0x46546c67, 0); header.writeUInt32LE(2, 4); header.writeUInt32LE(12 + 8 + text.length + 8 + offset, 8);
const jsonHeader = Buffer.alloc(8); jsonHeader.writeUInt32LE(text.length, 0); jsonHeader.writeUInt32LE(0x4e4f534a, 4);
const binHeader = Buffer.alloc(8); binHeader.writeUInt32LE(offset, 0); binHeader.writeUInt32LE(0x004e4942, 4);
writeFileSync(output, Buffer.concat([header, jsonHeader, text, binHeader, ...parts]));
rmSync(work, { recursive: true, force: true });
console.log(`${input}: ${glb.length} → ${12 + 8 + text.length + 8 + offset} bytes, ${replaced.size} texturas`);
