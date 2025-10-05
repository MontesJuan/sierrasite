import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

const KB_DIR = path.resolve(process.cwd(), "kb");
const OUT_DIR = path.resolve(process.cwd(), "public/kb");
const OUT_FILE = path.join(OUT_DIR, "kb.json");

const CHUNK_SIZE = Number(process.env.KB_CHUNK_SIZE || 600);
const CHUNK_OVERLAP = Number(process.env.KB_CHUNK_OVERLAP || 100);
const SLOW_MS = Number(process.env.KB_SLOWDOWN_MS || 0);
const ONLY = process.env.KB_ONLY || "";

const KEY = process.env.GOOGLE_API_KEY;
if (!KEY) {
  console.error("Falta GOOGLE_API_KEY (.env.local)");
  process.exit(1);
}

function chunk(text, size, overlap) {
  const clean = text.replace(/\r/g, "").trim();
  const out = [];
  let i = 0;
  while (i < clean.length) {
    const end = Math.min(i + size, clean.length);
    out.push(clean.slice(i, end));
    i = end - overlap;
    if (i < 0) i = 0;
    if (i >= clean.length) break;
  }
  return out.filter(Boolean);
}

async function embed(text) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/text-embedding-004:embedContent?key=${KEY}`;
  const r = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ content: { parts: [{ text }] } }),
  });
  if (!r.ok) {
    const t = await r.text();
    throw new Error(`Embed ${r.status}: ${t}`);
  }
  const j = await r.json();
  const v = j?.embedding?.values;
  if (!Array.isArray(v)) throw new Error("No embedding vector");
  return v;
}

async function* iterFiles() {
  const all = (await fsp.readdir(KB_DIR)).filter(f => /\.(md|txt)$/i.test(f)).sort();
  if (!all.length) throw new Error("kb/ vacío");
  for (const f of all) {
    if (ONLY && !f.includes(ONLY)) continue;
    yield f;
  }
}

async function main() {
  await fsp.mkdir(OUT_DIR, { recursive: true });
  const out = fs.createWriteStream(OUT_FILE, { encoding: "utf8" });
  out.write('{"items":[');
  let first = true;
  let total = 0;

  for await (const file of iterFiles()) {
    const text = await fsp.readFile(path.join(KB_DIR, file), "utf8");
    const parts = chunk(text, CHUNK_SIZE, CHUNK_OVERLAP);
    for (let i = 0; i < parts.length; i++) {
      const p = parts[i];
      const embedding = await embed(p);
      const item = { id: `${file}#${i + 1}`, source: file, chunk: p, embedding };
      const s = (first ? "" : ",") + JSON.stringify(item);
      out.write(s);
      first = false;
      total++;
      process.stdout.write(`\rChunks: ${total}  (${file} ${i + 1}/${parts.length})   `);
      if (SLOW_MS) await new Promise(res => setTimeout(res, SLOW_MS));
      global.gc && global.gc();
    }
  }

  out.write("]}");
  await new Promise(res => out.end(res));
  process.stdout.write(`\nOK → ${OUT_FILE} (${total} chunks)\n`);
}

main().catch(e => {
  console.error(e.message || e);
  process.exit(1);
});