import fs from "node:fs/promises";
import path from "node:path";
import { GoogleGenerativeAI } from "@google/generative-ai";

type KBItem = { id: string; source: string; chunk: string; embedding: number[] };
type KBFile = { items: KBItem[] };

let KB: KBFile | null = null;
let NORMS: number[] = [];

function norm(a: number[]) {
  let s = 0;
  for (let i = 0; i < a.length; i++) s += a[i] * a[i];
  return Math.sqrt(s);
}
function dot(a: number[], b: number[]) {
  const n = Math.min(a.length, b.length);
  let s = 0;
  for (let i = 0; i < n; i++) s += a[i] * b[i];
  return s;
}
function cosine(a: number[], b: number[], na: number, nb: number) {
  if (!na || !nb) return 0;
  return dot(a, b) / (na * nb);
}

export async function ensureKBLoaded() {
  if (KB) return;
  const p = path.join(process.cwd(), "public", "kb", "kb.json");
  const raw = await fs.readFile(p, "utf8");
  KB = JSON.parse(raw) as KBFile;
  NORMS = KB.items.map((x) => norm(x.embedding));
}

async function embed(genAI: GoogleGenerativeAI, text: string) {
  const model = genAI.getGenerativeModel({ model: "text-embedding-004" });
  const r = await model.embedContent(text);
  const v = r.embedding?.values;
  if (!Array.isArray(v)) throw new Error("No embedding");
  return v as number[];
}

export async function searchKB(
  genAI: GoogleGenerativeAI,
  question: string,
  opts?: { topK?: number; minScore?: number },
): Promise<{ context: string; sources: string[] }> {
  if (!KB) throw new Error("KB no cargada");
  const topK = opts?.topK ?? 8;
  const minScore = opts?.minScore ?? 0.25;

  const qVec = await embed(genAI, question);
  const qn = norm(qVec);

  const ranked = KB.items
    .map((it, i) => ({
      ...it,
      score: cosine(qVec, it.embedding, qn, NORMS[i]),
    }))
    .sort((a, b) => b.score - a.score);

  const top = ranked.filter((x) => x.score >= minScore).slice(0, topK);

  const context = top.map((x) => `(${x.source}) ${x.chunk}`).join("\n---\n");
  const sources = Array.from(new Set(top.map((x) => x.source)));

  return { context, sources };
}